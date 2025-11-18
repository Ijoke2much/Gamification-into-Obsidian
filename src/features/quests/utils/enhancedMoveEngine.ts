import { Vault } from 'obsidian';
import {
    EnhancedMove,
    EnhancedBattleState,
    EnhancedMoveCalculation,
    MoveEffect,
    ActiveEffect,
    ComboEffect,
    BossAction,
    BossAI,
    MoveProgression,
    CombatPhase
} from '../types/EnhancedMoveTypes';
import { PlayerStats, Boss, SkillTreeStats } from '../types/BossTypes';
import { performanceCache } from '../../../shared/utils/performanceCache';
import { BossPersonalityEngine } from './bossPersonalityEngine';

/**
 * Enhanced move engine with strategic combat mechanics
 * Handles cooldowns, combos, AI reactions, and progressive unlocking
 */
export class EnhancedMoveEngine {
    private static moveProgression: Map<string, MoveProgression> = new Map();
    private static combatPhases: CombatPhase[] = [];

    /**
     * Execute an enhanced move with full strategic mechanics
     */
    static async executeEnhancedMove(
        vault: Vault,
        move: EnhancedMove,
        boss: Boss,
        battleState: EnhancedBattleState,
        playerStats: PlayerStats
    ): Promise<{
        calculation: EnhancedMoveCalculation;
        newBattleState: EnhancedBattleState;
        bossResponse?: BossAction;
        messages: string[];
        animations: any[];
    }> {
        const messages: string[] = [];
        const animations: any[] = [];

        // Check if move is available (not on cooldown)
        if (!this.isMoveAvailable(move, battleState)) {
            const turnsLeft = this.getTurnsUntilAvailable(move, battleState);
            return {
                calculation: this.createFailedCalculation(move, `Move on cooldown (${turnsLeft} turns left)`),
                newBattleState: battleState,
                messages: [`❌ ${move.name} is on cooldown for ${turnsLeft} more turns!`],
                animations: []
            };
        }

        // Calculate move effects with bonuses
        const calculation = this.calculateEnhancedMove(move, boss, battleState, playerStats);

        // Apply move effects
        const updatedBattleState = this.applyMoveEffects(move, calculation, battleState, boss);

        // Handle combo system
        const comboResult = this.processComboSystem(move, updatedBattleState);
        if (comboResult.triggered) {
            messages.push(`🔥 COMBO: ${comboResult.name}! +${comboResult.bonusDamage} damage!`);
            calculation.comboBonus += comboResult.bonusDamage;
            calculation.finalDamage += comboResult.bonusDamage;
        }

        // Apply damage to boss
        boss.stats.currentHP = Math.max(0, boss.stats.currentHP - calculation.finalDamage);

        // Record move usage
        this.recordMoveUsage(move, calculation);

        // Update move history
        updatedBattleState.moveHistory.push({
            turn: updatedBattleState.currentTurn,
            moveName: move.name,
            user: 'player',
            damage: calculation.finalDamage,
            effects: calculation.effectsApplied.map(e => e.type),
            wasCombo: calculation.isComboMove,
            wasCritical: calculation.criticalMultiplier > 1
        });

        // Put move on cooldown
        move.lastUsedTurn = updatedBattleState.currentTurn;

        // Generate boss AI response
        const bossResponse = this.generateBossResponse(move, updatedBattleState, boss);

        // Create messages
        messages.push(this.createMoveMessage(move, calculation));
        if (calculation.effectsApplied.length > 0) {
            messages.push(this.createEffectsMessage(calculation.effectsApplied));
        }

        // Add animations
        if (move.animation) {
            animations.push(this.createMoveAnimation(move, calculation));
        }

        return {
            calculation,
            newBattleState: updatedBattleState,
            bossResponse,
            messages,
            animations
        };
    }

