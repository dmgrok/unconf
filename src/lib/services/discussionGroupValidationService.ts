/**
 * Discussion Group Validation Service
 *
 * Validates discussion group assignments and identifies potential issues
 */

import type {
	RoomAssignment,
	DiscussionRoom,
	Vote,
	User,
	Topic,
	AssignmentSettings
} from '../../types/entities';
import { VoteWeight, VOTE_WEIGHTS } from '../../types/enums';

export interface ValidationResult {
	isValid: boolean;
	warnings: ValidationWarning[];
	errors: ValidationError[];
	suggestions: ValidationSuggestion[];
	metrics: ValidationMetrics;
}

export interface ValidationWarning {
	type: 'capacity' | 'preference' | 'fairness' | 'utilization';
	severity: 'low' | 'medium' | 'high';
	message: string;
	affectedItems: string[];
	suggestedAction?: string;
}

export interface ValidationError {
	type: 'constraint' | 'data' | 'logic';
	message: string;
	affectedItems: string[];
	mustFix: boolean;
}

export interface ValidationSuggestion {
	type: 'optimization' | 'improvement' | 'alternative';
	message: string;
	impact: 'low' | 'medium' | 'high';
	effort: 'low' | 'medium' | 'high';
	details?: string;
}

export interface ValidationMetrics {
	assignmentRate: number;
	satisfactionScore: number;
	averageSatisfactionScore: number;
	utilizationRate: number;
	fairnessIndex: number;
	preferenceDistribution: {
		firstChoice: number;
		secondChoice: number;
		thirdChoice: number;
		noPreference: number;
	};
	roomUtilization: {
		roomId: string;
		utilizationRate: number;
		isOverCapacity: boolean;
		isUnderUtilized: boolean;
	}[];
}

export class DiscussionGroupValidationService {
	/**
	 * Validate a complete assignment scenario
	 */
	validateAssignments(
		assignments: RoomAssignment[],
		rooms: DiscussionRoom[],
		users: User[],
		votes: Vote[],
		topics: Topic[],
		settings: AssignmentSettings
	): ValidationResult {
		const warnings: ValidationWarning[] = [];
		const errors: ValidationError[] = [];
		const suggestions: ValidationSuggestion[] = [];

		// Calculate metrics
		const metrics = this.calculateValidationMetrics(assignments, rooms, users, votes);

		// Validate room capacity constraints
		const capacityValidation = this.validateRoomCapacities(assignments, rooms);
		warnings.push(...capacityValidation.warnings);
		errors.push(...capacityValidation.errors);

		// Validate user assignments
		const userValidation = this.validateUserAssignments(assignments, users);
		errors.push(...userValidation.errors);

		// Validate preference satisfaction
		const preferenceValidation = this.validatePreferenceSatisfaction(assignments, votes, settings);
		warnings.push(...preferenceValidation.warnings);
		suggestions.push(...preferenceValidation.suggestions);

		// Validate fairness
		const fairnessValidation = this.validateFairness(assignments, rooms, votes);
		warnings.push(...fairnessValidation.warnings);
		suggestions.push(...fairnessValidation.suggestions);

		// Validate room utilization
		const utilizationValidation = this.validateRoomUtilization(rooms, assignments, settings);
		warnings.push(...utilizationValidation.warnings);
		suggestions.push(...utilizationValidation.suggestions);

		// Generate optimization suggestions
		const optimizationSuggestions = this.generateOptimizationSuggestions(assignments, rooms, votes, metrics);
		suggestions.push(...optimizationSuggestions);

		return {
			isValid: errors.length === 0,
			warnings,
			errors,
			suggestions,
			metrics
		};
	}

