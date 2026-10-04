import type { CSSProperties } from 'react';
import { QXLAYER_LOGO_URL, QXLAYER_LIGHT_LOGO_URL } from '@/lib/brand';

type Theme = 'auto' | 'dark' | 'light';
const iconUrl = (theme: 'dark' | 'light') => `${import.meta.env.BASE_URL}qxlayer-icon-${theme}.png`;

/** Compact spaces use the existing isolated symbol, not a miniature wordmark. */
export const QXMark = ({ s = 1.6, theme = 'auto' }: { s?: number; theme?: Theme }) => (
  <span className="qx-preview-mark" style={{ width: `${s}em`, height: `${s}em` }}>
    {(theme === 'auto' ? ['dark', 'light'] as const : [theme]).map((t) =>
      <img key={t} src={iconUrl(t)} alt="QXLayer" width={590} height={590}
        className={theme === 'auto' ? `qx-brand-${t}` : undefined} />)}
  </span>
);

/** Present the actual bitmap, with only unused transparent canvas excluded.
 * The full symbol, QX-over-Layer lettering, proportions and colours are intact.
 * This treatment is scoped to illustrations; shared platform logos are unchanged.
 */
export const Logo = ({ s = 1.6, sub, theme = 'auto' }: { s?: number; sub?: string; theme?: Theme }) => (
  <span className="qx-logo" style={{ '--qx-logo-width': `${s * 3.5}em` } as CSSProperties}>
    <span className="qx-preview-wordmark">
      {(theme === 'auto' ? ['dark', 'light'] as const : [theme]).map((t) =>
        <svg key={t} viewBox="40 375 1174 510" role="img" aria-label="QXLayer"
          className={theme === 'auto' ? `qx-brand-${t}` : undefined}>
          <image href={t === 'dark' ? QXLAYER_LOGO_URL : QXLAYER_LIGHT_LOGO_URL} width="1254" height="1254" />
        </svg>)}
    </span>
    {sub && <small>{sub}</small>}
  </span>
);
