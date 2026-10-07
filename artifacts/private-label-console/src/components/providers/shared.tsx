import { useState, type ReactNode } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/super-admin/kit';
import type { ProviderAssignment, ProviderDefinition } from '@workspace/api-client-react';
import { errMsg } from './use-providers';

export const ENVS = ['sandbox', 'test', 'live'] as const;
export const STATUS_LABEL: Record<string, string> = { coming_soon: 'Coming soon', configuration_only: 'Config only', available: 'Available', disabled: 'Disabled' };
export const STATUS_OPTIONS: [string, string][] = Object.entries(STATUS_LABEL);
export const ACCESS_LABEL: Record<string, string> = { platform_wide: 'Platform wide', entitlement: 'Plan entitlement', assigned: 'Assigned only' };
export const selectCls = 'h-9 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-50';

export function StatusPill({ p }: { p: Pick<ProviderDefinition, 'status'> }) {
  return <Pill tone={p.status === 'available' ? 'ok' : p.status === 'disabled' ? 'bad' : 'warn'}>{STATUS_LABEL[p.status] ?? p.status}</Pill>;
}
export function ConnPill({ a }: { a?: ProviderAssignment }) {
  return <Pill>{a?.connectionStatus === 'configured' ? 'Config saved, not connected' : 'Not connected'}</Pill>;
}
export function Err({ e }: { e: unknown }) {
  return e ? <p role="alert" className="text-sm text-destructive" data-testid="text-provider-error">{errMsg(e)}</p> : null;
}
export function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{children}</p>;
}
export function Lbl({ t, children }: { t: string; children: ReactNode }) {
  return <label className="block space-y-1 text-xs"><span className="font-mono uppercase tracking-wider text-muted-foreground">{t}</span>{children}</label>;
}

export function Confirm({ open, title, body, label, pending, error, onClose, onGo }: { open: boolean; title: string; body: ReactNode; label: string; pending: boolean; error?: unknown; onClose: () => void; onGo: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v && !pending) onClose(); }}>
      <AlertDialogContent data-testid="dialog-provider-confirm">
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription asChild><div className="space-y-2 text-sm">{body}</div></AlertDialogDescription></AlertDialogHeader>
        <Err e={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} data-testid="button-provider-confirm-cancel">Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={onGo} data-testid="button-provider-confirm-ok">{pending ? 'Working' : label}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useConfirmState<T>() { return useState<T | null>(null); }