	/**
	 * Calculate validation metrics
	 */
	private calculateValidationMetrics(
		assignments: RoomAssignment[],
		rooms: DiscussionRoom[],
		users: User[],
		votes: Vote[]
	): ValidationMetrics {
		const totalUsers = users.length;
		const assignedUsers = assignments.length;
		const assignmentRate = totalUsers > 0 ? assignedUsers / totalUsers : 0;

		// Calculate satisfaction scores
		let totalSatisfactionScore = 0;
		const preferenceDistribution = {
			firstChoice: 0,
			secondChoice: 0,
			thirdChoice: 0,
			noPreference: 0
		};

		assignments.forEach(assignment => {
			if (assignment.preferenceRank) {
				const score = VOTE_WEIGHTS[assignment.preferenceRank === 1 ? VoteWeight.FIRST :
												assignment.preferenceRank === 2 ? VoteWeight.SECOND :
												VoteWeight.THIRD];
				totalSatisfactionScore += score;

				switch (assignment.preferenceRank) {
					case 1: preferenceDistribution.firstChoice++; break;
					case 2: preferenceDistribution.secondChoice++; break;
					case 3: preferenceDistribution.thirdChoice++; break;
				}
			} else {
				preferenceDistribution.noPreference++;
			}
		});

		const averageSatisfactionScore = assignedUsers > 0 ? totalSatisfactionScore / assignedUsers : 0;

		// Calculate room utilization
		const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
		const totalOccupancy = assignments.length;
		const utilizationRate = totalCapacity > 0 ? totalOccupancy / totalCapacity : 0;

		const roomUtilization = rooms.map(room => {
			const assignmentsInRoom = assignments.filter(a => a.roomId === room.id).length;
			const utilizationRate = room.capacity > 0 ? assignmentsInRoom / room.capacity : 0;

			return {
				roomId: room.id,
				utilizationRate,
				isOverCapacity: assignmentsInRoom > room.capacity,
				isUnderUtilized: utilizationRate < 0.5
			};
		});

		// Calculate fairness index (Gini coefficient approximation)
		const roomSizes = rooms.map(room => assignments.filter(a => a.roomId === room.id).length);
		const fairnessIndex = this.calculateFairnessIndex(roomSizes);

		return {
			assignmentRate,
			satisfactionScore: totalSatisfactionScore,
			averageSatisfactionScore,
			utilizationRate,
			fairnessIndex,
			preferenceDistribution,
			roomUtilization
		};
	}

	/**
	 * Validate room capacity constraints
	 */
	private validateRoomCapacities(
		assignments: RoomAssignment[],
		rooms: DiscussionRoom[]
	): { warnings: ValidationWarning[]; errors: ValidationError[] } {
		const warnings: ValidationWarning[] = [];
		const errors: ValidationError[] = [];

		const roomAssignmentCounts = new Map<string, number>();
		assignments.forEach(assignment => {
			const count = roomAssignmentCounts.get(assignment.roomId) || 0;
			roomAssignmentCounts.set(assignment.roomId, count + 1);
		});

		rooms.forEach(room => {
			const assignmentCount = roomAssignmentCounts.get(room.id) || 0;

			if (assignmentCount > room.capacity) {
				errors.push({
					type: 'constraint',
					message: `Room "${room.name}" is over capacity`,
					affectedItems: [room.id],
					mustFix: true
				});
			} else if (assignmentCount === room.capacity) {
				warnings.push({
					type: 'capacity',
					severity: 'medium',
					message: `Room "${room.name}" is at full capacity`,
					affectedItems: [room.id],
					suggestedAction: 'Consider increasing capacity or redistributing participants'
				});
			}
		});

		return { warnings, errors };
	}

	/**
	 * Validate user assignments for duplicates
	 */
	private validateUserAssignments(
		assignments: RoomAssignment[],
		users: User[]
	): { errors: ValidationError[] } {
		const errors: ValidationError[] = [];
		const userAssignments = new Map<string, string[]>();

		// Check for duplicate assignments
		assignments.forEach(assignment => {
			if (!userAssignments.has(assignment.userId)) {
				userAssignments.set(assignment.userId, []);
			}
			userAssignments.get(assignment.userId)!.push(assignment.roomId);
		});

		userAssignments.forEach((roomIds, userId) => {
			if (roomIds.length > 1) {
				errors.push({
					type: 'logic',
					message: `User ${userId} is assigned to multiple rooms`,
					affectedItems: [userId, ...roomIds],
					mustFix: true
				});
			}
		});

		return { errors };
	}

