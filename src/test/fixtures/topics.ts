import type { TopicStatus, VoteWeight } from '../../types/enums';

export interface MockTopic {
	id: string;
	title: string;
	description: string;
	eventId: string;
	authorId: string;
	status: TopicStatus;
	voteCount: number;
	totalWeight: number;
	averageWeight: number;
	createdAt: string;
	updatedAt: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
}

export interface MockVote {
	id: string;
	topicId: string;
	userId: string;
	weight: VoteWeight;
	eventId: string;
	createdAt: string;
}

export const mockTopics: Record<string, MockTopic> = {
	topic1: {
		id: 'topic-001',
		title: 'Building Scalable Microservices',
		description: 'Discussion on best practices for designing and implementing scalable microservice architectures, including service discovery, load balancing, and inter-service communication.',
		eventId: 'event-active-001',
		authorId: 'participant-1',
		status: 'active' as TopicStatus,
		voteCount: 8,
		totalWeight: 19, // Mix of first (3), second (2), third (1) votes
		averageWeight: 2.375,
		createdAt: new Date('2024-01-15T11:30:00Z').toISOString(),
		updatedAt: new Date('2024-01-15T12:15:00Z').toISOString(),
		tags: ['microservices', 'architecture', 'scalability'],
		metadata: {
			complexity: 'advanced',
			duration: '45-60 minutes',
			audience: 'backend developers'
		}
	},

	topic2: {
		id: 'topic-002',
		title: 'AI Ethics in Product Development',
		description: 'Exploring ethical considerations when integrating AI/ML into consumer products, including bias detection, transparency, and user consent.',
		eventId: 'event-active-001',
		authorId: 'participant-2',
		status: 'active' as TopicStatus,
		voteCount: 12,
		totalWeight: 28,
		averageWeight: 2.33,
		createdAt: new Date('2024-01-15T11:45:00Z').toISOString(),
		updatedAt: new Date('2024-01-15T12:20:00Z').toISOString(),
		tags: ['ai', 'ethics', 'product-development'],
		metadata: {
			complexity: 'intermediate',
			duration: '30-45 minutes',
			audience: 'product managers, developers'
		}
	},

	topic3: {
		id: 'topic-003',
		title: 'Remote Team Collaboration Tools',
		description: 'Sharing experiences and recommendations for tools and practices that enhance remote team productivity and communication.',
		eventId: 'event-active-001',
		authorId: 'facilitator-1',
		status: 'active' as TopicStatus,
		voteCount: 6,
		totalWeight: 11,
		averageWeight: 1.83,
		createdAt: new Date('2024-01-15T12:00:00Z').toISOString(),
		updatedAt: new Date('2024-01-15T12:10:00Z').toISOString(),
		tags: ['remote-work', 'collaboration', 'tools'],
		metadata: {
			complexity: 'beginner',
			duration: '30 minutes',
			audience: 'team leads, managers'
		}
	},

	topic4: {
		id: 'topic-004',
		title: 'Climate Tech Innovation',
		description: 'Discussing emerging technologies and business models addressing climate change, from carbon capture to renewable energy solutions.',
		eventId: 'event-active-001',
		authorId: 'organizer-1',
		status: 'draft' as TopicStatus,
		voteCount: 3,
		totalWeight: 7,
		averageWeight: 2.33,
		createdAt: new Date('2024-01-15T12:30:00Z').toISOString(),
		updatedAt: new Date('2024-01-15T12:35:00Z').toISOString(),
		tags: ['climate', 'sustainability', 'innovation'],
		metadata: {
			complexity: 'intermediate',
			duration: '60 minutes',
			audience: 'entrepreneurs, engineers'
		}
	},

	topic5: {
		id: 'topic-005',
		title: 'Quantum Computing Applications',
		description: 'Exploring practical applications of quantum computing in various industries and the current state of quantum software development.',
		eventId: 'event-large-005',
		authorId: 'participant-3',
		status: 'active' as TopicStatus,
		voteCount: 15,
		totalWeight: 38,
		averageWeight: 2.53,
		createdAt: new Date('2024-01-12T09:15:00Z').toISOString(),
		updatedAt: new Date('2024-01-12T10:45:00Z').toISOString(),
		tags: ['quantum-computing', 'hardware', 'algorithms'],
		metadata: {
			complexity: 'advanced',
			duration: '75 minutes',
			audience: 'researchers, advanced developers'
		}
	}
};

export const mockVotes: MockVote[] = [
	{
		id: 'vote-001',
		topicId: 'topic-001',
		userId: 'participant-1',
		weight: 'first' as VoteWeight,
		eventId: 'event-active-001',
		createdAt: new Date('2024-01-15T11:35:00Z').toISOString()
	},
	{
		id: 'vote-002',
		topicId: 'topic-001',
		userId: 'participant-2',
		weight: 'second' as VoteWeight,
		eventId: 'event-active-001',
		createdAt: new Date('2024-01-15T11:40:00Z').toISOString()
	},
	{
		id: 'vote-003',
		topicId: 'topic-002',
		userId: 'participant-1',
		weight: 'first' as VoteWeight,
		eventId: 'event-active-001',
		createdAt: new Date('2024-01-15T11:50:00Z').toISOString()
	},
	{
		id: 'vote-004',
		topicId: 'topic-002',
		userId: 'facilitator-1',
		weight: 'second' as VoteWeight,
		eventId: 'event-active-001',
		createdAt: new Date('2024-01-15T12:05:00Z').toISOString()
	},
	{
		id: 'vote-005',
		topicId: 'topic-003',
		userId: 'participant-2',
		weight: 'third' as VoteWeight,
		eventId: 'event-active-001',
		createdAt: new Date('2024-01-15T12:15:00Z').toISOString()
	}
];

