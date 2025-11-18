export interface BossStats {
    maxHP: number;
    currentHP: number;
    attack: number;
    defense: number;
    speed: number;
    specialAttack: number;
    specialDefense: number;
}

export interface BossMove {
    name: string;
    type: 'attack' | 'status' | 'special';
    power: number;
    accuracy: number;
    description: string;
    effect?: {
        type: 'buff' | 'debuff' | 'heal' | 'damage';
        target: 'self' | 'player';
        value: number;
        duration?: number;
    };
    cooldown?: number;
    lastUsed?: number;
}

export interface BossPhase {
    name: string;
    description: string;
    hpThreshold: number;
    moves: string[]; // move IDs available in this phase
    appearance: string;
    specialEffects?: string[];

    // Enhanced phase properties
    phaseNumber: number;
    phaseColor: string;
    phaseTransition: string;
    bossDialogue: string[];
}

export interface BossRewards {
    xp: number;
    cp: number;
    coins: number;
    materials: Array<{
        name: string;
        quantity: number;
        rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    }>;
    lifeItems: Array<{
        name: string;
        description: string;
        type: 'entertainment' | 'relaxation' | 'productivity' | 'luxury';
        value: number;
    }>;
    achievements: string[];

    // Enhanced reward properties
    titles: string[];
    bossMaterials: string[];
    unlockables: string[];
}

export interface Boss {
    id: string;
    name: string;
    title: string; // e.g., "The Procrastination Dragon"
    description: string;
    image?: string;

    // Enhanced boss properties
    category: BossCategory;
    type: 'mini-boss' | 'boss' | 'epic-boss' | 'legendary-boss';

    // Visual and personality system
    visuals: BossVisuals;
    dialogue: BossDialogue;

    // AI Personality System
    ai?: import('./EnhancedMoveTypes').BossAI;
    personalityInfo?: BossPersonalityInfo;

    // Timer system
    timer?: BossTimer;

    // Core stats and mechanics
    stats: BossStats;
    moves: BossMove[];
    questId: string;
    questTitle: string;
    estimatedDuration: string;
    rewards: BossRewards;
    phases: BossPhase[];
    currentPhase: number;
    isDefeated: boolean;
    createdAt: Date;
    lastAttack?: Date;

    // Enhanced properties
    difficulty: 'easy' | 'medium' | 'hard' | 'epic' | 'legendary';
    theme: string;
    weaknesses: string[];
    resistances: string[];
    specialAbilities: string[];
    lore: string;
}

// AI Personality Information
export interface BossPersonalityInfo {
    name: string;        // e.g., "The Berserker"
    description: string; // e.g., "Overwhelms with raw power and fury"
    traits: string[];    // e.g., ["high_damage", "buff_hatred", "low_health_rage"]
}

export interface BossBattleState {
    boss: Boss;
    playerStats: {
        currentHP: number;
        maxHP: number;
        attack: number;
        defense: number;
        speed: number;
        specialAttack: number;
        specialDefense: number;
        buffs: Array<{
            name: string;
            type: 'attack' | 'defense' | 'speed' | 'special';
            value: number;
            duration: number;
        }>;
        debuffs: Array<{
            name: string;
            type: 'attack' | 'defense' | 'speed' | 'special';
            value: number;
            duration: number;
        }>;
    };
    battleLog: Array<{
        turn: number;
        actor: 'player' | 'boss';
        action: string;
        damage?: number;
        effects?: string[];
        timestamp: Date;
    }>;
    currentTurn: number;
    isPlayerTurn: boolean;
    gameOver: boolean;
    victory: boolean;

    // Enhanced battle state
    timeRemaining?: number;
    phaseTransition: boolean;
    specialEffects: string[];
    comboCount: number;
    bossMood: 'confident' | 'worried' | 'angry' | 'desperate';
}

export interface BossCreationOptions {
    name: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'epic' | 'legendary';
    bossType: 'mini-boss' | 'boss' | 'epic-boss' | 'legendary-boss';
    bossTheme: string;
    enableTimer?: boolean;
    multiPhase?: boolean;
    customAvatar?: string;
    customBackground?: string;
    estimatedDuration?: string;

