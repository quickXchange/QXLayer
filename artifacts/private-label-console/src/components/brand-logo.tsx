import type { CSSProperties } from 'react';
import { VYNOX_LOGO_URL, VYNOX_LOGO_ASPECT } from '@/lib/brand';

/** Supplied transparent PNG, unchanged. `size` is the height; never force a square wordmark. */
export function BrandLogo({ size = 32, className, style }: {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Retained for compatibility; one transparent asset serves every theme. */
  theme?: 'auto' | 'dark' | 'light';
}) {
  return <img src={VYNOX_LOGO_URL} alt="VYNOX LAYER" width={2172} height={724} className={className}
    style={{ height: size, width: typeof size === 'number' ? Math.round(size * VYNOX_LOGO_ASPECT) : 'auto',
      maxWidth: '100%', objectFit: 'contain', flexShrink: 0, ...style }} />;
}
