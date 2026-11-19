import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ServiceError } from './errors';

export const MICROS_PER_USD = 1_000_000;
export type RequestKind = 'followups' | 'plan';
type Limits = { dailyMicros: number; monthlyMicros: number };
type Principal = { browser: string; ip: string };
const secondsToTomorrow = (now: Date) => Math.max(1, Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.valueOf()) / 1000));
const secondsToNextMonth = (now: Date) => Math.max(1, Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - now.valueOf()) / 1000));

/** Durable metadata only: never pass prompts, answers, plans, IP addresses, or cookies here. */
export class QuotaStore {
  readonly db: DatabaseSync;
  constructor(filename: string, private limits: Limits) {
    this.db = new DatabaseSync(filename);
    if (filename !== ':memory:') chmodSync(filename, 0o600);
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY, day TEXT NOT NULL, kind TEXT NOT NULL,
        amount_micros INTEGER NOT NULL CHECK(amount_micros >= 0),
        reconciled INTEGER NOT NULL DEFAULT 0,
        input_tokens INTEGER, output_tokens INTEGER
      ) STRICT;
      CREATE INDEX IF NOT EXISTS reservations_day ON reservations(day);
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY, day TEXT NOT NULL, kind TEXT NOT NULL, state TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS rate_limits (
        day TEXT NOT NULL, scope TEXT NOT NULL, principal TEXT NOT NULL, count INTEGER NOT NULL,
        PRIMARY KEY(day, scope, principal)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS events (
        day TEXT NOT NULL, event TEXT NOT NULL, campaign TEXT NOT NULL, count INTEGER NOT NULL,
        PRIMARY KEY(day, event, campaign)
      ) STRICT;
    `);
  }

  private transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  private rate(day: string, scope: string, principal: string, max: number, now: Date) {
    const row = this.db.prepare('SELECT count FROM rate_limits WHERE day=? AND scope=? AND principal=?').get(day, scope, principal) as { count: number } | undefined;
    if ((row?.count ?? 0) >= max) throw new ServiceError('RATE_LIMITED', 'You have reached today’s limit. Your answers are saved in this browser. Please try again tomorrow.', 429, secondsToTomorrow(now));
    this.db.prepare('INSERT INTO rate_limits(day,scope,principal,count) VALUES(?,?,?,1) ON CONFLICT(day,scope,principal) DO UPDATE SET count=count+1').run(day, scope, principal);
  }

  private pruneIdentifiers(now: Date) {
    const cutoff = new Date(now.valueOf() - 7 * 86400_000).toISOString().slice(0, 10);
    this.db.prepare('DELETE FROM rate_limits WHERE day<?').run(cutoff);
    this.db.prepare('DELETE FROM requests WHERE day<?').run(cutoff);
  }

  beginRequest(id: string, kind: RequestKind, principal: Principal, now = new Date()) {
    const day = now.toISOString().slice(0, 10);
    this.transaction(() => {
      if (this.db.prepare('SELECT id FROM requests WHERE id=?').get(id)) throw new ServiceError('DUPLICATE_REQUEST', 'This request was already submitted. Wait for it to finish, or retry to make a new request.', 409);
      this.rate(day, `${kind}:browser`, principal.browser, kind === 'plan' ? 5 : 15, now);
      this.rate(day, `${kind}:ip`, principal.ip, kind === 'plan' ? 100 : 200, now);
      this.db.prepare('INSERT INTO requests(id,day,kind,state) VALUES(?,?,?,?)').run(id, day, kind, 'started');
      // Keep seven days of pseudonymous abuse metadata; aggregate metrics and costs have no identifiers.
      this.pruneIdentifiers(now);
    });
  }

  finishRequest(id: string, state: 'completed' | 'failed') {
    this.db.prepare('UPDATE requests SET state=? WHERE id=?').run(state, id);
  }

  reserve(kind: RequestKind, amountMicros: number, now = new Date()): string {
    if (!Number.isSafeInteger(amountMicros) || amountMicros < 0) throw new Error('Invalid reservation');
    const day = now.toISOString().slice(0, 10);
    return this.transaction(() => {
      const monthly = this.db.prepare('SELECT COALESCE(SUM(amount_micros),0) AS total FROM reservations WHERE day>=? AND day<?').get(`${day.slice(0, 7)}-01`, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)) as { total: number };
      const daily = this.db.prepare('SELECT COALESCE(SUM(amount_micros),0) AS total FROM reservations WHERE day=?').get(day) as { total: number };
      if (monthly.total + amountMicros > this.limits.monthlyMicros) throw new ServiceError('AI_BUDGET_EXHAUSTED', 'Resolution Pal has reached its monthly AI allowance. Your answers are saved in this browser. Please come back next month.', 503, secondsToNextMonth(now));
      if (daily.total + amountMicros > this.limits.dailyMicros) throw new ServiceError('AI_BUDGET_EXHAUSTED', 'Resolution Pal has reached today’s AI allowance. Your answers are saved in this browser. Please try again tomorrow.', 503, secondsToTomorrow(now));
      const id = randomUUID();
      this.db.prepare('INSERT INTO reservations(id,day,kind,amount_micros) VALUES(?,?,?,?)').run(id, day, kind, amountMicros);
      return id;
    });
  }

  reconcile(id: string, amountMicros: number, inputTokens: number, outputTokens: number) {
    if (![amountMicros, inputTokens, outputTokens].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid usage');
    this.transaction(() => {
      const row = this.db.prepare('SELECT reconciled FROM reservations WHERE id=?').get(id) as { reconciled: number } | undefined;
      if (!row || row.reconciled) throw new Error('Reservation already reconciled or missing');
      this.db.prepare('UPDATE reservations SET amount_micros=?,reconciled=1,input_tokens=?,output_tokens=? WHERE id=?').run(amountMicros, inputTokens, outputTokens, id);
    });
  }

  event(event: string, campaign = 'direct', amount = 1, now = new Date()) {
    this.db.prepare('INSERT INTO events(day,event,campaign,count) VALUES(?,?,?,?) ON CONFLICT(day,event,campaign) DO UPDATE SET count=count+excluded.count').run(now.toISOString().slice(0, 10), event, campaign, amount);
  }

  publicEvent(event: string, campaign: string, principal: Principal, now = new Date()) {
    this.transaction(() => {
      const day = now.toISOString().slice(0, 10);
      this.rate(day, 'events:browser', principal.browser, 200, now);
      this.rate(day, 'events:ip', principal.ip, 2000, now);
      this.event(event, campaign, 1, now);
      this.pruneIdentifiers(now);
    });
  }

  ping() { return this.db.prepare('SELECT 1 AS ready').get(); }
  close() { this.db.close(); }
}

function budget(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0 || value > 1000) throw new ServiceError('CONFIGURATION_UNAVAILABLE', 'Plan generation is temporarily unavailable. Please try again later.');
  return Math.floor(value * MICROS_PER_USD);
}

let cached: { key: string; store: QuotaStore } | undefined;
export function getStore() {
  if (process.env.NODE_ENV === 'production' && !process.env.DATA_DIR) {
    throw new ServiceError('STORAGE_UNAVAILABLE', 'Plan generation is temporarily unavailable. Your answers are saved in this browser. Please try again later.');
  }
  const directory = process.env.DATA_DIR ?? join(process.cwd(), 'data');
  const dailyMicros = budget('AI_DAILY_BUDGET_USD', 5);
  const monthlyMicros = budget('AI_MONTHLY_BUDGET_USD', 15);
  const key = `${directory}:${dailyMicros}:${monthlyMicros}`;
  if (cached?.key === key) return cached.store;
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const store = new QuotaStore(join(directory, 'resolutionpal.sqlite3'), { dailyMicros, monthlyMicros });
    cached = { key, store };
    return store;
  } catch {
    throw new ServiceError('STORAGE_UNAVAILABLE', 'Plan generation is temporarily unavailable. Your answers are saved in this browser. Please try again later.');
  }
}
