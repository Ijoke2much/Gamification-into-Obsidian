// Achievement Event Service
// Connects game events to achievement progress tracking

import { ACHIEVEMENTS, AchievementTracker } from '../../../data/models/AchievementSystem';
import { EnhancedAchievementProcessor } from '../utils/achievementProcessor';
import { emitAchievementUnlocked } from '../../../shared/utils/achievementGalleryEvents';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

export interface GameEvent {
    type: 'quest_completed' | 'task_completed' | 'pomodoro_completed' | 'level_up' |
    'coins_earned' | 'item_purchased' | 'habit_completed' | 'energy_depleted' |
    'boss_defeated' | 'craft_item' | 'login_streak' | 'xp_gained' |
    'energy_efficiency' | 'energy_conservation' | 'energy_restoration' |
    'habit_streak' | 'habit_category_completed' | 'crafting_milestone' |
    'boss_streak' | 'boss_difficulty_completed';
    data: Record<string, unknown>;
    timestamp: Date;
}

export class AchievementEventService {
    private tracker: AchievementTracker;
    private processor: EnhancedAchievementProcessor;
    private eventHistory: GameEvent[] = [];

    constructor() {
        this.tracker = new AchievementTracker();
        this.processor = new EnhancedAchievementProcessor(this.tracker);
    }

    /**
     * Process a game event and trigger relevant achievements
     */
    async processGameEvent(event: GameEvent): Promise<void> {
        // Add to history
        this.eventHistory.push(event);

        // Keep only last 1000 events
        if (this.eventHistory.length > 1000) {
            this.eventHistory = this.eventHistory.slice(-500);
        }

        // Process achievement triggers based on event type
        switch (event.type) {
            case 'quest_completed':
                await this.handleQuestCompleted(event);
                break;
            case 'task_completed':
                await this.handleTaskCompleted(event);
                break;
            case 'pomodoro_completed':
                await this.handlePomodoroCompleted(event);
                break;
            case 'level_up':
                await this.handleLevelUp(event);
                break;
            case 'coins_earned':
                await this.handleCoinsEarned(event);
                break;
            case 'item_purchased':
                await this.handleItemPurchased(event);
                break;
            case 'habit_completed':
                await this.handleHabitCompleted(event);
                break;
            case 'energy_depleted':
                await this.handleEnergyDepleted(event);
                break;
            case 'boss_defeated':
                await this.handleBossDefeated(event);
                break;
            case 'craft_item':
                await this.handleCraftItem(event);
                break;
            case 'login_streak':
                await this.handleLoginStreak(event);
                break;
            case 'xp_gained':
                await this.handleXPGained(event);
                break;
            case 'energy_efficiency':
                await this.handleEnergyEfficiency(event);
                break;
            case 'energy_conservation':
                await this.handleEnergyConservation(event);
                break;
            case 'energy_restoration':
                await this.handleEnergyRestoration(event);
                break;
            case 'habit_streak':
                await this.handleHabitStreak(event);
                break;
            case 'habit_category_completed':
                await this.handleHabitCategoryCompleted(event);
                break;
            case 'crafting_milestone':
                await this.handleCraftingMilestone(event);
                break;
            case 'boss_streak':
                await this.handleBossStreak(event);
                break;
            case 'boss_difficulty_completed':
                await this.handleBossDifficultyCompleted(event);
                break;
        }
    }

    private async handleQuestCompleted(event: GameEvent): Promise<void> {
        const questData = event.data.questData as { difficulty?: string; completion?: number } | undefined;

        // First Quest
        this.updateAchievementProgress('first_quest', 1);

        // Quest Master achievements (milestone-based)
        const questCount = this.countEventsByType('quest_completed');
        this.updateAchievementProgress('quest_master_5', questCount);
        this.updateAchievementProgress('quest_master_25', questCount);
        this.updateAchievementProgress('quest_master_100', questCount);

        // Check for specific quest types
        if (questData?.difficulty === 'hard') {
            this.updateAchievementProgress('hard_quest_master', 1);
        }

        // Perfect streak achievements
        if (questData?.completion === 100) {
            const perfectStreak = this.countRecentPerfectQuests();
            this.updateAchievementProgress('perfect_streak_10', perfectStreak);
        }
    }

    private async handleTaskCompleted(event: GameEvent): Promise<void> {
        // Task completion achievements
        const taskCount = this.countEventsByType('task_completed');
        this.updateAchievementProgress('task_novice', taskCount);
        this.updateAchievementProgress('task_expert', taskCount);
        this.updateAchievementProgress('task_master', taskCount);

        // Same day task completions
        const todayTasks = this.countEventsToday('task_completed');
        this.updateAchievementProgress('productive_day', todayTasks);
        this.updateAchievementProgress('super_productive', todayTasks);
    }

