/**
 * Late Joiner Handler
 * Manages assignment of participants who join after team distribution
 */

import type { Team, Participant } from './team-distribution';
import { assignParticipantToTeam } from './team-distribution';

export interface LateJoinerSuggestion {
	team: Team;
	score: number;
	reason: string;
	impact: {
		balanceChange: number;
		sizeChange: number;
		categoryFit: number;
	};
}

export interface LateJoinerAssignmentOptions {
	strategy?: 'balanced' | 'smallest' | 'preference' | 'category-match';
	considerPreference?: boolean;
	maintainBalance?: boolean;
	maxSuggestions?: number;
}

/**
 * Generate suggestions for assigning a late joiner to teams
 */
export function suggestTeamAssignment(
	participant: Participant,
	teams: Team[],
	options: LateJoinerAssignmentOptions = {}
): LateJoinerSuggestion[] {
	const {
		strategy = 'balanced',
		considerPreference = true,
		maintainBalance = true,
		maxSuggestions = 3
	} = options;

	const suggestions: LateJoinerSuggestion[] = [];

	// Filter eligible teams
	const eligibleTeams = teams.filter((team) => {
		const maxSize = team.maxSize || team.constraints?.maxParticipants || 50;
		if (team.members.length >= maxSize) return false;

		if (team.constraints?.excludeCategories && participant.category) {
			if (team.constraints.excludeCategories.includes(participant.category)) {
				return false;
			}
		}

		return true;
	});

	if (eligibleTeams.length === 0) {
		return [];
	}

	// Calculate current average team size
	const avgTeamSize = teams.reduce((sum, t) => sum + t.members.length, 0) / teams.length;

	// Score each eligible team
	for (const team of eligibleTeams) {
		let score = 0;
		const reasons: string[] = [];
		let balanceChange = 0;
		let sizeChange = 0;
		let categoryFit = 0;

		// 1. Size-based scoring (prefer smaller teams)
		const currentDeviation = Math.abs(team.members.length - avgTeamSize);
		const newDeviation = Math.abs(team.members.length + 1 - avgTeamSize);
		const sizeImprovement = currentDeviation - newDeviation;

		if (sizeImprovement > 0) {
			score += 30 * (sizeImprovement / avgTeamSize);
			reasons.push(`Improves size balance`);
		} else if (sizeImprovement < 0) {
			score -= 20 * Math.abs(sizeImprovement / avgTeamSize);
		}

		sizeChange = sizeImprovement;

		// 2. Preference matching
		if (considerPreference && participant.preference) {
			const prefLower = participant.preference.toLowerCase().trim();
			const topicLower = team.topic?.toLowerCase().trim() || '';
			const nameLower = team.name.toLowerCase().trim();

			if (topicLower.includes(prefLower) || prefLower.includes(topicLower)) {
				score += 50;
				reasons.push(`Matches preference: "${participant.preference}"`);
			} else if (nameLower.includes(prefLower) || prefLower.includes(nameLower)) {
				score += 30;
				reasons.push(`Partially matches preference`);
			}
		}

		// 3. Category balance scoring
		if (participant.category) {
			const teamCategories = team.members.map((m) => m.category).filter(Boolean);
			const categoryCount = teamCategories.filter((c) => c === participant.category).length;
			const totalMembers = team.members.length;

			// Prefer teams with fewer of this category
			const currentRatio = totalMembers > 0 ? categoryCount / totalMembers : 0;
			const newRatio = (categoryCount + 1) / (totalMembers + 1);

			if (categoryCount === 0) {
				score += 25;
				reasons.push(`Adds diversity (no ${participant.category} yet)`);
				categoryFit = 25;
			} else if (currentRatio < 0.3) {
				score += 15;
				reasons.push(`Good category balance`);
				categoryFit = 15;
			} else if (currentRatio > 0.6) {
				score -= 20;
				reasons.push(`Category already well-represented`);
				categoryFit = -20;
			}

			balanceChange = (currentRatio - newRatio) * 100;
		}

		// 4. Required categories check
		if (team.constraints?.requiredCategories && participant.category) {
			const teamCategories = new Set(team.members.map((m) => m.category).filter(Boolean));
			const missingRequired = team.constraints.requiredCategories.filter(
				(cat) => !teamCategories.has(cat)
			);

			if (missingRequired.includes(participant.category)) {
				score += 40;
				reasons.push(`Fills required category: ${participant.category}`);
			}
		}

		// 5. Capacity consideration
		const maxSize = team.maxSize || team.constraints?.maxParticipants || 50;
		const capacityRatio = (team.members.length + 1) / maxSize;

		if (capacityRatio > 0.9) {
			score -= 15;
			reasons.push(`Near capacity`);
		}

		suggestions.push({
			team,
			score: Math.round(score),
			reason: reasons.length > 0 ? reasons.join('; ') : 'Available team',
			impact: {
				balanceChange: Math.round(balanceChange * 10) / 10,
				sizeChange: Math.round(sizeChange * 10) / 10,
				categoryFit
			}
		});
	}

	// Sort by score (highest first)
	suggestions.sort((a, b) => b.score - a.score);

	// Return top suggestions
	return suggestions.slice(0, maxSuggestions);
}

/**
 * Automatically assign a late joiner based on strategy
 */
export function assignLateJoiner(
	participant: Participant,
	teams: Team[],
	options: LateJoinerAssignmentOptions = {}
): { team: Team | null; suggestion: LateJoinerSuggestion | null } {
	const suggestions = suggestTeamAssignment(participant, teams, options);

	if (suggestions.length === 0) {
		return { team: null, suggestion: null };
	}

	const bestSuggestion = suggestions[0];
	bestSuggestion.team.members.push(participant);

	return {
		team: bestSuggestion.team,
		suggestion: bestSuggestion
	};
}

