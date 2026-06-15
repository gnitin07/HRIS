/* ─────────────────────────────────────────────
   Date Utilities — IST-safe date helpers
   
   IMPORTANT: Never use new Date().toISOString().split('T')[0]
   to get "today" — that returns UTC date, which is WRONG
   between 00:00 and 05:30 IST (still previous day in UTC).
   ───────────────────────────────────────────── */

/**
 * Get today's date as YYYY-MM-DD in the user's local timezone.
 * Safe to use at any time — no UTC date shift issues.
 */
export function getLocalToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Get the start of the current week (Monday) as YYYY-MM-DD in local timezone.
 */
export function getLocalStartOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

/**
 * Get the first day of the current month as YYYY-MM-DD in local timezone.
 */
export function getLocalStartOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
