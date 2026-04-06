import { TAbstractFile, TFile, TFolder, Vault, Notice, parseYaml, stringifyYaml } from 'obsidian';
import { getSkillMetadata } from '../../../shared/utils/skillDiscovery';

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
    // New: type of habit - build (do more) vs avoid (do less)
    habitType?: 'build' | 'avoid';
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
    // New: schedule configuration
    scheduleType?: 'daily' | 'weekly';
    /**
     * Days of week the habit should appear when scheduleType === 'weekly'
     * 0 = Sunday ... 6 = Saturday
     */
    scheduleDays?: number[];

    /**
     * Archived habits are hidden from all non-archived views.
     * Persisted in habit note frontmatter so Datacore + sidebar stay in sync.
     */
    archived?: boolean;
    archivedAt?: string; // local YYYY-MM-DD

    /**
     * Optional persistent ordering for drag-and-drop reordering.
     * Lower numbers appear earlier.
     */
    sortOrder?: number;

    /**
     * Canonical paths to progression notes, used by Datacore and reward pipelines.
     * These MUST be preserved when saving habit notes, or leveling will break.
     */
    skillPath?: string;
    classPath?: string;
    masterClassPath?: string;
    statPaths?: string[];
}

// --- ✅ DATE HELPERS ---
// Use local calendar dates (YYYY-MM-DD) so habit days reset at the user's local midnight
export const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
// Legacy single-file storage path
export const HABIT_FILE_PATH = 'SkillTree/Habits.md';
// New: per-habit folder storage (one note per habit)
export const HABITS_FOLDER_PATH = 'SkillTree/Habits';

export const DEFAULT_HABITS: HabitData[] = [
    {
        id: 'meditation',
        name: 'Morning meditation',
        description: 'Meditate for at least 10 minutes',
        emoji: '🧘',
        color: '#6bcf63',
        habitType: 'build',
        streak: 0,
        lastCompleted: '',
        reward: { xp: 15, cp: 10, coins: 5 },
        weeklyProgress: [false, false, false, false, false, false, false],
        totalCompletions: 0,
        created: getLocalDateString(),
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
        habitType: 'build',
        streak: 0,
        lastCompleted: '',
        reward: { xp: 20, cp: 15, coins: 8 },
        weeklyProgress: [false, false, false, false, false, false, false],
        totalCompletions: 0,
        created: getLocalDateString(),
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
        habitType: 'build',
        streak: 0,
        lastCompleted: '',
        reward: { xp: 25, cp: 20, coins: 10 },
        weeklyProgress: [false, false, false, false, false, false, false],
        totalCompletions: 0,
        created: getLocalDateString(),
        skill: 'Body Builder',
        skillColor: '#e74c3c',
        longestStreak: 0,
        completedDates: [],
        difficulty: 3
    }
];

// --- ✅ HELPERS ---
// Slugify a habit name into a safe filename fragment
const slugifyHabitName = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'habit';
};

// Safely extract YAML frontmatter from a markdown file
const extractFrontmatter = (content: string): { frontmatter: any | null; body: string } => {
    const fmRegex = /^---\n([\s\S]*?)\n---\n?/;
    const match = content.match(fmRegex);
    if (!match) {
        return { frontmatter: null, body: content };
    }
    const yamlText = match[1];
    let fm: any = null;
    try {
        fm = parseYaml(yamlText) || {};
    } catch (e) {
        console.error('Failed to parse habit frontmatter:', e);
        fm = null;
    }
    const body = content.slice(match[0].length);
    return { frontmatter: fm, body };
};

