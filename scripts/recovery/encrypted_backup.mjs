#!/usr/bin/env node
// Encryption only. This module never starts PostgreSQL clients or reads databases.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'node:crypto';
import { promises as fs, createWriteStream } from 'node:fs';
import { dirname, resolve, basename, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import assert from 'node:assert/strict';

const MAGIC = Buffer.from('QXLAYER-ENCRYPTED-BACKUP-V1\n');
const SALT = 32, NONCE = 12, TAG = 16;
const HEADER = MAGIC.length + SALT + NONCE;
// Outside the project/dev-server filesystem tree, never a downloadable artifact.
export const STORAGE = join(homedir(), '.qxlayer-private-backups');
const derive = (passphrase, salt) => scryptSync(passphrase, salt, 32,
  { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });

export async function storageCheck() {
  const parent = await fs.lstat(dirname(STORAGE));
  if (parent.isSymbolicLink()) throw new Error('No symlinked storage parents');
  await fs.mkdir(STORAGE, { recursive: false, mode: 0o700 }).catch(e => {
    if (e.code !== 'EEXIST') throw e;
  });
  const st = await fs.lstat(STORAGE);
  if (!st.isDirectory() || st.isSymbolicLink() || (st.mode & 0o777) !== 0o700
      || st.uid !== process.getuid()) throw new Error('Private owned 0700 storage required');
  const space = await fs.statfs(STORAGE, { bigint: true });
  const free = space.bavail * space.bsize;
  if (free < 2n * 1024n ** 3n) throw new Error('Insufficient conservative free-space minimum');
  return { storage_directory_prepared: true, permissions: '0700',
    free_bytes: free.toString(), encryption: 'AES-256-GCM / scrypt N=131072,r=8,p=1',
    ciphertext_only: true, durable_external_copy_verified: false,
    note: 'Private local staging outside the project, not an independent durable backup. No plaintext export directory is approved.' };
}

export async function seal(input, name, passphrase) {
  await storageCheck();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.qxb$/.test(name) || basename(name) !== name)
    throw new Error('Safe ciphertext basename required');
  if (typeof passphrase !== 'string' || passphrase.length < 24 || passphrase.length > 4096)
    throw new Error('Use a unique high-entropy backup passphrase, at least 24 characters');
  const salt = randomBytes(SALT), nonce = randomBytes(NONCE);
  const header = Buffer.concat([MAGIC, salt, nonce]);
  const key = derive(passphrase, salt);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(header);
  const output = join(STORAGE, name);
  const temporary = output + '.' + randomBytes(12).toString('hex') + '.partial';
  try {
    const initial = await fs.open(temporary, 'wx', 0o600);
    await initial.writeFile(header);
    await initial.close();
    await pipeline(input, cipher, createWriteStream(temporary, { flags: 'a', mode: 0o600 }));
    const file = await fs.open(temporary, 'a');
    await file.writeFile(cipher.getAuthTag());
    await file.sync();
    await file.close();
    // link is atomic and refuses overwrite, unlike rename on Linux.
    await fs.link(temporary, output);
    await fs.unlink(temporary);
    const directory = await fs.open(STORAGE, 'r');
    await directory.sync();
    await directory.close();
    return output;
  } catch {
    await fs.unlink(temporary).catch(() => {});
    throw new Error('Encryption failed; partial ciphertext removed; details suppressed');
  } finally {
    key.fill(0);
  }
}

// Memory-only decryption is for the tiny SYNTHETIC canary, never real records.
function openCanary(bytes, passphrase) {
  if (!bytes.subarray(0, MAGIC.length).equals(MAGIC) || bytes.length < HEADER + TAG)
    throw new Error('Invalid encrypted envelope');
  const header = bytes.subarray(0, HEADER);
  const salt = header.subarray(MAGIC.length, MAGIC.length + SALT);
  const nonce = header.subarray(MAGIC.length + SALT);
  const key = derive(passphrase, salt);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(header);
    decipher.setAuthTag(bytes.subarray(-TAG));
    return Buffer.concat([decipher.update(bytes.subarray(HEADER, -TAG)), decipher.final()]);
  } finally { key.fill(0); }
}

export async function syntheticTest(passphrase = 'PUBLIC-SYNTHETIC-TEST-KEY-NOT-A-REAL-SECRET') {
  const name = 'SYNTHETIC-ONLY-' + randomBytes(10).toString('hex') + '.qxb';
  const sample = Buffer.from('QXLayer synthetic canary. NO Production records.\n');
  const file = await seal(Readable.from([sample]), name, passphrase);
  try {
    const bytes = await fs.readFile(file);
    assert.equal(bytes.includes(sample), false);
    assert.deepEqual(openCanary(bytes, passphrase), sample);
    assert.throws(() => openCanary(bytes, passphrase + '-WRONG'));
    const tampered = Buffer.from(bytes); tampered[HEADER] ^= 1;
    assert.throws(() => openCanary(tampered, passphrase));
    const headerTampered = Buffer.from(bytes); headerTampered[MAGIC.length] ^= 1;
    assert.throws(() => openCanary(headerTampered, passphrase));
    assert.throws(() => openCanary(bytes.subarray(0, -1), passphrase));
    await assert.rejects(seal(Readable.from([sample]), name, passphrase));
    await assert.rejects(seal(Readable.from([sample]), '../escape.qxb', passphrase));
    await assert.rejects(seal(Readable.from([sample]), 'weak-key.qxb', 'short'));
    assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
    assert.equal((await fs.readdir(STORAGE)).some(n => n.endsWith('.partial')), false);
    return { synthetic_checks_passed: 10, actual_records_used: false,
      production_export_authorized: false, external_key_recovery_verified: false };
  } finally { await fs.unlink(file).catch(() => {}); }
}

async function main() {
  const [command, name, confirm, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error('Unexpected arguments');
  if (command === 'prepare' && !name) {
    console.log(JSON.stringify(await storageCheck(), null, 2));
  } else if (command === 'self-test' && !name) {
    console.log(JSON.stringify(await syntheticTest(), null, 2));
  } else if (command === 'check-configured-key' && !name) {
    const secret = process.env.QXLAYER_BACKUP_PASSPHRASE;
    if (!secret) throw new Error('Backup passphrase not configured');
    console.log(JSON.stringify(await syntheticTest(secret), null, 2));
  } else if (command === 'seal-stdin' && confirm === 'QXLayer-Encrypted-Backup-Handling') {
    // Requires separate upstream export authorization. No source connection here.
    const file = await seal(process.stdin, name, process.env.QXLAYER_BACKUP_PASSPHRASE);
    const hash = createHash('sha256');
    const handle = await fs.open(file, 'r');
    try { for await (const chunk of handle.createReadStream()) hash.update(chunk); }
    finally { await handle.close(); }
    console.log(JSON.stringify({ ciphertext_created: true, sha256: hash.digest('hex') }));
  } else throw new Error('Use prepare, self-test, check-configured-key, or separately authorized seal-stdin');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('BLOCKED: encrypted backup preparation failed; no secrets or records logged.');
    process.exitCode = 1;
  });
}
