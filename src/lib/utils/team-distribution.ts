/**
 * Team Distribution Algorithms
 * Implements various strategies for distributing participants into teams
 */

export interface Participant {
	id: string;
	name: string;
	email?: string;
	category?: string;
	preference?: string;
	customFields?: Record<string, string>;
}

export interface Team {
	id: string;
	name: string;
	topic?: string;
	maxSize?: number;
	minSize?: number;
	members: Participant[];
	constraints?: TeamConstraints;
}

export interface TeamConstraints {
	maxParticipants?: number;
	minParticipants?: number;
	requiredCategories?: string[];
	excludeCategories?: string[];
	balanceBy?: 'category' | 'preference' | 'custom';
	balanceField?: string; // For custom balance field
}

export interface DistributionOptions {
	strategy: 'random' | 'balanced' | 'preference' | 'manual';
	teamCount?: number;
	teamSize?: number;
	balanceBy?: 'category' | 'preference' | 'custom';
	balanceField?: string;
	preserveGroups?: boolean; // Keep certain participants together
	constraints?: TeamConstraints[];
	seed?: number; // For reproducible randomization
}

export interface DistributionResult {
	teams: Team[];
	unassigned: Participant[];
	warnings: string[];
	metadata: {
		algorithm: string;
		timestamp: Date;
		participantCount: number;
		teamCount: number;
		averageTeamSize: number;
		balanceScore?: number;
	};
}

/**
 * Seeded random number generator for reproducible randomization
 */
class SeededRandom {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	next(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}

	shuffle<T>(array: T[]): T[] {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(this.next() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}
}

/**
 * Random distribution with constraints
 * Distributes participants randomly while respecting team size limits and constraints
 */
export function randomDistribution(
	participants: Participant[],
	options: DistributionOptions
): DistributionResult {
	const warnings: string[] = [];
	const rng = new SeededRandom(options.seed || Date.now());

	// Determine team configuration
	let teamCount: number;
	let targetTeamSize: number;

	if (options.teamCount) {
		teamCount = options.teamCount;
		targetTeamSize = Math.ceil(participants.length / teamCount);
	} else if (options.teamSize) {
		targetTeamSize = options.teamSize;
		teamCount = Math.ceil(participants.length / targetTeamSize);
	} else {
		// Default: teams of ~6 people
		targetTeamSize = 6;
		teamCount = Math.ceil(participants.length / targetTeamSize);
	}

	// Initialize teams
	const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
		id: `team-${i + 1}`,
		name: `Team ${i + 1}`,
		members: [],
		constraints: options.constraints?.[i]
	}));

	// Shuffle participants for random distribution
	const shuffled = rng.shuffle([...participants]);
	const unassigned: Participant[] = [];

	// Distribute participants
	for (const participant of shuffled) {
		// Find a team that can accept this participant
		const eligibleTeams = teams.filter((team) => {
			// Check team size constraints
			const maxSize = team.constraints?.maxParticipants || targetTeamSize + 2;
			if (team.members.length >= maxSize) return false;

			// Check category constraints
			if (team.constraints?.excludeCategories && participant.category) {
				if (team.constraints.excludeCategories.includes(participant.category)) {
					return false;
				}
			}

			return true;
		});

		if (eligibleTeams.length === 0) {
			unassigned.push(participant);
			warnings.push(`Unable to assign ${participant.name} - no eligible teams`);
			continue;
		}

		// Assign to team with fewest members
		const targetTeam = eligibleTeams.reduce((min, team) =>
			team.members.length < min.members.length ? team : min
		);
		targetTeam.members.push(participant);
	}

	// Validate minimum team sizes
	for (const team of teams) {
		const minSize = team.constraints?.minParticipants || 3;
		if (team.members.length < minSize && team.members.length > 0) {
			warnings.push(
				`${team.name} has ${team.members.length} members (minimum: ${minSize})`
			);
		}
	}

	// Calculate balance score if balancing is enabled
	let balanceScore: number | undefined;
	if (options.balanceBy) {
		balanceScore = calculateBalanceScore(teams, options.balanceBy, options.balanceField);
	}

	return {
		teams: teams.filter((t) => t.members.length > 0),
		unassigned,
		warnings,
		metadata: {
			algorithm: 'random',
			timestamp: new Date(),
			participantCount: participants.length,
			teamCount: teams.filter((t) => t.members.length > 0).length,
			averageTeamSize:
				participants.length / teams.filter((t) => t.members.length > 0).length,
			balanceScore
		}
	};
}

/**
 * Balanced distribution for collaboration
 * Distributes participants to maximize diversity within teams
 */
