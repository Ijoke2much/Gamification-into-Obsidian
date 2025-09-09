import { Notice } from 'obsidian';
import { Boss, BossBattleRecord, PlayerStats } from '../types/BossTypes';
import { EnhancedBattleState, BossPersonality } from '../types/EnhancedMoveTypes';

/**
 * Boss Achievement System
 * Tracks boss-specific achievements, mastery levels, and progression
 */
export class BossAchievementSystem {
    private static instance: BossAchievementSystem;
    private achievements: Map<string, BossAchievement> = new Map();
    private playerProgress: BossAchievementProgress = {
        unlockedAchievements: [],
        masteryLevels: new Map(),
        totalBossesDefeated: 0,
        totalBattleTime: 0,
        personalityMastery: new Map(),
        specialTitles: [],
        streakRecords: {
            currentWinStreak: 0,
            bestWinStreak: 0,
            currentPerfectStreak: 0,
            bestPerfectStreak: 0
        },
        battleStatistics: {
            totalBattles: 0,
            victories: 0,
            defeats: 0,
            retreats: 0,
            averageBattleTime: 0,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
            movesMastered: [],
            combosExecuted: 0,
            criticalHits: 0
        }
    };

    private constructor() {
        this.initializeAchievements();
        this.loadProgress();
    }

    static getInstance(): BossAchievementSystem {
        if (!BossAchievementSystem.instance) {
            BossAchievementSystem.instance = new BossAchievementSystem();
        }
        return BossAchievementSystem.instance;
    }

    /**
     * Process battle completion and check for achievements
     */
    async processBattleCompletion(
        boss: Boss,
        battleRecord: BossBattleRecord,
        battleState: EnhancedBattleState
    ): Promise<AchievementResult[]> {
        const newAchievements: AchievementResult[] = [];

        // Update battle statistics
        this.updateBattleStatistics(battleRecord, battleState);

        // Check all achievement conditions
        for (const [achievementId, achievement] of this.achievements.entries()) {
            if (this.playerProgress.unlockedAchievements.includes(achievementId)) {
                continue; // Already unlocked
            }

            if (await this.checkAchievementCondition(achievement, boss, battleRecord, battleState)) {
                await this.unlockAchievement(achievement);
                newAchievements.push({
                    achievement,
                    timestamp: new Date(),
                    context: {
                        bossName: boss.name,
                        battleDuration: battleRecord.duration,
                        result: battleRecord.result
                    }
                });
            }
        }

        // Update mastery levels
        this.updateMasteryLevel(boss, battleRecord);

        // Update personality mastery
        if (boss.ai?.personality) {
            this.updatePersonalityMastery(boss.ai.personality, battleRecord);
        }

        // Save progress
        await this.saveProgress();

        return newAchievements;
    }

