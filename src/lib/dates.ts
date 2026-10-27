/** "26 Oct, 10:52 am" in IST; the time is left out for date-only values (stored at IST midnight). */
export function shortDateTime(iso: string): string {
  const d = new Date(iso);
  const tz = { timeZone: "Asia/Kolkata" } as const;
  const day = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...tz });
  const midnight = d.toLocaleTimeString("en-GB", { hour12: false, ...tz }) === "00:00:00";
  return midnight ? day : `${day}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, ...tz })}`;
}

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** datetime-local value (local time) to an RFC3339 instant; undefined when empty. */
export const localToIso = (local: string) => (local ? new Date(local).toISOString() : undefined);
