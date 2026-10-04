import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Development-only screenshots through an ephemeral local Chromium/CDP session.
// Uses the real public app and its actual theme button; never changes tenant data.
if (process.env.NODE_ENV === 'production') throw new Error('Development screenshots only.');
if (!process.env.REPLIT_DEV_DOMAIN) throw new Error('Development preview domain required.');
const debug = 'http://127.0.0.1:9237';
const target = await (await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
const posts = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (message.method === 'Network.requestWillBeSent' && message.params.request.method === 'POST') posts.push(message.params.request.url);
};
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Preview did not become ready: ${expression}`);
}
async function click(selector) {
  const point = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('Missing visual control');
    el.scrollIntoView({block:'center',behavior:'instant'});
    const r = el.getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2};
  })()`);
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
const directory = 'screenshots/customer-visual-upgrade';
await mkdir(directory, { recursive: true });
await Promise.all([call('Page.enable'), call('Runtime.enable'), call('Network.enable')]);

const cases = [
  ['nexa-sandbox', 'dark', 1440, 1000, 'nexa-desktop-dark'],
  ['nexa-sandbox', 'dark', 390, 844, 'nexa-mobile-dark'],
  ['nexa-sandbox', 'light', 1440, 1000, 'nexa-light'],
  ['aster-sandbox', 'light', 1440, 1000, 'aster-desktop'],
  ['aster-sandbox', 'light', 390, 844, 'aster-mobile'],
];
const results = [];
for (const [slug, theme, width, height, name] of cases) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 640 });
  await call('Page.navigate', { url: `https://${process.env.REPLIT_DEV_DOMAIN}/private-label-website/${slug}` });
  await waitFor(`!!document.querySelector('[data-testid="site-root"]') && document.title.includes(${JSON.stringify(slug === 'nexa-sandbox' ? 'Nexa' : 'Aster')})`);
  const dark = await evaluate(`document.querySelector('[data-testid="button-theme"]').getAttribute('aria-pressed') === 'true'`);
  if (dark !== (theme === 'dark')) {
    await evaluate(`document.querySelector('[data-testid="button-theme"]').click()`);
    await waitFor(`document.querySelector('[data-testid="button-theme"]').getAttribute('aria-pressed') === '${theme === 'dark'}'`);
  }
  await evaluate('document.fonts.ready.then(() => true)');
  await sleep(1250);
  // Dismiss the hosting preview's notice through its own UI, not app CSS.
  await evaluate(`document.querySelector('#replit-dev-banner .banner-close')?.click()`);
  await sleep(350);
  const measurements = await evaluate(`({
    width:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth,
    payments:!!document.getElementById('payments'),developers:!!document.getElementById('developers'),
    headerMenu:getComputedStyle(document.querySelector('[data-testid="button-menu"]')).display,
    headerCta:getComputedStyle(document.querySelector('[data-testid="link-header-cta"]')).display,
    widgetTop:document.getElementById('exchange').getBoundingClientRect().top,
    widgetWidth:document.querySelector('[data-testid="widget-exchange"]').getBoundingClientRect().width,
    previewBottom:document.querySelector('[data-testid="button-exchange-cta"]').getBoundingClientRect().bottom
  })`);
  assert.ok(measurements.scrollWidth <= measurements.width, `${name} horizontal overflow`);
  assert.equal(measurements.payments, slug === 'nexa-sandbox');
  assert.equal(measurements.developers, slug === 'nexa-sandbox');
  if (width < 640) assert.equal(measurements.headerCta, 'none');
  else assert.equal(measurements.headerMenu, 'none');
  if (width < 640) {
    assert.ok(measurements.widgetTop < 250, `${name} widget is too far below the first viewport`);
    assert.ok(measurements.widgetWidth >= width - 30, `${name} widget is not dominant enough`);
    if (slug === 'nexa-sandbox') assert.ok(measurements.previewBottom <= height, 'Nexa preview action falls below the first viewport');
  }
  const screenshot = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false });
  await writeFile(`${directory}/${name}.jpg`, Buffer.from(screenshot.data, 'base64'));
  results.push({ name, theme, ...measurements });
}
// Confirm a narrow selector and preserved non-executing action after captures.
await call('Page.navigate', { url: `https://${process.env.REPLIT_DEV_DOMAIN}/private-label-website/nexa-sandbox` });
await waitFor(`!!document.querySelector('[data-testid="input-amount-top"]')`);
const additionalWidths = [];
for (const width of [320, 768]) {
  await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 });
  await sleep(100);
  const dimensions = await evaluate(`({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth})`);
  assert.ok(dimensions.scrollWidth <= dimensions.width, `Nexa overflow at ${width}px`);
  additionalWidths.push(dimensions);
}
await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await click('[data-testid="button-asset-top"]');
await waitFor(`!!document.querySelector('[data-testid="dialog-asset-picker"]')`);
const dialog = await evaluate(`(()=>{const r=document.querySelector('[role="dialog"]').getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth}})()`);
assert.ok(dialog.left >= 0 && dialog.right <= dialog.width, 'Selector exceeds mobile viewport');
await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await waitFor(`!document.querySelector('[data-testid="dialog-asset-picker"]')`);
await click('[data-testid="input-amount-top"]');
await call('Input.insertText', { text: '1.25' });
await sleep(100);
await click('[data-testid="button-exchange-cta"]');
await waitFor(`!!document.querySelector('[data-testid="status-sandbox"]')`);
assert.match(await evaluate(`document.querySelector('[data-testid="status-sandbox"]').textContent`), /no order was created/i);

await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await call('Page.reload');
await waitFor(`!!document.querySelector('[data-testid="site-root"]')`);
await sleep(300);
const reduced = await evaluate(`({active:document.getAnimations().filter(a=>a.playState==='running').length,scroll:getComputedStyle(document.documentElement).scrollBehavior})`);
assert.equal(reduced.active, 0);
assert.equal(reduced.scroll, 'auto');
assert.deepEqual(posts, []);
assert.deepEqual(errors, []);
await evaluate(`localStorage.removeItem('plw:theme:nexa-sandbox');localStorage.removeItem('plw:theme:aster-sandbox')`);
await writeFile(`${directory}/verification.json`, JSON.stringify({ viewports: results, additionalWidths, mobileSelector: dialog, reducedMotion: reduced, financialPosts: posts, browserErrors: errors }, null, 2));
console.log(JSON.stringify({ viewports: results, additionalWidths, mobileSelector: dialog, reducedMotion: reduced, posts: posts.length, errors: errors.length }, null, 2));
await fetch(`${debug}/json/close/${target.id}`);
ws.close();