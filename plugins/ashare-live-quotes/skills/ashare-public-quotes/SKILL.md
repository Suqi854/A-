---
name: ashare-public-quotes
description: 读取A股公开行情（腾讯财经、东方财富网页接口）：实时报价、主要指数与外围、日K、分时、主力资金。不需要私有App，Claude Code、Codex 或任何能运行 Python 或抓取网页的环境都能用。
---

# A股公开行情

不依赖私有 App 的通用行情读取方式。如果当前环境已经连上「A股实时行情 App」，优先用 `ashare-quotes-connection`；连不上或在其他客户端时，用本技能。

## 有命令行时

脚本在本技能目录下，只用 Python 标准库：

```
python scripts/quote.py quote 600519 000858   # 实时报价
python scripts/quote.py market                # 指数 + 外围
python scripts/quote.py kline 600519 120      # 前复权日K
python scripts/quote.py minute 600519         # 分时
python scripts/quote.py flow 600519 20        # 主力资金（日）
```

加 `--json` 可以输出原始字段。代码可以写 6 位数字，6/5 开头会自动补成 sh，0/3 开头补成 sz；也可以直接写 `sh600519`。

## 没有命令行时

直接抓取网页：

| 内容 | 地址 | 解析 |
|---|---|---|
| 报价 | `https://qt.gtimg.cn/q=sh600519,sz000858` | GBK 编码，格式为 `v_代码="字段~字段~…"`。字段：1 名称、3 现价、4 昨收、5 今开、30 时间、31 涨跌、32 涨跌幅%、33 最高、34 最低、37 成交额(万)、38 换手%、39 市盈、44 流通市值(亿)、45 总市值(亿)、46 市净、47 涨停价、48 跌停价、49 量比、51 均价 |
| 日K | `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600519,day,,,120,qfq` | `data.<代码>.qfqday` 每行为 [日期, 开, 收, 高, 低, 量(手)] |
| 分时 | `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=sh600519` | 每行为 "HHMM 价格 累计量(手) 累计额" |
| 主力资金 | `https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?lmt=20&klt=101&secid=1.600519&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57` | secid 沪市为 `1.`、深市为 `0.`；每行依次为 日期, 主力净额, 小单, 中单, 大单, 超大单, 主力净占比% |
| 指数/外围 | 报价接口传 `sh000001,sz399001,sz399006,sh000300,hkHSI,usIXIC,usDJI,usINX` | 港股、美股的时间字段格式不同 |

## 回答规范

- 报出价格时，同时说明数据源的时间（报价第 30 个字段）。非交易时段显示的是最近一次收盘价，不能说成“实时”。
- 主力资金是数据商按单笔金额统计的估算值，不等于真实主力意图。解释时把事实和推断分开说。
- 接口失败或字段为空时，直接说明没有取到，不要编造数字。
- 想要多因子评分、交易计划、选股结果时，请配合分析插件 [Suqi854/-A](https://github.com/Suqi854/-A) 的 `aq-engine` 或 `aq-terminal` 技能。
