import type { ExchangePaymentMethod } from '@workspace/api-client-react';
import type { DetailsForm, PayoutKind } from '../../lib/exchange-details';

export function DetailsStep({ form, errors, kind, method,memoRequired, onChange }: { form: DetailsForm; errors: Record<string, string>; kind: PayoutKind; method?: ExchangePaymentMethod;memoRequired?:boolean; onChange: (patch: Partial<DetailsForm>) => void }) {
  const field = (k: keyof DetailsForm, label: string, opts: { required?: boolean; type?: string; max?: number; auto?: string; area?: boolean; hint?: string } = {}) => {
    const err = errors[k];
    const props = { id: `field-${k}`, className: 'mt-1 w-full rounded-lg border bg-transparent p-2.5 text-sm', value: form[k] as string, maxLength: opts.max, autoComplete: opts.auto, 'aria-invalid': !!err, 'aria-describedby': err ? `err-${k}` : undefined, style: err ? { borderColor: '#d9485f' } : undefined, 'data-testid': `input-${k}` };
    return (
      <div key={k}>
        <label htmlFor={`field-${k}`} className="s-muted block text-xs">{label}{opts.required ? ' *' : ' (optional)'}</label>
        {opts.area ? <textarea rows={2} {...props} onChange={(e) => onChange({ [k]: e.target.value })} /> : <input type={opts.type ?? 'text'} {...props} onChange={(e) => onChange({ [k]: e.target.value })} />}
        {opts.hint && !err && <p className="s-muted mt-1 text-xs">{opts.hint}</p>}
        {err && <p id={`err-${k}`} role="alert" className="mt-1 text-xs font-medium" style={{ color: '#e5556b' }}>{err}</p>}
      </div>
    );
  };
  return (
    <div className="mt-5 space-y-4" data-testid="step-details">
      <div className="grid gap-4 sm:grid-cols-2">{field('name', 'Full name', { required: true, max: 120, auto: 'name' })}{field('email', 'Email', { required: true, type: 'email', max: 254, auto: 'email' })}</div>
      <fieldset className="space-y-4 rounded-[var(--s-r2)] border p-4" style={{ borderColor: 'var(--s-line)' }}>
        <legend className="px-1 text-sm font-semibold">{kind === 'bank' ? `Where should we send your ${method?.label ? method.label + ' ' : ''}payout?` : 'Where should we send your crypto?'}</legend>
        {kind === 'bank' ? <>
          {field('beneficiaryName', 'Account holder name', { required: true, max: 120 })}
          {method?.methodType==="bank"&&field('bankName', 'Bank name', { max: 120 })}
          <div className="grid gap-4 sm:grid-cols-2">{field('iban', 'IBAN', { max: 80,required:method?.receivingIbanRequired, hint: method?.receivingIbanRequired?'Required by this payment method.':'IBAN or recipient account is required.' })}{field('accountNumber', method?.methodType==="bank"?'Account number':'Recipient account / identifier', { max: 120 })}</div>
        </> : <>
          {field('walletAddress', 'Receiving wallet address', { required: true, max: 200, hint: 'Double-check the address and network. Crypto transfers cannot be reversed.' })}
          {field('memo', 'Memo or tag', { max: 120,required:memoRequired })}
        </>}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">{field('telegram', 'Telegram username', { max: 80 })}{field('phone', 'Phone number', { max: 60, type: 'tel', auto: 'tel' })}</div>
      {field('paymentDescription', 'Payment description', { max: 500, area: true })}
      {field('address', 'Address', { max: 500, area: true, auto: 'street-address' })}
      <div>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={form.consent} onChange={(e) => onChange({ consent: e.target.checked })} data-testid="checkbox-contact-consent" /><span className="s-muted">I give permission for this exchange to store my name, email and payout details with this order. This is not marketing consent.</span></label>
        {errors.consent && <p role="alert" className="mt-1 text-xs font-medium" style={{ color: '#e5556b' }}>{errors.consent}</p>}
      </div>
    </div>
  );
}
