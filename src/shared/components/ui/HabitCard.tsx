import { TFile, Vault, Notice } from 'obsidian';
import { showGameNotice } from '../../utils/noticeUtils';

// --- ✅ LOCAL TYPES ---
interface HabitReward {
    xp: number;
    cp: number;
    coins: number;
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
    skills?: string[];
    skillColor?: string;
    longestStreak?: number;
    completedDates?: string[];
    difficulty?: number;
}

// --- ✅ CONSTANTS ---
export const HABIT_FILE_PATH = 'SkillTree/Habits.md';

// --- ✅ DATE HELPER ---
// Local YYYY-MM-DD so habits reset at the user's local midnight
const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
        created: getLocalDateString()
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
        created: getLocalDateString()
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
        created: getLocalDateString()
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
            weeklyProgress: [false, false, false, false, false, false, false]
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
        content += `- **Streak**: 🔥 ${habit.streak}\n`;
        content += `- **LastCompleted**: ${habit.lastCompleted}\n`;
        content += `- **Reward**: ⭐ ${habit.reward.xp} ✨ ${habit.reward.cp} 🪙 ${habit.reward.coins}\n`;
        content += `- **TotalCompletions**: ${habit.totalCompletions}\n`;
        content += `- **Created**: ${habit.created}\n`;
        content += `- **WeeklyProgress**: [${habit.weeklyProgress.join(', ')}]\n\n`;
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
        showGameNotice('Failed to save habits');
    }
};

// --- ✅ UTILS ---
export const calculateStreak = (habit: HabitData, completedToday: boolean): number => {
    if (completedToday) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);

        if (habit.lastCompleted === yesterdayStr || habit.streak === 0) {
            return habit.streak + 1;
        } else {
            return 1;
        }
    }
    return habit.streak;
};

export const isCompletedToday = (habit: HabitData): boolean => {
    const today = getLocalDateString();
    return habit.lastCompleted === today;
};

export const getStreakMultiplier = (streak: number): number => {
    return Math.floor(streak / 7) + 1;
};