    // Legacy properties for backward compatibility
    questTitle?: string;
    questId?: string;
    priority?: string;
    subtasks?: Array<{ text: string; completed: boolean }>;
    playerSkillLevel?: number;

    // Skill linkage and optional overrides for creator UI
    associatedSkill?: string;
    moves?: BossMove[];
    phases?: BossPhase[];
    dialogue?: Partial<BossDialogue>;
    visuals?: Partial<BossVisuals>;
    timerConfig?: Partial<BossTimer>;
    weaknesses?: string[];
    resistances?: string[];
    specialAbilities?: string[];
    personalityInfo?: BossPersonalityInfo;
    aiId?: string;
    scalingConfigId?: string;
}

export interface BossProgress {
    bossId: string;
    questId: string;
    currentHP: number;
    maxHP: number;
    phase: number;
    lastUpdated: Date;
    isActive: boolean;
    timeSpent: number;
    attempts: number;
    bestDamage: number;
    phaseProgress: number[];
    lastPhaseChange: Date;
}

// New: Boss Theme System
export interface BossTheme {
    id: string;
    name: string;
    description: string;
    defaultAvatar: string;
    defaultBackground: string;
    personality: {
        confidence: number;
        aggression: number;
        intelligence: number;
        humor: number;
    };
    defaultMoves: string[];
    colorScheme: string[];
    soundEffects: string[];
}

// New: Boss Visuals
export interface BossVisuals {
    avatar: string;
    background: string;
    phaseAvatars: string[];
    attackAnimations: string[];
    defeatAnimation: string;
    victoryAnimation: string;
    customImage?: string; // Optional custom uploaded image
}

// New: Boss Dialogue
export interface BossDialogue {
    intro: string[];
    taunts: string[];
    phaseTransitions: string[];
    lowHP: string[];
    victory: string[];
    defeat: string[];
    counterAttack: string[];
    specialMove: string[];
}

// New: Boss Timer
export interface BossTimer {
    duration: number; // in seconds
    countdown: number;
    warningThreshold: number;
    timeBonus: number;
    timePenalty: number;
}

// New: Boss Categories
export type BossCategory =
    | 'single-session'      // Low HP, defeated in 1 work session
    | 'multi-phase'         // HP split into phases, tied to milestones
    | 'timed'               // Time-based battle with countdown
    | 'endurance'           // High HP, long battle
    | 'rush'                // Fast-paced, quick decisions
    | 'puzzle'              // Requires solving puzzles/tasks
    | 'team'                // Multiple players can contribute
    | 'evolutionary';       // Boss changes form during battle

// New: Boss Templates
export interface BossTemplate {
    id: string;
    name: string;
    theme: string;
    baseStats: Partial<BossStats>;
    baseMoves: string[];
    baseRewards: Partial<BossRewards>;
    scaling: {
        hpMultiplier: number;
        rewardMultiplier: number;
        moveCount: number;
        phaseCount: number;
    };
    phases: Partial<BossPhase>[];
    estimatedDuration: string;
}

// ===== BOSS ANALYTICS & BESTIARY SYSTEM =====

// Boss Analytics & Bestiary System
export interface BossAnalytics {
    bossId: string;
    bossName: string;
    bossType: 'mini-boss' | 'boss' | 'epic-boss' | 'legendary-boss';
    theme: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'epic' | 'legendary';

    // Battle Statistics
    totalBattles: number;
    victories: number;
    defeats: number;
    winRate: number;

    // Time Statistics
    averageBattleTime: number; // in minutes
    totalTimeSpent: number; // in minutes
    fastestVictory: number; // in minutes
    longestBattle: number; // in minutes

    // Damage Statistics
    totalDamageDealt: number;
    averageDamagePerBattle: number;
    highestDamageDealt: number;
    totalDamageTaken: number;

    // Phase Statistics
    averagePhasesCompleted: number;
    phaseCompletionRates: Record<number, number>; // phase number -> completion rate

