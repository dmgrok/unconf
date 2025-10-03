/**
 * Achievement Tracker Service
 * Handles achievement progress tracking and unlocking
 */

import type {
	Achievement,
	UserAchievement,
	AchievementProgress
} from './types';
import { ACHIEVEMENTS, getAchievementById } from './types';

export interface UserStats {
	events_joined: number;
	events_organized: number;
	votes_cast: number;
	voting_sessions: number;
	topics_created: number;
	games_played: number;
	word_chain_contributions: number;
	discussions_joined: number;
	teams_joined: number;
	max_participants: number;
	join_position?: number;
	vote_accuracy?: number;
	event_streak: number;
	join_time?: number; // Hour of day (0-23)
}

export class AchievementTracker {
	private userAchievements: Map<string, UserAchievement[]> = new Map();
	private userStats: Map<string, UserStats> = new Map();

	/**
	 * Initialize user stats
	 */
	initializeUserStats(userId: string): void {
		if (!this.userStats.has(userId)) {
			this.userStats.set(userId, {
				events_joined: 0,
				events_organized: 0,
				votes_cast: 0,
				voting_sessions: 0,
				topics_created: 0,
				games_played: 0,
				word_chain_contributions: 0,
				discussions_joined: 0,
				teams_joined: 0,
				max_participants: 0,
				event_streak: 0
			});
		}
	}

	/**
	 * Update user stat
	 */
	updateStat(userId: string, statName: keyof UserStats, value: number): void {
		this.initializeUserStats(userId);
		const stats = this.userStats.get(userId)!;
		(stats[statName] as number) = value;
		this.checkAchievements(userId);
	}

	/**
	 * Increment user stat
	 */
	incrementStat(userId: string, statName: keyof UserStats, increment: number = 1): void {
		this.initializeUserStats(userId);
		const stats = this.userStats.get(userId)!;
		const currentValue = (stats[statName] as number) || 0;
		(stats[statName] as number) = currentValue + increment;
		this.checkAchievements(userId);
	}

	/**
	 * Get user stats
	 */
	getUserStats(userId: string): UserStats {
		this.initializeUserStats(userId);
		return this.userStats.get(userId)!;
	}

	/**
	 * Check if user has unlocked achievement
	 */
	hasAchievement(userId: string, achievementId: string): boolean {
		const achievements = this.userAchievements.get(userId) || [];
		return achievements.some((a) => a.achievementId === achievementId);
	}

	/**
	 * Get user's unlocked achievements
	 */
	getUserAchievements(userId: string): UserAchievement[] {
		return this.userAchievements.get(userId) || [];
	}

	/**
	 * Calculate achievement progress
	 */
	getAchievementProgress(userId: string, achievement: Achievement): AchievementProgress {
		const stats = this.getUserStats(userId);
		const current = (stats[achievement.requirement.type as keyof UserStats] as number) || 0;
		const target = achievement.requirement.target;
		const percentage = Math.min(100, Math.floor((current / target) * 100));

		return {
			achievementId: achievement.id,
			current,
			target,
			percentage
		};
	}

	/**
	 * Get all achievements with progress
	 */
	getAllAchievementsWithProgress(userId: string): Array<Achievement & { progress: AchievementProgress; unlocked: boolean }> {
		return ACHIEVEMENTS.map((achievement) => ({
			...achievement,
			progress: this.getAchievementProgress(userId, achievement),
			unlocked: this.hasAchievement(userId, achievement.id)
		}));
	}

	/**
	 * Check and unlock achievements for user
	 */
	checkAchievements(userId: string): UserAchievement[] {
		const stats = this.getUserStats(userId);
		const newlyUnlocked: UserAchievement[] = [];

		for (const achievement of ACHIEVEMENTS) {
			// Skip if already unlocked
			if (this.hasAchievement(userId, achievement.id)) {
				continue;
			}

			// Check if requirements are met
			if (this.checkRequirement(achievement, stats)) {
				const userAchievement: UserAchievement = {
					achievementId: achievement.id,
					userId,
					unlockedAt: new Date(),
					progress: 100,
					notificationShown: false
				};

				// Add to user's achievements
				const achievements = this.userAchievements.get(userId) || [];
				achievements.push(userAchievement);
				this.userAchievements.set(userId, achievements);

				newlyUnlocked.push(userAchievement);
			}
		}

		return newlyUnlocked;
	}

	/**
	 * Check if achievement requirement is met
	 */
	private checkRequirement(achievement: Achievement, stats: UserStats): boolean {
		const { type, target } = achievement.requirement;
		const current = stats[type as keyof UserStats] as number;

		if (current === undefined) {
			return false;
		}

		return current >= target;
	}

	/**
	 * Mark notification as shown
	 */
	markNotificationShown(userId: string, achievementId: string): void {
		const achievements = this.userAchievements.get(userId) || [];
		const achievement = achievements.find((a) => a.achievementId === achievementId);
		if (achievement) {
			achievement.notificationShown = true;
		}
	}

	/**
	 * Get pending notifications
	 */
	getPendingNotifications(userId: string): UserAchievement[] {
		const achievements = this.userAchievements.get(userId) || [];
		return achievements.filter((a) => !a.notificationShown);
	}

	/**
	 * Calculate total points earned
	 */
	getTotalPoints(userId: string): number {
		const achievements = this.getUserAchievements(userId);
		return achievements.reduce((total, userAchievement) => {
			const achievement = getAchievementById(userAchievement.achievementId);
			return total + (achievement?.points || 0);
		}, 0);
	}

	/**
	 * Get achievement completion percentage
	 */
	getCompletionPercentage(userId: string): number {
		const unlockedCount = this.getUserAchievements(userId).length;
		const totalCount = ACHIEVEMENTS.length;
		return Math.floor((unlockedCount / totalCount) * 100);
	}

	/**
	 * Get achievements by category with progress
	 */
	getAchievementsByCategory(userId: string, category: string): Array<Achievement & { progress: AchievementProgress; unlocked: boolean }> {
		return this.getAllAchievementsWithProgress(userId).filter(
			(a) => a.category === category
		);
	}

	/**
	 * Get next achievement to unlock
	 */
	getNextAchievement(userId: string): (Achievement & { progress: AchievementProgress }) | null {
		const achievementsWithProgress = this.getAllAchievementsWithProgress(userId)
			.filter((a) => !a.unlocked)
			.sort((a, b) => b.progress.percentage - a.progress.percentage);

		return achievementsWithProgress[0] || null;
	}

	/**
	 * Export user data
	 */
	exportUserData(userId: string): {
		stats: UserStats;
		achievements: UserAchievement[];
		totalPoints: number;
		completionPercentage: number;
	} {
		return {
			stats: this.getUserStats(userId),
			achievements: this.getUserAchievements(userId),
			totalPoints: this.getTotalPoints(userId),
			completionPercentage: this.getCompletionPercentage(userId)
		};
	}

	/**
	 * Import user data
	 */
	importUserData(userId: string, data: {
		stats: UserStats;
		achievements: UserAchievement[];
	}): void {
		this.userStats.set(userId, data.stats);
		this.userAchievements.set(userId, data.achievements);
	}

	/**
	 * Clear user data (for testing or reset)
	 */
	clearUserData(userId: string): void {
		this.userStats.delete(userId);
		this.userAchievements.delete(userId);
	}
}

// Export singleton instance
export const achievementTracker = new AchievementTracker();
