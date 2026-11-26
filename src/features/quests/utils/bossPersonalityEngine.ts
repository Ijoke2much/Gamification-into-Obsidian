import {
    BossPersonality,
    BossAI,
    EnhancedBattleState,
    EnhancedMove,
    BossAction,
    ReactionRule,
    MoveCategory
} from '../types/EnhancedMoveTypes';
import { Boss, PlayerStats } from '../types/BossTypes';

/**
 * Boss AI Personality Engine
 * Creates unique, adaptive AI behaviors for each boss personality type
 */
export class BossPersonalityEngine {
    private static personalityData: Map<BossPersonality, PersonalityProfile> = new Map();
    private static battleMemory: Map<string, BattleMemory> = new Map();

    static {
        this.initializePersonalities();
    }

    /**
     * Generate AI response based on boss personality
     */
    static generatePersonalityResponse(
        boss: Boss,
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState,
        healthPercent: number
    ): BossAction {
        const personality = boss.ai?.personality || 'aggressive';
        const profile = this.personalityData.get(personality);

        if (!profile) {
            return this.generateFallbackResponse(healthPercent, playerMove);
        }

        // Update battle memory for learning
        this.updateBattleMemory(boss.id, playerMove, battleState);

        // Get personality-specific response
        const response = this.getPersonalityResponse(
            personality,
            profile,
            playerMove,
            battleState,
            healthPercent,
            boss.id
        );

        // Add personality-specific dialogue
        response.dialogue = this.generatePersonalityDialogue(personality, response, healthPercent);

        return response;
    }

    /**
     * Get response based on specific personality type
     */
    private static getPersonalityResponse(
        personality: BossPersonality,
        profile: PersonalityProfile,
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState,
        healthPercent: number,
        bossId: string
    ): BossAction {
        const memory = this.battleMemory.get(bossId);

        switch (personality) {
            case 'aggressive':
                return this.generateAggressiveResponse(profile, playerMove, battleState, healthPercent, memory);

            case 'defensive':
                return this.generateDefensiveResponse(profile, playerMove, battleState, healthPercent, memory);

            case 'tactical':
                return this.generateTacticalResponse(profile, playerMove, battleState, healthPercent, memory);

            case 'chaotic':
                return this.generateChaoticResponse(profile, playerMove, battleState, healthPercent, memory);

            case 'counter':
                return this.generateCounterResponse(profile, playerMove, battleState, healthPercent, memory);

            case 'endurance':
                return this.generateEnduranceResponse(profile, playerMove, battleState, healthPercent, memory);

            default:
                return this.generateFallbackResponse(healthPercent, playerMove);
        }
    }

    /**
     * AGGRESSIVE: High-damage focused, counters buffs aggressively
     */
    private static generateAggressiveResponse(
        profile: PersonalityProfile,
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState,
        healthPercent: number,
        memory?: BattleMemory
    ): BossAction {
        // Aggressive bosses HATE buffs and counter them immediately
        if (playerMove.category === 'buff') {
            return {
                type: 'counter',
                moveName: 'Rage Dispel',
                reasoning: 'Aggressive boss cannot tolerate player buffs',
                targetEffects: ['stat_reduction', 'damage'],
                priority: 3, // High priority counter
                damageMultiplier: 1.4 // 40% more damage when angry
            };
        }

        // Aggressive bosses get more dangerous at low health
        if (healthPercent < 30) {
            return {
                type: 'special',
                moveName: 'Berserker Fury',
                reasoning: 'Aggressive boss enters berserk mode at low health',
                targetEffects: ['damage', 'critical_boost'],
                priority: 4,
                damageMultiplier: 1.6
            };
        }

        // Normal aggressive behavior - high damage attacks
        if (playerMove.category === 'attack' && playerMove.power > 30) {
            return {
                type: 'attack',
                moveName: 'Crushing Blow',
                reasoning: 'Aggressive boss responds to player attacks with overwhelming force',
                targetEffects: ['damage'],
                priority: 2,
                damageMultiplier: 1.3
            };
        }

        // Default aggressive move
        return {
            type: 'attack',
            moveName: 'Relentless Strike',
            reasoning: 'Aggressive boss prefers constant offensive pressure',
            targetEffects: ['damage'],
            priority: 2,
            damageMultiplier: 1.2
        };
    }

