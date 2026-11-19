import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';

type Usage = { total: number; settled: number; held: number; holds: number };
type Event = { day: string; event: string; campaign: string; count: number };

function allowance(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0 || value > 1000) {
    throw new Error(`${name} must be a number between 0 and 1000.`);
  }
  return value;
}

function dollars(micros: number) {
  return (micros / 1_000_000).toFixed(6);
}

function main() {
  const filename = join(process.env.DATA_DIR ?? join(process.cwd(), 'data'), 'resolutionpal.sqlite3');
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const month = `${day.slice(0, 7)}-01`;
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString().slice(0, 10);
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)).toISOString().slice(0, 10);
  const dailyAllowance = allowance('AI_DAILY_BUDGET_USD', 5);
  const monthlyAllowance = allowance('AI_MONTHLY_BUDGET_USD', 15);
  const db = new DatabaseSync(filename, { readOnly: true });

  try {
    const usage = db.prepare(`
      SELECT
        COALESCE(SUM(amount_micros), 0) AS total,
        COALESCE(SUM(CASE WHEN reconciled=1 THEN amount_micros ELSE 0 END), 0) AS settled,
        COALESCE(SUM(CASE WHEN reconciled=0 THEN amount_micros ELSE 0 END), 0) AS held,
        COALESCE(SUM(CASE WHEN reconciled=0 THEN 1 ELSE 0 END), 0) AS holds
      FROM reservations WHERE day>=? AND day<?
    `);
    const periods = [
      { period: `Day ${day} UTC`, start: day, end: tomorrow, limit: dailyAllowance },
      { period: `Month ${day.slice(0, 7)} UTC`, start: month, end: nextMonth, limit: monthlyAllowance },
    ];

    console.log(`Resolution Pal aggregate metrics — ${now.toISOString()}`);
    console.table(periods.map(({ period, start, end, limit }) => {
      const row = usage.get(start, end) as Usage;
      return {
        period,
        allowance_usd: limit.toFixed(2),
        accounted_usd: dollars(row.total),
        settled_usd: dollars(row.settled),
        held_usd: dollars(row.held),
        held_calls: row.holds,
        remaining_usd: dollars(Math.max(0, Math.floor(limit * 1_000_000) - row.total)),
      };
    }));
    console.log('Held amounts include pending calls and requests whose outcome is unknown. These are application estimates, not provider invoices.');

    const events = db.prepare('SELECT day,event,campaign,count FROM events WHERE day>=? AND day<? ORDER BY day DESC,event,campaign').all(firstDay, tomorrow) as Event[];
    console.log(`Aggregate events: ${firstDay} through ${day} UTC`);
    if (events.length) console.table(events);
    else console.log('No events recorded in this period.');
    console.log('Latency event counts are total milliseconds; other event counts are occurrences. No visitor identifiers are included.');
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Could not read metrics: ${message}`);
  console.error('Run this command on the service with the mounted DATA_DIR. No database is created or changed by this script.');
  process.exitCode = 1;
}
