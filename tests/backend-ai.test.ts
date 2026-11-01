import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ create: vi.fn(), configurations: [] as unknown[] }));
vi.mock('openai', () => {
  class APIError extends Error {
    status?: number;
    code?: string;
    type?: string;
    constructor(status?: number, error?: { code?: string; type?: string }) {
      super('Synthetic provider error');
      this.status = status;
      this.code = error?.code;
      this.type = error?.type;
    }
  }
  class OpenAI {
    static APIError = APIError;
    responses = { create: mock.create };
    constructor(configuration: unknown) { mock.configurations.push(configuration); }
  }
  return { default: OpenAI };
});

import OpenAI from 'openai';
import { makeFollowups, makePlan, usageCostMicros } from '../lib/server/ai';
import { QuotaStore } from '../lib/server/store';

const intake = { goal: 'PRIVATE_GOAL', motivation: 'PRIVATE_MOTIVATION', success: 'Finish three books', baseline: 'Rarely read', obstacle: 'Phone distraction', minutesPerWeek: 30, startDate: '2026-11-01' };
const input = { intake, followups: [{ id: 'q1', question: 'When?', answer: 'Morning' }, { id: 'q2', question: 'What helps?', answer: 'A reminder' }] };
const plan = { title: 'A page at a time', resolution: 'Read a little every week', why: 'Make room to learn', successMeasure: 'Three books in 90 days', firstWeek: [{ title: 'Choose', detail: 'Choose one book', minutes: 5 }, { title: 'Prepare', detail: 'Set it next to your chair', minutes: 5 }, { title: 'Begin', detail: 'Read a chapter', minutes: 20 }], weeklyRoutine: [{ action: 'Read', frequency: 'Three times a week', minutesPerWeek: 30 }], minimumVersion: 'Read one page', obstaclePlan: 'If the phone distracts me, put it away', milestones: [{ day: 30, title: 'One book', detail: 'Reflect on your progress' }, { day: 60, title: 'Two books', detail: 'Choose what interests you' }, { day: 90, title: 'Three books', detail: 'Celebrate your progress' }], reflection: 'What made reading easier?', encouragement: 'A little time counts' };
const success = (value: unknown) => ({ status: 'completed', output_text: JSON.stringify(value), usage: { input_tokens: 100, output_tokens: 100 } });
const stores: QuotaStore[] = [];
function store(dailyMicros = 5_000_000) { const result = new QuotaStore(':memory:', { dailyMicros, monthlyMicros: 15_000_000 }); stores.push(result); return result; }

