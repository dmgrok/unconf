import { describe, it, expect } from 'vitest';
import {
  validateEventBusinessRules,
  normalizeEventSettings,
  EVENT_RULE_LIMITS,
  EVENT_RULE_DEFAULTS
} from './eventRules';

describe('eventRules validation', () => {
  it('passes validation for well-formed input', () => {
    const result = validateEventBusinessRules({
      capacity: 100,
      durationMs: EVENT_RULE_DEFAULTS.DURATION_MS,
      currentParticipants: 20,
      settings: {
        allowGuestAccess: true,
        votingRounds: 3,
        maxTopicsPerUser: 6,
        votingTimeLimit: 300,
        requireRegistration: false
      },
      isPrivate: false
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when capacity is below minimum or below current participants', () => {
    const result = validateEventBusinessRules({
      capacity: EVENT_RULE_LIMITS.MIN_CAPACITY - 1,
      currentParticipants: 10
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`at least ${EVENT_RULE_LIMITS.MIN_CAPACITY}`),
        expect.stringContaining('cannot be less than the current number of participants')
      ])
    );
  });

  it('fails when duration exceeds the allowed maximum', () => {
    const result = validateEventBusinessRules({
      durationMs: EVENT_RULE_LIMITS.MAX_DURATION_MS + 1
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('cannot exceed 7 days')])
    );
  });

  it('flags invalid voting configuration combinations', () => {
    const result = validateEventBusinessRules({
      capacity: 50,
      currentParticipants: 25,
      settings: {
        allowGuestAccess: true,
        votingRounds: EVENT_RULE_LIMITS.MAX_VOTING_ROUNDS + 1,
        maxTopicsPerUser: EVENT_RULE_LIMITS.MAX_TOPICS_PER_USER + 1,
        votingTimeLimit: EVENT_RULE_LIMITS.MAX_VOTING_TIME_SECONDS + 1,
        requireRegistration: true
      },
      isPrivate: true
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('cannot exceed'),
        expect.stringContaining('Guest access cannot be enabled'),
        expect.stringContaining('Private events cannot allow guest access')
      ])
    );
  });

  it('normalizes event settings to safe defaults', () => {
    const normalized = normalizeEventSettings();

    expect(normalized.allowGuestAccess).toBe(EVENT_RULE_DEFAULTS.ALLOW_GUEST_ACCESS);
    expect(normalized.requireRegistration).toBe(EVENT_RULE_DEFAULTS.REQUIRE_REGISTRATION);
    expect(normalized.maxTopicsPerUser).toBe(EVENT_RULE_DEFAULTS.MAX_TOPICS_PER_USER);
    expect(normalized.votingTimeLimit).toBe(EVENT_RULE_DEFAULTS.VOTING_TIME_SECONDS);
    expect(normalized.votingRounds).toBe(EVENT_RULE_DEFAULTS.VOTING_ROUNDS);
  });
});
