import {
    Boss,
    BossStats,
    BossMove,
    BossPhase,
    BossRewards,
    BossCreationOptions,
    BossTheme,
    BossVisuals,
    BossDialogue,
    BossTimer,
    BossCategory
} from '../types/BossTypes';

// Export the BossTheme data
export const BOSS_THEMES: Record<string, BossTheme> = {
    'procrastination': {
        id: 'procrastination',
        name: 'Procrastination',
        description: 'A fearsome creature that feeds on your willpower and time. It grows stronger with each delayed task.',
        defaultAvatar: '🐉',
        defaultBackground: '🌅',
        personality: {
            confidence: 8,
            aggression: 6,
            intelligence: 7,
            humor: 4
        },
        defaultMoves: ['Procrastinate', 'Time Drain', 'Motivation Sap', 'Focus Break', 'Deadline Fear'],
        colorScheme: ['#ff6b6b', '#ff8e53', '#ffd93d'],
        soundEffects: ['time_drain.mp3', 'motivation_sap.mp3']
    },
    'complexity': {
        id: 'complexity',
        name: 'Complexity',
        description: 'A multi-headed monster that grows stronger with each unsolved problem. Each head represents a different challenge.',
        defaultAvatar: '🐙',
        defaultBackground: '🌊',
        personality: {
            confidence: 7,
            aggression: 8,
            intelligence: 9,
            humor: 3
        },
        defaultMoves: ['Confuse', 'Overwhelm', 'Complexity Surge', 'Mental Drain', 'Analysis Paralysis'],
        colorScheme: ['#4ecdc4', '#45b7d1', '#96ceb4'],
        soundEffects: ['complexity_surge.mp3', 'mental_drain.mp3']
    },
    'perfectionism': {
        id: 'perfectionism',
        name: 'Perfectionism',
        description: 'A ghostly figure that sets impossibly high standards. It haunts you with thoughts of imperfection.',
        defaultAvatar: '👻',
        defaultBackground: '🏰',
        personality: {
            confidence: 9,
            aggression: 5,
            intelligence: 8,
            humor: 2
        },
        defaultMoves: ['Impossible Standards', 'Self-Doubt', 'Perfection Paralysis', 'Fear of Failure', 'Endless Revision'],
        colorScheme: ['#a8e6cf', '#dcedc1', '#ffd3b6'],
        soundEffects: ['impossible_standards.mp3', 'self_doubt.mp3']
    },
    'distraction': {
        id: 'distraction',
        name: 'Distraction',
        description: 'A mischievous demon that constantly pulls your attention away. It thrives on interruptions and notifications.',
        defaultAvatar: '😈',
        defaultBackground: '🎪',
        personality: {
            confidence: 6,
            aggression: 4,
            intelligence: 5,
            humor: 8
        },
        defaultMoves: ['Distract', 'Interrupt', 'Focus Shatter', 'Attention Drain', 'Context Switch'],
        colorScheme: ['#ff9ff3', '#f368e0', '#ff6b6b'],
        soundEffects: ['distract.mp3', 'focus_shatter.mp3']
    },
    'overwhelm': {
        id: 'overwhelm',
        name: 'Overwhelm',
        description: 'A massive titan that represents the weight of too many tasks. It crushes your spirit with overwhelming demands.',
        defaultAvatar: '🗿',
        defaultBackground: '⛰️',
        personality: {
            confidence: 8,
            aggression: 9,
            intelligence: 6,
            humor: 1
        },
        defaultMoves: ['Crush', 'Overload', 'Stress Surge', 'Anxiety Wave', 'Mental Collapse'],
        colorScheme: ['#6c5ce7', '#a29bfe', '#fd79a8'],
        soundEffects: ['crush.mp3', 'stress_surge.mp3']
    },
    'deadline': {
        id: 'deadline',
        name: 'Deadline',
        description: 'A relentless timekeeper that grows more aggressive as deadlines approach. It feeds on your panic and stress.',
        defaultAvatar: '⏰',
        defaultBackground: '🌆',
        personality: {
            confidence: 7,
            aggression: 9,
            intelligence: 6,
            humor: 3
        },
        defaultMoves: ['Time Pressure', 'Deadline Rush', 'Panic Attack', 'Stress Surge', 'Last Minute'],
        colorScheme: ['#e17055', '#d63031', '#fdcb6e'],
        soundEffects: ['time_pressure.mp3', 'panic_attack.mp3']
    },
    'mortgage': {
        id: 'mortgage',
        name: 'Mortgage',
        description: 'A financial beast that represents long-term financial commitments. It requires consistent, long-term planning to defeat.',
        defaultAvatar: '🏦',
        defaultBackground: '🏠',
        personality: {
            confidence: 9,
            aggression: 7,
            intelligence: 8,
            humor: 2
        },
        defaultMoves: ['Interest Accumulation', 'Payment Pressure', 'Financial Stress', 'Long-term Planning', 'Budget Crunch'],
        colorScheme: ['#00b894', '#00cec9', '#74b9ff'],
        soundEffects: ['interest_accumulation.mp3', 'payment_pressure.mp3']
    }
};

