export const isDec = (v: string) => /^\d{1,18}(\.\d{1,18})?$/.test(v);
export const isPos = (v: string) => isDec(v) && /[1-9]/.test(v);
export const isInt = (v: number, max: number) => Number.isInteger(v) && v >= 0 && v <= max;
export const gtDec = (a: string, b: string) => {
  const fixed = (v: string) => { const [whole, fraction = ''] = v.split('.'); return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0')); };
  return fixed(a) > fixed(b);
};
