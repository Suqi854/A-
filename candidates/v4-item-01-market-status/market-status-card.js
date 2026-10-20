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
    if (b.freshness.status === 'latest_session' && nowMs - received <= ageLimit * 1000) return blank('latest_session', '最近时段快照', '非实时，环境仍待核验');
    if (b.freshness.status === 'stale' || nowMs - source > ageLimit * 1000 || nowMs - received > ageLimit * 1000) {
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