    private async handlePomodoroCompleted(event: GameEvent): Promise<void> {
        const pomodoroData = event.data.pomodoroData as { duration?: number } | undefined;

        // Pomodoro achievement tracking
        const pomodoroCount = this.countEventsByType('pomodoro_completed');
        this.updateAchievementProgress('pomodoro_starter', pomodoroCount);
        this.updateAchievementProgress('focus_master', pomodoroCount);

        // Long focus sessions
        if (typeof pomodoroData?.duration === 'number' && pomodoroData.duration >= 50) {
            this.updateAchievementProgress('deep_focus', 1);
        }

        // Daily pomodoro streaks
        const todayPomodoros = this.countEventsToday('pomodoro_completed');
        this.updateAchievementProgress('daily_focus', todayPomodoros);
    }

    private async handleLevelUp(event: GameEvent): Promise<void> {
        const newLevel = typeof event.data.newLevel === 'number' ? event.data.newLevel : 1;

        // Level milestone achievements
        this.updateAchievementProgress('level_5', newLevel);
        this.updateAchievementProgress('level_10', newLevel);
        this.updateAchievementProgress('level_25', newLevel);
        this.updateAchievementProgress('level_50', newLevel);
        this.updateAchievementProgress('level_100', newLevel);
    }

    private async handleCoinsEarned(event: GameEvent): Promise<void> {
        const amount = typeof event.data.amount === 'number' ? event.data.amount : 0;
        const totalCoins = typeof event.data.totalCoins === 'number' ? event.data.totalCoins : 0;

        // Wealth achievements based on total coins
        this.updateAchievementProgress('first_coin', totalCoins);
        this.updateAchievementProgress('coin_collector', totalCoins);
        this.updateAchievementProgress('wealthy', totalCoins);
        this.updateAchievementProgress('millionaire', totalCoins);

        // Big earnings achievements
        if (amount >= 1000) {
            this.updateAchievementProgress('big_earner', 1);
        }
    }

    private async handleItemPurchased(event: GameEvent): Promise<void> {
        const item = event.data.item as { price?: number } | undefined;
        const totalPurchases = typeof event.data.totalPurchases === 'number' ? event.data.totalPurchases : 0;

        // Shopping achievements
        this.updateAchievementProgress('first_purchase', totalPurchases);
        this.updateAchievementProgress('shopping_spree', totalPurchases);

        // Expensive item achievement
        if (typeof item?.price === 'number' && item.price >= 5000) {
            this.updateAchievementProgress('big_spender', 1);
        }
    }

    private async handleHabitCompleted(event: GameEvent): Promise<void> {
        const habitData = event.data.habitData as { streak?: number } | undefined;

        // Habit achievements
        const habitCount = this.countEventsByType('habit_completed');
        this.updateAchievementProgress('habit_former', habitCount);
        this.updateAchievementProgress('routine_master', habitCount);

        // Streak-based achievements
        if (typeof habitData?.streak === 'number') {
            if (habitData.streak >= 7) {
                this.updateAchievementProgress('week_warrior', 1);
            }
            if (habitData.streak >= 30) {
                this.updateAchievementProgress('habit_legend', 1);
            }
        }
    }

    private async handleEnergyDepleted(event: GameEvent): Promise<void> {
        // Dedication achievement for running out of energy
        this.updateAchievementProgress('energy_dedication', 1);
    }

    private async handleBossDefeated(event: GameEvent): Promise<void> {
        const bossData = event.data.bossData as { difficulty?: string } | undefined;

        // Boss achievements
        const bossCount = this.countEventsByType('boss_defeated');
        this.updateAchievementProgress('first_boss', bossCount);
        this.updateAchievementProgress('boss_slayer', bossCount);

        // Difficulty-based achievements
        if (bossData?.difficulty === 'legendary') {
            this.updateAchievementProgress('legendary_hunter', 1);
        }
    }

    private async handleCraftItem(event: GameEvent): Promise<void> {
        const craftCount = this.countEventsByType('craft_item');
        this.updateAchievementProgress('crafter', craftCount);
        this.updateAchievementProgress('master_crafter', craftCount);
    }

    private async handleLoginStreak(event: GameEvent): Promise<void> {
        const streakDays = typeof event.data.streakDays === 'number' ? event.data.streakDays : 0;

        // Login streak achievements
        this.updateAchievementProgress('daily_visitor', streakDays);
        this.updateAchievementProgress('week_visitor', streakDays);
        this.updateAchievementProgress('dedication_master', streakDays);
    }

    private async handleXPGained(event: GameEvent): Promise<void> {
        const amount = typeof event.data.amount === 'number' ? event.data.amount : 0;
        const totalXP = typeof event.data.totalXP === 'number' ? event.data.totalXP : 0;

        // XP-based achievements
        this.updateAchievementProgress('xp_hunter', totalXP);
        this.updateAchievementProgress('experience_master', totalXP);

        // Big XP gain achievement
        if (amount >= 500) {
            this.updateAchievementProgress('big_xp_gain', 1);
        }
    }

