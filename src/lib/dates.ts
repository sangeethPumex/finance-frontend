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

/** An ISO timestamp as the "YYYY-MM-DDTHH:mm" a date-time field holds, in the device's own time zone. The counterpart of localToIso. */
export const isoToLocal = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

// Calendar days as YYYY-MM-DD in the device's time zone, so day maths never drifts with the time of day.
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDay = (s: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
export const addDays = (iso: string, n: number) => { const d = parseDay(iso)!; d.setDate(d.getDate() + n); return isoDay(d); };
export const addMonths = (iso: string, n: number) => { const d = parseDay(iso)!, day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return isoDay(d); };
