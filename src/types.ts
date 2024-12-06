export interface ActionPlan {
  month_1: string[];
  month_2_3: string[];
  month_4_6: string[];
}

export interface Resolution {
  category: string;
  description: string;
  timeframe: string;
  milestones: string[];
  title: string;
  statement: string;
  why_this_matters: string;
  action_plan: {
    january: string[];
    february_march: string[];
    april_june: string[];
    july_september: string[];
    october_december: string[];
  };
  tools_and_resources: string[];
  tracking_checklist: string[];
  encouragement: string;
  debug_data: {
    raw_user_info: string;
    personality_insights: string;
    motivation_patterns: string;
    answer_analysis: string;
  };
}

export interface UserResponses {
  goals: string;
  challenges: string;
  timeCommitment: string;
  previousExperience: string;
}

export interface OpenAnswer {
  question: string;
  answer: string;
} 