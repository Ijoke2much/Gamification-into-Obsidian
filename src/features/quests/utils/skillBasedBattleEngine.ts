import { Vault, TFile } from 'obsidian';
import matter from 'gray-matter';
import { BossBattleEngine } from './bossBattleEngine';
import {
    SkillBasedBoss,
    StatBasedMove,
    SkillTreeStats,
    PlayerStats,
    SkillBasedBattleState,
    BossStats,
    ProjectBossTemplate,
    BossBattleState
} from '../types/BossTypes';
import { PlayerData } from '../../../data/models/PlayerData';

/**
 * Enhanced battle engine that uses player stat levels for battle calculations
 * and CP values for skill progression only
 */
export class SkillBasedBattleEngine extends BossBattleEngine {

    /**
     * Read player stats from skill tree markdown files (CP values for progression)
     */
    static async readSkillTreeStats(vault: Vault): Promise<SkillTreeStats> {
        const stats: SkillTreeStats = {};

        try {
            const allFiles = vault.getFiles();

            // Find all stat files in SkillTree/Master-Class/Stats/
            for (const file of allFiles) {
                if (file instanceof TFile &&
                    file.path.startsWith('SkillTree/Master-Class/Stats/') &&
                    file.path.endsWith('.md')) {

                    try {
                        const content = await vault.read(file);
                        const { data } = matter(content);

                        if (data.name) {
                            stats[data.name] = {
                                name: data.name,
                                level: data.level || 1,
                                currentCP: data.currentCP || data.cp || 0,
                                requiredCP: data.requiredCP || data.maxCP || 100,
                                totalCP: data.totalCP || data.currentCP || data.cp || 0,
                                filePath: file.path
                            };
                        }
                    } catch (error) {
                        console.warn(`Failed to read stat file ${file.path}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to read skill tree stats:', error);
        }

        return stats;
    }

    /**
     * Convert SkillTreeStats to PlayerStats for battle calculations
     * Uses stat LEVELS, not CP values
     */
    static convertToPlayerStats(skillTreeStats: SkillTreeStats): PlayerStats {
        const playerStats: PlayerStats = {
            strength: 1,
            endurance: 1,
            focus: 1,
            intelligence: 1,
            creativity: 1,
            motivation: 1,
            patience: 1,
            agility: 1,
            charisma: 1
        };

        // Convert skill tree levels to battle stats
        const statMapping: Record<string, keyof PlayerStats> = {
            'Strength': 'strength',
            'strength': 'strength',
            'Endurance': 'endurance',
            'endurance': 'endurance',
            'Focus': 'focus',
            'focus': 'focus',
            'Intelligence': 'intelligence',
            'intelligence': 'intelligence',
            'Creativity': 'creativity',
            'creativity': 'creativity',
            'Motivation': 'motivation',
            'motivation': 'motivation',
            'Patience': 'patience',
            'patience': 'patience',
            'Agility': 'agility',
            'agility': 'agility',
            'Charisma': 'charisma',
            'charisma': 'charisma'
        };

        // Map skill tree stats to battle stats using LEVELS
        for (const [skillName, skillData] of Object.entries(skillTreeStats)) {
            const battleStatName = statMapping[skillName];
            if (battleStatName) {
                playerStats[battleStatName] = skillData.level;
            }
        }

        return playerStats;
    }

    /**
     * Get available moves based on player's actual stat LEVELS (not CP)
     */
    static getAvailableMoves(boss: SkillBasedBoss, playerStats: PlayerStats): StatBasedMove[] {
        return boss.statBasedMoves.filter(move => {
            // Check primary stat requirement (using LEVEL, not CP)
            const primaryStatValue = playerStats[move.statRequirements.primaryStat as keyof PlayerStats] || 0;
            if (primaryStatValue < move.statRequirements.primaryMinLevel) {
                return false;
            }

            // Check secondary stat requirement if exists
            if (move.statRequirements.secondaryStat && move.statRequirements.secondaryMinLevel) {
                const secondaryStatValue = playerStats[move.statRequirements.secondaryStat as keyof PlayerStats] || 0;
                if (secondaryStatValue < move.statRequirements.secondaryMinLevel) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Calculate move power with stat scaling based on player's stat LEVELS (not CP)
     */
    static calculateStatBasedDamage(
        move: StatBasedMove,
        playerStats: PlayerStats,
        bossStats: BossStats
    ): { basePower: number; statBonus: number; totalPower: number } {
        let basePower = move.power;

        // Get primary stat LEVEL (not CP)
        const statLevel = playerStats[move.statScaling.primaryStat as keyof PlayerStats] || 1;

        // Calculate stat bonus with scaling based on LEVEL
        const statBonus = Math.min(
            move.statScaling.maxBonus,
            Math.max(
                move.statScaling.minBonus,
                statLevel * move.statScaling.scalingFactor
            )
        );

        const totalPower = basePower + statBonus;

        return {
            basePower,
            statBonus,
            totalPower
        };
    }

    /**
     * Calculate final damage considering boss defense and accuracy
     */
    static calculateFinalDamage(
        move: StatBasedMove,
        playerStats: PlayerStats,
        bossStats: BossStats
    ): number {
        const { totalPower } = this.calculateStatBasedDamage(move, playerStats, bossStats);

        // Apply accuracy check
        const hitChance = move.accuracy / 100;
        if (Math.random() > hitChance) {
            return 0; // Miss
        }

        // Apply boss defense
        const defenseReduction = bossStats.defense * 0.1; // Each defense point reduces damage by 10%
        const finalDamage = Math.max(1, totalPower - defenseReduction);

        return Math.floor(finalDamage);
    }

    /**
     * Read skill data from skill tree markdown files
     */
    static async readSkillData(vault: Vault, skillName: string): Promise<any> {
        try {
            const allFiles = vault.getFiles();

            // Find skill file in SkillTree/Master-Class/Skills/
            for (const file of allFiles) {
                if (file instanceof TFile &&
                    file.path.startsWith('SkillTree/Master-Class/Skills/') &&
                    file.path.endsWith('.md')) {

                    try {
                        const content = await vault.read(file);
                        const { data } = matter(content);

                        if (data.name && data.name.toLowerCase() === skillName.toLowerCase()) {
                            return {
                                name: data.name,
                                level: data.level || 1,
                                currentCP: data.currentCP || data.cp || 0,
                                requiredCP: data.requiredCP || data.maxCP || 100,
                                totalCP: data.totalCP || data.currentCP || data.cp || 0,
                                filePath: file.path,
                                class: data.class,
                                stats: data.stats,
                                description: data.description
                            };
                        }
                    } catch (error) {
                        console.warn(`Failed to read skill file ${file.path}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to read skill data for ${skillName}:`, error);
        }

        return null;
    }

    /**
     * Process skill gains from using moves (CP progression)
     */
    static async processSkillGains(
        vault: Vault,
        move: StatBasedMove,
        boss: SkillBasedBoss
    ): Promise<void> {
        if (!move.skillEffects?.cpGain) return;

        try {
            // Read current skill data
            const skillData = await this.readSkillData(vault, boss.associatedSkill);
            if (!skillData) return;

            // Calculate new CP (progression system)
            const newCurrentCP = (skillData.currentCP || 0) + move.skillEffects.cpGain;
            const newTotalCP = (skillData.totalCP || 0) + move.skillEffects.cpGain;

            // Check for level up
            let newLevel = skillData.level || 1;
            let newRequiredCP = skillData.requiredCP || 100;

            if (newCurrentCP >= newRequiredCP) {
                newLevel++;
                newRequiredCP = Math.floor(newRequiredCP * 1.5); // Increase required CP for next level
            }

            // Update skill file
            const file = vault.getAbstractFileByPath(skillData.filePath);
            if (file instanceof TFile) {
                const content = await vault.read(file);
                const { data, content: markdownContent } = matter(content);

                // Update frontmatter
                data.level = newLevel;
                data.currentCP = newCurrentCP;
                data.requiredCP = newRequiredCP;
                data.totalCP = newTotalCP;
                data.cp = newCurrentCP; // For backwards compatibility

                // Write back to file
                const updatedContent = matter.stringify(markdownContent, data);
                await vault.modify(file, updatedContent);
            }
        } catch (error) {
            console.error('Failed to process skill gains:', error);
        }
    }

    /**
     * Initialize enhanced skill-based battle state
     */
    static async initializeSkillBasedBattle(
        vault: Vault,
        boss: SkillBasedBoss,
        playerData: PlayerData
    ): Promise<SkillBasedBattleState> {
        // Read player's actual stats from skill tree files (CP-based)
        const playerSkillStats = await this.readSkillTreeStats(vault);

        // Convert to battle stats (level-based)
        const playerBattleStats = this.convertToPlayerStats(playerSkillStats);

        // Get available moves based on player stats
        const availableMoves = this.getAvailableMoves(boss, playerBattleStats);

        // Calculate move power for each available move
        const moveCalculations: { [moveId: string]: any } = {};
        availableMoves.forEach(move => {
            const calculation = this.calculateStatBasedDamage(move, playerBattleStats, boss.stats);
            moveCalculations[move.name] = calculation;
        });

        // Create base battle state
        const baseBattleState: BossBattleState = {
            boss,
            playerStats: {
                currentHP: 100,
                maxHP: 100,
                attack: playerBattleStats.strength || 10,
                defense: playerBattleStats.endurance || 10,
                speed: playerBattleStats.agility || 10,
                specialAttack: playerBattleStats.focus || 10,
                specialDefense: playerBattleStats.intelligence || 10,
                buffs: [],
                debuffs: []
            },
            battleLog: [],
            currentTurn: 1,
            isPlayerTurn: true,
            gameOver: false,
            victory: false,
            timeRemaining: 7200, // 2 hours
            phaseTransition: false,
            specialEffects: [],
            comboCount: 0,
            bossMood: 'confident'
        };

        // Return enhanced battle state
        return {
            ...baseBattleState,
            playerSkillStats,
            playerBattleStats,
            availableMoves,
            moveCalculations,
            skillGains: {},
            activeStatBoosts: {}
        };
    }

    /**
     * Execute a stat-based move in battle
     */
    static async executeStatMove(
        vault: Vault,
        move: StatBasedMove,
        boss: SkillBasedBoss,
        battleState: SkillBasedBattleState
    ): Promise<{ damage: number; effects: string[]; skillGain: number }> {
        const effects: string[] = [];

        // Calculate damage using battle stats (levels, not CP)
        const damage = this.calculateFinalDamage(move, battleState.playerBattleStats, boss.stats);

        if (damage === 0) {
            effects.push(`${move.name} missed!`);
        } else {
            effects.push(`${move.name} deals ${damage} damage!`);
        }

        // Process skill effects
        let skillGain = 0;
        if (move.skillEffects) {
            skillGain = move.skillEffects.cpGain || 0;

            if (skillGain > 0) {
                effects.push(`+${skillGain} CP to ${boss.associatedSkill}!`);

                // Update skill gains tracking
                battleState.skillGains[boss.associatedSkill] =
                    (battleState.skillGains[boss.associatedSkill] || 0) + skillGain;
            }

            // Apply stat boost
            if (move.skillEffects.statBoost) {
                const boost = move.skillEffects.statBoost;
                battleState.activeStatBoosts[boost.stat] = {
                    amount: boost.amount,
                    turnsRemaining: boost.duration,
                    source: move.name
                };
                effects.push(`+${boost.amount} ${boost.stat} for ${boost.duration} turns!`);
            }
        }

        // Process skill gains to files (CP progression)
        await this.processSkillGains(vault, move, boss);

        return { damage, effects, skillGain };
    }

    /**
     * Update stat boosts at end of turn
     */
    static updateStatBoosts(battleState: SkillBasedBattleState): string[] {
        const messages: string[] = [];

        Object.keys(battleState.activeStatBoosts).forEach(statName => {
            const boost = battleState.activeStatBoosts[statName];
            boost.turnsRemaining--;

            if (boost.turnsRemaining <= 0) {
                messages.push(`${boost.source} stat boost on ${statName} has expired.`);
                delete battleState.activeStatBoosts[statName];
            }
        });

        return messages;
    }

    /**
     * Create stat-based moves for different skill types
     */
    static createStatBasedMoves(): { [category: string]: StatBasedMove[] } {
        return {
            strength: [
                {
                    name: 'Power Strike',
                    type: 'attack',
                    power: 25,
                    accuracy: 90,
                    description: 'A powerful physical attack that scales with strength',
                    statRequirements: {
                        primaryStat: 'strength',
                        primaryMinLevel: 1
                    },
                    statScaling: {
                        primaryStat: 'strength',
                        scalingFactor: 5,
                        maxBonus: 50,
                        minBonus: 0
                    },
                    moveCategory: 'strength',
                    skillEffects: {
                        cpGain: 2
                    }
                },
                {
                    name: 'Heavy Slam',
                    type: 'attack',
                    power: 40,
                    accuracy: 75,
                    description: 'A devastating strength-based attack with lower accuracy',
                    statRequirements: {
                        primaryStat: 'strength',
                        primaryMinLevel: 3
                    },
                    statScaling: {
                        primaryStat: 'strength',
                        scalingFactor: 8,
                        maxBonus: 80,
                        minBonus: 5
                    },
                    moveCategory: 'strength',
                    skillEffects: {
                        cpGain: 4
                    }
                }
            ],
            endurance: [
                {
                    name: 'Defensive Stance',
                    type: 'status',
                    power: 0,
                    accuracy: 100,
                    description: 'Increases defense and provides steady progress',
                    statRequirements: {
                        primaryStat: 'endurance',
                        primaryMinLevel: 1
                    },
                    statScaling: {
                        primaryStat: 'endurance',
                        scalingFactor: 2,
                        maxBonus: 20,
                        minBonus: 0
                    },
                    moveCategory: 'endurance',
                    skillEffects: {
                        cpGain: 3,
                        statBoost: {
                            stat: 'defense',
                            amount: 5,
                            duration: 3
                        }
                    }
                }
            ],
            focus: [
                {
                    name: 'Concentrated Strike',
                    type: 'attack',
                    power: 20,
                    accuracy: 95,
                    description: 'A precise attack that scales with focus',
                    statRequirements: {
                        primaryStat: 'focus',
                        primaryMinLevel: 1
                    },
                    statScaling: {
                        primaryStat: 'focus',
                        scalingFactor: 6,
                        maxBonus: 60,
                        minBonus: 0
                    },
                    moveCategory: 'focus',
                    skillEffects: {
                        cpGain: 3
                    }
                },
                {
                    name: 'Mind Blast',
                    type: 'special',
                    power: 35,
                    accuracy: 85,
                    description: 'A mental attack that ignores physical defense',
                    statRequirements: {
                        primaryStat: 'focus',
                        primaryMinLevel: 4
                    },
                    statScaling: {
                        primaryStat: 'focus',
                        scalingFactor: 7,
                        maxBonus: 70,
                        minBonus: 5
                    },
                    moveCategory: 'focus',
                    skillEffects: {
                        cpGain: 5
                    }
                }
            ],
            creativity: [
                {
                    name: 'Innovative Solution',
                    type: 'special',
                    power: 30,
                    accuracy: 80,
                    description: 'A creative approach that finds new ways to deal damage',
                    statRequirements: {
                        primaryStat: 'creativity',
                        primaryMinLevel: 2
                    },
                    statScaling: {
                        primaryStat: 'creativity',
                        scalingFactor: 7,
                        maxBonus: 60,
                        minBonus: 5
                    },
                    moveCategory: 'creativity',
                    skillEffects: {
                        cpGain: 4
                    }
                }
            ],
            intelligence: [
                {
                    name: 'Strategic Analysis',
                    type: 'special',
                    power: 15,
                    accuracy: 100,
                    description: 'Analyzes the opponent to find weaknesses',
                    statRequirements: {
                        primaryStat: 'intelligence',
                        primaryMinLevel: 1
                    },
                    statScaling: {
                        primaryStat: 'intelligence',
                        scalingFactor: 4,
                        maxBonus: 40,
                        minBonus: 0
                    },
                    moveCategory: 'intelligence',
                    skillEffects: {
                        cpGain: 2,
                        statBoost: {
                            stat: 'accuracy',
                            amount: 10,
                            duration: 5
                        }
                    }
                }
            ],
            motivation: [
                {
                    name: 'Inspiring Push',
                    type: 'status',
                    power: 10,
                    accuracy: 100,
                    description: 'Motivates yourself to keep going, providing steady damage',
                    statRequirements: {
                        primaryStat: 'motivation',
                        primaryMinLevel: 1
                    },
                    statScaling: {
                        primaryStat: 'motivation',
                        scalingFactor: 3,
                        maxBonus: 30,
                        minBonus: 0
                    },
                    moveCategory: 'motivation',
                    skillEffects: {
                        cpGain: 2
                    }
                }
            ],
            patience: [
                {
                    name: 'Persistent Effort',
                    type: 'status',
                    power: 5,
                    accuracy: 100,
                    description: 'Slow but steady progress that always hits',
                    statRequirements: {
                        primaryStat: 'patience',
                        primaryMinLevel: 1
                    },
                    statScaling: {
                        primaryStat: 'patience',
                        scalingFactor: 2,
                        maxBonus: 25,
                        minBonus: 0
                    },
                    moveCategory: 'patience',
                    skillEffects: {
                        cpGain: 1
                    }
                }
            ]
        };
    }
}