    /**
     * DEFENSIVE: Shield and buff focused, survives through protection
     */
    private static generateDefensiveResponse(
        profile: PersonalityProfile,
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState,
        healthPercent: number,
        memory?: BattleMemory
    ): BossAction {
        // Defensive bosses shield against high damage
        if (playerMove.category === 'attack' && playerMove.power > 40) {
            return {
                type: 'buff',
                moveName: 'Guardian Shield',
                reasoning: 'Defensive boss protects against heavy attacks',
                targetEffects: ['shield', 'stat_boost'],
                priority: 3,
                duration: 3
            };
        }

        // Defensive bosses buff themselves frequently
        if (battleState.bossDebuffs.length > 0) {
            return {
                type: 'buff',
                moveName: 'Purifying Light',
                reasoning: 'Defensive boss cleanses debuffs and strengthens defenses',
                targetEffects: ['stat_boost', 'heal'],
                priority: 2,
                duration: 2
            };
        }

        // At low health, defensive bosses turtle up
        if (healthPercent < 40) {
            return {
                type: 'buff',
                moveName: 'Fortress Mode',
                reasoning: 'Defensive boss enters maximum protection mode',
                targetEffects: ['shield', 'stat_boost', 'regeneration'],
                priority: 4,
                duration: 4
            };
        }

        // Default defensive behavior
        return {
            type: 'buff',
            moveName: 'Steady Defense',
            reasoning: 'Defensive boss maintains protective stance',
            targetEffects: ['stat_boost'],
            priority: 1,
            duration: 2
        };
    }

    /**
     * TACTICAL: Learns patterns and adapts strategy
     */
    private static generateTacticalResponse(
        profile: PersonalityProfile,
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState,
        healthPercent: number,
        memory?: BattleMemory
    ): BossAction {
        if (!memory) {
            return this.generateFallbackResponse(healthPercent, playerMove);
        }

        // Tactical bosses learn from frequently used moves
        const mostUsedMoveCategory = this.getMostUsedMoveCategory(memory);
        const playerComboCount = battleState.comboChain.length;

        // Counter frequently used move types
        if (mostUsedMoveCategory && memory.moveCategoryCounts[mostUsedMoveCategory] >= 3) {
            return {
                type: 'counter',
                moveName: `Adaptive Counter`,
                reasoning: `Tactical boss learned to counter ${mostUsedMoveCategory} moves`,
                targetEffects: ['stat_reduction', 'damage'],
                priority: 3,
                adaptation: mostUsedMoveCategory
            };
        }

        // Disrupt combo chains
        if (playerComboCount >= 2) {
            return {
                type: 'special',
                moveName: 'Pattern Breaker',
                reasoning: 'Tactical boss disrupts player combo chains',
                targetEffects: ['stun', 'stat_reduction'],
                priority: 4
            };
        }

        // Adapt to player's preferred strategy
        if (battleState.playerBuffs.length > 2) {
            return {
                type: 'counter',
                moveName: 'Strategic Dispel',
                reasoning: 'Tactical boss identified buff-heavy strategy and counters',
                targetEffects: ['stat_reduction'],
                priority: 3
            };
        }

        // Default tactical behavior - analyze and prepare
        return {
            type: 'buff',
            moveName: 'Battle Analysis',
            reasoning: 'Tactical boss studies player patterns while buffing',
            targetEffects: ['stat_boost', 'accuracy_boost'],
            priority: 2,
            duration: 2
        };
    }

    /**
     * CHAOTIC: Random, unpredictable behavior
     */
    private static generateChaoticResponse(
        profile: PersonalityProfile,
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState,
        healthPercent: number,
        memory?: BattleMemory
    ): BossAction {
        const randomMoves: BossAction[] = [
            {
                type: 'attack',
                moveName: 'Wild Strike',
                reasoning: 'Chaotic boss attacks unpredictably',
                targetEffects: ['damage'],
                damageMultiplier: Math.random() * 1.5 + 0.5 // 0.5x to 2.0x damage
            },
            {
                type: 'buff',
                moveName: 'Chaos Blessing',
                reasoning: 'Chaotic boss randomly enhances abilities',
                targetEffects: ['stat_boost', 'critical_boost'],
                duration: Math.floor(Math.random() * 4) + 1
            },
            {
                type: 'special',
                moveName: 'Reality Warp',
                reasoning: 'Chaotic boss bends the rules of combat',
                targetEffects: ['damage', 'stun', 'stat_boost'],
                priority: Math.floor(Math.random() * 5) + 1
            },
            {
                type: 'counter',
                moveName: 'Paradox Response',
                reasoning: 'Chaotic boss does the unexpected',
                targetEffects: ['stat_reduction'],
                priority: 2
            }
        ];

        // Extra chaos at low health
        if (healthPercent < 25) {
            randomMoves.push({
                type: 'special',
                moveName: 'Desperate Chaos',
                reasoning: 'Chaotic boss becomes completely unpredictable',
                targetEffects: ['damage', 'stun'],
                priority: 5
            });
        }

        const selectedMove = randomMoves[Math.floor(Math.random() * randomMoves.length)];
        return selectedMove;
    }

