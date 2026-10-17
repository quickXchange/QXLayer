import type { PublicSite } from '@workspace/api-client-react';
import type { Caps, ExchangeTab } from '../lib/capabilities';
import type { RateInfo } from './exchange/types';
import { LiveWidget } from './exchange/live-widget';
import { PresentationWidget } from './exchange/presentation-widget';

export type { RateInfo };

/** The optional props are used only by the Telegram Mini App; master defaults are unchanged. */
export function ExchangeWidget({ site, caps, presentation = false, allowedActions, initialAction, onRateInfo }: { site: PublicSite; caps: Caps; presentation?: boolean; allowedActions?: ExchangeTab[]; initialAction?: ExchangeTab; onRateInfo?: (info: RateInfo) => void }) {
  if (presentation) return <PresentationWidget site={site} caps={caps} allowedActions={allowedActions} />;
  return <LiveWidget site={site} caps={caps} allowedActions={allowedActions} initialAction={initialAction} onRateInfo={onRateInfo} />;
}
