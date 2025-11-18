import { useState, useEffect, useCallback } from 'react';
import type GamifiedObsidianPlugin from '../../core/main';
import { Quest, parseQuestsFromMarkdown } from '../../features/quests/utils/taskParser';
import { playerStore } from '../../shared/state/playerStore';
import { TFile, Notice } from 'obsidian';

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
    (window as any).clearQuestCache = clearQuestCache;
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

            const questFiles = plugin.app.vault.getMarkdownFiles().filter((file: TFile) =>
                file.name.toLowerCase().includes('gamified') ||
                file.name.toLowerCase().includes('quest') ||
                file.name.toLowerCase().includes('task')
            );

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
            let aVal: any = a[sortOptions.field];
            let bVal: any = b[sortOptions.field];

            if (aVal === undefined) aVal = sortOptions.field === 'xp' ? 0 : '';
            if (bVal === undefined) bVal = sortOptions.field === 'xp' ? 0 : '';

            if (sortOptions.field === 'xp') {
                return sortOptions.direction === 'asc' ? aVal - bVal : bVal - aVal;
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

            await plugin.app.vault.modify(file, lines.join('\n'));
            clearQuestCache();
            await loadQuests();
        } catch (err) {
            console.error('Failed to toggle subtask:', err);
            new Notice('Failed to toggle subtask');
        }
    }, [quests, plugin.app.vault, loadQuests]);

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

                const xp = quest.xp || 0;
                const coins = Math.round(xp * 0.2);
                
                await playerStore.addXP(xp);
                await playerStore.addCoins(coins);

                new Notice(`✅ Quest Complete! +${xp} XP, +${coins} coins`, 5000);
                
                clearQuestCache();
                await loadQuests();
            }
        } catch (err) {
            console.error('Failed to complete quest:', err);
            new Notice('Failed to complete quest');
        }
    }, [quests, plugin.app.vault, loadQuests]);

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
                
                clearQuestCache();
                await loadQuests();
            }
        } catch (err) {
            console.error('Failed to uncomplete quest:', err);
            new Notice('Failed to uncomplete quest');
        }
    }, [quests, plugin.app.vault, loadQuests]);

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
                clearQuestCache();
                await loadQuests();
            }
        } catch (err) {
            console.error('Failed to delete quest:', err);
            new Notice('Failed to delete quest');
        }
    }, [quests, plugin.app.vault, loadQuests]);

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
                case 'tomorrow':
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    newDueDate = tomorrow.toISOString().split('T')[0];
                    needsDateUpdate = true;
                    break;
                case 'overdue':
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    newDueDate = yesterday.toISOString().split('T')[0];
                    needsDateUpdate = true;
                    break;
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
    };
};
