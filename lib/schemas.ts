import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value && value >= '2020-01-01' && value <= '2100-12-31';
}, 'Choose a valid start date.');

export const intakeSchema = z.object({
  goal: text(500), motivation: text(1000), success: text(800),
  baseline: text(800), obstacle: text(800),
  minutesPerWeek: z.number().int().min(5).max(10080), startDate: date,
}).strict();

export const followupQuestionSchema = z.object({
  id: z.enum(['q1', 'q2']), question: text(350), options: z.array(text(100)).min(2).max(4),
}).strict();
export const followupOutputSchema = z.object({ questions: z.array(followupQuestionSchema).length(2) }).strict();
export const followupRequestSchema = z.object({ intake: intakeSchema, requestId: z.uuid() }).strict();
export const planRequestSchema = z.object({
  intake: intakeSchema,
  followups: z.array(z.object({ id: z.enum(['q1', 'q2']), question: text(350), answer: text(1000) }).strict()).length(2)
    .refine((answers) => new Set(answers.map((answer) => answer.id)).size === 2, 'Answer both questions.'),
  requestId: z.uuid(),
}).strict();

export const planSchema = z.object({
  title: text(90), resolution: text(450), why: text(400), successMeasure: text(400),
  firstWeek: z.array(z.object({ title: text(90), detail: text(400), minutes: z.number().int().min(1).max(10080) }).strict()).length(3),
  weeklyRoutine: z.array(z.object({ action: text(180), frequency: text(100), minutesPerWeek: z.number().int().min(1).max(10080) }).strict()).min(1).max(5),
  minimumVersion: text(400), obstaclePlan: text(450),
  milestones: z.array(z.object({ day: z.union([z.literal(30), z.literal(60), z.literal(90)]), title: text(90), detail: text(400) }).strict()).length(3),
  reflection: text(350), encouragement: text(250),
}).strict();

export const campaignSchema = z.enum(['linkedin-launch', 'personal-site', 'direct']);
export const eventSchema = z.object({
  event: z.enum(['visit', 'start', 'interview_complete', 'plan_complete', 'copy', 'print', 'share', 'clear']),
  campaign: campaignSchema.optional(),
}).strict();

export function validatePlan(value: unknown, minutesPerWeek: number) {
  const plan = planSchema.parse(value);
  if (plan.milestones.map((milestone) => milestone.day).join(',') !== '30,60,90') throw new Error('Invalid milestones');
  if (plan.firstWeek.reduce((sum, action) => sum + action.minutes, 0) > minutesPerWeek) throw new Error('First week exceeds time budget');
  if (plan.weeklyRoutine.reduce((sum, action) => sum + action.minutesPerWeek, 0) > minutesPerWeek) throw new Error('Routine exceeds time budget');
  return plan;
}
