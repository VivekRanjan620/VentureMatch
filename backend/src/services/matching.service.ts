import { MATCH_CONFIG } from '../config/matching';
import { checkProfileComplete, checkCommitmentComplete } from './user.service';

export type ComponentLabel = 'High' | 'Medium' | 'Low' | 'Needs discussion';

export interface BreakdownItem {
  weight: number;
  points: number;
  label: ComponentLabel;
}

export interface CandidateData {
  profile?: {
    skills?: any;
    industry?: string | null;
    experienceYears?: number | null;
    previousStartup?: boolean | null;
    city?: string | null;
    name?: string | null;
  } | null;
  commitment?: {
    hoursPerWeek?: number | null;
    availability?: string | null;
    minMonths?: number | null;
    equityExpectation?: number | null;
    compensationPref?: string | null;
    remote?: boolean | null;
  } | null;
}

export interface RequirementData {
  needSkill: string;
  industry: string;
  stage: string;
  equityOfferMax?: number | null;
  commitment?: string | null;
  location?: string | null;
  remote?: boolean | null;
}

export interface OwnerData {
  profile?: {
    skills?: any;
    city?: string | null;
  } | null;
  commitment?: {
    equityExpectation?: number | null;
    compensationPref?: string | null;
  } | null;
}

export interface MatchingResult {
  score: number | null;
  breakdown: Record<string, BreakdownItem> | null;
  reasons: string[];
}

export interface CursorPayload {
  mode: 'recent' | 'match';
  createdAt?: string;
  score?: number | null;
  id: string;
}

// Defensive helper to parse skills array from JSON, array, string, or null
export const parseSkillsArray = (skills: any): string[] => {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills.filter((s) => typeof s === 'string');
  }
  if (typeof skills === 'string') {
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => typeof s === 'string');
      }
    } catch (_e) {
      return [skills];
    }
  }
  return [];
};

// Normalize city string: trim, lowercase, take part before first comma
export const normalizeCity = (cityStr?: string | null): string => {
  if (!cityStr || typeof cityStr !== 'string') return '';
  const trimmed = cityStr.trim().toLowerCase();
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx !== -1) {
    return trimmed.substring(0, commaIdx).trim();
  }
  return trimmed;
};

