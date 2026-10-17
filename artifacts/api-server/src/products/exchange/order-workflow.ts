import type { ExchangeOrderInput, ExchangeQuoteInput, ExchangeSettings, ExchangeCatalogAsset } from "@workspace/api-zod";
import { HttpError } from "../../lib/errors";
import { isFiat } from "./global-catalog";
import {receivingIbanRequired} from "./payment-requirements";
export function validatedCustomerDetails(input: ExchangeOrderInput, quote: ExchangeQuoteInput, s: ExchangeSettings, catalog: ExchangeCatalogAsset[]) {
  if(!input.customerName?.trim()||!input.customerEmail?.trim()||input.contactConsent!==true)
    throw new HttpError(400,"Full name, email and consent are required for a new Exchange order.");
  const details=Object.fromEntries(Object.entries(input.customerDetails??{}).map(([k,v])=>[k,v?.trim()??""]));
  if(isFiat(quote.destination)){
    if(!details.beneficiaryName || !(details.iban||details.accountNumber))throw new HttpError(400,"Receiving beneficiary name and IBAN/account details are required.");
    const m=s.paymentMethods.find(m=>m.id===quote.paymentMethodId);
    const needsIban=receivingIbanRequired(m);
    if(needsIban&&!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test((details.iban??"").replace(/\s/g,"").toUpperCase()))
      throw new HttpError(400,"This payment method requires a valid-format receiving IBAN.");
  }else {
    if(!details.walletAddress||details.walletAddress.length<12)throw new HttpError(400,"A receiving wallet address is required. Sandbox only; never send funds.");
    if(catalog.find(a=>a.assetNetworkId===quote.destination)?.memoRequired&&!details.memo)
      throw new HttpError(400,"This destination network requires a receiving memo/tag.");
  }
  return details;
}
export function publicHistory(history:{status:string;at:string;note:string}[]){
  return history.map(h=>({...h,note:`${h.status==="pending"?"Order created":h.status==="completed"?"Sandbox payout confirmed":`Order ${h.status}`} — Sandbox only.`}));
}
