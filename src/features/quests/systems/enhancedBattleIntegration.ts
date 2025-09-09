import { Vault } from 'obsidian';
import { Boss, PlayerStats } from '../types/BossTypes';
import { EnhancedBattleState } from '../types/EnhancedMoveTypes';
import { createEnhancedTaskDiscovery } from './enhancedTaskDiscovery';
import { productivityEquipmentSystem, EquipmentBattleModifiers } from './productivityEquipmentSystem';
import { dynamicBossEvents, EventBattleModifiers } from './dynamicBossEvents';
import { materialRewardSystem, MaterialReward } from './materialRewardSystem';
import { Notice } from 'obsidian';

/**
 * Enhanced Battle Integration System
 * Combines all enhanced gameplay systems for productivity-focused boss battles
 * Integrates task discovery, equipment, events, and real-world productivity mechanics
 */
export class EnhancedBattleIntegration {
    private static instance: EnhancedBattleIntegration;
    private vault: Vault;
    private taskDiscovery: ReturnType<typeof createEnhancedTaskDiscovery>;
    private isInitialized: boolean = false;

    private constructor(vault: Vault) {
        this.vault = vault;
        this.taskDiscovery = createEnhancedTaskDiscovery(vault);
    }

    static getInstance(vault: Vault): EnhancedBattleIntegration {
        if (!EnhancedBattleIntegration.instance) {
            EnhancedBattleIntegration.instance = new EnhancedBattleIntegration(vault);
        }
        return EnhancedBattleIntegration.instance;
    }

    /**
     * Initialize the enhanced battle system
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Start task discovery auto-refresh
            await this.taskDiscovery.performAutoRefresh();

            this.isInitialized = true;
            new Notice('🎮 Enhanced Battle System initialized!', 3000);
        } catch (error) {
            console.error('Failed to initialize enhanced battle system:', error);
            new Notice('❌ Failed to initialize enhanced battle system', 5000);
        }
    }

    /**
     * Prepare a boss battle with all enhanced systems
     */
    async prepareBossBattle(boss: Boss, playerStats: PlayerStats): Promise<EnhancedBattlePreparation> {
        try {
            // 1. Refresh boss tasks
            const taskDiscoveryResult = await this.taskDiscovery.refreshBossTasks(boss);

            // 2. Check for dynamic events
            const battleState: EnhancedBattleState = {
                currentTurn: 0,
                activeEffects: new Map(),
                moveHistory: [],
                comboChain: [],
                lastComboTurn: 0,
                availableMoves: [],
                playerActionThisTurn: false,
                bossActionThisTurn: false,
                playerBuffs: [],
                bossDebuffs: []
            };

            const triggeredEvents = await dynamicBossEvents.checkForEvents(boss, battleState);

            // 3. Apply equipment effects
            const currentTime = new Date();
            const timeOfDay = currentTime.getHours();
            const equipmentModifiers = productivityEquipmentSystem.applyEquipmentEffects(
                playerStats,
                battleState,
                timeOfDay
            );

            // 4. Apply event effects
            const eventModifiers = dynamicBossEvents.applyEventEffects(boss, battleState);

            // 5. Calculate final battle modifiers
            const finalModifiers = this.calculateFinalModifiers(
                equipmentModifiers,
                eventModifiers,
                taskDiscoveryResult
            );

            return {
                boss,
                playerStats: this.applyModifiersToStats(playerStats, finalModifiers),
                taskDiscoveryResult,
                triggeredEvents,
                equipmentModifiers,
                eventModifiers,
                finalModifiers,
                battleState,
                preparationTime: new Date()
            };
        } catch (error) {
            console.error('Error preparing boss battle:', error);
            throw error;
        }
    }

    /**
     * Execute a battle turn with enhanced systems
     */
    async executeBattleTurn(
        preparation: EnhancedBattlePreparation,
        playerAction: PlayerBattleAction
    ): Promise<BattleTurnResult> {
        try {
            const { boss, playerStats, battleState, finalModifiers } = preparation;

            // 1. Calculate base damage
            const baseDamage = this.calculateBaseDamage(playerAction, playerStats);

            // 2. Apply all modifiers
            const finalDamage = this.applyDamageModifiers(baseDamage, finalModifiers);

            // 3. Apply damage to boss
            const damageDealt = Math.min(finalDamage, boss.stats.currentHP);
            boss.stats.currentHP -= damageDealt;

            // 4. Check for boss defeat
            const isBossDefeated = boss.stats.currentHP <= 0;

            // 5. Generate boss response (if not defeated)
            let bossResponse: BossBattleResponse | null = null;
            if (!isBossDefeated) {
                bossResponse = await this.generateBossResponse(boss, battleState, finalModifiers);
            }

            // 6. Update battle state
            battleState.currentTurn++;
            // Note: playerEnergy would need to be tracked separately or added to EnhancedBattleState

            // 7. Check for new events or task discoveries
            const newEvents = await this.checkForMidBattleEvents(boss, battleState);
            const newTaskDiscovery = await this.checkForMidBattleTaskDiscovery(boss);

            // 8. Calculate rewards including battle duration
            const battleDuration = 60; // Default battle duration in seconds (can be enhanced later)
            const rewards = this.calculateBattleRewards(damageDealt, finalModifiers, isBossDefeated, boss, battleDuration);

            return {
                damageDealt,
                isBossDefeated,
                bossResponse,
                newEvents,
                newTaskDiscovery,
                rewards,
                updatedBattleState: battleState,
                turnEndTime: new Date()
            };
        } catch (error) {
            console.error('Error executing battle turn:', error);
            throw error;
        }
    }

