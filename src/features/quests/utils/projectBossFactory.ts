import { Vault } from 'obsidian';
import {
    SkillBasedBoss,
    StatBasedMove,
    ProjectBossTemplate,
    SkillTreeStats,
    PlayerStats,
    BossVisuals,
    BossDialogue,
    BossPhase
} from '../types/BossTypes';
import { SkillBasedBattleEngine } from './skillBasedBattleEngine';

/**
 * Factory for creating project-based bosses tied to specific skills and stats
 */
export class ProjectBossFactory {

    /**
     * Create a skill-based boss from a project type and duration
     */
    static async createProjectBoss(
        vault: Vault,
        projectType: string,
        skillName: string,
        duration: number, // in days
        playerStats?: SkillTreeStats
    ): Promise<SkillBasedBoss> {

        // Get project template
        const template = this.getProjectTemplate(projectType);

        // Read player stats if not provided
        const skillTreeStats = playerStats || await SkillBasedBattleEngine.readSkillTreeStats(vault);

        // Convert to battle stats for move generation
        const battleStats = SkillBasedBattleEngine.convertToPlayerStats(skillTreeStats);

        // Read skill data
        const skillData = await SkillBasedBattleEngine.readSkillData(vault, skillName);

        // Scale boss based on duration and player stats
        const scaling = this.calculateBossScaling(duration);
        const bossHP = this.calculateBossHP(duration, skillTreeStats, template);

        // Generate boss
        const boss: SkillBasedBoss = {
            // Base boss properties
            id: `${projectType}-${skillName}-${Date.now()}`,
            name: template.name,
            title: `${skillName} Master`,
            description: `A ${duration}-day ${projectType} challenge that will test your ${template.requiredStats.primary} and determination.`,

            // Skill-based properties
            associatedSkill: skillName,
            projectType: projectType as any,
            requiredStats: template.requiredStats,
            statBasedMoves: this.generateMovesForProject(template, battleStats),

            skillProgress: {
                currentLevel: skillData?.level || 1,
                currentCP: skillData?.currentCP || 0,
                requiredCP: skillData?.requiredCP || 100,
                totalCP: skillData?.totalCP || 0,
                milestones: this.generateMilestones(duration)
            },

            // Enhanced boss properties
            category: duration <= 7 ? 'single-session' : duration <= 30 ? 'multi-phase' : 'endurance',
            type: duration <= 7 ? 'mini-boss' : duration <= 30 ? 'boss' : 'epic-boss',

            // Visual and personality
            visuals: this.generateVisuals(template),
            dialogue: this.generateDialogue(template, skillName),

            // Core stats and mechanics
            stats: {
                maxHP: bossHP,
                currentHP: bossHP,
                attack: 50 + (duration * 2),
                defense: 30 + (duration * 1.5),
                speed: 40 + (duration * 1),
                specialAttack: 60 + (duration * 2.5),
                specialDefense: 35 + (duration * 2)
            },

            moves: [], // Legacy moves (we use statBasedMoves instead)
            questId: `${projectType}-quest-${Date.now()}`,
            questTitle: `${skillName} ${duration}-Day Challenge`,
            estimatedDuration: `${duration} days`,

            rewards: {
                cp: duration * 10,
                xp: duration * 15, // Legacy
                coins: duration * 25,
                materials: this.generateMaterials(template, duration),
                lifeItems: [],
                achievements: [`${skillName} ${duration}-Day Challenger`],
                titles: [`${skillName} Apprentice`],
                bossMaterials: [`${template.name} Essence`],
                unlockables: []
            },

            phases: this.generatePhases(duration, template),
            currentPhase: 0,
            isDefeated: false,
            createdAt: new Date(),

            difficulty: duration <= 7 ? 'easy' : duration <= 30 ? 'medium' : 'hard',
            theme: template.id,
            weaknesses: [template.requiredStats.secondary || 'motivation'],
            resistances: [template.requiredStats.primary],
            specialAbilities: [`${template.requiredStats.primary} Mastery`],
            lore: `Born from the collective will of all who seek to master ${skillName}, this boss embodies the challenges and growth that come with dedicated practice.`
        };

        return boss;
    }

