#!/usr/bin/env python3
"""A股公开行情读取（只用标准库）。数据源：腾讯财经、东方财富的公开网页接口。

  python quote.py quote 600519 000858      实时报价（价格、涨跌、量比、换手、市盈、涨跌停价、五档）
  python quote.py market                   主要指数 + 外围市场
  python quote.py kline 600519 [120]       前复权日K（默认120根）
  python quote.py minute 600519            当日分时（价格、均价、每分钟量）
  python quote.py flow 600519 [20]         主力资金日度净额（超大单+大单）

加 --json 输出 JSON。只读行情，不涉及账户和交易。
"""
import gzip
import json
import re
import sys
import urllib.request

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36"
INDICES = ["sh000001", "sz399001", "sz399006", "sh000300", "sh000016", "sh000688", "hkHSI", "usIXIC", "usDJI", "usINX"]


def get(url, referer="https://finance.qq.com"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": referer, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=10) as r:
        raw = r.read()
        return gzip.decompress(raw) if r.headers.get("Content-Encoding") == "gzip" else raw


def code_of(c):
    c = c.strip().lower()
    if re.fullmatch(r"\d{6}", c):
        return ("sh" if c[0] in "65" else "bj" if c[0] in "48" else "sz") + c
    return c if not c.startswith(("hk", "us")) else c[:2] + c[2:].upper()


def f(x):
    try:
        return float(x) if x not in ("", "-") else None
    except ValueError:
        return None


def quotes(codes):
    text = get("https://qt.gtimg.cn/q=" + ",".join(codes)).decode("gbk", "ignore")
    out = {}
    for m in re.finditer(r'v_(\w+)="([^"]*)"', text):
        k, a = m.group(1), m.group(2).split("~")
        if len(a) < 35:
            continue
        q = {"code": k, "name": a[1], "price": f(a[3]), "prev": f(a[4]), "open": f(a[5]), "chg": f(a[31]),
             "pct": f(a[32]), "high": f(a[33]), "low": f(a[34]), "time": a[30]}
        if not k.startswith(("hk", "us")):
            q.update({"vol_shares": (f(a[6]) or 0) * 100, "amount_yuan": (f(a[37]) or 0) * 1e4, "turnover_pct": f(a[38]),
                      "pe": f(a[39]), "amplitude_pct": f(a[43]), "float_mcap_yi": f(a[44]), "mcap_yi": f(a[45]),
                      "pb": f(a[46]), "limit_up": f(a[47]), "limit_down": f(a[48]), "volume_ratio": f(a[49]),
                      "avg_price": f(a[51]) if len(a) > 51 else None,
                      "bid": [[f(a[9 + 2 * i]), f(a[10 + 2 * i])] for i in range(5)],
                      "ask": [[f(a[19 + 2 * i]), f(a[20 + 2 * i])] for i in range(5)]})
        out[k] = q
    return out


def kline(code, n=120):
    d = json.loads(get(f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,,,{n},qfq"))
    node = d["data"][code]
    return [{"date": r[0], "open": float(r[1]), "close": float(r[2]), "high": float(r[3]), "low": float(r[4]),
             "vol_shares": float(r[5]) * 100} for r in (node.get("qfqday") or node.get("day") or [])]


def minute(code):
    d = json.loads(get("https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=" + code))
    rows, last = [], 0.0
    for s in d["data"][code]["data"]["data"]:
        t, p, v, a = (s.split(" ") + ["0"])[:4]
        v = float(v) * 100
        rows.append({"t": t[:2] + ":" + t[2:], "price": float(p), "vol": max(v - last, 0),
                     "avg": float(a) / v if v else float(p)})
        last = v
    return rows


def flow(code, n=20):
    secid = ("1." if code.startswith("sh") else "0.") + code[2:]
    d = json.loads(get("https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?lmt=%d&klt=101&secid=%s"
                       "&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57" % (n, secid), "https://data.eastmoney.com/"))
    out = []
    for s in (d.get("data") or {}).get("klines") or []:
        p = s.split(",")
        out.append({"date": p[0], "main_net": f(p[1]), "small": f(p[2]), "mid": f(p[3]), "large": f(p[4]),
                    "xlarge": f(p[5]), "main_pct": f(p[6])})
    return out


def show(obj, as_json):
    if as_json:
        print(json.dumps(obj, ensure_ascii=False, indent=1))
        return
    if isinstance(obj, dict):
        for q in obj.values():
            print(f"{q['name']}({q['code']}) {q['price']} {q['pct']:+.2f}% 时间{q['time']}"
                  + (f" 量比{q.get('volume_ratio')} 换手{q.get('turnover_pct')}% 市盈{q.get('pe')} "
                     f"涨停{q.get('limit_up')} 跌停{q.get('limit_down')}" if "volume_ratio" in q else ""))
    else:
        for r in obj:
            print(" ".join(f"{k}={v:.2f}" if isinstance(v, float) else f"{k}={v}" for k, v in r.items()))


def main(argv):
    as_json = "--json" in argv
    argv = [a for a in argv if a != "--json"]
    if not argv:
        print(__doc__)
        return 1
    cmd, args = argv[0], argv[1:]
    if cmd == "quote":
        show(quotes([code_of(c) for c in args]), as_json)
    elif cmd == "market":
        show(quotes(INDICES), as_json)
    elif cmd == "kline":
        show(kline(code_of(args[0]), int(args[1]) if len(args) > 1 else 120), as_json)
    elif cmd == "minute":
        show(minute(code_of(args[0])), as_json)
    elif cmd == "flow":
        show(flow(code_of(args[0]), int(args[1]) if len(args) > 1 else 20), as_json)
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
