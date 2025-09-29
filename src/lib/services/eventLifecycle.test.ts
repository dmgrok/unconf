import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventLifecycleManager } from './eventLifecycle';
import type { Event } from '../../types/entities';
import { EventStatus } from '../../types/enums';

// Mock the EventRepository
const mockRepository = {
  findActiveEvents: vi.fn(),
  findByStatus: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  updateStatus: vi.fn(),
  update: vi.fn()
};

vi.mock('../storage', () => {
  return {
    EventRepository: class {
      constructor() {
        return mockRepository;
      }
    }
  };
});

describe('EventLifecycleManager', () => {
  let lifecycleManager: EventLifecycleManager;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const mockEvent: Event = {
    id: 'event-1',
    title: 'Test Event',
    description: 'Test Description',
    status: EventStatus.ACTIVE,
    organizerId: 'org-1',
    maxParticipants: 50,
    accessCode: 'TEST123',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T18:00:00Z'),
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
      maxTopicsPerUser: 3,
      autoAdvanceActivities: false
    },
    metadata: {
      participantCount: 10,
      topicCount: 5,
      voteCount: 20,
      votingRounds: 1,
      durationMs: 8 * 60 * 60 * 1000, // 8 hours
      durationDays: 0.33,
      isPrivate: false
    },
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    lifecycleManager = new EventLifecycleManager({
      dataDir: './test-data',
      enableBackups: false,
      backupRetention: 5,
      autoTransitionInterval: 1000, // 1 second for testing
      cleanupInterval: 2000, // 2 seconds for testing
      eventExpirationDays: 30
    });

    // Setup default mock responses
    mockRepository.findActiveEvents.mockResolvedValue({
      success: true,
      data: [mockEvent]
    });
    mockRepository.findByStatus.mockResolvedValue({
      success: true,
      data: []
    });
    mockRepository.findAll.mockResolvedValue({
      success: true,
      data: [mockEvent]
    });
    mockRepository.findById.mockResolvedValue({
      success: true,
      data: mockEvent
    });
    mockRepository.updateStatus.mockResolvedValue({
      success: true,
      data: { ...mockEvent, status: EventStatus.COMPLETED }
    });
    mockRepository.update.mockResolvedValue({
      success: true,
      data: mockEvent
    });
  });

  afterEach(async () => {
    if (lifecycleManager.isManagerRunning()) {
      await lifecycleManager.stop();
    }
    consoleSpy.mockRestore();
  });

  describe('Initialization and Control', () => {
    it('should initialize with correct configuration', () => {
      expect(lifecycleManager.isManagerRunning()).toBe(false);
    });

    it('should start and stop the manager', async () => {
      expect(lifecycleManager.isManagerRunning()).toBe(false);
      
      await lifecycleManager.start();
      expect(lifecycleManager.isManagerRunning()).toBe(true);
      
      await lifecycleManager.stop();
      expect(lifecycleManager.isManagerRunning()).toBe(false);
    });

    it('should not allow starting when already running', async () => {
      await lifecycleManager.start();
      
      await expect(lifecycleManager.start()).rejects.toThrow('already running');
    });

    it('should allow stopping when not running', async () => {
      await expect(lifecycleManager.stop()).resolves.not.toThrow();
    });
  });

  describe('Metrics', () => {
    it('should provide initial metrics', () => {
      const metrics = lifecycleManager.getMetrics();
      
      expect(metrics).toEqual({
        totalEvents: 0,
        activeEvents: 0,
        completedEvents: 0,
        draftEvents: 0,
        pausedEvents: 0,
        eventsProcessed: 0,
        transitionsExecuted: 0,
        cleanupActions: 0,
        errors: 0,
        lastProcessingTime: null
      });
    });

    it('should update metrics after processing', async () => {
      await lifecycleManager.forceProcessing();
      
      const metrics = lifecycleManager.getMetrics();
      expect(metrics.eventsProcessed).toBeGreaterThan(0);
      expect(metrics.lastProcessingTime).not.toBeNull();
    });
  });

  describe('Event Health Monitoring', () => {
    it('should return event health for existing event', async () => {
      const health = await lifecycleManager.getEventHealth('event-1');
      
      expect(health).not.toBeNull();
      expect(health?.eventId).toBe('event-1');
      expect(health?.status).toBe(EventStatus.ACTIVE);
      expect(health?.participantCount).toBe(10);
      expect(health?.activityCount).toBe(5);
    });

    it('should return null for non-existent event', async () => {
      mockRepository.findById.mockResolvedValue({
        success: false,
        error: { message: 'Not found' }
      });

      const health = await lifecycleManager.getEventHealth('non-existent');
      expect(health).toBeNull();
    });

    it('should detect health issues for inactive events', async () => {
      const staleEvent = {
        ...mockEvent,
        updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      mockRepository.findById.mockResolvedValue({
        success: true,
        data: staleEvent
      });

      const health = await lifecycleManager.getEventHealth('event-1');
      
      expect(health?.health).toBe('critical');
      expect(health?.issues).toContain('No activity for over 24 hours');
    });

    it('should detect events exceeding planned end time', async () => {
      const overdueEvent = {
        ...mockEvent,
        endTime: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      };

      mockRepository.findById.mockResolvedValue({
        success: true,
        data: overdueEvent
      });

      const health = await lifecycleManager.getEventHealth('event-1');
      
      expect(health?.health).toBe('critical');
      expect(health?.issues).toContain('Event has exceeded planned end time');
    });

    it('should detect active events with no participants', async () => {
      const emptyEvent = {
        ...mockEvent,
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours in the future
        updatedAt: new Date(), // Set to now to avoid inactivity issues
        metadata: {
          ...mockEvent.metadata,
          participantCount: 0
        }
      };

      mockRepository.findById.mockResolvedValue({
        success: true,
        data: emptyEvent
      });

      const health = await lifecycleManager.getEventHealth('event-1');
      
      expect(health?.health).toBe('warning');
      expect(health?.issues).toContain('No participants in active event');
    });
  });

  describe('Automatic Transitions', () => {
    it('should auto-complete events past end time', async () => {
      const expiredEvent = {
        ...mockEvent,
        endTime: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      };

      mockRepository.findActiveEvents.mockResolvedValue({
        success: true,
        data: [expiredEvent]
      });

      await lifecycleManager.forceProcessing();

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('event-1', EventStatus.COMPLETED);
      expect(mockRepository.update).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({
          currentActivity: undefined,
          endTime: expect.any(Date)
        })
      );
    });

    it('should auto-pause inactive events', async () => {
      const inactiveEvent = {
        ...mockEvent,
        endTime: undefined, // Remove endTime so it doesn't get auto-completed instead
        updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      mockRepository.findActiveEvents.mockResolvedValue({
        success: true,
        data: [inactiveEvent]
      });

      await lifecycleManager.forceProcessing();

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('event-1', EventStatus.PAUSED);
    });

    it('should auto-complete long-paused events', async () => {
      const longPausedEvent = {
        ...mockEvent,
        status: EventStatus.PAUSED,
        updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
      };

      mockRepository.findByStatus.mockResolvedValue({
        success: true,
        data: [longPausedEvent]
      });

      await lifecycleManager.forceProcessing();

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('event-1', EventStatus.COMPLETED);
      expect(mockRepository.update).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({
          endTime: expect.any(Date)
        })
      );
    });
  });

  describe('Cleanup Operations', () => {
    it('should archive old completed events', async () => {
      const oldCompletedEvent = {
        ...mockEvent,
        status: EventStatus.COMPLETED,
        endTime: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) // 31 days ago
      };

      mockRepository.findAll.mockResolvedValue({
        success: true,
        data: [oldCompletedEvent]
      });

      await lifecycleManager.forceProcessing();

      expect(mockRepository.update).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            archived: true,
            archivedAt: expect.any(String)
          })
        })
      );
    });

    it('should mark stale draft events', async () => {
      const staleDraftEvent = {
        ...mockEvent,
        status: EventStatus.DRAFT,
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) // 31 days ago
      };

      mockRepository.findAll.mockResolvedValue({
        success: true,
        data: [staleDraftEvent]
      });

      await lifecycleManager.forceProcessing();

      expect(mockRepository.update).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            stale: true,
            markedStaleAt: expect.any(String)
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.findActiveEvents.mockResolvedValue({
        success: false,
        error: { message: 'Database error' }
      });

      await lifecycleManager.forceProcessing();

      const metrics = lifecycleManager.getMetrics();
      expect(metrics.errors).toBeGreaterThan(0);
    });

    it('should handle transition errors', async () => {
      mockRepository.updateStatus.mockResolvedValue({
        success: false,
        error: { message: 'Update failed' }
      });

      const expiredEvent = {
        ...mockEvent,
        endTime: new Date(Date.now() - 60 * 60 * 1000)
      };

      mockRepository.findActiveEvents.mockResolvedValue({
        success: true,
        data: [expiredEvent]
      });

      await lifecycleManager.forceProcessing();

      const metrics = lifecycleManager.getMetrics();
      expect(metrics.errors).toBeGreaterThan(0);
    });
  });
});