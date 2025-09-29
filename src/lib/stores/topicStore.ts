import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { socketStore } from '../websocket/client.js';
import type { Topic, TopicStatus } from '../types/entities.js';

// Topic store for managing topic state
export const topics = writable<Topic[]>([]);
export const selectedTopic = writable<Topic | null>(null);
export const topicFilters = writable({
  search: '',
  status: '' as TopicStatus | '',
  tags: [] as string[],
  sortBy: 'createdAt' as 'createdAt' | 'updatedAt' | 'title',
  sortOrder: 'desc' as 'asc' | 'desc'
});

// Derived store for filtered topics
export const filteredTopics = derived(
  [topics, topicFilters],
  ([$topics, $filters]) => {
    let filtered = [...$topics];
    
    // Apply search filter
    if ($filters.search) {
      const searchLower = $filters.search.toLowerCase();
      filtered = filtered.filter(topic =>
        topic.title.toLowerCase().includes(searchLower) ||
        topic.description.toLowerCase().includes(searchLower) ||
        topic.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply status filter
    if ($filters.status) {
      filtered = filtered.filter(topic => topic.status === $filters.status);
    }
    
    // Apply tag filters
    if ($filters.tags.length > 0) {
      filtered = filtered.filter(topic =>
        $filters.tags.some(filterTag => topic.tags.includes(filterTag))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number = a[$filters.sortBy];
      let bValue: string | number = b[$filters.sortBy];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }
      
      if ($filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return filtered;
  }
);

// Topic WebSocket event handlers
export const topicEvents = {
  // Handle new topic creation
  'topic_created': (data: { topic: Topic; eventId: string; userId: string }) => {
    topics.update(currentTopics => {
      const exists = currentTopics.find(t => t.id === data.topic.id);
      if (!exists) {
        return [...currentTopics, data.topic];
      }
      return currentTopics;
    });
  },
  
  // Handle topic updates
  'topic_updated': (data: { topic: Topic; eventId: string; userId: string }) => {
    topics.update(currentTopics =>
      currentTopics.map(topic =>
        topic.id === data.topic.id ? { ...topic, ...data.topic } : topic
      )
    );
    
    // Update selected topic if it's the one being updated
    selectedTopic.update(current =>
      current && current.id === data.topic.id ? { ...current, ...data.topic } : current
    );
  },
  
  // Handle topic status changes
  'topic_status_changed': (data: { topicId: string; status: TopicStatus; updatedAt: string; eventId: string; userId: string }) => {
    topics.update(currentTopics =>
      currentTopics.map(topic =>
        topic.id === data.topicId 
          ? { ...topic, status: data.status, updatedAt: data.updatedAt }
          : topic
      )
    );
    
    selectedTopic.update(current =>
      current && current.id === data.topicId
        ? { ...current, status: data.status, updatedAt: data.updatedAt }
        : current
    );
  },
  
  // Handle topic deletion
  'topic_deleted': (data: { topicId: string; eventId: string; userId: string }) => {
    topics.update(currentTopics =>
      currentTopics.filter(topic => topic.id !== data.topicId)
    );
    
    selectedTopic.update(current =>
      current && current.id === data.topicId ? null : current
    );
  }
};

// Topic store actions
export const topicActions = {
  // Load topics for an event
  async loadTopics(eventId: string): Promise<void> {
    if (!browser) return;
    
    try {
      const response = await fetch(`/api/topics?eventId=${eventId}`);
      if (response.ok) {
        const topicsData = await response.json();
        topics.set(topicsData);
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    }
  },
  
  // Create a new topic
  async createTopic(eventId: string, topicData: {
    title: string;
    description: string;
    tags: string[];
    userId: string;
    userName: string;
  }): Promise<Topic | null> {
    if (!browser) return null;
    
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...topicData
        })
      });
      
      if (response.ok) {
        const newTopic = await response.json();
        
        // Add to local store immediately for instant feedback
        topics.update(currentTopics => [...currentTopics, newTopic]);
        
        // Broadcast via WebSocket
        const ws = get(socketStore);
        if (ws?.socket) {
          ws.socket.emit('topic_create', { topic: newTopic });
        }
        
        return newTopic;
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
    }
    
    return null;
  },
  
  // Update a topic
  async updateTopic(topicId: string, updates: Partial<Topic>): Promise<boolean> {
    if (!browser) return false;
    
    try {
      const response = await fetch(`/api/topics/${topicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        const updatedTopic = await response.json();
        
        // Update local store
        topics.update(currentTopics =>
          currentTopics.map(topic =>
            topic.id === topicId ? updatedTopic : topic
          )
        );
        
        // Broadcast via WebSocket
        const ws = get(socketStore);
        if (ws?.socket) {
          ws.socket.emit('topic_update', { topic: updatedTopic });
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to update topic:', error);
    }
    
    return false;
  },
  
  // Change topic status
  async changeTopicStatus(topicId: string, status: TopicStatus): Promise<boolean> {
    if (!browser) return false;
    
    try {
      const response = await fetch(`/api/topics/${topicId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update local store
        topics.update(currentTopics =>
          currentTopics.map(topic =>
            topic.id === topicId 
              ? { ...topic, status: result.status, updatedAt: result.updatedAt }
              : topic
          )
        );
        
        // Broadcast via WebSocket
        const ws = get(socketStore);
        if (ws?.socket) {
          ws.socket.emit('topic_status_change', {
            topicId,
            status: result.status,
            updatedAt: result.updatedAt
          });
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to change topic status:', error);
    }
    
    return false;
  },
  
  // Delete a topic
  async deleteTopic(topicId: string): Promise<boolean> {
    if (!browser) return false;
    
    try {
      const response = await fetch(`/api/topics/${topicId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local store
        topics.update(currentTopics =>
          currentTopics.filter(topic => topic.id !== topicId)
        );
        
        // Broadcast via WebSocket
        const ws = get(socketStore);
        if (ws?.socket) {
          ws.socket.emit('topic_delete', { topicId });
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to delete topic:', error);
    }
    
    return false;
  },
  
  // Set filters
  setFilters(newFilters: Partial<typeof topicFilters>) {
    topicFilters.update(current => ({ ...current, ...newFilters }));
  },
  
  // Clear filters
  clearFilters() {
    topicFilters.set({
      search: '',
      status: '' as TopicStatus | '',
      tags: [],
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }
};

// Initialize WebSocket event listeners when the store is imported
if (browser) {
  socketStore.subscribe(ws => {
    if (ws?.socket) {
      // Register topic event handlers with proper typing
      ws.socket.off('topic_created').on('topic_created', topicEvents.topic_created);
      ws.socket.off('topic_updated').on('topic_updated', topicEvents.topic_updated);
      ws.socket.off('topic_status_changed').on('topic_status_changed', topicEvents.topic_status_changed);
      ws.socket.off('topic_deleted').on('topic_deleted', topicEvents.topic_deleted);
    }
  });
}