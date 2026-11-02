export type Intake = {
  goal: string;
  motivation: string;
  success: string;
  baseline: string;
  obstacle: string;
  minutesPerWeek: number;
  startDate: string;
};

export type FollowupQuestion = { id: string; question: string; options: string[] };
export type FollowupAnswer = { id: string; question: string; answer: string };
export type PlanInput = { intake: Intake; followups: FollowupAnswer[] };

export type ResolutionPlan = {
  title: string;
  resolution: string;
  why: string;
  successMeasure: string;
  firstWeek: { title: string; detail: string; minutes: number }[];
  weeklyRoutine: { action: string; frequency: string; minutesPerWeek: number }[];
  minimumVersion: string;
  obstaclePlan: string;
  milestones: { day: 30 | 60 | 90; title: string; detail: string }[];
  reflection: string;
  encouragement: string;
};

export type SavedJourney = {
  version: 1;
  updatedAt: string;
  step: number;
  intake: Intake;
  questions: FollowupQuestion[];
  answers: Record<string, string>;
  plan: ResolutionPlan | null;
};

export type ApiError = { error: string; code: string; retryAfter?: number };

export type FunnelEvent = 'visit' | 'start' | 'interview_complete' | 'plan_complete' | 'copy' | 'print' | 'share' | 'clear';
