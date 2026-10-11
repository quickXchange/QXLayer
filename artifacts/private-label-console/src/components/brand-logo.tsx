import type { CSSProperties } from 'react';
import { VYNOX_LOGO_URL, VYNOX_ICON_LARGE_URL, VYNOX_LOGO_ASPECT } from '@/lib/brand';

/** Official VYNOX LAYER art (transparent). `size` is the rendered height; small sizes use the isolated V symbol for legibility. */
export function BrandLogo({ size = 32, className, style }: {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Retained for compatibility; one transparent asset serves every theme. */
  theme?: 'auto' | 'dark' | 'light';
}) {
  const px = typeof size === 'number' ? size : parseFloat(size);
  const icon = Number.isFinite(px) && px < 44;
  const common = { ...style, height: size, objectFit: 'contain' as const, flexShrink: 0 };
  return icon
    ? <img src={VYNOX_ICON_LARGE_URL} alt="VYNOX LAYER" width={590} height={590} className={className} style={{ ...common, width: size }} />
    : <img src={VYNOX_LOGO_URL} alt="VYNOX LAYER" width={1604} height={855} className={className} style={{ ...common, width: typeof size === 'number' ? Math.round(size * VYNOX_LOGO_ASPECT) : 'auto' }} />;
}
