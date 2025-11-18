import { TFile, Vault, Notice } from 'obsidian';

// --- ✅ LOCAL TYPES ---
interface HabitReward {
    xp: number;
    cp: number;
    coins: number;
}

interface TreeMilestone {
    stage: number;
    streakRequired: number;
    name: string;
    description: string;
    reward: HabitReward;
    claimed: boolean;
}

export interface HabitData {
    id: string;
    name: string;
    description: string;
    emoji: string;
    color: string;
    streak: number;
    lastCompleted: string;
    reward: HabitReward;
    weeklyProgress: boolean[];
    totalCompletions: number;
    created: string;
    skill?: string;
    // New: allow multiple skills per habit while keeping legacy `skill` for compatibility
    skills?: string[];
    skillColor?: string;
    longestStreak?: number;
    completedDates?: string[];
    difficulty?: number;
    treeMilestones?: TreeMilestone[];
    currentTreeStage?: number;
}

// --- ✅ TREE MILESTONES ---
export const TREE_MILESTONES: TreeMilestone[] = [
    {
        stage: 1,
        streakRequired: 4,
        name: "🌱 Sprout",
        description: "Your habit is taking root!",
        reward: { xp: 50, cp: 25, coins: 15 },
        claimed: false
    },
    {
        stage: 2,
        streakRequired: 8,
        name: "🌿 Sapling",
        description: "Growing stronger each day!",
        reward: { xp: 100, cp: 50, coins: 30 },
        claimed: false
    },
    {
        stage: 3,
        streakRequired: 15,
        name: "🪴 Young Tree",
        description: "A healthy, growing habit!",
        reward: { xp: 200, cp: 100, coins: 60 },
        claimed: false
    },
    {
        stage: 4,
        streakRequired: 22,
        name: "🌳 Mature Tree",
        description: "Your habit is flourishing!",
        reward: { xp: 400, cp: 200, coins: 120 },
        claimed: false
    },
    {
        stage: 5,
        streakRequired: 30,
        name: "🌳✨ World Tree",
        description: "Legendary habit mastery!",
        reward: { xp: 800, cp: 400, coins: 250 },
        claimed: false
    }
];

// --- ✅ TREE FUNCTIONS ---
export const getTreeStageForStreak = (streak: number): number => {
    if (streak >= 30) return 5;
    if (streak >= 22) return 4;
    if (streak >= 15) return 3;
    if (streak >= 8) return 2;
    if (streak >= 4) return 1;
    return 0;
};

export const getTreeMilestoneForStreak = (streak: number): TreeMilestone | null => {
    return TREE_MILESTONES.find(milestone => milestone.streakRequired === streak) || null;
};

export const checkAndUpdateTreeMilestones = (habit: HabitData): { newMilestones: TreeMilestone[], totalReward: HabitReward } => {
    const newMilestones: TreeMilestone[] = [];
    const totalReward = { xp: 0, cp: 0, coins: 0 };

    const currentStage = getTreeStageForStreak(habit.streak);

    // Initialize milestones if they don't exist
    if (!habit.treeMilestones) {
        habit.treeMilestones = TREE_MILESTONES.map(m => ({ ...m, claimed: false }));
    }

    // Check for new milestones
    habit.treeMilestones.forEach(milestone => {
        if (currentStage >= milestone.stage && !milestone.claimed) {
            newMilestones.push(milestone);
            milestone.claimed = true;

            // Add to total reward
            totalReward.xp += milestone.reward.xp;
            totalReward.cp += milestone.reward.cp;
            totalReward.coins += milestone.reward.coins;
        }
    });

    // Update current tree stage
    habit.currentTreeStage = currentStage;

    return { newMilestones, totalReward };
};

// --- ✅ CONSTANTS ---
export const HABIT_FILE_PATH = 'SkillTree/Habits.md';

