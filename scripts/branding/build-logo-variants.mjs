/**
 * Deterministic derivatives of the original VYNOX PNG. No drawing/generation.
 * RGB-only processing is important: FX channel() must not replace source alpha.
 */
import { spawnSync } from 'node:child_process';
import { copyFile } from 'node:fs/promises';

const root = 'artifacts/private-label-console/public';
function image(args) {
  const result = spawnSync('magick', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Logo processing failed');
  return result.stdout.trim();
}
image([`${root}/vynox-logo.png`, '-trim', '+repage', `${root}/vynox-logo-dark.png`]);
const contrast = 'blend=(1-min(1,(max(r,max(g,b))-min(r,min(g,b)))/.42))*max(0,(max(r,max(g,b))-.48)/.52); lumy=(r+g+b)/3; channel(r*.88*(1-blend)+blend*(.16+.10*lumy),g*.88*(1-blend)+blend*(.08+.07*lumy),b*.88*(1-blend)+blend*(.37+.13*lumy))';
image([`${root}/vynox-logo-dark.png`, '-channel', 'RGB', '-fx', contrast, '+channel',
  '-channel', 'A', '-fx', 'a*(.72+.28*a)', '+channel', '-depth', '8', `${root}/vynox-logo-light.png`]);
for (const mode of ['dark', 'light']) {
  const file = `${root}/vynox-logo-${mode}.png`;
  const alpha = image([file, '-alpha', 'extract', '-format', '%[fx:minima] %[fx:maxima]', 'info:']).split(' ').map(Number);
  if (alpha[0] !== 0 || alpha[1] !== 1) throw new Error(`${mode} logo must have both transparent and opaque pixels`);
  await copyFile(file, `${root}/qxlayer-logo-${mode}.png`);
  image([file, '-define', 'webp:lossless=true', `${root}/qxlayer-logo-${mode}.webp`]);
  console.info(`${mode}: ${image(['identify', '-format', '%wx%h %[channels]', file])}; transparency verified`);
}