	/**
	 * Validate preference satisfaction
	 */
	private validatePreferenceSatisfaction(
		assignments: RoomAssignment[],
		votes: Vote[],
		settings: AssignmentSettings
	): { warnings: ValidationWarning[]; suggestions: ValidationSuggestion[] } {
		const warnings: ValidationWarning[] = [];
		const suggestions: ValidationSuggestion[] = [];

		const userVotes = new Map<string, Vote[]>();
		votes.forEach(vote => {
			if (!userVotes.has(vote.userId)) {
				userVotes.set(vote.userId, []);
			}
			userVotes.get(vote.userId)!.push(vote);
		});

		let usersWithoutPreferences = 0;
		let usersWithLowSatisfaction = 0;

		assignments.forEach(assignment => {
			const userVoteList = userVotes.get(assignment.userId) || [];
			const assignmentVote = userVoteList.find(vote => vote.topicId === assignment.topicId);

			if (!assignmentVote) {
				usersWithoutPreferences++;
			} else if (assignment.preferenceRank && assignment.preferenceRank > 2) {
				usersWithLowSatisfaction++;
			}
		});

		if (usersWithoutPreferences > assignments.length * 0.2) {
			warnings.push({
				type: 'preference',
				severity: 'medium',
				message: `${usersWithoutPreferences} participants assigned without stated preferences`,
				affectedItems: [],
				suggestedAction: 'Review assignment algorithm to prioritize participants with preferences'
			});
		}

		if (usersWithLowSatisfaction > assignments.length * 0.3) {
			suggestions.push({
				type: 'optimization',
				message: 'High number of participants assigned to 3rd choice or lower',
				impact: 'medium',
				effort: 'medium',
				details: 'Consider rebalancing or increasing room capacities for popular topics'
			});
		}

		return { warnings, suggestions };
	}

	/**
	 * Validate fairness across assignments
	 */
	private validateFairness(
		assignments: RoomAssignment[],
		rooms: DiscussionRoom[],
		votes: Vote[]
	): { warnings: ValidationWarning[]; suggestions: ValidationSuggestion[] } {
		const warnings: ValidationWarning[] = [];
		const suggestions: ValidationSuggestion[] = [];

		// Check for extreme imbalances in room sizes
		const roomSizes = rooms.map(room => ({
			roomId: room.id,
			name: room.name,
			size: assignments.filter(a => a.roomId === room.id).length,
			capacity: room.capacity
		}));

		const averageRoomSize = roomSizes.reduce((sum, room) => sum + room.size, 0) / roomSizes.length;
		const imbalancedRooms = roomSizes.filter(room =>
			Math.abs(room.size - averageRoomSize) > averageRoomSize * 0.5
		);

		if (imbalancedRooms.length > 0) {
			warnings.push({
				type: 'fairness',
				severity: 'medium',
				message: 'Significant imbalance in room sizes detected',
				affectedItems: imbalancedRooms.map(room => room.roomId),
				suggestedAction: 'Consider rebalancing participant distribution'
			});
		}

		// Check for popular topics with insufficient capacity
		const topicVoteCounts = new Map<string, number>();
		votes.forEach(vote => {
			const count = topicVoteCounts.get(vote.topicId) || 0;
			topicVoteCounts.set(vote.topicId, count + 1);
		});

		const topicCapacities = new Map<string, number>();
		rooms.forEach(room => {
			topicCapacities.set(room.topicId, room.capacity);
		});

		const underservedTopics: string[] = [];
		topicVoteCounts.forEach((voteCount, topicId) => {
			const capacity = topicCapacities.get(topicId) || 0;
			if (voteCount > capacity * 1.5) {
				underservedTopics.push(topicId);
			}
		});

		if (underservedTopics.length > 0) {
			suggestions.push({
				type: 'improvement',
				message: 'Some popular topics have insufficient room capacity',
				impact: 'high',
				effort: 'medium',
				details: 'Consider adding additional rooms or increasing capacity for popular topics'
			});
		}

		return { warnings, suggestions };
	}