    /**
     * Get project template based on type
     */
    private static getProjectTemplate(projectType: string): ProjectBossTemplate {
        const templates: Record<string, ProjectBossTemplate> = {
            fitness: {
                id: 'fitness',
                name: 'Iron Titan',
                projectType: 'fitness',
                associatedSkill: 'bodybuilding',
                requiredStats: {
                    primary: 'strength',
                    secondary: 'endurance',
                    tertiary: 'motivation'
                },
                availableMoves: {
                    strength: [],
                    endurance: [],
                    focus: [],
                    creativity: [],
                    intelligence: [],
                    motivation: [],
                    patience: []
                },
                scaling: {
                    shortTerm: 1.0,
                    mediumTerm: 1.5,
                    longTerm: 2.0
                }
            },
            learning: {
                id: 'learning',
                name: 'Knowledge Sage',
                projectType: 'learning',
                associatedSkill: 'programming',
                requiredStats: {
                    primary: 'focus',
                    secondary: 'intelligence',
                    tertiary: 'patience'
                },
                availableMoves: {
                    strength: [],
                    endurance: [],
                    focus: [],
                    creativity: [],
                    intelligence: [],
                    motivation: [],
                    patience: []
                },
                scaling: {
                    shortTerm: 1.0,
                    mediumTerm: 1.3,
                    longTerm: 1.8
                }
            },
            creative: {
                id: 'creative',
                name: 'Inspiration Muse',
                projectType: 'creative',
                associatedSkill: 'writing',
                requiredStats: {
                    primary: 'creativity',
                    secondary: 'focus',
                    tertiary: 'motivation'
                },
                availableMoves: {
                    strength: [],
                    endurance: [],
                    focus: [],
                    creativity: [],
                    intelligence: [],
                    motivation: [],
                    patience: []
                },
                scaling: {
                    shortTerm: 1.2,
                    mediumTerm: 1.4,
                    longTerm: 1.6
                }
            }
        };

        return templates[projectType] || templates.fitness;
    }