    /**
     * COUNTER: Reacts specifically to player moves
     */
    private static generateCounterResponse(
        profile: PersonalityProfile,
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState,
        healthPercent: number,
        memory?: BattleMemory
    ): BossAction {
        // Perfect counters for each move category
        const counterMap: Record<MoveCategory, BossAction> = {
            'attack': {
                type: 'buff',
                moveName: 'Reflective Armor',
                reasoning: 'Counter boss reflects attack damage back',
                targetEffects: ['shield', 'counter'],
                priority: 3,
                duration: 2
            },
            'buff': {
                type: 'counter',
                moveName: 'Nullify Enhancement',
                reasoning: 'Counter boss neutralizes player buffs',
                targetEffects: ['stat_reduction'],
                priority: 4
            },
            'debuff': {
                type: 'buff',
                moveName: 'Cleansing Surge',
                reasoning: 'Counter boss purifies and strengthens',
                targetEffects: ['stat_boost', 'heal'],
                priority: 3,
                duration: 3
            },
            'utility': {
                type: 'special',
                moveName: 'Utility Disruption',
                reasoning: 'Counter boss disrupts utility effects',
                targetEffects: ['stun', 'stat_reduction'],
                priority: 3
            },
            'combo': {
                type: 'special',
                moveName: 'Chain Breaker',
                reasoning: 'Counter boss shatters combo chains',
                targetEffects: ['stun', 'damage'],
                priority: 5
            },
            'ultimate': {
                type: 'special',
                moveName: 'Ultimate Counter',
                reasoning: 'Counter boss responds to ultimate with devastating counter',
                targetEffects: ['damage', 'stun', 'vulnerability'],
                priority: 6,
                damageMultiplier: 1.8
            }
        };

        return counterMap[playerMove.category] || {
            type: 'attack',
            moveName: 'Perfect Counter',
            reasoning: 'Counter boss adapts to any situation',
            targetEffects: ['damage'],
            priority: 2
        };
    }

    /**
     * ENDURANCE: Focuses on long battles and gradual advantages
     */
    private static generateEnduranceResponse(
        profile: PersonalityProfile,
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState,
        healthPercent: number,
        memory?: BattleMemory
    ): BossAction {
        const turnNumber = battleState.currentTurn;

        // Endurance bosses get stronger over time
        if (turnNumber > 10) {
            return {
                type: 'buff',
                moveName: 'Marathon Conditioning',
                reasoning: 'Endurance boss grows stronger in long battles',
                targetEffects: ['stat_boost', 'regeneration'],
                priority: 2,
                duration: turnNumber, // Longer effect as battle progresses
                damageMultiplier: 1 + (turnNumber * 0.1) // 10% more power per 10 turns
            };
        }

        // Apply gradual pressure
        if (playerMove.category === 'attack') {
            return {
                type: 'buff',
                moveName: 'Gradual Buildup',
                reasoning: 'Endurance boss slowly builds power while absorbing attacks',
                targetEffects: ['stat_boost', 'shield'],
                priority: 1,
                duration: 5
            };
        }

        // Patience and persistence
        if (battleState.playerBuffs.length > 0) {
            return {
                type: 'special',
                moveName: 'Patient Observation',
                reasoning: 'Endurance boss waits for the right moment to strike',
                targetEffects: ['accuracy_boost', 'critical_boost'],
                priority: 1,
                duration: 3
            };
        }

        // Default endurance behavior
        return {
            type: 'buff',
            moveName: 'Steady Persistence',
            reasoning: 'Endurance boss maintains consistent preparation',
            targetEffects: ['stat_boost'],
            priority: 1,
            duration: 4
        };
    }

