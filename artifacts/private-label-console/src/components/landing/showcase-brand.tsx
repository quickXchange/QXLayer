import type { CSSProperties } from 'react';
import { BrandLogo } from '@/components/brand-logo';

type Theme = 'auto' | 'dark' | 'light';
/** Illustrations share the same contrast variants as the platform header. */
export const QXMark = ({ s = 1.6, theme = 'auto' }: { s?: number; theme?: Theme }) => (
  <span className="qx-preview-mark" style={{ width: `${s}em`, height: `${s}em` }}>
    <BrandLogo theme={theme} style={{ width: '100%', height: '100%' }} />
  </span>
);

/** Fixed dark device screens opt into dark; other surfaces follow the page. */
export const Logo = ({ s = 1.6, sub, theme = 'auto' }: { s?: number; sub?: string; theme?: Theme }) => (
  <span className="qx-logo" style={{ '--qx-logo-width': `${s * 3.5}em` } as CSSProperties}>
    <span className="qx-preview-wordmark">
      <BrandLogo theme={theme} style={{ width: '100%', height: '100%' }} />
    </span>
    {sub && <small>{sub}</small>}
  </span>
);
