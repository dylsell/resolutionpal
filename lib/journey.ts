'use client';

import { useCallback, useEffect, useState } from 'react';
import { localDate } from './dates';
import type { SavedJourney } from './types';

const STORAGE_KEY = 'resolutionpal.journey.v1';
let memoryJourney: SavedJourney | null = null;
let memoryWriteFailed = false;
export function newJourney(): SavedJourney {
  return {
    version: 1, updatedAt: new Date().toISOString(), step: 0,
    intake: { goal: '', motivation: '', success: '', baseline: '', obstacle: '', minutesPerWeek: 60, startDate: localDate() },
    questions: [], answers: {}, plan: null,
  };
}
function validSaved(value: unknown): value is SavedJourney {
  if (!value || typeof value !== 'object') return false;
  const j = value as SavedJourney;
  if (typeof j.updatedAt !== 'string' || !Number.isFinite(Date.parse(j.updatedAt))) return false;
  if (j.version !== 1 || !j.intake || !Number.isInteger(j.step) || j.step < 0 || j.step > 6 || !Array.isArray(j.questions) || !j.answers || typeof j.answers !== 'object') return false;
  if (!['goal', 'motivation', 'success', 'baseline', 'obstacle', 'startDate'].every(k => typeof j.intake[k as keyof typeof j.intake] === 'string')) return false;
  if (!Number.isFinite(j.intake.minutesPerWeek) || !/^\d{4}-\d{2}-\d{2}$/.test(j.intake.startDate)) return false;
  const parsedDate = new Date(`${j.intake.startDate}T12:00:00Z`);
  if (!Number.isFinite(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== j.intake.startDate) return false;
  if (!j.questions.every(q => q && typeof q.id === 'string' && typeof q.question === 'string' && Array.isArray(q.options) && q.options.every(o => typeof o === 'string'))) return false;
  if (!Object.values(j.answers).every(a => typeof a === 'string')) return false;
  if (j.plan) {
    const p = j.plan;
    if (!['title', 'resolution', 'why', 'successMeasure', 'minimumVersion', 'obstaclePlan', 'reflection', 'encouragement'].every(k => typeof p[k as keyof typeof p] === 'string')) return false;
    if (!Array.isArray(p.firstWeek) || !Array.isArray(p.weeklyRoutine) || !Array.isArray(p.milestones)) return false;
    if (!p.firstWeek.every(a => typeof a.title === 'string' && typeof a.detail === 'string' && typeof a.minutes === 'number')) return false;
    if (!p.weeklyRoutine.every(a => typeof a.action === 'string' && typeof a.frequency === 'string' && typeof a.minutesPerWeek === 'number')) return false;
    if (!p.milestones.every(a => [30, 60, 90].includes(a.day) && typeof a.title === 'string' && typeof a.detail === 'string')) return false;
  }
  return true;
}
/** An unpersisted change remains authoritative for this tab across route remounts. */
export function readJourney(): SavedJourney | null {
  if (memoryWriteFailed && memoryJourney) return memoryJourney;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return memoryJourney;
  const parsed: unknown = JSON.parse(saved);
  if (!validSaved(parsed)) return memoryJourney;
  if (memoryJourney && Date.parse(memoryJourney.updatedAt) >= Date.parse(parsed.updatedAt)) return memoryJourney;
  return parsed;
}
export function persistJourney(journey: SavedJourney): boolean {
  memoryJourney = journey;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(journey));
    memoryWriteFailed = false;
    return true;
  } catch {
    memoryWriteFailed = true;
    return false;
  }
}
export function useJourney() {
  const [journey, setJourney] = useState<SavedJourney | null>(null);
  const [storageWarning, setStorageWarning] = useState('');
  useEffect(() => {
    try { setJourney(readJourney() ?? newJourney()); }
    catch { setJourney(memoryJourney ?? newJourney()); setStorageWarning('This browser could not load your saved draft. You can still make a plan, but keep this tab open.'); }
  }, []);
  useEffect(() => {
    if (!journey) return;
    if (persistJourney(journey)) setStorageWarning('');
    else setStorageWarning('Your browser could not save this plan. Keep this tab open, then copy or print your finished plan.');
  }, [journey]);
  const update = useCallback((change: (current: SavedJourney) => SavedJourney) => {
    setJourney(current => current ? { ...change(current), updatedAt: new Date().toISOString() } : current);
  }, []);
  const clear = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Keep the in-memory reset usable. */ }
    memoryJourney = newJourney();
    memoryWriteFailed = true;
    setJourney(memoryJourney);
  }, []);
  return { journey, update, clear, storageWarning };
}
