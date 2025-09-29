/**
 * WebSocket module exports for UnConf platform
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

// Server-side exports
export { WebSocketManager } from './websocketManager.js';

// Type exports
export type * from './types.js';