import type { EventSettings } from '../../types/entities';

export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const EVENT_RULE_LIMITS = {
  MIN_CAPACITY: 5,
  MAX_CAPACITY: 1000,
  MIN_DURATION_MS: DAY_IN_MS,
  MAX_DURATION_MS: 7 * DAY_IN_MS,
  MIN_VOTING_ROUNDS: 1,
  MAX_VOTING_ROUNDS: 10,
  MIN_TOPICS_PER_USER: 1,
  MAX_TOPICS_PER_USER: 20,
  MIN_VOTING_TIME_SECONDS: 60,
  MAX_VOTING_TIME_SECONDS: 60 * 60
} as const;

export const EVENT_RULE_DEFAULTS = {
  CAPACITY: 20,
  DURATION_MS: 3 * DAY_IN_MS,
  VOTING_ROUNDS: 1,
  MAX_TOPICS_PER_USER: 3,
  VOTING_TIME_SECONDS: 5 * 60,
  REQUIRE_REGISTRATION: false,
  ALLOW_GUEST_ACCESS: true
} as const;

export interface EventSettingsInput {
  allowGuestAccess?: boolean | null;
  votingRounds?: number | null;
  maxTopicsPerUser?: number | null;
  votingTimeLimit?: number | null;
  requireRegistration?: boolean | null;
}

export interface EventBusinessRuleInput {
  capacity?: number | null;
  durationMs?: number | null;
  currentParticipants?: number | null;
  settings?: EventSettingsInput | null;
  isPrivate?: boolean;
}

export interface EventBusinessRuleResult {
  isValid: boolean;
  errors: string[];
}

function normalizeInteger(value: number | null | undefined, fallback: number, min: number, max: number): number {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }

  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}

export function normalizeVotingTimeLimitSeconds(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return EVENT_RULE_DEFAULTS.VOTING_TIME_SECONDS;
  }

  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) {
    return EVENT_RULE_DEFAULTS.VOTING_TIME_SECONDS;
  }

  return Math.min(EVENT_RULE_LIMITS.MAX_VOTING_TIME_SECONDS, Math.max(EVENT_RULE_LIMITS.MIN_VOTING_TIME_SECONDS, numeric));
}

export function normalizeEventSettings(settings?: EventSettingsInput | null): Pick<EventSettings, 'allowGuestAccess' | 'maxTopicsPerUser' | 'votingTimeLimit' | 'requireRegistration'> & { votingRounds: number } {
  const allowGuestAccess = settings?.allowGuestAccess ?? EVENT_RULE_DEFAULTS.ALLOW_GUEST_ACCESS;
  const requireRegistration = settings?.requireRegistration ?? EVENT_RULE_DEFAULTS.REQUIRE_REGISTRATION;
  const maxTopicsPerUser = normalizeInteger(
    settings?.maxTopicsPerUser,
    EVENT_RULE_DEFAULTS.MAX_TOPICS_PER_USER,
    EVENT_RULE_LIMITS.MIN_TOPICS_PER_USER,
    EVENT_RULE_LIMITS.MAX_TOPICS_PER_USER
  );
  const votingRounds = normalizeInteger(
    settings?.votingRounds,
    EVENT_RULE_DEFAULTS.VOTING_ROUNDS,
    EVENT_RULE_LIMITS.MIN_VOTING_ROUNDS,
    EVENT_RULE_LIMITS.MAX_VOTING_ROUNDS
  );
  const votingTimeLimit = normalizeVotingTimeLimitSeconds(settings?.votingTimeLimit);

  return {
    allowGuestAccess,
    requireRegistration,
    maxTopicsPerUser,
    votingTimeLimit,
    votingRounds
  };
}