    /**
     * Initialize personality profiles
     */
    private static initializePersonalities(): void {
        this.personalityData.set('aggressive', {
            name: 'The Berserker',
            description: 'Overwhelms with raw power and fury',
            baseAggressiveness: 0.9,
            adaptationRate: 0.3,
            preferredMoves: ['attack'],
            avoidedMoves: ['buff', 'utility'],
            specialTraits: ['high_damage', 'buff_hatred', 'low_health_rage'],
            dialogueStyle: 'aggressive'
        });

        this.personalityData.set('defensive', {
            name: 'The Guardian',
            description: 'Protects through shields and endurance',
            baseAggressiveness: 0.2,
            adaptationRate: 0.4,
            preferredMoves: ['buff'],
            avoidedMoves: ['attack'],
            specialTraits: ['shield_master', 'damage_reduction', 'healing'],
            dialogueStyle: 'calm'
        });

        this.personalityData.set('tactical', {
            name: 'The Strategist',
            description: 'Adapts and learns from every encounter',
            baseAggressiveness: 0.6,
            adaptationRate: 0.8,
            preferredMoves: ['buff', 'debuff'],
            avoidedMoves: [],
            specialTraits: ['pattern_learning', 'adaptive_counters', 'strategy_evolution'],
            dialogueStyle: 'analytical'
        });

        this.personalityData.set('chaotic', {
            name: 'The Wildcard',
            description: 'Unpredictable and reality-bending',
            baseAggressiveness: 0.5,
            adaptationRate: 0.1,
            preferredMoves: [],
            avoidedMoves: [],
            specialTraits: ['randomness', 'unpredictability', 'reality_warp'],
            dialogueStyle: 'chaotic'
        });

        this.personalityData.set('counter', {
            name: 'The Mirror',
            description: 'Perfect responses to every action',
            baseAggressiveness: 0.7,
            adaptationRate: 0.6,
            preferredMoves: ['debuff'],
            avoidedMoves: [],
            specialTraits: ['perfect_counters', 'reactive_behavior', 'adaptation'],
            dialogueStyle: 'reactive'
        });

        this.personalityData.set('endurance', {
            name: 'The Marathon Runner',
            description: 'Grows stronger with time and patience',
            baseAggressiveness: 0.3,
            adaptationRate: 0.5,
            preferredMoves: ['buff'],
            avoidedMoves: ['ultimate'],
            specialTraits: ['time_scaling', 'gradual_power', 'patience'],
            dialogueStyle: 'patient'
        });
    }

    /**
     * Generate personality-specific dialogue
     */
    private static generatePersonalityDialogue(
        personality: BossPersonality,
        action: BossAction,
        healthPercent: number
    ): string {
        const dialogueMap: Record<BossPersonality, string[]> = {
            'aggressive': [
                "Feel my wrath!",
                "I'll crush you with overwhelming force!",
                "Your defenses mean nothing to me!",
                "Rage consumes all!",
                healthPercent < 30 ? "I'll drag you down with me!" : "Submit to superior power!"
            ],
            'defensive': [
                "Patience is the strongest shield.",
                "Your attacks cannot break my resolve.",
                "Protection through preparation.",
                "I will outlast your fury.",
                healthPercent < 30 ? "Even wounded, I stand firm." : "My defenses grow stronger."
            ],
            'tactical': [
                "I see your strategy clearly now.",
                "Adapting my approach based on your patterns.",
                "Every move teaches me something new.",
                "Your predictability is your weakness.",
                "Strategy evolves with each encounter."
            ],
            'chaotic': [
                "Reality bends to my whim!",
                "Let chaos decide our fate!",
                "Order is an illusion!",
                "Embrace the madness!",
                "Nothing is certain in chaos!"
            ],
            'counter': [
                "For every action, a perfect reaction.",
                "Your move was anticipated.",
                "I mirror your intentions.",
                "Balance must be maintained.",
                "Every strategy has its counter."
            ],
            'endurance': [
                "Time is my greatest ally.",
                "Slow and steady wins the battle.",
                "I grow stronger with each moment.",
                "Patience rewards the persistent.",
                "The marathon is far from over."
            ]
        };

        const dialogues = dialogueMap[personality];
        return dialogues[Math.floor(Math.random() * dialogues.length)];
    }