	/**
	 * Validate room utilization efficiency
	 */
	private validateRoomUtilization(
		rooms: DiscussionRoom[],
		assignments: RoomAssignment[],
		settings: AssignmentSettings
	): { warnings: ValidationWarning[]; suggestions: ValidationSuggestion[] } {
		const warnings: ValidationWarning[] = [];
		const suggestions: ValidationSuggestion[] = [];

		const roomUtilization = rooms.map(room => {
			const assignmentCount = assignments.filter(a => a.roomId === room.id).length;
			return {
				room,
				assignmentCount,
				utilizationRate: room.capacity > 0 ? assignmentCount / room.capacity : 0
			};
		});

		const underutilizedRooms = roomUtilization.filter(ru => ru.utilizationRate < 0.5 && ru.assignmentCount > 0);
		const emptyRooms = roomUtilization.filter(ru => ru.assignmentCount === 0);

		if (underutilizedRooms.length > 0) {
			warnings.push({
				type: 'utilization',
				severity: 'low',
				message: `${underutilizedRooms.length} rooms are underutilized`,
				affectedItems: underutilizedRooms.map(ru => ru.room.id),
				suggestedAction: 'Consider consolidating participants or reducing room capacity'
			});
		}

		if (emptyRooms.length > 0) {
			suggestions.push({
				type: 'optimization',
				message: `${emptyRooms.length} rooms have no assignments`,
				impact: 'low',
				effort: 'low',
				details: 'Consider removing unused rooms or investigating assignment algorithm'
			});
		}

		// Check overall utilization efficiency
		const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
		const totalAssigned = assignments.length;
		const overallUtilization = totalCapacity > 0 ? totalAssigned / totalCapacity : 0;

		if (overallUtilization < 0.6) {
			suggestions.push({
				type: 'optimization',
				message: 'Overall room utilization is low',
				impact: 'medium',
				effort: 'medium',
				details: 'Consider reducing total room capacity or encouraging more participation'
			});
		}

		return { warnings, suggestions };
	}

	/**
	 * Generate optimization suggestions
	 */
	private generateOptimizationSuggestions(
		assignments: RoomAssignment[],
		rooms: DiscussionRoom[],
		votes: Vote[],
		metrics: ValidationMetrics
	): ValidationSuggestion[] {
		const suggestions: ValidationSuggestion[] = [];

		// Suggest preference-based improvements
		if (metrics.averageSatisfactionScore < 2.0) {
			suggestions.push({
				type: 'optimization',
				message: 'Average satisfaction score is low',
				impact: 'high',
				effort: 'medium',
				details: 'Consider rerunning assignment with different settings or increasing capacity for popular topics'
			});
		}

		// Suggest fairness improvements
		if (metrics.fairnessIndex < 0.7) {
			suggestions.push({
				type: 'improvement',
				message: 'Room size distribution is uneven',
				impact: 'medium',
				effort: 'low',
				details: 'Enable fairness algorithm or manually rebalance participants'
			});
		}

		// Suggest utilization improvements
		if (metrics.utilizationRate < 0.7) {
			suggestions.push({
				type: 'optimization',
				message: 'Room utilization could be improved',
				impact: 'medium',
				effort: 'low',
				details: 'Consider adjusting room capacities or consolidating participants'
			});
		}

		return suggestions;
	}

	/**
	 * Calculate fairness index (simplified Gini coefficient)
	 */
	private calculateFairnessIndex(values: number[]): number {
		if (values.length === 0) return 1;

		const sortedValues = [...values].sort((a, b) => a - b);
		const n = sortedValues.length;
		const mean = sortedValues.reduce((sum, val) => sum + val, 0) / n;

		if (mean === 0) return 1;

		let sum = 0;
		for (let i = 0; i < n; i++) {
			sum += (2 * (i + 1) - n - 1) * sortedValues[i];
		}

		const gini = sum / (n * n * mean);
		return Math.max(0, 1 - gini); // Convert to fairness index (higher is better)
	}

	/**
	 * Quick validation for real-time checks
	 */
	quickValidateAssignment(
		assignment: RoomAssignment,
		room: DiscussionRoom,
		existingAssignments: RoomAssignment[]
	): { isValid: boolean; issues: string[] } {
		const issues: string[] = [];

		// Check capacity
		const currentOccupancy = existingAssignments.filter(a => a.roomId === room.id).length;
		if (currentOccupancy >= room.capacity) {
			issues.push('Room is at full capacity');
		}

		// Check for duplicate user assignment
		const existingAssignment = existingAssignments.find(a => a.userId === assignment.userId);
		if (existingAssignment) {
			issues.push('User is already assigned to a room');
		}

		return {
			isValid: issues.length === 0,
			issues
		};
	}
}

export const discussionGroupValidationService = new DiscussionGroupValidationService();