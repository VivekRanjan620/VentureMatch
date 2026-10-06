export interface MatchingWeights {
  skillComplement: number;
  requirementFit: number;
  commitment: number;
  industryExperience: number;
  stage: number;
  equityCompensation: number;
  location: number;
  preferences: number;
}

export interface MatchingConfig {
  weights: MatchingWeights;
  candidateCap: number;
  commitmentBands: {
    hoursFull: number;
    hoursPart: number;
    hoursLow: number;
    minMonthsLong: number;
    minMonthsMedium: number;
    minMonthsShort: number;
  };
  industryExperience: {
    sameIndustryBase: number;
    differentIndustryBase: number;
    previousStartupBonus: number;
  };
  stageRequirements: {
    idea: { minExperience: number };
    mvp: { minExperience: number };
    earlyTraction: { minExperience: number };
    growth: { minExperience: number };
  };
  equityGap: {
    discussionMax: number; // 1-10 points over max -> Needs discussion (0.5)
    missingOwnerNeutral: number; // 0.5
    highMultiplier: number; // 1.0
    partialMultiplier: number; // 0.5
    lowMultiplier: number; // 0.0 (>10 points over max -> Low)
  };
  location: {
    highMultiplier: number; // 1.0
    lowMultiplier: number; // 0.0
  };
  preferencesDefaultScore: number; // 0.5 neutral placeholder
  neutralFallbackMultiplier: number; // 0.5 for missing fields
}

export const MATCH_CONFIG: MatchingConfig = {
  weights: {
    skillComplement: 25,
    requirementFit: 20,
    commitment: 15,
    industryExperience: 10,
    stage: 10,
    equityCompensation: 10,
    location: 5,
    preferences: 5,
  },
  candidateCap: 500,
  commitmentBands: {
    hoursFull: 35,
    hoursPart: 20,
    hoursLow: 10,
    minMonthsLong: 12,
    minMonthsMedium: 6,
    minMonthsShort: 3,
  },
  industryExperience: {
    sameIndustryBase: 0.8,
    differentIndustryBase: 0.3,
    previousStartupBonus: 0.2,
  },
  stageRequirements: {
    idea: { minExperience: 0 },
    mvp: { minExperience: 1 },
    earlyTraction: { minExperience: 3 },
    growth: { minExperience: 5 },
  },
  equityGap: {
    discussionMax: 10,
    missingOwnerNeutral: 0.5,
    highMultiplier: 1.0,
    partialMultiplier: 0.5,
    lowMultiplier: 0.0,
  },
  location: {
    highMultiplier: 1.0,
    lowMultiplier: 0.0,
  },
  preferencesDefaultScore: 0.5,
  neutralFallbackMultiplier: 0.5,
};
