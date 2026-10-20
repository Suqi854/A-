# 市场状态卡片

独立只读组件，使用 Shadow DOM 隔离样式。卡片尺寸337×103，图标48×48，窄屏宽度不超过容器。

- market-status-card.js：通过 element.setSnapshot(observation) 接收调用方数据。
- preview.html：可直接打开的离线预览，默认未连接；状态选择使用明确标记的合成数据。
- market-status-card.test.cjs：Node内置测试。

运行：node --test market-status-card.test.cjs

最小输入包括 benchmark.source、source_timestamp、received_at 和 freshness。时效判断同时核对源时间与接收时间；最近时段快照明确标记为非实时。数据完整且有效时仍显示“待判定”，不由示例生成市场分类。

组件不发起请求，不设置定时器，不持久化输入。预览不包含真实行情、原始设计图或运行环境信息。
