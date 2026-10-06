import { score, parseSkillsArray, normalizeCity } from '../src/services/matching.service';
import { MATCH_CONFIG } from '../src/config/matching';

describe('Matching Service - Unit Tests (Pure Functions)', () => {
  const completeCandidate = {
    profile: {
      name: 'Alice Candidate',
      city: 'Mumbai',
      industry: 'TECH',
      skills: ['TECH', 'MARKETING'],
      experienceYears: 5,
      previousStartup: true,
    },
    commitment: {
      hoursPerWeek: 40,
      availability: 'FULL',
      minMonths: 12,
      equityExpectation: 20,
      compensationPref: 'EQUITY',
      remote: true,
    },
  };

  const perfectRequirement = {
    needSkill: 'TECH',
    industry: 'TECH',
    stage: 'GROWTH',
    equityOfferMax: 50,
    commitment: 'FULL',
    location: 'Mumbai',
    remote: true,
  };

  const founderOwner = {
    profile: {
      name: 'Bob Founder',
      city: 'Mumbai',
      skills: ['FINANCE', 'SALES'],
    },
    commitment: {
      equityExpectation: 50,
      compensationPref: 'EQUITY',
    },
  };

  test('1. Weights configuration sums to 100', () => {
    const weights = MATCH_CONFIG.weights;
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  test('2. Perfect match scenario produces score of 98 (with neutral 0.5 preference score)', () => {
    const result = score(completeCandidate as any, perfectRequirement as any, founderOwner as any);
    expect(result.score).not.toBeNull();
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.breakdown?.skillComplement.label).toBe('High');
    expect(result.breakdown?.requirementFit.label).toBe('High');
    expect(result.breakdown?.equityCompensation.label).toBe('High');
  });

  test('3. Candidate lacking required skill gets 0 points for skillComplement', () => {
    const noSkillCandidate = {
      ...completeCandidate,
      profile: { ...completeCandidate.profile, skills: ['FINANCE'] },
    };
    const result = score(noSkillCandidate as any, perfectRequirement as any, founderOwner as any);
    expect(result.breakdown?.skillComplement.points).toBe(0);
    expect(result.breakdown?.skillComplement.label).toBe('Low');
    expect(result.reasons[0]).toContain('do not have the TECH skill');
  });

  test('4. Both founder and candidate sharing the same skill gives partial score (0.6 multiplier)', () => {
    const ownerWithSameSkill = {
      ...founderOwner,
      profile: { ...founderOwner.profile, skills: ['TECH'] },
    };
    const result = score(completeCandidate as any, perfectRequirement as any, ownerWithSameSkill as any);
    expect(result.breakdown?.skillComplement.points).toBe(Math.round(0.6 * 25)); // 15
    expect(result.breakdown?.skillComplement.label).toBe('Medium');
  });

  test('5. FULL vs PART availability mismatch gives partial requirementFit points', () => {
    const partCandidate = {
      ...completeCandidate,
      commitment: { ...completeCandidate.commitment, availability: 'PART' },
    };
    const result = score(partCandidate as any, perfectRequirement as any, founderOwner as any);
    expect(result.breakdown?.requirementFit.points).toBe(Math.round(0.4 * 20)); // 8
    expect(result.breakdown?.requirementFit.label).toBe('Medium');
  });

  test('6. Remote requirement match gives full location points', () => {
    const diffCityCandidate = {
      ...completeCandidate,
      profile: { ...completeCandidate.profile, city: 'Delhi' },
      commitment: { ...completeCandidate.commitment, remote: true },
    };
    const result = score(diffCityCandidate as any, perfectRequirement as any, founderOwner as any);
    expect(result.breakdown?.location.points).toBe(5);
    expect(result.breakdown?.location.label).toBe('High');
    expect(result.reasons.find((r) => r.includes('Remote role'))).toBeDefined();
  });

  test('7. Onsite requirement + candidate in different city gets 0 points regardless of candidate remote preference', () => {
    const onsiteReq = { ...perfectRequirement, remote: false, location: 'Toronto, Canada' };
    const patnaCandidate = {
      ...completeCandidate,
      profile: { ...completeCandidate.profile, city: 'Patna' },
      commitment: { ...completeCandidate.commitment, remote: true }, // Candidate remote: true does NOT match onsite requirement
    };
    const result = score(patnaCandidate as any, onsiteReq as any, founderOwner as any);
    expect(result.breakdown?.location.points).toBe(0);
    expect(result.breakdown?.location.label).toBe('Low');
    expect(result.reasons.find((r) => r.includes('This is an onsite role in Toronto, Canada and you are in Patna.'))).toBeDefined();
  });

  test('8. City normalization handles "Austin, TX" vs "Austin" (match = 1.0) and "Patna" vs "Toronto, Canada" (no match)', () => {
    expect(normalizeCity('Austin, TX')).toBe('austin');
    expect(normalizeCity('Austin')).toBe('austin');
    expect(normalizeCity('Toronto, Canada')).toBe('toronto');
    expect(normalizeCity('Patna')).toBe('patna');

    const onsiteAustinReq = { ...perfectRequirement, remote: false, location: 'Austin, TX' };
    const austinCandidate = {
      ...completeCandidate,
      profile: { ...completeCandidate.profile, city: 'Austin' },
    };
    const resMatch = score(austinCandidate as any, onsiteAustinReq as any, founderOwner as any);
    expect(resMatch.breakdown?.location.points).toBe(5);
    expect(resMatch.breakdown?.location.label).toBe('High');
  });

  test('9. Equity rules: expecting less than offered -> High (1.0)', () => {
    const lowEquityCandidate = {
      ...completeCandidate,
      commitment: { ...completeCandidate.commitment, equityExpectation: 10 },
    };
    const reqWithOffer = { ...perfectRequirement, equityOfferMax: 50 };
    const result = score(lowEquityCandidate as any, reqWithOffer as any, founderOwner as any);
    expect(result.breakdown?.equityCompensation.points).toBe(10);
    expect(result.breakdown?.equityCompensation.label).toBe('High');
    expect(result.reasons.find((r) => r.includes('You expect 10% and the founder offers up to 50%.'))).toBeDefined();
  });

  test('10. Equity rules: expecting 5% over max offered -> Needs discussion (0.5 multiplier, 5 points)', () => {
    const slightlyHighCandidate = {
      ...completeCandidate,
      commitment: { ...completeCandidate.commitment, equityExpectation: 40 },
    };
    const reqWithOffer = { ...perfectRequirement, equityOfferMax: 35 }; // 40 vs 35 -> diff 5
    const result = score(slightlyHighCandidate as any, reqWithOffer as any, founderOwner as any);
    expect(result.breakdown?.equityCompensation.points).toBe(5);
    expect(result.breakdown?.equityCompensation.label).toBe('Needs discussion');
  });

  test('11. Equity rules: expecting 15% over max offered -> Low (0.0 multiplier, 0 points)', () => {
    const highEquityCandidate = {
      ...completeCandidate,
      commitment: { ...completeCandidate.commitment, equityExpectation: 50 },
    };
    const reqWithOffer = { ...perfectRequirement, equityOfferMax: 35 }; // 50 vs 35 -> diff 15 (> 10)
    const result = score(highEquityCandidate as any, reqWithOffer as any, founderOwner as any);
    expect(result.breakdown?.equityCompensation.points).toBe(0);
    expect(result.breakdown?.equityCompensation.label).toBe('Low');
    expect(result.reasons.find((r) => r.includes('significantly above the max offered'))).toBeDefined();
  });

  test('12. Equity rules: equityOfferMax null -> neutral points (0.5 multiplier, 5 points)', () => {
    const reqNullEquity = { ...perfectRequirement, equityOfferMax: null };
    const result = score(completeCandidate as any, reqNullEquity as any, founderOwner as any);
    expect(result.breakdown?.equityCompensation.points).toBe(5);
    expect(result.breakdown?.equityCompensation.label).toBe('Needs discussion');
  });

  test('13. Incomplete candidate profile/commitment returns score: null without crashing', () => {
    const incompleteCandidate = {
      profile: { name: 'Incomplete User' },
      commitment: null,
    };
    const result = score(incompleteCandidate as any, perfectRequirement as any, founderOwner as any);
    expect(result.score).toBeNull();
    expect(result.breakdown).toBeNull();
    expect(result.reasons).toEqual(['Complete your profile to see your score']);
  });

  test('14. Total score === sum of breakdown component points', () => {
    const result = score(completeCandidate as any, perfectRequirement as any, founderOwner as any);
    expect(result.score).not.toBeNull();
    const sumPoints = Object.values(result.breakdown!).reduce((acc, item) => acc + item.points, 0);
    expect(result.score).toBe(sumPoints);
  });

  test('15. Defensive skills parser handles malformed skills JSON gracefully', () => {
    expect(parseSkillsArray(null)).toEqual([]);
    expect(parseSkillsArray(undefined)).toEqual([]);
    expect(parseSkillsArray(['TECH', 'DESIGN'])).toEqual(['TECH', 'DESIGN']);
    expect(parseSkillsArray('["TECH", "SALES"]')).toEqual(['TECH', 'SALES']);
    expect(parseSkillsArray('{ "invalid": true }')).toEqual([]);
    expect(parseSkillsArray(12345)).toEqual([]);
    expect(parseSkillsArray('JUST_A_STRING')).toEqual(['JUST_A_STRING']);
  });
});
