import type { ExchangeCustomerDetails } from '@workspace/api-client-react';
import { EMAIL } from './exchange-model';

export interface DetailsForm {
  name: string; email: string; consent: boolean;
  beneficiaryName: string; bankName: string; iban: string; accountNumber: string;
  walletAddress: string; memo: string;
  paymentDescription: string; telegram: string; address: string; phone: string;
}
export const EMPTY_DETAILS: DetailsForm = { name: '', email: '', consent: false, beneficiaryName: '', bankName: '', iban: '', accountNumber: '', walletAddress: '', memo: '', paymentDescription: '', telegram: '', address: '', phone: '' };
/** bank: crypto to fiat (we pay out to a bank account). wallet: fiat to crypto, or convert (we pay out to a wallet). */
export type PayoutKind = 'bank' | 'wallet';

export function validateDetails(f: DetailsForm, kind: PayoutKind,requirements:{iban?:boolean;memo?:boolean}={}): Record<string, string> {
  const e: Record<string, string> = {};
  const name = f.name.trim(), email = f.email.trim();
  if (!name) e.name = 'Enter your full name.'; else if (name.length > 120) e.name = 'Use 120 characters or fewer.';
  if (!email) e.email = 'Enter your email address.'; else if (!EMAIL.test(email) || email.length > 254) e.email = 'Enter a valid email address.';
  if (!f.consent) e.consent = 'Permission is required to store these details with the order.';
  if (kind === 'bank') {
    if (!f.beneficiaryName.trim()) e.beneficiaryName = 'Enter the account holder name.';
    if (f.iban.trim() && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(f.iban.replace(/\s+/g, '').toUpperCase())) e.iban = 'This IBAN format is not valid.';
    else if (!f.iban.trim() && !f.accountNumber.trim()) { e.iban = 'Enter an IBAN or an account number.'; e.accountNumber = 'Enter an account number or an IBAN.'; }
    if(requirements.iban&&!f.iban.trim())e.iban='This payment method requires a receiving IBAN.';
  } else if (!f.walletAddress.trim()) e.walletAddress = 'Enter the wallet address that will receive the funds.';
  else if (f.walletAddress.trim().length < 12) e.walletAddress = 'This wallet address looks too short.';
  if(kind==="wallet"&&requirements.memo&&!f.memo.trim())e.memo="This receiving network requires a memo/tag.";
  if (f.telegram && f.telegram.length > 80) e.telegram = 'Use 80 characters or fewer.';
  return e;
}

export function toCustomerDetails(f: DetailsForm, kind: PayoutKind): ExchangeCustomerDetails {
  const raw: ExchangeCustomerDetails = kind === 'bank'
    ? { beneficiaryName: f.beneficiaryName, bankName: f.bankName, iban: f.iban.replace(/\s+/g, '').toUpperCase(), accountNumber: f.accountNumber }
    : { walletAddress: f.walletAddress, memo: f.memo };
  Object.assign(raw, { paymentDescription: f.paymentDescription, telegram: f.telegram, address: f.address, phone: f.phone });
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, (v as string).trim()]).filter(([, v]) => v)) as ExchangeCustomerDetails;
}
