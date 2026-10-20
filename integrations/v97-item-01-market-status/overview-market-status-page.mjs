export const marketStatusPanel = '<section class="overview-status" aria-label="总览：市场状态"><aq-market-status-card id="market-status-card"></aq-market-status-card><p id="market-status-evidence" class="muted">尚未取得本页市场观察；沿用原页面的读取入口。</p></section>';
export const marketStatusStyles = '.overview-status{margin:0 0 18px;max-width:100%}.overview-status>p{font-size:12px;line-height:1.7;margin:7px 0 0;max-width:720px}';
function installMarketStatusCard() {
  if (typeof HTMLElement === 'undefined' || !globalThis.customElements) return;
(function (global) {
  'use strict';
  const blank = (status, value, note) => ({ status, value, note });
  function viewOf(snapshot, nowMs) {
    if (!snapshot) return blank('disconnected', '未连接', '等待手动读取行情');
    if (snapshot.error) return blank('failed', '读取失败', '本次未取得有效行情');
    const b = snapshot.benchmark, source = Date.parse(b?.source_timestamp), received = Date.parse(b?.received_at);
    const ageLimit = b?.freshness?.threshold_seconds;
    if (!b?.source || !Number.isFinite(source) || !Number.isFinite(received) || !Number.isFinite(nowMs)
        || source > received + 5000 || received > nowMs + 5000
        || !Number.isFinite(ageLimit) || ageLimit <= 0) {
      return blank('unknown', '数据待核验', '来源或时间证据尚不完整');
    }
    if (b.freshness.status === 'stale' || nowMs - received > ageLimit * 1000) {
      return blank('stale', '快照已过期', '仅供回看，等待手动读取');
    }
    if (b.freshness.status !== 'recent') return blank('unknown', '数据待核验', '行情时效尚未得到确认');
    return blank('valid', '待判定', '行情已读，环境仍待核验');
  }
  class MarketStatusCard extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>
        :host{display:block;width:337px;max-width:100%;height:103px;isolation:isolate}
        .card,.card *{box-sizing:border-box}
        .card{height:103px;display:flex;align-items:flex-start;gap:22px;padding:13px 14px;
          background:linear-gradient(110deg,#fff 0%,#fff 65%,#fcfdff 100%);border:1px solid #e8eff8;
          border-radius:7px;color:#080f43;font-family:"Microsoft YaHei","Segoe UI",sans-serif;text-align:left}
        .icon{width:48px;height:48px;flex:0 0 48px;border-radius:7px;
          background:linear-gradient(145deg,#fff5f4,#fff0f1);box-shadow:inset 0 -1px 0 #ffd1d7}
        svg{width:48px;height:48px;display:block}
        .copy{min-width:0;padding-top:0}
        h3{font-size:16px;font-weight:700;line-height:21px;margin:0;white-space:nowrap;transform:translateY(-2px)}
        strong{display:block;color:#ff151e;font-size:24px;font-weight:700;line-height:32px;white-space:nowrap}
        p{font-size:15px;font-weight:600;line-height:22px;margin:4px 0 0;color:#8993b7;white-space:nowrap}
        @media(max-width:340px){.card{gap:14px;padding-left:12px;padding-right:8px}p{font-size:13px}}
      </style><section class="card" aria-label="市场状态"><span class="icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none"><path d="M10 31 20 21 27 27 38 14M30 14h8v8"
          stroke="#ff1720" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span><div class="copy"><h3>市场状态</h3><strong role="status"></strong><p></p></div></section>`;
      this.setSnapshot(null);
    }
    setSnapshot(snapshot, { nowMs = Date.now(), fixture = false } = {}) {
      this.view = viewOf(snapshot, nowMs);
      this.dataset.status = this.view.status;
      this.dataset.fixture = String(fixture);
      this.shadowRoot.querySelector('h3').textContent = fixture ? '市场状态 · 测试' : '市场状态';
      this.shadowRoot.querySelector('strong').textContent = this.view.value;
      this.shadowRoot.querySelector('p').textContent = this.view.note;
      this.shadowRoot.querySelector('section').setAttribute('aria-label', fixture ? '市场状态，测试夹具' : '市场状态');
      return this.view;
    }
  }
  MarketStatusCard.viewOf = viewOf;
  global.AqMarketStatusCard = MarketStatusCard;
  if (!customElements.get('aq-market-status-card')) customElements.define('aq-market-status-card', MarketStatusCard);
})(globalThis);

  const Card = globalThis.AqMarketStatusCard;
  Card.prototype.setObservation = function (context, { failed = false, nowMs = Date.now() } = {}) {
    const index = context?.indices?.find(row => row?.symbol === 'sh000001');
    this.setSnapshot(failed ? { error: true } : { benchmark: index ? { ...index, received_at: index.fetched_at } : {} }, { nowMs });
    const evidence = document.getElementById('market-status-evidence');
    if (!evidence) return;
    if (failed) { evidence.textContent = '本次读取失败，市场状态未更新。' + (this.lastEvidence ? '上次观察：' + this.lastEvidence : '尚无成功观察。'); return; }
    const clock = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '未知';
    this.lastEvidence = '上证指数 · ' + (index?.source === 'tencent' ? '腾讯' : index?.source || '来源未知') + ' · 源时间 ' + clock(index?.source_timestamp) + ' · 服务读取 ' + clock(index?.fetched_at) + '（北京时间）。环境分类待冻结；更新时间不等于最后成交时间。';
    evidence.textContent = this.lastEvidence;
  };
}
export const marketStatusScript = '(' + installMarketStatusCard.toString() + ')();';