// Map HabitData -> plain JS object suitable for YAML frontmatter
const habitToFrontmatterObject = (habit: HabitData): any => {
    const obj: any = {
        habit: true,
        id: habit.id,
        name: habit.name,
        emoji: habit.emoji,
        description: habit.description,
        color: habit.color,
        type: habit.habitType || 'build',
        skill: habit.skill || (habit.skills && habit.skills[0]) || '',
        skills: habit.skills && habit.skills.length > 0 ? habit.skills : (habit.skill ? [habit.skill] : []),
        skillColor: habit.skillColor || habit.color,
        archived: habit.archived ?? false,
        archivedAt: habit.archivedAt,
        sortOrder: habit.sortOrder,
        skillPath: habit.skillPath,
        classPath: habit.classPath,
        masterClassPath: habit.masterClassPath,
        statPaths: habit.statPaths,
        difficulty: habit.difficulty || 1,
        rewardXP: habit.reward?.xp ?? 10,
        rewardCP: habit.reward?.cp ?? 5,
        rewardCoins: habit.reward?.coins ?? 2,
        streak: habit.streak ?? 0,
        longestStreak: habit.longestStreak ?? habit.streak ?? 0,
        lastCompleted: habit.lastCompleted ?? '',
        totalCompletions: habit.totalCompletions ?? (habit.completedDates?.length ?? 0),
        created: habit.created ?? getLocalDateString(),
        weeklyProgress: habit.weeklyProgress ?? [false, false, false, false, false, false, false],
        scheduleType: habit.scheduleType || 'daily',
        scheduleDays: habit.scheduleDays && habit.scheduleDays.length > 0
            ? habit.scheduleDays
            : [0, 1, 2, 3, 4, 5, 6],
        completedDates: habit.completedDates ?? [],
        treeMilestones: habit.treeMilestones ?? [],
        currentTreeStage: habit.currentTreeStage ?? getTreeStageForStreak(habit.streak ?? 0)
    };

    // Do not overwrite existing frontmatter with undefined values when merging.
    Object.keys(obj).forEach((k) => {
        if (obj[k] === undefined) delete obj[k];
    });
    return obj;
};

// Map YAML frontmatter object -> HabitData (with sensible defaults)
const frontmatterToHabit = (fm: any, fallbackId: string, filePath: string): HabitData | null => {
    if (!fm || fm.habit !== true) return null;

    const id: string = typeof fm.id === 'string' && fm.id.trim().length > 0 ? fm.id : fallbackId;
    const name: string = typeof fm.name === 'string' && fm.name.trim().length > 0 ? fm.name : fallbackId;

    const skill: string | undefined = typeof fm.skill === 'string' ? fm.skill : undefined;
    const skills: string[] | undefined = Array.isArray(fm.skills)
        ? fm.skills.map((s: any) => String(s))
        : (skill ? [skill] : undefined);

    const weeklyProgress: boolean[] = Array.isArray(fm.weeklyProgress)
        ? fm.weeklyProgress.map((v: any) => v === true)
        : [false, false, false, false, false, false, false];

    const completedDates: string[] = Array.isArray(fm.completedDates)
        ? fm.completedDates.map((d: any) => String(d))
        : [];

    const skillPath: string | undefined = typeof fm.skillPath === 'string' ? fm.skillPath : undefined;
    const classPath: string | undefined = typeof fm.classPath === 'string' ? fm.classPath : undefined;
    const masterClassPath: string | undefined = typeof fm.masterClassPath === 'string' ? fm.masterClassPath : undefined;
    const statPaths: string[] | undefined = Array.isArray(fm.statPaths)
        ? fm.statPaths.map((p: any) => String(p))
        : undefined;

    const scheduleType: 'daily' | 'weekly' =
        fm.scheduleType === 'weekly' || fm.scheduleType === 'daily' ? fm.scheduleType : 'daily';

    const scheduleDays: number[] = Array.isArray(fm.scheduleDays)
        ? fm.scheduleDays.map((n: any) => parseInt(String(n), 10)).filter((n: number) => !isNaN(n))
        : [0, 1, 2, 3, 4, 5, 6];

    const archived: boolean = fm.archived === true;
    const archivedAt: string | undefined = typeof fm.archivedAt === 'string' ? fm.archivedAt : undefined;
    const sortOrderRaw = (fm as any)?.sortOrder;
    const sortOrder: number | undefined = Number.isFinite(Number(sortOrderRaw)) ? Number(sortOrderRaw) : undefined;

    const rewardXP = typeof fm.rewardXP === 'number' ? fm.rewardXP : 10;
    const rewardCP = typeof fm.rewardCP === 'number' ? fm.rewardCP : 5;
    const rewardCoins = typeof fm.rewardCoins === 'number' ? fm.rewardCoins : 2;

    const streak = typeof fm.streak === 'number' ? fm.streak : calculateStreakFromCompletedDates(completedDates);
    const longestStreak = typeof fm.longestStreak === 'number'
        ? fm.longestStreak
        : streak;

    return {
        id,
        name,
        description: typeof fm.description === 'string' ? fm.description : '',
        emoji: typeof fm.emoji === 'string' ? fm.emoji : '⭐',
        color: typeof fm.color === 'string' ? fm.color : (fm.skillColor || '#666666'),
        habitType: fm.type === 'avoid' || fm.type === 'build' ? fm.type : 'build',
        streak,
        lastCompleted: typeof fm.lastCompleted === 'string' ? fm.lastCompleted : '',
        reward: {
            xp: rewardXP,
            cp: rewardCP,
            coins: rewardCoins,
        },
        weeklyProgress,
        totalCompletions: typeof fm.totalCompletions === 'number'
            ? fm.totalCompletions
            : completedDates.length,
        created: typeof fm.created === 'string' ? fm.created : getLocalDateString(),
        skill,
        skills,
        skillColor: typeof fm.skillColor === 'string' ? fm.skillColor : undefined,
        archived,
        archivedAt,
        sortOrder,
        skillPath,
        classPath,
        masterClassPath,
        statPaths,
        longestStreak,
        completedDates,
        difficulty: typeof fm.difficulty === 'number' ? fm.difficulty : 1,
        treeMilestones: Array.isArray(fm.treeMilestones) ? fm.treeMilestones as TreeMilestone[] : undefined,
        currentTreeStage: typeof fm.currentTreeStage === 'number'
            ? fm.currentTreeStage
            : getTreeStageForStreak(streak),
        scheduleType,
        scheduleDays
    };
};

