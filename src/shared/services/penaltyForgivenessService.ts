import { playerStore } from '../state/playerStore';
import { PlayerData, Debuff } from '../../data/models/PlayerData';
import { Notice } from 'obsidian';
import { showGameNotice } from '../utils/noticeUtils';

export interface ForgivenessEvent {
    id: string;
    name: string;
    description: string;
    type: 'achievement' | 'streak' | 'special' | 'redemption';
    requirements: {
        onTimeQuests?: number;
        consecutiveDays?: number;
        totalXP?: number;
        reputation?: number;
    };
    rewards: {
        debtReduction: {
            xp: number;
            coins: number;
        };
        reputationBoost: number;
        debuffRemoval?: string[];
        specialReward?: string;
    };
    cooldown?: number; // Days before event can trigger again
    lastTriggered?: Date;
}

export interface ForgivenessResult {
    success: boolean;
    message: string;
    debtReduced: { xp: number; coins: number };
    reputationGained: number;
    debuffsRemoved: string[];
    specialReward?: string;
}

export class PenaltyForgivenessService {
    private static instance: PenaltyForgivenessService;
    private forgivenessEvents: Map<string, ForgivenessEvent> = new Map();

    static getInstance(): PenaltyForgivenessService {
        if (!PenaltyForgivenessService.instance) {
            PenaltyForgivenessService.instance = new PenaltyForgivenessService();
        }
        return PenaltyForgivenessService.instance;
    }

    constructor() {
        this.initializeForgivenessEvents();
    }

    private initializeForgivenessEvents(): void {
        // Achievement-based forgiveness
        this.forgivenessEvents.set('on_time_streak_7', {
            id: 'on_time_streak_7',
            name: 'Perfect Week',
            description: 'Complete 7 quests on time in a row',
            type: 'achievement',
            requirements: { onTimeQuests: 7 },
            rewards: {
                debtReduction: { xp: 100, coins: 10 },
                reputationBoost: 5,
                debuffRemoval: ['Procrastination', 'Battle Fatigue'],
                specialReward: 'Time Management Master Badge'
            },
            cooldown: 30
        });

        this.forgivenessEvents.set('reputation_recovery', {
            id: 'reputation_recovery',
            name: 'Redemption Arc',
            description: 'Improve reputation from negative to positive',
            type: 'redemption',
            requirements: { reputation: 0 },
            rewards: {
                debtReduction: { xp: 200, coins: 20 },
                reputationBoost: 10,
                debuffRemoval: ['Procrastination'],
                specialReward: 'Second Chance Token'
            },
            cooldown: 60
        });

        this.forgivenessEvents.set('xp_milestone', {
            id: 'xp_milestone',
            name: 'Skill Mastery',
            description: 'Earn 1000 XP in a single day',
            type: 'achievement',
            requirements: { totalXP: 1000 },
            rewards: {
                debtReduction: { xp: 150, coins: 15 },
                reputationBoost: 8,
                debuffRemoval: ['Scattered Focus'],
                specialReward: 'Productivity Surge'
            },
            cooldown: 7
        });

        this.forgivenessEvents.set('consecutive_days', {
            id: 'consecutive_days',
            name: 'Dedication',
            description: 'Complete quests for 5 consecutive days',
            type: 'streak',
            requirements: { consecutiveDays: 5 },
            rewards: {
                debtReduction: { xp: 75, coins: 8 },
                reputationBoost: 3,
                debuffRemoval: ['Battle Fatigue'],
                specialReward: 'Consistency Bonus'
            },
            cooldown: 14
        });

        // Special events
        this.forgivenessEvents.set('new_year_clean_slate', {
            id: 'new_year_clean_slate',
            name: 'New Year Clean Slate',
            description: 'Start the new year with a fresh start',
            type: 'special',
            requirements: {},
            rewards: {
                debtReduction: { xp: 500, coins: 50 },
                reputationBoost: 20,
                debuffRemoval: ['Procrastination', 'Battle Fatigue', 'Scattered Focus'],
                specialReward: 'Fresh Start Achievement'
            },
            cooldown: 365
        });
    }

    async checkForgivenessEvents(): Promise<ForgivenessResult[]> {
        const player = await playerStore.get();
        if (!player) {
            return [];
        }

        const results: ForgivenessResult[] = [];
        const now = new Date();

        for (const event of this.forgivenessEvents.values()) {
            // Check cooldown
            if (event.lastTriggered && event.cooldown) {
                const daysSinceLastTrigger = (now.getTime() - event.lastTriggered.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceLastTrigger < event.cooldown) {
                    continue;
                }
            }

            // Check if event requirements are met
            if (await this.checkEventRequirements(event, player)) {
                const result = await this.applyForgivenessEvent(event, player);
                if (result.success) {
                    results.push(result);
                    event.lastTriggered = now;
                }
            }
        }

        return results;
    }