    /**
     * Calculate enhanced move damage and effects
     */
    static calculateEnhancedMove(
        move: EnhancedMove,
        boss: Boss,
        battleState: EnhancedBattleState,
        playerStats: PlayerStats
    ): EnhancedMoveCalculation {
        // Base damage calculation
        const baseDamage = move.power;

        // Stat bonus (from original system)
        const primaryStat = playerStats[move.statRequirements.primaryStat as keyof PlayerStats] || 1;
        const statBonus = Math.floor(baseDamage * (primaryStat / 10));

        // Combo bonus
        const comboBonus = this.calculateComboBonus(move, battleState);

        // Effect bonuses (from active buffs)
        const effectBonus = this.calculateEffectBonus(move, battleState.playerBuffs);

        // Critical hit calculation
        const criticalChance = this.calculateCriticalChance(move, playerStats, battleState);
        const criticalMultiplier = Math.random() < criticalChance ? 1.5 : 1.0;

        // Final damage
        const finalDamage = Math.floor((baseDamage + statBonus + comboBonus + effectBonus) * criticalMultiplier);

        // Determine which effects will be applied
        const effectsApplied: MoveEffect[] = [];
        const effectsResisted: MoveEffect[] = [];

        move.effects.forEach(effect => {
            const resistance = this.calculateEffectResistance(effect, boss, battleState);
            if (Math.random() < (effect.chance / 100) * (1 - resistance)) {
                effectsApplied.push(effect);
            } else {
                effectsResisted.push(effect);
            }
        });

        return {
            baseDamage,
            statBonus,
            comboBonus,
            effectBonus,
            criticalMultiplier,
            finalDamage,
            effectsApplied,
            effectsResisted,
            isComboMove: comboBonus > 0,
            comboChainLength: battleState.comboChain.length,
            animation: move.animation,
            cooldownAfter: move.cooldown,
            cpGained: move.skillEffects?.cpGain || 0,
            nextAvailableTurn: battleState.currentTurn + move.cooldown
        };
    }

    /**
     * Check if move is available (not on cooldown)
     */
    static isMoveAvailable(move: EnhancedMove, battleState: EnhancedBattleState): boolean {
        if (!move.lastUsedTurn) return true;
        return battleState.currentTurn >= move.lastUsedTurn + move.cooldown;
    }

    /**
     * Get turns until move is available
     */
    static getTurnsUntilAvailable(move: EnhancedMove, battleState: EnhancedBattleState): number {
        if (!move.lastUsedTurn) return 0;
        const availableTurn = move.lastUsedTurn + move.cooldown;
        return Math.max(0, availableTurn - battleState.currentTurn);
    }

    /**
     * Process combo system
     */
    static processComboSystem(
        move: EnhancedMove,
        battleState: EnhancedBattleState
    ): { triggered: boolean; name?: string; bonusDamage: number } {
        if (!move.comboRequirements || move.comboRequirements.length === 0) {
            return { triggered: false, bonusDamage: 0 };
        }

        for (const comboReq of move.comboRequirements) {
            if (this.checkComboRequirement(comboReq, battleState)) {
                // Find matching combo effect
                const comboEffect = move.comboEffects?.find(ce =>
                    ce.name.toLowerCase().includes('combo')
                );

                if (comboEffect) {
                    const bonusDamage = comboEffect.effects.reduce((sum, effect) => {
                        return effect.type === 'damage' ? sum + effect.magnitude : sum;
                    }, 0);

                    // Reset combo chain after successful combo
                    battleState.comboChain = [];
                    battleState.lastComboTurn = battleState.currentTurn;

                    return {
                        triggered: true,
                        name: comboEffect.name,
                        bonusDamage
                    };
                }
            }
        }

        // Add move to combo chain if no combo triggered
        battleState.comboChain.push(move.name);
        return { triggered: false, bonusDamage: 0 };
    }

