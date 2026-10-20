# 宿主接入契约

此适配器沿用原页面的类名与DOM位置，适合已有页面的增量接入。它不是完整应用，也不替换宿主的数据校验、策略或行情计算。

## 组合

```js
import {
  stockDiagnosisStyles, stockStrategyLayerMarkup,
  stockDiagnosisDialogMarkup, mountStockDiagnostics,
} from './stock-diagnosis-ui.mjs';
import {rollingChartReferences} from './rolling-chart-references.mjs';

// 先把样式、图层和dialog加入宿主，再调用；每个document只挂载一次。
const ui = mountStockDiagnostics(root, host, {
  diagnoseStock: verifiedDiagnosis,
  buildHistoricalResearch: verifiedHistoricalResearch,
  rollingChartReferences,
});
// ui.open(symbol); ui.paint(canvasContext, chartView); ui.destroy();
```

三个计算函数均须提供。目录不实现 `verifiedDiagnosis` 或 `verifiedHistoricalResearch`，缺失时立即报错，不能用默认评分或伪造事件替代。引用名仅为调用示意。

## DOM与生命周期

`root` 包含 `stockDiagnosisDialogMarkup`，同一document包含 `stockStrategyLayerMarkup` 和可选 `canvas#chart`。快览展开依赖 `.it-pool-section h2` 与 `.it-slot-grid`。没有观察卡区时图层和详情仍可用；若需要快览按钮，须提供该区。样式复用宿主的基础表格、按钮、`.scroll`、`.readout` 与 `.data-note`。弹层窄屏为单列，打印按钮调用浏览器打印。

控制器使用固定DOM ID，单页仅支持一个挂载实例；宿主卸载页面时调用 `destroy()` 并移除该页面DOM，避免在同一存活DOM上重复挂载。`destroy()` 清除订阅、研究缓存、快览回调与临时按钮；匿名DOM事件由宿主移除DOM完成释放。

## host接口

必须提供：

- `getSymbol()`：当前规范化标的。
- `getSnapshots(symbol)`：只返回该标的已读取快照，含可选 `minute/five/daily` 包装，每项的 `data` 是稳定快照引用。内容更新时替换引用，以使研究缓存失效。
- `subscribe(callback)`：同源数据更新时回调，返回取消订阅函数。

可选：`getContexts(symbol)`、`getStockDiagnosticInput(symbol)`、`getChartSnapshots()`（`chart`与`macd`）、`getVerifiedName(symbol)`、`repaintStockChart()`、`syncStockCrosshair(sourceTimestamp)`、`evaluateSlots()`。挂载时设置 `host.stockCardMarkup(symbol, input)`，宿主可将其返回的已转义HTML插入对应快览卡。

## 计算输出

`diagnoseStock({symbol,feeds,contexts,macd,analysis,decision})` 返回展示模型：

- `metrics`：可缺数值，缺项显示 `unknown`；名称包括 `price/change_percent/open/high/low/previous_close/amount_cny/volume_shares/ma30/ma60/ma120/return_3d_pct/return_5d_pct/return_10d_pct/return_20d_pct/return_60d_pct`。
- `analysis.environment.direction` 为 `up/down/range` 或未知；`analysis.rules` 为数组，每项包含 `name/pattern/invalidation/checks`。每组 `checks` 含 `name/checks`，条件含 `label/pass/values`；`pass` 仅 `true/false/null`，values只显示有限数值。
- `decision.dimensions` 为数组，每项含 `title/state/summary/facts/reasons/provenance`；facts含 `label/text`，provenance含 `source/sourceTime/receivedAt`。
- `preferred` 含 `judgment/invalidation/trigger_groups`；每组有 `name/checks`，条件有 `label/pass`。
- `coverage` 含真实的 `passed/failed/unknown` 数值，仅条件计数，不是概率。`reasons`、`volume_facts` 是数组；`counter/price_basis/version/rule_version/watch_source/quote_source` 是说明文字；报价时间分为 `quote_time/quote_fetched_at/quote_received_at`。
- `modules` 的可选键为 `valuation/financials/news/capital_flow/forecast/behavior`，每项含 `status/reason`；缺数据只影响本区。`macd` 可为null，存在时须同标的同口径并带源时间。

`buildHistoricalResearch({symbol,minute,five,daily})` 返回 `status/reason/rule_version/events/source`；无数据时返回空events。每个事件含 `strategy_id/strategy_version/direction/kind/price/confirmation_time/structure_time/known_at/source/source_timestamp/data_cutoff/evaluated_at/invalidation/checks/reference/gates`。支持kind为 `warning/confirmation/invalidated`，direction为 `buy/sell`。这些标记仅显示为“历史条件研究”，不进入前瞻统计。确认位置使用confirmation_time，不能回画成更早的买卖点。

`paint(context, view)` 由宿主图表绘制阶段调用。view含 `rows/kind/mode/source/adjustment/symbol/data/x/y/left/right/top/bottom/w/h/index`；`x(index)`、`y(price)` 为坐标映射，`index`为当前十字光标行或null。rows需有源时间；K线可放 `data.bars`。调用方必须提供同标的、同口径价格范围，保留成交量和原行情失败状态，缺研究数据不应清除主图。

本目录无网络调用、后台调度、账户接入或自动下单。偏好持久化与展示组件互不启动对方；分析、采集、研究、真实成交应由宿主分别管理。