    private updateAchievementProgress(achievementId: string, progress: number): void {
        const result = this.processor.processAchievementProgress(achievementId, progress);

        if (result?.type === 'unlocked') {
            // Show notification for unlocked achievement
            pixelNotice(`🏆 Achievement Unlocked: ${result.achievement.title}!`, 5000);

            // Trigger achievement notification component if available
            this.triggerAchievementNotification(result.achievement);
        }
    }

    private triggerAchievementNotification(achievement: { id: string; title: string; description?: string }): void {
        const full = ACHIEVEMENTS.find((a) => a.id === achievement.id);
        if (full) {
            emitAchievementUnlocked(full);
        }
    }

    private countEventsByType(type: string): number {
        return this.eventHistory.filter(event => event.type === type).length;
    }

    private countEventsToday(type: string): number {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.eventHistory.filter(event =>
            event.type === type &&
            event.timestamp >= today
        ).length;
    }

    private countRecentPerfectQuests(): number {
        const recent = this.eventHistory
            .filter(event => event.type === 'quest_completed')
            .slice(-10); // Last 10 quests

        let streak = 0;
        for (let i = recent.length - 1; i >= 0; i--) {
            const questData = recent[i].data.questData as { completion?: number } | undefined;
            if (questData?.completion === 100) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    // === NEW ACHIEVEMENT HANDLERS ===

    private async handleEnergyEfficiency(event: GameEvent): Promise<void> {
        const efficiency = typeof event.data.efficiency === 'number' ? event.data.efficiency : 0;
        const taskCount = this.countEventsByType('energy_efficiency');

        // Energy efficiency achievements
        if (efficiency >= 80) {
            this.updateAchievementProgress('energy_efficiency_master', taskCount);
        }
        if (efficiency >= 100) {
            this.updateAchievementProgress('energy_legend', taskCount);
        }
    }

    private async handleEnergyConservation(event: GameEvent): Promise<void> {
        const daysMaintained = typeof event.data.daysMaintained === 'number' ? event.data.daysMaintained : 0;

        // Energy conservation achievements
        this.updateAchievementProgress('energy_conservation_novice', daysMaintained);
        this.updateAchievementProgress('energy_management_guru', daysMaintained);
    }

    private async handleEnergyRestoration(event: GameEvent): Promise<void> {
        const restorationCount = this.countEventsByType('energy_restoration');

        // Energy restoration achievements
        this.updateAchievementProgress('energy_restoration_expert', restorationCount);
    }

    private async handleHabitStreak(event: GameEvent): Promise<void> {
        const streakDays = typeof event.data.streakDays === 'number' ? event.data.streakDays : 0;

        // Habit streak achievements
        this.updateAchievementProgress('habit_starter', Math.min(streakDays, 1));
        this.updateAchievementProgress('habit_builder', streakDays);
        this.updateAchievementProgress('habit_master', streakDays);
        this.updateAchievementProgress('habit_legend', streakDays);
    }

    private async handleHabitCategoryCompleted(event: GameEvent): Promise<void> {
        const categoriesCompleted = typeof event.data.categoriesCompleted === 'number' ? event.data.categoriesCompleted : 0;

        // Habit category achievements
        this.updateAchievementProgress('habit_category_expert', categoriesCompleted);
    }

    private async handleCraftingMilestone(event: GameEvent): Promise<void> {
        const craftCount = this.countEventsByType('craft_item');
        const rarity = event.data.rarity as string;
        const efficiency = typeof event.data.efficiency === 'number' ? event.data.efficiency : 0;

        // Crafting count achievements
        this.updateAchievementProgress('crafting_novice', Math.min(craftCount, 1));
        this.updateAchievementProgress('crafting_apprentice', craftCount);
        this.updateAchievementProgress('crafting_master', craftCount);

        // Rarity achievements
        if (rarity === 'rare') {
            this.updateAchievementProgress('rare_crafter', 1);
        }

        // Efficiency achievements
        if (efficiency >= 100) {
            const perfectCrafts = this.eventHistory.filter(e =>
                e.type === 'crafting_milestone' &&
                typeof e.data.efficiency === 'number' &&
                e.data.efficiency >= 100
            ).length;
            this.updateAchievementProgress('crafting_legend', perfectCrafts);
        }
    }

    private async handleBossStreak(event: GameEvent): Promise<void> {
        const streakCount = typeof event.data.streakCount === 'number' ? event.data.streakCount : 0;

        // Boss streak achievements
        this.updateAchievementProgress('boss_streak_master', streakCount);
    }

    private async handleBossDifficultyCompleted(event: GameEvent): Promise<void> {
        const difficulty = event.data.difficulty as string;

        // Boss difficulty achievements
        if (difficulty === 'legendary') {
            this.updateAchievementProgress('legendary_boss_slayer', 1);
        }
    }

    /**
     * Get achievement statistics
     */
    getAchievementStats() {
        return {
            totalUnlocked: this.tracker.getCompletedAchievements().length,
            totalAvailable: this.tracker.getAllAchievements().length,
            recentEvents: this.eventHistory.slice(-10),
            processor: this.processor
        };
    }
}

// Global service instance
export const achievementEventService = new AchievementEventService();
