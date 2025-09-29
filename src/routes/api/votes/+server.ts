import { json } from '@sveltejs/kit';
import { VoteRepository, TopicRepository } from '$lib/storage';
import { VoteWeight } from '../../../types/entities';
import { z } from 'zod';

// Initialize repositories
const voteRepository = new VoteRepository({
  dataDir: './data',
  enableBackups: true,
  backupRetention: 10
});

const topicRepository = new TopicRepository({
  dataDir: './data',
  enableBackups: true,
  backupRetention: 10
});

// Vote casting schema
const CastVoteSchema = z.object({
  userId: z.string(),
  topicId: z.string(),
  eventId: z.string(),
  weight: z.enum(['first', 'second', 'third'])
});

// Vote update schema
const UpdateVoteSchema = z.object({
  userId: z.string(),
  topicId: z.string(),
  weight: z.enum(['first', 'second', 'third'])
});

// Cast a new vote
export async function POST({ request }) {
  try {
    const body = await request.json();
    const validatedData = CastVoteSchema.parse(body);

    // Check if user has already voted for this topic
    const existingVote = await voteRepository.findUserVoteForTopic(
      validatedData.userId, 
      validatedData.topicId
    );

    if (existingVote.success) {
      return json({
        success: false,
        error: 'You have already voted for this topic. Use PUT to update your vote.'
      }, { status: 409 });
    }

    // Cast the vote
    const voteResult = await voteRepository.castVote(
      validatedData.userId,
      validatedData.topicId,
      validatedData.eventId,
      validatedData.weight as VoteWeight
    );

    if (!voteResult.success) {
      return json({
        success: false,
        error: voteResult.error?.message || 'Failed to cast vote'
      }, { status: 500 });
    }

    // Update topic statistics
    await updateTopicStats(validatedData.topicId);

    return json({
      success: true,
      vote: voteResult.data
    }, { status: 201 });

  } catch (error) {
    console.error('Vote casting error:', error);
    
    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }

    return json({
      success: false,
      error: 'Failed to cast vote'
    }, { status: 500 });
  }
}

// Update an existing vote
export async function PUT({ request }) {
  try {
    const body = await request.json();
    const validatedData = UpdateVoteSchema.parse(body);

    // Update the vote
    const updateResult = await voteRepository.updateVote(
      validatedData.userId,
      validatedData.topicId,
      validatedData.weight as VoteWeight
    );

    if (!updateResult.success) {
      return json({
        success: false,
        error: updateResult.error?.message || 'Failed to update vote'
      }, { status: 500 });
    }

    // Update topic statistics
    await updateTopicStats(validatedData.topicId);

    return json({
      success: true,
      vote: updateResult.data
    });

  } catch (error) {
    console.error('Vote update error:', error);
    
    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }

    return json({
      success: false,
      error: 'Failed to update vote'
    }, { status: 500 });
  }
}

// Get votes for a specific user and event
export async function GET({ url }) {
  try {
    const userId = url.searchParams.get('userId');
    const eventId = url.searchParams.get('eventId');
    const topicId = url.searchParams.get('topicId');

    if (!userId) {
      return json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    let result;

    if (topicId) {
      // Get user's vote for a specific topic
      result = await voteRepository.findUserVoteForTopic(userId, topicId);
    } else if (eventId) {
      // Get all user's votes in an event
      result = await voteRepository.findUserVotesInEvent(userId, eventId);
    } else {
      return json({
        success: false,
        error: 'Either eventId or topicId is required'
      }, { status: 400 });
    }

    if (!result.success) {
      return json({
        success: false,
        error: result.error?.message || 'Failed to fetch votes'
      }, { status: 500 });
    }

    return json({
      success: true,
      votes: Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
    });

  } catch (error) {
    console.error('Vote fetch error:', error);
    return json({
      success: false,
      error: 'Failed to fetch votes'
    }, { status: 500 });
  }
}

// Remove a vote
export async function DELETE({ request }) {
  try {
    const { userId, topicId } = await request.json();

    if (!userId || !topicId) {
      return json({
        success: false,
        error: 'User ID and Topic ID are required'
      }, { status: 400 });
    }

    const result = await voteRepository.removeVote(userId, topicId);

    if (!result.success) {
      return json({
        success: false,
        error: result.error?.message || 'Failed to remove vote'
      }, { status: 500 });
    }

    // Update topic statistics
    await updateTopicStats(topicId);

    return json({
      success: true,
      message: 'Vote removed successfully'
    });

  } catch (error) {
    console.error('Vote removal error:', error);
    return json({
      success: false,
      error: 'Failed to remove vote'
    }, { status: 500 });
  }
}

// Helper function to update topic statistics after voting changes
async function updateTopicStats(topicId: string) {
  try {
    // Get vote statistics for the topic
    const statsResult = await voteRepository.getTopicVoteStats(topicId);
    
    if (!statsResult.success || !statsResult.data) {
      console.error('Failed to get vote stats for topic:', topicId);
      return;
    }

    const stats = statsResult.data;

    // Update the topic with new statistics
    await topicRepository.update(topicId, {
      voteCount: stats.totalVotes,
      totalVoteWeight: stats.totalWeight,
      averageWeight: stats.averageWeight,
      lastVotedAt: new Date()
    });
  } catch (error) {
    console.error('Failed to update topic stats:', error);
  }
}