export function balancedDistribution(
	participants: Participant[],
	options: DistributionOptions
): DistributionResult {
	const warnings: string[] = [];
	const balanceField = options.balanceField || 'category';
	const balanceBy = options.balanceBy || 'category';

	// Determine team configuration
	let teamCount: number;
	if (options.teamCount) {
		teamCount = options.teamCount;
	} else if (options.teamSize) {
		teamCount = Math.ceil(participants.length / options.teamSize);
	} else {
		teamCount = Math.ceil(participants.length / 6);
	}

	// Initialize teams
	const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
		id: `team-${i + 1}`,
		name: `Team ${i + 1}`,
		members: [],
		constraints: options.constraints?.[i]
	}));

	// Group participants by balance field
	const grouped = new Map<string, Participant[]>();
	const uncategorized: Participant[] = [];

	for (const participant of participants) {
		let key: string | undefined;

		if (balanceBy === 'category') {
			key = participant.category;
		} else if (balanceBy === 'preference') {
			key = participant.preference;
		} else if (balanceBy === 'custom' && balanceField) {
			key = participant.customFields?.[balanceField];
		}

		if (key) {
			const group = grouped.get(key) || [];
			group.push(participant);
			grouped.set(key, group);
		} else {
			uncategorized.push(participant);
		}
	}

	// Sort groups by size (distribute larger groups first)
	const sortedGroups = Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length);

	// Distribute groups using round-robin
	const rng = new SeededRandom(options.seed || Date.now());
	for (const [category, members] of sortedGroups) {
		const shuffled = rng.shuffle(members);

		for (let i = 0; i < shuffled.length; i++) {
			const teamIndex = i % teamCount;
			const team = teams[teamIndex];
			const participant = shuffled[i];

			// Check constraints
			const maxSize = team.constraints?.maxParticipants || Math.ceil(participants.length / teamCount) + 2;
			if (team.members.length >= maxSize) {
				warnings.push(`Team ${team.name} reached maximum size, skipping ${participant.name}`);
				continue;
			}

			team.members.push(participant);
		}
	}

	// Distribute uncategorized participants
	const unassigned: Participant[] = [];
	for (const participant of uncategorized) {
		const eligibleTeams = teams.filter((team) => {
			const maxSize = team.constraints?.maxParticipants || Math.ceil(participants.length / teamCount) + 2;
			return team.members.length < maxSize;
		});

		if (eligibleTeams.length === 0) {
			unassigned.push(participant);
			warnings.push(`Unable to assign ${participant.name} - no eligible teams`);
			continue;
		}

		// Assign to smallest team
		const targetTeam = eligibleTeams.reduce((min, team) =>
			team.members.length < min.members.length ? team : min
		);
		targetTeam.members.push(participant);
	}

	// Calculate balance score
	const balanceScore = calculateBalanceScore(teams, balanceBy, balanceField);

	return {
		teams: teams.filter((t) => t.members.length > 0),
		unassigned,
		warnings,
		metadata: {
			algorithm: 'balanced',
			timestamp: new Date(),
			participantCount: participants.length,
			teamCount: teams.filter((t) => t.members.length > 0).length,
			averageTeamSize:
				participants.length / teams.filter((t) => t.members.length > 0).length,
			balanceScore
		}
	};
}

/**
 * Calculate balance score for team distribution
 * Higher score = better balance (0-100)
 */
function calculateBalanceScore(
	teams: Team[],
	balanceBy: 'category' | 'preference' | 'custom',
	balanceField?: string
): number {
	const categoryDistribution = new Map<string, number[]>();

	for (const team of teams) {
		for (const member of team.members) {
			let key: string | undefined;

			if (balanceBy === 'category') {
				key = member.category;
			} else if (balanceBy === 'preference') {
				key = member.preference;
			} else if (balanceBy === 'custom' && balanceField) {
				key = member.customFields?.[balanceField];
			}

			if (key) {
				const counts = categoryDistribution.get(key) || new Array(teams.length).fill(0);
				const teamIndex = teams.indexOf(team);
				counts[teamIndex]++;
				categoryDistribution.set(key, counts);
			}
		}
	}

	// Calculate coefficient of variation for each category
	let totalVariation = 0;
	let categoryCount = 0;

	for (const [category, counts] of categoryDistribution) {
		const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
		if (mean === 0) continue;

		const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
		const stdDev = Math.sqrt(variance);
		const cv = stdDev / mean; // Coefficient of variation

		totalVariation += cv;
		categoryCount++;
	}

	if (categoryCount === 0) return 100;

	const avgVariation = totalVariation / categoryCount;
	// Convert to 0-100 scale (lower variation = higher score)
	const score = Math.max(0, 100 - avgVariation * 100);

	return Math.round(score);
}

/**
 * Preference-based distribution
 * Assigns participants based on their stated preferences
 */