    /**
     * Generate stat-based moves for a project using STAT LEVELS (not CP)
     */
    private static generateMovesForProject(
        template: ProjectBossTemplate,
        playerStats: PlayerStats
    ): StatBasedMove[] {
        const moves: StatBasedMove[] = [];

        // Generate moves based on project type
        switch (template.projectType) {
            case 'fitness':
                moves.push(
                    {
                        name: 'Heavy Lift',
                        type: 'attack',
                        power: 25,
                        accuracy: 85,
                        description: 'A powerful lift that scales with your strength',
                        statRequirements: {
                            primaryStat: 'strength',
                            primaryMinLevel: 2 // LEVEL requirement, not CP
                        },
                        statScaling: {
                            primaryStat: 'strength',
                            scalingFactor: 8, // Scales with LEVEL
                            maxBonus: 100,
                            minBonus: 0
                        },
                        moveCategory: 'strength',
                        skillEffects: {
                            cpGain: 10 // CP gain for skill progression
                        }
                    },
                    {
                        name: 'Endurance Push',
                        type: 'attack',
                        power: 20,
                        accuracy: 90,
                        description: 'A sustained attack that uses your endurance',
                        statRequirements: {
                            primaryStat: 'endurance',
                            primaryMinLevel: 1 // LEVEL requirement
                        },
                        statScaling: {
                            primaryStat: 'endurance',
                            scalingFactor: 6, // Scales with LEVEL
                            maxBonus: 60,
                            minBonus: 0
                        },
                        moveCategory: 'endurance',
                        skillEffects: {
                            cpGain: 8
                        }
                    },
                    {
                        name: 'Motivation Surge',
                        type: 'special',
                        power: 15,
                        accuracy: 95,
                        description: 'Channel your motivation into a powerful attack',
                        statRequirements: {
                            primaryStat: 'motivation',
                            primaryMinLevel: 3 // LEVEL requirement
                        },
                        statScaling: {
                            primaryStat: 'motivation',
                            scalingFactor: 10, // Scales with LEVEL
                            maxBonus: 120,
                            minBonus: 0
                        },
                        moveCategory: 'motivation',
                        skillEffects: {
                            cpGain: 15
                        }
                    }
                );
                break;

            case 'learning':
                moves.push(
                    {
                        name: 'Deep Focus',
                        type: 'attack',
                        power: 30,
                        accuracy: 85,
                        description: 'Channel your focus into solving complex problems',
                        statRequirements: {
                            primaryStat: 'focus',
                            primaryMinLevel: 2 // LEVEL requirement
                        },
                        statScaling: {
                            primaryStat: 'focus',
                            scalingFactor: 9, // Scales with LEVEL
                            maxBonus: 90,
                            minBonus: 0
                        },
                        moveCategory: 'focus',
                        skillEffects: {
                            cpGain: 12
                        }
                    },
                    {
                        name: 'Knowledge Strike',
                        type: 'attack',
                        power: 25,
                        accuracy: 90,
                        description: 'Apply your accumulated knowledge strategically',
                        statRequirements: {
                            primaryStat: 'intelligence',
                            primaryMinLevel: 2 // LEVEL requirement
                        },
                        statScaling: {
                            primaryStat: 'intelligence',
                            scalingFactor: 8, // Scales with LEVEL
                            maxBonus: 80,
                            minBonus: 0
                        },
                        moveCategory: 'intelligence',
                        skillEffects: {
                            cpGain: 10
                        }
                    },
                    {
                        name: 'Patient Persistence',
                        type: 'status',
                        power: 10,
                        accuracy: 100,
                        description: 'Use patience to gradually overcome obstacles',
                        statRequirements: {
                            primaryStat: 'patience',
                            primaryMinLevel: 1 // LEVEL requirement
                        },
                        statScaling: {
                            primaryStat: 'patience',
                            scalingFactor: 3, // Scales with LEVEL
                            maxBonus: 30,
                            minBonus: 0
                        },
                        moveCategory: 'patience',
                        skillEffects: {
                            cpGain: 8
                        },
                        effect: {
                            type: 'heal',
                            target: 'self',
                            value: 15
                        }
                    }
                );
                break;

            case 'creative':
                moves.push(
                    {
                        name: 'Creative Burst',
                        type: 'attack',
                        power: 35,
                        accuracy: 80,
                        description: 'Unleash a burst of creative energy',
                        statRequirements: {
                            primaryStat: 'creativity',
                            primaryMinLevel: 3 // LEVEL requirement
                        },
                        statScaling: {
                            primaryStat: 'creativity',
                            scalingFactor: 11, // Scales with LEVEL
                            maxBonus: 110,
                            minBonus: 0
                        },
                        moveCategory: 'creativity',
                        skillEffects: {
                            cpGain: 15
                        }
                    },
                    {
                        name: 'Focused Creation',
                        type: 'attack',
                        power: 28,
                        accuracy: 88,
                        description: 'Combine focus and creativity for precise execution',
                        statRequirements: {
                            primaryStat: 'focus',
                            primaryMinLevel: 2, // LEVEL requirement
                            secondaryStat: 'creativity',
                            secondaryMinLevel: 2 // LEVEL requirement
                        },
                        statScaling: {
                            primaryStat: 'focus',
                            scalingFactor: 7, // Scales with LEVEL
                            maxBonus: 70,
                            minBonus: 0
                        },
                        moveCategory: 'focus',
                        skillEffects: {
                            cpGain: 12
                        }
                    }
                );
                break;
        }

        return moves;
    }

    /**
     * Calculate boss HP based on duration and player stats
     */
    private static calculateBossHP(
        duration: number,
        playerStats: SkillTreeStats,
        template: ProjectBossTemplate
    ): number {
        let baseHP = 100;

        // Scale by duration
        baseHP += duration * 15;

        // Scale by player's primary stat level to keep it challenging
        const primaryStat = playerStats[template.requiredStats.primary];
        if (primaryStat) {
            baseHP += primaryStat.level * 20; // Use LEVEL, not CP
        }

        // Apply template scaling
        const scaling = duration <= 7 ? template.scaling.shortTerm :
            duration <= 30 ? template.scaling.mediumTerm :
                template.scaling.longTerm;

        return Math.floor(baseHP * scaling);
    }

    /**
     * Calculate boss scaling factor
     */
    private static calculateBossScaling(duration: number): number {
        if (duration <= 7) return 1.0;
        if (duration <= 30) return 1.5;
        return 2.0;
    }

