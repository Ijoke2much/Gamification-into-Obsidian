import { Boss, BossProgress } from '../../../features/quests/types/BossTypes';
import { Quest } from '../../../features/quests/utils/taskParser';
import { bossManagementService } from '../../../features/quests/utils/bossManagementService';
import { Notice } from 'obsidian';

interface BossData {
    boss: Boss;
    quest: Quest;
    progress: BossProgress;
}

interface CustomBossData {
    name: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    imageType: 'emoji' | 'image';
    customImage?: string;
    background: string;
    stats: {
        maxHP: number;
        attack: number;
        defense: number;
        speed: number;
        specialAttack: number;
        specialDefense: number;
    };
    difficulty: number;
    theme: string;
    lore: string;
    questId?: string;
    customSubtasks: Array<{ text: string; completed: boolean }>;
    phases: Array<{
        name: string;
        description: string;
        hpThreshold: number;
        appearance: string;
    }>;
    weaknesses: string[];
    resistances: string[];
    specialAbilities: string[];
    rewards: {
        xp: number;
        cp: number;
        coins: number;
    };
}

export const createActiveBossFromCustom = (customBoss: CustomBossData): BossData => {
    // Generate unique ID first
    const bossId = `custom-${Date.now()}`;
    const questId = customBoss.questId || `${bossId}-quest`;

    // Create the boss object
    const boss: Boss = {
        id: bossId,
        name: customBoss.name,
        title: customBoss.title || 'Custom Boss',
        description: customBoss.description,
        category: customBoss.category as any,
        type: 'boss',
        visuals: {
            avatar: customBoss.imageType === 'image' ? '' : customBoss.icon,
            customImage: customBoss.imageType === 'image' ? customBoss.customImage : undefined,
            background: customBoss.background,
            phaseAvatars: [customBoss.icon, customBoss.icon, customBoss.icon],
            attackAnimations: ['✨', '💥', '⚡'],
            defeatAnimation: '💀',
            victoryAnimation: '🎉'
        },
        dialogue: {
            intro: [`I am ${customBoss.name}!`, 'Prepare for battle!'],
            taunts: ['You cannot defeat me!', 'Is that all you have?'],
            phaseTransitions: ['Entering next phase...', 'My power grows!'],
            lowHP: ['I am weakened...', 'This cannot be!'],
            victory: ['You have proven worthy...', 'Well fought, warrior.'],
            defeat: ['Victory is mine!', 'Try again, challenger.'],
            counterAttack: ['Take this!', 'Feel my power!'],
            specialMove: ['Behold my ultimate power!', 'Special attack!']
        },
        stats: {
            ...customBoss.stats,
            currentHP: customBoss.stats.maxHP
        },
        questId: questId,
        questTitle: customBoss.name + ' Challenge',
        estimatedDuration: getDurationFromDifficulty(customBoss.difficulty),
        currentPhase: 0,
        isDefeated: false,
        createdAt: new Date(),
        difficulty: getDifficultyLevel(customBoss.difficulty),
        theme: customBoss.theme || 'custom',
        lore: customBoss.lore,
        moves: [
            {
                name: 'Power Strike',
                description: 'A powerful basic attack',
                power: Math.floor(customBoss.stats.attack * 0.8),
                accuracy: 90,
                type: 'attack'
            },
            {
                name: 'Special Ability',
                description: 'A unique special attack',
                power: Math.floor(customBoss.stats.specialAttack * 0.9),
                accuracy: 85,
                type: 'special'
            }
        ],
        phases: customBoss.phases.map((phase, index) => ({
            phaseNumber: index + 1,
            phaseColor: getPhaseColor(index),
            phaseTransition: phase.description,
            bossDialogue: [`${phase.name} begins!`, phase.description],
            name: phase.name,
            description: phase.description,
            hpThreshold: phase.hpThreshold,
            moves: ['Power Strike', 'Special Ability'],
            appearance: phase.appearance
        })),
        weaknesses: customBoss.weaknesses.filter(w => w.trim()),
        resistances: customBoss.resistances.filter(r => r.trim()),
        specialAbilities: customBoss.specialAbilities.filter(a => a.trim()),
        rewards: {
            xp: customBoss.rewards.xp,
            cp: customBoss.rewards.cp,
            coins: customBoss.rewards.coins,
            materials: [
                { name: `${customBoss.name} Essence`, quantity: 1, rarity: 'rare' }
            ],
            lifeItems: [],
            achievements: [`${customBoss.name} Slayer`],
            titles: [`${customBoss.name} Conqueror`],
            bossMaterials: [`${customBoss.name} Fragment`],
            unlockables: []
        }
    };

    // Create the associated quest
    const quest: Quest = {
        id: questId,
        title: boss.questTitle,
        className: 'custom-challenge',
        stats: ['strength', 'endurance', 'focus'],
        xp: customBoss.rewards.xp,
        cp: customBoss.rewards.cp,
        coins: customBoss.rewards.coins,
        description: `A custom quest to defeat ${customBoss.name} and prove your worth as a challenger.`,
        subtasks: customBoss.customSubtasks.map((subtask, index) => ({
            text: subtask.text,
            completed: false,
            id: `subtask-${index}`
        })),
        completed: false,
        status: 'active',
        tags: ['custom', 'boss', 'challenge'],
        bossId: boss.id,
        priority: getDifficultyLevel(customBoss.difficulty) === 'hard' ? 'High' : 'Medium',
        difficulty: getDifficultyLevel(customBoss.difficulty) === 'easy' ? 'Easy' :
            getDifficultyLevel(customBoss.difficulty) === 'medium' ? 'Medium' : 'Hard',
        estimatedTime: boss.estimatedDuration
    };

    // Create the progress tracker
    const progress: BossProgress = {
        bossId: boss.id,
        questId: quest.id,
        currentHP: boss.stats.maxHP,
        maxHP: boss.stats.maxHP,
        phase: 1,
        lastUpdated: new Date(),
        isActive: true,
        timeSpent: 0,
        attempts: 0,
        bestDamage: 0,
        phaseProgress: [100, ...Array(customBoss.phases.length - 1).fill(0)],
        lastPhaseChange: new Date()
    };

    return { boss, quest, progress };
};

