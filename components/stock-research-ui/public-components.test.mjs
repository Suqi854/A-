import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveQuoteCapturePreference,createQuoteCapturePreference,QUOTE_CAPTURE_PREFERENCE_KEY} from './quote-capture-preference.mjs';
import {rollingChartReferences} from './rolling-chart-references.mjs';
import {mountStockDiagnostics,stockDiagnosisStyles,stockStrategyLayerMarkup,stockDiagnosisDialogMarkup} from './stock-diagnosis-ui.mjs';

// Every price, name, time and condition in this file is synthetic test input.
const memory = initial => {
  const records = new Map(initial ? [[QUOTE_CAPTURE_PREFERENCE_KEY, initial]] : []);
  return {getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};
};
test('new and legacy default-off preferences migrate once to enabled',()=>{
  for(const raw of [null,{}, {enabled:false}, {enabled:false,version:0}]){
    assert.deepEqual(resolveQuoteCapturePreference(raw),{version:1,enabled:true,intent:'default-migration'});
  }
});
test('explicit user pause survives reload while resume stays explicit',()=>{
  const storage=memory();const first=createQuoteCapturePreference(storage);
  assert.equal(first.enabled,true);first.set(false);
  const second=createQuoteCapturePreference(storage);assert.equal(second.enabled,false);assert.equal(second.persisted,true);
  assert.equal(second.set(true).intent,'user');assert.equal(createQuoteCapturePreference(storage).enabled,true);
  for(const raw of [{enabled:false,version:1},{enabled:false,intent:'user'},{enabled:false,userPaused:true}])assert.equal(resolveQuoteCapturePreference(raw).enabled,false);
});
test('corrupt or unavailable storage never claims successful persistence',()=>{
  assert.equal(createQuoteCapturePreference(memory('{')).enabled,true);
  const denied={getItem(){throw Error('SYNTHETIC_DENIED');},setItem(){throw Error('SYNTHETIC_DENIED');}};
  const p=createQuoteCapturePreference(denied);assert.equal(p.persisted,false);assert.equal(p.set(false).enabled,false);assert.equal(p.persisted,false);
  assert.equal(createQuoteCapturePreference(null).persisted,false);
});
test('preference snapshots are isolated copies and contain intent only',()=>{
  const p=createQuoteCapturePreference(memory());const s=p.snapshot();s.enabled=false;
  assert.equal(p.enabled,true);assert.deepEqual(Object.keys(s).sort(),['enabled','intent','persisted','version']);
});

const rows=()=>Array.from({length:40},(_,i)=>({source_timestamp:new Date(Date.UTC(2026,0,5,1,30+i)).toISOString(),price:100+i,low:99+i,high:101+i,complete:true}));
const input=r=>({symbol:'SYNTHETIC',source:'synthetic-test-only',kind:'intraday',interval:'intraday',rows:r});
test('rolling reference uses exactly the current and previous nineteen observations',()=>{
  const r=rows(),before=JSON.stringify(r),out=rollingChartReferences(input(r));
  assert.equal(out.status,'available');assert.equal(out.levels.length,21);
  assert.equal(out.levels[0].support,100);assert.equal(out.levels[0].resistance,119);
  assert.equal(out.levels.at(-1).support,120);assert.equal(out.levels.at(-1).resistance,139);
  assert.equal(out.levels[0].window_start,r[0].source_timestamp);assert.equal(out.levels[0].window_end,r[19].source_timestamp);
  assert.equal(JSON.stringify(r),before);
});
test('future extrema never change earlier reference levels',()=>{
  const r=rows(),prefix=rollingChartReferences(input(r.slice(0,25)));
  r[30].price=1000000;r[35].price=0.01;
  assert.deepEqual(rollingChartReferences(input(r)).levels.slice(0,prefix.levels.length),prefix.levels);
});
test('completed candle references use actual highs and lows without synthetic OHLC',()=>{
  const r=rows().slice(0,20),out=rollingChartReferences({...input(r),kind:'bars',interval:'1m'});
  assert.equal(out.levels[0].support,99);assert.equal(out.levels[0].resistance,120);
  assert.equal(out.levels[0].strength,'not_scored');assert.equal(out.levels[0].tested_count,null);
});
test('insufficient data and incomparable price bases stay unavailable',()=>{
  assert.equal(rollingChartReferences(input(rows().slice(0,19))).reason,'NEED_20_OBSERVATIONS');
  for(const extra of [{adjustment:'qfq'},{interval:'day'}])assert.equal(rollingChartReferences({...input(rows()),...extra}).reason,'UNCOMPARABLE_PRICE_BASIS_OR_PERIOD');
});
test('duplicate, unordered and missing clocks do not produce references',()=>{
  for(const clock of [undefined,'invalid',rows()[0].source_timestamp]){
    const r=rows();r[1].source_timestamp=clock;assert.equal(rollingChartReferences(input(r)).reason,'DUPLICATE_OR_UNORDERED_TIME');
  }
  const r=rows();[r[1],r[2]]=[r[2],r[1]];assert.equal(rollingChartReferences(input(r)).levels.length,0);
});
test('missing prices and incomplete candle data never receive default prices',()=>{
  for(const value of [0,-1,NaN,Infinity,undefined]){
    const r=rows();r[25].price=value;assert.equal(rollingChartReferences(input(r)).reason,'PRICE_OR_COMPLETION_MISSING');
  }
  for(const field of ['complete','low','high']){
    const r=rows();delete r[25][field];assert.equal(rollingChartReferences({...input(r),kind:'bars',interval:'5m'}).levels.length,0);
  }
});

