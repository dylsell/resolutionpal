import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { QuotaStore } from '../lib/server/store';

const stores: QuotaStore[] = [];
const dirs: string[] = [];
const today = new Date('2026-11-01T12:00:00Z');
function store(dailyMicros = 500, monthlyMicros = 1500, filename = ':memory:') {
  const result = new QuotaStore(filename, { dailyMicros, monthlyMicros }); stores.push(result); return result;
}
const totals = (db: QuotaStore) => db.db.prepare('SELECT SUM(amount_micros) AS total FROM reservations').get() as { total: number };
afterEach(() => { stores.splice(0).forEach((db) => db.close()); dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })); });

describe('durable AI allowance', () => {
  it('reserves before usage, enforces the exact daily boundary, and retains unknown charges', () => {
    const db = store();
    db.reserve('plan', 300, today);
    db.reserve('plan', 200, today);
    expect(() => db.reserve('plan', 1, today)).toThrow('today’s AI allowance');
    expect(totals(db).total).toBe(500);
  });

  it('reconciles known usage once and makes the released allowance available', () => {
    const db = store();
    const reservation = db.reserve('plan', 500, today);
    db.reconcile(reservation, 100, 10, 20);
    db.reserve('plan', 400, today);
    expect(totals(db).total).toBe(500);
    expect(() => db.reconcile(reservation, 0, 0, 0)).toThrow('already reconciled');
  });

  it('enforces the monthly allowance across UTC day boundaries and resets next month', () => {
    const db = store(500, 700);
    db.reserve('plan', 500, today);
    db.reserve('plan', 200, new Date('2026-11-02T00:00:00Z'));
    expect(() => db.reserve('plan', 1, new Date('2026-11-03T00:00:00Z'))).toThrow('monthly AI allowance');
    expect(() => db.reserve('plan', 500, new Date('2026-12-01T00:00:00Z'))).not.toThrow();
  });

  it('shares allowance across independent connections and persists after reopen', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rp-quota-')); dirs.push(dir);
    const filename = join(dir, 'test.sqlite3');
    const first = store(500, 1500, filename);
    const second = store(500, 1500, filename);
    first.reserve('plan', 300, today);
    expect(() => second.reserve('plan', 201, today)).toThrow('today’s AI allowance');
    second.reserve('plan', 200, today);
    const reopened = store(500, 1500, filename);
    expect(totals(reopened).total).toBe(500);
    expect(() => reopened.reserve('plan', 1, today)).toThrow('today’s AI allowance');
  });

  it('rejects invalid reservations and disables generation at zero allowance', () => {
    const db = store(0, 0);
    expect(() => db.reserve('plan', -1, today)).toThrow('Invalid reservation');
    expect(() => db.reserve('plan', 0.5, today)).toThrow('Invalid reservation');
    expect(() => db.reserve('plan', 1, today)).toThrow('monthly AI allowance');
  });
});

describe('abuse protection and anonymous counters', () => {
  it('deduplicates a request across endpoints without consuming another rate slot', () => {
    const db = store();
    db.beginRequest('hashed-id', 'plan', { browser: 'hashed-browser', ip: 'hashed-ip' }, today);
    expect(() => db.beginRequest('hashed-id', 'followups', { browser: 'hashed-browser', ip: 'hashed-ip' }, today)).toThrow('already submitted');
    expect(db.db.prepare('SELECT SUM(count) AS total FROM rate_limits').get()).toEqual({ total: 2 });
  });

  it('caps browsers at five plan requests and resets on the next UTC day', () => {
    const db = store();
    for (let index = 0; index < 5; index++) db.beginRequest(`id-${index}`, 'plan', { browser: 'browser', ip: 'ip' }, today);
    expect(() => db.beginRequest('id-6', 'plan', { browser: 'browser', ip: 'ip' }, today)).toThrow('today’s limit');
    expect(() => db.beginRequest('id-6', 'plan', { browser: 'browser', ip: 'ip' }, new Date('2026-11-02T00:00:00Z'))).not.toThrow();
  });

  it('limits an IP even when browser identities change', () => {
    const db = store();
    for (let index = 0; index < 100; index++) db.beginRequest(`id-${index}`, 'plan', { browser: `browser-${index}`, ip: 'shared-ip' }, today);
    expect(() => db.beginRequest('id-101', 'plan', { browser: 'browser-101', ip: 'shared-ip' }, today)).toThrow('today’s limit');
    expect(db.db.prepare("SELECT count FROM rate_limits WHERE principal='browser-101'").get()).toBeUndefined();
  });

  it('aggregates allowlisted campaigns without storing an event per person', () => {
    const db = store();
    db.publicEvent('start', 'linkedin-launch', { browser: 'browser', ip: 'ip' }, today);
    db.publicEvent('start', 'linkedin-launch', { browser: 'browser', ip: 'ip' }, today);
    expect(db.db.prepare('SELECT * FROM events').all()).toEqual([{ day: '2026-11-01', event: 'start', campaign: 'linkedin-launch', count: 2 }]);
  });
});
