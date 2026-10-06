import { validateTransition, InterestAction, ActorRole } from '../src/config/interestTransitions';
import { InterestStatus } from '@prisma/client';

describe('Interest State Machine Matrix - Unit Tests', () => {
  type TestCases = Array<{
    currentStatus: InterestStatus;
    action: InterestAction;
    actorRole: ActorRole;
    expectedValid: boolean;
    expectedTargetStatus?: InterestStatus;
  }>;

  const table: TestCases = [
    // Owner Actions
    { currentStatus: 'PENDING', action: 'accept', actorRole: 'owner', expectedValid: true, expectedTargetStatus: 'ACCEPTED' },
    { currentStatus: 'PENDING', action: 'later', actorRole: 'owner', expectedValid: true, expectedTargetStatus: 'LATER' },
    { currentStatus: 'PENDING', action: 'decline', actorRole: 'owner', expectedValid: true, expectedTargetStatus: 'DECLINED' },
    { currentStatus: 'LATER', action: 'accept', actorRole: 'owner', expectedValid: true, expectedTargetStatus: 'ACCEPTED' },
    { currentStatus: 'LATER', action: 'decline', actorRole: 'owner', expectedValid: true, expectedTargetStatus: 'DECLINED' },

    // Candidate Actions
    { currentStatus: 'PENDING', action: 'withdraw', actorRole: 'candidate', expectedValid: true, expectedTargetStatus: 'WITHDRAWN' },
    { currentStatus: 'LATER', action: 'withdraw', actorRole: 'candidate', expectedValid: true, expectedTargetStatus: 'WITHDRAWN' },

    // Illegal: Candidate trying Owner actions
    { currentStatus: 'PENDING', action: 'accept', actorRole: 'candidate', expectedValid: false },
    { currentStatus: 'PENDING', action: 'later', actorRole: 'candidate', expectedValid: false },
    { currentStatus: 'PENDING', action: 'decline', actorRole: 'candidate', expectedValid: false },

    // Illegal: Owner trying Candidate actions
    { currentStatus: 'PENDING', action: 'withdraw', actorRole: 'owner', expectedValid: false },

    // Illegal: Invalid transitions from LATER
    { currentStatus: 'LATER', action: 'later', actorRole: 'owner', expectedValid: false },

    // Illegal: Terminal states (ACCEPTED, DECLINED, WITHDRAWN) cannot transition
    { currentStatus: 'ACCEPTED', action: 'accept', actorRole: 'owner', expectedValid: false },
    { currentStatus: 'ACCEPTED', action: 'withdraw', actorRole: 'candidate', expectedValid: false },
    { currentStatus: 'DECLINED', action: 'accept', actorRole: 'owner', expectedValid: false },
    { currentStatus: 'DECLINED', action: 'withdraw', actorRole: 'candidate', expectedValid: false },
    { currentStatus: 'WITHDRAWN', action: 'accept', actorRole: 'owner', expectedValid: false },
    { currentStatus: 'WITHDRAWN', action: 'withdraw', actorRole: 'candidate', expectedValid: false },
  ];

  test.each(table)(
    '$currentStatus + $action by $actorRole -> valid: $expectedValid',
    ({ currentStatus, action, actorRole, expectedValid, expectedTargetStatus }) => {
      const res = validateTransition(currentStatus, action, actorRole);
      expect(res.valid).toBe(expectedValid);
      if (expectedValid) {
        expect(res.targetStatus).toBe(expectedTargetStatus);
      }
    },
  );
});