// --- ✅ PARSE FUNCTIONS (LEGACY SINGLE-FILE FORMAT) ---
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
            difficulty: 1,
            habitType: 'build'
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
            if (line.startsWith('- **Type**:')) {
                const rawType = line.split(':')[1]?.trim();
                if (rawType === 'avoid' || rawType === 'build') {
                    habit.habitType = rawType;
                }
            }
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
            if (line.startsWith('- **ScheduleType**:')) {
                const raw = line.split(':')[1]?.trim();
                if (raw === 'daily' || raw === 'weekly') {
                    (habit as HabitData).scheduleType = raw;
                }
            }
            if (line.startsWith('- **ScheduleDays**:')) {
                const daysMatch = line.match(/\[(.*)\]/);
                if (daysMatch) {
                    const raw = daysMatch[1].trim();
                    if (raw.length > 0) {
                        const items = raw.split(',').map(item => parseInt(item.trim(), 10)).filter(n => !isNaN(n));
                        (habit as HabitData).scheduleDays = items;
                    }
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
        content += `- **Type**: ${habit.habitType || 'build'}\n`;
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
        // Schedule configuration – default to daily/all days if missing
        const scheduleType = habit.scheduleType || 'daily';
        const scheduleDays = habit.scheduleDays && habit.scheduleDays.length > 0
            ? habit.scheduleDays
            : [0, 1, 2, 3, 4, 5, 6];
        content += `- **ScheduleType**: ${scheduleType}\n`;
        content += `- **ScheduleDays**: [${scheduleDays.join(', ')}]\n`;
        content += `- **CompletedDates**: [${(habit.completedDates || []).map(date => `"${date}"`).join(', ')}]\n\n`;
    });

    return content;
};

