import type { PublicSite } from '@workspace/api-client-react';
import type { Caps } from '@/lib/capabilities';
import { Assets } from './sections/assets';
import { How } from './sections/how';
import { Payments } from './sections/payments';
import { Telegram } from './sections/telegram';
import { Developers } from './sections/developers';
import { Trust } from './sections/trust';
import { Faq } from './sections/faq';
import { FinalCta } from './sections/cta';

export default function BelowFold({ site, caps }: { site: PublicSite; caps: Caps }) {
  return (
    <>
      <Assets site={site} caps={caps} />
      {caps.services > 0 && <How caps={caps} />}
      {caps.payments && <Payments site={site} />}
      <Trust site={site} />
      {(caps.bot || caps.mini) && <Telegram caps={caps} brand={site.brandName} />}
      {caps.api && <Developers caps={caps} />}
      <Faq caps={caps} />
      <FinalCta site={site} caps={caps} />
    </>
  );
}