export const saveAndActivateBoss = (customBoss: CustomBossData): boolean => {
    try {
        // Create active boss data
        const bossData = createActiveBossFromCustom(customBoss);

        // Save to boss management service (this makes it appear in the boss selection)
        bossManagementService.getActiveBosses(); // Initialize service if needed

        // Manually add to the service's active bosses
        // Note: We're directly manipulating the service's state since there's no public method to add bosses
        const serviceState = (bossManagementService as any).state;
        if (serviceState && serviceState.activeBosses) {
            serviceState.activeBosses.set(bossData.boss.id, {
                boss: bossData.boss,
                quest: bossData.quest,
                progress: bossData.progress
            });

            // Trigger save to storage
            (bossManagementService as any).saveToStorage();
        }

        new Notice(`Boss "${customBoss.name}" created and activated successfully!`);
        return true;
    } catch (error) {
        console.error('Failed to create active boss:', error);
        new Notice('Failed to create active boss');
        return false;
    }
};

const getDurationFromDifficulty = (difficulty: number): string => {
    if (difficulty <= 3) return '1 hour';
    if (difficulty <= 6) return '3 hours';
    if (difficulty <= 8) return '1 day';
    return '1 week';
};

const getDifficultyLevel = (difficulty: number): 'easy' | 'medium' | 'hard' | 'epic' | 'legendary' => {
    if (difficulty <= 3) return 'easy';
    if (difficulty <= 6) return 'medium';
    if (difficulty <= 8) return 'hard';
    if (difficulty <= 9) return 'epic';
    return 'legendary';
};

const getPhaseColor = (index: number): string => {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];
    return colors[index % colors.length];
};