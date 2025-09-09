import React, { useState, useEffect } from 'react';
import { Notice } from 'obsidian';
import { HabitData, getTreeStageForStreak, checkAndUpdateTreeMilestones, saveHabitsToFile, loadHabitsFromFile, calculateStreak, isCompletedToday } from '../../../features/habits/utils/habitsUtils';
import { calculateTreeRewards, DEFAULT_TREE_REWARD_CONFIG, getTreeItemDrop, checkSpecialBonuses } from '../../../features/habits/utils/treeRewardSystem';
import { SeasonalTreeEventManager } from '../../../features/habits/utils/seasonalTreeEvents';
import { TreeVisualEffectsManager } from '../../../features/habits/utils/treeVisualEffects';
import { PlayerData } from '../../../data/models/PlayerData';
import GamifiedObsidianPlugin from '../../../core/main';
import { updatePlayerData } from '../../../shared/utils/progressUpdater';
import { MaterialInventoryManager } from '../../../shared/services/materialInventoryManager';
import styles from './HabitsTab.module.css';

// Import the correct component name
import HabitForm from '../../../features/habits/modals/AddHabitForm';

// Import optimized icons
import { AddIcon, EditIcon, DeleteIcon } from '../../../shared/components/ui/OptimizedIcons';

// Tree stages - using PNG files
import treeStage1 from '../../../assets/trees/tree_stage_1.png';
import treeStage2 from '../../../assets/trees/tree_stage_2.png';
import treeStage3 from '../../../assets/trees/tree_stage_3.png';
import treeStage4 from '../../../assets/trees/tree_stage_4.png';
import treeStage5 from '../../../assets/trees/tree_stage_5.png';

// Tree stages
const treeStages = [treeStage1, treeStage2, treeStage3, treeStage4, treeStage5];

// Helper function to get next milestone text
function getNextMilestoneText(streak: number): string {
    if (streak >= 30) return "Max level reached! 🌳✨";
    if (streak >= 22) return "30 days for World Tree";
    if (streak >= 15) return "22 days for Mature Tree";
    if (streak >= 8) return "15 days for Young Tree";
    if (streak >= 4) return "8 days for Sapling";
    return "4 days for Sprout";
}


interface HabitFormData {
    name: string;
    skill: string;
    skillColor: string;
    difficulty: number;
    xpMultiplier: number;
    cpMultiplier: number;
    coinsMultiplier: number;
}

interface HabitsTabProps {
    plugin: GamifiedObsidianPlugin;
    playerData: PlayerData | null;
    reloadPlayerData: () => Promise<void>;
}

