import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base = "962ed1b925bdb8c0cf0215e7231c835cde74af59";
const expected = {
  "src/page.mjs": "339cd0cac4a878bd1494cb9045cf003c6bc5252aa94d2d0abd6b459d5429a031",
  "scripts/build.mjs": "18781df30d62a024b74f53fc12085d35acc69bb2888a335a963f365e2c09d7d1"
};
const target=process.argv[2];
if(!target)throw Error('Pass the path of an isolated, verified v97 source checkout.');
const root=path.resolve(target),here=path.dirname(fileURLToPath(import.meta.url));
const head=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(head!==base)throw Error('Wrong source commit; no files changed.');
const files={};
for(const [name,sha] of Object.entries(expected)){
 const raw=readFileSync(path.join(root,name));
 if(createHash('sha256').update(raw).digest('hex')!==sha)throw Error('Base file differs: '+name+'; no files changed.');
 files[name]=raw.toString('utf8');
}
const additions={'src/overview-market-status-page.mjs':'overview-market-status-page.mjs','test/overview-market-status.test.mjs':'overview-market-status.test.mjs'};
for(const name of Object.keys(additions))if(existsSync(path.join(root,name)))throw Error('Candidate file already exists; no files changed.');
function once(text,needle,replacement){if(text.indexOf(needle)<0||text.indexOf(needle)!==text.lastIndexOf(needle))throw Error('Unexpected source layout; no files changed.');return text.replace(needle,replacement);}
let page=files['src/page.mjs'];
page=once(page,"import {VERSION} from './version.mjs';","import {VERSION} from './version.mjs';\nimport {marketStatusPanel,marketStatusStyles,marketStatusScript} from './overview-market-status-page.mjs';");
page=once(page,'<section class="card sources" id="market-reference-panel">','${marketStatusPanel}<section class="card sources" id="market-reference-panel">');
page=once(page,'const PAGE_PUBLIC_RETENTION_ALLOWED=false;','${marketStatusScript}\nconst PAGE_PUBLIC_RETENTION_ALLOWED=false;');
page=once(page,'function renderMarketContext(d,receivedAt){',"function renderMarketContext(d,receivedAt){\n $('market-status-card')?.setObservation?.(d);");
page=once(page,'function marketReadFailed(e){',"function marketReadFailed(e){$('market-status-card')?.setObservation?.(null,{failed:true});");
page=once(page,'</style>','${marketStatusStyles}</style>');
const build=once(files['scripts/build.mjs'],"copyFileSync('src/page.mjs','dist/server/page.mjs');","copyFileSync('src/page.mjs','dist/server/page.mjs');\ncopyFileSync('src/overview-market-status-page.mjs','dist/server/overview-market-status-page.mjs');");
// Compute and validate every replacement before writing either existing file.
const newFiles=Object.fromEntries(Object.entries(additions).map(([dest,src])=>[dest,readFileSync(path.join(here,src))]));
writeFileSync(path.join(root,'src/page.mjs'),page);writeFileSync(path.join(root,'scripts/build.mjs'),build);
for(const [dest,data] of Object.entries(newFiles))writeFileSync(path.join(root,dest),data);
console.log(JSON.stringify({base,changed_files:['src/page.mjs','scripts/build.mjs',...Object.keys(additions)],committed:false,pushed:false,deployed:false}));
