export interface LogoProfile {
  width: number; height: number; bounds: [number, number, number, number];
  paddingFraction: number; inkFraction: number; circular: boolean; usable: boolean;
  surface: 'light' | 'dark'; originalBackground: string | null;
  lowContrastDark: number; lowContrastLight: number; lowContrastPresented: number;
  edgeMaskUrl?: string; edgeContrast?: number;
}
const luminance = (r: number, g: number, b: number) => {
  const s = [r, g, b].map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return s[0] * .2126 + s[1] * .7152 + s[2] * .0722;
};
const contrast = (a: number, b: number) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);

/** Raster inspection only: source URLs and file bytes are never modified. */
export function analyzeLogoPixels(width: number, height: number, pixels: Uint8ClampedArray): LogoProfile {
  const n = width * height;
  const corners = [0, width - 1, (height - 1) * width, n - 1].map(p => Array.from(pixels.slice(p * 4, p * 4 + 4)));
  const bg = corners[0];
  const uniformBackground = corners.every(c => c[3] > 245 && c.slice(0, 3).every((v, i) => Math.abs(v - bg[i]) < 12));
  const isInk = (i: number) => pixels[i + 3] > 24 && (!uniformBackground ||
    Math.max(...[0, 1, 2].map(c => Math.abs(pixels[i + c] - bg[c]))) > 24);
  let minX = width, minY = height, maxX = -1, maxY = -1, count = 0;
  let darkFail = 0, lightFail = 0;
  const dark = luminance(23, 27, 46), light = luminance(244, 245, 248);
  const samples: number[] = [];
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (!isInk(i)) continue;
    const x = p % width, y = Math.floor(p / width);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); count++;
    const l = luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
    samples.push(l);
    if (contrast(l, dark) < 3) darkFail++;
    if (contrast(l, light) < 3) lightFail++;
  }
  if (!count) return { width, height, bounds: [0, 0, 1, 1], paddingFraction: 0, inkFraction: 0,
    circular: false, usable: false, surface: 'light', originalBackground: null,
    lowContrastDark: 1, lowContrastLight: 1, lowContrastPresented: 1 };
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  let outside = 0;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (isInk((y * width + x) * 4) && ((x - (minX + maxX) / 2) / (bw / 2)) ** 2 +
      ((y - (minY + maxY) / 2) / (bh / 2)) ** 2 > 1.04) outside++;
  }
  const chosen = lightFail <= darkFail ? 'light' : 'dark';
  const presented = uniformBackground ? luminance(bg[0], bg[1], bg[2]) : chosen === 'light' ? light : dark;
  return { width, height, bounds: [minX / width, minY / height, bw / width, bh / height],
    paddingFraction: 1 - bw * bh / n, inkFraction: count / n,
    circular: bw / bh > .9 && bw / bh < 1.1 && outside / count < .015,
    usable: true, surface: chosen, originalBackground: uniformBackground ? `rgb(${bg[0]} ${bg[1]} ${bg[2]})` : null,
    lowContrastDark: darkFail / count, lowContrastLight: lightFail / count,
    lowContrastPresented: samples.filter(l => contrast(l, presented) < 3).length / count };
}

const cache = new Map<string, LogoProfile>();
export function inspectLogo(image: HTMLImageElement, url: string) {
  const cached = cache.get(url);
  if (cached) return cached;
  const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Image inspection unavailable');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const profile = analyzeLogoPixels(canvas.width, canvas.height, ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  if (profile.usable && profile.originalBackground && profile.lowContrastPresented > .2) {
    // A baked-in matte cannot adapt to page theme. Outline only its foreground's OUTSIDE edges.
    // Keep the actual SVG/PNG image untouched underneath: no brand-colored pixel is recolored.
    const source = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const [w, h] = [canvas.width, canvas.height];
    const bg = Array.from(source.slice(0, 3));
    const ink = (p: number) => source[p * 4 + 3] > 24 &&
      Math.max(...[0, 1, 2].map(c => Math.abs(source[p * 4 + c] - bg[c]))) > 24;
    const base = luminance(bg[0], bg[1], bg[2]);
    const dark = [23, 27, 46], light = [244, 245, 248];
    const color = contrast(luminance(...dark as [number, number, number]), base) >=
      contrast(luminance(...light as [number, number, number]), base) ? dark : light;
    const radius = Math.max(1, Math.round(Math.max(profile.bounds[2] * w, profile.bounds[3] * h) / 96));
    const overlay = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!ink(p)) continue;
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || dx * dx + dy * dy > radius * radius) continue;
        const np = ny * w + nx;
        if (!ink(np)) overlay.data.set([...color, 235], np * 4);
      }
    }
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(overlay, 0, 0);
    profile.edgeMaskUrl = canvas.toDataURL('image/png');
    const blended = color.map((c, i) => c * 235 / 255 + bg[i] * 20 / 255);
    profile.edgeContrast = contrast(luminance(...blended as [number, number, number]), base);
  }
  cache.set(url, profile);
  return profile;
}

/** Fit the actual artwork, not transparent margins. Inscribe non-circular marks without clipping their corners. */
export function logoGeometry(profile: LogoProfile, diameter: number) {
  const [x, y, w, h] = profile.bounds;
  const bw = w * profile.width, bh = h * profile.height;
  const scale = profile.circular ? diameter * .96 / Math.max(bw, bh) : diameter * .94 / Math.hypot(bw, bh);
  return { width: profile.width * scale, height: profile.height * scale,
    left: diameter / 2 - (x + w / 2) * profile.width * scale,
    top: diameter / 2 - (y + h / 2) * profile.height * scale };
}
