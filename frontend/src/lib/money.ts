const whole = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Paise to "₹1,234.56" (or "₹1,200" when whole); negative gets a leading minus. */
export function inr(paise: number): string {
  const abs = Math.abs(paise);
  const s = abs % 100 === 0 ? whole.format(abs / 100) : cents.format(abs / 100);
  return `${paise < 0 ? "-" : ""}₹${s}`;
}

/** Rupees typed by the user to integer paise; null when invalid. Allows a leading minus (overdraft). */
export function rupeesToPaise(input: string): number | null {
  const v = input.trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
}
