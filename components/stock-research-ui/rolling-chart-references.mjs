// Rolling references use the current and preceding observations only.
const finite=v=>typeof v==='number'&&Number.isFinite(v),ms=v=>typeof v==='string'?Date.parse(v):NaN;
export function rollingChartReferences({symbol,source,adjustment='none',kind,interval,rows=[]}={}){
 if(adjustment!=='none'||!['intraday','1m','5m'].includes(interval))return {status:'unavailable',reason:'UNCOMPARABLE_PRICE_BASIS_OR_PERIOD',levels:[]};
 if(rows.length<20)return {status:'insufficient_data',reason:'NEED_20_OBSERVATIONS',levels:[]};
 let prior=-Infinity;for(const row of rows){const at=ms(row.source_timestamp);if(!finite(at)||at<=prior)return {status:'unavailable',reason:'DUPLICATE_OR_UNORDERED_TIME',levels:[]};prior=at;if(kind==='intraday'?!(finite(row.price)&&row.price>0):row.complete!==true||![row.low,row.high].every(v=>finite(v)&&v>0))return {status:'unavailable',reason:'PRICE_OR_COMPLETION_MISSING',levels:[]};}
 const levels=[];for(let i=19;i<rows.length;i++){const window=rows.slice(i-19,i+1),low=Math.min(...window.map(r=>kind==='intraday'?r.price:r.low)),high=Math.max(...window.map(r=>kind==='intraday'?r.price:r.high));levels.push({source_timestamp:rows[i].source_timestamp,support:low,resistance:high,window_start:window[0].source_timestamp,window_end:rows[i].source_timestamp,method:kind==='intraday'?'最近20个分钟观察价的极值（不是K线高低点）':'最近20根已完成'+interval+'K线的高低区间',method_version:'rolling-observed-reference-v1',period:interval,symbol,source,adjustment:'none',strength:'not_scored',tested_count:null,status:'reference_only',invalidation:'窗口滚动后替换；突破/跌破不保证反转',effective_until:'下一次合格观察或数据失效'});}
 return {status:'available',levels};
}
