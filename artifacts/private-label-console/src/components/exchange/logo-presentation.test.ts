import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLogoPixels, logoGeometry } from './logo-presentation';

function bitmap(color: [number, number, number], background?: [number, number, number]) {
  const data = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
    const inside = x >= 30 && x < 70 && y >= 40 && y < 60;
    const c = inside ? color : background;
    if (c) data.set([...c, 255], (y * 100 + x) * 4);
  }
  return data;
}
test('transparent margins are excluded without source edits', () => {
  const p = analyzeLogoPixels(100, 100, bitmap([0, 0, 0]));
  assert.deepEqual(p.bounds, [.3, .4, .4, .2]);
  assert.equal(p.paddingFraction, .92);
  const g = logoGeometry(p, 28);
  const occupiedWidth = g.width * p.bounds[2], occupiedHeight = g.height * p.bounds[3];
  assert.ok(occupiedWidth > 23);
  assert.ok(Math.hypot(occupiedWidth, occupiedHeight) < 28);
});
test('dark artwork gets a light surface in either page theme', () => {
  const p = analyzeLogoPixels(100, 100, bitmap([0, 0, 0]));
  assert.equal(p.surface, 'light'); assert.equal(p.lowContrastDark, 1); assert.equal(p.lowContrastPresented, 0);
});
test('white artwork gets a dark surface without recoloring', () => {
  const p = analyzeLogoPixels(100, 100, bitmap([255, 255, 255]));
  assert.equal(p.surface, 'dark'); assert.equal(p.lowContrastLight, 1); assert.equal(p.lowContrastPresented, 0);
});
test('opaque uniform source matte is preserved and padded ink is fitted', () => {
  const p = analyzeLogoPixels(100, 100, bitmap([0, 90, 30], [255, 255, 255]));
  assert.deepEqual(p.bounds, [.3, .4, .4, .2]);
  assert.equal(p.originalBackground, 'rgb(255 255 255)');
});
test('empty artwork is explicitly unusable', () => {
  assert.equal(analyzeLogoPixels(10, 10, new Uint8ClampedArray(400)).usable, false);
});
test('round artwork can fill the circle instead of an inscribed square', () => {
  const d = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
    if ((x - 49.5) ** 2 + (y - 49.5) ** 2 <= 45 ** 2) d.set([255, 150, 10, 255], (y * 100 + x) * 4);
  }
  const p = analyzeLogoPixels(100, 100, d);
  assert.equal(p.circular, true);
  assert.ok(logoGeometry(p, 28).width * p.bounds[2] > 26);
});
