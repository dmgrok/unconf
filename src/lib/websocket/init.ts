/**
 * WebSocket integration with SvelteKit using server hooks
 * This creates a WebSocket server that integrates with the SvelteKit app
 */

import { building } from '$app/environment';
import { createServer } from 'http';
import { Server } from 'socket.io';

let httpServer: any = null;
let io: any = null;

// Initialize WebSocket server only in non-building environment
if (!building) {
  try {
    const { WebSocketManager } = await import('./websocketManager.js');
    
    // Create the WebSocket manager
    const wsManager = new WebSocketManager();
    
    // Export for use in other parts of the app
    global.__wsManager = wsManager;
    
  } catch (error) {
    console.warn('WebSocket initialization failed:', error);
  }
}

export { httpServer, io };