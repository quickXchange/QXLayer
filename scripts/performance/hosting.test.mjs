import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { brotliCompressSync } from 'node:zlib';
import { createStaticHandler } from '../../lib/production-access-gate/static-handler.mjs';

test('Immutable caching/compression stays behind the gate; HTML remains private no-store', async()=>{
  const dir=await mkdtemp(`${tmpdir()}/qx-cache-`);
  await mkdir(`${dir}/assets`);
  const body='window.example="synthetic compiled code";';
  await writeFile(`${dir}/index.html`,'<html>synthetic</html>');
  await writeFile(`${dir}/assets/index-1234abcd.js`,body);
  await writeFile(`${dir}/assets/index-1234abcd.js.br`,brotliCompressSync(Buffer.from(body)));
  const server=createServer(createStaticHandler(dir,{NODE_ENV:'test'}));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    const asset=await fetch(`${origin}/assets/index-1234abcd.js`,{headers:{'Accept-Encoding':'br'}});
    assert.equal(await asset.text(),body);
    assert.equal(asset.headers.get('content-encoding'),'br');
    assert.match(asset.headers.get('cache-control'),/^private.*immutable/);
    const revalidate=await fetch(`${origin}/assets/index-1234abcd.js`,{headers:{'Accept-Encoding':'br','If-None-Match':asset.headers.get('etag')}});
    assert.equal(revalidate.status,304);
    const plain=await fetch(`${origin}/assets/index-1234abcd.js`,{headers:{'Accept-Encoding':'br;q=0,gzip;q=0'}});
    assert.equal(plain.headers.get('content-encoding'),null);
    assert.equal(await plain.text(),body);
    assert.match((await fetch(origin)).headers.get('cache-control'),/no-store/);
    const locked=createStaticHandler(dir,{NODE_ENV:'production',PRODUCTION_ACCESS_GATE_ENABLED:'true',PRODUCTION_ACCESS_CODE:'synthetic-only'});
    server.removeAllListeners('request');server.on('request',locked);
    const denied=await fetch(`${origin}/assets/index-1234abcd.js`,{headers:{'If-None-Match':asset.headers.get('etag')}});
    assert.notEqual(denied.status,304);assert.notEqual(await denied.text(),body);
    assert.doesNotMatch(denied.headers.get('cache-control')??'',/immutable/);
  } finally {await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
