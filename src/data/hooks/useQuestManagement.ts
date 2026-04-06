import { useState, useEffect, useCallback } from 'react';
import type GamifiedObsidianPlugin from '../../core/main';
import { Quest, parseQuestsFromMarkdown } from '../../features/quests/utils/taskParser';
import { TFile, Notice } from 'obsidian';
import { awardQuestRewards, buildCompletionNoticeText } from '../../shared/utils/questCompletionPipeline';

export interface QuestFilters {
    search: string;
    completed?: boolean;
    difficulty?: string | string[];
    skills?: string[];
    tags?: string[];
    priority?: string | string[];
    dueDateRange?: { start: Date | null; end: Date | null };
    status?: string;
    favorites?: boolean;
}

export interface QuestSortOptions {
    field: 'due' | 'priority' | 'difficulty' | 'xp' | 'title';
    direction: 'asc' | 'desc';
}

let questCache: Quest[] | null = null;
let questCacheTime = 0;
const CACHE_TTL = 2000;

export const clearQuestCache = () => {
    questCache = null;
    questCacheTime = 0;
};

if (typeof window !== 'undefined') {
    // Expose cache clear helper on window without using 'any'
    (window as unknown as { clearQuestCache: () => void }).clearQuestCache = clearQuestCache;
}

export const useQuestManagement = (plugin: GamifiedObsidianPlugin) => {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<QuestFilters>({
        search: '',
        completed: undefined,
        difficulty: [],
        skills: [],
        tags: [],
        priority: [],
        dueDateRange: { start: null, end: null },
    });
    const [sortOptions, setSortOptions] = useState<QuestSortOptions>({
        field: 'due',
        direction: 'asc',
    });

    const loadQuests = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const now = Date.now();
            if (questCache && (now - questCacheTime) < CACHE_TTL) {
                setQuests(questCache);
                setLoading(false);
                return;
            }

            // First, try to resolve any explicitly-configured quest files directly by path.
            // This is much faster on large vaults than scanning every markdown file.
            const configuredQuestPaths = new Set<string>();
            const defaultQuestFilePath = plugin.settings?.defaultQuestFilePath || 'GamifiedTasks.md';
            if (defaultQuestFilePath) {
                configuredQuestPaths.add(defaultQuestFilePath);
            }
            (plugin.settings?.questSaveLocations ?? []).forEach(loc => {
                if (loc.filePath) {
                    configuredQuestPaths.add(loc.filePath);
                }
            });

            const questFilesByConfig: TFile[] = [];
            if (configuredQuestPaths.size > 0) {
                for (const path of configuredQuestPaths) {
                    const file = plugin.app.vault.getAbstractFileByPath(path);
                    if (file instanceof TFile) {
                        questFilesByConfig.push(file);
                    }
                }
            }

            let questFiles: TFile[] = [];

            if (questFilesByConfig.length > 0) {
                // Fast path: we have one or more explicitly configured quest files.
                questFiles = questFilesByConfig;
            } else {
                // Slow path: fall back to name-based discovery across all markdown files.
                const allMarkdownFiles = plugin.app.vault.getMarkdownFiles();

                // Base heuristic: any file whose name suggests it contains gamified tasks/quests
                questFiles = allMarkdownFiles.filter((file: TFile) =>
                    file.name.toLowerCase().includes('gamified') ||
                    file.name.toLowerCase().includes('quest') ||
                    file.name.toLowerCase().includes('task')
                );
            }

            if (questFiles.length === 0) {
                const defaultContent = '# Gamified Tasks\n\n<!-- Add your quests here -->\n';
                await plugin.app.vault.create('GamifiedTasks.md', defaultContent);
                setQuests([]);
                questCache = [];
                questCacheTime = Date.now();
                setLoading(false);
                return;
            }

            let allQuests: Quest[] = [];

            for (const file of questFiles) {
                try {
                    const content = await plugin.app.vault.read(file);
                    const parsedQuests = parseQuestsFromMarkdown(content);

                    parsedQuests.forEach(quest => {
                        quest.filePath = file.path;
                        if (!quest.id) {
                            quest.id = `${file.path}-${quest.title}`;
                        }
                    });

                    allQuests = [...allQuests, ...parsedQuests];
                } catch (err) {
                    console.error(`Failed to parse ${file.path}:`, err);
                }
            }

            questCache = allQuests;
            questCacheTime = Date.now();

            setQuests(allQuests);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load quests:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
        }
    }, [plugin.app.vault]);

    useEffect(() => {
        loadQuests();
    }, [loadQuests]);

    const getFilteredAndSortedQuests = useCallback((): Quest[] => {
        let filtered = [...quests];

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter((q: Quest) =>
                q.title.toLowerCase().includes(searchLower) ||
                q.description?.toLowerCase().includes(searchLower) ||
                q.skills?.some((s: string) => s.toLowerCase().includes(searchLower)) ||
                q.tags?.some((t: string) => t.toLowerCase().includes(searchLower))
            );
        }

        if (filters.completed !== undefined) {
            filtered = filtered.filter((q: Quest) => q.completed === filters.completed);
        }

        if (filters.difficulty) {
            const difficultyArray = Array.isArray(filters.difficulty) ? filters.difficulty : [filters.difficulty];
            if (difficultyArray.length > 0) {
                filtered = filtered.filter((q: Quest) =>
                    q.difficulty && difficultyArray.includes(q.difficulty.toLowerCase())
                );
            }
        }

        if (filters.skills && filters.skills.length > 0) {
            filtered = filtered.filter((q: Quest) =>
                q.skills?.some((skill: string) => filters.skills!.includes(skill))
            );
        }

        if (filters.tags && filters.tags.length > 0) {
            filtered = filtered.filter((q: Quest) =>
                q.tags?.some((tag: string) => filters.tags!.includes(tag))
            );
        }

        if (filters.priority) {
            const priorityArray = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
            if (priorityArray.length > 0) {
                filtered = filtered.filter((q: Quest) =>
                    q.priority && priorityArray.includes(q.priority.toLowerCase())
                );
            }
        }

        if (filters.dueDateRange?.start || filters.dueDateRange?.end) {
            filtered = filtered.filter((q: Quest) => {
                if (!q.due) return false;
                const dueDate = new Date(q.due);
                if (filters.dueDateRange!.start && dueDate < filters.dueDateRange!.start) return false;
                if (filters.dueDateRange!.end && dueDate > filters.dueDateRange!.end) return false;
                return true;
            });
        }

        filtered.sort((a, b) => {
            // Values used for sorting can be string or number depending on field
            let aVal: string | number | undefined = a[sortOptions.field] as string | number | undefined;
            let bVal: string | number | undefined = b[sortOptions.field] as string | number | undefined;

            if (aVal === undefined) aVal = sortOptions.field === 'xp' ? 0 : '';
            if (bVal === undefined) bVal = sortOptions.field === 'xp' ? 0 : '';

            if (sortOptions.field === 'xp') {
                // Ensure numeric comparison for XP
                const aNum = typeof aVal === 'number' ? aVal : Number(aVal || 0);
                const bNum = typeof bVal === 'number' ? bVal : Number(bVal || 0);
                return sortOptions.direction === 'asc' ? aNum - bNum : bNum - aNum;
            } else {
                const comparison = String(aVal).localeCompare(String(bVal));
                return sortOptions.direction === 'asc' ? comparison : -comparison;
            }
        });

        return filtered;
    }, [quests, filters, sortOptions]);

    const handleToggleSubtask = useCallback(async (questId: string, subtaskIndex: number) => {
        try {
            const quest = quests.find((q: Quest) => q.id === questId || q.title === questId);
            if (!quest || !quest.filePath) return;

            const file = plugin.app.vault.getAbstractFileByPath(quest.filePath);
            if (!(file instanceof TFile)) return;

            const content = await plugin.app.vault.read(file);
            const lines = content.split('\n');

            const questLineIndex = lines.findIndex((line: string) =>
                line.includes(quest.title) && line.includes('#gamified-task')
            );

            if (questLineIndex === -1) return;

            let currentSubtask = 0;
            for (let i = questLineIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                if (line.trim().startsWith('- [')) {
                    if (currentSubtask === subtaskIndex) {
                        if (line.includes('- [ ]')) {
                            lines[i] = line.replace('- [ ]', '- [x]');
                        } else if (line.includes('- [x]')) {
                            lines[i] = line.replace('- [x]', '- [ ]');
                        }
                        break;
                    }
                    currentSubtask++;
                } else if (!line.trim().startsWith(' ') && line.trim() !== '') {
                    break;
                }
            }

            // Persist the change to disk
            await plugin.app.vault.modify(file, lines.join('\n'));

            // Optimistically update quests state (and cache) without a full reload
            if (quest.subtasks && quest.subtasks.length > 0) {
                const updatedSubtasks = quest.subtasks.map((st, idx) =>
                    idx === subtaskIndex ? { ...st, completed: !st.completed } : st
                );

                setQuests(prev => {
                    const updated = prev.map(q =>
                        (q.id === quest.id || q.title === quest.title)
                            ? { ...q, subtasks: updatedSubtasks }
                            : q
                    );

                    // Keep cache in sync so subsequent loads see the change
                    questCache = updated;
                    questCacheTime = Date.now();

                    return updated;
                });
            } else {
                // No existing subtasks array on quest; just clear cache so next load picks it up
                clearQuestCache();
            }
        } catch (err) {
            console.error('Failed to toggle subtask:', err);
            new Notice('Failed to toggle subtask');
        }
    }, [quests, plugin.app.vault]);

    const handleCompleteQuest = useCallback(async (questId: string) => {
        try {
            const quest = quests.find((q: Quest) => q.id === questId || q.title === questId);
            if (!quest || !quest.filePath) return;

            const file = plugin.app.vault.getAbstractFileByPath(quest.filePath);
            if (!(file instanceof TFile)) return;

            const content = await plugin.app.vault.read(file);
            const lines = content.split('\n');

            const questLineIndex = lines.findIndex((line: string) =>
                line.includes(quest.title) && line.includes('#gamified-task')
            );

            if (questLineIndex !== -1) {
                lines[questLineIndex] = lines[questLineIndex].replace('- [ ]', '- [x]');
                await plugin.app.vault.modify(file, lines.join('\n'));

                const rewardResult = await awardQuestRewards(plugin.app.vault, quest, plugin.settings);
                new Notice(buildCompletionNoticeText(rewardResult, plugin.settings), 5000);

                // Optimistically update in-memory quests and cache instead of
                // re-parsing every quest file from disk.
                setQuests(prev => {
                    const updated = prev.map(q =>
                        (q.id === quest.id || q.title === quest.title)
                            ? { ...q, completed: true }
                            : q
                    );

                    questCache = updated;
                    questCacheTime = Date.now();

                    return updated;
                });
            }
        } catch (err) {
            console.error('Failed to complete quest:', err);
            new Notice('Failed to complete quest');
        }
    }, [quests, plugin.app.vault]);

    const handleUncompleteQuest = useCallback(async (questId: string) => {
        try {
            const quest = quests.find((q: Quest) => q.id === questId || q.title === questId);
            if (!quest || !quest.filePath) return;

            const file = plugin.app.vault.getAbstractFileByPath(quest.filePath);
            if (!(file instanceof TFile)) return;

            const content = await plugin.app.vault.read(file);
            const lines = content.split('\n');

            const questLineIndex = lines.findIndex((line: string) =>
                line.includes(quest.title) && line.includes('#gamified-task')
            );

            if (questLineIndex !== -1) {
                lines[questLineIndex] = lines[questLineIndex].replace('- [x]', '- [ ]');
                await plugin.app.vault.modify(file, lines.join('\n'));

                // Optimistically flip completion state in memory and cache.
                setQuests(prev => {
                    const updated = prev.map(q =>
                        (q.id === quest.id || q.title === quest.title)
                            ? { ...q, completed: false }
                            : q
                    );

                    questCache = updated;
                    questCacheTime = Date.now();

                    return updated;
                });
            }
        } catch (err) {
            console.error('Failed to uncomplete quest:', err);
            new Notice('Failed to uncomplete quest');
        }
    }, [quests, plugin.app.vault]);

    const handleToggleFavorite = useCallback(async (questId: string) => {
        console.log('Toggle favorite:', questId);
    }, []);

    const handleDeleteQuest = useCallback(async (questId: string) => {
        try {
            const quest = quests.find((q: Quest) => q.id === questId || q.title === questId);
            if (!quest || !quest.filePath) return;

            const file = plugin.app.vault.getAbstractFileByPath(quest.filePath);
            if (!(file instanceof TFile)) return;

            const content = await plugin.app.vault.read(file);
            const lines = content.split('\n');

            const questLineIndex = lines.findIndex((line: string) =>
                line.includes(quest.title) && line.includes('#gamified-task')
            );

            if (questLineIndex !== -1) {
                const linesToRemove = [questLineIndex];

                for (let i = questLineIndex + 1; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.trim().startsWith('  - [') || line.trim().startsWith('    ')) {
                        linesToRemove.push(i);
                    } else if (line.trim() !== '') {
                        break;
                    }
                }

                for (let i = linesToRemove.length - 1; i >= 0; i--) {
                    lines.splice(linesToRemove[i], 1);
                }

                await plugin.app.vault.modify(file, lines.join('\n'));

                new Notice('Quest deleted');

                // Remove the quest from in-memory state and keep cache in sync.
                setQuests(prev => {
                    const updated = prev.filter(q => !(q.id === quest.id || q.title === quest.title));
                    questCache = updated;
                    questCacheTime = Date.now();
                    return updated;
                });
            }
        } catch (err) {
            console.error('Failed to delete quest:', err);
            new Notice('Failed to delete quest');
        }
    }, [quests, plugin.app.vault]);

    const addQuestOptimistically = useCallback((quest: Partial<Quest> & { title: string; xp: number; cp: number }, filePath: string) => {
        const fullQuest: Quest = {
            ...quest,
            id: quest.id || `${filePath}-${quest.title}`,
            title: quest.title,
            className: quest.className || '',
            stats: quest.stats || [],
            xp: quest.xp ?? 0,
            cp: quest.cp ?? 0,
            coins: quest.coins ?? Math.round((quest.xp ?? 0) * 0.2),
            subtasks: quest.subtasks || [],
            completed: false,
            filePath,
        };
        setQuests(prev => {
            const updated = [...prev, fullQuest];
            questCache = updated;
            questCacheTime = Date.now();
            return updated;
        });
    }, []);

    const handleQuestDropOnFilter = useCallback(async (questId: string, filterType: string) => {
        try {
            const quest = quests.find((q: Quest) => q.id === questId || q.title === questId);
            if (!quest) {
                console.error(`Quest not found: ${questId}`);
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let needsDateUpdate = false;
            let newDueDate = quest.due || '';

            switch (filterType) {
                case 'today':
                    newDueDate = today.toISOString().split('T')[0];
                    needsDateUpdate = true;
                    break;
                case 'tomorrow': {
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    newDueDate = tomorrow.toISOString().split('T')[0];
                    needsDateUpdate = true;
                    break;
                }
                case 'overdue': {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    newDueDate = yesterday.toISOString().split('T')[0];
                    needsDateUpdate = true;
                    break;
                }
            }

            if (needsDateUpdate && quest.filePath) {
                const file = plugin.app.vault.getAbstractFileByPath(quest.filePath);
                if (!(file instanceof TFile)) return;

                const content = await plugin.app.vault.read(file);
                const lines = content.split('\n');

                const questLineIndex = lines.findIndex((line: string) =>
                    line.includes(quest.title) && line.includes('#gamified-task')
                );

                if (questLineIndex !== -1) {
                    let line = lines[questLineIndex];

                    if (line.includes('📅')) {
                        line = line.replace(/📅\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/, `📅${newDueDate}`);
                    } else {
                        line = `${line} 📅${newDueDate}`;
                    }

                    lines[questLineIndex] = line;
                    await plugin.app.vault.modify(file, lines.join('\n'));

                    clearQuestCache();
                    await loadQuests();
                    new Notice(`Quest moved to ${filterType}`);
                }
            }
        } catch (err) {
            console.error('Failed to update quest:', err);
            new Notice('Failed to update quest');
        }
    }, [quests, plugin.app.vault, loadQuests]);

    return {
        quests,
        loading,
        error,
        filters,
        sortOptions,
        setFilters,
        setSortOptions,
        getFilteredAndSortedQuests,
        handleToggleSubtask,
        handleCompleteQuest,
        handleUncompleteQuest,
        handleToggleFavorite,
        handleDeleteQuest,
        handleQuestDropOnFilter,
        loadQuests,
        addQuestOptimistically,
    };
};
