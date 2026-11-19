import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolutionPlan } from '../lib/types';

const plan: ResolutionPlan = {
  title: 'Read a little every week', resolution: 'Make reading a regular part of my life', why: 'I miss good stories', successMeasure: 'Read three books',
  firstWeek: [{ title: 'Choose', detail: 'Pick one book', minutes: 5 }, { title: 'Prepare', detail: 'Put it by my chair', minutes: 5 }, { title: 'Read', detail: 'Try ten minutes', minutes: 10 }],
  weeklyRoutine: [{ action: 'Read', frequency: 'Twice a week', minutesPerWeek: 20 }], minimumVersion: 'One page counts', obstaclePlan: 'Leave my phone in another room',
  milestones: [{ day: 30, title: 'Begin', detail: 'Find a rhythm' }, { day: 60, title: 'Continue', detail: 'Keep reading' }, { day: 90, title: 'Reflect', detail: 'Notice what worked' }],
  reflection: 'What helped me start?', encouragement: 'A little counts',
};

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('saved journey survives unavailable browser persistence', () => {
  it('keeps the generated plan across route remount reads when a larger write exceeds quota after a draft saved', async () => {
    let disk: string | null = null;
    let full = false;
    vi.stubGlobal('window', { localStorage: {
      getItem: () => disk,
      setItem: (_key: string, value: string) => { if (full) throw new DOMException('Storage full', 'QuotaExceededError'); disk = value; },
    } });
    const { newJourney, persistJourney, readJourney } = await import('../lib/journey');
    const draft = { ...newJourney(), updatedAt: '2026-11-01T12:00:00.000Z', step: 6 };
    expect(persistJourney(draft)).toBe(true);
    full = true;
    // Same-millisecond writes must also work: a timestamp comparison alone cannot detect this newer state.
    const finished = { ...draft, plan };
    expect(persistJourney(finished)).toBe(false);
    expect(JSON.parse(disk!).plan).toBeNull();
    expect(readJourney()?.plan).toEqual(plan); // /start unmounts; /plan reads the journey again.
    expect(readJourney()?.plan).toEqual(plan); // Further route navigation still retains the result.
    full = false;
    expect(persistJourney(readJourney()!)).toBe(true);
    expect(JSON.parse(disk!).plan).toEqual(plan);
  });

  it('accepts a newer successfully saved journey from another tab when this tab has no pending failed write', async () => {
    let disk: string | null = null;
    vi.stubGlobal('window', { localStorage: { getItem: () => disk, setItem: (_key: string, value: string) => { disk = value; } } });
    const { newJourney, persistJourney, readJourney } = await import('../lib/journey');
    const earlier = { ...newJourney(), updatedAt: '2026-11-01T12:00:00.000Z' };
    persistJourney(earlier);
    const newer = { ...earlier, updatedAt: '2026-11-01T12:01:00.000Z', plan };
    disk = JSON.stringify(newer);
    expect(readJourney()?.plan).toEqual(plan);
  });
});
