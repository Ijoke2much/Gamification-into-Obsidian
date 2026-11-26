import { App } from 'obsidian';
import { Boss, BossRewards } from '../types/BossTypes';
import { PlayerData } from '../../../data/models/PlayerData';
import { rewardService } from '../../../shared/services/rewardService';
import { playerStore } from '../../../shared/state/playerStore';
import { addOrIncrementInventoryItem } from '../../inventory/utils/updateInventoryFile';
import { MaterialInventoryManager } from '../../../shared/services/materialInventoryManager';
import { BossAnalyticsService } from '../utils/bossAnalyticsService';

export interface BossVictoryContext {
    boss: Boss;
    timeTaken: number; // in minutes
    playerLevel: number;
    questCompletionRate: number; // 0-1
    isFirstVictory: boolean;
    consecutiveWins: number;
    perfectCompletion: boolean; // all tasks completed
}

export interface EnhancedBossRewards extends BossRewards {
    // Enhanced reward properties
    experienceMultiplier: number;
    bonusRewards: Array<{
        type: 'streak' | 'speed' | 'perfect' | 'level' | 'special';
        description: string;
        value: number;
    }>;
    unlockedFeatures: string[];
    seasonalBonuses: Array<{
        name: string;
        description: string;
        value: number;
    }>;
}

export class BossRewardService {
    private static instance: BossRewardService;
    private analyticsService: BossAnalyticsService;

    private constructor(private app: App) {
        this.analyticsService = BossAnalyticsService.getInstance();
    }

    static getInstance(app?: App): BossRewardService {
        if (!BossRewardService.instance && app) {
            BossRewardService.instance = new BossRewardService(app);
        }
        return BossRewardService.instance;
    }

    async processBossVictory(context: BossVictoryContext): Promise<EnhancedBossRewards> {
        const player = await playerStore.get();
        if (!player) {
            throw new Error('Player data not available');
        }

        // Calculate enhanced rewards based on context
        const enhancedRewards = this.calculateEnhancedRewards(context, player);

        // Apply base rewards through the reward service
        await this.applyBaseRewards(enhancedRewards, context);

        // Apply special rewards
        await this.applySpecialRewards(enhancedRewards, context);

        // Add boss-specific items to inventory
        await this.addBossItemsToInventory(enhancedRewards, context);

        // Update boss analytics
        await this.updateBossAnalytics(context, enhancedRewards);

        // Trigger achievement checks
        await this.checkBossAchievements(context, player);

        // Show enhanced reward notification
        this.showEnhancedRewardNotification(enhancedRewards, context);

        return enhancedRewards;
    }

