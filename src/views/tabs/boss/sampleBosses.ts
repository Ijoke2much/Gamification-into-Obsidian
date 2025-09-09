import { Boss, BossProgress } from '../../../features/quests/types/BossTypes';
import { Quest } from '../../../features/quests/utils/taskParser';

interface BossData {
    boss: Boss;
    quest: Quest;
    progress: BossProgress;
}

export const createSampleBosses = (): BossData[] => {
    const sampleBosses: BossData[] = [];

    // Sample Boss 1: Procrastination Dragon
    const procrastinationBoss: BossData = {
        boss: {
            id: 'procrastination-dragon-001',
            name: 'Procrastination Dragon',
            title: 'The Time Thief',
            description: 'A fearsome dragon that feeds on your delayed tasks and grows stronger with each postponed deadline.',
            category: 'multi-phase',
            type: 'boss',
            visuals: {
                avatar: '🐉',
                background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
                phaseAvatars: ['🐉', '🔥', '⚡'],
                attackAnimations: ['fire-breath', 'wing-blast', 'tail-swipe'],
                defeatAnimation: 'collapse',
                victoryAnimation: 'fade'
            },
            dialogue: {
                intro: ['I am the Procrastination Dragon!', 'Your delays feed my power!'],
                taunts: ['Another task postponed?', 'Time is my ally!'],
                phaseTransitions: ['You think you can defeat me?', 'My power grows!'],
                lowHP: ['No... not like this...', 'I will return stronger!'],
                victory: ['You have defeated me...', 'But procrastination never dies!'],
                defeat: ['Victory is mine!', 'Your tasks will wait forever!'],
                counterAttack: ['Feel my wrath!', 'Time is on my side!'],
                specialMove: ['Behold my ultimate power!', 'The Procrastination Storm!']
            },
            stats: {
                maxHP: 200,
                currentHP: 200,
                attack: 25,
                defense: 20,
                speed: 15,
                specialAttack: 30,
                specialDefense: 25
            },
            moves: [
                {
                    name: 'Time Drain',
                    type: 'special',
                    power: 35,
                    accuracy: 85,
                    description: 'Drains your motivation and time'
                },
                {
                    name: 'Motivation Sap',
                    type: 'status',
                    power: 0,
                    accuracy: 90,
                    description: 'Reduces your willpower to act'
                }
            ],
            questId: 'procrastination-quest-001',
            questTitle: 'Defeat Procrastination',
            estimatedDuration: '2 weeks',
            rewards: {
                xp: 150,
                cp: 30,
                coins: 75,
                materials: [
                    { name: 'Dragon Scale', quantity: 1, rarity: 'rare' },
                    { name: 'Time Crystal', quantity: 2, rarity: 'uncommon' }
                ],
                lifeItems: [],
                achievements: ['Procrastination Slayer'],
                titles: ['Time Master'],
                bossMaterials: ['Dragon Essence'],
                unlockables: []
            },
            phases: [
                {
                    name: 'Phase 1: Awakening',
                    description: 'The dragon stirs from its slumber',
                    hpThreshold: 100,
                    moves: ['Time Drain'],
                    appearance: '🐉',
                    phaseNumber: 1,
                    phaseColor: '#ff6b6b',
                    phaseTransition: 'The dragon awakens!',
                    bossDialogue: ['I sense your procrastination...']
                },
                {
                    name: 'Phase 2: Rage',
                    description: 'The dragon becomes enraged',
                    hpThreshold: 50,
                    moves: ['Time Drain', 'Motivation Sap'],
                    appearance: '🔥',
                    phaseNumber: 2,
                    phaseColor: '#ff8e53',
                    phaseTransition: 'The dragon enters a rage!',
                    bossDialogue: ['You dare challenge me?']
                }
            ],
            currentPhase: 0,
            isDefeated: false,
            createdAt: new Date(),
            difficulty: 'medium',
            theme: 'procrastination',
            weaknesses: ['focus', 'motivation'],
            resistances: ['procrastination'],
            specialAbilities: ['Time Manipulation'],
            lore: 'Born from centuries of human procrastination, this dragon grows stronger with each delayed task.'
        },
        quest: {
            id: 'procrastination-quest-001',
            title: 'Defeat the Procrastination Dragon',
            className: 'productivity',
            stats: ['focus', 'motivation', 'discipline'],
            xp: 150,
            cp: 30,
            coins: 75,
            description: 'A challenging quest to overcome procrastination and defeat the dragon that feeds on your delays.',
            subtasks: [
                { text: 'Complete 5 tasks without delay', completed: false },
                { text: 'Set realistic deadlines for 3 projects', completed: false },
                { text: 'Create a daily routine and stick to it', completed: false },
                { text: 'Eliminate 3 major distractions', completed: false }
            ],
            completed: false,
            status: 'active',
            tags: ['productivity', 'challenge', 'boss']
        },
        progress: {
            bossId: 'procrastination-dragon-001',
            questId: 'procrastination-quest-001',
            currentHP: 200,
            maxHP: 200,
            phase: 1,
            lastUpdated: new Date(),
            isActive: true,
            timeSpent: 0,
            attempts: 0,
            bestDamage: 0,
            phaseProgress: [100, 0],
            lastPhaseChange: new Date()
        }
    };

    // Sample Boss 2: Complexity Kraken
    const complexityBoss: BossData = {
        boss: {
            id: 'complexity-kraken-001',
            name: 'Complexity Kraken',
            title: 'The Multi-Headed Monster',
            description: 'A terrifying kraken with multiple heads, each representing a different complex challenge you face.',
            category: 'multi-phase',
            type: 'epic-boss',
            visuals: {
                avatar: '🐙',
                background: 'linear-gradient(135deg, #4ecdc4, #45b7d1)',
                phaseAvatars: ['🐙', '🌊', '⚡'],
                attackAnimations: ['tentacle-whip', 'ink-cloud', 'depth-charge'],
                defeatAnimation: 'sink',
                victoryAnimation: 'float'
            },
            dialogue: {
                intro: ['I am the Complexity Kraken!', 'Each head represents a challenge!'],
                taunts: ['Too complex for you?', 'My heads are endless!'],
                phaseTransitions: ['You think you can handle this?', 'More complexity awaits!'],
                lowHP: ['The depths call me...', 'But complexity never dies!'],
                victory: ['You have simplified the impossible!', 'Complexity bows to clarity!'],
                defeat: ['The complexity overwhelms you!', 'You are lost in the depths!'],
                counterAttack: ['Feel the tentacles of complexity!', 'Drown in confusion!'],
                specialMove: ['Behold the storm of complexity!', 'The Multi-Head Assault!']
            },
            stats: {
                maxHP: 300,
                currentHP: 300,
                attack: 30,
                defense: 25,
                speed: 20,
                specialAttack: 35,
                specialDefense: 30
            },
            moves: [
                {
                    name: 'Confuse',
                    type: 'status',
                    power: 0,
                    accuracy: 95,
                    description: 'Confuses your thinking and planning'
                },
                {
                    name: 'Overwhelm',
                    type: 'attack',
                    power: 40,
                    accuracy: 80,
                    description: 'Overwhelms you with complexity'
                }
            ],
            questId: 'complexity-quest-001',
            questTitle: 'Tame the Complexity Kraken',
            estimatedDuration: '3 weeks',
            rewards: {
                xp: 200,
                cp: 40,
                coins: 100,
                materials: [
                    { name: 'Kraken Tentacle', quantity: 1, rarity: 'epic' },
                    { name: 'Depth Pearl', quantity: 3, rarity: 'rare' }
                ],
                lifeItems: [],
                achievements: ['Complexity Master'],
                titles: ['Clarity Seeker'],
                bossMaterials: ['Kraken Essence'],
                unlockables: []
            },
            phases: [
                {
                    name: 'Phase 1: Surface',
                    description: 'The kraken emerges from the depths',
                    hpThreshold: 100,
                    moves: ['Confuse'],
                    appearance: '🐙',
                    phaseNumber: 1,
                    phaseColor: '#4ecdc4',
                    phaseTransition: 'The kraken surfaces!',
                    bossDialogue: ['The depths reveal my power...']
                },
                {
                    name: 'Phase 2: Depths',
                    description: 'The kraken pulls you into the depths',
                    hpThreshold: 50,
                    moves: ['Confuse', 'Overwhelm'],
                    appearance: '🌊',
                    phaseNumber: 2,
                    phaseColor: '#45b7d1',
                    phaseTransition: 'The depths consume you!',
                    bossDialogue: ['Drown in complexity!']
                }
            ],
            currentPhase: 0,
            isDefeated: false,
            createdAt: new Date(),
            difficulty: 'hard',
            theme: 'complexity',
            weaknesses: ['clarity', 'simplification'],
            resistances: ['confusion'],
            specialAbilities: ['Multi-Head Coordination'],
            lore: 'A legendary kraken that represents the overwhelming complexity of modern challenges.'
        },
        quest: {
            id: 'complexity-quest-001',
            title: 'Tame the Complexity Kraken',
            className: 'problem-solving',
            stats: ['clarity', 'simplification', 'analysis'],
            xp: 200,
            cp: 40,
            coins: 100,
            description: 'A complex quest to simplify overwhelming challenges and tame the multi-headed kraken.',
            subtasks: [
                { text: 'Break down 3 complex problems into simple steps', completed: false },
                { text: 'Create clear documentation for 2 projects', completed: false },
                { text: 'Simplify 5 processes or workflows', completed: false },
                { text: 'Teach someone else a complex concept', completed: false }
            ],
            completed: false,
            status: 'active',
            tags: ['complexity', 'simplification', 'boss']
        },
        progress: {
            bossId: 'complexity-kraken-001',
            questId: 'complexity-quest-001',
            currentHP: 300,
            maxHP: 300,
            phase: 1,
            lastUpdated: new Date(),
            isActive: true,
            timeSpent: 0,
            attempts: 0,
            bestDamage: 0,
            phaseProgress: [100, 0],
            lastPhaseChange: new Date()
        }
    };

    // Sample Boss 3: Perfectionism Ghost
    const perfectionismBoss: BossData = {
        boss: {
            id: 'perfectionism-ghost-001',
            name: 'Perfectionism Ghost',
            title: 'The Impossible Standard',
            description: 'A ghostly figure that haunts you with thoughts of imperfection and impossibly high standards.',
            category: 'single-session',
            type: 'mini-boss',
            visuals: {
                avatar: '👻',
                background: 'linear-gradient(135deg, #a8e6cf, #dcedc1)',
                phaseAvatars: ['👻', '💀', '😱'],
                attackAnimations: ['haunt', 'whisper', 'fear'],
                defeatAnimation: 'vanish',
                victoryAnimation: 'fade'
            },
            dialogue: {
                intro: ['Nothing you do is ever good enough...', 'I am the voice of impossible standards.'],
                taunts: ['That\'s not perfect!', 'You could do better...'],
                phaseTransitions: ['Perfection is the only way!', 'Accept nothing less!'],
                lowHP: ['Maybe... good enough is okay...', 'Perfection is... just an ideal...'],
                victory: ['You have found peace with progress!', 'Done is better than perfect!'],
                defeat: ['You will never be good enough!', 'Perfection haunts you forever!'],
                counterAttack: ['Feel the weight of standards!', 'Nothing is ever perfect!'],
                specialMove: ['The impossible standard!', 'Perfect or nothing!']
            },
            stats: {
                maxHP: 150,
                currentHP: 150,
                attack: 20,
                defense: 15,
                speed: 25,
                specialAttack: 25,
                specialDefense: 20
            },
            moves: [
                {
                    name: 'Self-Doubt',
                    type: 'status',
                    power: 0,
                    accuracy: 95,
                    description: 'Fills you with doubt about your abilities'
                },
                {
                    name: 'Impossible Standards',
                    type: 'special',
                    power: 30,
                    accuracy: 85,
                    description: 'Sets standards too high to reach'
                }
            ],
            questId: 'perfectionism-quest-001',
            questTitle: 'Overcome Perfectionism',
            estimatedDuration: '1 week',
            rewards: {
                xp: 100,
                cp: 20,
                coins: 50,
                materials: [
                    { name: 'Peaceful Essence', quantity: 1, rarity: 'uncommon' },
                    { name: 'Progress Stone', quantity: 2, rarity: 'common' }
                ],
                lifeItems: [],
                achievements: ['Progress Over Perfection'],
                titles: ['Realistic Achiever'],
                bossMaterials: ['Ghost Essence'],
                unlockables: []
            },
            phases: [
                {
                    name: 'Phase 1: Whispers',
                    description: 'The ghost whispers doubts',
                    hpThreshold: 100,
                    moves: ['Self-Doubt'],
                    appearance: '👻',
                    phaseNumber: 1,
                    phaseColor: '#a8e6cf',
                    phaseTransition: 'The ghost whispers...',
                    bossDialogue: ['You could do better...']
                }
            ],
            currentPhase: 0,
            isDefeated: false,
            createdAt: new Date(),
            difficulty: 'easy',
            theme: 'perfectionism',
            weaknesses: ['progress', 'completion'],
            resistances: ['perfectionism'],
            specialAbilities: ['Standards Manipulation'],
            lore: 'A ghost born from the fears of never being good enough.'
        },
        quest: {
            id: 'perfectionism-quest-001',
            title: 'Overcome Perfectionism',
            className: 'mindset',
            stats: ['self-acceptance', 'progress', 'completion'],
            xp: 100,
            cp: 20,
            coins: 50,
            description: 'A quest to overcome perfectionism and embrace progress over perfection.',
            subtasks: [
                { text: 'Complete 3 tasks at "good enough" quality', completed: false },
                { text: 'Set realistic standards for 2 projects', completed: false },
                { text: 'Practice self-compassion for 1 week', completed: false }
            ],
            completed: false,
            status: 'active',
            tags: ['mindset', 'perfectionism', 'boss']
        },
        progress: {
            bossId: 'perfectionism-ghost-001',
            questId: 'perfectionism-quest-001',
            currentHP: 150,
            maxHP: 150,
            phase: 1,
            lastUpdated: new Date(),
            isActive: true,
            timeSpent: 0,
            attempts: 0,
            bestDamage: 0,
            phaseProgress: [100],
            lastPhaseChange: new Date()
        }
    };

    sampleBosses.push(procrastinationBoss, complexityBoss, perfectionismBoss);
    return sampleBosses;
};