/**
 * Handle batch of late joiners
 */
export interface BatchAssignmentResult {
	assigned: Array<{ participant: Participant; team: Team; suggestion: LateJoinerSuggestion }>;
	unassigned: Participant[];
	warnings: string[];
}

export function assignLateJoinerBatch(
	participants: Participant[],
	teams: Team[],
	options: LateJoinerAssignmentOptions = {}
): BatchAssignmentResult {
	const assigned: BatchAssignmentResult['assigned'] = [];
	const unassigned: Participant[] = [];
	const warnings: string[] = [];

	// Sort participants by preference specificity (specific preferences first)
	const sorted = [...participants].sort((a, b) => {
		const aPref = a.preference?.trim() || '';
		const bPref = b.preference?.trim() || '';
		return bPref.length - aPref.length;
	});

	for (const participant of sorted) {
		const suggestions = suggestTeamAssignment(participant, teams, options);

		if (suggestions.length === 0) {
			unassigned.push(participant);
			warnings.push(`No suitable team found for ${participant.name}`);
			continue;
		}

		const bestSuggestion = suggestions[0];

		// Check if score is acceptable (>= 0)
		if (bestSuggestion.score < 0) {
			warnings.push(`Low confidence assignment for ${participant.name} (score: ${bestSuggestion.score})`);
		}

		bestSuggestion.team.members.push(participant);
		assigned.push({
			participant,
			team: bestSuggestion.team,
			suggestion: bestSuggestion
		});
	}

	return {
		assigned,
		unassigned,
		warnings
	};
}

/**
 * Get team capacity status
 */
export interface TeamCapacityStatus {
	team: Team;
	currentSize: number;
	maxSize: number;
	availableSlots: number;
	capacityPercentage: number;
	canAcceptMore: boolean;
}

export function getTeamCapacityStatus(teams: Team[]): TeamCapacityStatus[] {
	return teams.map((team) => {
		const maxSize = team.maxSize || team.constraints?.maxParticipants || 50;
		const currentSize = team.members.length;
		const availableSlots = maxSize - currentSize;
		const capacityPercentage = (currentSize / maxSize) * 100;

		return {
			team,
			currentSize,
			maxSize,
			availableSlots,
			capacityPercentage: Math.round(capacityPercentage),
			canAcceptMore: availableSlots > 0
		};
	});
}

/**
 * Find teams with available capacity
 */
export function findAvailableTeams(teams: Team[], minSlots: number = 1): Team[] {
	const statuses = getTeamCapacityStatus(teams);
	return statuses
		.filter((status) => status.availableSlots >= minSlots)
		.map((status) => status.team);
}

/**
 * Calculate distribution quality after adding late joiners
 */
export interface DistributionQuality {
	sizeBalance: number; // 0-100 (higher is better)
	categoryBalance: number; // 0-100 (higher is better)
	preferenceMatch: number; // 0-100 (higher is better)
	overall: number; // 0-100 (higher is better)
}

export function calculateDistributionQuality(
	teams: Team[],
	lateJoiners: Participant[]
): DistributionQuality {
	// Size balance - coefficient of variation
	const sizes = teams.map((t) => t.members.length);
	const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
	const variance = sizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / sizes.length;
	const stdDev = Math.sqrt(variance);
	const cv = avgSize > 0 ? stdDev / avgSize : 0;
	const sizeBalance = Math.max(0, 100 - cv * 100);

	// Category balance
	const categoryDist = new Map<string, number[]>();
	teams.forEach((team, teamIndex) => {
		team.members.forEach((member) => {
			if (member.category) {
				const dist = categoryDist.get(member.category) || new Array(teams.length).fill(0);
				dist[teamIndex]++;
				categoryDist.set(member.category, dist);
			}
		});
	});

	let totalCategoryVariation = 0;
	let categoryCount = 0;

	for (const [, counts] of categoryDist) {
		const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
		if (mean === 0) continue;

		const catVariance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
		const catStdDev = Math.sqrt(catVariance);
		const catCv = catStdDev / mean;

		totalCategoryVariation += catCv;
		categoryCount++;
	}

	const categoryBalance = categoryCount > 0
		? Math.max(0, 100 - (totalCategoryVariation / categoryCount) * 100)
		: 100;

	// Preference match
	let matchedPreferences = 0;
	let totalWithPreferences = 0;

	for (const joiner of lateJoiners) {
		if (!joiner.preference) continue;

		totalWithPreferences++;

		// Find which team the joiner is in
		const assignedTeam = teams.find((t) => t.members.includes(joiner));
		if (!assignedTeam) continue;

		const prefLower = joiner.preference.toLowerCase().trim();
		const topicLower = assignedTeam.topic?.toLowerCase().trim() || '';

		if (topicLower.includes(prefLower) || prefLower.includes(topicLower)) {
			matchedPreferences++;
		}
	}

	const preferenceMatch = totalWithPreferences > 0
		? (matchedPreferences / totalWithPreferences) * 100
		: 100;

	// Overall quality (weighted average)
	const overall = (sizeBalance * 0.4 + categoryBalance * 0.4 + preferenceMatch * 0.2);

	return {
		sizeBalance: Math.round(sizeBalance),
		categoryBalance: Math.round(categoryBalance),
		preferenceMatch: Math.round(preferenceMatch),
		overall: Math.round(overall)
	};
}
