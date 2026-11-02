/** Date-only helpers deliberately avoid UTC parsing and daylight-saving arithmetic. */
export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function nextJanuaryFirst(value = new Date()): string {
  return `${value.getFullYear() + 1}-01-01`;
}
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return localDate(new Date(year, month - 1, day + days));
}
export function formatDate(date: string, short = false): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: short ? 'short' : 'long', day: 'numeric', year: short ? undefined : 'numeric' }).format(new Date(year, month - 1, day));
}
