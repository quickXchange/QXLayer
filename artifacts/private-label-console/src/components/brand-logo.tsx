import type { CSSProperties } from 'react';
import { QXLAYER_LOGO_URL } from '@/lib/brand';

/** Preserve the master's full canvas, proportions, colours and background. */
export function BrandLogo({ size = 32, className, style }: {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return <img src={QXLAYER_LOGO_URL} alt="QXLayer" width={1024} height={1024}
    className={className} style={{ ...style, width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
}