    private calculateEnhancedRewards(context: BossVictoryContext, player: PlayerData): EnhancedBossRewards {
        const { boss, timeTaken, playerLevel, questCompletionRate, isFirstVictory, consecutiveWins, perfectCompletion } = context;

        let baseRewards = { ...boss.rewards };
        let experienceMultiplier = 1.0;
        const bonusRewards: Array<{ type: 'streak' | 'speed' | 'perfect' | 'level' | 'special'; description: string; value: number; }> = [];

        // Speed bonus (completed faster than average)
        if (timeTaken < 30) { // Less than 30 minutes
            experienceMultiplier += 0.3;
            bonusRewards.push({
                type: 'speed',
                description: 'Lightning Victory',
                value: Math.floor(baseRewards.xp * 0.3)
            });
        } else if (timeTaken < 60) { // Less than 1 hour
            experienceMultiplier += 0.15;
            bonusRewards.push({
                type: 'speed',
                description: 'Swift Victory',
                value: Math.floor(baseRewards.xp * 0.15)
            });
        }

        // Perfect completion bonus
        if (perfectCompletion) {
            experienceMultiplier += 0.5;
            bonusRewards.push({
                type: 'perfect',
                description: 'Perfect Execution',
                value: Math.floor(baseRewards.xp * 0.5)
            });
        }

        // Consecutive wins streak bonus
        if (consecutiveWins >= 5) {
            experienceMultiplier += 0.4;
            bonusRewards.push({
                type: 'streak',
                description: `${consecutiveWins} Win Streak`,
                value: Math.floor(baseRewards.xp * 0.4)
            });
        } else if (consecutiveWins >= 3) {
            experienceMultiplier += 0.2;
            bonusRewards.push({
                type: 'streak',
                description: `${consecutiveWins} Win Streak`,
                value: Math.floor(baseRewards.xp * 0.2)
            });
        }

        // First victory bonus
        if (isFirstVictory) {
            experienceMultiplier += 0.25;
            bonusRewards.push({
                type: 'special',
                description: 'First Victory',
                value: Math.floor(baseRewards.xp * 0.25)
            });
        }

        // Level scaling bonus
        if (playerLevel >= 20) {
            experienceMultiplier += 0.2;
            bonusRewards.push({
                type: 'level',
                description: 'Veteran Warrior',
                value: Math.floor(baseRewards.xp * 0.2)
            });
        } else if (playerLevel >= 10) {
            experienceMultiplier += 0.1;
            bonusRewards.push({
                type: 'level',
                description: 'Experienced Fighter',
                value: Math.floor(baseRewards.xp * 0.1)
            });
        }

        // Apply multipliers to base rewards
        baseRewards.xp = Math.floor(baseRewards.xp * experienceMultiplier);
        baseRewards.cp = Math.floor(baseRewards.cp * Math.min(experienceMultiplier, 1.5)); // Cap CP multiplier
        baseRewards.coins = Math.floor(baseRewards.coins * Math.min(experienceMultiplier, 1.3)); // Cap coin multiplier

        // Enhanced materials based on boss type and performance
        const enhancedMaterials = this.generateEnhancedMaterials(boss, perfectCompletion, consecutiveWins);
        baseRewards.materials = [...baseRewards.materials, ...enhancedMaterials];

        // Seasonal bonuses (could be expanded based on current date)
        const seasonalBonuses = this.getSeasonalBonuses(boss, player);

        // Unlocked features based on boss type and achievements
        const unlockedFeatures = this.getUnlockedFeatures(boss, context, player);

        return {
            ...baseRewards,
            experienceMultiplier,
            bonusRewards,
            unlockedFeatures,
            seasonalBonuses
        };
    }

    private async applyBaseRewards(rewards: EnhancedBossRewards, context: BossVictoryContext): Promise<void> {
        // Apply XP, CP, and coins through the reward service
        await rewardService.applyRewards({
            xp: rewards.xp,
            cp: rewards.cp,
            coins: rewards.coins,
            source: `Boss Victory: ${context.boss.name}`,
            energyCost: {
                physical: 0, // Boss victory shouldn't cost energy
                mental: 0,
                emotional: 0
            }
        });
    }

    private async applySpecialRewards(rewards: EnhancedBossRewards, context: BossVictoryContext): Promise<void> {
        // Apply bonus rewards
        for (const bonus of rewards.bonusRewards) {
            if (bonus.value > 0) {
                await rewardService.applyRewards({
                    xp: bonus.value,
                    source: `Boss Bonus: ${bonus.description}`
                });
            }
        }

        // Apply seasonal bonuses
        for (const seasonal of rewards.seasonalBonuses) {
            await rewardService.applyRewards({
                xp: seasonal.value,
                source: `Seasonal Bonus: ${seasonal.name}`
            });
        }
    }

