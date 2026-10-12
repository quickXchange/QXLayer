/**
 * Explicit frontend color release: existing isolated Preview + three Staging
 * origin bindings. Restart the API at its CURRENT LIVE revision, never new code.
 * No database calls, DNS, repository metadata, main, paid plans or Worker writes.
 */
import { ReplitConnectors } from '@replit/connectors-sdk';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

if (process.env.QXLAYER_STAGING_COLORS_AND_ORIGIN_RESTART_APPROVED !== 'true')
  throw Error('Explicit Staging frontend/origin/restart approval required.');
const sdk = new ReplitConnectors();
const repo = 'quickXchange/QXLayer', branch = 'qxlayer-staging';
const apiId = 'srv-db5b47qjnfac739s374g', workerId = 'srv-db5b48o473hc73ah56d0';
const groupId = 'evg-db5ate8473hc73agdon0';
const project = 'prj_MoGcFUBrfUHrmtRjHqNuYIaUbQcx', team = 'team_eoJE6FCcm9esuqnRTUsmopzy';
const evidence = 'generated-artifacts/qxlayer-staging-setup/vynox-colors-release.json';
try { await access(evidence); throw Error('Release receipt already exists; reconcile it instead of repeating this release.'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
async function provider(kind, route, method = 'GET', body) {
  const r = kind === 'render' ? await fetch(`https://api.render.com/v1/${route}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) : await sdk.proxy(kind, route, { method, ...(body ? { body } : {}) });
  if (!r.ok) throw Error(`Scoped ${kind} ${method} HTTP ${r.status}; reconcile before retry.`);
  const text = await r.text(); return text ? JSON.parse(text) : null;
}
const [api, group, apiVariables, deployments, worker, p, variables, main, repository] = await Promise.all([
  provider('render', `services/${apiId}`), provider('render', `env-groups/${groupId}`),
  provider('render', `services/${apiId}/env-vars?limit=100`),
  provider('render', `services/${apiId}/deploys?limit=20`),
  provider('render', `services/${workerId}`),
  provider('vercel', `/v9/projects/${project}?teamId=${team}`),
  provider('github', `/repos/${repo}/environments/${branch}/variables`),
  provider('github', `/repos/${repo}/git/ref/heads/main`),
  provider('github', `/repos/${repo}`),
]);
const envMap = rows => Object.fromEntries(rows.map(x => { const v = x.envVar || x; return [v.key, v.value]; }));
const cfg = envMap(group.envVars), beforeApiEnv = envMap(apiVariables);
const vars = Object.fromEntries(variables.variables.map(v => [v.name, v.value]));
const live = deployments.map(x => x.deploy || x).find(x => x.status === 'live');
if (api.branch !== branch || api.environmentId !== group.environmentId ||
    api.serviceDetails?.plan !== 'starter' || api.autoDeploy !== 'no' ||
    worker.suspended !== 'suspended' || cfg.QXLAYER_EXTERNAL_ENVIRONMENT !== 'staging' ||
    cfg.QXLAYER_EXTERNAL_STARTUP_APPROVED !== 'false' ||
    !/^[a-f0-9]{40}$/.test(live?.commit?.id || '') ||
    p.id !== project || p.name !== 'qxlayer-staging' || p.accountId !== team || p.link || !p.hasDeployments ||
    vars.VERCEL_PROJECT_ID !== project || vars.RENDER_API_SERVICE_ID !== apiId)
  throw Error('Existing Staging identity, live revision or safety boundary changed.');
const backendCommit = live.commit.id;
const cleanEnv = { ...process.env };
for (const key of Object.keys(cleanEnv)) if (/^GIT_(TRACE|CURL_VERBOSE)/.test(key)) delete cleanEnv[key];
const helper = '!node -e \'process.stdout.write("username=x-access-token\\npassword="+process.env.GITHUB_TOKEN+"\\n")\'';
function git(args, env = cleanEnv) {
  const r = spawnSync('git', ['-c', 'credential.helper=', '-c', `credential.helper=${helper}`, ...args],
    { env, encoding: 'utf8' });
  if (r.status !== 0) throw Error('Scoped Git operation failed; credential details suppressed.');
  return r.stdout.trim();
}
if (git(['remote', 'get-url', 'origin']) !== `https://github.com/${repo}.git`) throw Error('Unexpected source repository.');
const prior = git(['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s/)[0];
if (!/^[a-f0-9]{40}$/.test(prior)) throw Error('Existing Staging source required.');
git(['fetch', '--no-tags', 'origin', prior]);
const prefixes = ['artifacts/private-label-console/', 'artifacts/private-label-website/', 'scripts/branding/'];
const allowed = file => prefixes.some(prefix => file.startsWith(prefix));
// Automatic workspace checkpoints may already commit the work; compare to the
// fetched Staging revision, not HEAD or a clean-worktree indicator.
const changed = git(['diff', '--name-only', prior, '--', ...prefixes]).split('\n').filter(Boolean);
const added = git(['ls-files', '--others', '--exclude-standard', '--', ...prefixes]).split('\n').filter(Boolean);
const selected = [...new Set([...changed, ...added, 'scripts/external-hosting/release-staging-colors.mjs'])];
if (!changed.length || selected.some(file => !allowed(file) && file !== 'scripts/external-hosting/release-staging-colors.mjs'))
  throw Error('Expected bounded frontend color changes.');
let commit;
const temp = await mkdtemp(path.join(tmpdir(), 'vynox-colors-source-'));
try {
  const env = { ...cleanEnv, GIT_INDEX_FILE: path.join(temp, 'index') };
  git(['read-tree', prior], env); // Preserve the entire existing Staging tree outside selected files.
  git(['add', '--', ...selected], env);
  const tree = git(['write-tree'], env);
  commit = git(['commit-tree', tree, '-p', prior, '-m', 'VYNOX LAYER shared Dark/Light colors and transparent theme logos'], {
    ...cleanEnv, GIT_AUTHOR_NAME: 'VYNOX LAYER Release', GIT_AUTHOR_EMAIL: 'release@users.noreply.github.com',
    GIT_COMMITTER_NAME: 'VYNOX LAYER Release', GIT_COMMITTER_EMAIL: 'release@users.noreply.github.com',
  });
  const actual = git(['diff', '--name-only', prior, commit]).split('\n').filter(Boolean);
  if (actual.some(file => !selected.includes(file))) throw Error('Source release escaped its reviewed scope.');
  git(['push', 'origin', `${commit}:refs/heads/${branch}`]);
  if (git(['ls-remote', 'origin', `refs/heads/${branch}`]).split(/\s/)[0] !== commit) throw Error('Staging source readback failed.');
} finally { await rm(temp, { recursive: true, force: true }); }
const receipt = { status: 'SOURCE_READY', frontendCommit: commit, backendCommit, backendCodeUnchanged: true,
  authProviderPreserved: cfg.QXLAYER_AUTH_PROVIDER || 'clerk', productionReleased: false, dnsChanged: false,
  databaseOperations: false, workerActivated: false };
const save = () => writeFile(evidence, JSON.stringify(receipt, null, 2) + '\n');
await save();
function run(script, env) {
  const r = spawnSync('node', [script], { env, stdio: 'inherit' });
  if (r.status !== 0) throw Error(`Staging release stopped at ${script}; reconcile saved receipt.`);
}
run('scripts/external-hosting/build-frontends.mjs', {
  ...cleanEnv, ...vars, QXLAYER_EXTERNAL_ENVIRONMENT: 'staging',
  QXLAYER_API_ORIGIN: 'https://qxlayer-api.onrender.com', QXLAYER_AUTH_PROVIDER: cfg.QXLAYER_AUTH_PROVIDER || 'clerk',
  VITE_CLERK_PUBLISHABLE_KEY: vars.CLERK_PUBLISHABLE_KEY || cfg.CLERK_PUBLISHABLE_KEY,
  VITE_CLERK_PROXY_URL: vars.CLERK_PROXY_PUBLIC_URL,
  QXLAYER_PREVIEW_BOOTSTRAP: 'false',
});
run('scripts/external-hosting/deploy-integrated-preview.mjs', {
  ...cleanEnv, QXLAYER_STAGING_API_INTEGRATION_APPROVED: 'true',
});
const previewReceipt = JSON.parse(await readFile('generated-artifacts/qxlayer-staging-setup/integrated-preview-deployment.json', 'utf8'));
const d = await provider('vercel', `/v13/deployments/${previewReceipt.id}?teamId=${team}`);
if (d.projectId !== project || d.readyState !== 'READY' || ![null, undefined, 'preview'].includes(d.target))
  throw Error('Staging Preview target readback failed.');
const origin = `https://${d.url}`;
Object.assign(receipt, { status: 'PREVIEW_READY', previewId: d.id, previewUrl: origin, providerTarget: d.target ?? 'preview' });
await save();
const keys = ['QXLAYER_PLATFORM_URL', 'QXLAYER_AUTH_URL', 'CLERK_AUTHORIZED_PARTIES'];
for (const target of [`env-groups/${groupId}`, `services/${apiId}`]) {
  for (const key of keys) await provider('render', `${target}/env-vars/${key}`, 'PUT', { value: origin });
}
function verifyEnvironment(before, after) {
  if (keys.some(key => after[key] !== origin)) throw Error('Staging origin binding readback failed.');
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!keys.includes(key) && before[key] !== after[key]) throw Error('An unrelated Staging environment value changed.');
  }
}
const [afterGroup, afterApiVariables] = await Promise.all([
  provider('render', `env-groups/${groupId}`), provider('render', `services/${apiId}/env-vars?limit=100`),
]);
verifyEnvironment(cfg, envMap(afterGroup.envVars)); verifyEnvironment(beforeApiEnv, envMap(afterApiVariables));
receipt.status = 'ORIGINS_VERIFIED'; await save();
run('scripts/external-hosting/release-render.mjs', {
  ...cleanEnv, GITHUB_SHA: backendCommit, RENDER_API_SERVICE_ID: apiId,
  QXLAYER_EXTERNAL_RELEASES_APPROVED: 'true', QXLAYER_EXTERNAL_ENVIRONMENT: 'staging',
  QXLAYER_WORKER_RELEASE_APPROVED: 'false',
});
const [afterMain, afterWorker, afterRepo, afterDeployments] = await Promise.all([
  provider('github', `/repos/${repo}/git/ref/heads/main`),
  provider('render', `services/${workerId}`), provider('github', `/repos/${repo}`),
  provider('render', `services/${apiId}/deploys?limit=10`),
]);
const afterLive = afterDeployments.map(x => x.deploy || x).find(x => x.status === 'live');
if (afterMain.object.sha !== main.object.sha || afterWorker.suspended !== 'suspended' ||
    afterRepo.description !== repository.description || afterLive?.commit?.id !== backendCommit)
  throw Error('Final source, metadata, Worker or backend revision boundary failed.');
Object.assign(receipt, { status: 'READY', mainUnchanged: true, repositoryMetadataUnchanged: true,
  unrelatedEnvironmentUnchanged: true, workerSuspended: true, backendRevisionVerified: true });
await save();
console.info(`Staging color release ready: ${origin}. API code preserved; no database operations.`);