class Element {
  constructor(){this.listeners={};this.dataset={};this.attributes={};this.textContent='';this.innerHTML='';this.open=false;this.checked=true;}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  emit(type,event={}){for(const fn of this.listeners[type]??[])fn(event);}
  setAttribute(k,v){this.attributes[k]=v;}
  querySelector(selector){return this.children?.[selector]??null;}
  after(el){this.inserted=el;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  remove(){this.removed=true;}
}
const fixture=()=>({name:'SYNTHETIC <img>',metrics:{price:123},analysis:{environment:{direction:'range'},rules:[]},
  decision:{dimensions:[]},preferred:{judgment:'SYNTHETIC <script>alert(1)</script>',trigger_groups:[],invalidation:'SYNTHETIC_UNKNOWN'},
  coverage:{passed:0,failed:0,unknown:1},reasons:['SYNTHETIC & evidence'],counter:'SYNTHETIC <counter>',
  modules:{news:{status:'unavailable',reason:'SYNTHETIC <script>missing</script>'}},volume_facts:[],macd:null,
  watch_source:'synthetic-test-only',quote_source:'synthetic-test-only',price_basis:'none',version:'synthetic-v1',rule_version:'synthetic-rule'});
function harness(){
  const ids=Object.fromEntries(['stock-strategy-layers','stock-diagnose-current','stock-diagnosis-title','stock-diagnosis-component-status','stock-layer-selection','chart'].map(k=>[k,new Element()]));
  const parts=Object.fromEntries(['dialog','body','clock','close','print'].map(k=>[k,new Element()]));
  const root=new Element(),pool=new Element(),heading=new Element();pool.children={h2:heading};
  root.children=Object.fromEntries(Object.entries(parts).map(([k,v])=>['[data-stock-diagnosis="'+k+'"]',v]));root.children['.it-pool-section']=pool;
  root.ownerDocument={getElementById:k=>ids[k],createElement:()=>new Element()};
  let subscribed,unsubscribed=false,researchCalls=0,repaints=0,feeds={};
  const host={getSymbol:()=> 'SYNTHETIC',getSnapshots:()=>feeds,getChartSnapshots:()=>({chart:null,macd:null}),subscribe(fn){subscribed=fn;return()=>{unsubscribed=true;};},repaintStockChart(){repaints++;}};
  const computations={diagnoseStock:()=>fixture(),buildHistoricalResearch(){researchCalls++;return{status:'insufficient_data',events:[],reason:'SYNTHETIC_MISSING'};},rollingChartReferences};
  return {root,parts,ids,host,pool,heading,computations,get researchCalls(){return researchCalls;},get unsubscribed(){return unsubscribed;},get repaints(){return repaints;},refresh:()=>subscribed(),setFeeds:v=>{feeds=v;}};
}
test('public UI requires every computation instead of importing private engines',()=>{
  for(const name of ['diagnoseStock','buildHistoricalResearch','rollingChartReferences']){
    const h=harness(),deps={...h.computations};delete deps[name];assert.throws(()=>mountStockDiagnostics(h.root,h.host,deps),new RegExp(name));
  }
});
test('initial empty snapshots produce a visible local missing state and stable cache',()=>{
  const h=harness(),ui=mountStockDiagnostics(h.root,h.host,h.computations);
  assert.match(h.ids['stock-diagnosis-component-status'].textContent,/SYNTHETIC_MISSING/);assert.equal(h.researchCalls,1);
  h.refresh();assert.equal(h.researchCalls,1);
  h.setFeeds({minute:{data:{synthetic:true}}});h.refresh();assert.equal(h.researchCalls,2);
  ui.destroy();assert.equal(h.unsubscribed,true);assert.equal(h.host.stockCardMarkup,undefined);assert.equal(h.heading.inserted.removed,true);
});
test('dialog and quick view escape untrusted text and preserve partial modules',()=>{
  const h=harness(),ui=mountStockDiagnostics(h.root,h.host,h.computations);ui.open('SYNTHETIC');
  assert.equal(h.parts.dialog.open,true);assert.match(h.parts.body.innerHTML,/&lt;script&gt;/);assert.doesNotMatch(h.parts.body.innerHTML,/<script>/);
  assert.match(h.ids['stock-diagnosis-title'].textContent,/SYNTHETIC <img>/);
  assert.match(h.parts.body.innerHTML,/公司公告与新闻/);assert.match(h.parts.body.innerHTML,/unknown/);
  assert.doesNotMatch(h.host.stockCardMarkup('SYNTHETIC'),/<script>/);ui.destroy();assert.equal(h.parts.dialog.open,false);
});
test('layer toggle requests repaint only; trade controls remain unavailable',()=>{
  const h=harness(),ui=mountStockDiagnostics(h.root,h.host,h.computations),before=h.repaints;
  h.ids['stock-strategy-layers'].emit('change');assert.equal(h.repaints,before+1);assert.equal(h.researchCalls,1);
  assert.match(stockStrategyLayerMarkup,/data-stock-layer="trades" disabled/);assert.match(stockStrategyLayerMarkup,/历史条件研究/);
  assert.match(stockDiagnosisDialogMarkup,/<dialog/);assert.match(stockDiagnosisStyles,/@media\(max-width:760px\)/);ui.destroy();
});
test('portable display and calculation modules contain no request or timer implementation',()=>{
  for(const name of ['stock-diagnosis-ui.mjs','rolling-chart-references.mjs']){
    const source=readFileSync(new URL(name,import.meta.url),'utf8');
    assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|setInterval|setTimeout)\s*\(/);
    assert.doesNotMatch(source,/^import /m);
  }
});
