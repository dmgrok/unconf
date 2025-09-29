import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the lifecycle manager
const mockLifecycleManager = {
  start: vi.fn(),
  stop: vi.fn(),
  forceProcessing: vi.fn(),
  getMetrics: vi.fn(),
  getEventHealth: vi.fn(),
  isManagerRunning: vi.fn()
};

// Mock EventLifecycleManager module
vi.mock('$lib/services/eventLifecycle', () => {
  return {
    EventLifecycleManager: class {
      constructor() {
        return mockLifecycleManager;
      }
    }
  };
});

// Import the API module after mocking
let GET: (args: { url: URL }) => Promise<Response>;
let POST: (args: { request: Request }) => Promise<Response>;

describe('Lifecycle API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockLifecycleManager.isManagerRunning.mockReturnValue(true);
    mockLifecycleManager.getMetrics.mockReturnValue({
      totalEvents: 10,
      activeEvents: 3,
      completedEvents: 5,
      draftEvents: 2,
      pausedEvents: 0,
      eventsProcessed: 100,
      transitionsExecuted: 5,
      cleanupActions: 2,
      errors: 0,
      lastProcessingTime: new Date('2024-01-01T12:00:00Z')
    });
    mockLifecycleManager.getEventHealth.mockResolvedValue({
      eventId: 'event-1',
      status: 'active',
      health: 'healthy',
      issues: [],
      participantCount: 10,
      activityCount: 5,
      lastActivity: new Date('2024-01-01T12:00:00Z'),
      uptime: 3600000,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z')
    });

    // Dynamically import the API handlers
    const module = await import('../../../routes/api/lifecycle/+server');
    GET = module.GET;
    POST = module.POST;
  });

  describe('GET /api/lifecycle', () => {
    it('should return metrics when action=metrics', async () => {
      const url = new URL('http://localhost/api/lifecycle?action=metrics');
      const response = await GET({ url });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.metrics).toEqual(expect.objectContaining({
        totalEvents: 10,
        activeEvents: 3,
        completedEvents: 5
      }));
      expect(data.isRunning).toBe(true);
    });

    it('should return event health when action=health', async () => {
      const url = new URL('http://localhost/api/lifecycle?action=health&eventId=event-1');
      const response = await GET({ url });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.health).toEqual(expect.objectContaining({
        eventId: 'event-1',
        status: 'active',
        health: 'healthy'
      }));
    });

    it('should return error when health check missing eventId', async () => {
      const url = new URL('http://localhost/api/lifecycle?action=health');
      const response = await GET({ url });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('Event ID is required');
    });

    it('should return 404 when event health not found', async () => {
      mockLifecycleManager.getEventHealth.mockResolvedValue(null);
      
      const url = new URL('http://localhost/api/lifecycle?action=health&eventId=nonexistent');
      const response = await GET({ url });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('Event not found');
    });

    it('should return status when action=status', async () => {
      const url = new URL('http://localhost/api/lifecycle?action=status');
      const response = await GET({ url });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.isRunning).toBe(true);
      expect(data.status).toBe('running');
    });

    it('should return error for invalid action', async () => {
      const url = new URL('http://localhost/api/lifecycle?action=invalid');
      const response = await GET({ url });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid action');
    });
  });

  describe('POST /api/lifecycle', () => {
    it('should start manager when action=start', async () => {
      mockLifecycleManager.isManagerRunning.mockReturnValue(false);
      mockLifecycleManager.start.mockResolvedValue(undefined);
      
      const request = new Request('http://localhost/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      const response = await POST({ request });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toContain('started successfully');
      expect(mockLifecycleManager.start).toHaveBeenCalled();
    });

    it('should not start manager when already running', async () => {
      mockLifecycleManager.isManagerRunning.mockReturnValue(true);
      
      const request = new Request('http://localhost/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      const response = await POST({ request });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('already running');
      expect(mockLifecycleManager.start).not.toHaveBeenCalled();
    });

    it('should stop manager when action=stop', async () => {
      mockLifecycleManager.isManagerRunning.mockReturnValue(true);
      mockLifecycleManager.stop.mockResolvedValue(undefined);
      
      const request = new Request('http://localhost/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      const response = await POST({ request });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toContain('stopped successfully');
      expect(mockLifecycleManager.stop).toHaveBeenCalled();
    });

    it('should not stop manager when not running', async () => {
      mockLifecycleManager.isManagerRunning.mockReturnValue(false);
      
      const request = new Request('http://localhost/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      const response = await POST({ request });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('not running');
      expect(mockLifecycleManager.stop).not.toHaveBeenCalled();
    });

    it('should force processing when action=force-processing', async () => {
      mockLifecycleManager.isManagerRunning.mockReturnValue(true);
      mockLifecycleManager.forceProcessing.mockResolvedValue(undefined);
      
      const request = new Request('http://localhost/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force-processing' })
      });
      
      const response = await POST({ request });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toContain('completed');
      expect(mockLifecycleManager.forceProcessing).toHaveBeenCalled();
    });

    it('should not force processing when manager not running', async () => {
      mockLifecycleManager.isManagerRunning.mockReturnValue(false);
      
      const request = new Request('http://localhost/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force-processing' })
      });
      
      const response = await POST({ request });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('not running');
      expect(mockLifecycleManager.forceProcessing).not.toHaveBeenCalled();
    });

    it('should return error for invalid action', async () => {
      const request = new Request('http://localhost/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid' })
      });
      
      const response = await POST({ request });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid action');
    });

    it('should handle manager errors gracefully', async () => {
      mockLifecycleManager.isManagerRunning.mockReturnValue(false);
      mockLifecycleManager.start.mockRejectedValue(new Error('Manager error'));
      
      const request = new Request('http://localhost/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      const response = await POST({ request });
      
      expect(response.status).toBe(500);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});