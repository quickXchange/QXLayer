import { BrandLogo } from '@/components/brand-logo';

/** Every product preview uses the same official master, never a recreated glyph. */
export const QXMark = ({ s = 1.6 }: { s?: number }) => {
  return <BrandLogo size={`${s}em`} />;
};

export const Logo = ({ s = 1.6, sub }: { s?: number; sub?: string }) => (
  <span className="qx-logo">
    <QXMark s={s} />
    <b>QXLayer</b>
    {sub && <small>{sub}</small>}
  </span>
);
