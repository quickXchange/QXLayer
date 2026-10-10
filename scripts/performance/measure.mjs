// Local production-build measurement. No credentials, user records or mutations.
import { createServer, request } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
const phase = process.argv[2];
if (!['before','after'].includes(phase)) throw Error('Choose before or after.');
const root = process.cwd(), buildRoot = process.env.QXLAYER_PERF_BUILD_ROOT ?? root,
  output = path.join(root,'generated-artifacts/performance');
await mkdir(output,{recursive:true});
const roots = ['artifacts/private-label-console/dist/public','artifacts/private-label-website/dist/public'];
const server = createServer(async(req,res)=>{
  if (req.url.startsWith('/api/')) {
    const upstream = request({hostname:'127.0.0.1',port:8080,path:req.url,method:'GET',
      headers:{host:process.env.REPLIT_DEV_DOMAIN ?? 'localhost',accept:'application/json'}},r=>{
      res.writeHead(r.statusCode,r.headers);r.pipe(res);
    });
    upstream.on('error',()=>res.writeHead(502).end());upstream.end();return;
  }
  try {
    const site=req.url.startsWith('/private-label-website/');
    const base=path.join(buildRoot,roots[site?1:0]);
    const name=decodeURIComponent(req.url.split('?')[0]).replace(site?/^\/private-label-website\/?/:/^\//,'');
    if(name.includes('..')) {res.writeHead(404).end();return;}
    const file=path.join(base,path.extname(name)?name:'index.html'),bytes=await readFile(file);
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
    // Identical compressed transport before/after; loopback, not a cloud benchmark.
    const compressed=brotliCompressSync(bytes);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream',
      'Content-Encoding':'br','Cache-Control':'no-store'});res.end(compressed);
  } catch {res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const profile=await mkdtemp(path.join(tmpdir(),'qx-perf-'));
const chrome=spawn('/repl/tools/bin/chromium',['--headless','--no-sandbox','--disable-dev-shm-usage',
  '--remote-debugging-port=9337',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let socket;
try {
  let target;
  for(let i=0;i<100;i++){try {target=(await(await fetch('http://127.0.0.1:9337/json')).json()).find(t=>t.type==='page');if(target)break;}catch{} await new Promise(r=>setTimeout(r,100));}
  if(!target)throw Error('Chromium failed to start.');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let id=0;const pending=new Map(),responses=new Map(),transfers=new Map();
  socket.addEventListener('message',e=>{
    const m=JSON.parse(e.data);
    if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
    if(m.method==='Network.responseReceived')responses.set(m.params.requestId,m.params.response.mimeType);
    if(m.method==='Network.loadingFinished')transfers.set(m.params.requestId,m.params.encodedDataLength);
  });
  const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true})).result.value;
  await call('Page.enable');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});
  await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__perf={lcp:0,cls:0,events:[],errors:[]};
    new PerformanceObserver(l=>{for(const e of l.getEntries())window.__perf.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__perf.cls+=e.value}).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.interactionId)window.__perf.events.push(e.duration)}).observe({type:'event',buffered:true,durationThreshold:16});
    window.addEventListener('error',e=>window.__perf.errors.push(e.message));`});
  const runs=[];
  for(const [device,width,height,cpu] of [['desktop',1280,900,1],['tablet',768,1024,2],['mobile',390,844,4]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});
    await call('Emulation.setCPUThrottlingRate',{rate:cpu});
    for(const route of ['/','/private-label-website/novax-live-demo']) {
      for(let repeat=0;repeat<3;repeat++){
        responses.clear();transfers.clear();await call('Network.clearBrowserCache');
        await call('Page.navigate',{url:origin+route});await new Promise(r=>setTimeout(r,4500));
        const before=await evaluate(`({...window.__perf,overflow:document.documentElement.scrollWidth>innerWidth+1,
          title:document.title,ready:!!document.querySelector('.s-hero'),navigation:performance.getEntriesByType('navigation')[0]?.toJSON(),
          fonts:document.fonts.status})`);
        const click=await evaluate(`(()=>{const b=document.querySelector('[data-testid="tab-convert"]')||document.querySelector('[data-testid="button-theme"]');
          if(!b)return null;const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
        if(click){await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...click});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...click});await new Promise(r=>setTimeout(r,300));}
        const events=await evaluate('window.__perf.events');
        const jsBytes=[...transfers].filter(([k])=>/javascript/.test(responses.get(k)??'')).reduce((s,[,n])=>s+n,0);
        const run={device,route,repeat,lcpMs:Math.round(before.lcp),cls:before.cls,jsTransferBytes:jsBytes,
          domContentLoadedMs:Math.round(before.navigation?.domContentLoadedEventEnd??0),
          measuredInteractionMs:events.length?Math.max(...events):null,overflow:before.overflow,
          fonts:before.fonts,errors:before.errors,ready:before.ready};
        runs.push(run);console.log(JSON.stringify(run));
        if(repeat===0){const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,`${phase}-${device}-${route==='/'?'landing':'novax'}.png`),Buffer.from(shot.data,'base64'));}
      }
    }
  }
  const assets=[];
  for(const app of roots){for(const file of await readdir(path.join(buildRoot,app,'assets'))){if(!/\.(js|css)$/.test(file))continue;
    const b=await readFile(path.join(buildRoot,app,'assets',file));assets.push({app,file,bytes:b.length,gzipBytes:gzipSync(b).length});}}
  const api=[];
  for(const endpoint of ['/api/healthz','/api/public/product-catalog','/api/public/sites/novax-live-demo']){
    const samples=[];let status;
    for(let i=0;i<15;i++){const start=performance.now();const r=await fetch('http://127.0.0.1:8080'+endpoint,{headers:{host:process.env.REPLIT_DEV_DOMAIN??'localhost'}});status=r.status;await r.arrayBuffer();samples.push(Math.round((performance.now()-start)*10)/10);}
    api.push({endpoint,status,samplesMs:samples});console.log(JSON.stringify(api.at(-1)));
  }
  // A frontend baseline rebuild must not overwrite the API sample taken while
  // the original backend was running.
  if (phase === 'before' && process.env.QXLAYER_PERF_BUILD_ROOT) {
    const original = JSON.parse(await readFile(path.join(output,'before.json'),'utf8'));
    api.splice(0,api.length,...original.api);
  }
  await writeFile(path.join(output,`${phase}.json`),JSON.stringify({conditions:{transport:'loopback Brotli static builds, live Development API',cache:'cold per navigation',cpu:{desktop:1,tablet:2,mobile:4},repeats:3,settleMs:4500},runs,assets,api},null,2));
} finally {socket?.close();chrome.kill('SIGTERM');server.closeAllConnections();server.close();await new Promise(r=>setTimeout(r,300));await rm(profile,{recursive:true,force:true});}