export const DEFAULT_HABITS: HabitData[] = [
    {
        id: 'meditation',
        name: 'Morning meditation',
        description: 'Meditate for at least 10 minutes',
        emoji: '🧘',
        color: '#6bcf63',
        streak: 0,
        lastCompleted: '',
        reward: { xp: 15, cp: 10, coins: 5 },
        weeklyProgress: [false, false, false, false, false, false, false],
        totalCompletions: 0,
        created: new Date().toISOString().split('T')[0],
        skill: 'Monk',
        skillColor: '#9b59b6',
        longestStreak: 0,
        completedDates: [],
        difficulty: 2
    },
    {
        id: 'reading',
        name: 'Read for 30 minutes',
        description: 'Read any book, article, or educational content',
        emoji: '📚',
        color: '#4fa8f4',
        streak: 0,
        lastCompleted: '',
        reward: { xp: 20, cp: 15, coins: 8 },
        weeklyProgress: [false, false, false, false, false, false, false],
        totalCompletions: 0,
        created: new Date().toISOString().split('T')[0],
        skill: 'Scholar',
        skillColor: '#3498db',
        longestStreak: 0,
        completedDates: [],
        difficulty: 1
    },
    {
        id: 'exercise',
        name: 'Exercise',
        description: 'Any form of physical activity for 20+ minutes',
        emoji: '💪',
        color: '#ff8c42',
        streak: 0,
        lastCompleted: '',
        reward: { xp: 25, cp: 20, coins: 10 },
        weeklyProgress: [false, false, false, false, false, false, false],
        totalCompletions: 0,
        created: new Date().toISOString().split('T')[0],
        skill: 'Body Builder',
        skillColor: '#e74c3c',
        longestStreak: 0,
        completedDates: [],
        difficulty: 3
    }
];

