/**
 * Achievement System Types and Definitions
 */

export enum AchievementCategory {
	PARTICIPATION = 'participation',
	VOTING = 'voting',
	GAMES = 'games',
	SOCIAL = 'social',
	ORGANIZER = 'organizer',
	SPECIAL = 'special'
}

export enum AchievementTier {
	BRONZE = 'bronze',
	SILVER = 'silver',
	GOLD = 'gold',
	PLATINUM = 'platinum'
}

export interface Achievement {
	id: string;
	name: string;
	description: string;
	category: AchievementCategory;
	tier: AchievementTier;
	icon: string;
	points: number;
	requirement: {
		type: string;
		target: number;
		description: string;
	};
	secret?: boolean; // Hidden until unlocked
}

export interface UserAchievement {
	achievementId: string;
	userId: string;
	unlockedAt: Date;
	progress: number; // 0-100
	notificationShown: boolean;
}

export interface AchievementProgress {
	achievementId: string;
	current: number;
	target: number;
	percentage: number;
}

/**
 * Pre-defined achievements
 */
export const ACHIEVEMENTS: Achievement[] = [
	// Participation Achievements
	{
		id: 'first-event',
		name: 'First Timer',
		description: 'Join your first unconference event',
		category: AchievementCategory.PARTICIPATION,
		tier: AchievementTier.BRONZE,
		icon: '🎉',
		points: 10,
		requirement: {
			type: 'events_joined',
			target: 1,
			description: 'Join 1 event'
		}
	},
	{
		id: 'event-regular',
		name: 'Regular Attendee',
		description: 'Join 5 unconference events',
		category: AchievementCategory.PARTICIPATION,
		tier: AchievementTier.SILVER,
		icon: '🎯',
		points: 25,
		requirement: {
			type: 'events_joined',
			target: 5,
			description: 'Join 5 events'
		}
	},
	{
		id: 'event-veteran',
		name: 'Veteran Participant',
		description: 'Join 20 unconference events',
		category: AchievementCategory.PARTICIPATION,
		tier: AchievementTier.GOLD,
		icon: '🏆',
		points: 100,
		requirement: {
			type: 'events_joined',
			target: 20,
			description: 'Join 20 events'
		}
	},

	// Voting Achievements
	{
		id: 'first-vote',
		name: 'Voice Heard',
		description: 'Cast your first vote',
		category: AchievementCategory.VOTING,
		tier: AchievementTier.BRONZE,
		icon: '🗳️',
		points: 10,
		requirement: {
			type: 'votes_cast',
			target: 1,
			description: 'Cast 1 vote'
		}
	},
	{
		id: 'active-voter',
		name: 'Active Voter',
		description: 'Cast votes in 10 different events',
		category: AchievementCategory.VOTING,
		tier: AchievementTier.SILVER,
		icon: '📊',
		points: 30,
		requirement: {
			type: 'voting_sessions',
			target: 10,
			description: 'Vote in 10 events'
		}
	},
	{
		id: 'democracy-champion',
		name: 'Democracy Champion',
		description: 'Cast votes in 50 events',
		category: AchievementCategory.VOTING,
		tier: AchievementTier.GOLD,
		icon: '🏅',
		points: 150,
		requirement: {
			type: 'voting_sessions',
			target: 50,
			description: 'Vote in 50 events'
		}
	},
	{
		id: 'topic-creator',
		name: 'Topic Creator',
		description: 'Submit your first discussion topic',
		category: AchievementCategory.VOTING,
		tier: AchievementTier.BRONZE,
		icon: '💡',
		points: 15,
		requirement: {
			type: 'topics_created',
			target: 1,
			description: 'Create 1 topic'
		}
	},
	{
		id: 'idea-generator',
		name: 'Idea Generator',
		description: 'Submit 20 discussion topics',
		category: AchievementCategory.VOTING,
		tier: AchievementTier.SILVER,
		icon: '✨',
		points: 50,
		requirement: {
			type: 'topics_created',
			target: 20,
			description: 'Create 20 topics'
		}
	},

	// Game Achievements
	{
		id: 'game-player',
		name: 'Game Player',
		description: 'Participate in your first group intelligence game',
		category: AchievementCategory.GAMES,
		tier: AchievementTier.BRONZE,
		icon: '🎮',
		points: 10,
		requirement: {
			type: 'games_played',
			target: 1,
			description: 'Play 1 game'
		}
	},
	{
		id: 'word-chain-master',
		name: 'Word Chain Master',
		description: 'Complete 10 word chain contributions',
		category: AchievementCategory.GAMES,
		tier: AchievementTier.SILVER,
		icon: '⛓️',
		points: 30,
		requirement: {
			type: 'word_chain_contributions',
			target: 10,
			description: 'Contribute 10 words to chains'
		}
	},
	{
		id: 'game-enthusiast',
		name: 'Game Enthusiast',
		description: 'Participate in 25 different games',
		category: AchievementCategory.GAMES,
		tier: AchievementTier.GOLD,
		icon: '🌟',
		points: 100,
		requirement: {
			type: 'games_played',
			target: 25,
			description: 'Play 25 games'
		}
	},

	// Social Achievements
	{
		id: 'discussion-joiner',
		name: 'Discussion Joiner',
		description: 'Join your first discussion group',
		category: AchievementCategory.SOCIAL,
		tier: AchievementTier.BRONZE,
		icon: '💬',
		points: 10,
		requirement: {
			type: 'discussions_joined',
			target: 1,
			description: 'Join 1 discussion'
		}
	},
	{
		id: 'conversationalist',
		name: 'Conversationalist',
		description: 'Participate in 15 discussion groups',
		category: AchievementCategory.SOCIAL,
		tier: AchievementTier.SILVER,
		icon: '🗨️',
		points: 40,
		requirement: {
			type: 'discussions_joined',
			target: 15,
			description: 'Join 15 discussions'
		}
	},
	{
		id: 'social-butterfly',
		name: 'Social Butterfly',
		description: 'Participate in 50 discussion groups',
		category: AchievementCategory.SOCIAL,
		tier: AchievementTier.GOLD,
		icon: '🦋',
		points: 150,
		requirement: {
			type: 'discussions_joined',
			target: 50,
			description: 'Join 50 discussions'
		}
	},
	{
		id: 'team-player',
		name: 'Team Player',
		description: 'Be assigned to your first team',
		category: AchievementCategory.SOCIAL,
		tier: AchievementTier.BRONZE,
		icon: '👥',
		points: 10,
		requirement: {
			type: 'teams_joined',
			target: 1,
			description: 'Join 1 team'
		}
	},

	// Organizer Achievements
	{
		id: 'first-organizer',
		name: 'First Event',
		description: 'Organize your first unconference',
		category: AchievementCategory.ORGANIZER,
		tier: AchievementTier.SILVER,
		icon: '🎬',
		points: 50,
		requirement: {
			type: 'events_organized',
			target: 1,
			description: 'Organize 1 event'
		}
	},
	{
		id: 'experienced-organizer',
		name: 'Experienced Organizer',
		description: 'Successfully organize 10 events',
		category: AchievementCategory.ORGANIZER,
		tier: AchievementTier.GOLD,
		icon: '⭐',
		points: 200,
		requirement: {
			type: 'events_organized',
			target: 10,
			description: 'Organize 10 events'
		}
	},
	{
		id: 'crowd-pleaser',
		name: 'Crowd Pleaser',
		description: 'Host an event with 50+ participants',
		category: AchievementCategory.ORGANIZER,
		tier: AchievementTier.GOLD,
		icon: '🎪',
		points: 100,
		requirement: {
			type: 'max_participants',
			target: 50,
			description: 'Host event with 50+ people'
		}
	},

	// Special Achievements
	{
		id: 'early-bird',
		name: 'Early Bird',
		description: 'Be one of the first 10 to join an event',
		category: AchievementCategory.SPECIAL,
		tier: AchievementTier.SILVER,
		icon: '🐦',
		points: 25,
		requirement: {
			type: 'join_position',
			target: 10,
			description: 'Join in first 10 participants'
		}
	},
	{
		id: 'perfect-vote',
		name: 'Perfect Prediction',
		description: 'All your voted topics make it to discussions',
		category: AchievementCategory.SPECIAL,
		tier: AchievementTier.GOLD,
		icon: '🎯',
		points: 75,
		requirement: {
			type: 'vote_accuracy',
			target: 100,
			description: '100% vote accuracy'
		},
		secret: true
	},
	{
		id: 'streak-5',
		name: '5-Event Streak',
		description: 'Participate in 5 consecutive events',
		category: AchievementCategory.SPECIAL,
		tier: AchievementTier.SILVER,
		icon: '🔥',
		points: 50,
		requirement: {
			type: 'event_streak',
			target: 5,
			description: '5 event streak'
		}
	},
	{
		id: 'night-owl',
		name: 'Night Owl',
		description: 'Join an event between midnight and 5 AM',
		category: AchievementCategory.SPECIAL,
		tier: AchievementTier.BRONZE,
		icon: '🦉',
		points: 20,
		requirement: {
			type: 'join_time',
			target: 1,
			description: 'Join between 00:00-05:00'
		},
		secret: true
	}
];

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
	return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
	return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * Get achievements by tier
 */
export function getAchievementsByTier(tier: AchievementTier): Achievement[] {
	return ACHIEVEMENTS.filter((a) => a.tier === tier);
}

/**
 * Get total possible points
 */
export function getTotalPossiblePoints(): number {
	return ACHIEVEMENTS.reduce((sum, achievement) => sum + achievement.points, 0);
}
