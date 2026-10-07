import { PageHeader } from '@/components/app/bits';
import { AuditList } from '@/components/super-admin/audit-list';

export default function Activity() {
  return (<><PageHeader eyebrow="System" title="Activity" /><AuditList id="platform" /></>);
}
