import { json } from '@sveltejs/kit';
import { TopicRepository } from '$lib/storage';
import { TopicStatus } from '../../../../../types/enums';
import { z } from 'zod';

// Initialize repository
const topicRepository = new TopicRepository({
  dataDir: './data',
  enableBackups: true,
  backupRetention: 10
});

// Status update schema
const StatusUpdateSchema = z.object({
  status: z.enum(['draft', 'active', 'frozen', 'archived']),
  userId: z.string()
});

// Define valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  [TopicStatus.DRAFT]: [TopicStatus.ACTIVE],
  [TopicStatus.ACTIVE]: [TopicStatus.FROZEN, TopicStatus.ARCHIVED],
  [TopicStatus.FROZEN]: [TopicStatus.ACTIVE, TopicStatus.ARCHIVED],
  [TopicStatus.ARCHIVED]: [] // Terminal state
};

function isValidTransition(from: string, to: string): boolean {
  const validNext = VALID_TRANSITIONS[from];
  return validNext ? validNext.includes(to) : false;
}

export async function PUT({ params, request }) {
  try {
    const { topicId } = params;
    const body = await request.json();
    const validatedData = StatusUpdateSchema.parse(body);
    
    // Get current topic state
    const topicResult = await topicRepository.findById(topicId);
    if (!topicResult.success) {
      return json({
        success: false,
        error: 'Topic not found'
      }, { status: 404 });
    }
    
    const topic = topicResult.data!;
    const newStatus = validatedData.status;
    
    // Check authorization - only submitter or organizers can change status
    // In a real app, you'd also check for organizer/admin roles from session
    if (topic.submittedBy !== validatedData.userId) {
      return json({
        success: false,
        error: 'Not authorized to change topic status'
      }, { status: 403 });
    }
    
    // Validate transition
    if (topic.status !== newStatus && !isValidTransition(topic.status, newStatus)) {
      return json({
        success: false,
        error: `Invalid status transition from '${topic.status}' to '${newStatus}'`,
        validTransitions: VALID_TRANSITIONS[topic.status] || []
      }, { status: 400 });
    }
    
    // Update the topic status
    const result = await topicRepository.updateStatus(topicId, newStatus as TopicStatus);
    
    if (!result.success) {
      return json({
        success: false,
        error: result.error?.message || 'Failed to update topic status'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      topic: result.data,
      message: `Topic status changed to '${newStatus}'`
    });
    
  } catch (error) {
    console.error('Status update error:', error);
    
    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }
    
    return json({
      success: false,
      error: 'Failed to update topic status'
    }, { status: 500 });
  }
}

export async function GET({ params }) {
  try {
    const { topicId } = params;
    
    // Get current topic state
    const topicResult = await topicRepository.findById(topicId);
    if (!topicResult.success) {
      return json({
        success: false,
        error: 'Topic not found'
      }, { status: 404 });
    }
    
    const topic = topicResult.data!;
    
    return json({
      success: true,
      currentStatus: topic.status,
      validTransitions: VALID_TRANSITIONS[topic.status] || [],
      voteStats: {
        voteCount: topic.voteCount,
        totalVoteWeight: topic.totalVoteWeight,
        averageWeight: topic.averageWeight,
        lastVotedAt: topic.lastVotedAt
      }
    });
    
  } catch (error) {
    console.error('Status fetch error:', error);
    return json({
      success: false,
      error: 'Failed to fetch topic status'
    }, { status: 500 });
  }
}