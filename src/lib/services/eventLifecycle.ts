import type { Event } from '../../types/entities';
import { EventStatus } from '../../types/enums';
import { EventRepository } from '../storage';

export interface EventLifecycleConfig {
  dataDir: string;
  enableBackups: boolean;
  backupRetention: number;
  autoTransitionInterval: number; // in milliseconds
  cleanupInterval: number; // in milliseconds
  eventExpirationDays: number;
}

export interface EventTransitionRule {
  from: EventStatus;
  to: EventStatus;
  condition: (event: Event) => boolean;
  action?: (event: Event) => Promise<void>;
}

export interface EventCleanupRule {
  condition: (event: Event) => boolean;
  action: (event: Event) => Promise<void>;
  description: string;
}

export interface EventHealthMetrics {
  eventId: string;
  status: EventStatus;
  health: 'healthy' | 'warning' | 'critical';
  issues: string[];
  participantCount: number;
  activityCount: number;
  lastActivity: Date | null;
  uptime: number; // in milliseconds
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecycleMetrics {
  totalEvents: number;
  activeEvents: number;
  completedEvents: number;
  draftEvents: number;
  pausedEvents: number;
  eventsProcessed: number;
  transitionsExecuted: number;
  cleanupActions: number;
  errors: number;
  lastProcessingTime: Date | null;
}

export class EventLifecycleManager {
  private eventRepository: EventRepository;
  private config: EventLifecycleConfig;
  private isRunning = false;
  private transitionTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private metrics: LifecycleMetrics = {
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
  };

  constructor(config: EventLifecycleConfig) {
    this.config = config;
    this.eventRepository = new EventRepository({
      dataDir: config.dataDir,
      enableBackups: config.enableBackups,
      backupRetention: config.backupRetention
    });
  }

  /**
   * Start the lifecycle management system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('EventLifecycleManager is already running');
    }

    this.isRunning = true;
    console.log('Starting Event Lifecycle Manager...');

    // Start periodic transition checking
    this.transitionTimer = setInterval(
      () => this.processTransitions(),
      this.config.autoTransitionInterval
    );

    // Start periodic cleanup
    this.cleanupTimer = setInterval(
      () => this.processCleanup(),
      this.config.cleanupInterval
    );

    // Run initial processing
    await this.processTransitions();
    await this.processCleanup();

    console.log('Event Lifecycle Manager started successfully');
  }

  /**
   * Stop the lifecycle management system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping Event Lifecycle Manager...');
    this.isRunning = false;

    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    console.log('Event Lifecycle Manager stopped');
  }

  /**
   * Get default transition rules
   */
  private getTransitionRules(): EventTransitionRule[] {
    const now = new Date();

    return [
      // Auto-complete events that have exceeded their planned duration
      {
        from: EventStatus.ACTIVE,
        to: EventStatus.COMPLETED,
        condition: (event: Event) => {
          if (!event.endTime) return false;
          return new Date(event.endTime) <= now;
        },
        action: async (event: Event) => {
          console.log(`Auto-completing event ${event.id} due to end time reached`);
          await this.eventRepository.update(event.id, {
            currentActivity: undefined,
            endTime: now
          });
        }
      },

      // Auto-pause events that have been inactive for too long (but haven't exceeded duration)
      {
        from: EventStatus.ACTIVE,
        to: EventStatus.PAUSED,
        condition: (event: Event) => {
          // Don't pause if event has exceeded its planned duration (will be completed instead)
          if (event.endTime && new Date(event.endTime) <= now) return false;
          
          if (!event.updatedAt) return false;
          const lastUpdate = new Date(event.updatedAt);
          const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
          return hoursSinceUpdate > 24; // 24 hours of inactivity
        },
        action: async (event: Event) => {
          console.log(`Auto-pausing event ${event.id} due to inactivity`);
        }
      },

      // Auto-complete paused events after extended period
      {
        from: EventStatus.PAUSED,
        to: EventStatus.COMPLETED,
        condition: (event: Event) => {
          if (!event.updatedAt) return false;
          const lastUpdate = new Date(event.updatedAt);
          const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceUpdate > 7; // 7 days paused
        },
        action: async (event: Event) => {
          console.log(`Auto-completing event ${event.id} after extended pause`);
          await this.eventRepository.update(event.id, {
            endTime: now
          });
        }
      }
    ];
  }

