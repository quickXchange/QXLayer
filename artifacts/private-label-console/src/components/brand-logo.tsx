import type { CSSProperties } from 'react';
import { QXLAYER_LOGO_URL, QXLAYER_LIGHT_LOGO_URL } from '@/lib/brand';

/** Full master geometry; only color/alpha differ. Auto follows platform theme. */
export function BrandLogo({ size = 32, className, style, theme = 'auto' }: {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  theme?: 'auto' | 'dark' | 'light';
}) {
  const imageStyle = { ...style, width: size, height: size, objectFit: 'contain' as const, flexShrink: 0 };
  if (theme !== 'auto') return <img src={theme === 'dark' ? QXLAYER_LOGO_URL : QXLAYER_LIGHT_LOGO_URL}
    alt="QXLayer" width={1254} height={1254} className={className} style={imageStyle} />;
  return <span className={`qx-brand-pair ${className ?? ''}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
    <img src={QXLAYER_LOGO_URL} alt="QXLayer" width={1254} height={1254} className="qx-brand-dark" style={imageStyle} />
    <img src={QXLAYER_LIGHT_LOGO_URL} alt="QXLayer" width={1254} height={1254} className="qx-brand-light" style={imageStyle} />
  </span>;
}