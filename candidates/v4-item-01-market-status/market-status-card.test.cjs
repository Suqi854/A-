const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'market-status-card.js'), 'utf8');
const context = { HTMLElement: class {}, customElements: { get() {}, define() {} } };
vm.runInNewContext(source, context);
const view = context.AqMarketStatusCard.viewOf;
const now = Date.parse('2026-01-05T10:00:00+08:00');
// Every input below is a synthetic fixture, never captured market data.
const synthetic = () => ({ benchmark: { source: 'synthetic-test-only',
  source_timestamp: '2026-01-05T09:59:40+08:00', received_at: '2026-01-05T09:59:45+08:00',
  freshness: { status: 'recent', threshold_seconds: 90 } } });
test('disconnected and failed reads do not create a market judgement', () => {
  assert.equal(view(null, now).status, 'disconnected');
  assert.equal(view({ error: 'SYNTHETIC_FAILURE' }, now).status, 'failed');
});
test('valid observations still leave the unfrozen market regime undecided', () => {
  const result = view({ ...synthetic(), classification: 'untrusted-input' }, now);
  assert.equal(result.status, 'valid'); assert.equal(result.value, '待判定');
});
test('missing evidence and unknown freshness cannot become valid', () => {
  const missing = synthetic(); delete missing.benchmark.source_timestamp;
  const unknown = synthetic(); unknown.benchmark.freshness.status = 'unknown';
  assert.equal(view(missing, now).status, 'unknown'); assert.equal(view(unknown, now).status, 'unknown');
});
test('an old saved response is marked stale, without synthesizing a new observation', () => {
  const input = synthetic(), before = JSON.stringify(input);
  assert.equal(view(input, now + 100000).status, 'stale'); assert.equal(JSON.stringify(input), before);
});
test('future source clocks and future receipt clocks remain unknown', () => {
  const sourceFuture = synthetic(); sourceFuture.benchmark.source_timestamp = '2026-01-05T10:01:00+08:00';
  const receiptFuture = synthetic(); receiptFuture.benchmark.received_at = '2026-01-05T10:01:00+08:00';
  assert.equal(view(sourceFuture, now).status, 'unknown'); assert.equal(view(receiptFuture, now).status, 'unknown');
});
test('missing or nonfinite freshness bounds do not silently default to valid', () => {
  for (const value of [undefined, 0, Infinity, '90']) {
    const input = synthetic(); input.benchmark.freshness.threshold_seconds = value;
    assert.equal(view(input, now).status, 'unknown');
  }
});
test('the component has no network, timer, storage or external script operations', () => {
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|setInterval|setTimeout|localStorage|sessionStorage)\s*\(/.test(source));
  assert(!/https?:\/\/|<script\b/.test(source));
});
test('the standalone preview contains no real snapshot or external resource', () => {
  const html = fs.readFileSync(path.join(__dirname, 'preview.html'), 'utf8');
  assert(!/AQ_CARD_SNAPSHOT|public-snapshot\.js|15:27:00|07:27:44|https?:\/\//.test(html));
  assert(html.includes('合成测试指数')); assert(html.includes('未连接（默认）'));
  assert(!/<script[^>]+src=/.test(html));
  assert(!/<img\b|data:image\/png/.test(html));
});
