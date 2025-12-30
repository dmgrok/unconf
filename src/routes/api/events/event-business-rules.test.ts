import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DAY_IN_MS } from '$lib/validation/eventRules';
import type { Event } from '../../../types/entities';

const mockRepository = vi.hoisted(() => ({
  generateUniqueAccessCode: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByAccessCode: vi.fn(),
  findByOrganizer: vi.fn(),
  findActiveEvents: vi.fn(),
  updateStatus: vi.fn()
}));

vi.mock('$lib/storage', () => {
  return {
    EventRepository: class {
      constructor() {
        return mockRepository;
      }
    }
  };
});

let POST: (args: { request: Request }) => Promise<Response>;
let PUT: (args: { params: { eventId: string }; request: Request }) => Promise<Response>;

const baseEvent = (): Event => ({
  id: 'evt-1',
  title: 'Existing Event',
  description: 'Existing description',
  slug: 'existing-event',
  status: 'draft',
  organizerId: 'org-1',
  maxParticipants: 80,
  accessCode: 'ACCESS123',
  startTime: undefined,
  endTime: undefined,
  currentActivity: undefined,
  settings: {
    allowGuestAccess: true,
    requireRegistration: false,
    enableVoting: true,
    enableGroupIntelligence: false,
    enableDiscussionGroups: false,
    enableTeamDistribution: false,
    votingTimeLimit: 300,
    maxVotesPerTopic: 1,
    maxTopicsPerUser: 5,
    autoAdvanceActivities: false
  },
  metadata: {
    participantCount: 25,
    topicCount: 10,
    voteCount: 40,
    votingRounds: 2,
    durationMs: 3 * DAY_IN_MS,
    durationDays: 3,
    isPrivate: false
  },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z')
});

beforeAll(async () => {
  ({ POST } = await import('./+server'));
  ({ PUT } = await import('./[eventId]/+server'));
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRepository.generateUniqueAccessCode.mockResolvedValue('NEWCODE01');
  mockRepository.create.mockResolvedValue({ success: true, data: baseEvent() });
  mockRepository.findById.mockResolvedValue({ success: true, data: baseEvent() });
  mockRepository.update.mockResolvedValue({ success: true, data: baseEvent() });
});

describe('Event API business rules', () => {
  it('creates an event when business rules are satisfied', async () => {
    const payload = {
      title: 'Strategy Summit',
      description: 'Annual planning event',
      duration: 3 * DAY_IN_MS,
      capacity: 100,
      organizerId: 'org-1',
      organizerName: 'Organizer One',
      settings: {
        allowGuestAccess: false,
        votingRounds: 4,
        maxTopicsPerUser: 6,
        votingTimeLimit: 900,
        requireRegistration: true
      }
    };

    const response = await POST({
      request: new Request('http://localhost/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);

    expect(mockRepository.create).toHaveBeenCalledTimes(1);
    const createdEvent = mockRepository.create.mock.calls[0][0];
    expect(createdEvent.maxParticipants).toBe(100);
    expect(createdEvent.settings.votingTimeLimit).toBe(900);
    expect(createdEvent.metadata?.durationMs).toBe(payload.duration);
    expect(createdEvent.metadata?.isPrivate).toBe(true);
    expect(createdEvent.metadata?.votingRounds).toBe(4);
  });

  it('rejects event creation that violates business rules', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Invalid Event',
          duration: 2 * DAY_IN_MS,
          capacity: 25,
          organizerId: 'org-1',
          organizerName: 'Organizer One',
          settings: {
            allowGuestAccess: true,
            votingRounds: 2,
            maxTopicsPerUser: 5,
            votingTimeLimit: 300,
            requireRegistration: true
          }
        })
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.details).toEqual(
      expect.arrayContaining([expect.stringContaining('Guest access cannot be enabled when registration is required')])
    );
    expect(mockRepository.create).not.toHaveBeenCalled();
  expect(mockRepository.generateUniqueAccessCode).not.toHaveBeenCalled();
  });

  it('rejects event updates that reduce capacity below participant count', async () => {
    const response = await PUT({
      params: { eventId: 'evt-1' },
      request: new Request('http://localhost/api/events/evt-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ maxParticipants: 10 })
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.details).toEqual(expect.arrayContaining([expect.stringContaining('current number of participants')]));
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('updates event settings when they remain within constraints', async () => {
    const response = await PUT({
      params: { eventId: 'evt-1' },
      request: new Request('http://localhost/api/events/evt-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          maxParticipants: 120,
          settings: {
            allowGuestAccess: false,
            votingTimeLimit: 600,
            maxTopicsPerUser: 8
          }
        })
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

  expect(mockRepository.update).toHaveBeenCalledTimes(1);
    const updatePayload = mockRepository.update.mock.calls[0][1];
    expect(updatePayload.maxParticipants).toBe(120);
    expect(updatePayload.settings?.allowGuestAccess).toBe(false);
    expect(updatePayload.settings?.votingTimeLimit).toBe(600);
    expect(updatePayload.metadata?.isPrivate).toBe(true);
  });
});
