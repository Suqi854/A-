// Quote capture intent only; never reads bridge, analysis or trading state.
export const QUOTE_CAPTURE_PREFERENCE_KEY='ashare.quote-capture.preference';
export function resolveQuoteCapturePreference(raw){
 const explicitPause=raw&&raw.enabled===false&&(raw.version===1||raw.intent==='user'||raw.userPaused===true);
 return {version:1,enabled:!explicitPause,intent:explicitPause?'user':raw?.version===1&&raw.intent==='user'?'user':'default-migration'};
}
export function createQuoteCapturePreference(storage){
 const key='ashare.quote-capture.preference';let raw=null,persisted=false;
 try{raw=JSON.parse(storage?.getItem(key)??'null');}catch{}
 let value=resolveQuoteCapturePreference(raw);
 function persist(){try{if(storage){storage.setItem(key,JSON.stringify(value));persisted=true;}else persisted=false;}catch{persisted=false;}}
 persist();
 return {get enabled(){return value.enabled;},get persisted(){return persisted;},snapshot(){return {...value,persisted};},set(enabled){value={version:1,enabled:enabled===true,intent:'user'};persist();return this.snapshot();}};
}
export const quoteCapturePreferenceScript='const resolveQuoteCapturePreference='+resolveQuoteCapturePreference.toString()+';\nconst createQuoteCapturePreference='+createQuoteCapturePreference.toString()+';\nconst quoteCapturePreference=createQuoteCapturePreference((()=>{try{return window.localStorage;}catch{return null;}})());\n';

