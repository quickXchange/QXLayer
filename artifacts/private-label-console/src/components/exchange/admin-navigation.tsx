import { useEffect, useState, type ElementType } from 'react';
import { Link } from 'wouter';
import { ArrowLeftRight, Boxes, ChevronDown, Globe, LayoutGrid, Plug, Settings, Users } from 'lucide-react';

type SectionLink = [string, string];
type Group = { label: string; icon: ElementType; sections: SectionLink[] };
const groups: Group[] = [
  { label: 'Orders', icon: ArrowLeftRight, sections: [['orders', 'All Orders'], ['swap', 'Swap'], ['convert', 'Convert'], ['buy', 'Buy'], ['sell', 'Sell']] },
  { label: 'Exchange', icon: Boxes, sections: [['assets', 'Crypto Assets'], ['networks', 'Crypto Networks'], ['routes', 'Routes'], ['payment-methods', 'Payment Methods'], ['pricing', 'Pricing & Fees'], ['fees', 'Fees / Spread']] },
  { label: 'Integrations', icon: Plug, sections: [['providers', 'Providers / Integrations'], ['api-keys', 'API Keys']] },
  { label: 'Website', icon: Globe, sections: [['branding', 'Branding'], ['website', 'Website'], ['domain', 'Domain']] },
  { label: 'Management', icon: Settings, sections: [['staff', 'Staff & Permissions'], ['audit', 'Activity / Audit'], ['settings', 'Settings']] },
];

function NavigationGroup({ group, root, section, showWebsite }: { group: Group; root: string; section: string; showWebsite: boolean }) {
  const active = group.sections.some(([key]) => key === section);
  const [open, setOpen] = useState(active || group.label === 'Orders' || group.label === 'Exchange');
  useEffect(() => { if (active) setOpen(true); }, [active, section]);
  const groupId = `exchange-nav-${group.label.toLowerCase()}`;
  return (
    <div>
      <button type="button" className="qx-navlink w-full text-left" aria-expanded={open} aria-controls={groupId}
        data-testid={`button-${groupId}`} onClick={() => setOpen(value => !value)}>
        <group.icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{group.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      <div id={groupId} hidden={!open} className="ml-4">
        {group.sections.filter(([key]) => key !== 'website' || showWebsite).map(([key, label]) => (
          <Link key={key} href={`${root}/${key}`} className="qx-navlink" aria-current={section === key ? 'page' : undefined}
            data-testid={`link-exchange-${key}`}>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ExchangeAdminNavigation({ root, section, showWebsite }: { root: string; section: string; showWebsite: boolean }) {
  return (
    <div className="flex flex-col gap-1" data-testid="nav-exchange-sidebar">
      <Link href={root} className="qx-navlink" aria-current={section === '' ? 'page' : undefined} data-testid="link-exchange-overview">
        <LayoutGrid className="h-4 w-4 shrink-0" /><span>Overview</span>
      </Link>
      {groups.slice(0, 2).map(group => <NavigationGroup key={group.label} {...{ group, root, section, showWebsite }} />)}
      <Link href={`${root}/customers`} className="qx-navlink" aria-current={section === 'customers' ? 'page' : undefined} data-testid="link-exchange-customers">
        <Users className="h-4 w-4 shrink-0" /><span>Customers</span>
      </Link>
      {groups.slice(2).map(group => <NavigationGroup key={group.label} {...{ group, root, section, showWebsite }} />)}
    </div>
  );
}
