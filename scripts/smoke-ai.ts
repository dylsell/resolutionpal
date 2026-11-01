import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intakeSchema } from '../lib/schemas';
import { makeFollowups, makePlan } from '../lib/server/ai';
import { ServiceError } from '../lib/server/errors';
import { QuotaStore } from '../lib/server/store';
import type { FollowupQuestion, Intake } from '../lib/types';

// Run with Node 24: node --env-file=.env.local --import=tsx scripts/smoke-ai.ts
// Only invented inputs are used. The normal backend reads the privately supplied API credential.
const outputPath = '/private/tmp/resolutionpal-smoke-results.json';
const MAX_COST_MICROS = 500_000;

type Scenario = {
  name: string;
  intake: Intake;
  goalPattern: RegExp;
  questionPattern: RegExp;
  obstaclePattern: RegExp;
  answer: (question: FollowupQuestion) => string;
};

const scenarios: Scenario[] = [
  {
    name: 'creative-writing-30-minutes',
    intake: {
      goal: 'Write a complete 900-word short story over the next 90 days.',
      motivation: 'I want a quiet creative activity that belongs to me outside work and family responsibilities.',
      success: 'Finish one rough draft that has a beginning, middle and ending. It does not need to be polished or published.',
      baseline: 'I used to enjoy fiction at school, but I have not written a story in years. I have a few ideas in a notebook.',
      obstacle: 'After the children are asleep I usually reach for my phone and lose the small window I had to write.',
      minutesPerWeek: 30,
      startDate: '2026-11-02',
    },
    goalPattern: /writ|story|fiction|draft/i,
    questionPattern: /writ|story|fiction|draft|creativ|phone|evening|children|15.?minute/i,
    obstaclePattern: /phone|distract|scroll/i,
    answer: (question) => {
      if (/genre|fiction|story idea|write about|topic|character/i.test(question.question)) return 'A warm story about two neighbors who start a community garden.';
      if (/when|time of|schedule|routine|days|slot|moment/i.test(question.question)) return 'Tuesday and Thursday evenings after the children are asleep, for 15 minutes each.';
      if (/support|account|remind|motivat|obstacle|distract|phone|help/i.test(question.question)) return 'Put my phone in another room, use a 15-minute timer, and leave the writing document open.';
      if (/progress|finish|success|achieve/i.test(question.question)) return 'A complete 900-word rough draft by day 90, even if the wording is still messy.';
      return question.options[0];
    },
  },
  {
    name: 'walking-60-minutes',
    intake: {
      goal: 'Make a habit of taking three enjoyable 20-minute walks outside each week.',
      motivation: 'I spend most of the day at a screen and want a little fresh air and a change of scenery.',
      success: 'By the end of 90 days, take three walks in most weeks and have a simple way to restart after a missed week.',
      baseline: 'I currently take one 10-minute walk in a typical week. There is a neighborhood park a few blocks from home.',
      obstacle: 'Rain and meetings that run into my lunch break make it easy to skip a walk and then forget about the habit.',
      minutesPerWeek: 60,
      startDate: '2026-11-02',
    },
    goalPattern: /walk/i,
    questionPattern: /walk|route|rain|outside|outdoor|lunch|park|weather|20.?minute/i,
    obstaclePattern: /rain|weather|meeting|lunch/i,
    answer: (question) => {
      if (/where|route|place|location/i.test(question.question)) return 'A familiar loop through the neighborhood park, starting from my front door.';
      if (/when|time of|schedule|routine|days|slot|moment/i.test(question.question)) return 'Monday, Wednesday and Friday at lunch, with an early evening backup if a meeting runs late.';
      if (/rain|weather|obstacle|barrier|help|support/i.test(question.question)) return 'On rainy days I can take a shorter walk under cover; if lunch disappears, I can go before dinner.';
      if (/progress|track|measure|remind/i.test(question.question)) return 'A check mark on my paper calendar after each walk, with no need to track distance or speed.';
      return question.options[0];
    },
  },
];

function usage(store: QuotaStore) {
  const row = store.db.prepare(`
    SELECT COALESCE(SUM(amount_micros),0) AS total,
      COALESCE(SUM(CASE WHEN reconciled=1 THEN amount_micros ELSE 0 END),0) AS settled,
      COALESCE(SUM(CASE WHEN reconciled=0 THEN 1 ELSE 0 END),0) AS held_attempts,
      COUNT(*) AS attempts
    FROM reservations
  `).get() as { total: number; settled: number; held_attempts: number; attempts: number };
  return { reservedAndSettledUSD: row.total / 1_000_000, settledUSD: row.settled / 1_000_000, heldAttempts: row.held_attempts, attempts: row.attempts };
}

