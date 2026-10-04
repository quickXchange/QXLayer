import { formatDistanceToNow, format } from 'date-fns';
export const ago = (s: string) => formatDistanceToNow(new Date(s), { addSuffix: true });
export const stamp = (s: string) => format(new Date(s), 'd MMM yyyy, HH:mm');
export const label = (s: string) => s.replace(/_/g, ' ');
export const roleLabel: Record<string, string> = { super_admin: 'Super admin', client_admin: 'Client admin', staff: 'Staff', unassigned: 'Unassigned' };
