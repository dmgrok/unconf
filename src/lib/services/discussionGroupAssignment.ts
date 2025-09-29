/**
 * Discussion Group Assignment Service
 *
 * Implements automatic participant assignment to discussion rooms based on voting preferences
 */

import type {
	Vote,
	Topic,
	User,
	DiscussionRoom,
	RoomAssignment,
	AssignmentRound,
	AssignmentSettings,
	AssignmentResults,
	VoteWeight
} from '../../types/entities';
import type {
	DiscussionRoomStatus,
	AssignmentMethod,
	AssignmentStatus,
	AssignmentRoundStatus
} from '../../types/enums';
import { VOTE_WEIGHTS } from '../../types/entities';

export interface ParticipantPreference {
	userId: string;
	preferences: {
		topicId: string;
		weight: VoteWeight;
		points: number;
	}[];
}

export interface AssignmentCandidate {
	userId: string;
	topicId: string;
	preferenceRank: number; // 1, 2, 3
	satisfactionScore: number; // points from VOTE_WEIGHTS
}

export interface RoomCapacityInfo {
	roomId: string;
	topicId: string;
	capacity: number;
	currentOccupancy: number;
	availableSpots: number;
}

export class DiscussionGroupAssignmentService {
	/**
	 * Generate room assignments based on participant voting preferences
	 */
	async generateAssignments(
		participants: User[],
		votes: Vote[],
		topics: Topic[],
		rooms: DiscussionRoom[],
		settings: AssignmentSettings
	): Promise<{
		assignments: RoomAssignment[];
		results: AssignmentResults;
		unassigned: string[];
	}> {
		// Step 1: Build participant preferences from votes
		const preferences = this.buildParticipantPreferences(participants, votes);

		// Step 2: Create assignment candidates sorted by preference strength
		const candidates = this.createAssignmentCandidates(preferences);

		// Step 3: Initialize room capacity tracking
		const roomCapacities = this.initializeRoomCapacities(rooms);

		// Step 4: Execute assignment algorithm
		const assignments = this.executeAssignmentAlgorithm(
			candidates,
			roomCapacities,
			settings
		);

		// Step 5: Calculate assignment results and metrics
		const results = this.calculateAssignmentResults(
			assignments,
			preferences,
			roomCapacities
		);

		// Step 6: Identify unassigned participants
		const assignedUserIds = new Set(assignments.map(a => a.userId));
		const unassigned = participants
			.map(p => p.id)
			.filter(id => !assignedUserIds.has(id));

		return {
			assignments,
			results,
			unassigned
		};
	}

	/**
	 * Build participant preferences from their votes
	 */
	private buildParticipantPreferences(
		participants: User[],
		votes: Vote[]
	): ParticipantPreference[] {
		const userVotesMap = new Map<string, Vote[]>();

		// Group votes by user
		votes.forEach(vote => {
			if (!userVotesMap.has(vote.userId)) {
				userVotesMap.set(vote.userId, []);
			}
			userVotesMap.get(vote.userId)!.push(vote);
		});

		// Build preferences for each participant
		return participants.map(participant => {
			const userVotes = userVotesMap.get(participant.id) || [];
			const preferences = userVotes.map(vote => ({
				topicId: vote.topicId,
				weight: vote.weight,
				points: VOTE_WEIGHTS[vote.weight]
			}));

			// Sort by points (highest first)
			preferences.sort((a, b) => b.points - a.points);

			return {
				userId: participant.id,
				preferences
			};
		});
	}

	/**
	 * Create assignment candidates from preferences
	 */
	private createAssignmentCandidates(
		preferences: ParticipantPreference[]
	): AssignmentCandidate[] {
		const candidates: AssignmentCandidate[] = [];

		preferences.forEach(userPref => {
			userPref.preferences.forEach((pref, index) => {
				candidates.push({
					userId: userPref.userId,
					topicId: pref.topicId,
					preferenceRank: index + 1,
					satisfactionScore: pref.points
				});
			});
		});

		// Sort by satisfaction score (highest first), then by preference rank (lowest first)
		candidates.sort((a, b) => {
			if (b.satisfactionScore !== a.satisfactionScore) {
				return b.satisfactionScore - a.satisfactionScore;
			}
			return a.preferenceRank - b.preferenceRank;
		});

		return candidates;
	}

