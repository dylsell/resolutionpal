import type { Intake, ResolutionPlan } from './types';
import { addDays, formatDate } from './dates';

export function planAsText(plan: ResolutionPlan, intake: Intake): string {
  return [
    `${plan.title}\nA Resolution Pal plan`,
    `Starting ${formatDate(intake.startDate)} · ${intake.minutesPerWeek} minutes a week`,
    `MY RESOLUTION\n${plan.resolution}`, `WHY IT MATTERS\n${plan.why}`, `WHAT SUCCESS LOOKS LIKE\n${plan.successMeasure}`,
    `MY FIRST WEEK\n${plan.firstWeek.map((a, i) => `${i + 1}. ${a.title} (${a.minutes} min)\n${a.detail}`).join('\n\n')}`,
    `MY WEEKLY RHYTHM\n${plan.weeklyRoutine.map(a => `${a.action}\n${a.frequency} · ${a.minutesPerWeek} min/week`).join('\n\n')}`,
    `ON A DIFFICULT WEEK\n${plan.minimumVersion}`, `WHEN LIFE GETS IN THE WAY\n${plan.obstaclePlan}`,
    `MY NEXT 90 DAYS\n${plan.milestones.map(a => `Day ${a.day} · ${formatDate(addDays(intake.startDate, a.day))}\n${a.title}\n${a.detail}`).join('\n\n')}`,
    `A QUESTION TO COME BACK TO\n${plan.reflection}`, plan.encouragement, 'Made with Resolution Pal · https://resolutionpal.com',
  ].join('\n\n');
}