beforeEach(() => { vi.stubEnv('OPENAI_API_KEY', 'test-only-not-a-real-key'); mock.create.mockReset(); mock.configurations.length = 0; });
afterEach(() => { stores.splice(0).forEach((db) => db.close()); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('bounded model generation', () => {
  it('disables provider storage and SDK retries, validates output, and records actual known usage', async () => {
    const db = store(); mock.create.mockResolvedValueOnce(success(plan));
    await expect(makePlan(input, db)).resolves.toEqual(plan);
    expect(mock.configurations[0]).toMatchObject({ maxRetries: 0, timeout: 25_000 });
    expect(mock.create.mock.calls[0][0]).toMatchObject({ store: false, max_output_tokens: 3000, reasoning: { effort: 'none' } });
    expect(db.db.prepare('SELECT amount_micros,reconciled FROM reservations').get()).toEqual({ amount_micros: usageCostMicros(100, 100), reconciled: 1 });
  });

  it('reserves a retry separately and retains the unknown first attempt charge', async () => {
    const db = store();
    mock.create.mockRejectedValueOnce(new Error('Timeout with unknown provider usage')).mockResolvedValueOnce(success(plan));
    await expect(makePlan(input, db)).resolves.toEqual(plan);
    const rows = db.db.prepare('SELECT amount_micros,reconciled FROM reservations ORDER BY rowid').all() as { amount_micros: number; reconciled: number }[];
    expect(rows).toHaveLength(2); expect(rows[0].reconciled).toBe(0); expect(rows[0].amount_micros).toBeGreaterThan(usageCostMicros(100, 100)); expect(rows[1].reconciled).toBe(1);
  });

  it.each([
    { code: 'credit_balance_exhausted', type: 'insufficient_quota' },
    { code: 'insufficient_quota' },
    { type: 'insufficient_quota' },
  ])('releases only explicit billing-rejected usage and skips retry: %j', async (details) => {
    const db = store();
    mock.create.mockRejectedValue(new OpenAI.APIError(429, details, 'Synthetic billing rejection', new Headers()));
    await expect(makePlan(input, db)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(mock.create).toHaveBeenCalledTimes(1);
    expect(db.db.prepare('SELECT amount_micros,reconciled,input_tokens,output_tokens FROM reservations').all()).toEqual([{ amount_micros: 0, reconciled: 1, input_tokens: 0, output_tokens: 0 }]);
    expect(db.db.prepare("SELECT count FROM events WHERE event='ai_plan_billing_quota'").get()).toEqual({ count: 1 });
  });

  it('keeps follow-up fallback available on an explicit billing rejection without charging an unused reservation', async () => {
    const db = store();
    mock.create.mockRejectedValue(new OpenAI.APIError(429, { code: 'credit_balance_exhausted', type: 'insufficient_quota' }, 'Synthetic billing rejection', new Headers()));
    await expect(makeFollowups(intake, db)).resolves.toMatchObject({ fallback: true });
    expect(mock.create).toHaveBeenCalledTimes(1);
    expect(db.db.prepare('SELECT amount_micros,reconciled FROM reservations').get()).toEqual({ amount_micros: 0, reconciled: 1 });
  });

  it.each([{ code: 'rate_limit_exceeded' }, {}])('stops fast on other 429 responses while holding unknown usage: %j', async (details) => {
    const db = store();
    mock.create.mockRejectedValue(new OpenAI.APIError(429, details, 'Synthetic rate limit', new Headers()));
    await expect(makePlan(input, db)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(mock.create).toHaveBeenCalledTimes(1);
    const row = db.db.prepare('SELECT amount_micros,reconciled FROM reservations').get() as { amount_micros: number; reconciled: number };
    expect(row.reconciled).toBe(0); expect(row.amount_micros).toBeGreaterThan(0);
    expect(db.db.prepare("SELECT count FROM events WHERE event='ai_plan_billing_quota'").get()).toBeUndefined();
  });

  it('does not release a non-429 failure merely because a billing-like code is present', async () => {
    const db = store();
    mock.create.mockRejectedValueOnce(new OpenAI.APIError(500, { code: 'insufficient_quota' }, 'Synthetic ambiguous server failure', new Headers())).mockResolvedValueOnce(success(plan));
    await expect(makePlan(input, db)).resolves.toEqual(plan);
    const rows = db.db.prepare('SELECT amount_micros,reconciled FROM reservations ORDER BY rowid').all() as { amount_micros: number; reconciled: number }[];
    expect(mock.create).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(2); expect(rows[0].reconciled).toBe(0); expect(rows[0].amount_micros).toBeGreaterThan(0); expect(rows[1].reconciled).toBe(1);
  });

  it('never returns an invented final plan when attempts fail', async () => {
    const db = store(); mock.create.mockRejectedValue(new Error('Provider outage'));
    await expect(makePlan(input, db)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(mock.create).toHaveBeenCalledTimes(2);
    expect(db.db.prepare('SELECT COUNT(*) AS count FROM reservations WHERE reconciled=0').get()).toEqual({ count: 2 });
  });

  it('rejects a generated plan that exceeds the user’s time budget', async () => {
    const db = store(); mock.create.mockResolvedValue(success({ ...plan, weeklyRoutine: [{ action: 'Read', frequency: 'Daily', minutesPerWeek: 300 }] }));
    await expect(makePlan(input, db)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(mock.create).toHaveBeenCalledTimes(2);
  });

  it('offers prepared follow-up questions after one failure, retaining the reservation', async () => {
    const db = store(); mock.create.mockRejectedValue(new Error('Timeout'));
    const result = await makeFollowups(intake, db);
    expect(result.fallback).toBe(true); expect(result.questions.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(mock.create).toHaveBeenCalledTimes(1);
    expect(db.db.prepare('SELECT reconciled FROM reservations').get()).toEqual({ reconciled: 0 });
  });

  it('uses fallback questions without a key and makes no provider request', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const db = store(); await expect(makeFollowups(intake, db)).resolves.toMatchObject({ fallback: true });
    await expect(makePlan(input, db)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(mock.create).not.toHaveBeenCalled();
    expect(db.db.prepare('SELECT COUNT(*) AS count FROM reservations').get()).toEqual({ count: 0 });
  });

  it('makes no provider request when the durable budget cannot be reserved', async () => {
    const db = store(0);
    await expect(makePlan(input, db)).rejects.toMatchObject({ code: 'AI_BUDGET_EXHAUSTED' });
    await expect(makeFollowups(intake, db)).resolves.toMatchObject({ fallback: true });
    expect(mock.create).not.toHaveBeenCalled();
  });

  it('keeps overlapping in-flight generations within the same allowance', async () => {
    const db = store(50_000);
    const release: ((value: ReturnType<typeof success>) => void)[] = [];
    mock.create.mockImplementation(() => new Promise((resolve) => release.push(resolve)));
    const running = Promise.allSettled(Array.from({ length: 10 }, () => makePlan(input, db)));
    const reserved = db.db.prepare('SELECT SUM(amount_micros) AS total FROM reservations').get() as { total: number };
    expect(reserved.total).toBeLessThanOrEqual(50_000);
    expect(release.length).toBeGreaterThan(0);
    expect(release.length).toBeLessThan(10);
    release.forEach((resolve) => resolve(success(plan)));
    const outcomes = await running;
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(release.length);
    for (const result of outcomes) if (result.status === 'rejected') expect(result.reason).toMatchObject({ code: 'AI_BUDGET_EXHAUSTED' });
  });

  it('fails closed without another AI call when usage storage fails', async () => {
    const db = store(); mock.create.mockResolvedValue(success(plan));
    vi.spyOn(db, 'reconcile').mockImplementation(() => { throw new Error('Disk unavailable'); });
    await expect(makePlan(input, db)).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
    expect(mock.create).toHaveBeenCalledTimes(1);
  });

  it('does not persist personal answers or log raw provider errors', async () => {
    const db = store(); mock.create.mockRejectedValue(new Error('PRIVATE_GOAL PRIVATE_MOTIVATION'));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(makePlan(input, db)).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
    const stored = JSON.stringify(['reservations', 'events', 'requests', 'rate_limits'].flatMap((table) => db.db.prepare(`SELECT * FROM ${table}`).all()));
    expect(stored).not.toContain('PRIVATE_'); expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled();
  });
});
