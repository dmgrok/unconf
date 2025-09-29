import { json } from '@sveltejs/kit';
import { TopicRepository } from '$lib/storage';
import type { Topic } from '../../../../types/entities';
import { TopicStatus } from '../../../../types/enums';
import { z } from 'zod';

// Initialize repository
const topicRepository = new TopicRepository({
  dataDir: './data',
  enableBackups: true,
  backupRetention: 10
});

// Topic update schema
const UpdateTopicSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['draft', 'active', 'frozen', 'archived']).optional(),
  tags: z.array(z.string()).max(10).optional()
});

export async function GET({ params }) {
  try {
    const { topicId } = params;
    
    const result = await topicRepository.findById(topicId);
    if (!result.success) {
      return json({
        success: false,
        error: 'Topic not found'
      }, { status: 404 });
    }
    
    return json({
      success: true,
      topic: result.data
    });
  } catch (error) {
    console.error('Topic fetch error:', error);
    return json({
      success: false,
      error: 'Failed to fetch topic'
    }, { status: 500 });
  }
}

export async function PUT({ params, request }) {
  try {
    const { topicId } = params;
    const body = await request.json();
    const validatedData = UpdateTopicSchema.parse(body);
    const { userId } = body; // Should come from session in real app

    // Get current topic to check authorization
    const currentResult = await topicRepository.findById(topicId);
    if (!currentResult.success) {
      return json({
        success: false,
        error: 'Topic not found'
      }, { status: 404 });
    }
    
    const currentTopic = currentResult.data!;
    
    // Check authorization - only submitter can edit
    // In a real app, also check for organizer/admin roles
    if (currentTopic.submittedBy !== userId) {
      return json({
        success: false,
        error: 'Not authorized to edit this topic'
      }, { status: 403 });
    }
    
    // Prepare update data
    const updateData: Partial<Omit<Topic, 'id' | 'createdAt'>> = {};
    
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.tags) updateData.tags = validatedData.tags;
    
    // Update metadata
    updateData.metadata = {
      ...currentTopic.metadata,
      lastEditedAt: new Date().toISOString(),
      editCount: ((currentTopic.metadata?.editCount as number) || 0) + 1
    };
    
    const result = await topicRepository.update(topicId, updateData);
    
    if (!result.success) {
      return json({
        success: false,
        error: result.error?.message || 'Failed to update topic'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      topic: result.data
    });
    
  } catch (error) {
    console.error('Topic update error:', error);
    
    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }
    
    return json({
      success: false,
      error: 'Failed to update topic'
    }, { status: 500 });
  }
}

export async function DELETE({ params, request }) {
  try {
    const { topicId } = params;
    const body = await request.json();
    const { userId } = body; // Should come from session in real app
    
    // Get current topic to check authorization
    const currentResult = await topicRepository.findById(topicId);
    if (!currentResult.success) {
      return json({
        success: false,
        error: 'Topic not found'
      }, { status: 404 });
    }
    
    const currentTopic = currentResult.data!;
    
    // Check authorization - only submitter can delete (or admin/organizer)
    if (currentTopic.submittedBy !== userId) {
      return json({
        success: false,
        error: 'Not authorized to delete this topic'
      }, { status: 403 });
    }
    
    // Only allow deletion of draft topics for safety
    if (currentTopic.status !== TopicStatus.DRAFT) {
      return json({
        success: false,
        error: 'Only draft topics can be deleted'
      }, { status: 400 });
    }
    
    const result = await topicRepository.delete(topicId);
    
    if (!result.success) {
      return json({
        success: false,
        error: result.error?.message || 'Failed to delete topic'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      message: 'Topic deleted successfully'
    });
    
  } catch (error) {
    console.error('Topic deletion error:', error);
    return json({
      success: false,
      error: 'Failed to delete topic'
    }, { status: 500 });
  }
}