async function main() {
  const directory = mkdtempSync(join(tmpdir(), 'resolutionpal-smoke-'));
  let store: QuotaStore | undefined;
  const results: Record<string, unknown>[] = [];
  let allPassed = true;
  try {
    store = new QuotaStore(join(directory, 'smoke.sqlite3'), { dailyMicros: MAX_COST_MICROS, monthlyMicros: MAX_COST_MICROS });
    for (const scenario of scenarios) {
      const started = Date.now();
      const before = usage(store);
      const record: Record<string, unknown> = { scenario: scenario.name, intake: scenario.intake };
      try {
        const intake = intakeSchema.parse(scenario.intake);
        const questionStarted = Date.now();
        const followupResult = await makeFollowups(intake, store);
        const followupMilliseconds = Date.now() - questionStarted;
        const followups = followupResult.questions.map((question) => ({ id: question.id, question: question.question, answer: scenario.answer(question) }));
        record.questions = followupResult.questions;
        record.followups = followups;
        record.fallback = followupResult.fallback;
        const planStarted = Date.now();
        const plan = await makePlan({ intake, followups }, store);
        const planMilliseconds = Date.now() - planStarted;
        const firstWeekMinutes = plan.firstWeek.reduce((sum, action) => sum + action.minutes, 0);
        const weeklyMinutes = plan.weeklyRoutine.reduce((sum, action) => sum + action.minutesPerWeek, 0);
        const questionContextCount = followupResult.questions.filter((question) => scenario.questionPattern.test(question.question)).length;
        const checks = {
          twoGeneratedQuestions: !followupResult.fallback && followupResult.questions.length === 2 && followupResult.questions.map((question) => question.id).join(',') === 'q1,q2',
          questionsReferenceContext: questionContextCount > 0,
          planReferencesGoal: scenario.goalPattern.test(`${plan.title} ${plan.resolution} ${plan.firstWeek.map((action) => action.detail).join(' ')}`),
          planAddressesObstacle: scenario.obstaclePattern.test(plan.obstaclePlan),
          firstWeekFitsTimeBudget: firstWeekMinutes <= intake.minutesPerWeek,
          routineFitsTimeBudget: weeklyMinutes <= intake.minutesPerWeek,
          milestonesAreOrdered: plan.milestones.map((milestone) => milestone.day).join(',') === '30,60,90',
        };
        const passed = Object.values(checks).every(Boolean);
        allPassed &&= passed;
        Object.assign(record, { plan, passed, checks, questionContextCount, firstWeekMinutes, weeklyMinutes, timing: { followupMilliseconds, planMilliseconds, totalMilliseconds: Date.now() - started } });
        console.log(`${scenario.name}: ${passed ? 'PASS' : 'REVIEW NEEDED'}; followups ${followupMilliseconds}ms; plan ${planMilliseconds}ms; first week ${firstWeekMinutes}/${intake.minutesPerWeek} min; weekly ${weeklyMinutes}/${intake.minutesPerWeek} min; context questions ${questionContextCount}/2; goal ${checks.planReferencesGoal ? 'yes' : 'no'}; obstacle ${checks.planAddressesObstacle ? 'yes' : 'no'}.`);
      } catch (error) {
        allPassed = false;
        // Provider errors may include request content; never print or serialize their raw messages.
        const code = error instanceof ServiceError ? error.code : 'SMOKE_CHECK_FAILED';
        Object.assign(record, { passed: false, errorCode: code, totalMilliseconds: Date.now() - started });
        console.log(`${scenario.name}: FAILED (${code}).`);
      }
      const after = usage(store);
      record.costUSD = Number((after.reservedAndSettledUSD - before.reservedAndSettledUSD).toFixed(6));
      results.push(record);
    }
    const cost = usage(store);
    const report = {
      generatedAt: new Date().toISOString(), syntheticInputsOnly: true,
      note: 'Personalization checks are simple text signals; review the synthetic plans for meaning and usefulness.',
      allPassed, allowanceUSD: 0.50, cost,
      counters: store.db.prepare('SELECT event, SUM(count) AS count FROM events GROUP BY event ORDER BY event').all(),
      results,
    };
    writeFileSync(outputPath, JSON.stringify(report, null, 2), { mode: 0o600 });
    chmodSync(outputPath, 0o600);
    console.log(`AI allowance used/reserved: $${cost.reservedAndSettledUSD.toFixed(6)} of $0.50; settled $${cost.settledUSD.toFixed(6)}; held attempts ${cost.heldAttempts}.`);
    console.log(`Synthetic results saved to ${outputPath}.`);
    if (!allPassed) process.exitCode = 1;
  } finally {
    store?.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

void main().catch(() => {
  console.error('Synthetic smoke check could not finish. No raw provider error was printed.');
  process.exitCode = 1;
});