	/**
	 * Initialize room capacity tracking
	 */
	private initializeRoomCapacities(rooms: DiscussionRoom[]): Map<string, RoomCapacityInfo> {
		const capacities = new Map<string, RoomCapacityInfo>();

		rooms.forEach(room => {
			capacities.set(room.id, {
				roomId: room.id,
				topicId: room.topicId,
				capacity: room.capacity,
				currentOccupancy: room.currentOccupancy,
				availableSpots: room.capacity - room.currentOccupancy
			});
		});

		return capacities;
	}

	/**
	 * Execute the assignment algorithm
	 */
	private executeAssignmentAlgorithm(
		candidates: AssignmentCandidate[],
		roomCapacities: Map<string, RoomCapacityInfo>,
		settings: AssignmentSettings
	): RoomAssignment[] {
		const assignments: RoomAssignment[] = [];
		const assignedUsers = new Set<string>();

		// Greedy assignment: process candidates in order of preference strength
		for (const candidate of candidates) {
			// Skip if user already assigned
			if (assignedUsers.has(candidate.userId)) {
				continue;
			}

			// Find room for this topic
			const availableRoom = Array.from(roomCapacities.values())
				.find(room =>
					room.topicId === candidate.topicId &&
					room.availableSpots > 0
				);

			if (availableRoom) {
				// Create assignment
				const assignment: RoomAssignment = {
					id: this.generateId(),
					eventId: '', // Will be set by caller
					userId: candidate.userId,
					roomId: availableRoom.roomId,
					topicId: candidate.topicId,
					assignmentRound: 1,
					assignmentMethod: AssignmentMethod.AUTOMATIC,
					preferenceRank: candidate.preferenceRank,
					assignedAt: new Date(),
					status: AssignmentStatus.ASSIGNED,
					createdAt: new Date(),
					updatedAt: new Date(),
					metadata: {
						satisfactionScore: candidate.satisfactionScore
					}
				};

				assignments.push(assignment);
				assignedUsers.add(candidate.userId);

				// Update room capacity
				availableRoom.currentOccupancy++;
				availableRoom.availableSpots--;
			}
		}

		return assignments;
	}

	/**
	 * Calculate assignment results and metrics
	 */
	private calculateAssignmentResults(
		assignments: RoomAssignment[],
		preferences: ParticipantPreference[],
		roomCapacities: Map<string, RoomCapacityInfo>
	): AssignmentResults {
		// Calculate satisfaction scores
		let totalSatisfactionScore = 0;
		const preferenceDistribution = {
			firstChoice: 0,
			secondChoice: 0,
			thirdChoice: 0,
			unassigned: 0
		};

		assignments.forEach(assignment => {
			if (assignment.metadata?.satisfactionScore) {
				totalSatisfactionScore += assignment.metadata.satisfactionScore as number;
			}

			switch (assignment.preferenceRank) {
				case 1:
					preferenceDistribution.firstChoice++;
					break;
				case 2:
					preferenceDistribution.secondChoice++;
					break;
				case 3:
					preferenceDistribution.thirdChoice++;
					break;
			}
		});

		const averageSatisfactionScore = assignments.length > 0
			? totalSatisfactionScore / assignments.length
			: 0;

		// Calculate room utilization
		const roomUtilization = Array.from(roomCapacities.values()).map(room => ({
			roomId: room.roomId,
			capacity: room.capacity,
			assigned: room.currentOccupancy,
			utilizationRate: room.capacity > 0 ? room.currentOccupancy / room.capacity : 0
		}));

		// Count unassigned participants
		const totalParticipants = preferences.length;
		const assignedParticipants = assignments.length;
		preferenceDistribution.unassigned = totalParticipants - assignedParticipants;

		return {
			totalSatisfactionScore,
			averageSatisfactionScore,
			preferenceDistribution,
			roomUtilization
		};
	}