    /**
     * Generate boss visuals
     */
    private static generateVisuals(template: ProjectBossTemplate): BossVisuals {
        const visualMap: Record<string, BossVisuals> = {
            fitness: {
                avatar: '💪',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                phaseAvatars: ['💪', '🏋️', '🔥'],
                attackAnimations: ['flex', 'lift', 'strike'],
                defeatAnimation: 'collapse',
                victoryAnimation: 'flex'
            },
            learning: {
                avatar: '🧠',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                phaseAvatars: ['🧠', '📚', '⚡'],
                attackAnimations: ['think', 'analyze', 'solve'],
                defeatAnimation: 'fade',
                victoryAnimation: 'glow'
            },
            creative: {
                avatar: '🎨',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                phaseAvatars: ['🎨', '✨', '🌟'],
                attackAnimations: ['create', 'inspire', 'flow'],
                defeatAnimation: 'dissolve',
                victoryAnimation: 'sparkle'
            }
        };

        return visualMap[template.id] || visualMap.fitness;
    }

    /**
     * Generate boss dialogue
     */
    private static generateDialogue(template: ProjectBossTemplate, skillName: string): BossDialogue {
        const dialogueMap: Record<string, BossDialogue> = {
            fitness: {
                intro: [
                    `Welcome to the temple of strength!`,
                    `Your ${skillName} journey begins now!`,
                    `Show me your dedication!`
                ],
                taunts: [
                    `Is that all you've got?`,
                    `Your form needs work!`,
                    `Push harder!`
                ],
                phaseTransitions: [
                    `You're getting stronger...`,
                    `Time to increase the intensity!`,
                    `Final round - give it everything!`
                ],
                lowHP: [
                    `You've proven your strength...`,
                    `Impressive dedication!`
                ],
                victory: [
                    `You have mastered the challenge!`,
                    `Your strength is undeniable!`
                ],
                defeat: [
                    `Train harder and return!`,
                    `Strength comes with time...`
                ],
                counterAttack: [
                    `Feel the weight of resistance!`,
                    `This is true strength!`
                ],
                specialMove: [
                    `Behold the power of discipline!`,
                    `Maximum effort!`
                ]
            },
            learning: {
                intro: [
                    `Welcome to the realm of knowledge!`,
                    `Your ${skillName} mastery awaits!`,
                    `Show me your understanding!`
                ],
                taunts: [
                    `Think deeper!`,
                    `Your logic is flawed!`,
                    `Focus harder!`
                ],
                phaseTransitions: [
                    `Your knowledge grows...`,
                    `Time for advanced concepts!`,
                    `Final test - apply everything!`
                ],
                lowHP: [
                    `You've gained true wisdom...`,
                    `Impressive understanding!`
                ],
                victory: [
                    `You have achieved mastery!`,
                    `Your knowledge is complete!`
                ],
                defeat: [
                    `Study more and return!`,
                    `Knowledge comes with patience...`
                ],
                counterAttack: [
                    `Feel the weight of complexity!`,
                    `This is true understanding!`
                ],
                specialMove: [
                    `Behold the power of wisdom!`,
                    `Maximum insight!`
                ]
            },
            creative: {
                intro: [
                    `Welcome to the realm of creation!`,
                    `Your ${skillName} artistry begins!`,
                    `Show me your imagination!`
                ],
                taunts: [
                    `Is that your best idea?`,
                    `Think outside the box!`,
                    `Create something new!`
                ],
                phaseTransitions: [
                    `Your creativity flows...`,
                    `Time for innovative thinking!`,
                    `Final creation - make it unique!`
                ],
                lowHP: [
                    `You've unlocked true creativity...`,
                    `Impressive innovation!`
                ],
                victory: [
                    `You have mastered creation!`,
                    `Your creativity knows no bounds!`
                ],
                defeat: [
                    `Practice more and return!`,
                    `Creativity comes with time...`
                ],
                counterAttack: [
                    `Feel the power of inspiration!`,
                    `This is true artistry!`
                ],
                specialMove: [
                    `Behold the force of creation!`,
                    `Maximum inspiration!`
                ]
            }
        };

        return dialogueMap[template.id] || dialogueMap.fitness;
    }

