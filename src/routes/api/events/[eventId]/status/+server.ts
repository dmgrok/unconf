import { json } from '@sveltejs/kit';
import { EventRepository } from '$lib/storage';
import { EventStatus, ActivityType } from '../../../../../types/enums';
import { z } from 'zod';

// Initialize repository
const eventRepository = new EventRepository({
  dataDir: './data',
  enableBackups: true,
  backupRetention: 10
});

// Status update schema
const StatusUpdateSchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  currentActivity: z.enum(['voting', 'intelligence', 'discussion', 'teams']).optional()
});

// Define valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  [EventStatus.DRAFT]: [EventStatus.ACTIVE],
  [EventStatus.ACTIVE]: [EventStatus.PAUSED, EventStatus.COMPLETED],
  [EventStatus.PAUSED]: [EventStatus.ACTIVE, EventStatus.COMPLETED],
  [EventStatus.COMPLETED]: [] // Terminal state
};

function isValidTransition(from: string, to: string): boolean {
  const validNext = VALID_TRANSITIONS[from];
  return validNext ? validNext.includes(to) : false;
}

export async function PUT({ params, request }) {
  try {
    const { eventId } = params;
    const body = await request.json();
    const validatedData = StatusUpdateSchema.parse(body);
    
    // Get current event state
    const eventResult = await eventRepository.findById(eventId);
    if (!eventResult.success) {
      return json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }
    
    const event = eventResult.data!;
    const newStatus = validatedData.status;
    
    // Validate transition
    if (event.status !== newStatus && !isValidTransition(event.status, newStatus)) {
      return json({
        success: false,
        error: `Invalid status transition from '${event.status}' to '${newStatus}'`,
        validTransitions: VALID_TRANSITIONS[event.status as keyof typeof VALID_TRANSITIONS] || []
      }, { status: 400 });
    }
    
    // Handle status-specific logic first
    const additionalUpdates: Record<string, unknown> = {};
    
    if (newStatus === EventStatus.ACTIVE && event.status === EventStatus.DRAFT) {
      // Starting the event
      additionalUpdates.startTime = new Date();
      additionalUpdates.currentActivity = validatedData.currentActivity ? 
        validatedData.currentActivity : ActivityType.VOTING;
    } else if (newStatus === EventStatus.COMPLETED) {
      // Ending the event
      additionalUpdates.endTime = new Date();
      additionalUpdates.currentActivity = undefined;
    } else if (newStatus === EventStatus.ACTIVE && event.status === EventStatus.PAUSED) {
      // Resuming the event
      if (validatedData.currentActivity) {
        additionalUpdates.currentActivity = validatedData.currentActivity;
      }
    }
    
    // First update the status - cast to EventStatus enum type
    const enumStatus = newStatus as EventStatus;
    const statusResult = await eventRepository.updateStatus(eventId, enumStatus);
    
    if (!statusResult.success) {
      return json({
        success: false,
        error: statusResult.error?.message || 'Failed to update event status'
      }, { status: 500 });
    }
    
    // Then apply any additional updates if needed
    let finalEvent = statusResult.data!;
    if (Object.keys(additionalUpdates).length > 0) {
      const additionalResult = await eventRepository.update(eventId, additionalUpdates);
      if (additionalResult.success) {
        finalEvent = additionalResult.data!;
      }
    }
    
    return json({
      success: true,
      event: finalEvent,
      message: `Event status changed to '${newStatus}'`
    });
    
  } catch (error) {
    console.error('Status update error:', error);
    
    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }
    
    return json({
      success: false,
      error: 'Failed to update event status'
    }, { status: 500 });
  }
}

export async function GET({ params }) {
  try {
    const { eventId } = params;
    
    // Get current event state
    const eventResult = await eventRepository.findById(eventId);
    if (!eventResult.success) {
      return json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }
    
    const event = eventResult.data!;
    
    return json({
      success: true,
      currentStatus: event.status,
      currentActivity: event.currentActivity,
      validTransitions: VALID_TRANSITIONS[event.status as keyof typeof VALID_TRANSITIONS] || [],
      startTime: event.startTime,
      endTime: event.endTime
    });
    
  } catch (error) {
    console.error('Status fetch error:', error);
    return json({
      success: false,
      error: 'Failed to fetch event status'
    }, { status: 500 });
  }
}