    /**
     * Initialize all boss achievements
     */
    private initializeAchievements(): void {
        // === FIRST VICTORY ACHIEVEMENTS ===
        this.achievements.set('first_boss_defeat', {
            id: 'first_boss_defeat',
            name: 'Boss Slayer',
            description: 'Defeat your first boss',
            icon: '🗡️',
            rarity: 'common',
            category: 'progression',
            condition: {
                type: 'total_bosses_defeated',
                value: 1
            },
            rewards: {
                title: 'Boss Slayer',
                coins: 100,
                xp: 50,
                unlocks: ['boss_analyzer_feature']
            }
        });

        // === SPEED ACHIEVEMENTS ===
        this.achievements.set('lightning_victory', {
            id: 'lightning_victory',
            name: 'Lightning Victory',
            description: 'Defeat a boss in under 5 minutes',
            icon: '⚡',
            rarity: 'uncommon',
            category: 'speed',
            condition: {
                type: 'battle_time_under',
                value: 5 // minutes
            },
            rewards: {
                title: 'Lightning Striker',
                coins: 200,
                xp: 100
            }
        });

        this.achievements.set('speed_demon', {
            id: 'speed_demon',
            name: 'Speed Demon',
            description: 'Defeat 10 bosses in under 3 minutes each',
            icon: '💨',
            rarity: 'rare',
            category: 'speed',
            condition: {
                type: 'multiple_fast_victories',
                value: 10,
                timeLimit: 3
            },
            rewards: {
                title: 'Speed Demon',
                coins: 500,
                xp: 300,
                unlocks: ['speed_boost_passive']
            }
        });

        // === PERFECT BATTLE ACHIEVEMENTS ===
        this.achievements.set('flawless_victory', {
            id: 'flawless_victory',
            name: 'Flawless Victory',
            description: 'Defeat a boss without taking any damage',
            icon: '💎',
            rarity: 'rare',
            category: 'skill',
            condition: {
                type: 'no_damage_taken',
                value: 0
            },
            rewards: {
                title: 'Untouchable',
                coins: 300,
                xp: 200
            }
        });

        this.achievements.set('perfectionist', {
            id: 'perfectionist',
            name: 'Perfectionist',
            description: 'Achieve 5 flawless victories',
            icon: '🏆',
            rarity: 'epic',
            category: 'skill',
            condition: {
                type: 'flawless_victories',
                value: 5
            },
            rewards: {
                title: 'Perfectionist',
                coins: 1000,
                xp: 500,
                unlocks: ['perfect_dodge_passive']
            }
        });

        // === COMBO ACHIEVEMENTS ===
        this.achievements.set('combo_master', {
            id: 'combo_master',
            name: 'Combo Master',
            description: 'Execute 10 combo attacks in a single battle',
            icon: '🔥',
            rarity: 'uncommon',
            category: 'combat',
            condition: {
                type: 'combos_in_battle',
                value: 10
            },
            rewards: {
                title: 'Combo Master',
                coins: 250,
                xp: 150
            }
        });

        this.achievements.set('chain_reaction', {
            id: 'chain_reaction',
            name: 'Chain Reaction',
            description: 'Execute 50 total combo attacks',
            icon: '🌟',
            rarity: 'rare',
            category: 'combat',
            condition: {
                type: 'total_combos',
                value: 50
            },
            rewards: {
                title: 'Chain Master',
                coins: 500,
                xp: 300,
                unlocks: ['combo_damage_boost']
            }
        });

        // === PERSONALITY-SPECIFIC ACHIEVEMENTS ===
        this.achievements.set('berserker_tamer', {
            id: 'berserker_tamer',
            name: 'Berserker Tamer',
            description: 'Defeat 5 Aggressive personality bosses',
            icon: '⚔️',
            rarity: 'uncommon',
            category: 'personality',
            condition: {
                type: 'personality_defeats',
                personality: 'aggressive',
                value: 5
            },
            rewards: {
                title: 'Berserker Tamer',
                coins: 300,
                xp: 200
            }
        });

        this.achievements.set('guardian_breaker', {
            id: 'guardian_breaker',
            name: 'Guardian Breaker',
            description: 'Defeat 5 Defensive personality bosses',
            icon: '🛡️',
            rarity: 'uncommon',
            category: 'personality',
            condition: {
                type: 'personality_defeats',
                personality: 'defensive',
                value: 5
            },
            rewards: {
                title: 'Guardian Breaker',
                coins: 300,
                xp: 200
            }
        });

        this.achievements.set('strategist_outsmarted', {
            id: 'strategist_outsmarted',
            name: 'Strategist Outsmarted',
            description: 'Defeat 5 Tactical personality bosses',
            icon: '🧠',
            rarity: 'rare',
            category: 'personality',
            condition: {
                type: 'personality_defeats',
                personality: 'tactical',
                value: 5
            },
            rewards: {
                title: 'Master Tactician',
                coins: 400,
                xp: 300,
                unlocks: ['tactical_insight_passive']
            }
        });

        // === ENDURANCE ACHIEVEMENTS ===
        this.achievements.set('marathon_warrior', {
            id: 'marathon_warrior',
            name: 'Marathon Warrior',
            description: 'Defeat a boss in a battle lasting over 30 minutes',
            icon: '⏳',
            rarity: 'uncommon',
            category: 'endurance',
            condition: {
                type: 'battle_time_over',
                value: 30 // minutes
            },
            rewards: {
                title: 'Marathon Warrior',
                coins: 300,
                xp: 250
            }
        });

        this.achievements.set('iron_will', {
            id: 'iron_will',
            name: 'Iron Will',
            description: 'Complete 100 total boss battles',
            icon: '💪',
            rarity: 'epic',
            category: 'endurance',
            condition: {
                type: 'total_battles',
                value: 100
            },
            rewards: {
                title: 'Iron Will',
                coins: 1000,
                xp: 500,
                unlocks: ['endurance_boost_passive']
            }
        });

        // === STREAK ACHIEVEMENTS ===
        this.achievements.set('winning_streak', {
            id: 'winning_streak',
            name: 'Winning Streak',
            description: 'Win 10 boss battles in a row',
            icon: '🔥',
            rarity: 'rare',
            category: 'streak',
            condition: {
                type: 'win_streak',
                value: 10
            },
            rewards: {
                title: 'Unstoppable',
                coins: 500,
                xp: 400
            }
        });

        this.achievements.set('legendary_streak', {
            id: 'legendary_streak',
            name: 'Legendary Streak',
            description: 'Win 25 boss battles in a row',
            icon: '👑',
            rarity: 'legendary',
            category: 'streak',
            condition: {
                type: 'win_streak',
                value: 25
            },
            rewards: {
                title: 'Legend',
                coins: 2000,
                xp: 1000,
                unlocks: ['legendary_aura_passive']
            }
        });

        // === MASTERY ACHIEVEMENTS ===
        this.achievements.set('boss_collector', {
            id: 'boss_collector',
            name: 'Boss Collector',
            description: 'Defeat 25 different unique bosses',
            icon: '📚',
            rarity: 'epic',
            category: 'collection',
            condition: {
                type: 'unique_bosses_defeated',
                value: 25
            },
            rewards: {
                title: 'Boss Collector',
                coins: 800,
                xp: 600,
                unlocks: ['boss_encyclopedia']
            }
        });

        this.achievements.set('personality_master', {
            id: 'personality_master',
            name: 'Personality Master',
            description: 'Defeat bosses of all 6 personality types',
            icon: '🎭',
            rarity: 'epic',
            category: 'mastery',
            condition: {
                type: 'all_personalities_defeated',
                value: 6
            },
            rewards: {
                title: 'Personality Master',
                coins: 1000,
                xp: 750,
                unlocks: ['personality_insight_passive']
            }
        });

        // === LEGENDARY ACHIEVEMENTS ===
        this.achievements.set('boss_destroyer', {
            id: 'boss_destroyer',
            name: 'Boss Destroyer',
            description: 'Defeat 100 different unique bosses',
            icon: '💀',
            rarity: 'legendary',
            category: 'legendary',
            condition: {
                type: 'unique_bosses_defeated',
                value: 100
            },
            rewards: {
                title: 'Boss Destroyer',
                coins: 5000,
                xp: 2000,
                unlocks: ['boss_destroyer_passive', 'ultimate_boss_arena']
            }
        });

        this.achievements.set('grand_master', {
            id: 'grand_master',
            name: 'Grand Master',
            description: 'Achieve mastery level 5 with 10 different bosses',
            icon: '🌟',
            rarity: 'legendary',
            category: 'mastery',
            condition: {
                type: 'boss_mastery_levels',
                value: 10,
                masteryLevel: 5
            },
            rewards: {
                title: 'Grand Master',
                coins: 10000,
                xp: 5000,
                unlocks: ['grand_master_privileges']
            }
        });
    }

