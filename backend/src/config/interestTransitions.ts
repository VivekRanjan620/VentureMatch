import { InterestStatus } from '@prisma/client';

export type InterestAction = 'accept' | 'later' | 'decline' | 'withdraw';
export type ActorRole = 'owner' | 'candidate';

export interface TransitionRule {
  allowedActor: ActorRole;
  fromStatus: InterestStatus[];
  toStatus: InterestStatus;
}

export const INTEREST_TRANSITION_MATRIX: Record<InterestAction, TransitionRule> = {
  accept: {
    allowedActor: 'owner',
    fromStatus: ['PENDING', 'LATER'],
    toStatus: 'ACCEPTED',
  },
  later: {
    allowedActor: 'owner',
    fromStatus: ['PENDING'],
    toStatus: 'LATER',
  },
  decline: {
    allowedActor: 'owner',
    fromStatus: ['PENDING', 'LATER'],
    toStatus: 'DECLINED',
  },
  withdraw: {
    allowedActor: 'candidate',
    fromStatus: ['PENDING', 'LATER'],
    toStatus: 'WITHDRAWN',
  },
};

export const TERMINAL_STATUSES: InterestStatus[] = ['ACCEPTED', 'DECLINED', 'WITHDRAWN'];

export const validateTransition = (
  currentStatus: InterestStatus,
  action: InterestAction,
  actorRole: ActorRole,
): { valid: boolean; targetStatus?: InterestStatus; reason?: string } => {
  const rule = INTEREST_TRANSITION_MATRIX[action];
  if (!rule) {
    return { valid: false, reason: 'Unknown action' };
  }

  if (rule.allowedActor !== actorRole) {
    return { valid: false, reason: `Action '${action}' can only be performed by ${rule.allowedActor}` };
  }

  if (!rule.fromStatus.includes(currentStatus)) {
    return { valid: false, reason: `Cannot perform action '${action}' on interest in '${currentStatus}' status` };
  }

  return { valid: true, targetStatus: rule.toStatus };
};
