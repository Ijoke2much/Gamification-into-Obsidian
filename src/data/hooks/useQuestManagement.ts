import { useState, useCallback, useEffect, useRef } from "react";
import { TFile, Notice } from "obsidian";
import type GamifiedObsidianPlugin from "../../core/main";
import { Quest, parseQuestsFromMarkdown } from "../../features/quests/utils/taskParser";
import { distributeCPFromQuest } from "../../shared/utils/progressUpdater";

export interface QuestFilters {
    search: string;
    priority: string;
    difficulty: string;
    dueDate: string;
    status: string;
    skills: string[];
    favorites: boolean;
}

export interface QuestSortOptions {
    field: 'title' | 'priority' | 'difficulty' | 'due' | 'xp' | 'created' | 'modified';
    direction: 'asc' | 'desc';
}

export const useQuestManagement = (plugin: GamifiedObsidianPlugin) => {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadQuestsDebounceTimer, setLoadQuestsDebounceTimer] = useState<NodeJS.Timeout | null>(null);
    const isLoadingRef = useRef(false);
    const [filters, setFilters] = useState<QuestFilters>({
        search: '',
        priority: 'all',
        difficulty: 'all',
        dueDate: 'all',
        status: plugin.settings?.hideCompletedQuests ? 'active' : 'all',
        skills: [],
        favorites: false,
    });
    const [sortOptions, setSortOptions] = useState<QuestSortOptions>({
        field: 'priority',
        direction: 'desc',
    });

    // Load quests from file
    const loadQuests = useCallback(async () => {
        if (isLoadingRef.current) return; // Prevent multiple simultaneous loads

        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const questFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
            if (questFile instanceof TFile) {
                const content = await plugin.app.vault.read(questFile);
                const quests = await parseQuestsFromMarkdown(content);
                setQuests(quests);
            } else {
                // Create the file if it doesn't exist
                await plugin.app.vault.create("GamifiedTasks.md", "# Gamified Tasks\n\n");
                setQuests([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load quests');
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [plugin.app.vault]); // Remove loading dependency

    // Debounced version of loadQuests to prevent rapid successive calls
    const loadQuestsDebounced = useCallback(async () => {
        // Clear any existing timer
        if (loadQuestsDebounceTimer) {
            clearTimeout(loadQuestsDebounceTimer);
        }

        // Set a new timer
        const timer = setTimeout(() => {
            loadQuests();
        }, 300); // 300ms debounce

        setLoadQuestsDebounceTimer(timer);
    }, [loadQuests]); // Remove loadQuestsDebounceTimer dependency

    // Initialize data on component mount
    useEffect(() => {
        loadQuests();
    }, []); // Only run once on mount

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (loadQuestsDebounceTimer) {
                clearTimeout(loadQuestsDebounceTimer);
            }
        };
    }, []); // Remove loadQuestsDebounceTimer dependency

    // Helper function to get due date category
    const getDueDateCategory = useCallback((dueDate?: string) => {
        if (!dueDate) return "no-due";

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextTwoWeeks = new Date(today);
        nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);

        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        if (due.getTime() === today.getTime()) return "today";
        if (due.getTime() === tomorrow.getTime()) return "tomorrow";
        if (due.getTime() < today.getTime()) return "overdue";
        if (due.getTime() > today.getTime() && due.getTime() <= nextTwoWeeks.getTime()) return "upcoming";
        return "future";
    }, []);

    // Filter and sort quests
    const getFilteredAndSortedQuests = useCallback(() => {
        let filtered = quests;

        // Apply status filter first
        if (filters.status === 'active') {
            filtered = filtered.filter(q => !q.completed);
        } else if (filters.status === 'completed') {
            filtered = filtered.filter(q => q.completed);
        }

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(q =>
                q.title.toLowerCase().includes(searchLower) ||
                q.description?.toLowerCase().includes(searchLower) ||
                q.skills?.some(skill => skill.toLowerCase().includes(searchLower)) ||
                q.subtasks.some(st => st.text.toLowerCase().includes(searchLower))
            );
        }

        // Apply priority filter
        if (filters.priority !== "all") {
            filtered = filtered.filter(q => q.priority?.toLowerCase() === filters.priority);
        }

        // Apply difficulty filter
        if (filters.difficulty !== "all") {
            filtered = filtered.filter(q => q.difficulty?.toLowerCase() === filters.difficulty);
        }

        // Apply due date filter
        if (filters.dueDate !== "all") {
            filtered = filtered.filter(q => getDueDateCategory(q.due) === filters.dueDate);
        }

        // Apply skills filter
        if (filters.skills.length > 0) {
            filtered = filtered.filter(q =>
                q.skills?.some(skill => filters.skills.includes(skill))
            );
        }

        // Apply favorites filter
        if (filters.favorites) {
            filtered = filtered.filter(q => q.isFavorite);
        }

        // Sort quests
        filtered.sort((a, b) => {
            let aVal: string | number, bVal: string | number;

            switch (sortOptions.field) {
                case 'title':
                    aVal = a.title.toLowerCase();
                    bVal = b.title.toLowerCase();
                    break;
                case 'priority': {
                    const priorityOrder = { highest: 4, high: 3, medium: 2, low: 1 };
                    aVal = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
                    bVal = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] || 0;
                    break;
                }
                case 'difficulty': {
                    const difficultyOrder = { hard: 3, medium: 2, easy: 1 };
                    aVal = difficultyOrder[a.difficulty?.toLowerCase() as keyof typeof difficultyOrder] || 0;
                    bVal = difficultyOrder[b.difficulty?.toLowerCase() as keyof typeof difficultyOrder] || 0;
                    break;
                }
                case 'due':
                    aVal = a.due ? new Date(a.due).getTime() : Infinity;
                    bVal = b.due ? new Date(b.due).getTime() : Infinity;
                    break;
                case 'xp':
                    aVal = a.xp || 0;
                    bVal = b.xp || 0;
                    break;
                case 'created':
                    aVal = a.createdDate ? new Date(a.createdDate).getTime() : 0;
                    bVal = b.createdDate ? new Date(b.createdDate).getTime() : 0;
                    break;
                case 'modified':
                    aVal = a.lastModified ? new Date(a.lastModified).getTime() : 0;
                    bVal = b.lastModified ? new Date(b.lastModified).getTime() : 0;
                    break;
                default:
                    return 0;
            }

            if (sortOptions.direction === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });

        return filtered;
    }, [quests, filters, sortOptions, getDueDateCategory]);

    // Helper functions to get quests by status
    const getActiveQuests = useCallback(() => {
        return quests.filter(q => !q.completed);
    }, [quests]);

    const getCompletedQuests = useCallback(() => {
        return quests.filter(q => q.completed);
    }, [quests]);

    const getOverdueQuests = useCallback(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return quests.filter(q =>
            !q.completed &&
            q.due &&
            new Date(q.due) < today
        );
    }, [quests]);

    // Handle subtask toggle
    const handleToggleSubtask = useCallback(async (questTitle: string, subtaskIndex: number) => {
        try {
            const questFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
            if (questFile instanceof TFile) {
                const content = await plugin.app.vault.read(questFile);
                const lines = content.split("\n");

                // Find the quest and subtask
                const questIndex = lines.findIndex(line =>
                    line.includes(questTitle) && line.includes("#gamified-task")
                );

                if (questIndex !== -1) {
                    let subtaskCount = 0;
                    let subtaskLineIndex = -1;

                    // Find the specific subtask
                    for (let i = questIndex + 1; i < lines.length; i++) {
                        if (lines[i].match(/^(\s{2,}|\t+)- \[( |x)\]/)) {
                            if (subtaskCount === subtaskIndex) {
                                subtaskLineIndex = i;
                                break;
                            }
                            subtaskCount++;
                        } else if (!lines[i].trim() || lines[i].match(/^(\s{2,}|\t+)/)) {
                            continue;
                        } else {
                            break;
                        }
                    }

                    if (subtaskLineIndex !== -1) {
                        const isCompleted = lines[subtaskLineIndex].includes("[x]");
                        lines[subtaskLineIndex] = lines[subtaskLineIndex].replace(
                            isCompleted ? "[x]" : "[ ]",
                            isCompleted ? "[ ]" : "[x]"
                        );

                        await plugin.app.vault.modify(questFile, lines.join("\n"));

                        // Update local state instead of reloading all quests
                        setQuests(prevQuests =>
                            prevQuests.map(quest =>
                                quest.title === questTitle
                                    ? {
                                        ...quest,
                                        subtasks: quest.subtasks.map((subtask, index) =>
                                            index === subtaskIndex
                                                ? { ...subtask, completed: !subtask.completed }
                                                : subtask
                                        )
                                    }
                                    : quest
                            )
                        );
                    }
                }
            }
        } catch (err) {
            console.error("Failed to toggle subtask:", err);
            new Notice("Failed to toggle subtask");
        }
    }, [plugin.app.vault]);

    // Handle quest completion
    const handleCompleteQuest = useCallback(async (questTitle: string) => {
        try {
            const quest = quests.find(q => q.title === questTitle);
            if (!quest) return;

            // Mark quest as completed in file first
            const questFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
            if (questFile instanceof TFile) {
                const content = await plugin.app.vault.read(questFile);
                const lines = content.split("\n");

                const questIndex = lines.findIndex(line =>
                    line.includes(questTitle) && line.includes("#gamified-task")
                );

                if (questIndex !== -1) {
                    lines[questIndex] = lines[questIndex].replace("- [ ]", "- [x]");
                    await plugin.app.vault.modify(questFile, lines.join("\n"));

                    // Update quest object to completed for reward processing
                    const completedQuest = { ...quest, completed: true };

                    // Immediately update the local quest state to mark as completed
                    setQuests(prevQuests =>
                        prevQuests.map(q =>
                            q.title === questTitle
                                ? { ...q, completed: true }
                                : q
                        )
                    );

                    // Use penalty-aware quest completion
                    const { QuestPenaltyIntegration } = await import("../../features/quests/utils/questPenaltyIntegration");
                    const { processQuestRewards } = await import("../../features/quests/utils/questRewardsSystem");

                    // Process quest rewards (items) first
                    const rewardItems = await processQuestRewards(plugin.app, completedQuest);

                    // Complete quest with penalty checking
                    const penaltyResult = await QuestPenaltyIntegration.completeQuestWithPenaltyCheck(completedQuest);



                    // Show penalty messages if any
                    if (penaltyResult.messages.length > 0) {
                        penaltyResult.messages.forEach(message => {
                            new Notice(message, 6000);
                        });
                    }

                    // Show reward notification
                    const finalReward = penaltyResult.finalReward;
                    if (finalReward.xp > 0 || finalReward.cp > 0 || finalReward.coins > 0) {
                        const penaltyTag = penaltyResult.penaltyApplied ? " (Penalty Applied)" : "";
                        const rewardText = `+${finalReward.xp} XP, +${finalReward.cp} CP, +${finalReward.coins} coins${penaltyTag}`;

                        if (rewardItems.length > 0) {
                            // Enhanced notification with item details
                            const itemList = rewardItems.map(item =>
                                `${item.icon} ${item.name}${item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ''}`
                            ).join(', ');

                            new Notice(`🎉 Quest completed! ${rewardText} + ${rewardItems.length} item${rewardItems.length !== 1 ? 's' : ''}: ${itemList}`, 10000);

                            // Show individual item notifications for rare+ items
                            rewardItems.forEach(item => {
                                if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary') {
                                    const rarityColor = item.rarity === 'legendary' ? '🌟' :
                                        item.rarity === 'epic' ? '💫' : '✨';
                                    new Notice(`${rarityColor} ${item.icon} ${item.name} obtained! ${item.description}`, 8000);
                                }
                            });
                        } else {
                            new Notice(`✅ Quest completed! ${rewardText}!`, 6000);
                        }
                    }

                    // Distribute CP to Skills/Class/Master based on the quest's skills
                    try {
                        const skills = Array.isArray(completedQuest.skills) ? completedQuest.skills : [];
                        if (skills.length > 0 && finalReward.cp > 0) {
                            await distributeCPFromQuest(plugin.app.vault, {
                                skills,
                                stats: [],
                                cp: finalReward.cp,
                            });
                        }
                    } catch (distErr) {
                        console.error('[Quest] CP distribution failed:', distErr);
                    }

                    // Automatically check and update player level after quest completion
                    try {
                        const { checkAndFixPlayerLevel } = await import("../../shared/utils/progressUpdater");
                        const { playerStore } = await import("../../shared/state/playerStore");
                        const levelResult = await checkAndFixPlayerLevel(plugin.app.vault, playerStore);

                    } catch (levelErr) {
                        console.error('[Quest] Automatic level check failed:', levelErr);
                    }

                    // Reload quests to ensure file and state are in sync
                    await loadQuests();
                }
            }
        } catch (err) {
            console.error("Failed to complete quest:", err);
            new Notice("Failed to complete quest");
        }
    }, [quests, plugin, loadQuests]);

    // Handle quest uncompletion (mark as incomplete)
    const handleUncompleteQuest = useCallback(async (questTitle: string) => {
        try {
            const quest = quests.find(q => q.title === questTitle);
            if (!quest) return;

            // Mark quest as incomplete in file
            const questFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
            if (questFile instanceof TFile) {
                const content = await plugin.app.vault.read(questFile);
                const lines = content.split("\n");

                const questIndex = lines.findIndex(line =>
                    line.includes(questTitle) && line.includes("#gamified-task")
                );

                if (questIndex !== -1) {
                    lines[questIndex] = lines[questIndex].replace("- [x]", "- [ ]");
                    await plugin.app.vault.modify(questFile, lines.join("\n"));

                    // Immediately update the local quest state to mark as incomplete
                    setQuests(prevQuests =>
                        prevQuests.map(q =>
                            q.title === questTitle
                                ? { ...q, completed: false }
                                : q
                        )
                    );

                    new Notice(`Quest "${questTitle}" marked as incomplete`, 3000);
                }
            }
        } catch (err) {
            console.error("Failed to uncomplete quest:", err);
            new Notice("Failed to uncomplete quest");
        }
    }, [quests, plugin]);

    // Toggle quest favorite status
    const handleToggleFavorite = useCallback(async (questTitle: string) => {
        try {
            const questFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
            if (questFile instanceof TFile) {
                const content = await plugin.app.vault.read(questFile);
                const lines = content.split("\n");

                const questIndex = lines.findIndex(line =>
                    line.includes(questTitle) && line.includes("#gamified-task")
                );

                if (questIndex !== -1) {
                    const quest = quests.find(q => q.title === questTitle);
                    const isFavorite = quest?.isFavorite;

                    if (isFavorite) {
                        // Remove favorite metadata
                        lines[questIndex] = lines[questIndex].replace(/favorite:\s*true\s*[|,]?\s*/, '');
                        lines[questIndex] = lines[questIndex].replace(/starred:\s*true\s*[|,]?\s*/, '');
                    } else {
                        // Add favorite metadata
                        if (lines[questIndex].includes('//')) {
                            lines[questIndex] = lines[questIndex].replace('//', 'favorite: true | //');
                        } else {
                            lines[questIndex] += ' // favorite: true';
                        }
                    }

                    await plugin.app.vault.modify(questFile, lines.join("\n"));
                    await loadQuests();

                    new Notice(`Quest ${isFavorite ? 'removed from' : 'added to'} favorites!`);
                }
            }
        } catch (err) {
            console.error("Failed to toggle favorite:", err);
            new Notice("Failed to toggle favorite");
        }
    }, [quests, plugin.app.vault, loadQuests]);

    // Handle quest deletion with confirmation
    const handleDeleteQuest = useCallback(async (questTitle: string) => {
        // Show confirmation dialog
        const confirmed = await new Promise<boolean>((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.2s ease-out;
            `;

            dialog.innerHTML = `
                <style>
                    @keyframes modalSlideIn {
                        from { transform: scale(0.9) translateY(-10px); opacity: 0; }
                        to { transform: scale(1) translateY(0); opacity: 1; }
                    }
                </style>
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                    <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
                    <h3 style="margin: 0; color: var(--text-normal);">Delete Quest</h3>
                </div>
                <p style="margin: 0 0 20px 0; color: var(--text-muted); line-height: 1.4;">
                    Are you sure you want to delete "<strong style="color: var(--text-normal);">${questTitle}</strong>"?
                    <br><br>This action cannot be undone.
                </p>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="cancel-delete" style="
                        background: var(--background-secondary);
                        border: 1px solid var(--background-modifier-border);
                        color: var(--text-normal);
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        transition: all 0.2s ease;
                    ">Cancel</button>
                    <button id="confirm-delete" style="
                        background: #e74c3c;
                        border: 1px solid #c0392b;
                        color: white;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    ">Delete Quest</button>
                </div>
            `;

            modal.appendChild(dialog);
            document.body.appendChild(modal);

            // Add hover effects
            const cancelBtn = dialog.querySelector('#cancel-delete') as HTMLButtonElement;
            const confirmBtn = dialog.querySelector('#confirm-delete') as HTMLButtonElement;

            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = 'var(--background-modifier-hover)';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = 'var(--background-secondary)';
            });

            confirmBtn.addEventListener('mouseenter', () => {
                confirmBtn.style.background = '#c0392b';
                confirmBtn.style.transform = 'translateY(-1px)';
            });
            confirmBtn.addEventListener('mouseleave', () => {
                confirmBtn.style.background = '#e74c3c';
                confirmBtn.style.transform = 'translateY(0)';
            });

            // Handle responses
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });

            // Handle escape key
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', handleEscape);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEscape);

            // Handle backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            });
        });

        if (!confirmed) return;

        try {
            const questFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
            if (questFile instanceof TFile) {
                const content = await plugin.app.vault.read(questFile);
                const lines = content.split("\n");

                // Find the quest line
                const questIndex = lines.findIndex(line =>
                    line.includes(questTitle) && line.includes("#gamified-task")
                );

                if (questIndex !== -1) {
                    // Store deleted quest for potential undo
                    const deletedLines = [lines[questIndex]];
                    let nextIndex = questIndex + 1;

                    // Remove the quest line
                    lines.splice(questIndex, 1);

                    // Also remove any associated subtasks that follow
                    while (questIndex < lines.length) {
                        const line = lines[questIndex];
                        // Check if this is a subtask (indented bullet point) or description
                        if (line.match(/^(\s{2,}|\t+)- \[( |x)\]/) ||
                            line.match(/^(\s{2,}|\t+)💭/) ||
                            (line.trim() === "")) {
                            deletedLines.push(line);
                            lines.splice(questIndex, 1);
                        } else {
                            break; // Next quest or content found
                        }
                    }

                    await plugin.app.vault.modify(questFile, lines.join("\n"));

                    // Update local state to remove the quest
                    setQuests(prevQuests =>
                        prevQuests.filter(q => q.title !== questTitle)
                    );

                    // Show success notice with undo option
                    new Notice(`✅ Quest "${questTitle}" deleted successfully`, 4000);

                    // TODO: Implement undo functionality in future update
                    // For now, just show the success message

                } else {
                    new Notice(`Quest "${questTitle}" not found`, 3000);
                }
            }
        } catch (err) {
            console.error("Failed to delete quest:", err);
            new Notice("Failed to delete quest");
        }
    }, [plugin.app.vault]);

    // Update quest drop on filter
    const handleQuestDropOnFilter = useCallback(async (questId: string, filterType: string) => {
        try {
            const quest = quests.find(q => q.id === questId || q.title === questId);
            if (!quest) {
                console.error(`Quest not found: ${questId}`);
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let needsDateUpdate = false;
            let needsPriorityUpdate = false;
            let needsFavoriteUpdate = false;
            let newDueDate: string | undefined = quest.due;
            let newPriority: string | undefined = quest.priority;
            let newIsFavorite: boolean = quest.isFavorite || false;
            let updateMessage = '';

            // Helper function to format date consistently (avoid timezone issues)
            const formatDate = (date: Date): string => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            switch (filterType) {
                case "today": {
                    newDueDate = formatDate(today);
                    needsDateUpdate = true;
                    updateMessage = 'today';

                    break;
                }
                case "tomorrow": {
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    newDueDate = formatDate(tomorrow);
                    needsDateUpdate = true;
                    updateMessage = 'tomorrow';

                    break;
                }
                case "this-week": {
                    const thisWeek = new Date(today);
                    thisWeek.setDate(thisWeek.getDate() + 7);
                    newDueDate = formatDate(thisWeek);
                    needsDateUpdate = true;
                    updateMessage = 'this week';
                    break;
                }
                case "this-month": {
                    const thisMonth = new Date(today);
                    thisMonth.setMonth(thisMonth.getMonth() + 1);
                    newDueDate = formatDate(thisMonth);
                    needsDateUpdate = true;
                    updateMessage = 'this month';
                    break;
                }
                case "overdue": {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    newDueDate = formatDate(yesterday);
                    needsDateUpdate = true;
                    updateMessage = 'overdue';

                    break;
                }
                case "upcoming": {
                    const nextWeek = new Date(today);
                    nextWeek.setDate(nextWeek.getDate() + 14);
                    newDueDate = formatDate(nextWeek);
                    needsDateUpdate = true;
                    updateMessage = 'upcoming';
                    break;
                }
                case "no-due": {
                    newDueDate = undefined;
                    needsDateUpdate = true;
                    updateMessage = 'no due date';
                    break;
                }
                case "high": {
                    newPriority = 'High';
                    needsPriorityUpdate = true;
                    updateMessage = 'high priority';
                    break;
                }
                case "medium": {
                    newPriority = 'Medium';
                    needsPriorityUpdate = true;
                    updateMessage = 'medium priority';
                    break;
                }
                case "low": {
                    newPriority = 'Low';
                    needsPriorityUpdate = true;
                    updateMessage = 'low priority';
                    break;
                }
                case "favorites": {
                    newIsFavorite = true;
                    needsFavoriteUpdate = true;
                    updateMessage = 'favorites';
                    break;
                }
                default:
                    console.warn(`Unknown filter type: ${filterType}`);
                    return;
            }

            // Update the quest in the markdown file
            const questFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
            if (questFile instanceof TFile) {
                const content = await plugin.app.vault.read(questFile);
                const lines = content.split("\n");

                const questIndex = lines.findIndex(line =>
                    line.includes(quest.title) && line.includes("#gamified-task")
                );

                if (questIndex !== -1) {
                    let line = lines[questIndex];

                    // Update due date
                    if (needsDateUpdate) {
                        if (newDueDate) {
                            if (line.includes("📅")) {
                                // Replace existing date
                                line = line.replace(/📅\d{4}-\d{2}-\d{2}/, `📅${newDueDate}`);
                            } else {
                                // Add new date before #gamified-task
                                line = line.replace("#gamified-task", `📅${newDueDate} #gamified-task`);
                            }
                        } else {
                            // Remove date
                            line = line.replace(/📅\d{4}-\d{2}-\d{2}\s*/, "");
                        }
                    }

                    // Update priority
                    if (needsPriorityUpdate) {
                        // Remove existing priority emoji
                        line = line.replace(/🔺\[(\w+)\]\s*/, "");
                        // Add new priority before #gamified-task
                        line = line.replace("#gamified-task", `🔺[${newPriority}] #gamified-task`);
                    }

                    // Update favorite status by calling the existing favorite toggle function
                    if (needsFavoriteUpdate && newIsFavorite && !quest.isFavorite) {
                        // This will be handled after the file update by calling handleToggleFavorite
                        // We don't need to modify the markdown here since favorites are managed via the toggle function
                    }

                    lines[questIndex] = line;
                    await plugin.app.vault.modify(questFile, lines.join("\n"));

                    // Handle favorite toggle separately if needed
                    if (needsFavoriteUpdate && newIsFavorite && !quest.isFavorite) {
                        // Call the toggle favorite function after file update
                        setTimeout(() => handleToggleFavorite(quest.title), 100);
                    }

                    await loadQuests();

                    new Notice(`Quest "${quest.title}" moved to ${updateMessage}!`);

                }
            }
        } catch (error) {
            console.error("Error updating quest on filter drop:", error);
            new Notice("Failed to update quest");
        }
    }, [quests, plugin, loadQuests]);

    return {
        quests,
        loading,
        error,
        filters,
        sortOptions,
        setFilters,
        setSortOptions,
        loadQuests,
        loadQuestsDebounced,
        getFilteredAndSortedQuests,
        getDueDateCategory,
        getActiveQuests,
        getCompletedQuests,
        getOverdueQuests,
        handleToggleSubtask,
        handleCompleteQuest,
        handleUncompleteQuest,
        handleToggleFavorite,
        handleDeleteQuest,
        handleQuestDropOnFilter,
    };
};