// --- ✅ PARSE FUNCTIONS ---
export const parseHabitsFromMarkdown = (content: string): HabitData[] => {
    const habits: HabitData[] = [];
    const habitBlocks = content.split('## ').filter(block => block.trim());

    habitBlocks.forEach(block => {
        const lines = block.split('\n');
        const titleLine = lines[0];
        if (!titleLine) return;

        const habit: Partial<HabitData> = {
            weeklyProgress: [false, false, false, false, false, false, false],
            completedDates: [],
            longestStreak: 0,
            difficulty: 1
        };

        const titleMatch = titleLine.match(/^(\S+)\s+(.+)$/);
        if (titleMatch) {
            habit.emoji = titleMatch[1];
            habit.name = titleMatch[2];
        }

        lines.forEach(line => {
            if (line.startsWith('- **ID**:')) habit.id = line.split(':')[1]?.trim();
            if (line.startsWith('- **Description**:')) habit.description = line.split(':')[1]?.trim();
            if (line.startsWith('- **Color**:')) habit.color = line.split(':')[1]?.trim();
            if (line.startsWith('- **Skill**:')) habit.skill = line.split(':')[1]?.trim();
            // New: parse Skills array if present
            if (line.startsWith('- **Skills**:')) {
                const arrMatch = line.match(/\[(.*)\]/);
                if (arrMatch) {
                    const raw = arrMatch[1].trim();
                    if (raw.length > 0) {
                        const items = raw.split(',').map(item => item.trim().replace(/['"]/g, ''));
                        (habit as any).skills = items;
                        // For backward compatibility, set primary `skill` as first
                        if (!habit.skill && items.length > 0) {
                            habit.skill = items[0];
                        }
                    } else {
                        (habit as any).skills = [];
                    }
                }
            }
            if (line.startsWith('- **SkillColor**:')) habit.skillColor = line.split(':')[1]?.trim();
            if (line.startsWith('- **Difficulty**:')) habit.difficulty = parseInt(line.split(':')[1]?.trim()) || 1;
            if (line.startsWith('- **LongestStreak**:')) habit.longestStreak = parseInt(line.split(':')[1]?.trim()) || 0;
            if (line.startsWith('- **Streak**:')) {
                const streakMatch = line.match(/🔥\s*(\d+)/);
                habit.streak = streakMatch ? parseInt(streakMatch[1]) : 0;
            }
            if (line.startsWith('- **LastCompleted**:')) habit.lastCompleted = line.split(':')[1]?.trim();
            if (line.startsWith('- **Reward**:')) {
                const rewardMatch = line.match(/⭐\s*(\d+)\s*✨\s*(\d+)\s*🪙\s*(\d+)/);
                if (rewardMatch) {
                    habit.reward = {
                        xp: parseInt(rewardMatch[1]),
                        cp: parseInt(rewardMatch[2]),
                        coins: parseInt(rewardMatch[3])
                    };
                }
            }
            if (line.startsWith('- **TotalCompletions**:')) habit.totalCompletions = parseInt(line.split(':')[1]?.trim()) || 0;
            if (line.startsWith('- **Created**:')) habit.created = line.split(':')[1]?.trim();
            if (line.startsWith('- **WeeklyProgress**:')) {
                const progressMatch = line.match(/\[(.*)\]/);
                if (progressMatch) {
                    habit.weeklyProgress = progressMatch[1].split(',').map(item => item.trim() === 'true');
                }
            }
            if (line.startsWith('- **CompletedDates**:')) {
                const datesMatch = line.match(/\[(.*)\]/);
                if (datesMatch && datesMatch[1].trim()) {
                    habit.completedDates = datesMatch[1].split(',').map(date => date.trim().replace(/['"]/g, ''));
                }
            }
        });

        if (habit.id && habit.name) {
            habits.push(habit as HabitData);
        }
    });

    return habits;
};

// --- ✅ GENERATE MARKDOWN ---
export const generateHabitsMarkdown = (habits: HabitData[]): string => {
    let content = '# Habits\n\n';

    habits.forEach(habit => {
        content += `## ${habit.emoji} ${habit.name}\n`;
        content += `- **ID**: ${habit.id}\n`;
        content += `- **Description**: ${habit.description}\n`;
        content += `- **Color**: ${habit.color}\n`;
        // Always include legacy single Skill for backwards compatibility
        content += `- **Skill**: ${habit.skill || (habit.skills && habit.skills[0]) || habit.description}\n`;
        // New: write Skills array if available
        if (habit.skills && habit.skills.length > 0) {
            content += `- **Skills**: [${habit.skills.map(s => `"${s}"`).join(', ')}]\n`;
        }
        content += `- **SkillColor**: ${habit.skillColor || habit.color}\n`;
        content += `- **Difficulty**: ${habit.difficulty || 1}\n`;
        content += `- **Streak**: 🔥 ${habit.streak}\n`;
        content += `- **LongestStreak**: ${habit.longestStreak || habit.streak}\n`;
        content += `- **LastCompleted**: ${habit.lastCompleted}\n`;
        content += `- **Reward**: ⭐ ${habit.reward.xp} ✨ ${habit.reward.cp} 🪙 ${habit.reward.coins}\n`;
        content += `- **TotalCompletions**: ${habit.totalCompletions}\n`;
        content += `- **Created**: ${habit.created}\n`;
        content += `- **WeeklyProgress**: [${habit.weeklyProgress.join(', ')}]\n`;
        content += `- **CompletedDates**: [${(habit.completedDates || []).map(date => `"${date}"`).join(', ')}]\n\n`;
    });

    return content;
};

// --- ✅ FILE I/O ---
export const loadHabitsFromFile = async (vault: Vault): Promise<HabitData[]> => {
    try {
        const file = vault.getAbstractFileByPath(HABIT_FILE_PATH);
        if (file && file instanceof TFile) {
            const content = await vault.read(file);
            return parseHabitsFromMarkdown(content);
        } else {
            await saveHabitsToFile(vault, DEFAULT_HABITS);
            return DEFAULT_HABITS;
        }
    } catch (error) {
        console.error('Error loading habits:', error);
        return DEFAULT_HABITS;
    }
};

export const saveHabitsToFile = async (vault: Vault, habits: HabitData[]): Promise<void> => {
    const content = generateHabitsMarkdown(habits);
    try {
        const file = vault.getAbstractFileByPath(HABIT_FILE_PATH);
        if (file && file instanceof TFile) {
            await vault.modify(file, content);
        } else {
            await vault.create(HABIT_FILE_PATH, content);
        }
    } catch (error) {
        console.error('Error saving habits:', error);
        new Notice('Failed to save habits');
    }
};

// --- ✅ UTILS ---
export const calculateStreak = (habit: HabitData, completedToday: boolean): number => {
    if (completedToday) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (habit.lastCompleted === yesterdayStr || habit.streak === 0) {
            return habit.streak + 1;
        } else {
            return 1; // Reset streak if not consecutive
        }
    }
    return habit.streak;
};

export const isCompletedToday = (habit: HabitData): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return habit.lastCompleted === today || (habit.completedDates || []).includes(today);
};

export const getStreakMultiplier = (streak: number): number => {
    return Math.floor(streak / 7) + 1; // Bonus every 7 days
};

// Additional utility functions for the gamified habits system
export const getSkillEmoji = (skillName: string): string => {
    const skillEmojis: { [key: string]: string } = {
        "Body Builder": "💪",
        "Scholar": "📚",
        "Monk": "🧘",
        "Crafter": "🔨",
        "Explorer": "🗺️",
        "Mystic": "🔮"
    };
    return skillEmojis[skillName] || "⭐";
};

export const getSkillColor = (skillName: string): string => {
    const skillColors: { [key: string]: string } = {
        "Body Builder": "#e74c3c",
        "Scholar": "#3498db",
        "Monk": "#9b59b6",
        "Crafter": "#f39c12",
        "Explorer": "#27ae60",
        "Mystic": "#8e44ad"
    };
    return skillColors[skillName] || "#666666";
};