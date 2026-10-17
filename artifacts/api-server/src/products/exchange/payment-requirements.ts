import type {ExchangePaymentMethod} from "@workspace/api-zod";
/** Publish only the field requirement, never the operator's bank-field values. */
export const receivingIbanRequired=(method?:ExchangePaymentMethod)=>
  /sepa/i.test(method?.label??"")||Object.keys(method?.accountFields??{}).some(k=>/iban/i.test(k));