// --- ✅ FILE I/O ---
export const loadHabitsFromFile = async (vault: Vault): Promise<HabitData[]> => {
    try {
        // Prefer new per-file folder format if available
        const folder = vault.getAbstractFileByPath(HABITS_FOLDER_PATH);
        if (folder && folder instanceof TFolder) {
            const habitFiles: TFile[] = [];
            Vault.recurseChildren(folder, (f: TAbstractFile) => {
                if (f instanceof TFile && f.extension === 'md') {
                    habitFiles.push(f);
                }
            });

            if (habitFiles.length > 0) {
                const loadedHabits: HabitData[] = [];
                // Stable deterministic backfill order
                habitFiles.sort((a, b) => a.path.localeCompare(b.path));
                let nextDefaultOrder = 10;

                for (const file of habitFiles) {
                    try {
                        const content = await vault.read(file);
                        const { frontmatter, body } = extractFrontmatter(content);

                        // Backfill sortOrder into frontmatter if missing/invalid (one-time migration)
                        if (frontmatter && typeof frontmatter === 'object') {
                            const existing = Number((frontmatter as any).sortOrder);
                            if (!Number.isFinite(existing)) {
                                (frontmatter as any).sortOrder = nextDefaultOrder;
                                nextDefaultOrder += 10;

                                try {
                                    const yaml = stringifyYaml(frontmatter);
                                    const nextContent = `---\n${yaml}---\n${body}`;
                                    await vault.modify(file, nextContent);
                                } catch (e) {
                                    console.warn('Failed to backfill sortOrder for habit:', file.path, e);
                                }
                            }
                        }

                        const habit = frontmatterToHabit(frontmatter, file.basename, file.path);
                        if (habit) {
                            loadedHabits.push(habit);
                        }
                    } catch (e) {
                        console.error('Failed to read habit file:', file.path, e);
                    }
                }

                if (loadedHabits.length > 0) {
                    return loadedHabits;
                }
            }
        }

        // Fallback to legacy single-file format
        const file = vault.getAbstractFileByPath(HABIT_FILE_PATH);
        if (file && file instanceof TFile) {
            const content = await vault.read(file);
            return parseHabitsFromMarkdown(content);
        } else {
            // Initialize default habits in legacy file if nothing exists
            await saveHabitsToFile(vault, DEFAULT_HABITS);
            return DEFAULT_HABITS;
        }
    } catch (error) {
        console.error('Error loading habits:', error);
        return DEFAULT_HABITS;
    }
};

import { showGameNotice } from '../../../shared/utils/noticeUtils';