    /**
     * Generate boss phases based on duration
     */
    private static generatePhases(duration: number, template: ProjectBossTemplate): BossPhase[] {
        const phases: BossPhase[] = [];

        if (duration <= 7) {
            // Single phase for short projects
            phases.push({
                name: 'Sprint Challenge',
                description: 'A focused burst of effort',
                hpThreshold: 100,
                moves: ['Basic Attack'],
                appearance: template.id,
                phaseNumber: 1,
                phaseColor: '#4CAF50',
                phaseTransition: 'The challenge begins!',
                bossDialogue: ['Let\'s see what you can do!']
            });
        } else if (duration <= 30) {
            // Three phases for medium projects
            phases.push(
                {
                    name: 'Foundation Building',
                    description: 'Establishing the basics',
                    hpThreshold: 100,
                    moves: ['Basic Attack'],
                    appearance: template.id,
                    phaseNumber: 1,
                    phaseColor: '#4CAF50',
                    phaseTransition: 'Building the foundation...',
                    bossDialogue: ['Every journey starts with a single step!']
                },
                {
                    name: 'Skill Development',
                    description: 'Growing and improving',
                    hpThreshold: 60,
                    moves: ['Basic Attack', 'Skill Attack'],
                    appearance: template.id,
                    phaseNumber: 2,
                    phaseColor: '#FF9800',
                    phaseTransition: 'Now we\'re getting serious!',
                    bossDialogue: ['Your skills are developing!']
                },
                {
                    name: 'Mastery Test',
                    description: 'The final challenge',
                    hpThreshold: 20,
                    moves: ['Basic Attack', 'Skill Attack', 'Ultimate Move'],
                    appearance: template.id,
                    phaseNumber: 3,
                    phaseColor: '#F44336',
                    phaseTransition: 'Time for the ultimate test!',
                    bossDialogue: ['Show me your mastery!']
                }
            );
        } else {
            // Multiple phases for long projects
            const phaseCount = Math.min(5, Math.ceil(duration / 10));
            for (let i = 0; i < phaseCount; i++) {
                phases.push({
                    name: `Phase ${i + 1}`,
                    description: `Stage ${i + 1} of your journey`,
                    hpThreshold: 100 - (i * (80 / phaseCount)),
                    moves: ['Basic Attack'],
                    appearance: template.id,
                    phaseNumber: i + 1,
                    phaseColor: i < 2 ? '#4CAF50' : i < 4 ? '#FF9800' : '#F44336',
                    phaseTransition: `Entering phase ${i + 1}...`,
                    bossDialogue: [`Phase ${i + 1} begins!`]
                });
            }
        }

        return phases;
    }

    /**
     * Generate milestone rewards
     */
    private static generateMilestones(duration: number) {
        const milestones = [];
        const milestoneInterval = Math.max(1, Math.floor(duration / 4));

        for (let i = 1; i <= 4; i++) {
            milestones.push({
                level: i,
                name: `Week ${i} Milestone`,
                description: `Completed ${i * milestoneInterval} days of training`,
                unlockedMoves: [`Level ${i} Move`],
                statBonuses: { primary: i * 5 },
                rewards: {
                    cp: i * 20,
                    coins: i * 50,
                    materials: [`Milestone ${i} Essence`]
                }
            });
        }

        return milestones;
    }

    /**
     * Generate materials based on template and duration
     */
    private static generateMaterials(template: ProjectBossTemplate, duration: number) {
        const baseMaterials: Record<string, string[]> = {
            fitness: ['Iron Shard', 'Protein Crystal', 'Endurance Gem'],
            learning: ['Knowledge Fragment', 'Focus Crystal', 'Wisdom Shard'],
            creative: ['Inspiration Spark', 'Creative Essence', 'Innovation Core']
        };

        const materials = baseMaterials[template.id] || baseMaterials.fitness;

        return materials.map((name: string, index: number) => ({
            name,
            quantity: Math.ceil(duration / (index + 1)),
            rarity: index === 0 ? 'common' as const : index === 1 ? 'uncommon' as const : 'rare' as const
        }));
    }
}