/** Logo files live in public/banks. Bank names are free text from SMS, so match on a keyword. */
const LOGOS: [keyword: string, file: string][] = [
  ["hdfc", "hdfc-bank.png"],
  ["kotak", "kotak-bank.png"],
  ["federal", "federal-bank.svg"],
  ["union", "union-bank.png"],
];

/** The bank's name alone. "Federal Bank ••2411" is a label for finding the account; only the name belongs on screen. */
export function bankName(bank?: string): string {
  const b = (bank ?? "").trim();
  return b.replace(/[^\p{L}\p{N}\s]{1,6}\s*\d{2,4}\s*$/u, "").trim() || b;
}

export function bankLogo(bank?: string): string | null {
  const b = (bank ?? "").toLowerCase();
  const hit = LOGOS.find(([k]) => b.includes(k));
  return hit ? `/banks/${hit[1]}` : null;
}