    /**
     * Check if achievement condition is met
     */
    private async checkAchievementCondition(
        achievement: BossAchievement,
        boss: Boss,
        battleRecord: BossBattleRecord,
        battleState: EnhancedBattleState
    ): Promise<boolean> {
        const condition = achievement.condition;

        switch (condition.type) {
            case 'total_bosses_defeated':
                return this.playerProgress.totalBossesDefeated >= condition.value;

            case 'battle_time_under':
                return battleRecord.duration <= condition.value && battleRecord.result === 'victory';

            case 'battle_time_over':
                return battleRecord.duration >= condition.value && battleRecord.result === 'victory';

            case 'no_damage_taken':
                return battleRecord.damageTaken === 0 && battleRecord.result === 'victory';

            case 'flawless_victories':
                return this.countFlawlessVictories() >= condition.value;

            case 'combos_in_battle':
                return battleState.moveHistory.filter(move => move.wasCombo).length >= condition.value;

            case 'total_combos':
                return this.playerProgress.battleStatistics.combosExecuted >= condition.value;

            case 'personality_defeats':
                if (!boss.ai?.personality || boss.ai.personality !== condition.personality) return false;
                const personalityCount = this.playerProgress.personalityMastery.get(condition.personality as BossPersonality) || 0;
                return personalityCount >= condition.value;

            case 'win_streak':
                return this.playerProgress.streakRecords.currentWinStreak >= condition.value;

            case 'total_battles':
                return this.playerProgress.battleStatistics.totalBattles >= condition.value;

            case 'unique_bosses_defeated':
                return this.countUniqueBossesDefeated() >= condition.value;

            case 'all_personalities_defeated':
                return this.getDefeatedPersonalities().size >= condition.value;

            case 'boss_mastery_levels':
                return this.countHighMasteryBosses(condition.masteryLevel || 5) >= condition.value;

            case 'multiple_fast_victories':
                return this.countFastVictories(condition.timeLimit || 3) >= condition.value;

            default:
                return false;
        }
    }

