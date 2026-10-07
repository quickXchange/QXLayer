import type { WlOrder } from '@/lib/wl';

/** Mirrors the server transition table (order-model.ts). Read-only copy used to hide invalid actions. */
export const NEXT: Record<string, string[]> = {
  new: ['reviewing', 'waiting_for_client', 'quote_ready', 'approved', 'rejected', 'cancelled'],
  reviewing: ['waiting_for_client', 'quote_ready', 'approved', 'rejected', 'cancelled'],
  waiting_for_client: ['reviewing', 'quote_ready', 'approved', 'in_setup', 'customization', 'ready', 'rejected', 'cancelled'],
  quote_ready: ['reviewing', 'waiting_for_client', 'approved', 'rejected', 'cancelled'],
  approved: ['reviewing', 'waiting_for_client', 'quote_ready', 'in_setup', 'customization', 'ready', 'rejected', 'cancelled'],
  in_setup: ['waiting_for_client', 'customization', 'ready', 'rejected', 'cancelled'],
  customization: ['waiting_for_client', 'in_setup', 'ready', 'rejected', 'cancelled'],
  ready: ['in_setup', 'customization', 'waiting_for_client', 'rejected', 'cancelled'],
};
export const ALL_STATUSES = ['new', 'reviewing', 'waiting_for_client', 'quote_ready', 'approved', 'in_setup', 'customization', 'ready', 'delivered', 'rejected', 'cancelled'];
export const validTargets = (s: string) => NEXT[s] ?? [];
const price = /^\d{1,12}(\.\d{1,2})?$/;
/** Same readiness rule the review form uses before approval. */
export function savedPricingReady(o: WlOrder) {
  const pid = o.approvedPlan?.id ?? o.requestedPlan?.id;
  const custom = o.design?.type === 'custom';
  return !!pid && !!o.monthlyPrice && price.test(o.monthlyPrice) && !!o.setupPrice && price.test(o.setupPrice) && !!o.currency
    && (!custom || (!!o.customizationPrice && price.test(o.customizationPrice) && o.customDesignDecision === 'approved'));
}
