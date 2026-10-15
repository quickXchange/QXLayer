#!/usr/bin/env node
// Authenticate the ENTIRE original before a caller can consume any plaintext.
// Disk cache is independently chunk-authenticated ciphertext with an ephemeral
// memory-only key. No plaintext temporary file, even on authentication failure.
import { constants, promises as fs } from 'node:fs';
import { createDecipheriv, createCipheriv, randomBytes, scryptSync, createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { STORAGE, storageCheck } from './encrypted_backup.mjs';

const MAGIC = Buffer.from('QXLAYER-ENCRYPTED-BACKUP-V1\n');
const HEADER = MAGIC.length + 44, TAG = 16, CHUNK = 64 * 1024;
const aad = i => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(i)); return b; };

async function readExact(file, n, position = null) {
  const out = Buffer.alloc(n);
  let offset = 0;
  while (offset < n) {
    const { bytesRead } = await file.read(out, offset, n - offset,
      position === null ? null : position + offset);
    if (!bytesRead) throw new Error('Truncated ciphertext');
    offset += bytesRead;
  }
  return out;
}

export async function authenticatedPlaintext(path, passphrase, consume) {
  if (typeof passphrase !== 'string' || passphrase.length < 24 || passphrase.length > 4096)
    throw new Error('Configured backup key required');
  await storageCheck();
  const absolute = resolve(path);
  if (await fs.realpath(absolute) !== absolute) throw new Error('Symlinked ciphertext prohibited');
  const parent = await fs.stat(dirname(absolute));
  if (parent.uid !== process.getuid() || (parent.mode & 0o777) !== 0o700)
    throw new Error('Owned private 0700 input directory required');
  const source = await fs.open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
  let cacheDirectory, cache, key;
  const cacheKey = randomBytes(32);
  try {
    const st = await source.stat();
    if (!st.isFile() || st.uid !== process.getuid() || (st.mode & 0o777) !== 0o600
        || st.size < HEADER + TAG || st.nlink !== 1)
      throw new Error('Owned regular 0600 ciphertext required');
    const space = await fs.statfs(STORAGE, { bigint: true });
    if (space.bavail * space.bsize < BigInt(st.size) * 2n + 2n * 1024n ** 3n)
      throw new Error('Insufficient authentication-cache space');
    const header = await readExact(source, HEADER, 0);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Unknown envelope');
    const tag = await readExact(source, TAG, st.size - TAG);
    key = scryptSync(passphrase, header.subarray(MAGIC.length, MAGIC.length + 32), 32,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
    const decrypt = createDecipheriv('aes-256-gcm', key, header.subarray(-12));
    decrypt.setAAD(header); decrypt.setAuthTag(tag);
    cacheDirectory = await fs.mkdtemp(join(STORAGE, '.authenticated-recovery-'));
    cache = await fs.open(join(cacheDirectory, 'cache'), 'wx+', 0o600);
    let count = 0, total = 0;
    const ciphertextHash = createHash('sha256').update(header);
    async function cacheChunk(clear) {
      if (!clear.length) return;
      if (clear.length > CHUNK || count >= 0xffffffff) throw new Error('Cache bounds exceeded');
      const nonce = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', cacheKey, nonce);
      cipher.setAAD(aad(count));
      const length = Buffer.alloc(4); length.writeUInt32BE(clear.length);
      const sealed = Buffer.concat([length, nonce, cipher.update(clear), cipher.final(), cipher.getAuthTag()]);
      await cache.writeFile(sealed);
      count++; total += clear.length;
      clear.fill(0);
    }
    if (st.size > HEADER + TAG) {
      for await (const bytes of source.createReadStream({
        start: HEADER, end: st.size - TAG - 1, highWaterMark: CHUNK, autoClose: false,
      })) {
        ciphertextHash.update(bytes);
        await cacheChunk(decrypt.update(bytes));
      }
    }
    await cacheChunk(decrypt.final()); // Entire source GCM must pass BEFORE consume.
    ciphertextHash.update(tag);
    await cache.sync();
    const sha256 = ciphertextHash.digest('hex');
    let consumed = 0, finished = false;
    async function* clearChunks() {
      let position = 0;
      for (let i = 0; i < count; i++) {
        const length = (await readExact(cache, 4, position)).readUInt32BE();
        if (!length || length > CHUNK) throw new Error('Invalid cache frame');
        position += 4;
        const nonce = await readExact(cache, 12, position); position += 12;
        const bytes = await readExact(cache, length, position); position += length;
        const auth = await readExact(cache, TAG, position); position += TAG;
        const decipher = createDecipheriv('aes-256-gcm', cacheKey, nonce);
        decipher.setAAD(aad(i)); decipher.setAuthTag(auth);
        const clear = Buffer.concat([decipher.update(bytes), decipher.final()]);
        consumed += clear.length;
        // Readable.from may prefetch while a downstream async write still owns
        // the yielded bytes. Never zero a consumer-owned buffer on iterator
        // advance: give it an independent bounded copy, then wipe OUR buffer.
        // The consumer copy remains memory-only and is reclaimed normally.
        const consumerBytes = Buffer.from(clear);
        clear.fill(0);
        yield consumerBytes;
      }
      if (position !== (await cache.stat()).size || consumed !== total)
        throw new Error('Authentication cache length mismatch');
      finished = true;
    }
    const result = await consume(clearChunks(), { sha256, plaintext_bytes: total });
    if (!finished || consumed !== total) throw new Error('Consumer did not verify the complete package');
    return { ciphertext_sha256: sha256, plaintext_bytes: total, result };
  } finally {
    key?.fill(0); cacheKey.fill(0);
    await cache?.close().catch(() => {});
    await source.close().catch(() => {});
    if (cacheDirectory) await fs.rm(cacheDirectory, { recursive: true, force: true });
  }
}
