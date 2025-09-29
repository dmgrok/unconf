import { json } from '@sveltejs/kit';
import { EventLifecycleManager } from '$lib/services/eventLifecycle';

// Global lifecycle manager instance
let lifecycleManager: EventLifecycleManager | null = null;

// Initialize lifecycle manager on server startup
function getLifecycleManager() {
  if (!lifecycleManager) {
    lifecycleManager = new EventLifecycleManager({
      dataDir: './data',
      enableBackups: true,
      backupRetention: 10,
      autoTransitionInterval: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      eventExpirationDays: 30
    });
    
    // Start the manager
    lifecycleManager.start().catch(error => {
      console.error('Failed to start lifecycle manager:', error);
    });
  }
  return lifecycleManager;
}

export async function GET({ url }) {
  try {
    const manager = getLifecycleManager();
    const action = url.searchParams.get('action');
    const eventId = url.searchParams.get('eventId');

    switch (action) {
      case 'metrics':
        return json({
          success: true,
          metrics: manager.getMetrics(),
          isRunning: manager.isManagerRunning()
        });

      case 'health': {
        if (!eventId) {
          return json({
            success: false,
            error: 'Event ID is required for health check'
          }, { status: 400 });
        }

        const health = await manager.getEventHealth(eventId);
        if (!health) {
          return json({
            success: false,
            error: 'Event not found or health check failed'
          }, { status: 404 });
        }

        return json({
          success: true,
          health
        });
      }

      case 'status':
        return json({
          success: true,
          isRunning: manager.isManagerRunning(),
          status: manager.isManagerRunning() ? 'running' : 'stopped'
        });

      default:
        return json({
          success: false,
          error: 'Invalid action. Supported actions: metrics, health, status'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Lifecycle API error:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const manager = getLifecycleManager();
    const { action } = await request.json();

    switch (action) {
      case 'start':
        if (manager.isManagerRunning()) {
          return json({
            success: false,
            error: 'Lifecycle manager is already running'
          }, { status: 400 });
        }

        await manager.start();
        return json({
          success: true,
          message: 'Lifecycle manager started successfully'
        });

      case 'stop':
        if (!manager.isManagerRunning()) {
          return json({
            success: false,
            error: 'Lifecycle manager is not running'
          }, { status: 400 });
        }

        await manager.stop();
        return json({
          success: true,
          message: 'Lifecycle manager stopped successfully'
        });

      case 'force-processing':
        if (!manager.isManagerRunning()) {
          return json({
            success: false,
            error: 'Lifecycle manager is not running'
          }, { status: 400 });
        }

        await manager.forceProcessing();
        return json({
          success: true,
          message: 'Forced processing cycle completed'
        });

      default:
        return json({
          success: false,
          error: 'Invalid action. Supported actions: start, stop, force-processing'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Lifecycle API error:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}