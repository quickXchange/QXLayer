import { Coin } from '../asset-picker';
import type { Option } from '../../lib/exchange-model';

export function LogoCircle({ url, label, size = 36 }: { url?: string | null; label: string; size?: number }) {
  if (url) return <img className="s-coin" src={url} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain', background: 'var(--s-panel)' }} />;
  return <span className="s-coin" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.34, background: 'var(--s-secondary)', color: 'var(--s-bg)' }}>{label.slice(0, 3).toUpperCase()}</span>;
}

export function OptionLogo({ option, size = 36 }: { option: Option; size?: number }) {
  if (option.kind === 'crypto' && option.asset) return <Coin asset={option.asset} size={size} />;
  return <LogoCircle url={option.logoUrl} label={option.symbol} size={size} />;
}
