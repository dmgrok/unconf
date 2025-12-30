/**
 * Resilience Management API
 * Provides endpoints for monitoring and controlling resilience systems
 */

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { gracefulDegradation } from '$lib/resilience/graceful-degradation.js';
import { errorRecovery } from '$lib/resilience/error-recovery.js';

export async function GET({ url }: RequestEvent) {
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'status':
        return json({
          success: true,
          data: {
            connection: gracefulDegradation.getStatus(),
            recovery: errorRecovery.getRecoveryStatus(),
            timestamp: new Date().toISOString()
          }
        });

      case 'connection-status':
        return json({
          success: true,
          data: gracefulDegradation.getStatus()
        });

      case 'recovery-status':
        return json({
          success: true,
          data: errorRecovery.getRecoveryStatus()
        });

      case 'recovery-actions':
        return json({
          success: true,
          data: errorRecovery.getAvailableActions()
        });

      case 'recovery-rules':
        return json({
          success: true,
          data: errorRecovery.getRecoveryRules()
        });

      case 'circuit-breakers':
        return json({
          success: true,
          data: errorRecovery.getRecoveryStatus().circuitBreakers
        });

      case 'queued-operations':
        return json({
          success: true,
          data: gracefulDegradation.getQueuedOperations()
        });

      default:
        return json({
          success: false,
          error: 'Invalid action parameter. Supported actions: status, connection-status, recovery-status, recovery-actions, recovery-rules, circuit-breakers, queued-operations'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Resilience API error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred'
    }, { status: 500 });
  }
};

export async function POST({ request, url }: RequestEvent) {
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'force-reconnect':
        gracefulDegradation.forceReconnection();
        return json({
          success: true,
          message: 'Reconnection attempt initiated'
        });

      case 'clear-queue':
        gracefulDegradation.clearQueue();
        return json({
          success: true,
          message: 'Operation queue cleared'
        });

      case 'execute-recovery': {
        const body = await request.json();
        const { actionId } = body;
        
        if (!actionId) {
          return json({
            success: false,
            error: 'actionId is required'
          }, { status: 400 });
        }

        const result = await errorRecovery.executeManualRecovery(actionId);
        return json({
          success: true,
          data: { result },
          message: `Recovery action executed with result: ${result}`
        });
      }

      case 'toggle-auto-recovery': {
        const body = await request.json();
        const { enabled } = body;
        
        if (typeof enabled !== 'boolean') {
          return json({
            success: false,
            error: 'enabled (boolean) is required'
          }, { status: 400 });
        }

        errorRecovery.setAutoRecoveryEnabled(enabled);
        return json({
          success: true,
          message: `Auto recovery ${enabled ? 'enabled' : 'disabled'}`
        });
      }

      case 'simulate-error': {
        const body = await request.json();
        const { error, context } = body;
        
        if (!error) {
          return json({
            success: false,
            error: 'error message is required'
          }, { status: 400 });
        }

        const result = await errorRecovery.handleError(error, context);
        return json({
          success: true,
          data: { result },
          message: `Error handling completed with result: ${result}`
        });
      }

      case 'create-circuit-breaker': {
        const body = await request.json();
        const { name, failureThreshold, timeout } = body;
        
        if (!name || !failureThreshold || !timeout) {
          return json({
            success: false,
            error: 'name, failureThreshold, and timeout are required'
          }, { status: 400 });
        }

        errorRecovery.createCircuitBreaker(name, { failureThreshold, timeout });
        return json({
          success: true,
          message: `Circuit breaker '${name}' created`
        });
      }

      case 'cleanup-history': {
        const body = await request.json();
        const { daysToKeep = 7 } = body;
        
        errorRecovery.clearOldHistory(daysToKeep);
        return json({
          success: true,
          message: `Recovery history cleaned up (keeping ${daysToKeep} days)`
        });
      }

      default:
        return json({
          success: false,
          error: 'Invalid action parameter. Supported actions: force-reconnect, clear-queue, execute-recovery, toggle-auto-recovery, simulate-error, create-circuit-breaker, cleanup-history'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Resilience API error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred'
    }, { status: 500 });
  }
};