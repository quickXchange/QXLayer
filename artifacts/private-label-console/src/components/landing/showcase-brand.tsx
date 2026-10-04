import { useId } from 'react';

/** QXLayer glyph + wordmark, used only inside decorative product visuals. */
export const QXMark = ({ s = 1.6 }: { s?: number }) => {
  const id = `qxm${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" style={{ width: `${s}em`, height: `${s}em`, flex: 'none' }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--s-primary)' }} />
          <stop offset="1" style={{ stopColor: 'var(--s-accent)' }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <circle cx="15.5" cy="15.5" r="7.4" fill="none" stroke="#fff" strokeWidth="2.3" />
      <path d="M12.2 12.2l6.6 6.6M18.8 12.2l-6.6 6.6" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M19.8 19.8L24.5 24.5" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
};

export const Logo = ({ s = 1.6, sub }: { s?: number; sub?: string }) => (
  <span className="qx-logo">
    <QXMark s={s} />
    <b>QX<i>Layer</i></b>
    {sub && <small>{sub}</small>}
  </span>
);