    /**
     * Generate boss AI response based on player move and personality
     */
    static generateBossResponse(
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState,
        boss: Boss
    ): BossAction {
        const healthPercent = (boss.stats.currentHP / boss.stats.maxHP) * 100;

        // Use personality engine if boss has AI personality
        if (boss.ai?.personality) {
            return BossPersonalityEngine.generatePersonalityResponse(
                boss,
                playerMove,
                battleState,
                healthPercent
            );
        }

        // Fallback to basic AI logic for bosses without personalities
        if (healthPercent < 25) {
            return {
                type: 'special',
                moveName: 'Desperate Strike',
                reasoning: 'Boss is in critical health and uses desperate attack',
                targetEffects: ['damage']
            };
        } else if (playerMove.category === 'buff') {
            return {
                type: 'counter',
                moveName: 'Dispel',
                reasoning: 'Boss counters player buffs with dispel',
                targetEffects: ['stat_reduction']
            };
        } else if (playerMove.category === 'attack' && playerMove.power > 50) {
            return {
                type: 'buff',
                moveName: 'Defensive Stance',
                reasoning: 'Boss buffs defense after taking heavy damage',
                targetEffects: ['stat_boost']
            };
        } else {
            return {
                type: 'attack',
                moveName: 'Basic Attack',
                reasoning: 'Standard boss attack',
                targetEffects: ['damage']
            };
        }
    }

    /**
     * Apply move effects to battle state
     */
    static applyMoveEffects(
        move: EnhancedMove,
        calculation: EnhancedMoveCalculation,
        battleState: EnhancedBattleState,
        boss: Boss
    ): EnhancedBattleState {
        const newState = { ...battleState };

        // Apply each effect
        calculation.effectsApplied.forEach(effect => {
            const activeEffect: ActiveEffect = {
                id: `${move.name}-${effect.type}-${Date.now()}`,
                name: `${move.name} ${effect.type}`,
                type: effect.type,
                magnitude: effect.magnitude,
                remainingTurns: effect.duration,
                source: move.name,
                stackCount: 1,
                appliedTurn: battleState.currentTurn
            };

            if (effect.target === 'self') {
                newState.playerBuffs.push(activeEffect);
            } else if (effect.target === 'boss') {
                newState.bossDebuffs.push(activeEffect);
            }
        });

        return newState;
    }

