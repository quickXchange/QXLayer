import { readFile, writeFile, stat } from 'node:fs/promises';
const dir='generated-artifacts/performance';
const before=JSON.parse(await readFile(`${dir}/before.json`,'utf8'));
const after=JSON.parse(await readFile(`${dir}/after.json`,'utf8'));
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const pct=(b,a)=>((b-a)/b*100).toFixed(1)+'%';
const rows=[];
for(const device of ['desktop','tablet','mobile']) for(const route of ['/','/private-label-website/novax-live-demo']){
  const b=before.runs.filter(r=>r.device===device&&r.route===route),a=after.runs.filter(r=>r.device===device&&r.route===route);
  const bm=median(b.map(r=>r.lcpMs)),am=median(a.map(r=>r.lcpMs));
  rows.push([route==='/'?'QXLayer landing':'NovaX',device,bm+' ms',am+' ms',pct(bm,am),
    Math.max(...a.map(r=>r.cls)).toFixed(6),
    median(a.map(r=>r.measuredInteractionMs))+' ms']);
}
const asset=phase=>phase.assets.filter(x=>x.app.includes('console')&&/^index-.*\.js$/.test(x.file)).sort((a,b)=>b.bytes-a.bytes)[0];
const b=asset(before),a=asset(after);
const catalog=phase=>median(phase.api.find(x=>x.endpoint.includes('product-catalog')).samplesMs);
const imageRows=[];
for(const theme of ['dark','light']){
  const png=(await stat(`artifacts/private-label-console/public/qxlayer-logo-${theme}.png`)).size;
  const webp=(await stat(`artifacts/private-label-console/public/qxlayer-logo-${theme}.webp`)).size;
  imageRows.push([`Platform ${theme} logo`,(png/1024).toFixed(1)+' KiB',(webp/1024).toFixed(1)+' KiB',pct(png,webp)]);
}
const packageStats=JSON.parse(await readFile(`${dir}/package.json`,'utf8'));
const qa=JSON.parse(await readFile(`${dir}/verification.json`,'utf8'));
const table=(headers,rows)=>`| ${headers.join(' | ')} |\n| ${headers.map(()=> '---').join(' | ')} |\n${rows.map(row=>'| '+row.join(' | ')+' |').join('\n')}`;
const text=`# QXLayer Development performance report

## Measured results
Median of three cold-cache runs per route/viewport. Positive improvement means faster; negative means slower.

${table(['Page','Viewport','Before LCP','After LCP','Improvement','After CLS (max)','Lab click duration (median)'],rows)}

${table(['Resource','Before','After','Reduction'],[
['Console bootstrap JavaScript, raw',(b.bytes/1000).toFixed(1)+' kB',(a.bytes/1000).toFixed(1)+' kB',pct(b.bytes,a.bytes)],
['Console bootstrap JavaScript, gzip',(b.gzipBytes/1000).toFixed(1)+' kB',(a.gzipBytes/1000).toFixed(1)+' kB',pct(b.gzipBytes,a.gzipBytes)],
...imageRows,
['Development public catalog API (15 samples, median)',catalog(before)+' ms',catalog(after)+' ms',pct(catalog(before),catalog(after))]
])}

No observed public-route horizontal overflow or uncaught runtime errors in the final measurement runs. NovaX LCP is essentially unchanged; small differences are within the variability of this short lab sample. These numbers do not prove a NovaX speedup.

Full landing-route JS transfer after all lazy chunks and the Clerk SDK settle is approximately unchanged (about 516 kB); splitting moves noncritical work out of bootstrap, not out of the complete experience. Website route JS transfer decreases slightly. No runtime libraries/features were removed just to make bundle totals smaller.

## Implemented
- Separate lazy console/customer shells and catalog chunk; existing route splitting retained. Authorized navigation intent preloads the matching route's code only, respecting data-saver/slow-network settings; no data or capability prefetch.
- Native signed-in navigation no longer waits on or polls the unused isolated-demo-session request. The actual demo-session checks and expiry remain in place for demo tabs.
- Original font families, weights, axes and unicode ranges hosted locally as WOFF2, with font license notices; no new fonts added to the standalone NovaX website.
- Pixel-identical lossless WebP platform logos; original PNGs remain available.
- Count-up text updates without a React state update every animation frame; original easing/duration, visibility behavior and reduced-motion handling retained.
- Shared Reveal intersection observer with identical threshold margin; memoized exchange output card and stable asset-count calculation. No animation CSS, geometry, colors or feature configuration changed.
- Database setup transport reduced by three round trips in the native role path and two in the external role path. Every existing per-request role/schema/policy/grant check and parameterized transaction-local context remains.
- Local Vercel packaging includes gzip/Brotli sidecars. Hashed compiled JS/CSS/fonts use private immutable browser caching and ETags, after gate authorization. HTML stays private no-store; no new API/private-data response cache.

Local package verification: ${packageStats.files} JS/CSS/HTML/SVG files; original ${packageStats.originalBytes} bytes, Brotli ${packageStats.brotliBytes} bytes (${pct(packageStats.originalBytes,packageStats.brotliBytes)} smaller), gzip ${packageStats.gzipBytes} bytes. This is an inventory of all packaged files, not a page's transfer size, and is not an extra cold-page reduction over the benchmark, which already used Brotli before and after.

## Verification
${qa.summary}

TypeScript checks, release regression suite, external-hosting safeguards, static compression/cache gate tests, database-transport regression and local frontend/API builds passed. All 14 font binaries have valid WOFF2 signatures. Actual Development database read-only checks confirmed restricted role, RLS denial to an unassigned synthetic actor, write denial and pool-context cleanup. No policy/schema/migration edits, security-check cache, Production queries/mutations, external rollout, domain changes or Supabase migration operations.

${qa.gaps}

## Measurement limits
Same public build settings, same loopback Brotli server and live Development API, Chromium, fresh browser cache per navigation, 4500-ms settle, three repetitions, desktop/tablet/mobile CPU rates 1x/2x/4x. These are browser lab measurements on the development machine, not cloud latency, real mobile hardware/network or field Core Web Vitals.

The click timings are trusted-click Event Timing samples, not field INP or a field p75. No field INP, Lighthouse score, Vercel/Render cold-start improvement, cloud CDN improvement or authenticated-dashboard before/after timing is claimed. Cloud accounts are not connected for rollout, and deployment was not authorized.

Raw samples/screenshots: generated-artifacts/performance/before.json, after.json and before/after PNGs. Reproduce with scripts/performance/measure.mjs using identically configured untouched/optimized builds. Do not compare an older external/synthetic-auth build against a native-auth build.
`;
await writeFile(`${dir}/report.md`,text);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const htmlTable=(headers,rows)=>`<table><thead><tr>${headers.map(s=>`<th>${escape(s)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(s=>`<td>${escape(s)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
function markdownHtml(source) {
  const lines=source.split('\n'),blocks=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(!line.trim())continue;
    if(/^#{1,3} /.test(line)){
      const level=line.match(/^#+/)[0].length;
      blocks.push(`<h${level}>${escape(line.slice(level+1))}</h${level}>`);
    }else if(line.startsWith('| ')){
      const grid=[];
      while(i<lines.length&&lines[i].startsWith('| '))grid.push(lines[i++].split('|').slice(1,-1).map(x=>x.trim()));
      i--;blocks.push(`<section>${htmlTable(grid[0],grid.slice(2))}</section>`);
    }else if(line.startsWith('- ')){
      const items=[];
      while(i<lines.length&&lines[i].startsWith('- '))items.push(`<li>${escape(lines[i++].slice(2))}</li>`);
      i--;blocks.push(`<ul>${items.join('')}</ul>`);
    }else blocks.push(`<p>${escape(line)}</p>`);
  }
  return blocks.join('\n');
}
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QXLayer performance report</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#f6f7f9;color:#172033;margin:0}main{max-width:1080px;margin:32px auto;padding:32px;background:white;border:1px solid #dde2e9;border-radius:12px}h1{line-height:1.2}h2{margin-top:36px}p,li{max-width:90ch}li{margin-bottom:10px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:10px;border-bottom:1px solid #dde2e9}th{background:#eef2f6}section{overflow:auto}@media(max-width:600px){main{padding:16px;margin:0;border-radius:0}}</style><main>${markdownHtml(text)}</main></html>`;
if(Buffer.byteLength(html,'utf8')>5*1024*1024)throw Error('Report exceeds delivery budget.');
await writeFile(`${dir}/report.html`,html);
console.log('Performance report generated.');
