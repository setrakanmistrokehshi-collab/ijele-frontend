const LOCALES = { USD: 'en-US', NGN: 'en-NG', EUR: 'en-IE', GBP: 'en-GB' };
export const CURRENCIES = Object.keys(LOCALES);

/** Prices are integers in minor units (cents). This is the only place they are divided by 100. */
export const formatMoney = (minorUnits, currency) =>
  new Intl.NumberFormat(LOCALES[currency], { style: 'currency', currency }).format(minorUnits / 100);

/** "12500.50" -> 1250050 using string math (no floats). NaN for anything that is not a plain amount. */
export function parseAmount(text) {
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(text).trim());
  return match ? Number(match[1]) * 100 + Number(`${match[2] ?? ''}00`.slice(0, 2)) : NaN;
}
export const toAmountText = (minorUnits = 0) => `${Math.floor(minorUnits / 100)}.${String(minorUnits % 100).padStart(2, '0')}`;
