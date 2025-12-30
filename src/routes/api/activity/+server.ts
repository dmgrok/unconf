/**
 * Activity Management API Endpoint
 * Handles activity state queries and transitions for organizers
 */

import { json } from '@sveltejs/kit';
import { activityStateManager, ACTIVITY_CONFIGS } from '$lib/activity/ActivityStateManager';
import { ActivityType } from '../../../types/enums.js';
import { z } from 'zod';

// Activity switch request schema
const SwitchActivitySchema = z.object({
  eventId: z.string(),
  organizerId: z.string(),
  newActivity: z.enum([ActivityType.VOTING, ActivityType.GROUP_INTELLIGENCE, ActivityType.DISCUSSION_GROUPS, ActivityType.TEAM_DISTRIBUTION]),
  timerDuration: z.number().optional(),
  settings: z.record(z.any()).optional()
});

// Timer control request schema
const TimerControlSchema = z.object({
  eventId: z.string(),
  organizerId: z.string(),
  action: z.enum(['start', 'pause', 'resume', 'stop', 'reset']),
  duration: z.number().optional()
});

/**
 * GET /api/activity - Get current activity state for events
 */
export async function GET({ url }) {
  try {
    const eventId = url.searchParams.get('eventId');

    if (eventId) {
      // Get specific event activity state
      const activityState = activityStateManager.getActivityState(eventId);
      const timerState = activityStateManager.getTimerState(eventId);

      if (!activityState) {
        return json({
          success: false,
          error: 'Event not found or not initialized'
        }, { status: 404 });
      }

      return json({
        success: true,
        data: {
          eventId,
          currentActivity: activityState.currentActivity,
          activityState: activityState.activityState,
          participants: activityState.participants.size,
          configuration: activityState.configuration,
          timer: timerState ? {
            duration: timerState.duration,
            remaining: timerState.remaining,
            isActive: timerState.isActive,
            isPaused: timerState.isPaused,
            startedAt: timerState.startedAt
          } : null,
          transitionHistory: activityState.transitionHistory.slice(-5) // Last 5 transitions
        }
      });

    } else {
      // Get all active events
      const activeEvents = activityStateManager.getActiveEvents();
      const eventStates = activeEvents.map(eventId => {
        const state = activityStateManager.getActivityState(eventId);
        const timer = activityStateManager.getTimerState(eventId);

        return {
          eventId,
          currentActivity: state?.currentActivity,
          activityState: state?.activityState,
          participants: state?.participants.size || 0,
          hasTimer: timer?.isActive || false,
          timerRemaining: timer?.remaining || 0
        };
      });

      return json({
        success: true,
        data: {
          activeEvents: eventStates,
          availableActivities: Object.values(ActivityType),
          activityConfigs: ACTIVITY_CONFIGS
        }
      });
    }

  } catch (error) {
    console.error('Activity state fetch error:', error);
    return json({
      success: false,
      error: 'Failed to fetch activity state'
    }, { status: 500 });
  }
}

/**
 * POST /api/activity - Switch activity or control timer
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'switch') {
      // Switch activity
      const validatedData = SwitchActivitySchema.parse(body);
      const { eventId, organizerId, newActivity, timerDuration, settings } = validatedData;

      // TODO: Validate organizer permissions

      const result = await activityStateManager.switchActivity(
        eventId,
        newActivity,
        organizerId,
        timerDuration
      );

      if (!result.success) {
        return json({
          success: false,
          error: result.error
        }, { status: 400 });
      }

      const activityState = activityStateManager.getActivityState(eventId);

      return json({
        success: true,
        message: 'Activity switched successfully',
        data: {
          eventId,
          newActivity,
          previousActivity: activityState?.previousActivity,
          latencyMs: result.latencyMs,
          state: {
            currentActivity: activityState?.currentActivity,
            activityState: activityState?.activityState,
            participants: activityState?.participants.size,
            configuration: activityState?.configuration
          }
        }
      });

    } else if (action === 'timer') {
      // Control timer
      const validatedData = TimerControlSchema.parse(body);
      const { eventId, organizerId, action: timerAction, duration } = validatedData;

      // TODO: Validate organizer permissions

      let success = false;
      let message = '';

      switch (timerAction) {
        case 'start':
          success = activityStateManager.startTimer(eventId, duration || 600);
          message = success ? 'Timer started successfully' : 'Failed to start timer';
          break;
        case 'pause':
          success = activityStateManager.pauseTimer(eventId);
          message = success ? 'Timer paused successfully' : 'Failed to pause timer';
          break;
        case 'resume':
          success = activityStateManager.resumeTimer(eventId);
          message = success ? 'Timer resumed successfully' : 'Failed to resume timer';
          break;
        case 'stop':
          activityStateManager.stopTimer(eventId);
          success = true;
          message = 'Timer stopped successfully';
          break;
        case 'reset':
          activityStateManager.stopTimer(eventId);
          if (duration) {
            success = activityStateManager.startTimer(eventId, duration);
            message = success ? 'Timer reset and started successfully' : 'Failed to reset timer';
          } else {
            success = true;
            message = 'Timer reset successfully';
          }
          break;
        default:
          return json({
            success: false,
            error: 'Invalid timer action'
          }, { status: 400 });
      }

      if (!success) {
        return json({
          success: false,
          error: message
        }, { status: 400 });
      }

      const timerState = activityStateManager.getTimerState(eventId);

      return json({
        success: true,
        message,
        data: {
          eventId,
          action: timerAction,
          timer: timerState ? {
            duration: timerState.duration,
            remaining: timerState.remaining,
            isActive: timerState.isActive,
            isPaused: timerState.isPaused
          } : null
        }
      });

    } else {
      return json({
        success: false,
        error: 'Invalid action. Use "switch" or "timer"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Activity management error:', error);

    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }

    return json({
      success: false,
      error: 'Failed to manage activity'
    }, { status: 500 });
  }
}

/**
 * GET /api/activity/configs - Get available activity configurations
 */
export async function OPTIONS() {
  return json({
    success: true,
    data: {
      availableActivities: Object.values(ActivityType),
      activityConfigs: ACTIVITY_CONFIGS,
      timerActions: ['start', 'pause', 'resume', 'stop', 'reset']
    }
  });
}