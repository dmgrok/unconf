/**
 * WebSocket endpoint for UnConf platform
 * Provides WebSocket server information and status
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    return json({
      success: true,
      message: 'WebSocket server is ready',
      endpoints: {
        websocket: 'ws://localhost:3001',
        fallback: '/api/websocket/polling'
      },
      features: [
        'Real-time event updates',
        'Live voting',
        'Activity switching',
        'User presence',
        'Heartbeat monitoring'
      ],
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('WebSocket status error:', error);
    return json({
      success: false,
      error: 'WebSocket server not available',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};