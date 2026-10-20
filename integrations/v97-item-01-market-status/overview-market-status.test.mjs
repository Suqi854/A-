import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {marketStatusPanel,marketStatusScript} from '../src/overview-market-status-page.mjs';
import {page} from '../src/page.mjs';
const now=Date.parse('2026-01-05T10:00:00+08:00');
function harness(){const evidence={textContent:''},root={HTMLElement:class{},customElements:{get(){},define(){}},document:{getElementById(){return evidence;}}};vm.runInNewContext(marketStatusScript,root);return {Card:root.AqMarketStatusCard,evidence};}
function fixture(){return {indices:[{symbol:'sh000001',source:'synthetic-test-only',source_timestamp:'2026-01-05T09:59:40+08:00',fetched_at:'2026-01-05T09:59:45+08:00',freshness:{status:'recent',threshold_seconds:90}}]};}
function host(Card){return {setSnapshot(input,options){this.view=Card.viewOf(input,options.nowMs);}};}
test('real page mounts the isolated card and consumes the existing market response path',()=>{
 assert(page.includes(marketStatusPanel));assert.match(page,/function renderMarketContext\(d,receivedAt\)\{\s*\$\('market-status-card'\)\?\.setObservation\?\.\(d\)/);
 assert.match(page,/function marketReadFailed\(e\)\{\$\('market-status-card'\)\?\.setObservation\?\.\(null,\{failed:true\}\)/);
 assert.doesNotMatch(marketStatusScript,/\b(?:fetch|XMLHttpRequest|WebSocket|setInterval|setTimeout|localStorage)\s*\(/);
});
test('valid public observation stays undecided and shows separate clocks',()=>{const {Card,evidence}=harness(),el=host(Card);Card.prototype.setObservation.call(el,fixture(),{nowMs:now});assert.equal(el.view.value,'待判定');assert.match(evidence.textContent,/09:59:40.*09:59:45/);});
test('unavailable and future evidence remain unknown',()=>{const {Card}=harness(),el=host(Card);Card.prototype.setObservation.call(el,{indices:[]},{nowMs:now});assert.equal(el.view.status,'unknown');const input=fixture();input.indices[0].source_timestamp='2026-01-05T10:01:00+08:00';Card.prototype.setObservation.call(el,input,{nowMs:now});assert.equal(el.view.status,'unknown');});
test('old response is stale and failed reads retain only explicitly old evidence',()=>{const {Card,evidence}=harness(),el=host(Card);Card.prototype.setObservation.call(el,fixture(),{nowMs:now+100000});assert.equal(el.view.status,'stale');Card.prototype.setObservation.call(el,null,{failed:true,nowMs:now});assert.equal(el.view.status,'failed');assert.match(evidence.textContent,/本次读取失败.*上次观察/);});
test('host mocks without custom elements remain inert',()=>{assert.doesNotThrow(()=>vm.runInNewContext(marketStatusScript,{}));});
test('source age 91 seconds is stale even when receipt age is only 86 seconds',()=>{const {Card}=harness(),el=host(Card);Card.prototype.setObservation.call(el,fixture(),{nowMs:now+71000});assert.equal(el.view.status,'stale');});
test('latest-session observations retain an explicit non-realtime label',()=>{const {Card}=harness(),el=host(Card),input=fixture();input.indices[0].source_timestamp='2026-01-02T15:00:00+08:00';input.indices[0].freshness.status='latest_session';Card.prototype.setObservation.call(el,input,{nowMs:now});assert.equal(el.view.status,'latest_session');assert.match(el.view.note,/非实时/);});