export function validateEventBusinessRules(input: EventBusinessRuleInput): EventBusinessRuleResult {
  const errors: string[] = [];
  const { capacity, durationMs, currentParticipants, settings, isPrivate } = input;

  if (capacity !== undefined && capacity !== null) {
    if (!Number.isFinite(capacity)) {
      errors.push('Capacity must be a valid number');
    } else if (!Number.isInteger(capacity)) {
      errors.push('Capacity must be a whole number');
    } else {
      if (capacity < EVENT_RULE_LIMITS.MIN_CAPACITY) {
        errors.push(`Capacity must be at least ${EVENT_RULE_LIMITS.MIN_CAPACITY} participants`);
      }
      if (capacity > EVENT_RULE_LIMITS.MAX_CAPACITY) {
        errors.push(`Capacity cannot exceed ${EVENT_RULE_LIMITS.MAX_CAPACITY} participants`);
      }
      if (currentParticipants !== undefined && currentParticipants !== null && Number.isFinite(currentParticipants)) {
        if (capacity < currentParticipants) {
          errors.push('Capacity cannot be less than the current number of participants');
        }
      }
    }
  }

  if (durationMs !== undefined && durationMs !== null) {
    if (!Number.isFinite(durationMs)) {
      errors.push('Duration must be a valid number of milliseconds');
    } else {
      if (durationMs < EVENT_RULE_LIMITS.MIN_DURATION_MS) {
        errors.push('Duration must be at least 1 day');
      }
      if (durationMs > EVENT_RULE_LIMITS.MAX_DURATION_MS) {
        errors.push('Duration cannot exceed 7 days');
      }
    }
  }

  if (settings) {
    const {
      votingRounds,
      maxTopicsPerUser,
      votingTimeLimit,
      allowGuestAccess,
      requireRegistration
    } = settings;

    if (votingRounds !== undefined && votingRounds !== null) {
      if (!Number.isFinite(votingRounds)) {
        errors.push('Voting rounds must be numeric');
      } else {
        if (votingRounds < EVENT_RULE_LIMITS.MIN_VOTING_ROUNDS) {
          errors.push(`Voting rounds must be at least ${EVENT_RULE_LIMITS.MIN_VOTING_ROUNDS}`);
        }
        if (votingRounds > EVENT_RULE_LIMITS.MAX_VOTING_ROUNDS) {
          errors.push(`Voting rounds cannot exceed ${EVENT_RULE_LIMITS.MAX_VOTING_ROUNDS}`);
        }
      }
    }

    if (maxTopicsPerUser !== undefined && maxTopicsPerUser !== null) {
      if (!Number.isFinite(maxTopicsPerUser)) {
        errors.push('Max topics per user must be numeric');
      } else {
        if (maxTopicsPerUser < EVENT_RULE_LIMITS.MIN_TOPICS_PER_USER) {
          errors.push(`Max topics per user must be at least ${EVENT_RULE_LIMITS.MIN_TOPICS_PER_USER}`);
        }
        if (maxTopicsPerUser > EVENT_RULE_LIMITS.MAX_TOPICS_PER_USER) {
          errors.push(`Max topics per user cannot exceed ${EVENT_RULE_LIMITS.MAX_TOPICS_PER_USER}`);
        }
      }
    }

    if (votingTimeLimit !== undefined && votingTimeLimit !== null) {
      if (!Number.isFinite(votingTimeLimit)) {
        errors.push('Voting time limit must be numeric');
      } else {
        if (votingTimeLimit < EVENT_RULE_LIMITS.MIN_VOTING_TIME_SECONDS) {
          errors.push(`Voting time limit must be at least ${EVENT_RULE_LIMITS.MIN_VOTING_TIME_SECONDS / 60} minute`);
        }
        if (votingTimeLimit > EVENT_RULE_LIMITS.MAX_VOTING_TIME_SECONDS) {
          errors.push(`Voting time limit cannot exceed ${EVENT_RULE_LIMITS.MAX_VOTING_TIME_SECONDS / 60} minutes`);
        }
      }
    }

    if (allowGuestAccess === true && requireRegistration === true) {
      errors.push('Guest access cannot be enabled when registration is required');
    }

    if (isPrivate && allowGuestAccess) {
      errors.push('Private events cannot allow guest access');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
