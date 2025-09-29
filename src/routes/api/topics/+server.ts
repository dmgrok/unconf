import { json } from '@sveltejs/kit';
import { TopicRepository } from '$lib/storage';
import type { Topic } from '../../../types/entities';
import { TopicStatus } from '../../../types/enums';
import { z } from 'zod';

// Initialize repository
const topicRepository = new TopicRepository({
  dataDir: './data',
  enableBackups: true,
  backupRetention: 10
});

// Topic creation schema
const CreateTopicSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  eventId: z.string(),
  submittedBy: z.string(),
  tags: z.array(z.string()).max(10).optional()
});

// Topic update schema
const UpdateTopicSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['draft', 'active', 'frozen', 'archived']).optional(),
  tags: z.array(z.string()).max(10).optional()
});

export async function POST({ request }) {
  try {
    const body = await request.json();
    const validatedData = CreateTopicSchema.parse(body);

    // Create new topic
    const newTopic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'> = {
      title: validatedData.title,
      description: validatedData.description,
      eventId: validatedData.eventId,
      submittedBy: validatedData.submittedBy,
      status: TopicStatus.DRAFT,
      tags: validatedData.tags || [],
      voteCount: 0,
      totalVoteWeight: 0,
      averageWeight: 0,
      lastVotedAt: undefined,
      metadata: {
        submissionTimestamp: new Date().toISOString(),
        editCount: 0
      }
    };

    const result = await topicRepository.create(newTopic);
    
    if (!result.success) {
      return json({
        success: false,
        error: result.error?.message || 'Failed to create topic'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      topic: result.data
    }, { status: 201 });

  } catch (error) {
    console.error('Topic creation error:', error);
    
    if (error instanceof z.ZodError) {
      return json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }

    return json({
      success: false,
      error: 'Failed to create topic'
    }, { status: 500 });
  }
}

export async function GET({ url }) {
  try {
    const eventId = url.searchParams.get('eventId');
    const status = url.searchParams.get('status') as 'draft' | 'active' | 'frozen' | 'archived' | null;
    const submittedBy = url.searchParams.get('submittedBy');
    const search = url.searchParams.get('search');
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean);
    
    let result;
    
    if (eventId && status) {
      // Get topics for specific event and status
      result = await topicRepository.findByEventAndStatus(eventId, status as TopicStatus);
    } else if (eventId) {
      // Get topics for specific event
      result = await topicRepository.findByEvent(eventId);
    } else if (submittedBy) {
      // Get topics by specific user
      result = await topicRepository.findBySubmitter(submittedBy);
    } else if (status) {
      // Get topics by status
      result = await topicRepository.findByStatus(status as TopicStatus);
    } else if (tags && tags.length > 0) {
      // Get topics by tags
      result = await topicRepository.findByTags(tags);
    } else {
      // Get all topics using findAll
      result = await topicRepository.findAll();
    }
    
    if (!result.success) {
      return json({
        success: false,
        error: 'Failed to fetch topics'
      }, { status: 500 });
    }
    
    let topics: Topic[] = result.data || [];
    
    // Apply client-side search filter if needed
    if (search) {
      const searchLower = search.toLowerCase();
      topics = topics.filter((topic: Topic) => 
        topic.title.toLowerCase().includes(searchLower) ||
        (topic.description && topic.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by creation date (newest first) by default
    topics.sort((a: Topic, b: Topic) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return json({
      success: true,
      topics,
      count: topics.length
    });

  } catch (error) {
    console.error('Topic fetch error:', error);
    return json({
      success: false,
      error: 'Failed to fetch topics'
    }, { status: 500 });
  }
}