    /**
     * Calculate final battle modifiers from all systems
     */
    private calculateFinalModifiers(
        equipmentModifiers: EquipmentBattleModifiers,
        eventModifiers: EventBattleModifiers,
        taskDiscovery: any
    ): FinalBattleModifiers {
        return {
            damageMultiplier: 1 + (equipmentModifiers.damageMultipliers.focus || 0) + (eventModifiers.damageModifier - 1),
            defenseMultiplier: eventModifiers.defenseModifier,
            energyEfficiency: 1 + (equipmentModifiers.statBonuses.motivation || 0),
            focusBonus: equipmentModifiers.statBonuses.focus || 0,
            enduranceBonus: equipmentModifiers.statBonuses.endurance || 0,
            specialEffects: [
                ...equipmentModifiers.specialEffects,
                ...eventModifiers.specialEffects
            ],
            timeBasedBonuses: equipmentModifiers.timeBasedBonuses,
            resistanceEffects: equipmentModifiers.resistanceEffects,
            scopeChangeImpact: taskDiscovery.scopeChange?.impact === 'major' ? 0.2 : 0
        };
    }

    /**
     * Apply modifiers to player stats
     */
    private applyModifiersToStats(playerStats: PlayerStats, modifiers: FinalBattleModifiers): PlayerStats {
        return {
            ...playerStats,
            focus: playerStats.focus * (1 + modifiers.focusBonus),
            endurance: playerStats.endurance * (1 + modifiers.enduranceBonus),
            motivation: playerStats.motivation * modifiers.energyEfficiency
        };
    }

    /**
     * Calculate base damage from player action
     */
    private calculateBaseDamage(action: PlayerBattleAction, stats: PlayerStats): number {
        let baseDamage = action.baseDamage || 10;

        // Scale with relevant stats
        switch (action.type) {
            case 'focus_attack':
                baseDamage *= (1 + stats.focus / 100);
                break;
            case 'endurance_attack':
                baseDamage *= (1 + stats.endurance / 100);
                break;
            case 'motivation_attack':
                baseDamage *= (1 + stats.motivation / 100);
                break;
            case 'balanced_attack':
                baseDamage *= (1 + (stats.focus + stats.endurance + stats.motivation) / 300);
                break;
        }

        return Math.round(baseDamage);
    }

    /**
     * Apply damage modifiers
     */
    private applyDamageModifiers(baseDamage: number, modifiers: FinalBattleModifiers): number {
        let finalDamage = baseDamage;

        // Apply damage multiplier
        finalDamage *= modifiers.damageMultiplier;

        // Apply time-based bonuses
        const currentHour = new Date().getHours();
        if (modifiers.timeBasedBonuses.morning && currentHour >= 6 && currentHour <= 10) {
            finalDamage *= (1 + modifiers.timeBasedBonuses.morning);
        }

        // Apply scope change impact
        if (modifiers.scopeChangeImpact > 0) {
            finalDamage *= (1 + modifiers.scopeChangeImpact);
        }

        return Math.round(finalDamage);
    }

    /**
     * Generate boss response
     */
    private async generateBossResponse(
        boss: Boss,
        battleState: EnhancedBattleState,
        modifiers: FinalBattleModifiers
    ): Promise<BossBattleResponse> {
        // This would integrate with the existing boss AI system
        // For now, return a basic response
        return {
            type: 'counter_attack',
            damage: Math.round(15 * modifiers.defenseMultiplier),
            message: `${boss.name} counter-attacks!`,
            effects: []
        };
    }

    /**
     * Check for mid-battle events
     */
    private async checkForMidBattleEvents(boss: Boss, battleState: EnhancedBattleState): Promise<any[]> {
        // Check if any events have expired
        dynamicBossEvents.checkEventExpiration();

        // Check for new events (lower probability during battle)
        const events = await dynamicBossEvents.checkForEvents(boss, battleState);
        return events;
    }

    /**
     * Check for mid-battle task discoveries
     */
    private async checkForMidBattleTaskDiscovery(boss: Boss): Promise<any> {
        // Lower probability during battle, but still possible
        if (Math.random() < 0.1) { // 10% chance
            return await this.taskDiscovery.refreshBossTasks(boss);
        }
        return null;
    }

