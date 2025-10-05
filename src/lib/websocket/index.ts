/**
 * WebSocket module exports for UnConf platform
 * CLIENT-SIDE ONLY - Do not import server-side Socket.IO code here
 */

// Client-side exports
export {
  socketStore,
  activityStore,
  voteStore,
  isConnected,
  isReconnecting,
  connectionHealth,
  webSocketManager,
  connectToEvent,
  disconnectFromEvent,
  submitVote,
  switchActivity,
  updateTimer
} from './client.js';

// Server-side exports moved to separate file: websocket/server-only.ts
// Use: import { WebSocketManager } from '$lib/websocket/server-only' in server code

// Type exports
export type * from './types.js';