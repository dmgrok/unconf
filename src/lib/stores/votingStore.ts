import { writable } from 'svelte/store';
import type { VoteWeight } from '../../types/entities';

interface UserVote {
  topicId: string;
  weight: VoteWeight;
  timestamp: Date;
}

interface VoteData {
  topicId: string;
  weight: VoteWeight;
  timestamp: string;
}

interface VotingState {
  userVotes: Map<string, UserVote>; // topicId -> UserVote
  loading: boolean;
  error: string | null;
}

// Create the store
function createVotingStore() {
  const { subscribe, set, update } = writable<VotingState>({
    userVotes: new Map(),
    loading: false,
    error: null
  });

  return {
    subscribe,
    
    // Load user votes for an event
    async loadUserVotes(userId: string, eventId: string) {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await fetch(`/api/votes?userId=${userId}&eventId=${eventId}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load votes');
        }
        
        const votesMap = new Map();
        result.votes.forEach((vote: VoteData) => {
          votesMap.set(vote.topicId, {
            topicId: vote.topicId,
            weight: vote.weight,
            timestamp: new Date(vote.timestamp)
          });
        });
        
        update(state => ({
          ...state,
          userVotes: votesMap,
          loading: false
        }));
        
      } catch (error) {
        update(state => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load votes'
        }));
      }
    },
    
    // Update a vote in the store
    updateVote(topicId: string, weight: VoteWeight) {
      update(state => {
        const newVotes = new Map(state.userVotes);
        newVotes.set(topicId, {
          topicId,
          weight,
          timestamp: new Date()
        });
        
        return {
          ...state,
          userVotes: newVotes
        };
      });
    },
    
    // Remove a vote from the store
    removeVote(topicId: string) {
      update(state => {
        const newVotes = new Map(state.userVotes);
        newVotes.delete(topicId);
        
        return {
          ...state,
          userVotes: newVotes
        };
      });
    },
    
    // Get a user's vote for a specific topic
    getUserVote(topicId: string): VoteWeight | null {
      let userVote: VoteWeight | null = null;
      
      const unsubscribe = subscribe(state => {
        userVote = state.userVotes.get(topicId)?.weight || null;
      });
      
      unsubscribe();
      return userVote;
    },
    
    // Clear all votes
    clear() {
      set({
        userVotes: new Map(),
        loading: false,
        error: null
      });
    }
  };
}

export const votingStore = createVotingStore();