import { json } from '@sveltejs/kit';
import { EventRepository } from '$lib/storage';
import { validateEventBusinessRules, EVENT_RULE_LIMITS } from '$lib/validation/eventRules';
import type { Event } from '../../../../types/entities';
import { EventStatus } from '../../../../types/enums';
import { z } from 'zod';

// Initialize repository
const eventRepository = new EventRepository({
  dataDir: './data',
  enableBackups: true,
  backupRetention: 10
});

// Update event schema
const UpdateEventSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  maxParticipants: z
    .number()
    .int()
    .min(EVENT_RULE_LIMITS.MIN_CAPACITY)
    .max(EVENT_RULE_LIMITS.MAX_CAPACITY)
    .optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  settings: z.object({
    allowGuestAccess: z.boolean().optional(),
    requireRegistration: z.boolean().optional(),
    enableVoting: z.boolean().optional(),
    enableGroupIntelligence: z.boolean().optional(),
    enableDiscussionGroups: z.boolean().optional(),
    enableTeamDistribution: z.boolean().optional(),
    votingTimeLimit: z
      .number()
      .int()
      .min(EVENT_RULE_LIMITS.MIN_VOTING_TIME_SECONDS)
      .max(EVENT_RULE_LIMITS.MAX_VOTING_TIME_SECONDS)
      .optional(),
    maxVotesPerTopic: z.number().int().min(1).optional(),
    maxTopicsPerUser: z
      .number()
      .int()
      .min(EVENT_RULE_LIMITS.MIN_TOPICS_PER_USER)
      .max(EVENT_RULE_LIMITS.MAX_TOPICS_PER_USER)
      .optional(),
    autoAdvanceActivities: z.boolean().optional()
  }).optional()
});

export async function GET({ params }) {
  try {
    const { eventId } = params;
    
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
  } catch (error) {
    console.error('Event fetch error:', error);
    return json({
      success: false,
      error: 'Failed to fetch event'
    }, { status: 500 });
  }
}

export async function PUT({ params, request }) {
  try {
    const { eventId } = params;
    const body = await request.json();
    const validatedData = UpdateEventSchema.parse(body);

    const currentResult = await eventRepository.findById(eventId);
    if (!currentResult.success || !currentResult.data) {
      return json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    const currentEvent = currentResult.data;

    const mergedSettings = validatedData.settings
      ? {
          ...currentEvent.settings,
          ...validatedData.settings
        }
      : currentEvent.settings;

    const businessRules = validateEventBusinessRules({
      capacity: validatedData.maxParticipants ?? currentEvent.maxParticipants ?? null,
      durationMs: (currentEvent.metadata?.durationMs as number | undefined) ?? null,
      currentParticipants: (currentEvent.metadata?.participantCount as number | undefined) ?? null,
      settings: {
        allowGuestAccess: mergedSettings.allowGuestAccess,
        votingRounds: (currentEvent.metadata?.votingRounds as number | undefined) ?? null,
        maxTopicsPerUser: mergedSettings.maxTopicsPerUser,
        votingTimeLimit: mergedSettings.votingTimeLimit,
        requireRegistration: mergedSettings.requireRegistration
      },
      isPrivate: mergedSettings.allowGuestAccess === false
    });

    if (!businessRules.isValid) {
      return json({
        success: false,
        error: 'Business rule validation failed',
        details: businessRules.errors
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: Partial<Event> = {};
    
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.maxParticipants !== undefined) updateData.maxParticipants = validatedData.maxParticipants;
    if (validatedData.startTime) updateData.startTime = new Date(validatedData.startTime);
    if (validatedData.endTime) updateData.endTime = new Date(validatedData.endTime);
    
    // Handle settings update
    if (validatedData.settings) {
      updateData.settings = mergedSettings;
      updateData.metadata = {
        ...(currentEvent.metadata ?? {}),
        isPrivate: mergedSettings.allowGuestAccess === false,
        durationMs: currentEvent.metadata?.durationMs,
        votingRounds: currentEvent.metadata?.votingRounds
      };
    }
    
    // Validate business rules
    if (updateData.startTime && updateData.endTime && updateData.startTime >= updateData.endTime) {
      return json({
        success: false,
        error: 'Start time must be before end time'
      }, { status: 400 });
    }
    
    const result = await eventRepository.update(eventId, updateData);
    
    if (!result.success) {
      return json({
        success: false,
        error: result.error?.message || 'Failed to update event'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      event: result.data
    });
    
  } catch (error) {
    console.error('Event update error:', error);
    
    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }
    
    return json({
      success: false,
      error: 'Failed to update event'
    }, { status: 500 });
  }
}

export async function DELETE({ params }) {
  try {
    const { eventId } = params;
    
    // Check if event exists
    const existsResult = await eventRepository.findById(eventId);
    if (!existsResult.success) {
      return json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }
    
    // Only allow deletion of draft events for safety
    if (existsResult.data!.status !== EventStatus.DRAFT) {
      return json({
        success: false,
        error: 'Only draft events can be deleted'
      }, { status: 400 });
    }
    
    const result = await eventRepository.delete(eventId);
    
    if (!result.success) {
      return json({
        success: false,
        error: result.error?.message || 'Failed to delete event'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      message: 'Event deleted successfully'
    });
    
  } catch (error) {
    console.error('Event deletion error:', error);
    return json({
      success: false,
      error: 'Failed to delete event'
    }, { status: 500 });
  }
}