    async applyForgivenessEvent(event: ForgivenessEvent, player: PlayerData): Promise<ForgivenessResult> {
        const currentDebt = {
            xp: player.failureDebtXP || 0,
            coins: player.failureDebtCoins || 0
        };

        // Calculate actual debt reduction (can't reduce below 0)
        const debtReduced = {
            xp: Math.min(currentDebt.xp, event.rewards.debtReduction.xp),
            coins: Math.min(currentDebt.coins, event.rewards.debtReduction.coins)
        };

        // Remove specified debuffs
        const debuffsToRemove = event.rewards.debuffRemoval || [];
        const activeDebuffs = (player.debuffs || []).filter(debuff =>
            !debuff.expiresAt || new Date(debuff.expiresAt) > new Date()
        );

        const debuffsRemoved = activeDebuffs
            .filter(debuff => debuffsToRemove.includes(debuff.name))
            .map(debuff => debuff.name);

        // Apply changes to player data
        await playerStore.update(data => {
            const updatedData = { ...data };

            // Reduce debt
            if (debtReduced.xp > 0) {
                updatedData.failureDebtXP = Math.max(0, (data.failureDebtXP || 0) - debtReduced.xp);
            }
            if (debtReduced.coins > 0) {
                updatedData.failureDebtCoins = Math.max(0, (data.failureDebtCoins || 0) - debtReduced.coins);
            }

            // Boost reputation
            if (event.rewards.reputationBoost > 0) {
                updatedData.questReputation = Math.min(100, (data.questReputation || 0) + event.rewards.reputationBoost);
            }

            // Remove debuffs
            if (debuffsRemoved.length > 0) {
                updatedData.debuffs = (data.debuffs || []).filter(debuff =>
                    !debuffsRemoved.includes(debuff.name)
                );
            }

            return updatedData;
        });

        // Show notification
        let message = `🎉 ${event.name}: ${event.description}`;
        if (debtReduced.xp > 0 || debtReduced.coins > 0) {
            message += `\n💰 Debt reduced: ${debtReduced.xp} XP, ${debtReduced.coins} coins`;
        }
        if (event.rewards.reputationBoost > 0) {
            message += `\n⭐ Reputation +${event.rewards.reputationBoost}`;
        }
        if (debuffsRemoved.length > 0) {
            message += `\n✨ Removed debuffs: ${debuffsRemoved.join(', ')}`;
        }
        if (event.rewards.specialReward) {
            message += `\n🏆 Special reward: ${event.rewards.specialReward}`;
        }

        showGameNotice(message, 10000);

        return {
            success: true,
            message: event.description,
            debtReduced,
            reputationGained: event.rewards.reputationBoost,
            debuffsRemoved,
            specialReward: event.rewards.specialReward
        };
    }

    private async checkEventRequirements(event: ForgivenessEvent, player: PlayerData): Promise<boolean> {
        // This would integrate with actual quest completion tracking
        // For now, we'll use simplified checks based on current state

        if (event.requirements.reputation !== undefined) {
            const currentReputation = player.questReputation || 0;
            if (event.requirements.reputation === 0) {
                // Check if reputation improved from negative to positive
                // This would need historical tracking
                return false;
            }
        }

        if (event.requirements.totalXP !== undefined) {
            // This would need daily XP tracking
            return false;
        }

        if (event.requirements.onTimeQuests !== undefined) {
            // This would need quest completion history
            return false;
        }

        if (event.requirements.consecutiveDays !== undefined) {
            // This would need daily activity tracking
            return false;
        }

        // Special events
        if (event.id === 'new_year_clean_slate') {
            const now = new Date();
            return now.getMonth() === 0 && now.getDate() === 1; // January 1st
        }

        return false;
    }

    async getAvailableForgivenessEvents(): Promise<ForgivenessEvent[]> {
        const player = await playerStore.get();
        if (!player) {
            return [];
        }

        const availableEvents: ForgivenessEvent[] = [];
        const now = new Date();

        for (const event of this.forgivenessEvents.values()) {
            // Check cooldown
            if (event.lastTriggered && event.cooldown) {
                const daysSinceLastTrigger = (now.getTime() - event.lastTriggered.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceLastTrigger < event.cooldown) {
                    continue;
                }
            }

            // Check if requirements are close to being met
            if (await this.checkEventRequirements(event, player)) {
                availableEvents.push(event);
            }
        }

        return availableEvents;
    }
}

export const penaltyForgivenessService = PenaltyForgivenessService.getInstance();
