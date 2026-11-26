import { Quest } from '../utils/taskParser';
import { Boss } from '../types/BossTypes';
import { PlayerStats } from '../types/BossTypes';

export interface SubtaskBossBattle {
    battleId: string;
    questId: string;
    bossId: string;
    questTitle: string;
    bossName: string;
    bossType: string;
    bossLevel?: number;

    // Battle state
    totalSubtasks: number;
    completedSubtasks: number;
    remainingSubtasks: number;
    bossHP: number;
    maxBossHP: number;
    totalDamageDealt: number;

    // Battle tracking
    startDate: Date;
    lastActivity: Date;
    isActive: boolean;
    isDefeated: boolean;

    // Subtask damage tracking
    subtaskDamage: Map<string, number>;

    // Battle log
    battleLog: string[];

    // Boss personality
    bossPersonality: {
        mood: 'curious' | 'challenging' | 'concerned' | 'desperate' | 'defeated';
        dialogue: string[];
    };

    // Rewards
    rewards: {
        xp: number;
        coins: number;
        materials: string[];
    };

    // Boss status effects
    bossStatusEffects?: Array<{
        icon: string;
        name: string;
    }>;

    // Quest reference for subtask access
    quest: Quest;
}

export class PokemonBattleConverter {
    /**
     * Convert a quest and boss into a Pokemon-style battle
     */
    static createBattleFromQuest(
        quest: Quest,
        boss: Boss,
        playerStats: PlayerStats
    ): SubtaskBossBattle {
        const totalSubtasks = quest.subtasks?.length || 0;
        const completedSubtasks = quest.subtasks?.filter(s => s.completed).length || 0;
        const remainingSubtasks = totalSubtasks - completedSubtasks;

        // Calculate boss HP based on project timeframe and complexity
        const maxBossHP = this.calculateBossHP(quest, boss);
        const currentBossHP = this.calculateCurrentBossHP(quest, boss, maxBossHP);

        // Calculate total damage dealt based on completed subtasks
        const totalDamageDealt = this.calculateTotalDamage(quest, playerStats);

        // Create subtask damage map
        const subtaskDamage = new Map<string, number>();
        quest.subtasks?.forEach((subtask, index) => {
            if (subtask.completed) {
                const damage = this.calculateSubtaskDamage(subtask, playerStats, index);
                subtaskDamage.set((subtask as any).id || `subtask-${index}`, damage);
            }
        });

        // Generate battle log
        const battleLog = this.generateBattleLog(quest, boss, completedSubtasks);

        // Determine boss personality based on progress
        const bossPersonality = this.getBossPersonality(completedSubtasks, totalSubtasks);

        return {
            battleId: `battle-${quest.id}-${Date.now()}`,
            questId: quest.id,
            bossId: boss.id,
            questTitle: quest.title,
            bossName: boss.name,
            bossType: this.getBossType(boss),
            bossLevel: this.getBossLevel(quest, boss),

            totalSubtasks,
            completedSubtasks,
            remainingSubtasks,
            bossHP: currentBossHP,
            maxBossHP,
            totalDamageDealt,

            startDate: quest.createdDate ? new Date(quest.createdDate) : new Date(),
            lastActivity: new Date(),
            isActive: remainingSubtasks > 0,
            isDefeated: remainingSubtasks === 0,

            subtaskDamage,
            battleLog,
            bossPersonality,

            rewards: {
                xp: quest.xp || 0,
                coins: quest.coins || 0,
                materials: quest.rewards || []
            },

            bossStatusEffects: this.getBossStatusEffects(boss, completedSubtasks, totalSubtasks),

            // Quest reference for subtask access
            quest: quest
        };
    }

    /**
     * Calculate boss HP based on quest complexity and timeframe
     */
    private static calculateBossHP(quest: Quest, boss: Boss): number {
        const subtaskCount = quest.subtasks?.length || 1;

        // Base HP per subtask based on difficulty
        const baseHPPerSubtask = {
            'easy': 15,
            'medium': 25,
            'hard': 40,
            'epic': 60,
            'legendary': 100
        };

        const difficulty = quest.difficulty?.toLowerCase() || 'medium';
        const baseHP = subtaskCount * (baseHPPerSubtask[difficulty as keyof typeof baseHPPerSubtask] || 25);

        // Timeframe multiplier
        const estimatedTime = quest.estimatedTime;
        let timeframeMultiplier = 1;

        if (estimatedTime) {
            if (estimatedTime.includes('day') || estimatedTime.includes('week')) {
                timeframeMultiplier = 1.5;
            } else if (estimatedTime.includes('month')) {
                timeframeMultiplier = 2.0;
            }
        }

        return Math.floor(baseHP * timeframeMultiplier);
    }

    /**
     * Calculate current boss HP based on progress
     */
    private static calculateCurrentBossHP(quest: Quest, boss: Boss, maxHP: number): number {
        const completedSubtasks = quest.subtasks?.filter(s => s.completed).length || 0;
        const totalSubtasks = quest.subtasks?.length || 1;

        const progressPercent = completedSubtasks / totalSubtasks;
        return Math.floor(maxHP * (1 - progressPercent));
    }

    /**
     * Calculate total damage dealt based on completed subtasks
     */
    private static calculateTotalDamage(quest: Quest, playerStats: PlayerStats): number {
        const completedSubtasks = quest.subtasks?.filter(s => s.completed) || [];
        let totalDamage = 0;

        completedSubtasks.forEach((subtask, index) => {
            totalDamage += this.calculateSubtaskDamage(subtask, playerStats, index);
        });

        return totalDamage;
    }

