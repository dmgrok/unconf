import { json } from '@sveltejs/kit';
import { EventRepository } from '$lib/storage';
import { normalizeEventSettings, validateEventBusinessRules, EVENT_RULE_LIMITS, DAY_IN_MS } from '$lib/validation/eventRules';
import { generateUniqueSlug } from '$lib/utils/slug';
import type { Event } from '../../../types/entities';
import { EventStatus } from '../../../types/enums';
import { z } from 'zod';

// Initialize repository with required config
const eventRepository = new EventRepository({
  dataDir: './data',
  enableBackups: true,
  backupRetention: 10
});

// Event creation schema
const CreateEventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().max(2000).optional().default(''),
  duration: z
    .number()
    .int()
    .min(EVENT_RULE_LIMITS.MIN_DURATION_MS)
    .max(EVENT_RULE_LIMITS.MAX_DURATION_MS),
  capacity: z
    .number()
    .int()
    .min(EVENT_RULE_LIMITS.MIN_CAPACITY)
    .max(EVENT_RULE_LIMITS.MAX_CAPACITY),
  organizerId: z.string().min(1),
  organizerName: z.string().min(1),
  settings: z
    .object({
      allowGuestAccess: z.boolean().optional(),
      votingRounds: z
        .number()
        .int()
        .min(EVENT_RULE_LIMITS.MIN_VOTING_ROUNDS)
        .max(EVENT_RULE_LIMITS.MAX_VOTING_ROUNDS)
        .optional(),
      maxTopicsPerUser: z
        .number()
        .int()
        .min(EVENT_RULE_LIMITS.MIN_TOPICS_PER_USER)
        .max(EVENT_RULE_LIMITS.MAX_TOPICS_PER_USER)
        .optional(),
      votingTimeLimit: z
        .number()
        .int()
        .min(EVENT_RULE_LIMITS.MIN_VOTING_TIME_SECONDS)
        .max(EVENT_RULE_LIMITS.MAX_VOTING_TIME_SECONDS)
        .optional(),
      requireRegistration: z.boolean().optional()
    })
    .optional()
});

export async function POST({ request }) {
  try {
    const body = await request.json();
    const validatedData = CreateEventSchema.parse(body);

    const normalizedSettings = normalizeEventSettings(validatedData.settings);

    const businessRules = validateEventBusinessRules({
      capacity: validatedData.capacity,
      durationMs: validatedData.duration,
      settings: {
        allowGuestAccess: normalizedSettings.allowGuestAccess,
        votingRounds: normalizedSettings.votingRounds,
        maxTopicsPerUser: normalizedSettings.maxTopicsPerUser,
        votingTimeLimit: normalizedSettings.votingTimeLimit,
        requireRegistration: normalizedSettings.requireRegistration
      },
      isPrivate: !normalizedSettings.allowGuestAccess
    });

    if (!businessRules.isValid) {
      return json(
        {
          success: false,
          error: 'Business rule validation failed',
          details: businessRules.errors
        },
        { status: 400 }
      );
    }

    // Generate unique access code and slug
    const accessCode = await eventRepository.generateUniqueAccessCode();
    const slug = generateUniqueSlug(validatedData.title);

    // Create new event
    const newEvent: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
      title: validatedData.title,
      description: validatedData.description ?? '',
      slug,
      status: EventStatus.DRAFT,
      accessCode,
      organizerId: validatedData.organizerId,
      maxParticipants: validatedData.capacity,
      startTime: undefined,
      endTime: undefined,
      currentActivity: undefined,
      settings: {
        allowGuestAccess: normalizedSettings.allowGuestAccess,
        requireRegistration: normalizedSettings.requireRegistration,
        enableVoting: true,
        enableGroupIntelligence: false,
        enableDiscussionGroups: false,
        enableTeamDistribution: false,
        votingTimeLimit: normalizedSettings.votingTimeLimit,
        maxVotesPerTopic: 1,
        maxTopicsPerUser: normalizedSettings.maxTopicsPerUser,
        autoAdvanceActivities: false
      },
      metadata: {
        participantCount: 0,
        topicCount: 0,
        voteCount: 0,
        votingRounds: normalizedSettings.votingRounds,
        durationMs: validatedData.duration,
        durationDays: Number((validatedData.duration / DAY_IN_MS).toFixed(2)),
        isPrivate: !normalizedSettings.allowGuestAccess
      }
    };

    const result = await eventRepository.create(newEvent);
    
    if (!result.success) {
      return json({
        success: false,
        error: result.error?.message || 'Failed to create event'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      event: result.data
    }, { status: 201 });

  } catch (error) {
    console.error('Event creation error:', error);
    
    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }

    return json({
      success: false,
      error: 'Failed to create event'
    }, { status: 500 });
  }
}

export async function GET({ url }) {
  try {
    const eventId = url.searchParams.get('id');
    const slug = url.searchParams.get('slug');
    const organizerId = url.searchParams.get('organizerId');
    const accessCode = url.searchParams.get('accessCode');

    if (eventId) {
      // Get specific event by ID
      const result = await eventRepository.findById(eventId);
      if (!result.success) {
        return json({
          success: false,
          error: 'Event not found'
        }, { status: 404 });
      }

      return json({
        success: true,
        event: result.data
      });
    }

    if (slug) {
      // Get event by slug
      const result = await eventRepository.findBySlug(slug);
      if (!result.success) {
        return json({
          success: false,
          error: 'Event not found'
        }, { status: 404 });
      }

      return json({
        success: true,
        event: result.data
      });
    }

    if (accessCode) {
      // Get event by access code
      const result = await eventRepository.findByAccessCode(accessCode);
      if (!result.success) {
        return json({
          success: false,
          error: 'Event not found'
        }, { status: 404 });
      }

      return json({
        success: true,
        event: result.data
      });
    }
    
    if (organizerId) {
      // Get events for specific organizer
      const result = await eventRepository.findByOrganizer(organizerId);
      if (!result.success) {
        return json({
          success: false,
          error: 'Failed to fetch events'
        }, { status: 500 });
      }
      
      return json({
        success: true,
        events: result.data
      });
    }
    
    // Get all active events (public list)
    const result = await eventRepository.findActiveEvents();
    if (!result.success) {
      return json({
        success: false,
        error: 'Failed to fetch events'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      events: result.data
    });

  } catch (error) {
    console.error('Event fetch error:', error);
    return json({
      success: false,
      error: 'Failed to fetch events'
    }, { status: 500 });
  }
}