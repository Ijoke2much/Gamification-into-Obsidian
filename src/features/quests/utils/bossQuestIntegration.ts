import { Boss, BossProgress, BossCreationOptions } from '../types/BossTypes';
import { BossFactory } from './bossFactory';
import { BossBattleEngine } from './bossBattleEngine';
import { Quest } from './taskParser';

export class BossQuestIntegration {
    static shouldCreateBoss(quest: Quest): boolean {
        // Create boss for quests that are:
        // 1. High priority AND hard difficulty
        // 2. Have estimated time > 1 week
        // 3. Have multiple subtasks
        // 4. Are not already associated with a boss

        if (quest.priority === 'High' && quest.difficulty === 'Hard') return true;
        if (quest.estimatedTime && this.parseTimeEstimate(quest.estimatedTime) > 7) return true;
        if (quest.subtasks && quest.subtasks.length > 3) return true;

        return false;
    }

    static createBossForQuest(quest: Quest, playerSkillLevel: number): Boss {
        const options: BossCreationOptions = {
            name: quest.title,
            description: quest.description || 'A challenging quest boss',
            difficulty: (quest.difficulty || 'Medium').toLowerCase() as 'easy' | 'medium' | 'hard' | 'epic' | 'legendary',
            bossType: 'boss',
            bossTheme: 'procrastination', // Default theme
            estimatedDuration: quest.estimatedTime || '1 week',
            questTitle: quest.title,
            questId: quest.id,
            priority: quest.priority || 'Medium',
            subtasks: quest.subtasks || [],
            playerSkillLevel
        };

        return BossFactory.createBoss(options);
    }

    static canEngageBoss(quest: Quest): boolean {
        // Can engage boss if:
        // 1. Quest has a boss
        // 2. Not all subtasks are completed
        // 3. Boss is not defeated

        if (!quest.bossId) return false;
        if (quest.subtasks.every(subtask => subtask.completed)) return false;

        return true;
    }

    static calculateBossDamage(quest: Quest): number {
        // Calculate damage based on completed subtasks
        const totalSubtasks = quest.subtasks.length;
        const completedSubtasks = quest.subtasks.filter(subtask => subtask.completed).length;

        if (totalSubtasks === 0) return 0;

        // Use the battle engine to calculate damage
        return BossBattleEngine.calculateTaskCompletionDamage(quest, completedSubtasks);
    }

    static updateBossProgress(boss: Boss, quest: Quest): BossProgress {
        const completedSubtasks = quest.subtasks.filter(subtask => subtask.completed).length;
        const totalSubtasks = quest.subtasks.length;

        // Calculate new HP based on completed subtasks
        const damage = this.calculateBossDamage(quest);
        const newHP = Math.max(1, boss.stats.currentHP - damage);

        // Update boss HP
        boss.stats.currentHP = newHP;

        // Check if boss should change phase
        this.checkBossPhaseChange(boss);

        // Check if boss can be defeated
        if (BossBattleEngine.canDefeatBoss(boss, quest)) {
            boss.isDefeated = true;
        }

        return {
            bossId: boss.id,
            questId: quest.id,
            currentHP: newHP,
            maxHP: boss.stats.maxHP,
            phase: boss.currentPhase,
            lastUpdated: new Date(),
            isActive: !boss.isDefeated,

            // Enhanced progress properties
            timeSpent: 0, // TODO: Calculate actual time spent
            attempts: 1, // TODO: Track actual attempts
            bestDamage: 0, // TODO: Track best damage dealt
            phaseProgress: [100], // TODO: Calculate actual phase progress
            lastPhaseChange: new Date() // TODO: Track actual phase changes
        };
    }

    private static checkBossPhaseChange(boss: Boss): void {
        const hpPercentage = (boss.stats.currentHP / boss.stats.maxHP) * 100;

        if (boss.currentPhase < boss.phases.length - 1) {
            const nextPhase = boss.phases[boss.currentPhase + 1];
            if (hpPercentage <= nextPhase.hpThreshold) {
                boss.currentPhase++;
                console.log(`Boss ${boss.name} entered ${nextPhase.name}!`);
            }
        }
    }

    static getBossStatus(boss: Boss, quest: Quest): {
        status: 'active' | 'defeated' | 'can-defeat';
        progress: number;
        phase: string;
        healthPercentage: number;
    } {
        const healthPercentage = BossBattleEngine.getBossHealthPercentage(boss);
        const phaseInfo = BossBattleEngine.getBossPhaseInfo(boss);

        let status: 'active' | 'defeated' | 'can-defeat' = 'active';

        if (boss.isDefeated) {
            status = 'defeated';
        } else if (BossBattleEngine.canDefeatBoss(boss, quest)) {
            status = 'can-defeat';
        }

        const progress = ((boss.stats.maxHP - boss.stats.currentHP) / boss.stats.maxHP) * 100;

        return {
            status,
            progress: Math.round(progress),
            phase: phaseInfo.name,
            healthPercentage
        };
    }