export const HabitsTab: React.FC<HabitsTabProps> = ({ plugin, playerData, reloadPlayerData }) => {
    const currencyName = plugin.settings.currencyName || "Coins";
    const currencySymbol = plugin.settings.currencySymbol || "🪙";
    const [habits, setHabits] = useState<HabitData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddHabit, setShowAddHabit] = useState(false);
    const [editingHabit, setEditingHabit] = useState<HabitData | null>(null);
    const [expandedHeatmaps, setExpandedHeatmaps] = useState<{[key: string]: boolean}>({});
    const [currentMonthOffset, setCurrentMonthOffset] = useState<{[key: string]: number}>({});
    const [treeSectionsOpen, setTreeSectionsOpen] = useState<{[key: string]: boolean}>({}); // Individual state for each habit
    const [treeRewards, setTreeRewards] = useState<{[habitId: string]: {
        xp: number;
        cp: number;
        coins: number;
    }}>({});
    const [persistentToggleStates, setPersistentToggleStates] = useState<{[key: string]: boolean}>({});
    const [activeEvents, setActiveEvents] = useState<any[]>([]);
    const [eventEffects, setEventEffects] = useState<any>(null);

    // Load habits on component mount
    useEffect(() => {
        const loadHabits = async () => {
            try {
                const loadedHabits = await loadHabitsFromFile(plugin.app.vault);
                setHabits(loadedHabits);
            } catch (error) {
                console.error('Error loading habits:', error);
                new Notice('Error loading habits');
            } finally {
                setLoading(false);
            }
        };
        loadHabits();
    }, [plugin]);

    // Load persistent toggle states from localStorage
    useEffect(() => {
        const loadToggleStates = () => {
            try {
                const savedStates = localStorage.getItem('gamified-habit-toggle-states');
                if (savedStates) {
                    const parsedStates = JSON.parse(savedStates);
                    setPersistentToggleStates(parsedStates);
                }
            } catch (error) {
                console.error('Error loading toggle states:', error);
            }
        };
        loadToggleStates();
    }, []);

    // Save toggle states to localStorage whenever they change
    useEffect(() => {
        if (Object.keys(persistentToggleStates).length > 0) {
            localStorage.setItem('gamified-habit-toggle-states', JSON.stringify(persistentToggleStates));
        }
    }, [persistentToggleStates]);

    // Load persistent tree section states from localStorage
    useEffect(() => {
        const loadTreeSectionStates = () => {
            try {
                const savedStates = localStorage.getItem('gamified-tree-section-states');
                if (savedStates) {
                    const parsedStates = JSON.parse(savedStates);
                    // Validate that parsedStates is an object with boolean values
                    if (parsedStates && typeof parsedStates === 'object') {
                
                        setTreeSectionsOpen(parsedStates);
                    }
                }
            } catch (error) {
                console.error('Error loading tree section states:', error);
                // Clear corrupted data
                localStorage.removeItem('gamified-tree-section-states');
            }
        };
        loadTreeSectionStates();
    }, []);

    // Save tree section states to localStorage whenever they change
    useEffect(() => {
        if (Object.keys(treeSectionsOpen).length > 0) {
            localStorage.setItem('gamified-tree-section-states', JSON.stringify(treeSectionsOpen));
        }
    }, [treeSectionsOpen]);

    // Initialize seasonal events and check for active events
    useEffect(() => {
        const initializeEvents = () => {
            SeasonalTreeEventManager.initializeEvents();
            const events = SeasonalTreeEventManager.getActiveEvents();
            const effects = SeasonalTreeEventManager.getActiveEventEffects();
            
            setActiveEvents(events);
            setEventEffects(effects);
            
            // Check for newly active events and notify
            SeasonalTreeEventManager.checkAndNotifyActiveEvents();
        };

        initializeEvents();
        
        // Check for event changes every hour
        const eventCheckInterval = setInterval(initializeEvents, 60 * 60 * 1000);
        
        return () => clearInterval(eventCheckInterval);
    }, []);

    // Periodic event check (every 10 minutes for more responsive event activation)
    useEffect(() => {
        const quickEventCheck = () => {
            const events = SeasonalTreeEventManager.getActiveEvents();
            const effects = SeasonalTreeEventManager.getActiveEventEffects();
            
            if (events.length !== activeEvents.length || 
                JSON.stringify(effects) !== JSON.stringify(eventEffects)) {
                setActiveEvents(events);
                setEventEffects(effects);
                SeasonalTreeEventManager.checkAndNotifyActiveEvents();
            }
        };

        const quickCheckInterval = setInterval(quickEventCheck, 10 * 60 * 1000);
        return () => clearInterval(quickCheckInterval);
    }, [activeEvents, eventEffects]);

    // Apply seasonal effects to all visible trees when events change
    useEffect(() => {
        if (activeEvents.length > 0) {
            habits.forEach(habit => {
                const treeElement = document.getElementById(`tree-${habit.id}`);
                if (treeElement && treeSectionsOpen[habit.id]) {
                    TreeVisualEffectsManager.applySeasonalEffects(treeElement, activeEvents);
                }
            });
        }
    }, [activeEvents, treeSectionsOpen, habits]);

    // Initialize tree sections for new habits (only if not already saved)
    useEffect(() => {
        if (habits.length > 0) {
            const initialTreeStates: {[key: string]: boolean} = {};
            habits.forEach(habit => {
                // Only initialize if this habit is not already in the saved state
                if (!(habit.id in treeSectionsOpen)) {
                    initialTreeStates[habit.id] = false; // Default to closed for new habits
                }
            });
            if (Object.keys(initialTreeStates).length > 0) {
                setTreeSectionsOpen(prev => ({ ...prev, ...initialTreeStates }));
            }
        }
    }, [habits, treeSectionsOpen]);

    // Calculate tree rewards for each habit
    useEffect(() => {
        if (habits.length > 0) {
            const newTreeRewards: {[habitId: string]: { xp: number; cp: number; coins: number }} = {};
            habits.forEach(habit => {
                const completedToday = isCompletedToday(habit);
                const streak = calculateStreak(habit, completedToday);
                const treeStage = getTreeStageForStreak(streak);
                if (treeStage > 0) {
                    const baseReward = habit.reward || { xp: 10, cp: 5, coins: 25 };
                    const rewards = calculateTreeRewards(
                        baseReward.xp, 
                        baseReward.cp, 
                        baseReward.coins, 
                        treeStage, 
                        DEFAULT_TREE_REWARD_CONFIG
                    );
                    newTreeRewards[habit.id] = rewards;
                }
            });
            setTreeRewards(newTreeRewards);
        }
    }, [habits]);

    // Generate weekly view for a habit
    const generateWeeklyView = (completedDates: string[]) => {
        const today = new Date();
        const weekDays = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const isCompleted = completedDates.includes(dateStr);
            
            weekDays.push({
                date: dateStr,
                dayName,
                isCompleted,
                isToday: i === 0
            });
        }
        
        return weekDays;
    };

    // Generate scrollable heatmap data for months
    const generateScrollableHeatmapData = (completedDates: string[], habitId: string) => {
        const monthOffset = currentMonthOffset[habitId] || 0;
        const months = [];
        const now = new Date();
        
        // Generate 3 months: current month + next 2 months
        for (let i = 0; i < 3; i++) {
            // Calculate the correct month and year (current month + offset + i months ahead)
            const totalMonthsAhead = monthOffset + i;
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            
            let targetYear = currentYear;
            let targetMonth = currentMonth + totalMonthsAhead;
            
            // Handle year rollover
            while (targetMonth >= 12) {
                targetMonth -= 12;
                targetYear += 1;
            }
            
            const monthDate = new Date(targetYear, targetMonth, 1);
            const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
            const year = monthDate.getFullYear();
            const displayName = `${monthName} ${year}`;
            const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
            
            const days = [];
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isCompleted = completedDates.includes(dateStr);
                days.push({ day, isCompleted, date: dateStr });
            }
            
            months.push({ name: displayName, days, monthDate });
        }
        
        return months;
    };

    // Navigate months in heatmap
    const navigateMonth = (habitId: string, direction: number) => {
        setCurrentMonthOffset(prev => ({
            ...prev,
            [habitId]: Math.max(0, (prev[habitId] || 0) + direction)
        }));
    };



    // Get difficulty stars
    const getDifficultyStars = (difficulty: number) => {
        return '⭐'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
    };

    // Toggle heatmap expansion
    const toggleHeatmapExpansion = (habitId: string) => {
        setExpandedHeatmaps(prev => ({
            ...prev,
            [habitId]: !prev[habitId]
        }));
    };

    // Handle habit deletion
    const handleDeleteHabit = async (habitId: string) => {
        const updatedHabits = habits.filter(habit => habit.id !== habitId);
        setHabits(updatedHabits);
        await saveHabitsToFile(plugin.app.vault, updatedHabits);
        new Notice('Habit deleted successfully!');
    };

    // Handle habit completion toggle
    const handleToggleCompletion = async (habitId: string, date?: string) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const dayOfWeek = new Date(targetDate).getDay();
        const toggleKey = `${habitId}-${targetDate}`;
        
        const updatedHabits = habits.map(habit => {
            if (habit.id === habitId) {
                const currentCompletedDates = habit.completedDates || [];
                const isCurrentlyCompleted = currentCompletedDates.includes(targetDate);
                
                let newCompletedDates: string[];
                let newStreak: number;
                
                if (isCurrentlyCompleted) {
                    // Remove completion
                    newCompletedDates = currentCompletedDates.filter(d => d !== targetDate);
                    newStreak = Math.max(0, habit.streak - 1);
                } else {
                    // Add completion
                    newCompletedDates = [...currentCompletedDates, targetDate];
                    newStreak = calculateStreak(habit, true);
                }

                // Update weekly progress if it's for today
                const newWeeklyProgress = [...habit.weeklyProgress];
                if (targetDate === new Date().toISOString().split('T')[0]) {
                    newWeeklyProgress[dayOfWeek] = !isCurrentlyCompleted;
                }

                return {
                    ...habit,
                    streak: newStreak,
                    lastCompleted: !isCurrentlyCompleted ? targetDate : habit.lastCompleted,
                    weeklyProgress: newWeeklyProgress,
                    totalCompletions: !isCurrentlyCompleted ? habit.totalCompletions + 1 : Math.max(0, habit.totalCompletions - 1),
                    completedDates: newCompletedDates,
                    longestStreak: Math.max(habit.longestStreak || 0, newStreak)
                };
            }
            return habit;
        });

        // Update persistent toggle state
        setPersistentToggleStates(prev => ({
            ...prev,
            [toggleKey]: !prev[toggleKey]
        }));

        setHabits(updatedHabits);
        await saveHabitsToFile(plugin.app.vault, updatedHabits);

        // Award rewards if completing (not removing completion)
        const habit = updatedHabits.find(h => h.id === habitId);
        const originalHabit = habits.find(h => h.id === habitId);
        const originalCompletedDates = originalHabit?.completedDates || [];
        const isCompleting = !originalCompletedDates.includes(targetDate);
        if (habit && isCompleting) {
            awardHabitRewards(habit);
            
            // Trigger visual effects
            setTimeout(() => {
                const treeElement = document.getElementById(`tree-${habitId}`);
                if (treeElement) {
                    // Always trigger completion effects
                    TreeVisualEffectsManager.triggerCompletionEffect(treeElement);
                    
                    // Check for milestone effects
                    if (habit.streak > 0 && habit.streak % 7 === 0) {
                        setTimeout(() => {
                            TreeVisualEffectsManager.triggerMilestoneEffect(treeElement);
                        }, 1000);
                    }
                    
                    // Check for stage transitions
                    const oldStage = getTreeStageForStreak(habit.streak - 1);
                    const newStage = getTreeStageForStreak(habit.streak);
                    if (newStage > oldStage) {
                        setTimeout(() => {
                            TreeVisualEffectsManager.triggerStageTransition(
                                treeElement,
                                oldStage,
                                newStage,
                                () => {
                                    // Stage transition complete - could trigger additional effects
                                    new Notice(`🌳 Tree evolved to Stage ${newStage + 1}!`, 4000);
                                }
                            );
                        }, 2000);
                    }
                }
            }, 100); // Small delay to ensure DOM update
        }
    };

    // Award rewards for completing a habit
    const awardHabitRewards = async (habit: HabitData) => {
        if (!playerData) return;
        
        // Get current tree stage
        const currentTreeStage = getTreeStageForStreak(habit.streak);
        
        // Check for new tree milestones and get their rewards
        const { newMilestones, totalReward } = checkAndUpdateTreeMilestones(habit);
        
        // Check for special bonuses
        const specialBonuses = checkSpecialBonuses(habit, habits);
        
        // Calculate base rewards
        const baseXP = habit.reward?.xp || 10;
        const baseCP = habit.reward?.cp || 5;
        const baseCoins = habit.reward?.coins || 2;
        
        // Apply seasonal event multipliers
        const seasonalMultiplier = eventEffects?.rewardMultiplier || 1.0;
        
        // Calculate tree-enhanced rewards using the new system
        const treeRewardResult = calculateTreeRewards(
            baseXP * seasonalMultiplier,
            baseCP * seasonalMultiplier,
            baseCoins * seasonalMultiplier,
            currentTreeStage,
            plugin.settings.treeRewardConfig
        );
        
        // Award XP, CP, and coins
        let totalXP = treeRewardResult.xp + totalReward.xp;
        let totalCP = treeRewardResult.cp + totalReward.cp;
        let totalCoins = treeRewardResult.coins + totalReward.coins;
        
        // Apply special bonus multipliers
        specialBonuses.forEach(bonus => {
            if (bonus.effect.type === 'permanent_multiplier') {
                totalXP *= bonus.effect.value;
                totalCP *= bonus.effect.value;
                totalCoins *= bonus.effect.value;
            } else if (bonus.effect.type === 'temporary_boost') {
                totalXP *= bonus.effect.value;
                totalCP *= bonus.effect.value;
                totalCoins *= bonus.effect.value;
            }
        });
        
        // Update player data
        await updatePlayerData(plugin.app.vault, totalXP, totalCoins, totalCP);
        
        // Add material rewards for tree milestones
        if (newMilestones.length > 0) {
            for (const milestone of newMilestones) {
                try {
                    const materialReward = await MaterialInventoryManager.addHabitTreeMaterials(
                        plugin.app,
                        milestone.stage
                    );
                    
                    if (materialReward.materials.length > 0) {
                        MaterialInventoryManager.showMaterialRewardNotification(
                            materialReward.materials,
                            materialReward.quality,
                            'habit tree milestone'
                        );
                    }
                } catch (error) {
                    console.error('Error adding habit tree materials:', error);
                }
            }
        }
        
        // Check for tree item drops
        const hasActiveEvent = activeEvents.length > 0;
        const itemDrop = getTreeItemDrop(
            currentTreeStage,
            habit.streak,
            plugin.settings.treeRewardConfig || DEFAULT_TREE_REWARD_CONFIG,
            hasActiveEvent
        );
        
        if (itemDrop) {
            new Notice(
                `🎁 Item Drop! You found: ${itemDrop.icon} ${itemDrop.name} - ${itemDrop.description}`,
                6000
            );
        }
        
        // Show special bonus notifications
        specialBonuses.forEach(bonus => {
            new Notice(
                `⭐ Special Bonus! ${bonus.icon} ${bonus.name} - ${bonus.description}`,
                5000
            );
        });
        
        // Show seasonal event bonus notification
        if (hasActiveEvent && seasonalMultiplier > 1.0) {
            const eventNames = activeEvents.map(e => e.name).join(', ');
            new Notice(
                `🌟 Seasonal Bonus! ${Math.round((seasonalMultiplier - 1) * 100)}% extra rewards from: ${eventNames}`,
                4000
            );
        }
        
        // Show reward notification
        const rewardMessage = `🌳 Habit Complete! +${Math.round(totalXP)} XP, +${Math.round(totalCP)} CP, +${Math.round(totalCoins)} Coins`;
        new Notice(rewardMessage, 3000);

        // Trigger achievement events
        try {
            const { achievementEventService } = await import('../../../features/achievements/services/achievementEventService');
            
            // Habit streak achievement
            await achievementEventService.processGameEvent({
                type: 'habit_streak',
                data: { 
                    streakDays: habit.streak,
                    habitName: habit.name,
                    habitCategory: habit.skill || 'general'
                },
                timestamp: new Date()
            });

            // Check if all habits in a category are completed
            const categoryHabits = habits.filter(h => h.skill === habit.skill);
            const completedCategoryHabits = categoryHabits.filter(h => 
                (h.completedDates || []).includes(new Date().toISOString().split('T')[0])
            );
            
            if (completedCategoryHabits.length === categoryHabits.length && categoryHabits.length > 0) {
                await achievementEventService.processGameEvent({
                    type: 'habit_category_completed',
                    data: { 
                        category: habit.skill || 'general',
                        categoriesCompleted: 1
                    },
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.warn('Failed to process habit achievement events:', error);
        }
        
        // Reload player data to reflect changes
        if (reloadPlayerData) {
            reloadPlayerData();
        }
    };

    // Add new habit using HabitFormData
    const handleAddHabit = async (habitFormData: HabitFormData) => {
        const habit: HabitData = {
            id: habitFormData.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
            name: habitFormData.name,
            description: habitFormData.skill,
            emoji: '⭐',
            color: habitFormData.skillColor,
            streak: 0,
            lastCompleted: '',
            reward: {
                xp: habitFormData.xpMultiplier * habitFormData.difficulty,
                cp: habitFormData.cpMultiplier * habitFormData.difficulty,
                coins: habitFormData.coinsMultiplier * habitFormData.difficulty
            },
            weeklyProgress: [false, false, false, false, false, false, false],
            totalCompletions: 0,
            created: new Date().toISOString().split('T')[0],
            skill: habitFormData.skill,
            skillColor: habitFormData.skillColor,
            longestStreak: 0,
            completedDates: [],
            difficulty: habitFormData.difficulty
        };

        const updatedHabits = [...habits, habit];
        setHabits(updatedHabits);
        
        try {
            await saveHabitsToFile(plugin.app.vault, updatedHabits);
            setShowAddHabit(false);
            new Notice('Habit added successfully!');
        } catch (error) {
            console.error('Error saving habit:', error);
            new Notice('Error saving habit');
        }
    };

    // Cancel adding habit
    const handleCancelAddHabit = () => {
        setShowAddHabit(false);
    };

    // Handle edit habit
    const handleEditHabit = (habit: HabitData) => {
        setEditingHabit(habit);
    };

    // Handle save edited habit
    const handleSaveEditedHabit = async (habitFormData: HabitFormData) => {
        if (!editingHabit) return;

        const updatedHabit: HabitData = {
            ...editingHabit,
            name: habitFormData.name,
            description: habitFormData.skill,
            skill: habitFormData.skill,
            skillColor: habitFormData.skillColor,
            difficulty: habitFormData.difficulty,
            reward: {
                xp: habitFormData.xpMultiplier * habitFormData.difficulty,
                cp: habitFormData.cpMultiplier * habitFormData.difficulty,
                coins: habitFormData.coinsMultiplier * habitFormData.difficulty
            }
        };

        const updatedHabits = habits.map(habit => 
            habit.id === editingHabit.id ? updatedHabit : habit
        );
        
        setHabits(updatedHabits);
        setEditingHabit(null);
        
        try {
            await saveHabitsToFile(plugin.app.vault, updatedHabits);
            new Notice('Habit updated successfully!');
        } catch (error) {
            console.error('Error saving habit:', error);
            new Notice('Error saving habit');
        }
    };

    // Cancel editing habit
    const handleCancelEditHabit = () => {
        setEditingHabit(null);
    };

    if (loading) {
        return <div className={styles.loading}>Loading habits...</div>;
    }

    const completedTodayCount = habits.filter(habit => isCompletedToday(habit)).length;

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <div className="flex items-center gap-2">
                        <span style={{ fontSize: '1.25rem' }}>📅</span>
                        <h2 className="text-xl font-bold">Habits</h2>
                    </div>
                    <p className="text-orange-100">{completedTodayCount}/{habits.length} habits completed today</p>
                </div>
                <button
                    onClick={() => setShowAddHabit(!showAddHabit)}
                    className={styles.addButton}
                >
                    <AddIcon size={16} />
                    ADD
                </button>
            </div>

            {/* Seasonal Events Banner */}
            {activeEvents.length > 0 && (
                <div className={styles.seasonalEventsBanner}>
                    <div className={styles.eventsHeader}>
                        <span className={styles.eventsIcon}>🌟</span>
                        <h3 className={styles.eventsTitle}>Active Events</h3>
                    </div>
                    <div className={styles.eventsContainer}>
                        {activeEvents.map((event, index) => (
                            <div key={event.id} className={styles.eventCard}>
                                <span className={styles.eventIcon}>{event.icon}</span>
                                <div className={styles.eventInfo}>
                                    <h4 className={styles.eventName}>{event.name}</h4>
                                    <p className={styles.eventDescription}>{event.description}</p>
                                    <div className={styles.eventEffects}>
                                        {event.effects.rewardMultiplier > 1.0 && (
                                            <span className={styles.effectBadge}>
                                                +{Math.round((event.effects.rewardMultiplier - 1) * 100)}% Rewards
                                            </span>
                                        )}
                                        {event.effects.dropRateMultiplier > 1.0 && (
                                            <span className={styles.effectBadge}>
                                                +{Math.round((event.effects.dropRateMultiplier - 1) * 100)}% Drop Rate
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Habit Form */}
            {showAddHabit && (
                <HabitForm
                    onSubmit={handleAddHabit}
                    onCancel={handleCancelAddHabit}
                    vault={plugin.app.vault}
                />
            )}

            {/* Edit Habit Form */}
            {editingHabit && (
                <HabitForm
                    onSubmit={handleSaveEditedHabit}
                    onCancel={handleCancelEditHabit}
                    vault={plugin.app.vault}
                    isEditing={true}
                    initialData={{
                        name: editingHabit.name,
                        skill: editingHabit.skill || editingHabit.description || '',
                        skillColor: editingHabit.skillColor || editingHabit.color || '#3b82f6',
                        difficulty: editingHabit.difficulty || 1,
                        xpMultiplier: Math.round((editingHabit.reward.xp / (editingHabit.difficulty || 1)) * 10) / 10,
                        cpMultiplier: Math.round((editingHabit.reward.cp / (editingHabit.difficulty || 1)) * 10) / 10,
                        coinsMultiplier: Math.round((editingHabit.reward.coins / (editingHabit.difficulty || 1)) * 10) / 10
                    }}
                />
            )}

            {/* Habits List */}
            <div className={styles.habitsList}>
                {habits.map(habit => {
                    const weeklyData = generateWeeklyView(habit.completedDates || []);
                    const scrollableHeatmapData = generateScrollableHeatmapData(habit.completedDates || [], habit.id);
                    const today = new Date().toISOString().split('T')[0];
                    const isCompletedToday = (habit.completedDates || []).includes(today);
                    const isHeatmapExpanded = expandedHeatmaps[habit.id];
                    
                    return (
                        <div key={habit.id} className={styles.habitCard}>
                            {/* Habit Header */}
                            <div className={styles.habitHeader}>
                                <div className={styles.habitInfo}>
                                    <div className={styles.habitMeta}>
                                        <span className={styles.habitEmoji}>{habit.emoji}</span>
                                        <div>
                                            <h3 className={styles.habitName}>{habit.name}</h3>
                                            <div className={styles.habitTags}>
                                                <span 
                                                    className={styles.skillTag} 
                                                    style={{ backgroundColor: habit.skillColor || habit.color }}
                                                >
                                                    {habit.skill || habit.description || 'No Skill'}
                                                </span>
                                                <span className={styles.difficultyTag}>{getDifficultyStars(habit.difficulty || 1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.habitActions}>
                                        <button
                                            onClick={() => handleToggleCompletion(habit.id)}
                                            className={`${styles.completeButton} ${isCompletedToday ? styles.completed : ''}`}
                                        >
                                            <span style={{ fontSize: '1rem' }}>🎯</span>
                                        </button>
                                        <button
                                            onClick={() => handleEditHabit(habit)}
                                            className={styles.editButton}
                                        >
                                            <EditIcon size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteHabit(habit.id)}
                                            className={styles.deleteButton}
                                        >
                                            <DeleteIcon size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className={styles.habitStats}>
                                    <div className={styles.statBadge}>
                                        <span style={{ fontSize: '1rem' }}>🔥</span>
                                        <span>{habit.streak} day streak</span>
                                    </div>
                                    <div className={styles.statBadge}>
                                        <span style={{ fontSize: '1rem' }}>🏆</span>
                                        <span>Best: {habit.longestStreak || habit.streak}</span>
                                    </div>
                                </div>

                                {/* Rewards */}
                                <div className={styles.habitRewards}>
                                    <div className={styles.rewardBadge}>
                                        <span className={styles.rewardIcon}>⚡</span>
                                        <span>{habit.reward.xp} XP</span>
                                    </div>
                                    <div className={styles.rewardBadge}>
                                        <span className={styles.rewardIcon}>🎯</span>
                                        <span>{habit.reward.cp} CP</span>
                                    </div>
                                    <div className={styles.rewardBadge}>
                                        <span className={styles.rewardIcon}>{currencySymbol}</span>
                                        <span>{habit.reward.coins} {currencyName}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tree Section - Collapsible Dropdown */}
                            <div className={styles.treeSectionDropdown}>
                                <button 
                                    className={styles.treeSectionToggle}
                                    onClick={() => {
                                        setTreeSectionsOpen(prev => {
                                            const newState = { ...prev, [habit.id]: !prev[habit.id] };
                                    
                                            return newState;
                                        });
                                    }}
                                >
                                    <span className={styles.toggleIcon}>
                                        {treeSectionsOpen[habit.id] ? '▼' : '▶'}
                                    </span>
                                    <span className={styles.toggleTitle}>🌳 Tree Growth</span>
                                    <span className={styles.toggleBadge}>Stage {getTreeStageForStreak(habit.streak)}</span>
                                </button>
                                
                                {treeSectionsOpen[habit.id] && (
                                    <div className={styles.treeSectionContent}>
                                        {/* Full-Width Window View Tree Display */}
                                        <div className={styles.windowTreeContainer}>
                                            {/* Window Frame Effect */}
                                            <div className={styles.windowFrame}>
                                                {/* Sky Background */}
                                                <div className={styles.skyBackground}>
                                                    {/* Tree Image - Enhanced with Visual Effects */}
                                                    <div 
                                                        className={`${styles.treeWindowView} ${styles.treeContainer}`}
                                                        id={`tree-${habit.id}`}
                                                        onMouseEnter={() => {
                                                            const treeElement = document.getElementById(`tree-${habit.id}`);
                                                            if (treeElement) {
                                                                TreeVisualEffectsManager.addInteractiveEffects(treeElement);
                                                            }
                                                        }}
                                                    >
                                                        <img
                                                            src={treeStages[getTreeStageForStreak(habit.streak)]}
                                                            alt={`Tree Stage ${getTreeStageForStreak(habit.streak) + 1}`}
                                                            className={`${styles.windowTree} ${styles.pixelTree} stage-${getTreeStageForStreak(habit.streak)}`}
                                                        />
                                                        
                                                        {/* Progress Indicator */}
                                                        <div className={styles.treeProgressIndicator}>
                                                            <div 
                                                                className={styles.treeProgressFill}
                                                                style={{
                                                                    width: `${Math.min(100, ((habit.streak % 7) / 7) * 100)}%`
                                                                }}
                                                            ></div>
                                                        </div>
                                                        
                                                        {/* Milestone Badge */}
                                                        {habit.streak > 0 && habit.streak % 7 === 0 && (
                                                            <div className={styles.treeMilestoneBadge}>
                                                                🏆
                                                            </div>
                                                        )}
                                                        
                                                        {/* Tree Stats Overlay */}
                                                        <div className={styles.treeStatsOverlay}>
                                                            <div>Streak: {habit.streak} days</div>
                                                            <div>Stage: {getTreeStageForStreak(habit.streak) + 1}/5</div>
                                                            <div>Next: {7 - (habit.streak % 7)} days</div>
                                                        </div>
                                                        
                                                        {/* Seasonal Effects Container */}
                                                        {activeEvents.length > 0 && (
                                                            <div className={styles.seasonalEffectsContainer}>
                                                                {/* Seasonal effects will be dynamically added here */}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Tree Info Section - Below Window */}
                                            <div className={styles.treeInfoSection}>
                                                {/* Compact Level, Progress, and Milestone Info */}
                                                <div className={styles.treeInfoCompact}>
                                                    {/* Level Badge */}
                                                    <div className={styles.levelBadgeCompact}>
                                                        <span className={styles.levelNumberCompact}>Lv.{getTreeStageForStreak(habit.streak) + 1}</span>
                                                        <span className={styles.stageNameCompact}>
                                                            {getTreeStageForStreak(habit.streak) === 0 && "🌱 Sprout"}
                                                            {getTreeStageForStreak(habit.streak) === 1 && "🌿 Sapling"}
                                                            {getTreeStageForStreak(habit.streak) === 2 && "🪴 Young"}
                                                            {getTreeStageForStreak(habit.streak) === 3 && "🌳 Mature"}
                                                            {getTreeStageForStreak(habit.streak) === 4 && "🌳✨ World"}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Progress Info */}
                                                    <div className={styles.progressInfoCompact}>
                                                        <div className={styles.progressBarCompact}>
                                                            <div 
                                                                className={styles.progressFillCompact}
                                                                style={{
                                                                    width: `${Math.min(100, ((habit.streak % 7) / 7) * 100)}%`
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className={styles.progressLabelCompact}>
                                                            {habit.streak % 7}/7 days to next stage
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Next Milestone Info */}
                                                    <div className={styles.milestoneInfoCompact}>
                                                        <span className={styles.milestoneIconCompact}>🎯</span>
                                                        <span className={styles.milestoneTextCompact}>
                                                            {getNextMilestoneText(habit.streak)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Horizontal Scrollable Growth Stages */}
                                            <div className={styles.growthStagesScrollable}>
                                                <div className={styles.stagesHeader}>
                                                    <span className={styles.stagesTitle}>Growth Journey</span>
                                                    <span className={styles.stagesSubtitle}>Scroll to see all stages</span>
                                                </div>
                                                
                                                <div className={styles.stagesScrollContainer}>
                                                    <div className={styles.stagesRow}>
                                                        {[
                                                            { icon: '🌱', name: 'Seed', range: '0', stage: 0 },
                                                            { icon: '🌱', name: 'Sprout', range: '1-3', stage: 1 },
                                                            { icon: '🌿', name: 'Sapling', range: '4-7', stage: 2 },
                                                            { icon: '🪴', name: 'Young', range: '8-14', stage: 3 },
                                                            { icon: '🌳', name: 'Mature', range: '15-21', stage: 4 },
                                                            { icon: '🌳✨', name: 'World', range: '22+', stage: 5 }
                                                        ].map((stage, index) => (
                                                            <div 
                                                                key={index} 
                                                                className={`${styles.stageCard} ${getTreeStageForStreak(habit.streak) === stage.stage ? styles.activeStage : ''}`}
                                                            >
                                                                <span className={styles.stageIcon}>{stage.icon}</span>
                                                                <span className={styles.stageName}>{stage.name}</span>
                                                                <span className={styles.stageRange}>{stage.range}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Tree Rewards Only */}
                                            {treeRewards[habit.id] && (
                                                <div className={styles.rewardsSection}>
                                                    <h4 className={styles.sectionTitle}>Tree Rewards</h4>
                                                    <div className={styles.rewardsGrid}>
                                                        <div className={styles.rewardItem}>
                                                            <span className={styles.rewardIcon}>🌳</span>
                                                            <span className={styles.rewardText}>
                                                                +{Math.round((treeRewards[habit.id].xp / (habit.reward?.xp || 10) - 1) * 100)}% XP Bonus
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Weekly Circle View */}
                            <div className={styles.weeklySection}>
                                <div className={styles.weeklyHeader}>
                                    <span className={styles.sectionTitle}>This Week</span>
                                    <button
                                        onClick={() => toggleHeatmapExpansion(habit.id)}
                                        className={styles.expandButton}
                                    >
                                        <span style={{ fontSize: '1rem' }}>📊</span>
                                        View Activity
                                        <span style={{ fontSize: '1rem' }}>{isHeatmapExpanded ? '⬆️' : '⬇️'}</span>
                                    </button>
                                </div>
                                
                                <div className={styles.weeklyGrid}>
                                    {weeklyData.map((day, index) => (
                                        <div key={index} className={styles.dayColumn}>
                                            <div className={styles.dayLabel}>{day.dayName}</div>
                                            <div 
                                                className={`${styles.dayCircle} ${
                                                    day.isCompleted 
                                                        ? styles.completed 
                                                        : day.isToday 
                                                            ? styles.today 
                                                            : styles.incomplete
                                                }`}
                                                onClick={() => handleToggleCompletion(habit.id, day.date)}
                                            >
                                                {day.isCompleted ? '✓' : day.isToday ? '○' : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scrollable Month Heatmap */}
                            {isHeatmapExpanded && (
                                <div className={styles.scrollableHeatmapSection}>
                                    <div className={styles.scrollableHeatmapHeader}>
                                        <div className={styles.heatmapTitle}>Activity</div>
                                        <div className={styles.monthNavigation}>
                                            <button
                                                onClick={() => navigateMonth(habit.id, -1)}
                                                className={styles.monthNavButton}
                                                disabled={currentMonthOffset[habit.id] === 0}
                                            >
                                                <span style={{ fontSize: '1rem' }}>⬅️</span>
                                            </button>
                                            <span className={styles.monthOffset}>
                                                {currentMonthOffset[habit.id] ? `+${currentMonthOffset[habit.id]} months ahead` : 'Current'}
                                            </span>
                                            <button
                                                onClick={() => navigateMonth(habit.id, 1)}
                                                className={styles.monthNavButton}
                                            >
                                                <span style={{ fontSize: '1rem' }}>➡️</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.monthsContainer}>
                                        <div className={styles.monthsGrid}>
                                            {scrollableHeatmapData.slice(0, 3).map((month, monthIndex) => (
                                                <div key={monthIndex} className={styles.monthColumn}>
                                                    <h4 className={styles.monthName}>{month.name}</h4>
                                                    <div className={styles.monthDaysGrid}>
                                                        {month.days.map((day, dayIndex) => (
                                                            <div
                                                                key={dayIndex}
                                                                className={`${styles.monthDay} ${day.isCompleted ? styles.monthDayCompleted : styles.monthDayIncomplete}`}
                                                                title={`${day.date} - ${day.isCompleted ? 'Completed' : 'Not completed'}`}
                                                                onClick={() => handleToggleCompletion(habit.id, day.date)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Legend */}
                                    <div className={styles.scrollableHeatmapLegend}>
                                        <span className={styles.legendText}>Less</span>
                                        <div className={styles.legendSquares}>
                                            <div className={styles.legendSquareEmpty}></div>
                                            <div className={styles.legendSquareFilled}></div>
                                        </div>
                                        <span className={styles.legendText}>More</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {habits.length === 0 && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📋</div>
                    <h3 className={styles.emptyTitle}>No Habits Yet</h3>
                    <p className={styles.emptyText}>Start building better habits today!</p>
                    <button
                        onClick={() => setShowAddHabit(true)}
                        className={styles.emptyButton}
                    >
                        Create First Habit
                    </button>
                </div>
            )}
        </div>
    );
};