// Pure function to calculate recommendation score
export const score = (
  candidate: CandidateData,
  requirement: RequirementData,
  owner: OwnerData,
): MatchingResult => {
  // Check candidate profile and commitment completeness using shared user.service functions
  if (!candidate || !checkProfileComplete(candidate.profile) || !checkCommitmentComplete(candidate.commitment)) {
    return {
      score: null,
      breakdown: null,
      reasons: ['Complete your profile to see your score'],
    };
  }

  const breakdown: Record<string, BreakdownItem> = {};
  const reasons: string[] = [];
  const weights = MATCH_CONFIG.weights;

  // 1. skillComplement (25)
  const candSkills = parseSkillsArray(candidate.profile?.skills).map((s) => s.toLowerCase());
  const ownerSkills = parseSkillsArray(owner.profile?.skills).map((s) => s.toLowerCase());
  const targetSkill = (requirement.needSkill || '').toLowerCase();

  let skillMult = 0;
  let skillLabel: ComponentLabel = 'Low';
  let skillReason = `You do not have the ${requirement.needSkill} skill required for this role.`;

  if (candSkills.includes(targetSkill)) {
    if (!ownerSkills.includes(targetSkill)) {
      skillMult = 1.0;
      skillLabel = 'High';
      skillReason = `You have the ${requirement.needSkill} skill this founder needs.`;
    } else {
      skillMult = 0.6;
      skillLabel = 'Medium';
      skillReason = `You share the ${requirement.needSkill} skill with the founder.`;
    }
  }
  const skillPoints = Math.round(skillMult * weights.skillComplement);
  breakdown.skillComplement = { weight: weights.skillComplement, points: skillPoints, label: skillLabel };
  reasons.push(skillReason);

  // 2. requirementFit (20)
  const reqCommit = requirement.commitment;
  const candAvail = candidate.commitment?.availability;

  let fitMult = 0.5;
  let fitLabel: ComponentLabel = 'Medium';
  let fitReason = `Commitment details incomplete; needs discussion.`;

  if (reqCommit && candAvail) {
    if (reqCommit === candAvail) {
      fitMult = 1.0;
      fitLabel = 'High';
      fitReason = `Your ${candAvail} availability matches what the founder is looking for.`;
    } else if (reqCommit === 'FULL' && candAvail === 'PART') {
      fitMult = 0.4;
      fitLabel = 'Medium';
      fitReason = `Role requires FULL time, but your availability is PART time.`;
    } else {
      fitMult = 0.0;
      fitLabel = 'Low';
      fitReason = `Your availability (${candAvail}) does not match the requirement (${reqCommit}).`;
    }
  }
  const fitPoints = Math.round(fitMult * weights.requirementFit);
  breakdown.requirementFit = { weight: weights.requirementFit, points: fitPoints, label: fitLabel };
  reasons.push(fitReason);

  // 3. commitment (15)
  const hours = candidate.commitment?.hoursPerWeek;
  const months = candidate.commitment?.minMonths;

  let commMult = 0.5;
  let commLabel: ComponentLabel = 'Medium';
  let commReason = `Commitment hours/duration not fully specified.`;

  if (hours != null && months != null) {
    let hoursMult = 0.2;
    if (hours >= MATCH_CONFIG.commitmentBands.hoursFull) hoursMult = 1.0;
    else if (hours >= MATCH_CONFIG.commitmentBands.hoursPart) hoursMult = 0.7;
    else if (hours >= MATCH_CONFIG.commitmentBands.hoursLow) hoursMult = 0.4;

    let monthsMult = 0.2;
    if (months >= MATCH_CONFIG.commitmentBands.minMonthsLong) monthsMult = 1.0;
    else if (months >= MATCH_CONFIG.commitmentBands.minMonthsMedium) monthsMult = 0.7;
    else if (months >= MATCH_CONFIG.commitmentBands.minMonthsShort) monthsMult = 0.4;

    commMult = hoursMult * 0.5 + monthsMult * 0.5;
    commLabel = commMult >= 0.8 ? 'High' : commMult >= 0.5 ? 'Medium' : 'Low';
    commReason = `Your commitment of ${hours} hrs/wk for ${months}+ months provides good stability.`;
  }
  const commPoints = Math.round(commMult * weights.commitment);
  breakdown.commitment = { weight: weights.commitment, points: commPoints, label: commLabel };
  reasons.push(commReason);

  // 4. industryExperience (10)
  const candInd = (candidate.profile?.industry || '').trim().toLowerCase();
  const reqInd = (requirement.industry || '').trim().toLowerCase();

  let indMult = MATCH_CONFIG.neutralFallbackMultiplier;
  let indLabel: ComponentLabel = 'Medium';
  let indReason = `Industry background not specified.`;

  if (reqInd) {
    const sameIndustry = Boolean(candInd && candInd === reqInd);
    const baseScore = sameIndustry
      ? MATCH_CONFIG.industryExperience.sameIndustryBase
      : MATCH_CONFIG.industryExperience.differentIndustryBase;
    const hasPrev = candidate.profile?.previousStartup === true;
    const bonus = hasPrev ? MATCH_CONFIG.industryExperience.previousStartupBonus : 0.0;
    indMult = Math.min(1.0, baseScore + bonus);
    indLabel = indMult >= 0.8 ? 'High' : indMult >= 0.5 ? 'Medium' : 'Low';

    if (sameIndustry) {
      indReason = `Relevant industry background in ${requirement.industry}.`;
    } else if (hasPrev) {
      indReason = `Previous startup experience adds valuable insight.`;
    } else {
      indReason = `Different industry background (${candidate.profile?.industry || 'other'}).`;
    }
  }
  const indPoints = Math.round(indMult * weights.industryExperience);
  breakdown.industryExperience = { weight: weights.industryExperience, points: indPoints, label: indLabel };
  reasons.push(indReason);

  // 5. stage (10)
  const expYears = candidate.profile?.experienceYears ?? 0;
  const prevStartup = candidate.profile?.previousStartup === true;
  const reqStage = (requirement.stage || '').toUpperCase();

  let stageMult = 0.5;
  if (reqStage === 'IDEA') {
    stageMult = 1.0;
  } else if (reqStage === 'MVP') {
    stageMult = expYears >= 1 || prevStartup ? 1.0 : 0.5;
  } else if (reqStage === 'EARLY_TRACTION') {
    stageMult = expYears >= 3 || prevStartup ? 1.0 : expYears >= 1 ? 0.6 : 0.3;
  } else if (reqStage === 'GROWTH') {
    stageMult = expYears >= 5 || (prevStartup && expYears >= 2) ? 1.0 : expYears >= 3 ? 0.6 : 0.2;
  }
  const stageLabel: ComponentLabel = stageMult >= 0.8 ? 'High' : stageMult >= 0.5 ? 'Medium' : 'Low';
  const stageReason = `Your experience level (${expYears} yrs) aligns with the ${requirement.stage} stage.`;
  const stagePoints = Math.round(stageMult * weights.stage);
  breakdown.stage = { weight: weights.stage, points: stagePoints, label: stageLabel };
  reasons.push(stageReason);

  // 6. equityCompensation (10)
  const candEquity = candidate.commitment?.equityExpectation;
  const reqEquityMax = requirement.equityOfferMax;

  let eqMult = MATCH_CONFIG.equityGap.missingOwnerNeutral;
  let eqLabel: ComponentLabel = 'Needs discussion';
  let eqReason = `Founder's equity offer limit is not specified; needs discussion.`;

  if (candEquity != null && reqEquityMax != null) {
    if (candEquity <= reqEquityMax) {
      eqMult = MATCH_CONFIG.equityGap.highMultiplier; // 1.0
      eqLabel = 'High';
      eqReason = `You expect ${candEquity}% and the founder offers up to ${reqEquityMax}%.`;
    } else {
      const diff = candEquity - reqEquityMax;
      if (diff <= MATCH_CONFIG.equityGap.discussionMax) { // <= 10
        eqMult = MATCH_CONFIG.equityGap.partialMultiplier; // 0.5
        eqLabel = 'Needs discussion';
        eqReason = `You expect ${candEquity}% equity, which is slightly above the max offered (${reqEquityMax}%).`;
      } else { // > 10
        eqMult = MATCH_CONFIG.equityGap.lowMultiplier; // 0.0
        eqLabel = 'Low';
        eqReason = `You expect ${candEquity}% equity, significantly above the max offered (${reqEquityMax}%).`;
      }
    }
  }
  const eqPoints = Math.round(eqMult * weights.equityCompensation);
  breakdown.equityCompensation = { weight: weights.equityCompensation, points: eqPoints, label: eqLabel };
  reasons.push(eqReason);

  // 7. location (5)
  const reqRemote = requirement.remote === true;
  const candCityNorm = normalizeCity(candidate.profile?.city);
  const reqLocNorm = normalizeCity(requirement.location);
  const ownerCityNorm = normalizeCity(owner.profile?.city);

  const sameCity = Boolean(candCityNorm && (candCityNorm === reqLocNorm || candCityNorm === ownerCityNorm));

  let locMult = MATCH_CONFIG.location.lowMultiplier; // 0.0
  let locLabel: ComponentLabel = 'Low';
  let locReason = `This is an onsite role in ${requirement.location || owner.profile?.city || 'specified location'} and you are in ${candidate.profile?.city || 'another city'}.`;

  if (reqRemote) {
    locMult = MATCH_CONFIG.location.highMultiplier; // 1.0
    locLabel = 'High';
    locReason = 'Remote role, location is not a constraint.';
  } else if (sameCity) {
    locMult = MATCH_CONFIG.location.highMultiplier; // 1.0
    locLabel = 'High';
    locReason = `Onsite/hybrid role in ${requirement.location || owner.profile?.city || 'matching city'}, matching your location.`;
  }
  const locPoints = Math.round(locMult * weights.location);
  breakdown.location = { weight: weights.location, points: locPoints, label: locLabel };
  reasons.push(locReason);

  // 8. preferences (5)
  const prefMult = MATCH_CONFIG.preferencesDefaultScore; // 0.5 neutral placeholder
  const prefPoints = Math.round(prefMult * weights.preferences);
  breakdown.preferences = {
    weight: weights.preferences,
    points: prefPoints,
    label: 'Medium',
  };
  reasons.push('Default preference score (placeholder until preference data exists).');

  // Sum component points
  const totalScore = Math.min(
    100,
    Math.max(
      0,
      Object.values(breakdown).reduce((sum, item) => sum + item.points, 0),
    ),
  );

  return {
    score: totalScore,
    breakdown,
    reasons,
  };
};