    /**
     * Create default enhanced moves for bosses
     */
    static createDefaultEnhancedMoves(): EnhancedMove[] {
        return [
            {
                name: 'Power Strike',
                description: 'A focused attack that grows stronger with your Strength.',
                type: 'attack',
                power: 25,
                accuracy: 85,
                statRequirements: {
                    primaryStat: 'strength',
                    primaryMinLevel: 1
                },
                statScaling: {
                    primaryStat: 'strength',
                    scalingFactor: 2.5,
                    maxBonus: 30,
                    minBonus: 5
                },
                moveCategory: 'strength',
                skillEffects: {
                    cpGain: 3
                },
                cooldown: 2,
                category: 'attack',
                effects: [
                    {
                        type: 'damage',
                        target: 'boss',
                        duration: 1,
                        magnitude: 25,
                        chance: 100
                    }
                ],
                unlockConditions: [
                    {
                        type: 'skill_level',
                        requirement: 1,
                        skillName: 'strength'
                    }
                ],
                priority: 1,
                animation: {
                    name: 'power-strike',
                    duration: 800,
                    effects: [
                        {
                            type: 'flash',
                            target: 'opponent',
                            intensity: 0.7,
                            color: '#ff4444'
                        }
                    ]
                }
            },
            {
                name: 'Focus Meditation',
                description: 'Center your mind to boost accuracy and critical hit chance.',
                type: 'status',
                power: 0,
                accuracy: 100,
                statRequirements: {
                    primaryStat: 'focus',
                    primaryMinLevel: 2
                },
                statScaling: {
                    primaryStat: 'focus',
                    scalingFactor: 1.5,
                    maxBonus: 20,
                    minBonus: 3
                },
                moveCategory: 'focus',
                skillEffects: {
                    cpGain: 2
                },
                cooldown: 4,
                category: 'buff',
                effects: [
                    {
                        type: 'critical_boost',
                        target: 'self',
                        duration: 3,
                        magnitude: 25,
                        chance: 100
                    },
                    {
                        type: 'accuracy_boost',
                        target: 'self',
                        duration: 3,
                        magnitude: 15,
                        chance: 100
                    }
                ],
                unlockConditions: [
                    {
                        type: 'skill_level',
                        requirement: 2,
                        skillName: 'focus'
                    }
                ],
                priority: 2
            },
            {
                name: 'Endurance Rush',
                description: 'Channel your endurance for sustained damage over multiple turns.',
                type: 'attack',
                power: 15,
                accuracy: 90,
                statRequirements: {
                    primaryStat: 'endurance',
                    primaryMinLevel: 3
                },
                statScaling: {
                    primaryStat: 'endurance',
                    scalingFactor: 2.0,
                    maxBonus: 25,
                    minBonus: 4
                },
                moveCategory: 'endurance',
                skillEffects: {
                    cpGain: 4
                },
                cooldown: 1,
                category: 'attack',
                effects: [
                    {
                        type: 'damage',
                        target: 'boss',
                        duration: 1,
                        magnitude: 15,
                        chance: 100
                    },
                    {
                        type: 'regeneration',
                        target: 'self',
                        duration: 2,
                        magnitude: 5,
                        chance: 50
                    }
                ],
                comboRequirements: [
                    {
                        previousMoves: ['Power Strike'],
                        maxTurnGap: 2
                    }
                ],
                comboEffects: [
                    {
                        name: 'Strength-Endurance Combo',
                        description: 'Power and endurance combine for devastating effect!',
                        effects: [
                            {
                                type: 'damage',
                                target: 'boss',
                                duration: 1,
                                magnitude: 20,
                                chance: 100
                            }
                        ]
                    }
                ],
                unlockConditions: [
                    {
                        type: 'skill_level',
                        requirement: 3,
                        skillName: 'endurance'
                    }
                ],
                priority: 1
            },
            {
                name: 'Creative Inspiration',
                description: 'A burst of creativity that can unlock new possibilities.',
                type: 'special',
                power: 20,
                accuracy: 75,
                statRequirements: {
                    primaryStat: 'creativity',
                    primaryMinLevel: 4
                },
                statScaling: {
                    primaryStat: 'creativity',
                    scalingFactor: 3.0,
                    maxBonus: 35,
                    minBonus: 8
                },
                moveCategory: 'creativity',
                skillEffects: {
                    cpGain: 5
                },
                cooldown: 5,
                category: 'utility',
                effects: [
                    {
                        type: 'damage',
                        target: 'boss',
                        duration: 1,
                        magnitude: 20,
                        chance: 75
                    },
                    {
                        type: 'stat_boost',
                        target: 'self',
                        duration: 4,
                        magnitude: 2,
                        chance: 100
                    }
                ],
                unlockConditions: [
                    {
                        type: 'skill_level',
                        requirement: 4,
                        skillName: 'creativity'
                    }
                ],
                priority: 3
            },
            {
                name: 'Ultimate Focus Blast',
                description: 'Channel all your mental energy into one devastating attack.',
                type: 'special',
                power: 60,
                accuracy: 70,
                statRequirements: {
                    primaryStat: 'focus',
                    primaryMinLevel: 5,
                    secondaryStat: 'intelligence',
                    secondaryMinLevel: 3
                },
                statScaling: {
                    primaryStat: 'focus',
                    scalingFactor: 4.0,
                    maxBonus: 50,
                    minBonus: 15
                },
                moveCategory: 'focus',
                skillEffects: {
                    cpGain: 8
                },
                cooldown: 8,
                category: 'ultimate',
                effects: [
                    {
                        type: 'damage',
                        target: 'boss',
                        duration: 1,
                        magnitude: 60,
                        chance: 70
                    },
                    {
                        type: 'stun',
                        target: 'boss',
                        duration: 1,
                        magnitude: 1,
                        chance: 30
                    }
                ],
                unlockConditions: [
                    {
                        type: 'skill_level',
                        requirement: 5,
                        skillName: 'focus'
                    },
                    {
                        type: 'battles_won',
                        requirement: 3
                    }
                ],
                priority: 4,
                animation: {
                    name: 'ultimate-blast',
                    duration: 1500,
                    effects: [
                        {
                            type: 'glow',
                            target: 'user',
                            intensity: 1.0,
                            color: '#00ffff'
                        },
                        {
                            type: 'shake',
                            target: 'screen',
                            intensity: 0.8
                        }
                    ]
                }
            }
        ];
    }