    static getBossRewards(boss: Boss): Boss['rewards'] {
        if (!boss.isDefeated) {
            throw new Error('Cannot get rewards from undefeated boss');
        }

        return boss.rewards;
    }

    static isBossBattleWorthy(quest: Quest): boolean {
        // A quest is battle-worthy if it has:
        // 1. Multiple subtasks
        // 2. Significant time investment
        // 3. High difficulty or priority

        const hasMultipleSubtasks = quest.subtasks && quest.subtasks.length > 2;
        const hasTimeInvestment = quest.estimatedTime && this.parseTimeEstimate(quest.estimatedTime) > 3;
        const isSignificant = quest.difficulty === 'Hard' || quest.priority === 'High';

        return hasMultipleSubtasks || hasTimeInvestment || isSignificant;
    }

    static getBossDifficultyRating(quest: Quest): 'easy' | 'medium' | 'hard' | 'epic' {
        const timeEstimate = quest.estimatedTime ? this.parseTimeEstimate(quest.estimatedTime) : 1;
        const subtaskCount = quest.subtasks?.length || 0;
        const difficulty = quest.difficulty || 'Medium';
        const priority = quest.priority || 'Medium';

        let score = 0;

        // Time factor
        if (timeEstimate > 30) score += 4; // months
        else if (timeEstimate > 7) score += 3; // weeks
        else if (timeEstimate > 3) score += 2; // days
        else score += 1;

        // Subtask factor
        if (subtaskCount > 10) score += 3;
        else if (subtaskCount > 5) score += 2;
        else if (subtaskCount > 2) score += 1;

        // Difficulty factor
        if (difficulty === 'Hard') score += 2;
        else if (difficulty === 'Medium') score += 1;

        // Priority factor
        if (priority === 'High') score += 1;

        if (score >= 8) return 'epic';
        if (score >= 6) return 'hard';
        if (score >= 4) return 'medium';
        return 'easy';
    }

    static getBossRecommendation(quest: Quest): {
        shouldCreate: boolean;
        bossType: string;
        reason: string;
    } {
        if (!this.isBossBattleWorthy(quest)) {
            return {
                shouldCreate: false,
                bossType: 'none',
                reason: 'Quest is too simple for a boss battle'
            };
        }

        const difficultyRating = this.getBossDifficultyRating(quest);

        let bossType: string;
        let reason: string;

        switch (difficultyRating) {
            case 'epic':
                bossType = 'legendary-boss';
                reason = 'This is an epic quest that deserves a legendary boss!';
                break;
            case 'hard':
                bossType = 'epic-boss';
                reason = 'A challenging quest that needs an epic boss to match.';
                break;
            case 'medium':
                bossType = 'boss';
                reason = 'A substantial quest that would benefit from a boss battle.';
                break;
            case 'easy':
                bossType = 'mini-boss';
                reason = 'A moderate quest that could use a mini-boss for motivation.';
                break;
            default:
                bossType = 'mini-boss';
                reason = 'Default mini-boss recommendation.';
        }

        return {
            shouldCreate: true,
            bossType,
            reason
        };
    }

    private static parseTimeEstimate(timeString: string): number {
        const lower = timeString.toLowerCase();

        if (lower.includes('day')) {
            const match = lower.match(/(\d+)\s*days?/);
            return match ? parseInt(match[1]) : 1;
        }

        if (lower.includes('week')) {
            const match = lower.match(/(\d+)\s*weeks?/);
            return match ? parseInt(match[1]) * 7 : 7;
        }

        if (lower.includes('month')) {
            const match = lower.match(/(\d+)\s*months?/);
            return match ? parseInt(match[1]) * 30 : 30;
        }

        if (lower.includes('year')) {
            const match = lower.match(/(\d+)\s*years?/);
            return match ? parseInt(match[1]) * 365 : 365;
        }

        return 1; // Default to 1 day
    }

    static getBossBattleSummary(boss: Boss, quest: Quest): {
        title: string;
        description: string;
        currentPhase: string;
        health: string;
        progress: string;
        nextMilestone: string;
    } {
        const status = this.getBossStatus(boss, quest);
        const phaseInfo = BossBattleEngine.getBossPhaseInfo(boss);

        const nextMilestone = this.getNextMilestone(boss, quest);

        return {
            title: boss.title,
            description: boss.description,
            currentPhase: phaseInfo.name,
            health: `${boss.stats.currentHP}/${boss.stats.maxHP} HP`,
            progress: `${status.progress}% Complete`,
            nextMilestone: nextMilestone
        };
    }

    private static getNextMilestone(boss: Boss, quest: Quest): string {
        const completedSubtasks = quest.subtasks.filter(subtask => subtask.completed).length;
        const totalSubtasks = quest.subtasks.length;

        if (completedSubtasks === totalSubtasks) {
            return 'All tasks completed! Boss can be defeated!';
        }

        const nextSubtask = quest.subtasks[completedSubtasks];
        if (nextSubtask) {
            return `Complete: "${nextSubtask.text}"`;
        }

        return 'No more subtasks available';
    }
}
