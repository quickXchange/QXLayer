import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { VYNOX_DARK_LOGO_URL, VYNOX_LIGHT_LOGO_URL, VYNOX_LOGO_ASPECT, VYNOX_LOGO_WIDTH, VYNOX_LOGO_HEIGHT } from '@/lib/brand';

/** Original artwork derivatives, cropped only to nonempty alpha bounds. */
export function BrandLogo({ size = 32, className, style, theme = 'auto' }: {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Explicit themes are for fixed illustrated surfaces inside another theme. */
  theme?: 'auto' | 'dark' | 'light';
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [resolved, setResolved] = useState<'dark' | 'light'>('dark');
  useLayoutEffect(() => {
    if (theme !== 'auto') { setResolved(theme); return; }
    const root = document.documentElement;
    const surface = ref.current?.closest<HTMLElement>('[data-qx-theme]') ?? root;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      const declared = surface.dataset.qxTheme ?? root.dataset.qxTheme;
      setResolved(declared === 'light' || declared === 'dark' ? declared : root.classList.contains('dark') || media.matches ? 'dark' : 'light');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(surface, { attributes: true, attributeFilter: ['data-qx-theme', 'class'] });
    if (surface !== root) observer.observe(root, { attributes: true, attributeFilter: ['data-qx-theme', 'class'] });
    media.addEventListener('change', update);
    return () => { observer.disconnect(); media.removeEventListener('change', update); };
  }, [theme]);
  const active = theme === 'auto' ? resolved : theme;
  return <img ref={ref} src={active === 'dark' ? VYNOX_DARK_LOGO_URL : VYNOX_LIGHT_LOGO_URL}
    alt="VYNOX LAYER" width={VYNOX_LOGO_WIDTH} height={VYNOX_LOGO_HEIGHT} className={className} data-brand-theme={active}
    style={{ height: size, width: typeof size === 'number' ? Math.round(size * VYNOX_LOGO_ASPECT) : 'auto',
      maxWidth: '100%', objectFit: 'contain', flexShrink: 0, ...style }} />;
}