    // Reward Statistics
    totalRewardsEarned: {
        xp: number;
        cp: number;
        coins: number;
        materials: Record<string, number>;
        achievements: string[];
        titles: string[];
    };

    // Player Performance
    playerLevelWhenDefeated: number;
    playerStatsWhenDefeated: {
        focus: number;
        intelligence: number;
        creativity: number;
        strength: number;
    };

    // Battle History
    battleHistory: BossBattleRecord[];

    // Metadata
    firstEncountered: Date;
    lastEncountered: Date;
    isUnlocked: boolean;
    isDefeated: boolean;
}

export interface BossBattleRecord {
    battleId: string;
    bossId: string;
    questId: string;
    battleDate: Date;
    duration: number; // in minutes
    result: 'victory' | 'defeat' | 'abandoned';

    // Battle Details
    startingHP: number;
    endingHP: number;
    damageDealt: number;
    damageTaken: number;
    phasesCompleted: number;

    // Player State
    playerLevel: number;
    playerStats: {
        focus: number;
        intelligence: number;
        creativity: number;
        strength: number;
    };

    // Rewards Earned
    rewards: {
        xp: number;
        cp: number;
        coins: number;
        materials: string[];
        achievements: string[];
    };

    // Battle Log Summary
    battleLog: string[];
    specialEvents: string[];
}

// Boss Scaling System
export interface BossScalingConfig {
    // Player Level Scaling
    playerLevelScaling: {
        enabled: boolean;
        hpMultiplier: number; // per level above base
        rewardMultiplier: number; // per level above base
        difficultyIncrease: number; // per level above base
        maxLevelBonus: number; // maximum level bonus
    };

    // Player Stats Scaling
    playerStatsScaling: {
        enabled: boolean;
        focusScaling: {
            enabled: boolean;
            hpMultiplier: number; // per focus point above average
            rewardMultiplier: number;
        };
        intelligenceScaling: {
            enabled: boolean;
            hpMultiplier: number;
            rewardMultiplier: number;
        };
        creativityScaling: {
            enabled: boolean;
            hpMultiplier: number;
            rewardMultiplier: number;
        };
        strengthScaling: {
            enabled: boolean;
            hpMultiplier: number;
            rewardMultiplier: number;
        };
    };

    // Time-Based Scaling
    timeScaling: {
        enabled: boolean;
        dailyScaling: {
            enabled: boolean;
            hpIncrease: number; // per day since first encounter
            rewardIncrease: number;
            maxDays: number;
        };
        weeklyScaling: {
            enabled: boolean;
            hpIncrease: number; // per week since first encounter
            rewardIncrease: number;
            maxWeeks: number;
        };
    };

    // Difficulty Progression Scaling
    difficultyScaling: {
        enabled: boolean;
        consecutiveVictories: {
            enabled: boolean;
            hpIncrease: number; // per consecutive victory
            rewardIncrease: number;
            maxConsecutive: number;
        };
        totalVictories: {
            enabled: boolean;
            hpIncrease: number; // per total victory
            rewardIncrease: number;
            maxTotal: number;
        };
    };

    // Arena Mode Scaling
    arenaScaling: {
        enabled: boolean;
        bossCountScaling: {
            enabled: boolean;
            hpMultiplier: number; // per additional boss in arena
            rewardMultiplier: number;
        };
        timeLimitScaling: {
            enabled: boolean;
            timeReduction: number; // minutes reduced per additional boss
            minTimeLimit: number;
        };
    };
}

export interface BossScalingResult {
    originalStats: BossStats;
    scaledStats: BossStats;
    originalRewards: BossRewards;
    scaledRewards: BossRewards;
    scalingFactors: {
        playerLevel: number;
        playerStats: number;
        timeBased: number;
        difficulty: number;
        arena: number;
        total: number;
    };
    scalingApplied: {
        hpMultiplier: number;
        rewardMultiplier: number;
        difficultyIncrease: number;
    };
}

// Boss Bestiary Entry
export interface BossBestiaryEntry {
    bossId: string;
    bossName: string;
    bossTitle: string;
    bossType: 'mini-boss' | 'boss' | 'epic-boss' | 'legendary-boss';
    theme: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'epic' | 'legendary';

