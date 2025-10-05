<!--
  WebSocket Connection Test Component
  Demonstrates real-time functionality for testing purposes
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    socketStore,
    activityStore,
    voteStore,
    isConnected,
    connectionHealth,
    connectToEvent,
    disconnectFromEvent,
    submitVote
  } from '$lib/websocket';

  let eventId = 'test-event-123';
  let isConnecting = false;
  let testMessages: string[] = [];
  let selectedTopic = '';
  let selectedWeight: 'first' | 'second' | 'third' = 'first';

  // Subscribe to stores
  let socketState: any;
  let activityState: any;
  let voteState: any;
  let connectionState: any;
  let connected = false;

  onMount(() => {
    const unsubSocket = socketStore.subscribe(value => socketState = value);
    const unsubActivity = activityStore.subscribe(value => activityState = value);
    const unsubVote = voteStore.subscribe(value => voteState = value);
    const unsubHealth = connectionHealth.subscribe(value => connectionState = value);
    const unsubConnected = isConnected.subscribe(value => connected = value);

    return () => {
      unsubSocket();
      unsubActivity();
      unsubVote();
      unsubHealth();
      unsubConnected();
    };
  });

  onDestroy(() => {
    disconnectFromEvent();
  });

  // Create guest token helper
  async function createGuestTokenLocal() {
    try {
      const response = await fetch('/api/auth/guest-token');
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Failed to create guest token:', error);
      throw error;
    }
  }

  async function handleConnect() {
    if (isConnecting) return;
    
    isConnecting = true;
    testMessages = [...testMessages, `🔌 Connecting to event: ${eventId}`];
    
    try {
      // Create guest user with token
      const guestToken = await createGuestTokenLocal();
      const user = {
        id: `guest-${Date.now()}`,
        sessionId: guestToken,
        role: 'guest' as const
      };

      const success = await connectToEvent(
        eventId,
        user.id,
        'guest',
        true,
        user.sessionId
      );
      
      if (success) {
        testMessages = [...testMessages, '✅ Connected successfully!'];
      } else {
        testMessages = [...testMessages, '❌ Connection failed'];
      }
    } catch (error) {
      testMessages = [...testMessages, `❌ Connection error: ${error}`];
    } finally {
      isConnecting = false;
    }
  }

  function handleDisconnect() {
    disconnectFromEvent();
    testMessages = [...testMessages, '🔌 Disconnected'];
  }

  async function handleVote() {
    if (!selectedTopic.trim()) {
      testMessages = [...testMessages, '⚠️ Please enter a topic ID'];
      return;
    }
    
    try {
      const success = await submitVote(selectedTopic.trim(), selectedWeight);
      if (success) {
        testMessages = [...testMessages, `🗳️ Vote submitted: ${selectedTopic} (${selectedWeight})`];
      } else {
        testMessages = [...testMessages, '❌ Vote submission failed'];
      }
    } catch (error) {
      testMessages = [...testMessages, `❌ Vote error: ${error}`];
    }
  }

  function clearMessages() {
    testMessages = [];
  }
</script>

<div class="websocket-test">
  <h2>🔌 WebSocket Connection Test</h2>
  
  <!-- Connection Status -->
  <div class="status-panel">
    <h3>Connection Status</h3>
    <div class="status-item">
      <span class="label">Status:</span>
      <span class="value status-{connectionState?.status || 'disconnected'}">
        {connectionState?.status || 'disconnected'}
      </span>
    </div>
    <div class="status-item">
      <span class="label">Users:</span>
      <span class="value">{connectionState?.userCount || 0}</span>
    </div>
    <div class="status-item">
      <span class="label">Reconnects:</span>
      <span class="value">{connectionState?.reconnectAttempts || 0}</span>
    </div>
    {#if connectionState?.hasError}
      <div class="status-item error">
        <span class="label">Error:</span>
        <span class="value">{socketState?.lastError}</span>
      </div>
    {/if}
  </div>

  <!-- Connection Controls -->
  <div class="controls-panel">
    <h3>Connection Controls</h3>
    <div class="control-group">
      <label for="eventId">Event ID:</label>
      <input
        id="eventId"
        type="text"
        bind:value={eventId}
        disabled={connected}
        placeholder="Enter event ID"
      />
    </div>
    <div class="button-group">
      <button
        on:click={handleConnect}
        disabled={isConnecting || connected}
        class="btn primary"
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
      <button
        on:click={handleDisconnect}
        disabled={!connected}
        class="btn secondary"
      >
        Disconnect
      </button>
    </div>
  </div>

  <!-- Messages Log -->
  <div class="messages-panel">
    <div class="panel-header">
      <h3>Messages Log</h3>
      <button on:click={clearMessages} class="btn small">Clear</button>
    </div>
    <div class="messages">
      {#each testMessages as message, i}
        <div class="message" class:latest={i === testMessages.length - 1}>
          <span class="timestamp">{new Date().toLocaleTimeString()}</span>
          <span class="content">{message}</span>
        </div>
      {/each}
      {#if testMessages.length === 0}
        <div class="no-messages">No messages yet...</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .websocket-test {
    max-width: 800px;
    margin: 2rem auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
  }

  .status-panel,
  .controls-panel,
  .voting-panel,
  .activity-panel,
  .messages-panel {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .panel-header h3 {
    margin: 0;
  }

  .status-item {
    display: flex;
    margin-bottom: 0.5rem;
  }

  .status-item.error {
    color: #dc3545;
  }

  .label {
    font-weight: 600;
    min-width: 120px;
  }

  .value {
    font-family: 'Courier New', monospace;
  }

  .status-connected {
    color: #28a745;
    font-weight: bold;
  }

  .status-connecting {
    color: #ffc107;
    font-weight: bold;
  }

  .status-reconnecting {
    color: #fd7e14;
    font-weight: bold;
  }

  .status-disconnected {
    color: #dc3545;
    font-weight: bold;
  }

  .control-group {
    margin-bottom: 1rem;
  }

  .control-group label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  .control-group input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 1rem;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn.primary {
    background: #007bff;
    color: white;
  }

  .btn.primary:hover:not(:disabled) {
    background: #0056b3;
  }

  .btn.secondary {
    background: #6c757d;
    color: white;
  }

  .btn.secondary:hover:not(:disabled) {
    background: #545b62;
  }

  .btn.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    background: #e9ecef;
    color: #495057;
  }

  .messages {
    max-height: 300px;
    overflow-y: auto;
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 0.5rem;
  }

  .message {
    display: flex;
    margin-bottom: 0.5rem;
    padding: 0.25rem;
    border-radius: 3px;
  }

  .message.latest {
    background: #e3f2fd;
  }

  .timestamp {
    color: #6c757d;
    font-size: 0.75rem;
    min-width: 80px;
    font-family: 'Courier New', monospace;
  }

  .content {
    margin-left: 0.5rem;
  }

  .no-messages {
    text-align: center;
    color: #6c757d;
    font-style: italic;
    padding: 2rem;
  }

  h2, h3 {
    color: #495057;
    margin-top: 0;
  }
</style>"