    /**
     * Calculate damage for a specific subtask
     */
    private static calculateSubtaskDamage(subtask: any, playerStats: PlayerStats, index: number): number {
        const baseDamage = 15 + (index * 2); // Base damage increases with subtask order

        // Stat bonus based on relevant stats
        const statBonus = Math.floor((playerStats.strength || 1) / 2);

        // Difficulty bonus
        const difficultyBonus = subtask.difficulty === 'hard' ? 5 : 0;

        return baseDamage + statBonus + difficultyBonus;
    }

    /**
     * Generate battle log based on quest progress
     */
    private static generateBattleLog(quest: Quest, boss: Boss, completedSubtasks: number): string[] {
        const log: string[] = [];

        log.push(`⚔️ Battle started against ${boss.name}!`);

        if (completedSubtasks > 0) {
            log.push(`🎯 ${completedSubtasks} subtask${completedSubtasks > 1 ? 's' : ''} completed!`);
            log.push(`💥 ${this.calculateTotalDamage(quest, { strength: 1 } as PlayerStats)} damage dealt!`);
        }

        if (completedSubtasks === quest.subtasks?.length) {
            log.push(`🎉 ${boss.name} defeated! Quest completed!`);
        }

        return log;
    }

    /**
     * Get boss personality based on progress
     */
    private static getBossPersonality(completedSubtasks: number, totalSubtasks: number) {
        const progressPercent = (completedSubtasks / totalSubtasks) * 100;

        if (progressPercent < 25) {
            return {
                mood: 'curious' as const,
                dialogue: [
                    "Interesting approach... let's see what you can do.",
                    "I'm watching your every move.",
                    "Show me your strategy."
                ]
            };
        } else if (progressPercent < 50) {
            return {
                mood: 'challenging' as const,
                dialogue: [
                    "You're making progress, but I'm not worried yet.",
                    "Is that all you've got?",
                    "I'm just getting started."
                ]
            };
        } else if (progressPercent < 75) {
            return {
                mood: 'concerned' as const,
                dialogue: [
                    "You're getting closer... but I won't go down easily!",
                    "I can feel your determination.",
                    "This is where most people fail."
                ]
            };
        } else if (progressPercent < 100) {
            return {
                mood: 'desperate' as const,
                dialogue: [
                    "No! You can't defeat me!",
                    "I won't let you finish this!",
                    "This is my final stand!"
                ]
            };
        } else {
            return {
                mood: 'defeated' as const,
                dialogue: [
                    "You... you actually did it.",
                    "I underestimated your persistence.",
                    "Well done. You've earned this victory."
                ]
            };
        }
    }

    /**
     * Get boss type for sprite selection
     */
    private static getBossType(boss: Boss): string {
        return boss.theme || boss.category || 'default';
    }

    /**
     * Get boss level based on quest difficulty
     */
    private static getBossLevel(quest: Quest, boss: Boss): number {
        const difficultyLevels = {
            'easy': 10,
            'medium': 25,
            'hard': 40,
            'epic': 60,
            'legendary': 80
        };

        return difficultyLevels[quest.difficulty?.toLowerCase() as keyof typeof difficultyLevels] || 25;
    }

    /**
     * Get boss status effects based on progress
     */
    private static getBossStatusEffects(
        boss: Boss,
        completedSubtasks: number,
        totalSubtasks: number
    ): Array<{ icon: string; name: string }> {
        const effects: Array<{ icon: string; name: string }> = [];

        const progressPercent = (completedSubtasks / totalSubtasks) * 100;

        if (progressPercent > 75) {
            effects.push({ icon: '😰', name: 'Desperate' });
        } else if (progressPercent > 50) {
            effects.push({ icon: '😤', name: 'Angry' });
        } else if (progressPercent > 25) {
            effects.push({ icon: '🤔', name: 'Concerned' });
        } else {
            effects.push({ icon: '😏', name: 'Confident' });
        }

        return effects;
    }

    /**
     * Update battle when subtask is completed
     */
    static updateBattleOnSubtaskComplete(
        battle: SubtaskBossBattle,
        subtaskId: string,
        playerStats: PlayerStats
    ): SubtaskBossBattle {
        const newBattle = { ...battle };

        // Calculate damage for this subtask
        const subtaskIndex = battle.totalSubtasks - battle.remainingSubtasks;
        const damage = this.calculateSubtaskDamage(
            { id: subtaskId, completed: true },
            playerStats,
            subtaskIndex
        );

        // Update battle state
        newBattle.completedSubtasks++;
        newBattle.remainingSubtasks--;
        newBattle.totalDamageDealt += damage;
        newBattle.bossHP = Math.max(0, newBattle.bossHP - damage);
        newBattle.lastActivity = new Date();

        // Update subtask damage
        newBattle.subtaskDamage.set(subtaskId, damage);

        // Add to battle log
        newBattle.battleLog.push(`💥 Subtask completed! ${damage} damage dealt!`);

        // Check if boss is defeated
        if (newBattle.remainingSubtasks === 0) {
            newBattle.isDefeated = true;
            newBattle.isActive = false;
            newBattle.battleLog.push(`🎉 ${newBattle.bossName} defeated! Quest completed!`);
        }

        // Update boss personality
        newBattle.bossPersonality = this.getBossPersonality(
            newBattle.completedSubtasks,
            newBattle.totalSubtasks
        );

        return newBattle;
    }
}