    // Visual Information
    avatar: string;
    background: string;
    phaseAvatars: string[];

    // Lore and Description
    lore: string;
    description: string;
    personality: {
        confidence: number;
        aggression: number;
        intelligence: number;
        humor: number;
    };

    // Battle Information
    baseStats: BossStats;
    moves: BossMove[];
    phases: BossPhase[];
    weaknesses: string[];
    resistances: string[];
    specialAbilities: string[];

    // Rewards Information
    baseRewards: BossRewards;

    // Unlock Conditions
    unlockConditions: {
        playerLevel: number;
        requiredBosses: string[];
        requiredAchievements: string[];
        requiredStats: {
            focus?: number;
            intelligence?: number;
            creativity?: number;
            strength?: number;
        };
    };

    // Analytics (if encountered)
    analytics?: BossAnalytics;

    // Metadata
    isUnlocked: boolean;
    isDefeated: boolean;
    firstEncountered?: Date;
    lastEncountered?: Date;
}

// Arena Mode Types
export interface BossArena {
    id: string;
    name: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'epic' | 'legendary';

    // Arena Configuration
    bossCount: number;
    timeLimit: number; // in minutes
    bossSelection: 'random' | 'sequential' | 'player-choice';

    // Bosses in Arena
    bosses: Array<{
        bossId: string;
        bossName: string;
        order: number;
        isOptional: boolean;
    }>;

    // Arena Rewards
    arenaRewards: {
        xp: number;
        cp: number;
        coins: number;
        materials: string[];
        achievements: string[];
        titles: string[];
        arenaPoints: number;
    };

    // Arena Progress
    progress: {
        currentBossIndex: number;
        defeatedBosses: string[];
        timeRemaining: number;
        isActive: boolean;
        isCompleted: boolean;
    };

    // Arena Scaling
    scaling: BossScalingConfig;

    // Metadata
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

// Task Integration Interfaces
export interface LinkedTask {
    id: string;
    text: string;
    filePath: string;
    lineNumber?: number; // Optional for dynamically created tasks
    completed: boolean;
    damageValue: number;
    taskType: 'checkbox' | 'bullet' | 'heading' | 'boss-quest';
    priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
    estimatedTime?: number; // in minutes
    createdAt?: Date; // Optional for dynamically created tasks
    completedAt?: Date;
    // Reward properties for boss quests
    xp?: number;
    cp?: number;
    coins?: number;
    tags?: string[];
}

export interface TaskIntegrationConfig {
    autoDamageMultiplier: number; // base damage per task completion
    priorityMultipliers: {
        lowest: number;
        low: number;
        medium: number;
        high: number;
        highest: number;
    };
    typeMultipliers: {
        checkbox: number;
        bullet: number;
        heading: number;
    };
    enableRealTimeSync: boolean;
    scanInterval: number; // milliseconds
}

export interface TaskProgressUpdate {
    taskId: string;
    bossId: string;
    damageDealt: number;
    timestamp: Date;
    taskText: string;
}

// ===== SKILL-BASED BATTLE SYSTEM =====

// Skill-based boss that ties to skill tree markdown files
export interface SkillBasedBoss extends Boss {
    // Skill/project association
    associatedSkill: string; // e.g., "Bodybuilding", "Programming", "Writing"
    projectType: 'fitness' | 'learning' | 'creative' | 'professional' | 'personal' | 'custom';

    // Stat requirements for this boss (from SkillTree/Master-Class/Stats/)
    requiredStats: {
        primary: string; // Main stat needed (e.g., "Strength", "Focus")
        secondary?: string; // Optional secondary stat
        tertiary?: string; // Optional third stat
    };

    // Stat-based move system
    statBasedMoves: StatBasedMove[];