	/**
	 * Validate assignment constraints
	 */
	validateAssignmentConstraints(
		assignments: RoomAssignment[],
		rooms: DiscussionRoom[],
		settings: AssignmentSettings
	): {
		isValid: boolean;
		violations: string[];
	} {
		const violations: string[] = [];
		const roomCapacityMap = new Map(rooms.map(r => [r.id, r.capacity]));
		const roomAssignments = new Map<string, number>();

		// Count assignments per room
		assignments.forEach(assignment => {
			const count = roomAssignments.get(assignment.roomId) || 0;
			roomAssignments.set(assignment.roomId, count + 1);
		});

		// Check capacity violations
		roomAssignments.forEach((count, roomId) => {
			const capacity = roomCapacityMap.get(roomId);
			if (capacity && count > capacity) {
				violations.push(`Room ${roomId} over capacity: ${count}/${capacity}`);
			}
		});

		// Check for duplicate user assignments
		const userAssignments = new Map<string, string[]>();
		assignments.forEach(assignment => {
			if (!userAssignments.has(assignment.userId)) {
				userAssignments.set(assignment.userId, []);
			}
			userAssignments.get(assignment.userId)!.push(assignment.roomId);
		});

		userAssignments.forEach((roomIds, userId) => {
			if (roomIds.length > 1) {
				violations.push(`User ${userId} assigned to multiple rooms: ${roomIds.join(', ')}`);
			}
		});

		return {
			isValid: violations.length === 0,
			violations
		};
	}

	/**
	 * Handle room capacity overflow
	 */
	async handleOverflow(
		unassigned: string[],
		rooms: DiscussionRoom[],
		settings: AssignmentSettings
	): Promise<RoomAssignment[]> {
		if (!settings.allowOverflow || unassigned.length === 0) {
			return [];
		}

		const overflowAssignments: RoomAssignment[] = [];

		// Find rooms with available capacity or create overflow rooms
		const availableRooms = rooms.filter(room =>
			room.currentOccupancy < room.capacity
		);

		// Simple overflow strategy: assign to rooms with most available spots
		availableRooms.sort((a, b) =>
			(b.capacity - b.currentOccupancy) - (a.capacity - a.currentOccupancy)
		);

		for (const userId of unassigned) {
			const room = availableRooms.find(r => r.currentOccupancy < r.capacity);
			if (room) {
				const assignment: RoomAssignment = {
					id: this.generateId(),
					eventId: '', // Will be set by caller
					userId,
					roomId: room.id,
					topicId: room.topicId,
					assignmentRound: 1,
					assignmentMethod: AssignmentMethod.OVERFLOW,
					assignedAt: new Date(),
					status: AssignmentStatus.ASSIGNED,
					createdAt: new Date(),
					updatedAt: new Date(),
					metadata: {
						isOverflow: true
					}
				};

				overflowAssignments.push(assignment);
				room.currentOccupancy++;
			}
		}

		return overflowAssignments;
	}

	/**
	 * Rebalance room assignments to improve satisfaction
	 */
	async rebalanceAssignments(
		currentAssignments: RoomAssignment[],
		preferences: ParticipantPreference[],
		rooms: DiscussionRoom[],
		settings: AssignmentSettings
	): Promise<RoomAssignment[]> {
		// This is a simplified rebalancing algorithm
		// In practice, this could use more sophisticated optimization techniques

		const userPreferenceMap = new Map(
			preferences.map(p => [p.userId, p.preferences])
		);

		const improvements: RoomAssignment[] = [];

		for (const assignment of currentAssignments) {
			const userPreferences = userPreferenceMap.get(assignment.userId);
			if (!userPreferences) continue;

			// Check if user has a higher preference that now has available space
			for (const pref of userPreferences) {
				if (pref.points > (assignment.metadata?.satisfactionScore as number || 0)) {
					const targetRoom = rooms.find(r =>
						r.topicId === pref.topicId &&
						r.currentOccupancy < r.capacity
					);

					if (targetRoom) {
						// Create improved assignment
						const improvedAssignment: RoomAssignment = {
							...assignment,
							roomId: targetRoom.id,
							topicId: pref.topicId,
							assignmentMethod: AssignmentMethod.REBALANCE,
							updatedAt: new Date(),
							metadata: {
								...assignment.metadata,
								satisfactionScore: pref.points,
								previousRoomId: assignment.roomId
							}
						};

						improvements.push(improvedAssignment);
						break; // Only one improvement per user
					}
				}
			}
		}

		return improvements;
	}

	/**
	 * Generate a unique ID (simplified version)
	 */
	private generateId(): string {
		return Math.random().toString(36).substr(2, 9);
	}
}

export const discussionGroupAssignmentService = new DiscussionGroupAssignmentService();