    /**
     * Unlock achievement and notify player
     */
    private async unlockAchievement(achievement: BossAchievement): Promise<void> {
        this.playerProgress.unlockedAchievements.push(achievement.id);

        // Add title if provided
        if (achievement.rewards.title && !this.playerProgress.specialTitles.includes(achievement.rewards.title)) {
            this.playerProgress.specialTitles.push(achievement.rewards.title);
        }

        // Show notification
        const rarityColor = this.getRarityColor(achievement.rarity);
        new Notice(
            `🏆 Achievement Unlocked!\n${achievement.icon} ${achievement.name}\n${achievement.description}`,
            8000
        );

        // Dispatch achievement event
        window.dispatchEvent(new CustomEvent('boss-achievement-unlocked', {
            detail: {
                achievement,
                timestamp: new Date()
            }
        }));

        console.log(`Achievement unlocked: ${achievement.name} (${achievement.rarity})`);
    }

    /**
     * Update battle statistics
     */
    private updateBattleStatistics(battleRecord: BossBattleRecord, battleState: EnhancedBattleState): void {
        const stats = this.playerProgress.battleStatistics;

        stats.totalBattles++;

        if (battleRecord.result === 'victory') {
            stats.victories++;
            this.playerProgress.totalBossesDefeated++;
            this.playerProgress.streakRecords.currentWinStreak++;

            if (this.playerProgress.streakRecords.currentWinStreak > this.playerProgress.streakRecords.bestWinStreak) {
                this.playerProgress.streakRecords.bestWinStreak = this.playerProgress.streakRecords.currentWinStreak;
            }

            // Check for perfect victory
            if (battleRecord.damageTaken === 0) {
                this.playerProgress.streakRecords.currentPerfectStreak++;
                if (this.playerProgress.streakRecords.currentPerfectStreak > this.playerProgress.streakRecords.bestPerfectStreak) {
                    this.playerProgress.streakRecords.bestPerfectStreak = this.playerProgress.streakRecords.currentPerfectStreak;
                }
            } else {
                this.playerProgress.streakRecords.currentPerfectStreak = 0;
            }
        } else {
            if (battleRecord.result === 'defeat') {
                stats.defeats++;
            } else {
                stats.retreats++;
            }
            this.playerProgress.streakRecords.currentWinStreak = 0;
            this.playerProgress.streakRecords.currentPerfectStreak = 0;
        }

        this.playerProgress.totalBattleTime += battleRecord.duration;
        stats.averageBattleTime = this.playerProgress.totalBattleTime / stats.totalBattles;
        stats.totalDamageDealt += battleRecord.damageDealt;
        stats.totalDamageTaken += battleRecord.damageTaken;

        // Count combos
        const combosInBattle = battleState.moveHistory.filter(move => move.wasCombo).length;
        stats.combosExecuted += combosInBattle;

        // Count critical hits
        const criticalHits = battleState.moveHistory.filter(move => move.wasCritical).length;
        stats.criticalHits += criticalHits;
    }