    /**
     * Update battle memory for learning AI
     */
    private static updateBattleMemory(
        bossId: string,
        playerMove: EnhancedMove,
        battleState: EnhancedBattleState
    ): void {
        if (!this.battleMemory.has(bossId)) {
            this.battleMemory.set(bossId, {
                moveCategoryCounts: {},
                comboPatterns: [],
                buffUsageCount: 0,
                totalTurns: 0,
                damageDealt: 0,
                lastMoves: []
            });
        }

        const memory = this.battleMemory.get(bossId)!;

        // Update move category counts
        memory.moveCategoryCounts[playerMove.category] =
            (memory.moveCategoryCounts[playerMove.category] || 0) + 1;

        // Track recent moves for pattern recognition
        memory.lastMoves.push(playerMove.name);
        if (memory.lastMoves.length > 5) {
            memory.lastMoves.shift();
        }

        // Track buff usage
        if (playerMove.category === 'buff') {
            memory.buffUsageCount++;
        }

        // Update turn count
        memory.totalTurns = battleState.currentTurn;
    }

    /**
     * Get most frequently used move category
     */
    private static getMostUsedMoveCategory(memory: BattleMemory): MoveCategory | null {
        let maxCount = 0;
        let mostUsed: MoveCategory | null = null;

        for (const [category, count] of Object.entries(memory.moveCategoryCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostUsed = category as MoveCategory;
            }
        }

        return mostUsed;
    }

    /**
     * Fallback response for unknown personalities
     */
    private static generateFallbackResponse(healthPercent: number, playerMove: EnhancedMove): BossAction {
        if (healthPercent < 25) {
            return {
                type: 'special',
                moveName: 'Desperate Strike',
                reasoning: 'Boss uses desperate attack at low health',
                targetEffects: ['damage'],
                priority: 3
            };
        }

        return {
            type: 'attack',
            moveName: 'Basic Attack',
            reasoning: 'Standard boss response',
            targetEffects: ['damage'],
            priority: 1
        };
    }

    /**
     * Assign personality to boss during creation
     */
    static assignPersonality(boss: Boss, suggestedPersonality?: BossPersonality): Boss {
        const personality = suggestedPersonality || this.generateRandomPersonality();
        const profile = this.personalityData.get(personality);

        if (!profile) {
            return boss;
        }

        boss.ai = {
            personality,
            adaptationLevel: profile.adaptationRate,
            movePreferences: this.createMovePreferences(profile),
            reactionRules: this.createReactionRules(profile)
        };

        // Add personality info to boss
        boss.personalityInfo = {
            name: profile.name,
            description: profile.description,
            traits: profile.specialTraits
        };

        return boss;
    }

    /**
     * Generate random personality based on boss type/theme
     */
    private static generateRandomPersonality(): BossPersonality {
        const personalities: BossPersonality[] = [
            'aggressive', 'defensive', 'tactical', 'chaotic', 'counter', 'endurance'
        ];
        return personalities[Math.floor(Math.random() * personalities.length)];
    }

    /**
     * Create move preferences based on personality
     */
    private static createMovePreferences(profile: PersonalityProfile): Record<MoveCategory, number> {
        const preferences: Record<MoveCategory, number> = {
            'attack': 0.4,
            'buff': 0.2,
            'debuff': 0.1,
            'utility': 0.1,
            'combo': 0.1,
            'ultimate': 0.1
        };

        // Boost preferred moves
        profile.preferredMoves.forEach(move => {
            preferences[move] = Math.min(0.8, preferences[move] + 0.3);
        });

        // Reduce avoided moves
        profile.avoidedMoves.forEach(move => {
            preferences[move] = Math.max(0.05, preferences[move] - 0.2);
        });

        return preferences;
    }

    /**
     * Create reaction rules based on personality
     */
    private static createReactionRules(profile: PersonalityProfile): ReactionRule[] {
        // Basic reaction rules that all personalities share
        return [
            {
                trigger: { bossHealthPercent: 25 },
                response: {
                    preferredMoves: ['special', 'ultimate'],
                    avoidMoves: ['utility'],
                    priorityBonus: 2
                }
            }
        ];
    }
}

// Supporting interfaces
interface PersonalityProfile {
    name: string;
    description: string;
    baseAggressiveness: number;
    adaptationRate: number;
    preferredMoves: MoveCategory[];
    avoidedMoves: MoveCategory[];
    specialTraits: string[];
    dialogueStyle: string;
}

interface BattleMemory {
    moveCategoryCounts: Record<string, number>;
    comboPatterns: string[];
    buffUsageCount: number;
    totalTurns: number;
    damageDealt: number;
    lastMoves: string[];
}

// Extend BossAction interface for personality features
declare module '../types/EnhancedMoveTypes' {
    interface BossAction {
        dialogue?: string;
        priority?: number;
        damageMultiplier?: number;
        duration?: number;
        adaptation?: string;
    }
}