// Export boss templates
export const BOSS_TEMPLATES: Record<string, any> = {
    'single-session': {
        id: 'single-session',
        name: 'Single Session Boss',
        theme: 'procrastination',
        baseStats: { maxHP: 100, attack: 15, defense: 10, speed: 20 },
        baseMoves: ['Quick Attack', 'Defend', 'Special Move'],
        baseRewards: { xp: 50, cp: 25, coins: 10 },
        scaling: { hpMultiplier: 1.0, rewardMultiplier: 1.0, moveCount: 3, phaseCount: 1 },
        phases: [{ name: 'Phase 1', hpThreshold: 100 }],
        estimatedDuration: '2-4 hours'
    },
    'multi-phase': {
        id: 'multi-phase',
        name: 'Multi-Phase Boss',
        theme: 'complexity',
        baseStats: { maxHP: 300, attack: 25, defense: 20, speed: 15 },
        baseMoves: ['Phase Attack', 'Phase Defense', 'Phase Transition'],
        baseRewards: { xp: 150, cp: 75, coins: 30 },
        scaling: { hpMultiplier: 2.0, rewardMultiplier: 2.0, moveCount: 5, phaseCount: 3 },
        phases: [
            { name: 'Phase 1', hpThreshold: 100 },
            { name: 'Phase 2', hpThreshold: 66 },
            { name: 'Phase 3', hpThreshold: 33 }
        ],
        estimatedDuration: '1-3 days'
    },
    'timed': {
        id: 'timed',
        name: 'Timed Boss',
        theme: 'deadline',
        baseStats: { maxHP: 200, attack: 20, defense: 15, speed: 25 },
        baseMoves: ['Time Attack', 'Rush', 'Deadline Pressure'],
        baseRewards: { xp: 100, cp: 50, coins: 20 },
        scaling: { hpMultiplier: 1.5, rewardMultiplier: 1.5, moveCount: 4, phaseCount: 2 },
        phases: [{ name: 'Phase 1', hpThreshold: 100 }],
        estimatedDuration: '4-8 hours'
    }
};

export class BossFactory {
    private static readonly BOSS_TYPES = {
        'mini-boss': {
            hpMultiplier: 1.5,
            rewardMultiplier: 2,
            moveCount: 3,
            phaseCount: 1
        },
        'boss': {
            hpMultiplier: 2.5,
            rewardMultiplier: 3,
            moveCount: 4,
            phaseCount: 2
        },
        'epic-boss': {
            hpMultiplier: 4,
            rewardMultiplier: 4,
            moveCount: 5,
            phaseCount: 3
        },
        'legendary-boss': {
            hpMultiplier: 6,
            rewardMultiplier: 5,
            moveCount: 6,
            phaseCount: 4
        }
    };