    /**
 * Calculate battle rewards including materials
 */
    private calculateBattleRewards(
        damageDealt: number,
        modifiers: FinalBattleModifiers,
        isBossDefeated: boolean,
        boss: Boss,
        battleDuration: number = 0
    ): BattleRewards {
        const baseReward = damageDealt;
        const multiplier = modifiers.damageMultiplier;

        // Calculate material rewards using the material reward system
        const materialRewards = materialRewardSystem.calculateBossRewards(
            boss,
            damageDealt,
            battleDuration,
            isBossDefeated
        );

        // Award materials to player
        materialRewardSystem.awardMaterials(materialRewards);

        return {
            cp: Math.round(baseReward * multiplier * 0.1), // CP for skill progression
            coins: Math.round(baseReward * multiplier * 0.05), // Coins for equipment
            materials: this.convertMaterialRewardsToRecord(materialRewards),
            experience: Math.round(baseReward * multiplier * 0.2),
            bonusRewards: isBossDefeated ? this.generateBossDefeatRewards() : [],
            materialRewards // Include detailed material rewards
        };
    }

    /**
     * Convert material rewards to record format
     */
    private convertMaterialRewardsToRecord(materialRewards: MaterialReward[]): Record<string, number> {
        const materials: Record<string, number> = {};

        for (const reward of materialRewards) {
            materials[reward.materialId] = (materials[reward.materialId] || 0) + reward.quantity;
        }

        return materials;
    }

    /**
     * Generate random materials based on damage dealt (legacy method)
     */
    private generateRandomMaterials(damageDealt: number): Record<string, number> {
        const materials: Record<string, number> = {};
        const materialTypes = [
            'focus-crystal', 'endurance-gem', 'motivation-essence',
            'productivity-shard', 'time-fragment', 'energy-core'
        ];

        const numMaterials = Math.floor(damageDealt / 20); // 1 material per 20 damage
        for (let i = 0; i < numMaterials; i++) {
            const material = materialTypes[Math.floor(Math.random() * materialTypes.length)];
            materials[material] = (materials[material] || 0) + 1;
        }

        return materials;
    }

    /**
     * Generate boss defeat rewards
     */
    private generateBossDefeatRewards(): string[] {
        return [
            'Boss Defeated Achievement',
            'Project Completion Badge',
            'Productivity Mastery Token'
        ];
    }

    /**
     * Get battle analytics
     */
    getBattleAnalytics(): EnhancedBattleAnalytics {
        return {
            totalBattles: 0, // Would be tracked in a persistent store
            totalDamageDealt: 0,
            averageBattleDuration: 0,
            mostUsedEquipment: productivityEquipmentSystem.getEquippedGear(),
            eventStatistics: dynamicBossEvents.getEventStatistics(),
            taskDiscoveryStats: this.getTaskDiscoveryStats()
        };
    }

    /**
     * Get task discovery statistics
     */
    private getTaskDiscoveryStats(): any {
        // This would return statistics about task discoveries
        return {
            totalTasksDiscovered: 0,
            averageTasksPerBoss: 0,
            scopeChangesDetected: 0
        };
    }

    /**
     * Cleanup and shutdown
     */
    async shutdown(): Promise<void> {
        if (this.taskDiscovery) {
            this.taskDiscovery.stopAutoRefresh();
        }
        this.isInitialized = false;
    }
}

// Type definitions
export interface EnhancedBattlePreparation {
    boss: Boss;
    playerStats: PlayerStats;
    taskDiscoveryResult: any;
    triggeredEvents: any[];
    equipmentModifiers: EquipmentBattleModifiers;
    eventModifiers: EventBattleModifiers;
    finalModifiers: FinalBattleModifiers;
    battleState: EnhancedBattleState;
    preparationTime: Date;
}

export interface PlayerBattleAction {
    type: 'focus_attack' | 'endurance_attack' | 'motivation_attack' | 'balanced_attack';
    baseDamage: number;
    energyCost: number;
    description: string;
}

export interface BossBattleResponse {
    type: string;
    damage: number;
    message: string;
    effects: string[];
}

export interface BattleTurnResult {
    damageDealt: number;
    isBossDefeated: boolean;
    bossResponse: BossBattleResponse | null;
    newEvents: any[];
    newTaskDiscovery: any;
    rewards: BattleRewards;
    updatedBattleState: EnhancedBattleState;
    turnEndTime: Date;
}

export interface FinalBattleModifiers {
    damageMultiplier: number;
    defenseMultiplier: number;
    energyEfficiency: number;
    focusBonus: number;
    enduranceBonus: number;
    specialEffects: string[];
    timeBasedBonuses: Record<string, number>;
    resistanceEffects: Record<string, number>;
    scopeChangeImpact: number;
}

export interface BattleRewards {
    cp: number;
    coins: number;
    materials: Record<string, number>;
    experience: number;
    bonusRewards: string[];
    materialRewards?: MaterialReward[];
}

export interface EnhancedBattleAnalytics {
    totalBattles: number;
    totalDamageDealt: number;
    averageBattleDuration: number;
    mostUsedEquipment: Map<string, any>;
    eventStatistics: any;
    taskDiscoveryStats: any;
}

// Export singleton factory
export const createEnhancedBattleIntegration = (vault: Vault) => EnhancedBattleIntegration.getInstance(vault);