// Topic factory functions
export function createMockTopic(overrides: Partial<MockTopic> = {}): MockTopic {
	const baseTopic = mockTopics.topic1;
	const timestamp = new Date().toISOString();

	return {
		...baseTopic,
		id: `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		createdAt: timestamp,
		updatedAt: timestamp,
		...overrides
	};
}

export function createMockVote(overrides: Partial<MockVote> = {}): MockVote {
	const timestamp = new Date().toISOString();

	return {
		id: `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		topicId: 'topic-001',
		userId: 'participant-1',
		weight: 'first' as VoteWeight,
		eventId: 'event-active-001',
		createdAt: timestamp,
		...overrides
	};
}

// Topic generators for specific scenarios
export const topicScenarios = {
	// Popular topic with many votes
	popular: () => createMockTopic({
		title: 'Popular Tech Topic',
		voteCount: 25,
		totalWeight: 65,
		averageWeight: 2.6,
		status: 'active' as TopicStatus
	}),

	// Controversial topic with mixed votes
	controversial: () => createMockTopic({
		title: 'Controversial Industry Topic',
		voteCount: 20,
		totalWeight: 30, // Many third-place votes
		averageWeight: 1.5,
		status: 'active' as TopicStatus
	}),

	// New topic with no votes yet
	fresh: () => createMockTopic({
		title: 'Brand New Topic',
		voteCount: 0,
		totalWeight: 0,
		averageWeight: 0,
		status: 'draft' as TopicStatus,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	}),

	// Technical deep-dive topic
	technical: () => createMockTopic({
		title: 'Advanced Technical Deep Dive',
		description: 'Deep technical discussion requiring advanced knowledge',
		tags: ['advanced', 'technical', 'deep-dive'],
		metadata: {
			complexity: 'expert',
			duration: '90 minutes',
			prerequisites: 'Advanced knowledge required'
		}
	}),

	// Beginner-friendly topic
	beginner: () => createMockTopic({
		title: 'Introduction to Technology',
		description: 'Beginner-friendly introduction and Q&A session',
		tags: ['beginner', 'introduction', 'basics'],
		metadata: {
			complexity: 'beginner',
			duration: '30 minutes',
			prerequisites: 'None'
		}
	}),

	// Workshop-style topic
	workshop: () => createMockTopic({
		title: 'Hands-on Workshop',
		description: 'Interactive workshop with practical exercises',
		tags: ['workshop', 'hands-on', 'interactive'],
		metadata: {
			complexity: 'intermediate',
			duration: '120 minutes',
			format: 'workshop',
			materials: 'Laptop required'
		}
	})
};

// Voting scenarios
export const voteScenarios = {
	// Generate votes for a popular topic
	popularTopic: (topicId: string, eventId: string) => {
		const weights: VoteWeight[] = ['first', 'second', 'third'];
		const votes: MockVote[] = [];

		for (let i = 0; i < 20; i++) {
			const weight = weights[i % 3];
			votes.push(createMockVote({
				topicId,
				eventId,
				userId: `user-${i + 1}`,
				weight
			}));
		}

		return votes;
	},

	// Generate votes heavily favoring a topic
	landslide: (topicId: string, eventId: string) => {
		const votes: MockVote[] = [];

		for (let i = 0; i < 15; i++) {
			votes.push(createMockVote({
				topicId,
				eventId,
				userId: `user-${i + 1}`,
				weight: 'first' as VoteWeight
			}));
		}

		return votes;
	},

	// Generate mixed voting pattern
	mixed: (topicId: string, eventId: string) => {
		const votes: MockVote[] = [];
		const pattern = [
			{ weight: 'first' as VoteWeight, count: 5 },
			{ weight: 'second' as VoteWeight, count: 8 },
			{ weight: 'third' as VoteWeight, count: 4 }
		];

		let userId = 1;
		pattern.forEach(({ weight, count }) => {
			for (let i = 0; i < count; i++) {
				votes.push(createMockVote({
					topicId,
					eventId,
					userId: `user-${userId++}`,
					weight
				}));
			}
		});

		return votes;
	}
};

// Utility functions
export function getTopicsByEvent(eventId: string): MockTopic[] {
	return Object.values(mockTopics).filter(topic => topic.eventId === eventId);
}

export function getTopicsByAuthor(authorId: string): MockTopic[] {
	return Object.values(mockTopics).filter(topic => topic.authorId === authorId);
}

export function getTopicsByStatus(status: TopicStatus): MockTopic[] {
	return Object.values(mockTopics).filter(topic => topic.status === status);
}

export function getVotesByTopic(topicId: string): MockVote[] {
	return mockVotes.filter(vote => vote.topicId === topicId);
}

export function getVotesByUser(userId: string): MockVote[] {
	return mockVotes.filter(vote => vote.userId === userId);
}

export function calculateTopicStats(topicId: string): { voteCount: number; totalWeight: number; averageWeight: number } {
	const votes = getVotesByTopic(topicId);
	const voteCount = votes.length;
	const totalWeight = votes.reduce((sum, vote) => {
		switch (vote.weight) {
			case 'first': return sum + 3;
			case 'second': return sum + 2;
			case 'third': return sum + 1;
			default: return sum;
		}
	}, 0);
	const averageWeight = voteCount > 0 ? totalWeight / voteCount : 0;

	return { voteCount, totalWeight, averageWeight };
}