    private async addBossItemsToInventory(rewards: EnhancedBossRewards, context: BossVictoryContext): Promise<void> {
        // Add regular materials
        for (const material of rewards.materials) {
            await addOrIncrementInventoryItem(this.app, {
                name: material.name,
                category: 'material',
                rarity: material.rarity,
                description: `Material obtained from defeating ${context.boss.name}`,
                icon: this.getMaterialIcon(material.rarity),
                price: this.getMaterialValue(material.rarity),
                tags: ['boss-drop', material.rarity, context.boss.type]
            }, material.quantity);
        }

        // Add life items
        for (const item of rewards.lifeItems) {
            await addOrIncrementInventoryItem(this.app, {
                name: item.name,
                category: 'consumable',
                rarity: 'uncommon',
                description: item.description,
                icon: this.getLifeItemIcon(item.type),
                price: item.value,
                tags: ['life-reward', item.type]
            }, 1);
        }

        // Add boss-specific materials
        for (const bossMaterial of rewards.bossMaterials) {
            await addOrIncrementInventoryItem(this.app, {
                name: bossMaterial,
                category: 'material',
                rarity: 'epic',
                description: `Rare essence obtained from ${context.boss.name}`,
                icon: '🔮',
                price: 500,
                tags: ['boss-essence', context.boss.type, 'crafting']
            }, 1);
        }

        // Add unlockable trophies
        for (const unlockable of rewards.unlockables) {
            await addOrIncrementInventoryItem(this.app, {
                name: unlockable,
                category: 'artifact',
                rarity: 'legendary',
                description: `Trophy commemorating victory over ${context.boss.name}`,
                icon: '🏆',
                price: 1000,
                tags: ['trophy', 'boss-victory', context.boss.type]
            }, 1);
        }
    }

    private generateEnhancedMaterials(boss: Boss, perfectCompletion: boolean, consecutiveWins: number): Array<{
        name: string;
        quantity: number;
        rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    }> {
        const materials = [];

        // Perfect completion bonus materials
        if (perfectCompletion) {
            materials.push({
                name: 'Perfect Execution Crystal',
                quantity: 1,
                rarity: 'epic' as const
            });
        }

        // Streak bonus materials
        if (consecutiveWins >= 5) {
            materials.push({
                name: 'Unstoppable Champion Shard',
                quantity: 1,
                rarity: 'legendary' as const
            });
        } else if (consecutiveWins >= 3) {
            materials.push({
                name: 'Victory Streak Gem',
                quantity: 1,
                rarity: 'rare' as const
            });
        }

        // Boss-type specific materials
        switch (boss.type) {
            case 'legendary-boss':
                materials.push({
                    name: 'Legendary Boss Core',
                    quantity: 1,
                    rarity: 'legendary' as const
                });
                break;
            case 'epic-boss':
                materials.push({
                    name: 'Epic Boss Fragment',
                    quantity: Math.floor(Math.random() * 2) + 1,
                    rarity: 'epic' as const
                });
                break;
            case 'boss':
                materials.push({
                    name: 'Boss Crystal',
                    quantity: Math.floor(Math.random() * 3) + 1,
                    rarity: 'rare' as const
                });
                break;
        }

        return materials;
    }

    private getSeasonalBonuses(boss: Boss, player: PlayerData): Array<{ name: string; description: string; value: number; }> {
        const bonuses = [];
        const currentMonth = new Date().getMonth();

        // Example seasonal bonuses (could be expanded)
        if (currentMonth === 11 || currentMonth === 0) { // Winter
            bonuses.push({
                name: 'Winter Festival Bonus',
                description: 'Extra rewards during winter season',
                value: Math.floor(boss.rewards.xp * 0.15)
            });
        } else if (currentMonth >= 2 && currentMonth <= 4) { // Spring
            bonuses.push({
                name: 'Spring Growth Bonus',
                description: 'Enhanced XP gains during growth season',
                value: Math.floor(boss.rewards.xp * 0.1)
            });
        }

        return bonuses;
    }

    private getUnlockedFeatures(boss: Boss, context: BossVictoryContext, player: PlayerData): string[] {
        const features = [];

        // Unlock features based on boss type
        if (boss.type === 'epic-boss' && context.isFirstVictory) {
            features.push('Epic Boss Arena Access');
        }

        if (boss.type === 'legendary-boss' && context.isFirstVictory) {
            features.push('Legendary Challenges Unlocked');
            features.push('Master Difficulty Mode');
        }

        // Unlock based on consecutive wins
        if (context.consecutiveWins >= 10) {
            features.push('Boss Rush Mode');
        }

        return features;
    }

    private async updateBossAnalytics(context: BossVictoryContext, rewards: EnhancedBossRewards): Promise<void> {
        // Record boss victory in analytics
        this.analyticsService.recordBossVictory({
            bossId: context.boss.id,
            bossType: context.boss.type,
            timeTaken: context.timeTaken,
            rewardsEarned: rewards,
            perfectCompletion: context.perfectCompletion,
            consecutiveWins: context.consecutiveWins,
            playerLevel: context.playerLevel,
            timestamp: new Date()
        });
    }

