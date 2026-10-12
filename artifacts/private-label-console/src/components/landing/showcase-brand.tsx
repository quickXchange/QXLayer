import type { CSSProperties } from 'react';
import { VYNOX_LOGO_URL } from '@/lib/brand';

type Theme = 'auto' | 'dark' | 'light';
const iconUrl = (_theme: 'dark' | 'light') => VYNOX_LOGO_URL;

/** Compact preview placements reuse the new master without distortion or recolouring. */
export const QXMark = ({ s = 1.6, theme = 'auto' }: { s?: number; theme?: Theme }) => (
  <span className="qx-preview-mark" style={{ width: `${s}em`, height: `${s}em` }}>
    {(theme === 'auto' ? ['dark', 'light'] as const : [theme]).map((t) =>
      <img key={t} src={iconUrl(t)} alt="VYNOX LAYER" width={2172} height={724} style={{ objectFit: 'contain' }}
        className={theme === 'auto' ? `qx-brand-${t}` : undefined} />)}
  </span>
);

/** Present the actual bitmap, with only unused transparent canvas excluded.
 * The full symbol, VYNOX LAYER lettering, proportions and colours are intact.
 * This treatment is scoped to illustrations; shared platform logos are unchanged.
 */
export const Logo = ({ s = 1.6, sub, theme = 'auto' }: { s?: number; sub?: string; theme?: Theme }) => (
  <span className="qx-logo" style={{ '--qx-logo-width': `${s * 3.5}em` } as CSSProperties}>
    <span className="qx-preview-wordmark">
      {(theme === 'auto' ? ['dark', 'light'] as const : [theme]).map((t) =>
        <img key={t} src={VYNOX_LOGO_URL} alt="VYNOX LAYER" width={2172} height={724}
          className={theme === 'auto' ? `qx-brand-${t}` : undefined} />)}
    </span>
    {sub && <small>{sub}</small>}
  </span>
);