export function preferenceDistribution(
	participants: Participant[],
	teams: Team[],
	options: DistributionOptions
): DistributionResult {
	const warnings: string[] = [];
	const assigned = new Set<string>();
	const unassigned: Participant[] = [];

	// Map team topics to team objects
	const teamsByTopic = new Map<string, Team>();
	for (const team of teams) {
		if (team.topic) {
			teamsByTopic.set(team.topic.toLowerCase(), team);
		}
	}

	// Sort participants by preference clarity (specific preferences first)
	const sorted = [...participants].sort((a, b) => {
		const aPref = a.preference?.trim() || '';
		const bPref = b.preference?.trim() || '';
		return bPref.length - aPref.length;
	});

	// Assign based on preferences
	for (const participant of sorted) {
		if (!participant.preference) {
			continue;
		}

		const prefKey = participant.preference.toLowerCase().trim();
		const team = teamsByTopic.get(prefKey);

		if (team) {
			const maxSize = team.maxSize || team.constraints?.maxParticipants || 50;
			if (team.members.length < maxSize) {
				team.members.push(participant);
				assigned.add(participant.id);
			} else {
				warnings.push(`${team.name} is full, cannot assign ${participant.name}`);
			}
		}
	}

	// Assign remaining participants using balanced distribution
	const remaining = participants.filter((p) => !assigned.has(p.id));
	if (remaining.length > 0) {
		const teamsWithSpace = teams.filter((team) => {
			const maxSize = team.maxSize || team.constraints?.maxParticipants || 50;
			return team.members.length < maxSize;
		});

		for (const participant of remaining) {
			if (teamsWithSpace.length === 0) {
				unassigned.push(participant);
				warnings.push(`No available teams for ${participant.name}`);
				continue;
			}

			// Assign to smallest team
			const targetTeam = teamsWithSpace.reduce((min, team) =>
				team.members.length < min.members.length ? team : min
			);

			targetTeam.members.push(participant);

			// Remove team if full
			const maxSize = targetTeam.maxSize || targetTeam.constraints?.maxParticipants || 50;
			if (targetTeam.members.length >= maxSize) {
				const index = teamsWithSpace.indexOf(targetTeam);
				teamsWithSpace.splice(index, 1);
			}
		}
	}

	return {
		teams: teams.filter((t) => t.members.length > 0),
		unassigned,
		warnings,
		metadata: {
			algorithm: 'preference',
			timestamp: new Date(),
			participantCount: participants.length,
			teamCount: teams.filter((t) => t.members.length > 0).length,
			averageTeamSize:
				participants.length / teams.filter((t) => t.members.length > 0).length
		}
	};
}

/**
 * Distribute a single participant to the best available team
 */
export function assignParticipantToTeam(
	participant: Participant,
	teams: Team[],
	strategy: 'smallest' | 'balanced' | 'random' = 'smallest'
): Team | null {
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

	if (eligibleTeams.length === 0) return null;

	switch (strategy) {
		case 'smallest':
			return eligibleTeams.reduce((min, team) =>
				team.members.length < min.members.length ? team : min
			);

		case 'balanced': {
			// Find team that would improve overall balance
			let bestTeam = eligibleTeams[0];
			let bestScore = -1;

			for (const team of eligibleTeams) {
				// Simulate adding participant
				team.members.push(participant);
				const score = calculateBalanceScore(teams, 'category');
				team.members.pop();

				if (score > bestScore) {
					bestScore = score;
					bestTeam = team;
				}
			}

			return bestTeam;
		}

		case 'random': {
			const index = Math.floor(Math.random() * eligibleTeams.length);
			return eligibleTeams[index];
		}
	}
}

/**
 * Rebalance teams by moving participants between teams
 */
export function rebalanceTeams(
	teams: Team[],
	options: { maxIterations?: number; balanceBy?: 'size' | 'category' } = {}
): { teams: Team[]; moveCount: number } {
	const maxIterations = options.maxIterations || 10;
	const balanceBy = options.balanceBy || 'size';
	let moveCount = 0;

	for (let i = 0; i < maxIterations; i++) {
		let moved = false;

		if (balanceBy === 'size') {
			// Find largest and smallest teams
			const sorted = [...teams].sort((a, b) => b.members.length - a.members.length);
			const largest = sorted[0];
			const smallest = sorted[sorted.length - 1];

			// Move participant from largest to smallest if beneficial
			if (largest.members.length - smallest.members.length > 1) {
				const participant = largest.members.pop();
				if (participant) {
					smallest.members.push(participant);
					moveCount++;
					moved = true;
				}
			}
		}

		if (!moved) break;
	}

	return { teams, moveCount };
}
