/**
 * Test suite for Discussion Group Assignment System
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DiscussionGroupAssignmentService } from './discussionGroupAssignment';
import { discussionGroupValidationService } from './discussionGroupValidationService';
import type { User, Vote, Topic, DiscussionRoom, AssignmentSettings } from '../../types/entities';
import { VoteWeight, DiscussionRoomStatus } from '../../types/enums';

// Test data generators
function createUser(id: string, name: string): User {
	return {
		id,
		name,
		email: `${id}@test.com`,
		role: 'participant' as any,
		isGuest: false,
		currentEventId: 'event-1',
		lastActiveAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

function createTopic(id: string, title: string): Topic {
	return {
		id,
		title,
		description: `Description for ${title}`,
		eventId: 'event-1',
		submittedBy: 'user-1',
		status: 'active' as any,
		voteCount: 0,
		totalVoteWeight: 0,
		averageWeight: 0,
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

function createVote(userId: string, topicId: string, weight: VoteWeight): Vote {
	return {
		id: `vote-${userId}-${topicId}`,
		userId,
		topicId,
		eventId: 'event-1',
		weight,
		timestamp: new Date(),
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

function createRoom(id: string, topicId: string, capacity: number = 10): DiscussionRoom {
	return {
		id,
		eventId: 'event-1',
		topicId,
		name: `Room for ${topicId}`,
		capacity,
		currentOccupancy: 0,
		status: DiscussionRoomStatus.ACTIVE,
		assignedParticipants: [],
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

const defaultSettings: AssignmentSettings = {
	maxRoomCapacity: 10,
	minRoomSize: 3,
	allowOverflow: true,
	preferenceWeights: {
		first: 3,
		second: 2,
		third: 1
	},
	fairnessEnabled: true,
	manualOverrideEnabled: true
};

describe('DiscussionGroupAssignmentService', () => {
	let service: DiscussionGroupAssignmentService;

	beforeEach(() => {
		service = new DiscussionGroupAssignmentService();
	});

	describe('Basic Assignment Scenarios', () => {
		test('should assign participants to their first choice when capacity allows', async () => {
			// Setup: 3 participants, 3 topics, each participant votes for different topics
			const participants = [
				createUser('user-1', 'Alice'),
				createUser('user-2', 'Bob'),
				createUser('user-3', 'Charlie')
			];

			const topics = [
				createTopic('topic-1', 'AI Ethics'),
				createTopic('topic-2', 'Climate Tech'),
				createTopic('topic-3', 'Future of Work')
			];

			const votes = [
				createVote('user-1', 'topic-1', VoteWeight.FIRST),
				createVote('user-2', 'topic-2', VoteWeight.FIRST),
				createVote('user-3', 'topic-3', VoteWeight.FIRST)
			];

			const rooms = [
				createRoom('room-1', 'topic-1', 5),
				createRoom('room-2', 'topic-2', 5),
				createRoom('room-3', 'topic-3', 5)
			];

			const result = await service.generateAssignments(
				participants,
				votes,
				topics,
				rooms,
				defaultSettings
			);

			expect(result.assignments).toHaveLength(3);
			expect(result.unassigned).toHaveLength(0);

			// Each participant should get their first choice
			result.assignments.forEach(assignment => {
				expect(assignment.preferenceRank).toBe(1);
			});

			expect(result.results.preferenceDistribution.firstChoice).toBe(3);
		});

		test('should handle capacity constraints and assign to lower preferences', async () => {
			// Setup: 4 participants all want the same topic, but room capacity is 2
			const participants = [
				createUser('user-1', 'Alice'),
				createUser('user-2', 'Bob'),
				createUser('user-3', 'Charlie'),
				createUser('user-4', 'David')
			];

			const topics = [
				createTopic('topic-1', 'Popular Topic'),
				createTopic('topic-2', 'Less Popular Topic')
			];

			const votes = [
				// All users prefer topic-1 first, topic-2 second
				createVote('user-1', 'topic-1', VoteWeight.FIRST),
				createVote('user-1', 'topic-2', VoteWeight.SECOND),
				createVote('user-2', 'topic-1', VoteWeight.FIRST),
				createVote('user-2', 'topic-2', VoteWeight.SECOND),
				createVote('user-3', 'topic-1', VoteWeight.FIRST),
				createVote('user-3', 'topic-2', VoteWeight.SECOND),
				createVote('user-4', 'topic-1', VoteWeight.FIRST),
				createVote('user-4', 'topic-2', VoteWeight.SECOND)
			];

			const rooms = [
				createRoom('room-1', 'topic-1', 2), // Limited capacity
				createRoom('room-2', 'topic-2', 5)
			];

			const result = await service.generateAssignments(
				participants,
				votes,
				topics,
				rooms,
				defaultSettings
			);

			expect(result.assignments).toHaveLength(4);
			expect(result.unassigned).toHaveLength(0);

			// Check that some got first choice, others second choice
			const firstChoiceCount = result.assignments.filter(a => a.preferenceRank === 1).length;
			const secondChoiceCount = result.assignments.filter(a => a.preferenceRank === 2).length;

			expect(firstChoiceCount).toBe(2); // Only 2 can fit in room-1
			expect(secondChoiceCount).toBe(2); // Others go to room-2
		});

		test('should handle participants with no votes', async () => {
			const participants = [
				createUser('user-1', 'Alice'),
				createUser('user-2', 'Bob'), // No votes
				createUser('user-3', 'Charlie')
			];

			const topics = [
				createTopic('topic-1', 'AI Ethics'),
				createTopic('topic-2', 'Climate Tech')
			];

			const votes = [
				createVote('user-1', 'topic-1', VoteWeight.FIRST),
				createVote('user-3', 'topic-2', VoteWeight.FIRST)
				// user-2 has no votes
			];

			const rooms = [
				createRoom('room-1', 'topic-1', 5),
				createRoom('room-2', 'topic-2', 5)
			];

			const result = await service.generateAssignments(
				participants,
				votes,
				topics,
				rooms,
				defaultSettings
			);

			// Should still assign user-2 somewhere (overflow logic)
			expect(result.assignments).toHaveLength(3);

			const user2Assignment = result.assignments.find(a => a.userId === 'user-2');
			expect(user2Assignment).toBeDefined();
			expect(user2Assignment?.preferenceRank).toBeUndefined();
		});
	});

	describe('Edge Cases and Constraints', () => {
		test('should validate assignment constraints', () => {
			const participants = [createUser('user-1', 'Alice')];
			const rooms = [createRoom('room-1', 'topic-1', 2)];

			const assignments = [
				{
					id: 'assignment-1',
					eventId: 'event-1',
					userId: 'user-1',
					roomId: 'room-1',
					topicId: 'topic-1',
					assignmentRound: 1,
					assignmentMethod: 'automatic' as any,
					assignedAt: new Date(),
					status: 'assigned' as any,
					createdAt: new Date(),
					updatedAt: new Date()
				},
				{
					id: 'assignment-2',
					eventId: 'event-1',
					userId: 'user-1', // Same user assigned twice!
					roomId: 'room-1',
					topicId: 'topic-1',
					assignmentRound: 1,
					assignmentMethod: 'automatic' as any,
					assignedAt: new Date(),
					status: 'assigned' as any,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			];

			const validation = service.validateAssignmentConstraints(
				assignments,
				rooms,
				defaultSettings
			);

			expect(validation.isValid).toBe(false);
			expect(validation.violations).toContain(
				expect.stringContaining('User user-1 assigned to multiple rooms')
			);
		});

		test('should handle overflow when no preferences can be satisfied', async () => {
			const participants = [
				createUser('user-1', 'Alice'),
				createUser('user-2', 'Bob')
			];

			const topics = [
				createTopic('topic-1', 'Topic 1'),
				createTopic('topic-2', 'Topic 2')
			];

			// Users vote for topics that don't have rooms
			const votes = [
				createVote('user-1', 'topic-3', VoteWeight.FIRST), // Non-existent topic
				createVote('user-2', 'topic-3', VoteWeight.FIRST)
			];

			const rooms = [
				createRoom('room-1', 'topic-1', 5),
				createRoom('room-2', 'topic-2', 5)
			];

			const result = await service.generateAssignments(
				participants,
				votes,
				topics,
				rooms,
				defaultSettings
			);

			// Should still assign participants to available rooms via overflow
			if (defaultSettings.allowOverflow) {
				expect(result.assignments.length).toBeGreaterThan(0);
			}
		});

		test('should handle empty inputs gracefully', async () => {
			const result = await service.generateAssignments(
				[], // No participants
				[],
				[],
				[],
				defaultSettings
			);

			expect(result.assignments).toHaveLength(0);
			expect(result.unassigned).toHaveLength(0);
			expect(result.results.totalSatisfactionScore).toBe(0);
		});
	});

	describe('Algorithm Optimization', () => {
		test('should maximize satisfaction score when possible', async () => {
			const participants = [
				createUser('user-1', 'Alice'),
				createUser('user-2', 'Bob'),
				createUser('user-3', 'Charlie')
			];

			const topics = [
				createTopic('topic-1', 'High Demand Topic'),
				createTopic('topic-2', 'Medium Demand Topic'),
				createTopic('topic-3', 'Low Demand Topic')
			];

			const votes = [
				// User 1: prefers topic-1 (3 points)
				createVote('user-1', 'topic-1', VoteWeight.FIRST),
				createVote('user-1', 'topic-2', VoteWeight.SECOND),
				// User 2: prefers topic-2 (2 points for second choice)
				createVote('user-2', 'topic-1', VoteWeight.SECOND),
				createVote('user-2', 'topic-2', VoteWeight.FIRST),
				// User 3: prefers topic-3 (3 points)
				createVote('user-3', 'topic-3', VoteWeight.FIRST)
			];

			const rooms = [
				createRoom('room-1', 'topic-1', 1), // Only 1 spot
				createRoom('room-2', 'topic-2', 2),
				createRoom('room-3', 'topic-3', 1)
			];

			const result = await service.generateAssignments(
				participants,
				votes,
				topics,
				rooms,
				defaultSettings
			);

			// Algorithm should prioritize higher satisfaction scores
			// User 1 should get topic-1 (3 points) and User 3 should get topic-3 (3 points)
			// User 2 should get topic-2 (3 points for first choice)
			expect(result.results.totalSatisfactionScore).toBe(9); // 3 + 3 + 3
		});

		test('should handle complex preference scenarios', async () => {
			// Larger test with 10 participants, 4 topics, varying preferences
			const participants = Array.from({ length: 10 }, (_, i) =>
				createUser(`user-${i + 1}`, `User ${i + 1}`)
			);

			const topics = [
				createTopic('topic-1', 'AI & Machine Learning'),
				createTopic('topic-2', 'Sustainable Technology'),
				createTopic('topic-3', 'Future of Education'),
				createTopic('topic-4', 'Digital Privacy')
			];

			// Create diverse voting patterns
			const votes = participants.flatMap(participant => {
				const userId = participant.id;
				const userNum = parseInt(userId.split('-')[1]);

				// Different voting patterns based on user number
				if (userNum <= 4) {
					// First 4 users prefer topic-1
					return [
						createVote(userId, 'topic-1', VoteWeight.FIRST),
						createVote(userId, 'topic-2', VoteWeight.SECOND),
						createVote(userId, 'topic-3', VoteWeight.THIRD)
					];
				} else if (userNum <= 7) {
					// Next 3 users prefer topic-2
					return [
						createVote(userId, 'topic-2', VoteWeight.FIRST),
						createVote(userId, 'topic-3', VoteWeight.SECOND),
						createVote(userId, 'topic-4', VoteWeight.THIRD)
					];
				} else {
					// Last 3 users have mixed preferences
					return [
						createVote(userId, 'topic-3', VoteWeight.FIRST),
						createVote(userId, 'topic-4', VoteWeight.SECOND),
						createVote(userId, 'topic-1', VoteWeight.THIRD)
					];
				}
			});

			const rooms = [
				createRoom('room-1', 'topic-1', 3), // Smaller than demand
				createRoom('room-2', 'topic-2', 4),
				createRoom('room-3', 'topic-3', 3),
				createRoom('room-4', 'topic-4', 2)
			];

			const result = await service.generateAssignments(
				participants,
				votes,
				topics,
				rooms,
				defaultSettings
			);

			expect(result.assignments).toHaveLength(10); // All should be assigned
			expect(result.unassigned).toHaveLength(0);

			// Validate the assignment makes sense
			const validation = service.validateAssignmentConstraints(
				result.assignments,
				rooms,
				defaultSettings
			);

			expect(validation.isValid).toBe(true);
			expect(validation.violations).toHaveLength(0);

			// Check room capacity constraints
			rooms.forEach(room => {
				const assignmentsInRoom = result.assignments.filter(a => a.roomId === room.id);
				expect(assignmentsInRoom.length).toBeLessThanOrEqual(room.capacity);
			});
		});
	});

	describe('Integration with Validation Service', () => {
		test('should validate assignments comprehensively', async () => {
			const participants = [
				createUser('user-1', 'Alice'),
				createUser('user-2', 'Bob'),
				createUser('user-3', 'Charlie'),
				createUser('user-4', 'David')
			];

			const topics = [
				createTopic('topic-1', 'Topic 1'),
				createTopic('topic-2', 'Topic 2')
			];

			const votes = [
				createVote('user-1', 'topic-1', VoteWeight.FIRST),
				createVote('user-2', 'topic-1', VoteWeight.FIRST),
				createVote('user-3', 'topic-2', VoteWeight.FIRST),
				createVote('user-4', 'topic-2', VoteWeight.FIRST)
			];

			const rooms = [
				createRoom('room-1', 'topic-1', 2),
				createRoom('room-2', 'topic-2', 2)
			];

			const result = await service.generateAssignments(
				participants,
				votes,
				topics,
				rooms,
				defaultSettings
			);

			const validation = discussionGroupValidationService.validateAssignments(
				result.assignments,
				rooms,
				participants,
				votes,
				topics,
				defaultSettings
			);

			expect(validation.isValid).toBe(true);
			expect(validation.errors).toHaveLength(0);
			expect(validation.metrics.assignmentRate).toBe(1.0); // 100% assigned
			expect(validation.metrics.averageSatisfactionScore).toBe(3.0); // All first choices
		});
	});
});

describe('Rebalancing and Optimization', () => {
	let service: DiscussionGroupAssignmentService;

	beforeEach(() => {
		service = new DiscussionGroupAssignmentService();
	});

	test('should identify rebalancing opportunities', async () => {
		// Setup initial suboptimal assignments
		const currentAssignments = [
			{
				id: 'assignment-1',
				eventId: 'event-1',
				userId: 'user-1',
				roomId: 'room-2', // User-1 is in room-2 (second choice)
				topicId: 'topic-2',
				assignmentRound: 1,
				assignmentMethod: 'automatic' as any,
				assignedAt: new Date(),
				status: 'assigned' as any,
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: { satisfactionScore: 2 }
			}
		];

		const preferences = [
			{
				userId: 'user-1',
				preferences: [
					{ topicId: 'topic-1', weight: VoteWeight.FIRST, points: 3 },
					{ topicId: 'topic-2', weight: VoteWeight.SECOND, points: 2 }
				]
			}
		];

		const rooms = [
			createRoom('room-1', 'topic-1', 5), // Now has space
			createRoom('room-2', 'topic-2', 5)
		];

		// Simulate room-1 now having available space
		rooms[0].currentOccupancy = 2; // Less than capacity

		const improvements = await service.rebalanceAssignments(
			currentAssignments,
			preferences,
			rooms,
			defaultSettings
		);

		expect(improvements.length).toBeGreaterThan(0);
		const improvement = improvements[0];
		expect(improvement.userId).toBe('user-1');
		expect(improvement.roomId).toBe('room-1'); // Should move to preferred room
		expect(improvement.metadata?.satisfactionScore).toBe(3);
	});
});

// Performance and stress tests
describe('Performance Tests', () => {
	let service: DiscussionGroupAssignmentService;

	beforeEach(() => {
		service = new DiscussionGroupAssignmentService();
	});

	test('should handle large numbers of participants efficiently', async () => {
		// Create 100 participants, 10 topics, 20 rooms
		const participantCount = 100;
		const topicCount = 10;
		const roomCount = 20;

		const participants = Array.from({ length: participantCount }, (_, i) =>
			createUser(`user-${i + 1}`, `User ${i + 1}`)
		);

		const topics = Array.from({ length: topicCount }, (_, i) =>
			createTopic(`topic-${i + 1}`, `Topic ${i + 1}`)
		);

		const rooms = Array.from({ length: roomCount }, (_, i) =>
			createRoom(`room-${i + 1}`, `topic-${(i % topicCount) + 1}`, 8)
		);

		// Generate random votes for each participant
		const votes = participants.flatMap(participant => {
			const userId = participant.id;
			const userNum = parseInt(userId.split('-')[1]);

			// Each user votes for 3 random topics
			const selectedTopics = [
				`topic-${(userNum % topicCount) + 1}`,
				`topic-${((userNum + 1) % topicCount) + 1}`,
				`topic-${((userNum + 2) % topicCount) + 1}`
			];

			return [
				createVote(userId, selectedTopics[0], VoteWeight.FIRST),
				createVote(userId, selectedTopics[1], VoteWeight.SECOND),
				createVote(userId, selectedTopics[2], VoteWeight.THIRD)
			];
		});

		const startTime = Date.now();

		const result = await service.generateAssignments(
			participants,
			votes,
			topics,
			rooms,
			defaultSettings
		);

		const endTime = Date.now();
		const executionTime = endTime - startTime;

		console.log(`Assignment generation took ${executionTime}ms for ${participantCount} participants`);

		// Should complete in reasonable time (< 5 seconds for 100 participants)
		expect(executionTime).toBeLessThan(5000);

		// Should assign most participants
		expect(result.assignments.length).toBeGreaterThan(participantCount * 0.8);

		// Validate constraints
		const validation = service.validateAssignmentConstraints(
			result.assignments,
			rooms,
			defaultSettings
		);

		expect(validation.isValid).toBe(true);
	}, 10000); // 10 second timeout for performance test
});