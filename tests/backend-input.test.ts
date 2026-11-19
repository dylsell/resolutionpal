import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eventSchema, followupRequestSchema, intakeSchema, planRequestSchema, validatePlan } from '../lib/schemas';
import { apiError, checkOrigin, createContext, readJson } from '../lib/server/http';
import { getStore, type QuotaStore } from '../lib/server/store';

const intake = { goal: 'Read more', motivation: 'I miss learning', success: 'Finish three books', baseline: 'Rarely read', obstacle: 'Phone distraction', minutesPerWeek: 30, startDate: '2026-11-01' };
const plan = { title: 'A page at a time', resolution: 'Read a little every week', why: 'Make room to learn', successMeasure: 'Three books in 90 days', firstWeek: [{ title: 'Choose', detail: 'Choose one book', minutes: 5 }, { title: 'Prepare', detail: 'Set it next to your chair', minutes: 5 }, { title: 'Begin', detail: 'Read a chapter', minutes: 20 }], weeklyRoutine: [{ action: 'Read', frequency: 'Three times a week', minutesPerWeek: 30 }], minimumVersion: 'Read one page', obstaclePlan: 'If the phone distracts me, put it away', milestones: [{ day: 30, title: 'One book', detail: 'Reflect on your progress' }, { day: 60, title: 'Two books', detail: 'Choose what interests you' }, { day: 90, title: 'Three books', detail: 'Celebrate your progress' }], reflection: 'What made reading easier?', encouragement: 'A little time counts' };
const stores = new Set<QuotaStore>();
const dirs: string[] = [];
afterEach(() => {
  stores.forEach((db) => db.close()); stores.clear();
  dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  vi.unstubAllEnvs();
});

function configureStore() {
  const dir = mkdtempSync(join(tmpdir(), 'rp-http-')); dirs.push(dir);
  vi.stubEnv('DATA_DIR', dir);
  vi.stubEnv('RATE_LIMIT_SECRET', 'test-only-rate-limit-key-0123456789');
}

describe('input and generated plan contracts', () => {
  it('accepts complete intake but rejects impossible dates, overlong answers and unknown fields', () => {
    expect(intakeSchema.safeParse(intake).success).toBe(true);
    expect(intakeSchema.safeParse({ ...intake, startDate: '2026-02-30' }).success).toBe(false);
    expect(intakeSchema.safeParse({ ...intake, goal: 'x'.repeat(501) }).success).toBe(false);
    expect(intakeSchema.safeParse({ ...intake, model: 'anything' }).success).toBe(false);
    expect(intakeSchema.safeParse({ ...intake, minutesPerWeek: -1 }).success).toBe(false);
  });

  it('requires a UUID and two distinct answer IDs', () => {
    expect(followupRequestSchema.safeParse({ intake, requestId: 'invalid' }).success).toBe(false);
    expect(planRequestSchema.safeParse({ intake, requestId: 'e2bcdaf0-a8a5-492a-96aa-b89585db814f', followups: [{ id: 'q1', question: 'When?', answer: 'Mornings' }, { id: 'q1', question: 'When?', answer: 'Evenings' }] }).success).toBe(false);
  });

  it('rejects time overcommitment and invalid milestone order', () => {
    expect(validatePlan(plan, 30)).toEqual(plan);
    expect(() => validatePlan(plan, 29)).toThrow('First week exceeds');
    expect(() => validatePlan({ ...plan, weeklyRoutine: [{ action: 'Read', frequency: 'Often', minutesPerWeek: 31 }] }, 30)).toThrow('Routine exceeds');
    expect(() => validatePlan({ ...plan, milestones: [...plan.milestones].reverse() }, 30)).toThrow('Invalid milestones');
  });

  it('limits telemetry to fixed events and campaigns', () => {
    expect(eventSchema.safeParse({ event: 'start', campaign: 'linkedin-launch' }).success).toBe(true);
    expect(eventSchema.safeParse({ event: 'arbitrary-user-text' }).success).toBe(false);
    expect(eventSchema.safeParse({ event: 'start', campaign: 'private-answer' }).success).toBe(false);
    expect(eventSchema.safeParse({ event: 'start', goal: 'private-answer' }).success).toBe(false);
  });
});

describe('HTTP boundary', () => {
  it('requires an explicit production storage directory instead of silently resetting ephemeral counters', () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('DATA_DIR', undefined);
    expect(() => getStore()).toThrow('temporarily unavailable');
  });

  it('signs the browser identity and replaces tampered cookies', () => {
    configureStore();
    const first = createContext(new Request('http://localhost:3007/api/events')); stores.add(first.store);
    expect(first.cookie).toContain('HttpOnly; SameSite=Lax');
    const cookie = first.cookie!.split(';')[0];
    const valid = createContext(new Request('http://localhost:3007/api/events', { headers: { cookie } }));
    expect(valid.browser).toBe(first.browser); expect(valid.cookie).toBeUndefined();
    const tampered = createContext(new Request('http://localhost:3007/api/events', { headers: { cookie: `${cookie.slice(0, -1)}z` } }));
    expect(tampered.browser).not.toBe(first.browser); expect(tampered.cookie).toBeDefined();
  });

  it('trusts only Render forwarding, preferring its overwritten Cloudflare client address', () => {
    configureStore(); vi.stubEnv('RENDER', 'true');
    const context = createContext(new Request('http://localhost:3007/api/events', { headers: { 'cf-connecting-ip': '198.51.100.20', 'x-forwarded-for': '203.0.113.5, 198.51.100.10' } })); stores.add(context.store);
    expect(context.ip).toBe(context.hash('ip:198.51.100.20')); expect(context.ip).not.toContain('198.51.100.20');
    const fallback = createContext(new Request('http://localhost:3007/api/events', { headers: { 'x-forwarded-for': '203.0.113.5, 198.51.100.10' } }));
    expect(fallback.ip).toBe(context.hash('ip:198.51.100.10'));
    vi.stubEnv('RENDER', 'false');
    const untrusted = createContext(new Request('http://localhost:3007/api/events', { headers: { 'x-forwarded-for': '203.0.113.5' } }));
    expect(untrusted.ip).toBe(context.hash('ip:unavailable'));
  });

  it('enforces same-origin JSON and rejects missing or cross-site origins', () => {
    vi.stubEnv('APP_ORIGIN', 'https://resolutionpal.com');
    const request = (headers: Record<string, string>) => new Request('https://resolutionpal.com/api/plan', { method: 'POST', headers });
    expect(() => checkOrigin(request({ origin: 'https://resolutionpal.com', 'content-type': 'application/json' }))).not.toThrow();
    expect(() => checkOrigin(request({ origin: 'https://elsewhere.example', 'content-type': 'application/json' }))).toThrow();
    expect(() => checkOrigin(request({ 'content-type': 'application/json' }))).toThrow();
    expect(() => checkOrigin(request({ origin: 'https://resolutionpal.com', 'content-type': 'text/plain' }))).toThrow();
  });

  it('checks actual body bytes even without Content-Length', async () => {
    const request = new Request('http://localhost:3007/api/events', { method: 'POST', body: JSON.stringify({ event: 'start', extra: 'x'.repeat(2000) }) });
    await expect(readJson(request, eventSchema, 1024)).rejects.toMatchObject({ code: 'REQUEST_TOO_LARGE', status: 413 });
  });

  it('does not expose internal errors or personal content', async () => {
    const response = apiError(new Error('Secret API key and private user answer'));
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).not.toContain('Secret');
    expect(body).not.toContain('private user answer');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
