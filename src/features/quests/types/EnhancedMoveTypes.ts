import { StatBasedMove, PlayerStats } from './BossTypes';

/**
 * Enhanced move system with strategic depth
 */

export interface EnhancedMove extends StatBasedMove {
    // Cooldown system
    cooldown: number; // Turns before move can be used again
    lastUsedTurn?: number; // Track when move was last used

    // Move categories for strategic play
    category: MoveCategory;

    // Enhanced effects
    effects: MoveEffect[];

    // Combo potential
    comboRequirements?: ComboRequirement[];
    comboEffects?: ComboEffect[];

    // Unlocking conditions
    unlockConditions: UnlockCondition[];
    isUnlocked?: boolean;

    // Animation and visual effects
    animation?: MoveAnimation;

    // Strategic metadata
    priority: number; // Higher priority moves go first in turn order
    canTargetSelf?: boolean;
    canTargetBoss?: boolean;
    requiresPreparation?: boolean; // Multi-turn moves
}

export type MoveCategory =
    | 'attack'      // Direct damage moves
    | 'buff'        // Self-enhancement moves
    | 'debuff'      // Boss weakening moves
    | 'utility'     // Special utility moves
    | 'combo'       // Combo starter/finisher moves
    | 'ultimate';   // High-power, high-cooldown moves

export interface MoveEffect {
    type: EffectType;
    target: 'self' | 'boss' | 'both';
    duration: number; // Turns the effect lasts
    magnitude: number; // Strength of the effect
    chance: number; // Probability of effect occurring (0-100)
    stackable?: boolean; // Can multiple instances stack?
}

export type EffectType =
    | 'damage'
    | 'heal'
    | 'stat_boost'     // Temporary stat increase
    | 'stat_reduction' // Temporary stat decrease
    | 'shield'         // Damage absorption
    | 'poison'         // Damage over time
    | 'regeneration'   // Healing over time
    | 'stun'          // Skip turns
    | 'counter'       // Reflect damage
    | 'critical_boost' // Increase crit chance
    | 'accuracy_boost' // Increase hit chance
    | 'vulnerability'; // Take more damage

export interface ComboRequirement {
    previousMoves: string[]; // Names of moves that must be used before this
    maxTurnGap: number; // Maximum turns between combo moves
    requiredEffects?: EffectType[]; // Required active effects
}

export interface ComboEffect {
    name: string;
    description: string;
    effects: MoveEffect[];
    animation?: string;
}

export interface UnlockCondition {
    type: 'skill_level' | 'total_cp' | 'battles_won' | 'moves_used' | 'damage_dealt';
    requirement: number;
    skillName?: string; // For skill_level type
    moveNames?: string[]; // For moves_used type
}

export interface MoveAnimation {
    name: string;
    duration: number; // milliseconds
    effects: AnimationEffect[];
}

export interface AnimationEffect {
    type: 'shake' | 'flash' | 'glow' | 'particle' | 'zoom' | 'rotate';
    target: 'user' | 'opponent' | 'screen';
    intensity: number;
    color?: string;
}

// Battle state tracking for enhanced moves
export interface EnhancedBattleState {
    currentTurn: number;
    activeEffects: Map<string, ActiveEffect[]>; // key: target ('player' | 'boss')
    moveHistory: MoveHistoryEntry[];
    comboChain: string[]; // Current combo chain
    lastComboTurn: number;
    availableMoves: EnhancedMove[];

    // Turn-based tracking
    playerActionThisTurn: boolean;
    bossActionThisTurn: boolean;

    // Buff/debuff tracking
    playerBuffs: ActiveEffect[];
    bossDebuffs: ActiveEffect[];

    // Strategic state
    playerPreparingMove?: string; // Multi-turn move being prepared
    bossNextAction?: BossAction; // AI-determined next action
}

export interface ActiveEffect {
    id: string;
    name: string;
    type: EffectType;
    magnitude: number;
    remainingTurns: number;
    source: string; // Move that created this effect
    stackCount: number;
    appliedTurn: number;
}

export interface MoveHistoryEntry {
    turn: number;
    moveName: string;
    user: 'player' | 'boss';
    damage?: number;
    effects?: string[];
    wasCombo: boolean;
    wasCritical: boolean;
}

// Boss AI system
export interface BossAction {
    type: 'attack' | 'counter' | 'buff' | 'special';
    moveName: string;
    reasoning: string; // Why the boss chose this action
    targetEffects?: EffectType[];
}

export interface BossAI {
    personality: BossPersonality;
    adaptationLevel: number; // How well boss learns from player patterns
    movePreferences: Record<MoveCategory, number>; // Preference weights
    reactionRules: ReactionRule[];
}

export type BossPersonality =
    | 'aggressive'   // Prefers high-damage attacks
    | 'defensive'    // Uses buffs and shields
    | 'tactical'     // Adapts to player strategy
    | 'chaotic'      // Random, unpredictable
    | 'counter'      // Reacts to player moves
    | 'endurance';   // Focuses on long battles

export interface ReactionRule {
    trigger: {
        playerMoveCategory?: MoveCategory;
        playerEffectCount?: number;
        bossHealthPercent?: number;
        turnNumber?: number;
    };
    response: {
        preferredMoves: string[];
        avoidMoves: string[];
        priorityBonus: number;
    };
}

// Enhanced move calculations
export interface EnhancedMoveCalculation {
    baseDamage: number;
    statBonus: number;
    comboBonus: number;
    effectBonus: number;
    criticalMultiplier: number;
    finalDamage: number;

    // Effect calculations
    effectsApplied: MoveEffect[];
    effectsResisted: MoveEffect[];

    // Combo information
    isComboMove: boolean;
    comboChainLength: number;
    comboName?: string;

    // Animation data
    animation?: MoveAnimation;

    // Strategic info
    cooldownAfter: number;
    cpGained: number;
    nextAvailableTurn: number;
}

// Move progression system
export interface MoveProgression {
    moveId: string;
    timesUsed: number;
    totalDamageDealt: number;
    successfulCombos: number;

    // Mastery levels
    masteryLevel: number; // 0-5
    masteryBonuses: MasteryBonus[];
}

export interface MasteryBonus {
    level: number;
    name: string;
    description: string;
    effect: {
        type: 'damage' | 'cooldown' | 'accuracy' | 'effect_chance' | 'new_effect';
        value: number;
        newEffect?: MoveEffect;
    };
}

// Combat flow control
export interface CombatPhase {
    name: string;
    turnRange: [number, number]; // [start, end] turns
    specialRules?: SpecialRule[];
    bossModifications?: BossModification[];
    unlockMoves?: string[];
}

export interface SpecialRule {
    name: string;
    description: string;
    effect: (battleState: EnhancedBattleState) => void;
}

export interface BossModification {
    type: 'stat_change' | 'new_moves' | 'behavior_change' | 'vulnerability';
    value: number | string | string[];
    description: string;
}