    // Skill progression tracking
    skillProgress: {
        currentLevel: number;
        currentCP: number;
        requiredCP: number;
        totalCP: number;
        milestones: SkillMilestone[];
    };
}

// Stat-based moves that depend on player stats from skill tree files
export interface StatBasedMove extends BossMove {
    // Stat requirements to use this move (stat level values, NOT CP)
    statRequirements: {
        primaryStat: string; // e.g., "Strength"
        primaryMinLevel: number; // Minimum stat level needed
        secondaryStat?: string;
        secondaryMinLevel?: number;
    };

    // How the move scales with stats (stat level, NOT CP)
    statScaling: {
        primaryStat: string;
        scalingFactor: number; // How much the stat level affects power
        maxBonus: number; // Maximum bonus from stat scaling
        minBonus: number; // Minimum bonus from stat scaling
    };

    // Move categories for different skill types
    moveCategory: 'strength' | 'endurance' | 'focus' | 'creativity' | 'intelligence' | 'motivation' | 'patience';

    // Skill-specific effects
    skillEffects?: {
        cpGain: number; // CP gained for the associated skill
        statBoost?: {
            stat: string;
            amount: number;
            duration: number; // in turns
        };
    };
}

// Skill milestones for progression
export interface SkillMilestone {
    level: number;
    name: string;
    description: string;
    unlockedMoves: string[];
    statBonuses: Record<string, number>;
    rewards: {
        cp: number;
        coins: number;
        materials: string[];
    };
}

// Project-based boss templates
export interface ProjectBossTemplate {
    id: string;
    name: string;
    projectType: 'fitness' | 'learning' | 'creative' | 'professional' | 'personal';
    associatedSkill: string;

    // Stat requirements for this project type
    requiredStats: {
        primary: string;
        secondary?: string;
        tertiary?: string;
    };

    // Available moves based on project type
    availableMoves: {
        strength: StatBasedMove[];
        endurance: StatBasedMove[];
        focus: StatBasedMove[];
        creativity: StatBasedMove[];
        intelligence: StatBasedMove[];
        motivation: StatBasedMove[];
        patience: StatBasedMove[];
    };

    // Boss scaling based on project duration
    scaling: {
        shortTerm: number; // 1-7 days
        mediumTerm: number; // 1-4 weeks
        longTerm: number; // 1-6 months
    };
}

// Player stats from skill tree files (CP values for skill progression)
export interface SkillTreeStats {
    [statName: string]: {
        name: string;
        level: number;
        currentCP: number;
        requiredCP: number;
        totalCP: number;
        filePath: string;
    };
}

// ✅ NEW: Player battle stats (actual stat levels for battle calculations)
export interface PlayerStats {
    charisma: number;      // Social influence and leadership
    creativity: number;    // Artistic and innovative abilities
    dexterity: number;     // Physical agility and precision
    endurance: number;     // Physical stamina and resilience
    faith: number;        // Spiritual strength and conviction
    ingenuity: number;     // Problem-solving and innovation
    intelligence: number;  // Mental acuity and knowledge
    mindfulness: number;   // Awareness and focus
    strength: number;      // Physical power and force
    willpower: number;     // Mental determination and persistence
    wisdom: number;        // Deep understanding and judgment

    // Legacy aliases for backward compatibility
    focus?: number;        // Alias for mindfulness
    motivation?: number;    // Alias for willpower
    patience?: number;     // Alias for endurance (mental)
    agility?: number;      // Alias for dexterity
}

// Enhanced battle state with skill integration
export interface SkillBasedBattleState extends BossBattleState {
    // Player's actual stats from skill tree files (CP-based)
    playerSkillStats: SkillTreeStats;

    // Player's battle stats (level-based for battle calculations)
    playerBattleStats: PlayerStats;

    // Available moves based on player stats
    availableMoves: StatBasedMove[];

    // Move power calculations with stat scaling
    moveCalculations: {
        [moveId: string]: {
            basePower: number;
            statBonus: number;
            totalPower: number;
            cpCost?: number;
        };
    };

    // Skill progression during battle
    skillGains: {
        [skillName: string]: number; // CP gained during this battle
    };

    // Active stat boosts from moves
    activeStatBoosts: {
        [statName: string]: {
            amount: number;
            turnsRemaining: number;
            source: string; // move name that caused the boost
        };
    };
}