    private async checkBossAchievements(context: BossVictoryContext, player: PlayerData): Promise<void> {
        try {
            const { achievementEventService } = await import('../../../features/achievements/services/achievementEventService');

            // Boss defeated achievement
            await achievementEventService.processGameEvent({
                type: 'boss_defeated',
                data: {
                    bossName: context.boss.name,
                    bossType: context.boss.type,
                    difficulty: context.boss.difficulty,
                    isFirstVictory: context.isFirstVictory,
                    perfectCompletion: context.perfectCompletion
                },
                timestamp: new Date()
            });

            // Boss streak achievement
            if (context.consecutiveWins > 0) {
                await achievementEventService.processGameEvent({
                    type: 'boss_streak',
                    data: {
                        streakCount: context.consecutiveWins,
                        bossType: context.boss.type
                    },
                    timestamp: new Date()
                });
            }

            // Boss difficulty achievement
            if (context.boss.difficulty === 'legendary') {
                await achievementEventService.processGameEvent({
                    type: 'boss_difficulty_completed',
                    data: {
                        difficulty: context.boss.difficulty,
                        bossName: context.boss.name
                    },
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.warn('Failed to process boss achievement events:', error);
        }
    }

    private showEnhancedRewardNotification(rewards: EnhancedBossRewards, context: BossVictoryContext): void {
        // Import and show the boss reward notification
        import('../components/BossRewardNotification').then(({ showBossRewardNotification }) => {
            showBossRewardNotification(rewards, context.boss.name, 6000);
        }).catch(error => {
            console.error('Error showing boss reward notification:', error);

            // Fallback to console log
            const notification = {
                title: `🎉 ${context.boss.name} Defeated!`,
                message: this.generateRewardSummary(rewards, context),
                duration: 5000,
                type: 'boss-victory' as const
            };
            console.log('Boss Victory Notification:', notification);
        });
    }

    private generateRewardSummary(rewards: EnhancedBossRewards, context: BossVictoryContext): string {
        let summary = `Earned ${rewards.xp} XP, ${rewards.cp} CP, ${rewards.coins} coins`;

        if (rewards.bonusRewards.length > 0) {
            const bonusXP = rewards.bonusRewards.reduce((sum, bonus) => sum + bonus.value, 0);
            summary += ` + ${bonusXP} bonus XP`;
        }

        if (rewards.materials.length > 0) {
            summary += ` + ${rewards.materials.length} materials`;
        }

        if (rewards.unlockedFeatures.length > 0) {
            summary += ` | Unlocked: ${rewards.unlockedFeatures.join(', ')}`;
        }

        return summary;
    }

    private getMaterialIcon(rarity: string): string {
        switch (rarity) {
            case 'common': return '🪨';
            case 'uncommon': return '💚';
            case 'rare': return '💙';
            case 'epic': return '💜';
            case 'legendary': return '🧡';
            default: return '💎';
        }
    }

    private getMaterialValue(rarity: string): number {
        switch (rarity) {
            case 'common': return 10;
            case 'uncommon': return 25;
            case 'rare': return 50;
            case 'epic': return 100;
            case 'legendary': return 250;
            default: return 10;
        }
    }

    private getLifeItemIcon(type: string): string {
        switch (type) {
            case 'entertainment': return '🎮';
            case 'relaxation': return '🛀';
            case 'productivity': return '⚡';
            case 'luxury': return '💎';
            default: return '🎁';
        }
    }

    // Utility method to preview rewards before victory
    calculateRewardPreview(boss: Boss, context: Partial<BossVictoryContext>): EnhancedBossRewards {
        const defaultContext: BossVictoryContext = {
            boss,
            timeTaken: 60,
            playerLevel: 1,
            questCompletionRate: 1.0,
            isFirstVictory: false,
            consecutiveWins: 0,
            perfectCompletion: false,
            ...context
        };

        const player = { xp: 0, level: defaultContext.playerLevel } as PlayerData;
        return this.calculateEnhancedRewards(defaultContext, player);
    }
}