  /**
   * Get default cleanup rules
   */
  private getCleanupRules(): EventCleanupRule[] {
    const now = new Date();

    return [
      // Archive old completed events
      {
        condition: (event: Event) => {
          if (event.status !== EventStatus.COMPLETED) return false;
          if (!event.endTime) return false;
          const endTime = new Date(event.endTime);
          const daysSinceEnd = (now.getTime() - endTime.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceEnd > this.config.eventExpirationDays;
        },
        action: async (event: Event) => {
          console.log(`Archiving completed event ${event.id} after ${this.config.eventExpirationDays} days`);
          // In a real implementation, this might move data to long-term storage
          // For now, we'll add an archived flag to metadata
          await this.eventRepository.update(event.id, {
            metadata: {
              ...event.metadata,
              archived: true,
              archivedAt: now.toISOString()
            }
          });
        },
        description: 'Archive completed events after expiration period'
      },

      // Clean up draft events that have been inactive for too long
      {
        condition: (event: Event) => {
          if (event.status !== EventStatus.DRAFT) return false;
          if (!event.createdAt) return false;
          const createdAt = new Date(event.createdAt);
          const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceCreation > 30; // 30 days
        },
        action: async (event: Event) => {
          console.log(`Marking stale draft event ${event.id} for review`);
          await this.eventRepository.update(event.id, {
            metadata: {
              ...event.metadata,
              stale: true,
              markedStaleAt: now.toISOString()
            }
          });
        },
        description: 'Mark old draft events as stale'
      }
    ];
  }

  /**
   * Process automated transitions for all events
   */
  private async processTransitions(): Promise<void> {
    try {
      console.log('Processing event transitions...');
      this.metrics.lastProcessingTime = new Date();

      // Get all events that might need transitions
      const eventsResult = await this.eventRepository.findActiveEvents();
      if (!eventsResult.success) {
        console.error('Failed to fetch events for transition processing');
        this.metrics.errors++;
        return;
      }

      // Also get paused events
      const pausedResult = await this.eventRepository.findByStatus(EventStatus.PAUSED);
      const allEvents = [
        ...(eventsResult.data || []),
        ...(pausedResult.success ? pausedResult.data || [] : [])
      ];

      const transitionRules = this.getTransitionRules();
      let transitionsExecuted = 0;

      for (const event of allEvents) {
        this.metrics.eventsProcessed++;

        for (const rule of transitionRules) {
          if (event.status === rule.from && rule.condition(event)) {
            try {
              // Execute pre-transition action if defined
              if (rule.action) {
                await rule.action(event);
              }

              // Update event status
              const updateResult = await this.eventRepository.updateStatus(event.id, rule.to);
              if (updateResult.success) {
                console.log(`Transitioned event ${event.id} from ${rule.from} to ${rule.to}`);
                transitionsExecuted++;
                this.metrics.transitionsExecuted++;
              } else {
                console.error(`Failed to transition event ${event.id}:`, updateResult.error);
                this.metrics.errors++;
              }
            } catch (error) {
              console.error(`Error processing transition for event ${event.id}:`, error);
              this.metrics.errors++;
            }
            break; // Only apply one transition per event per cycle
          }
        }
      }

      console.log(`Processed transitions for ${allEvents.length} events, executed ${transitionsExecuted} transitions`);
      await this.updateMetricsFromDatabase();

    } catch (error) {
      console.error('Error in processTransitions:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Process cleanup actions for all events
   */
  private async processCleanup(): Promise<void> {
    try {
      console.log('Processing event cleanup...');

      // Get all events for cleanup processing
      const allEventsResult = await this.eventRepository.findAll?.() || 
                             await this.eventRepository.findActiveEvents();
      
      if (!allEventsResult.success) {
        console.error('Failed to fetch events for cleanup processing');
        this.metrics.errors++;
        return;
      }

      const events = allEventsResult.data || [];
      const cleanupRules = this.getCleanupRules();
      let cleanupActions = 0;

      for (const event of events) {
        for (const rule of cleanupRules) {
          if (rule.condition(event)) {
            try {
              await rule.action(event);
              cleanupActions++;
              this.metrics.cleanupActions++;
              console.log(`Applied cleanup rule for event ${event.id}: ${rule.description}`);
            } catch (error) {
              console.error(`Error applying cleanup rule for event ${event.id}:`, error);
              this.metrics.errors++;
            }
          }
        }
      }

      console.log(`Processed cleanup for ${events.length} events, executed ${cleanupActions} cleanup actions`);

    } catch (error) {
      console.error('Error in processCleanup:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Update metrics from database
   */
  private async updateMetricsFromDatabase(): Promise<void> {
    try {
      // Get counts by status
      const activeResult = await this.eventRepository.findActiveEvents();
      this.metrics.activeEvents = activeResult.success ? (activeResult.data?.length || 0) : 0;

      const completedResult = await this.eventRepository.findByStatus(EventStatus.COMPLETED);
      this.metrics.completedEvents = completedResult.success ? (completedResult.data?.length || 0) : 0;

      const draftResult = await this.eventRepository.findByStatus(EventStatus.DRAFT);
      this.metrics.draftEvents = draftResult.success ? (draftResult.data?.length || 0) : 0;

      const pausedResult = await this.eventRepository.findByStatus(EventStatus.PAUSED);
      this.metrics.pausedEvents = pausedResult.success ? (pausedResult.data?.length || 0) : 0;

      this.metrics.totalEvents = this.metrics.activeEvents + this.metrics.completedEvents + 
                                this.metrics.draftEvents + this.metrics.pausedEvents;

    } catch (error) {
      console.error('Error updating metrics:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Get event health status
   */
  async getEventHealth(eventId: string): Promise<EventHealthMetrics | null> {
    try {
      const eventResult = await this.eventRepository.findById(eventId);
      if (!eventResult.success || !eventResult.data) {
        return null;
      }

      const event = eventResult.data;
      const now = new Date();
      const issues: string[] = [];
      let health: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check for health issues
      if (event.status === EventStatus.ACTIVE) {
        const lastUpdate = event.updatedAt ? new Date(event.updatedAt) : new Date(event.createdAt);
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate > 12) {
          issues.push('No activity for over 12 hours');
          health = 'warning';
        }
        
        if (hoursSinceUpdate > 24) {
          issues.push('No activity for over 24 hours');
          health = 'critical';
        }

        if (event.endTime && new Date(event.endTime) < now) {
          issues.push('Event has exceeded planned end time');
          health = 'critical';
        }
      }

      const participantCount = (event.metadata?.participantCount as number) || 0;
      if (participantCount === 0 && event.status === EventStatus.ACTIVE) {
        issues.push('No participants in active event');
        if (health === 'healthy') {
          health = 'warning';
        }
      }

      const uptime = event.startTime ? 
        now.getTime() - new Date(event.startTime).getTime() : 0;

      return {
        eventId: event.id,
        status: event.status as EventStatus,
        health,
        issues,
        participantCount: participantCount,
        activityCount: (event.metadata?.topicCount as number) || 0,
        lastActivity: event.updatedAt ? new Date(event.updatedAt) : null,
        uptime,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt)
      };

    } catch (error) {
      console.error(`Error getting health for event ${eventId}:`, error);
      return null;
    }
  }

  /**
   * Get overall lifecycle metrics
   */
  getMetrics(): LifecycleMetrics {
    return { ...this.metrics };
  }

  /**
   * Force a transition processing cycle
   */
  async forceProcessing(): Promise<void> {
    console.log('Forcing lifecycle processing cycle...');
    await this.processTransitions();
    await this.processCleanup();
  }

  /**
   * Check if manager is running
   */
  isManagerRunning(): boolean {
    return this.isRunning;
  }
}