export const saveHabitsToFile = async (vault: Vault, habits: HabitData[]): Promise<void> => {
    try {
        // Prefer writing to per-habit folder format
        let folder = vault.getAbstractFileByPath(HABITS_FOLDER_PATH);
        if (!folder) {
            // Create folder tree if it does not exist
            try {
                await vault.createFolder(HABITS_FOLDER_PATH);
                folder = vault.getAbstractFileByPath(HABITS_FOLDER_PATH);
            } catch (e) {
                console.error('Failed to create habits folder, falling back to legacy file:', e);
            }
        }

        if (folder && folder instanceof TFolder) {
            // Index existing habit files by id for updates
            const existingFiles: Record<string, TFile> = {};
            Vault.recurseChildren(folder, (f: TAbstractFile) => {
                if (f instanceof TFile && f.extension === 'md') {
                    existingFiles[f.path] = f;
                }
            });

            // Map existing files by frontmatter id where possible
            const filesById: Record<string, TFile> = {};
            for (const filePath of Object.keys(existingFiles)) {
                const file = existingFiles[filePath];
                try {
                    const content = await vault.read(file);
                    const { frontmatter } = extractFrontmatter(content);
                    if (frontmatter && typeof frontmatter.id === 'string') {
                        filesById[frontmatter.id] = file;
                    }
                } catch (e) {
                    console.error('Failed to inspect habit file for id:', file.path, e);
                }
            }

            // Remove habit notes that are no longer in the list (fixes "delete then habit comes back")
            const activeIds = new Set(habits.map((h) => h.id).filter((id) => typeof id === 'string' && id.trim().length > 0));
            for (const filePath of Object.keys(existingFiles)) {
                const file = existingFiles[filePath];
                try {
                    const content = await vault.read(file);
                    const { frontmatter } = extractFrontmatter(content);
                    if (
                        frontmatter &&
                        typeof frontmatter === 'object' &&
                        frontmatter.habit === true &&
                        typeof frontmatter.id === 'string' &&
                        !activeIds.has(frontmatter.id)
                    ) {
                        await vault.delete(file);
                        delete existingFiles[filePath];
                        const orphanedId = frontmatter.id as string;
                        if (filesById[orphanedId] === file) {
                            delete filesById[orphanedId];
                        }
                    }
                } catch (e) {
                    console.error('Failed to remove orphaned habit file:', file.path, e);
                }
            }

            // Write/update one file per habit
            for (const habit of habits) {
                // Preserve any existing frontmatter keys (especially canonical path fields),
                // and auto-fill missing path fields from Skill metadata when possible.
                const primarySkillName =
                    habit.skill ||
                    (habit.skills && habit.skills[0]) ||
                    habit.description ||
                    '';

                let skillPath = habit.skillPath;
                let classPath = habit.classPath;
                let masterClassPath = habit.masterClassPath;
                let statPaths = habit.statPaths;

                // We'll merge existing frontmatter below; these are only for new files
                // or if the habit object already carries them.

                const bodyLines: string[] = [];
                bodyLines.push(`## ${habit.emoji} ${habit.name}`);
                if (habit.description) {
                    bodyLines.push('');
                    bodyLines.push(habit.description);
                }

                let targetFile: TFile | null = null;
                if (filesById[habit.id]) {
                    targetFile = filesById[habit.id];
                } else {
                    const base = slugifyHabitName(habit.name);
                    let candidatePath = `${HABITS_FOLDER_PATH}/${base}.md`;
                    let i = 1;
                    while (vault.getAbstractFileByPath(candidatePath)) {
                        candidatePath = `${HABITS_FOLDER_PATH}/${base}-${i++}.md`;
                    }
                    // For new files, try to derive canonical paths immediately.
                    if ((!skillPath || !classPath || !masterClassPath || !statPaths) && primarySkillName) {
                        try {
                            const meta = await getSkillMetadata(vault, primarySkillName);
                            if (meta) {
                                if (!skillPath) skillPath = meta.filePath;
                                if (!classPath) classPath = meta.classPath;
                                if (!masterClassPath) masterClassPath = meta.masterClassPath;
                                if (!statPaths) statPaths = Object.values(meta.stats || {});
                            }
                        } catch (e) {
                            console.warn('Failed to derive skill paths for new habit:', habit.name, e);
                        }
                    }

                    const fmObjectNew = habitToFrontmatterObject({
                        ...habit,
                        skillPath,
                        classPath,
                        masterClassPath,
                        statPaths
                    });
                    const yamlNew = stringifyYaml(fmObjectNew);
                    const fileContentNew = `---\n${yamlNew}---\n${bodyLines.join('\n')}\n`;

                    targetFile = await vault.create(candidatePath, fileContentNew);
                }

                if (targetFile) {
                    // Merge with existing frontmatter so we NEVER wipe fields like skillPath/statPaths.
                    let existingFm: any = {};
                    try {
                        const existingContent = await vault.read(targetFile);
                        const { frontmatter } = extractFrontmatter(existingContent);
                        if (frontmatter && typeof frontmatter === 'object') {
                            existingFm = frontmatter;
                        }
                    } catch (e) {
                        console.warn('Failed to read existing habit file before update:', targetFile.path, e);
                    }

                    // If still missing, try to derive paths (but never overwrite existing).
                    if ((!existingFm.skillPath || !existingFm.classPath || !existingFm.masterClassPath || !existingFm.statPaths)
                        && (!skillPath || !classPath || !masterClassPath || !statPaths)
                        && primarySkillName) {
                        try {
                            const meta = await getSkillMetadata(vault, primarySkillName);
                            if (meta) {
                                if (!skillPath) skillPath = meta.filePath;
                                if (!classPath) classPath = meta.classPath;
                                if (!masterClassPath) masterClassPath = meta.masterClassPath;
                                if (!statPaths) statPaths = Object.values(meta.stats || {});
                            }
                        } catch (e) {
                            console.warn('Failed to derive skill paths for habit:', habit.name, e);
                        }
                    }

                    const fmObject = habitToFrontmatterObject({
                        ...habit,
                        skillPath: skillPath ?? existingFm.skillPath,
                        classPath: classPath ?? existingFm.classPath,
                        masterClassPath: masterClassPath ?? existingFm.masterClassPath,
                        statPaths: statPaths ?? existingFm.statPaths
                    });

                    const mergedFm = {
                        ...(existingFm || {}),
                        ...(fmObject || {})
                    };

                    const yaml = stringifyYaml(mergedFm);
                    const fileContent = `---\n${yaml}---\n${bodyLines.join('\n')}\n`;
                    await vault.modify(targetFile, fileContent);
                }
            }

            return;
        }

        // If folder does not exist and cannot be created, fall back to legacy single-file behavior
        const content = generateHabitsMarkdown(habits);
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
// Calculate current streak as the number of consecutive days ending at the
// most recent completion date (not necessarily today), using local calendar days.
export const calculateStreakFromCompletedDates = (completedDates?: string[]): number => {
    if (!completedDates || completedDates.length === 0) return 0;

    const datesSet = new Set(completedDates);
    let streak = 0;

    // Start from the latest completed date instead of always starting at "today"
    const sortedDates = [...completedDates].sort();
    const latestDateStr = sortedDates[sortedDates.length - 1];
    if (!latestDateStr) return 0;

    const cursor = new Date(latestDateStr + 'T00:00:00');
    let cursorStr = latestDateStr;

    while (datesSet.has(cursorStr)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        cursorStr = getLocalDateString(cursor);
    }

    return streak;
};

export const calculateStreak = (habit: HabitData, completedToday: boolean): number => {
    // Backwards-compatible wrapper: always compute streak from completedDates
    return calculateStreakFromCompletedDates(habit.completedDates || []);
};

export const isCompletedToday = (habit: HabitData): boolean => {
    const today = getLocalDateString();
    return habit.lastCompleted === today || (habit.completedDates || []).includes(today);
};

export const getStreakMultiplier = (streak: number): number => {
    return Math.floor(streak / 7) + 1; // Bonus every 7 days
};

// --- ✅ MIGRATION HELPERS ---
/**
 * Migrate from the legacy single-file habits format (SkillTree/Habits.md)
 * into the per-habit folder format (SkillTree/Habits/one-file-per-habit).
 *
 * This is safe to call multiple times; if the folder already contains habit
 * files, the function will exit without doing anything.
 */
export const migrateHabitsToPerFile = async (vault: Vault): Promise<void> => {
    try {
        const folder = vault.getAbstractFileByPath(HABITS_FOLDER_PATH);
        if (folder && folder instanceof TFolder) {
            // Folder already exists; if it has any markdown files, assume migration happened
            let hasFiles = false;
            Vault.recurseChildren(folder, (f: TAbstractFile) => {
                if (f instanceof TFile && f.extension === 'md') {
                    hasFiles = true;
                }
            });
            if (hasFiles) return;
        }

        const legacyFile = vault.getAbstractFileByPath(HABIT_FILE_PATH);
        if (!legacyFile || !(legacyFile instanceof TFile)) {
            // Nothing to migrate
            return;
        }

        // Ensure the folder exists
        let targetFolder = vault.getAbstractFileByPath(HABITS_FOLDER_PATH);
        if (!targetFolder) {
            try {
                await vault.createFolder(HABITS_FOLDER_PATH);
                targetFolder = vault.getAbstractFileByPath(HABITS_FOLDER_PATH);
            } catch (e) {
                console.error('Failed to create habits folder during migration:', e);
                return;
            }
        }
        if (!(targetFolder instanceof TFolder)) {
            return;
        }

        const raw = await vault.read(legacyFile);
        const legacyHabits = parseHabitsFromMarkdown(raw);
        if (!legacyHabits.length) return;

        for (const habit of legacyHabits) {
            const fmObject = habitToFrontmatterObject(habit);
            const yaml = stringifyYaml(fmObject);
            const bodyLines: string[] = [];
            bodyLines.push(`## ${habit.emoji} ${habit.name}`);
            if (habit.description) {
                bodyLines.push('');
                bodyLines.push(habit.description);
            }
            const content = `---\n${yaml}---\n${bodyLines.join('\n')}\n`;

            const base = slugifyHabitName(habit.name);
            let candidatePath = `${HABITS_FOLDER_PATH}/${base}.md`;
            let i = 1;
            while (vault.getAbstractFileByPath(candidatePath)) {
                candidatePath = `${HABITS_FOLDER_PATH}/${base}-${i++}.md`;
            }
            await vault.create(candidatePath, content);
        }
    } catch (e) {
        console.error('Error migrating habits to per-file format:', e);
    }
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