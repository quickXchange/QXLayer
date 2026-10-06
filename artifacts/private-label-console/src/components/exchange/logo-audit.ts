import type { ExchangeVisualAsset } from '@workspace/api-client-react';
import { inspectLogo, logoGeometry } from './logo-presentation';

/** Browser-only, read-only inventory audit of every original and variant, including shared flag/currency artwork. */
export async function auditCatalogLogos(assets: ExchangeVisualAsset[]) {
  const urls = new Map<string, string[]>();
  for (const a of assets) for (const url of [a.logoUrl, ...a.alternatives]) {
    urls.set(url, [...(urls.get(url) ?? []), `${a.kind}:${a.code}`]);
  }
  const pending = [...urls.keys()];
  const results: Record<string, unknown>[] = [];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length) {
      const url = pending.pop()!;
      const image = new Image();
      try {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Image load/decode failed'));
          image.src = url;
        });
        const profile = inspectLogo(image, url);
        const { edgeMaskUrl, ...metrics } = profile;
        const flags = urls.get(url)!.some(id => id.startsWith('flag:'));
        results.push({ url, identities: urls.get(url), state: profile.usable ? 'usable' : 'empty',
          naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
          flag: flags, ...metrics, edgeOutline: !flags && !!edgeMaskUrl,
          excessivePadding: profile.paddingFraction > .45,
          wideOrTallAspect: profile.width / profile.height > 5 || profile.width / profile.height < .2,
          correction: flags ? '1:1 fixed circle, centered cover, no stretching' :
            'foreground-bounds fit, no brand cropping, per-image adaptive neutral surface',
          geometryAt28: logoGeometry(profile, 26) });
      } catch (e) {
        results.push({ url, identities: urls.get(url), state: 'broken', error: String(e) });
      }
    }
  }));
  return { identityCount: assets.length, uniqueImages: urls.size, duplicateIdentities:
    assets.map(a => `${a.kind}:${a.code}`).filter((a, i, all) => all.indexOf(a) !== i),
    broken: results.filter(r => r.state === 'broken'), empty: results.filter(r => r.state === 'empty'),
    padded: results.filter(r => !r.flag && r.excessivePadding),
    lowContrastDark: results.filter(r => !r.flag && Number(r.lowContrastDark) > .5),
    lowContrastLight: results.filter(r => !r.flag && Number(r.lowContrastLight) > .5),
    results: results.sort((a, b) => String(a.url).localeCompare(String(b.url))) };
}
