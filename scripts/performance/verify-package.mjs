import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const result = spawnSync('node',['scripts/external-hosting/build-frontends.mjs'],{
  stdio:'inherit',env:{...process.env,
    QXLAYER_API_ORIGIN:'https://qx-performance-fixture.onrender.com',
    VITE_CLERK_PUBLISHABLE_KEY:'pk_test_'+Buffer.from('synthetic.example.com$').toString('base64'),
    VITE_CLERK_PROXY_URL:'https://frontend.example.com/__clerk',
  },
});
if(result.status!==0)throw Error('Local fixture packaging failed');
let files=0,originalBytes=0,brotliBytes=0,gzipBytes=0;
async function verify(dir){
  for(const e of await readdir(dir,{withFileTypes:true})){
    const file=`${dir}/${e.name}`;
    if(e.isDirectory())await verify(file);
    else if(/\.(js|css|html|svg)$/.test(file)){
      const body=await readFile(file),br=await readFile(file+'.br'),gz=await readFile(file+'.gz');
      assert.deepEqual(brotliDecompressSync(br),body);assert.deepEqual(gunzipSync(gz),body);
      assert.ok((await stat(file)).size<=4*1024*1024);
      files++;originalBytes+=body.length;brotliBytes+=br.length;gzipBytes+=gz.length;
    }
  }
}
await verify('.vercel/output/functions/frontend.func/static');
const summary={scope:'Local fixture packaging only; no rollout, cloud request or Production change',files,originalBytes,brotliBytes,gzipBytes};
await writeFile('generated-artifacts/performance/package.json',JSON.stringify(summary,null,2));
console.log(summary);