    /**
     * Update mastery level for a specific boss
     */
    private updateMasteryLevel(boss: Boss, battleRecord: BossBattleRecord): void {
        const currentMastery = this.playerProgress.masteryLevels.get(boss.id) || {
            level: 0,
            experience: 0,
            victories: 0,
            totalBattleTime: 0,
            bestTime: Infinity,
            perfectVictories: 0
        };

        if (battleRecord.result === 'victory') {
            currentMastery.victories++;
            currentMastery.experience += this.calculateMasteryXP(battleRecord);

            if (battleRecord.duration < currentMastery.bestTime) {
                currentMastery.bestTime = battleRecord.duration;
            }

            if (battleRecord.damageTaken === 0) {
                currentMastery.perfectVictories++;
            }

            // Level up mastery
            const newLevel = Math.floor(currentMastery.experience / 1000); // 1000 XP per level
            if (newLevel > currentMastery.level) {
                currentMastery.level = newLevel;
                new Notice(`🌟 Boss Mastery Level Up!\n${boss.name} - Level ${newLevel}`, 5000);
            }
        }

        currentMastery.totalBattleTime += battleRecord.duration;
        this.playerProgress.masteryLevels.set(boss.id, currentMastery);
    }

    /**
     * Update personality mastery
     */
    private updatePersonalityMastery(personality: BossPersonality, battleRecord: BossBattleRecord): void {
        if (battleRecord.result === 'victory') {
            const current = this.playerProgress.personalityMastery.get(personality) || 0;
            this.playerProgress.personalityMastery.set(personality, current + 1);
        }
    }

    /**
     * Calculate mastery XP based on battle performance
     */
    private calculateMasteryXP(battleRecord: BossBattleRecord): number {
        let xp = 100; // Base XP

        // Bonus for speed
        if (battleRecord.duration < 5) xp += 50;
        else if (battleRecord.duration < 10) xp += 25;

        // Bonus for efficiency (damage dealt vs taken ratio)
        const efficiency = battleRecord.damageDealt / Math.max(battleRecord.damageTaken, 1);
        xp += Math.floor(efficiency * 10);

        // Bonus for perfect victory
        if (battleRecord.damageTaken === 0) xp += 100;

        // Bonus for phases completed
        xp += battleRecord.phasesCompleted * 25;

        return xp;
    }

    // Helper methods for achievement conditions
    private countFlawlessVictories(): number {
        // This would need to be tracked in battle statistics
        return this.playerProgress.streakRecords.bestPerfectStreak;
    }

    private countUniqueBossesDefeated(): number {
        return this.playerProgress.masteryLevels.size;
    }

    private getDefeatedPersonalities(): Set<BossPersonality> {
        return new Set(this.playerProgress.personalityMastery.keys());
    }

    private countHighMasteryBosses(minLevel: number): number {
        let count = 0;
        for (const mastery of this.playerProgress.masteryLevels.values()) {
            if (mastery.level >= minLevel) count++;
        }
        return count;
    }

    private countFastVictories(maxTime: number): number {
        let count = 0;
        for (const mastery of this.playerProgress.masteryLevels.values()) {
            if (mastery.bestTime <= maxTime) count++;
        }
        return count;
    }