    /**
     * Assign personality to boss and enhance with AI
     */
    static enhanceBossWithPersonality(boss: Boss, suggestedPersonality?: string): Boss {
        return BossPersonalityEngine.assignPersonality(boss, suggestedPersonality as any);
    }

    // Helper methods
    private static calculateComboBonus(move: EnhancedMove, battleState: EnhancedBattleState): number {
        return battleState.comboChain.length * 5; // 5 bonus damage per move in chain
    }

    private static calculateEffectBonus(move: EnhancedMove, activeBuffs: ActiveEffect[]): number {
        return activeBuffs.reduce((bonus, buff) => {
            if (buff.type === 'stat_boost') {
                return bonus + buff.magnitude;
            }
            return bonus;
        }, 0);
    }

    private static calculateCriticalChance(move: EnhancedMove, playerStats: PlayerStats, battleState: EnhancedBattleState): number {
        let baseChance = 0.1; // 10% base critical chance

        // Bonus from focus stat
        const focusBonus = (playerStats.focus || 1) * 0.02;

        // Bonus from active effects
        const effectBonus = battleState.playerBuffs.reduce((bonus, buff) => {
            return buff.type === 'critical_boost' ? bonus + (buff.magnitude / 100) : bonus;
        }, 0);

        return Math.min(0.5, baseChance + focusBonus + effectBonus); // Cap at 50%
    }

    private static calculateEffectResistance(effect: MoveEffect, boss: Boss, battleState: EnhancedBattleState): number {
        // Simple resistance calculation - can be expanded
        return 0.1; // 10% base resistance
    }

    private static checkComboRequirement(comboReq: any, battleState: EnhancedBattleState): boolean {
        // Check if required previous moves are in recent history
        const recentMoves = battleState.moveHistory
            .filter(entry => entry.turn > battleState.currentTurn - comboReq.maxTurnGap)
            .map(entry => entry.moveName);

        return comboReq.previousMoves.every((requiredMove: string) =>
            recentMoves.includes(requiredMove)
        );
    }

    private static createFailedCalculation(move: EnhancedMove, reason: string): EnhancedMoveCalculation {
        return {
            baseDamage: 0,
            statBonus: 0,
            comboBonus: 0,
            effectBonus: 0,
            criticalMultiplier: 1,
            finalDamage: 0,
            effectsApplied: [],
            effectsResisted: [],
            isComboMove: false,
            comboChainLength: 0,
            cooldownAfter: 0,
            cpGained: 0,
            nextAvailableTurn: 0
        };
    }

    private static recordMoveUsage(move: EnhancedMove, calculation: EnhancedMoveCalculation): void {
        const progression = this.moveProgression.get(move.name) || {
            moveId: move.name,
            timesUsed: 0,
            totalDamageDealt: 0,
            successfulCombos: 0,
            masteryLevel: 0,
            masteryBonuses: []
        };

        progression.timesUsed++;
        progression.totalDamageDealt += calculation.finalDamage;
        if (calculation.isComboMove) {
            progression.successfulCombos++;
        }

        this.moveProgression.set(move.name, progression);
    }

    private static createMoveMessage(move: EnhancedMove, calculation: EnhancedMoveCalculation): string {
        let message = `⚔️ ${move.name}: ${calculation.finalDamage} damage`;

        if (calculation.criticalMultiplier > 1) {
            message += ' (CRITICAL!)';
        }

        if (calculation.isComboMove) {
            message += ` (COMBO x${calculation.comboChainLength})`;
        }

        return message;
    }

    private static createEffectsMessage(effects: MoveEffect[]): string {
        const effectNames = effects.map(e => e.type.replace('_', ' ')).join(', ');
        return `✨ Effects applied: ${effectNames}`;
    }

    private static createMoveAnimation(move: EnhancedMove, calculation: EnhancedMoveCalculation): any {
        return {
            name: move.animation?.name || 'default',
            duration: move.animation?.duration || 500,
            effects: move.animation?.effects || [],
            isCritical: calculation.criticalMultiplier > 1,
            isCombo: calculation.isComboMove
        };
    }
}