    static createBoss(options: BossCreationOptions): Boss {
        const bossType = options.bossType;
        const theme = this.selectBossTheme(options);
        const stats = this.generateBossStats(options, bossType);
        const moves = this.generateBossMoves(bossType, theme);
        const phases = this.generateBossPhases(bossType, theme);
        const rewards = this.generateBossRewards(options, bossType);
        const category = this.determineBossCategory(options);
        const visuals = this.generateBossVisuals(theme, category);
        const dialogue = this.generateBossDialogue(theme);

        return {
            id: `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: options.name,
            title: this.generateBossTitle(theme, options.name),
            description: options.description,
            image: theme.defaultAvatar,
            category,
            type: bossType,
            visuals,
            dialogue,
            timer: options.enableTimer ? this.generateBossTimer(options) : undefined,
            stats,
            moves,
            questId: options.questId || 'standalone',
            questTitle: options.questTitle || options.name,
            estimatedDuration: options.estimatedDuration || 'Unknown',
            rewards,
            phases,
            currentPhase: 0,
            isDefeated: false,
            createdAt: new Date(),
            difficulty: options.difficulty,
            theme: theme.id,
            weaknesses: this.generateWeaknesses(theme),
            resistances: this.generateResistances(theme),
            specialAbilities: this.generateSpecialAbilities(theme),
            lore: this.generateBossLore(theme)
        };
    }

    private static determineBossType(options: BossCreationOptions): Boss['type'] {
        const duration = (options.estimatedDuration || '1 week').toLowerCase();
        const difficulty = options.difficulty.toLowerCase();
        const priority = (options.priority || 'medium').toLowerCase();
        const subtaskCount = (options.subtasks || []).length;

        // Legendary: Very long duration + high difficulty/priority
        if (duration.includes('month') || duration.includes('year') ||
            (duration.includes('week') && subtaskCount > 10)) {
            return 'legendary-boss';
        }

        // Epic: Long duration OR high difficulty with many subtasks
        if (duration.includes('week') && (difficulty === 'hard' || priority === 'high' || subtaskCount > 7)) {
            return 'epic-boss';
        }

        // Boss: Medium duration OR medium difficulty with several subtasks
        if (duration.includes('week') || (difficulty === 'medium' && subtaskCount > 5) ||
            (priority === 'high' && subtaskCount > 3)) {
            return 'boss';
        }

        // Mini-boss: Everything else
        return 'mini-boss';
    }

    private static selectBossTheme(options: BossCreationOptions): BossTheme {
        // For now, return a default theme
        return BOSS_THEMES.procrastination;
    }

    private static selectBossName(theme: any): string {
        return theme.names[Math.floor(Math.random() * theme.names.length)];
    }

    private static generateBossTitle(theme: any, questTitle: string): string {
        const title = this.selectBossName(theme);
        return `${title} - Guardian of "${questTitle}"`;
    }

    private static generateBossStats(options: BossCreationOptions, bossType: Boss['type']): BossStats {
        const config = this.BOSS_TYPES[bossType];
        const baseHP = this.calculateBaseHP(options);
        const maxHP = Math.floor(baseHP * config.hpMultiplier);

        return {
            maxHP,
            currentHP: maxHP,
            attack: Math.floor(50 + Math.random() * 50) * config.hpMultiplier,
            defense: Math.floor(30 + Math.random() * 40) * config.hpMultiplier,
            speed: Math.floor(20 + Math.random() * 30) * config.hpMultiplier,
            specialAttack: Math.floor(40 + Math.random() * 60) * config.hpMultiplier,
            specialDefense: Math.floor(25 + Math.random() * 35) * config.hpMultiplier
        };
    }

    private static calculateBaseHP(options: BossCreationOptions): number {
        let baseHP = 100;

        // Duration multiplier
        if (options.estimatedDuration) {
            if (options.estimatedDuration.includes('month')) baseHP *= 3;
            else if (options.estimatedDuration.includes('week')) baseHP *= 2;
            else if (options.estimatedDuration.includes('day')) baseHP *= 1.5;
        }

        // Difficulty multiplier
        if (options.difficulty === 'hard') baseHP *= 1.5;
        else if (options.difficulty === 'easy') baseHP *= 0.7;
        else if (options.difficulty === 'epic') baseHP *= 2.0;
        else if (options.difficulty === 'legendary') baseHP *= 3.0;

        // Priority multiplier
        if (options.priority && options.priority.toLowerCase() === 'high') baseHP *= 1.3;

        // Subtask multiplier
        if (options.subtasks) {
            baseHP += options.subtasks.length * 25;
        }

        // Player skill level multiplier
        if (options.playerSkillLevel) {
            baseHP += options.playerSkillLevel * 10;
        }

        return Math.floor(baseHP);
    }

    private static generateBossMoves(bossType: Boss['type'], theme: any): BossMove[] {
        const config = this.BOSS_TYPES[bossType];
        const moves: BossMove[] = [];

        // Basic attack move
        moves.push({
            name: 'Basic Attack',
            type: 'attack',
            power: 40,
            accuracy: 95,
            description: 'A standard physical attack.'
        });

        // Theme-specific moves
        theme.defaultMoves.slice(0, config.moveCount - 1).forEach((moveName: string, index: number) => {
            const isStatusMove = index % 2 === 0;
            moves.push({
                name: moveName,
                type: isStatusMove ? 'status' : 'attack',
                power: isStatusMove ? 0 : 60 + (index * 10),
                accuracy: 85 - (index * 5),
                description: `A powerful ${moveName.toLowerCase()} ${isStatusMove ? 'effect' : 'attack'}.`,
                effect: isStatusMove ? {
                    type: 'debuff',
                    target: 'player',
                    value: 10 + (index * 5),
                    duration: 3
                } : undefined,
                cooldown: isStatusMove ? 3 : undefined
            });
        });

        return moves;
    }

    private static generateBossPhases(bossType: Boss['type'], theme: BossTheme): BossPhase[] {
        const phases: BossPhase[] = [];
        const phaseCount = this.getPhaseCount(bossType);

        for (let i = 0; i < phaseCount; i++) {
            const phaseNumber = i + 1;
            const hpThreshold = Math.max(0, 100 - (i * (100 / phaseCount)));

            phases.push({
                name: `Phase ${phaseNumber}`,
                description: `Phase ${phaseNumber} of the battle`,
                hpThreshold,
                moves: this.getPhaseMoves(bossType, phaseNumber).map(move => move.name), // Convert to string array
                appearance: `Phase ${phaseNumber} appearance`,
                specialEffects: i > 0 ? [`Phase ${phaseNumber} special effect`] : undefined,

                // Enhanced phase properties
                phaseNumber,
                phaseColor: this.getPhaseColor(phaseNumber),
                phaseTransition: this.getPhaseTransition(phaseNumber),
                bossDialogue: this.getPhaseDialogue(theme, phaseNumber) // This should return string[]
            });
        }

        return phases;
    }

    private static getPhaseCount(bossType: Boss['type']): number {
        const config = this.BOSS_TYPES[bossType];
        return config.phaseCount;
    }

    private static getPhaseMoves(bossType: Boss['type'], phaseNumber: number): BossMove[] {
        const config = this.BOSS_TYPES[bossType];
        const moves: BossMove[] = [];
        const moveCount = config.moveCount;

        // Basic attack move
        moves.push({
            name: 'Basic Attack',
            type: 'attack',
            power: 40,
            accuracy: 95,
            description: 'A standard physical attack.'
        });

        // Get theme-specific moves (we'll use a default theme for now)
        const defaultTheme = BOSS_THEMES.procrastination;
        defaultTheme.defaultMoves.slice(0, moveCount - 1).forEach((moveName: string, index: number) => {
            const isStatusMove = index % 2 === 0;
            moves.push({
                name: moveName,
                type: isStatusMove ? 'status' : 'attack',
                power: isStatusMove ? 0 : 60 + (index * 10),
                accuracy: 85 - (index * 5),
                description: `A powerful ${moveName.toLowerCase()} ${isStatusMove ? 'effect' : 'attack'}.`,
                effect: isStatusMove ? {
                    type: 'debuff',
                    target: 'player',
                    value: 10 + (index * 5),
                    duration: 3
                } : undefined,
                cooldown: isStatusMove ? 3 : undefined
            });
        });

        return moves;
    }

    private static getPhaseColor(phaseNumber: number): string {
        // Simple color scheme for demonstration
        if (phaseNumber % 2 === 0) return '#4ecdc4'; // Even phases
        return '#45b7d1'; // Odd phases
    }

    private static getPhaseTransition(phaseNumber: number): string {
        if (phaseNumber === 1) return 'You\'ve awakened my true power!';
        if (phaseNumber === 2) return 'The battle intensifies!';
        if (phaseNumber === 3) return 'The final phase - give it everything you\'ve got!';
        return 'The boss grows more desperate!';
    }

    private static getPhaseDialogue(theme: BossTheme, phaseNumber: number): string[] {
        // For now, return default dialogue since BossTheme doesn't have dialogue property
        const defaultDialogue = {
            intro: [`I am ${theme.name}, and you shall not pass!`],
            phaseTransitions: ['You\'ve awakened my true power!', 'Phase 2 begins!'],
            lowHP: ['No... this cannot be!', 'You\'ve wounded me!'],
            taunts: ['Is that all you\'ve got?', 'Pathetic!', 'You\'re wasting my time!']
        };

        if (phaseNumber === 1) return defaultDialogue.intro;
        if (phaseNumber === 2) return defaultDialogue.phaseTransitions;
        if (phaseNumber === 3) return defaultDialogue.lowHP;

        return defaultDialogue.taunts;
    }

    private static getPhaseDescription(phase: number, totalPhases: number): string {
        if (phase === 1) return "The battle begins!";
        if (phase === totalPhases) return "The final phase - give it everything you've got!";
        if (phase === Math.ceil(totalPhases / 2)) return "The battle intensifies!";
        return "The boss grows more desperate!";
    }

    private static generateBossRewards(options: BossCreationOptions, bossType: Boss['type']): BossRewards {
        const config = this.BOSS_TYPES[bossType];
        const baseXP = 100; // Default values
        const baseCP = 50;
        const baseCoins = 25;

        // Scale rewards based on difficulty and duration
        const difficultyMultiplier = this.getDifficultyMultiplier(options.difficulty);
        const durationMultiplier = this.getDurationMultiplier(options.estimatedDuration || '1 week');
        const finalMultiplier = difficultyMultiplier * durationMultiplier;

        return {
            xp: Math.floor(baseXP * finalMultiplier),
            cp: Math.floor(baseCP * finalMultiplier),
            coins: Math.floor(baseCoins * finalMultiplier),
            materials: this.generateMaterials(bossType),
            lifeItems: this.generateLifeItems(bossType),
            achievements: [`Defeated ${bossType.replace('-', ' ')}`, `Quest Master: ${options.name}`],

            // Enhanced reward properties
            titles: [`${options.difficulty} ${bossType.replace('-', ' ')} Slayer`],
            bossMaterials: [`${bossType.replace('-', ' ')} Essence`],
            unlockables: [`${bossType.replace('-', ' ')} Trophy`]
        };
    }

    private static getDifficultyMultiplier(difficulty: string): number {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 0.7;
            case 'medium': return 1.0;
            case 'hard': return 1.5;
            case 'epic': return 2.0;
            case 'legendary': return 3.0;
            default: return 1.0;
        }
    }

    private static getDurationMultiplier(duration: string): number {
        if (duration.includes('month') || duration.includes('year')) return 2.0;
        if (duration.includes('week')) return 1.5;
        if (duration.includes('day')) return 1.2;
        return 1.0;
    }

    private static generateMaterials(bossType: Boss['type']) {
        const rarityChances = {
            'mini-boss': { common: 0.7, uncommon: 0.3, rare: 0.1, epic: 0, legendary: 0 },
            'boss': { common: 0.5, uncommon: 0.4, rare: 0.2, epic: 0.05, legendary: 0 },
            'epic-boss': { common: 0.3, uncommon: 0.4, rare: 0.3, epic: 0.2, legendary: 0.05 },
            'legendary-boss': { common: 0.1, uncommon: 0.3, rare: 0.4, epic: 0.3, legendary: 0.2 }
        };

        const materials: Array<{
            name: string;
            quantity: number;
            rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
        }> = [];
        const config = rarityChances[bossType];

        Object.entries(config).forEach(([rarity, chance]) => {
            if (Math.random() < chance) {
                materials.push({
                    name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Material`,
                    quantity: Math.floor(Math.random() * 3) + 1,
                    rarity: rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
                });
            }
        });

        return materials;
    }

    private static generateLifeItems(bossType: Boss['type']) {
        const items = [
            {
                name: 'Movie Ticket',
                description: 'Watch any movie of your choice',
                type: 'entertainment' as const,
                value: 15
            },
            {
                name: 'Gaming Session',
                description: '2 hours of guilt-free gaming time',
                type: 'entertainment' as const,
                value: 20
            },
            {
                name: 'Spa Day',
                description: 'Treat yourself to a relaxing spa experience',
                type: 'relaxation' as const,
                value: 50
            },
            {
                name: 'Productivity Boost',
                description: 'Next task gets 2x XP and CP',
                type: 'productivity' as const,
                value: 30
            },
            {
                name: 'Creative Break',
                description: 'Take a walk or do something creative',
                type: 'relaxation' as const,
                value: 25
            },
            {
                name: 'Social Time',
                description: 'Spend time with friends or family',
                type: 'entertainment' as const,
                value: 35
            }
        ];

        const count = bossType === 'legendary-boss' ? 3 : bossType === 'epic-boss' ? 2 : 1;
        const selectedItems = [];

        for (let i = 0; i < count; i++) {
            const randomItem = items[Math.floor(Math.random() * items.length)];
            selectedItems.push({ ...randomItem });
        }

        return selectedItems;
    }

    private static determineBossCategory(options: BossCreationOptions): BossCategory {
        if (options.estimatedDuration) {
            const duration = options.estimatedDuration.toLowerCase();
            if (duration.includes('hour') || duration.includes('day')) {
                return 'single-session';
            } else if (duration.includes('week') || duration.includes('month')) {
                return 'multi-phase';
            }
        }
        return 'single-session';
    }

    private static generateBossVisuals(theme: BossTheme, category: BossCategory): BossVisuals {
        const phaseAvatars = [theme.defaultAvatar]; // For now, same avatar for all phases

        // Generate different phase avatars based on category
        if (category === 'multi-phase') {
            // Add phase variations
            phaseAvatars.push(theme.defaultAvatar + '🔥');
            phaseAvatars.push(theme.defaultAvatar + '⚡');
        }

        return {
            avatar: theme.defaultAvatar,
            background: theme.defaultBackground,
            phaseAvatars,
            attackAnimations: ['attack1.gif', 'attack2.gif'],
            defeatAnimation: 'defeat.gif',
            victoryAnimation: 'victory.gif'
        };
    }

    private static generateBossDialogue(theme: BossTheme): BossDialogue {
        return {
            intro: [`I am ${theme.name}, and you shall not pass!`],
            taunts: ['Is that all you\'ve got?', 'Pathetic!', 'You\'re wasting my time!'],
            phaseTransitions: ['You\'ve awakened my true power!', 'Phase 2 begins!'],
            lowHP: ['No... this cannot be!', 'You\'ve wounded me!'],
            victory: ['I... I am defeated...', 'You are stronger than I thought...'],
            defeat: ['Victory is mine!', 'You were no match for me!'],
            counterAttack: ['Take this!', 'My turn!'],
            specialMove: ['Special attack!', 'Ultimate move!']
        };
    }

    private static generateBossTimer(options: BossCreationOptions): BossTimer {
        return {
            duration: 3600, // 1 hour default
            countdown: 3600,
            warningThreshold: 300, // 5 minutes
            timeBonus: 100,
            timePenalty: 50
        };
    }

    private static generateWeaknesses(theme: BossTheme): string[] {
        const weaknesses: Record<string, string[]> = {
            'procrastination': ['motivation', 'focus', 'deadlines'],
            'complexity': ['simplification', 'planning', 'prioritization'],
            'perfectionism': ['acceptance', 'progress', 'learning'],
            'distraction': ['focus', 'environment', 'planning'],
            'overwhelm': ['delegation', 'prioritization', 'breaks'],
            'deadline': ['planning', 'early_start', 'time_management'],
            'mortgage': ['budgeting', 'planning', 'consistency']
        };
        return weaknesses[theme.id] || ['strategy', 'planning'];
    }

    private static generateResistances(theme: BossTheme): string[] {
        const resistances: Record<string, string[]> = {
            'procrastination': ['delay', 'excuses', 'tomorrow'],
            'complexity': ['overthinking', 'analysis_paralysis', 'confusion'],
            'perfectionism': ['criticism', 'failure', 'imperfection'],
            'distraction': ['interruptions', 'multitasking', 'noise'],
            'overwhelm': ['stress', 'anxiety', 'panic'],
            'deadline': ['rushing', 'panic', 'last_minute'],
            'mortgage': ['impulse', 'short_term_thinking', 'inconsistency']
        };
        return resistances[theme.id] || ['chaos', 'disorganization'];
    }

    private static generateSpecialAbilities(theme: BossTheme): string[] {
        const abilities: Record<string, string[]> = {
            'procrastination': ['Time Drain', 'Motivation Sap', 'Deadline Fear'],
            'complexity': ['Confusion Aura', 'Mental Drain', 'Analysis Paralysis'],
            'perfectionism': ['Impossible Standards', 'Self-Doubt', 'Perfection Paralysis'],
            'distraction': ['Focus Shatter', 'Attention Drain', 'Context Switch'],
            'overwhelm': ['Stress Surge', 'Anxiety Wave', 'Mental Collapse'],
            'deadline': ['Time Pressure', 'Panic Attack', 'Last Minute Rush'],
            'mortgage': ['Interest Accumulation', 'Payment Pressure', 'Financial Stress']
        };
        return abilities[theme.id] || ['Generic Attack', 'Status Effect'];
    }

    private static generateBossLore(theme: BossTheme): string {
        const loreTemplates: Record<string, string> = {
            'procrastination': 'Born from the collective procrastination of countless souls, this dragon has grown fat on wasted time and missed opportunities.',
            'complexity': 'A ancient hydra that feeds on confusion and complexity. Each head represents a different aspect of overwhelming challenges.',
            'perfectionism': 'A ghostly figure that haunts those who seek perfection, setting impossible standards that can never be met.',
            'distraction': 'A mischievous demon that thrives in the modern world of notifications, social media, and endless interruptions.',
            'overwhelm': 'A titan born from the collective stress of modern life, growing stronger with each task added to the pile.',
            'deadline': 'A timekeeper that grows more aggressive as deadlines approach, feeding on panic and last-minute stress.',
            'mortgage': 'A financial beast that represents the long-term commitments and planning required for major life decisions.'
        };
        return loreTemplates[theme.id] || 'A mysterious boss with unknown origins.';
    }
}

// Export utility functions
export function getAllBossThemes(): BossTheme[] {
    return Object.values(BOSS_THEMES);
}

export function getBossTheme(themeId: string): BossTheme | undefined {
    return BOSS_THEMES[themeId];
}

export function getAllBossTemplates(): any[] {
    return Object.values(BOSS_TEMPLATES);
}

export function getBossTemplate(templateId: string): any | undefined {
    return BOSS_TEMPLATES[templateId];
}

// Export the createBoss function directly
export function createBoss(options: BossCreationOptions): Boss {
    return BossFactory.createBoss(options);
}