    private getRarityColor(rarity: AchievementRarity): string {
        switch (rarity) {
            case 'common': return '#64748b';
            case 'uncommon': return '#10b981';
            case 'rare': return '#3b82f6';
            case 'epic': return '#8b5cf6';
            case 'legendary': return '#ffd700';
            default: return '#64748b';
        }
    }

    /**
     * Get player's achievement progress
     */
    getAchievementProgress(): BossAchievementProgress {
        return { ...this.playerProgress };
    }

    /**
     * Get all achievements
     */
    getAllAchievements(): Map<string, BossAchievement> {
        return new Map(this.achievements);
    }

    /**
     * Get achievements by category
     */
    getAchievementsByCategory(category: AchievementCategory): BossAchievement[] {
        return Array.from(this.achievements.values()).filter(a => a.category === category);
    }

    /**
     * Get achievements by rarity
     */
    getAchievementsByRarity(rarity: AchievementRarity): BossAchievement[] {
        return Array.from(this.achievements.values()).filter(a => a.rarity === rarity);
    }

    /**
     * Save progress to localStorage
     */
    private async saveProgress(): Promise<void> {
        try {
            const progressData = {
                ...this.playerProgress,
                masteryLevels: Array.from(this.playerProgress.masteryLevels.entries()),
                personalityMastery: Array.from(this.playerProgress.personalityMastery.entries())
            };
            localStorage.setItem('boss-achievement-progress', JSON.stringify(progressData));
        } catch (error) {
            console.error('Failed to save achievement progress:', error);
        }
    }

    /**
     * Load progress from localStorage
     */
    private loadProgress(): void {
        try {
            const saved = localStorage.getItem('boss-achievement-progress');
            if (saved) {
                const data = JSON.parse(saved);
                this.playerProgress = {
                    ...data,
                    masteryLevels: new Map(data.masteryLevels || []),
                    personalityMastery: new Map(data.personalityMastery || [])
                };
            }
        } catch (error) {
            console.error('Failed to load achievement progress:', error);
        }
    }
}

// Type definitions
export interface BossAchievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: AchievementRarity;
    category: AchievementCategory;
    condition: AchievementCondition;
    rewards: AchievementRewards;
}

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'progression' | 'speed' | 'skill' | 'combat' | 'personality' | 'endurance' | 'streak' | 'collection' | 'mastery' | 'legendary';

export interface AchievementCondition {
    type: string;
    value: number;
    personality?: string;
    timeLimit?: number;
    masteryLevel?: number;
}

export interface AchievementRewards {
    title?: string;
    coins: number;
    xp: number;
    unlocks?: string[];
}

export interface BossAchievementProgress {
    unlockedAchievements: string[];
    masteryLevels: Map<string, BossMastery>;
    totalBossesDefeated: number;
    totalBattleTime: number;
    personalityMastery: Map<BossPersonality, number>;
    specialTitles: string[];
    streakRecords: StreakRecords;
    battleStatistics: BattleStatistics;
}

export interface BossMastery {
    level: number;
    experience: number;
    victories: number;
    totalBattleTime: number;
    bestTime: number;
    perfectVictories: number;
}

export interface StreakRecords {
    currentWinStreak: number;
    bestWinStreak: number;
    currentPerfectStreak: number;
    bestPerfectStreak: number;
}

export interface BattleStatistics {
    totalBattles: number;
    victories: number;
    defeats: number;
    retreats: number;
    averageBattleTime: number;
    totalDamageDealt: number;
    totalDamageTaken: number;
    movesMastered: string[];
    combosExecuted: number;
    criticalHits: number;
}

export interface AchievementResult {
    achievement: BossAchievement;
    timestamp: Date;
    context: {
        bossName: string;
        battleDuration: number;
        result: string;
    };
}

// Export singleton instance
export const bossAchievementSystem = BossAchievementSystem.getInstance();
