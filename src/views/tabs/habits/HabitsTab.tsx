import React, { useState, useEffect } from 'react';
import { showGameNotice } from '../../../shared/utils/noticeUtils';
import { HabitData, getTreeStageForStreak, getDisplayTreeStage, applyEvolutionMissPenalties, adjustEvolutionPenaltyForStreakChange, checkAndUpdateTreeMilestones, saveHabitsToFile, loadHabitsFromFile, calculateStreak, isCompletedToday, getLocalDateString, calculateStreakFromCompletedDates } from '../../../features/habits/utils/habitsUtils';
import { calculateTreeRewards, DEFAULT_TREE_REWARD_CONFIG, getTreeItemDrop, checkSpecialBonuses } from '../../../features/habits/utils/treeRewardSystem';
import { SeasonalTreeEventManager } from '../../../features/habits/utils/seasonalTreeEvents';
import { TreeVisualEffectsManager } from '../../../features/habits/utils/treeVisualEffects';
import { PlayerData } from '../../../data/models/PlayerData';
import GamifiedObsidianPlugin from '../../../core/main';
import { distributeCPFromQuest, updatePlayerData } from '../../../shared/utils/progressUpdater';
import { MaterialInventoryManager } from '../../../shared/services/materialInventoryManager';
import { currencyDisplay } from '../../../shared/services/currencyDisplayService';
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

// Shared definition of tree stage thresholds so labels stay in sync with logic
const TREE_STAGE_THRESHOLDS = [
    { minStreak: 0, name: 'Seed' },
    { minStreak: 4, name: 'Sprout' },
    { minStreak: 8, name: 'Sapling' },
    { minStreak: 15, name: 'Young Tree' },
    { minStreak: 22, name: 'Mature Tree' },
    { minStreak: 30, name: 'World Tree' },
];

// Helper function to get next milestone text, based on actual next stage
function getNextMilestoneText(streak: number): string {
    const currentStageIndex = getTreeStageForStreak(streak); // 0–5
    const nextStage = TREE_STAGE_THRESHOLDS[currentStageIndex + 1];

    // Already at or beyond the final stage
    if (!nextStage) {
        return "Max level reached! 🌳✨";
    }

    const daysRemaining = Math.max(0, nextStage.minStreak - streak);

    // If somehow already at or past the next threshold but stage hasn't visually updated yet
    if (daysRemaining === 0) {
        return `Reached ${nextStage.name}!`;
    }

    const dayLabel = daysRemaining === 1 ? 'day' : 'days';
    return `${daysRemaining} ${dayLabel} until ${nextStage.name}`;
}


interface HabitFormData {
    name: string;
    skill: string;
    skills?: string[];
    skillColor: string;
    habitType: 'build' | 'avoid';
    difficulty: number;
    xpMultiplier: number;
    cpMultiplier: number;
    coinsMultiplier: number;
    primarySkillIcon?: string;
    // New: schedule configuration mirrored from HabitForm
    scheduleType?: 'daily' | 'weekly';
    scheduleDays?: number[];
}

interface HabitsTabProps {
    plugin: GamifiedObsidianPlugin;
    playerData: PlayerData | null;
    reloadPlayerData: () => Promise<void>;
}

export const HabitsTab: React.FC<HabitsTabProps> = ({ plugin, playerData, reloadPlayerData }) => {
    // Ensure currency display service is initialized
    currencyDisplay.initialize(plugin.settings);
    
    const currencyName = currencyDisplay.getCurrencyName();
    const currencySymbol = currencyDisplay.getCurrencySymbol();
    const [habits, setHabits] = useState<HabitData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddHabit, setShowAddHabit] = useState(false);
    const [editingHabit, setEditingHabit] = useState<HabitData | null>(null);
    const [activeTab, setActiveTab] = useState<'today' | 'all' | 'done' | 'archived'>('today');
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

    // Load habits on component mount and normalize streaks from completed dates
    useEffect(() => {
        const loadHabits = async () => {
            try {
                const loadedHabits = await loadHabitsFromFile(plugin.app.vault);

                // Recompute streaks so they always match the visible checked days
                const normalizedHabits = loadedHabits.map(habit => {
                    const newStreak = calculateStreakFromCompletedDates(habit.completedDates || []);

                    // Find the most recent completion date (if any)
                    const dates = habit.completedDates || [];
                    const latestDate = dates.length > 0
                        ? dates.slice().sort().slice(-1)[0]
                        : habit.lastCompleted;

                    const merged = {
                        ...habit,
                        streak: newStreak,
                        longestStreak: Math.max(habit.longestStreak || 0, newStreak),
                        lastCompleted: latestDate || habit.lastCompleted
                    };
                    return applyEvolutionMissPenalties(merged);
                });

                const prevById = new Map(loadedHabits.map(h => [h.id, h]));
                const evolutionDirty = normalizedHabits.some(h => {
                    const o = prevById.get(h.id);
                    return (
                        !o ||
                        (o.evolutionPenalty ?? 0) !== (h.evolutionPenalty ?? 0) ||
                        o.lastEvolutionEvalDate !== h.lastEvolutionEvalDate
                    );
                });
                if (evolutionDirty) {
                    await saveHabitsToFile(plugin.app.vault, normalizedHabits);
                }

                setHabits(normalizedHabits);
            } catch (error) {
                console.error('Error loading habits:', error);
                showGameNotice('Error loading habits');
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
                const treeStage = getDisplayTreeStage(habit);
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
            const dateStr = getLocalDateString(date);
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

    // Minimum month offset: don't go further back than the month the habit was created
    const getMinMonthOffset = (created: string): number => {
        const now = new Date();
        const createdDate = new Date(created);
        const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
        const createdMonthIndex = createdDate.getFullYear() * 12 + createdDate.getMonth();
        return createdMonthIndex - currentMonthIndex; // 0 if created this month, -1 if last month, etc.
    };

    // Generate scrollable heatmap data for months
    const generateScrollableHeatmapData = (completedDates: string[], habitId: string) => {
        const monthOffset = currentMonthOffset[habitId] || 0;
        const months = [];
        const now = new Date();
        
        // Generate 3 months: current month + offset window (can be past, current, or future)
        for (let i = 0; i < 3; i++) {
            // Calculate the correct month and year (current month + offset + i months)
            const totalMonthsAhead = monthOffset + i;
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            
            let targetYear = currentYear;
            let targetMonth = currentMonth + totalMonthsAhead;
            
            // Handle year rollover (forward)
            while (targetMonth >= 12) {
                targetMonth -= 12;
                targetYear += 1;
            }
            // Handle year rollover (backward for past months)
            while (targetMonth < 0) {
                targetMonth += 12;
                targetYear -= 1;
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

    // Navigate months in heatmap (allow past months, but not before habit creation)
    const navigateMonth = (habitId: string, direction: number, created?: string) => {
        const minOffset = created ? getMinMonthOffset(created) : 0;
        setCurrentMonthOffset(prev => {
            const current = prev[habitId] || 0;
            const next = current + direction;
            return {
                ...prev,
                [habitId]: Math.max(minOffset, next)
            };
        });
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
        showGameNotice('Habit deleted successfully!');
    };

    // Handle habit completion toggle
    const handleToggleCompletion = async (habitId: string, date?: string) => {
        const targetDate = date || getLocalDateString();
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
                } else {
                    // Add completion
                    newCompletedDates = [...currentCompletedDates, targetDate];
                }

                // Always derive streak from the set of completed dates so it matches the visible history
                newStreak = calculateStreakFromCompletedDates(newCompletedDates);
                const oldStreak = habit.streak;
                const evolutionPenalty = adjustEvolutionPenaltyForStreakChange(habit, oldStreak, newStreak);

                // Update weekly progress if it's for today
                const newWeeklyProgress = [...habit.weeklyProgress];
                if (targetDate === getLocalDateString()) {
                    newWeeklyProgress[dayOfWeek] = !isCurrentlyCompleted;
                }

                return {
                    ...habit,
                    streak: newStreak,
                    evolutionPenalty,
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
                    
                    // Check for stage transitions (visible evolution stage)
                    const oldStage = originalHabit ? getDisplayTreeStage(originalHabit) : 0;
                    const newStage = getDisplayTreeStage(habit);
                    if (newStage > oldStage) {
                        setTimeout(() => {
                            TreeVisualEffectsManager.triggerStageTransition(
                                treeElement,
                                oldStage,
                                newStage,
                                () => {
                                    // Stage transition complete - could trigger additional effects
                                    showGameNotice(`🌳 Tree evolved to Stage ${newStage + 1}!`, 4000);
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
            plugin.settings.treeRewardConfig || DEFAULT_TREE_REWARD_CONFIG
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

        // Distribute CP into the habit's skill(s) → class → master class
        // (This is separate from player CP; it updates the SkillTree .md progress files.)
        const cpToDistribute = Math.round(Number(totalCP) || 0);
        if (cpToDistribute > 0) {
            const skillsRaw = (habit.skills && habit.skills.length > 0)
                ? habit.skills
                : (habit.skill ? [habit.skill] : []);
            const skills = skillsRaw.map(s => String(s || '').trim()).filter(Boolean);
            if (skills.length > 0) {
                try {
                    await distributeCPFromQuest(plugin.app.vault, { skills, cp: cpToDistribute });
                } catch (e) {
                    console.error('Failed to distribute CP from habit completion:', e);
                }
            }
        }
        
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
            plugin.settings.treeRewardConfig || DEFAULT_TREE_REWARD_CONFIG || DEFAULT_TREE_REWARD_CONFIG,
            hasActiveEvent
        );
        
        if (itemDrop) {
            showGameNotice(
                `🎁 Item Drop! You found: ${itemDrop.icon} ${itemDrop.name} - ${itemDrop.description}`,
                6000
            );
        }
        
        // Show special bonus notifications
        specialBonuses.forEach(bonus => {
            showGameNotice(
                `⭐ Special Bonus! ${bonus.icon} ${bonus.name} - ${bonus.description}`,
                5000
            );
        });
        
        // Show seasonal event bonus notification
        if (hasActiveEvent && seasonalMultiplier > 1.0) {
            const eventNames = activeEvents.map(e => e.name).join(', ');
            showGameNotice(
                `🌟 Seasonal Bonus! ${Math.round((seasonalMultiplier - 1) * 100)}% extra rewards from: ${eventNames}`,
                4000
            );
        }
        
        // Show reward notification
        const rewardMessage = `🌳 Habit Complete! +${Math.round(totalXP)} XP, +${Math.round(totalCP)} CP, +${Math.round(totalCoins)} Coins`;
        showGameNotice(rewardMessage, 3000);

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
                (h.completedDates || []).includes(getLocalDateString())
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
            emoji: habitFormData.primarySkillIcon || '⭐',
            color: habitFormData.skillColor,
            habitType: habitFormData.habitType || 'build',
            streak: 0,
            lastCompleted: '',
            reward: {
                xp: habitFormData.xpMultiplier * habitFormData.difficulty,
                cp: habitFormData.cpMultiplier * habitFormData.difficulty,
                coins: habitFormData.coinsMultiplier * habitFormData.difficulty
            },
            weeklyProgress: [false, false, false, false, false, false, false],
            totalCompletions: 0,
            created: getLocalDateString(),
            skill: habitFormData.skill,
            skills: habitFormData.skills && habitFormData.skills.length > 0 ? habitFormData.skills : [habitFormData.skill],
            skillColor: habitFormData.skillColor,
            longestStreak: 0,
            completedDates: [],
            difficulty: habitFormData.difficulty,
            archived: false,
            scheduleType: habitFormData.scheduleType || 'daily',
            scheduleDays: (habitFormData.scheduleDays && habitFormData.scheduleDays.length > 0)
                ? habitFormData.scheduleDays
                : [0, 1, 2, 3, 4, 5, 6],
            evolutionPenalty: 0
        };

        const updatedHabits = [...habits, habit];
        setHabits(updatedHabits);
        
        try {
            await saveHabitsToFile(plugin.app.vault, updatedHabits);
            setShowAddHabit(false);
            showGameNotice('Habit added successfully!');
        } catch (error) {
            console.error('Error saving habit:', error);
            showGameNotice('Error saving habit');
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
            habitType: habitFormData.habitType || editingHabit.habitType || 'build',
            skill: habitFormData.skill,
            skills: habitFormData.skills && habitFormData.skills.length > 0 ? habitFormData.skills : [habitFormData.skill],
            skillColor: habitFormData.skillColor,
            difficulty: habitFormData.difficulty,
            reward: {
                xp: habitFormData.xpMultiplier * habitFormData.difficulty,
                cp: habitFormData.cpMultiplier * habitFormData.difficulty,
                coins: habitFormData.coinsMultiplier * habitFormData.difficulty
            },
            emoji: habitFormData.primarySkillIcon || editingHabit.emoji || '⭐',
            scheduleType: habitFormData.scheduleType || editingHabit.scheduleType || 'daily',
            scheduleDays: (habitFormData.scheduleDays && habitFormData.scheduleDays.length > 0)
                ? habitFormData.scheduleDays
                : (editingHabit.scheduleDays && editingHabit.scheduleDays.length > 0
                    ? editingHabit.scheduleDays
                    : [0, 1, 2, 3, 4, 5, 6])
        };

        const updatedHabits = habits.map(habit => 
            habit.id === editingHabit.id ? updatedHabit : habit
        );
        
        setHabits(updatedHabits);
        setEditingHabit(null);
        
        try {
            await saveHabitsToFile(plugin.app.vault, updatedHabits);
            showGameNotice('Habit updated successfully!');
        } catch (error) {
            console.error('Error saving habit:', error);
            showGameNotice('Error saving habit');
        }
    };

    // Cancel editing habit
    const handleCancelEditHabit = () => {
        setEditingHabit(null);
    };

    const handleToggleArchive = async (habitId: string, nextArchived: boolean) => {
        const now = getLocalDateString();
        const updatedHabits = habits.map(h => {
            if (h.id !== habitId) return h;
            return {
                ...h,
                archived: nextArchived,
                archivedAt: nextArchived ? now : undefined
            };
        });

        setHabits(updatedHabits);

        try {
            await saveHabitsToFile(plugin.app.vault, updatedHabits);
            showGameNotice(nextArchived ? 'Habit archived' : 'Habit restored');
        } catch (error) {
            console.error('Error saving archived state:', error);
            showGameNotice('Error saving habit');
        }
    };

    if (loading) {
        return (
            <div
                className={`${styles.loading} ${styles.pixelHabitsShell}`}
                data-pixel-shell="habits"
            >
                Loading habits...
            </div>
        );
    }

    const todayStr = getLocalDateString();
    const dow = new Date().getDay();

    const visibleHabits = habits.filter(h => h.archived !== true);
    const completedTodayCount = visibleHabits.filter(habit => isCompletedToday(habit)).length;
    const todayScheduledHabits = visibleHabits.filter((habit) => {
        const scheduleType = habit.scheduleType || 'daily';
        const scheduleDays = habit.scheduleDays && habit.scheduleDays.length > 0
            ? habit.scheduleDays
            : [0, 1, 2, 3, 4, 5, 6];

        return scheduleType === 'daily' || scheduleDays.includes(dow);
    });
    const quickCheckHabits = todayScheduledHabits.filter((habit) => {
        return !(habit.completedDates || []).includes(todayStr) && habit.lastCompleted !== todayStr;
    });

    const filteredHabits = habits.filter((habit) => {
        const isArchived = habit.archived === true;

        if (activeTab === 'archived') return isArchived;
        if (isArchived) return false; // hide archived everywhere else

        if (activeTab === 'all') return true;
        if (activeTab === 'done') {
            return (habit.completedDates || []).includes(todayStr) || habit.lastCompleted === todayStr;
        }

        // today: scheduled today
        const scheduleType = habit.scheduleType || 'daily';
        const scheduleDays = habit.scheduleDays && habit.scheduleDays.length > 0
            ? habit.scheduleDays
            : [0, 1, 2, 3, 4, 5, 6];
        return scheduleType === 'daily' || scheduleDays.includes(dow);
    });

    return (
        <div className={`${styles.container} ${styles.pixelHabitsShell}`} data-pixel-shell="habits">
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <div className="flex items-center gap-2">
                        <span style={{ fontSize: '1.25rem' }}>📅</span>
                        <h2 className="text-xl font-bold">Habits</h2>
                    </div>
                    <p className="text-orange-100">{completedTodayCount}/{visibleHabits.length} habits completed today</p>
                </div>
                <button
                    onClick={() => setShowAddHabit(!showAddHabit)}
                    className={styles.addButton}
                >
                    <AddIcon size={16} />
                    ADD
                </button>
            </div>

            {/* Tabs (compact) */}
            <div className={styles.tabsRow}>
                <button className={`${styles.tab} ${activeTab === 'today' ? styles.tabActive : ''}`} onClick={() => setActiveTab('today')}>Today</button>
                <button className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`} onClick={() => setActiveTab('all')}>All</button>
                <button className={`${styles.tab} ${activeTab === 'done' ? styles.tabActive : ''}`} onClick={() => setActiveTab('done')}>Done</button>
                <button className={`${styles.tab} ${activeTab === 'archived' ? styles.tabActive : ''}`} onClick={() => setActiveTab('archived')}>Archived</button>
            </div>

            {(activeTab === 'today' || activeTab === 'all') && (
                <section className={styles.quickCheckPanel} aria-label="Quick check today's habits">
                    <div className={styles.quickCheckHeader}>
                        <div>
                            <div className={styles.quickCheckTitle}>Quick Check</div>
                            <div className={styles.quickCheckSubtitle}>
                                {quickCheckHabits.length > 0
                                    ? `${quickCheckHabits.length} habit${quickCheckHabits.length === 1 ? '' : 's'} left today`
                                    : 'All scheduled habits are checked off'}
                            </div>
                        </div>
                        <span className={styles.quickCheckBadge}>
                            {todayScheduledHabits.length - quickCheckHabits.length}/{todayScheduledHabits.length}
                        </span>
                    </div>

                    {quickCheckHabits.length > 0 ? (
                        <div className={styles.quickCheckList}>
                            {quickCheckHabits.map((habit) => {
                                const skills = habit.skills && habit.skills.length > 0
                                    ? habit.skills
                                    : [habit.skill || habit.description || 'No Skill'];

                                return (
                                    <button
                                        key={habit.id}
                                        type="button"
                                        className={styles.quickCheckItem}
                                        onClick={() => handleToggleCompletion(habit.id)}
                                        title={`Check off ${habit.name}`}
                                    >
                                        <span className={styles.quickCheckBox} aria-hidden>✓</span>
                                        <span className={styles.quickCheckEmoji} aria-hidden>{habit.emoji}</span>
                                        <span className={styles.quickCheckName}>{habit.name}</span>
                                        <span
                                            className={styles.quickCheckSkill}
                                            style={{ backgroundColor: habit.skillColor || habit.color }}
                                        >
                                            {skills[0]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.quickCheckEmpty}>Nice, your habit inbox is clear for today.</div>
                    )}
                </section>
            )}

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
                        habitType: editingHabit.habitType || 'build',
                        skillColor: editingHabit.skillColor || editingHabit.color || '#3b82f6',
                        difficulty: editingHabit.difficulty || 1,
                        xpMultiplier: Math.round((editingHabit.reward.xp / (editingHabit.difficulty || 1)) * 10) / 10,
                        cpMultiplier: Math.round((editingHabit.reward.cp / (editingHabit.difficulty || 1)) * 10) / 10,
                        coinsMultiplier: Math.round((editingHabit.reward.coins / (editingHabit.difficulty || 1)) * 10) / 10,
                        primarySkillIcon: editingHabit.emoji,
                        scheduleType: editingHabit.scheduleType || 'daily',
                        scheduleDays: editingHabit.scheduleDays && editingHabit.scheduleDays.length > 0
                            ? editingHabit.scheduleDays
                            : [0, 1, 2, 3, 4, 5, 6]
                    }}
                />
            )}

            {/* Habits List / Empty State */}
            {filteredHabits.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>{activeTab === 'archived' ? '📦' : '📋'}</div>
                    <h3 className={styles.emptyTitle}>
                        {activeTab === 'archived'
                            ? 'No archived habits'
                            : activeTab === 'done'
                                ? 'No done habits'
                                : activeTab === 'today'
                                    ? 'Nothing scheduled today'
                                    : 'No habits yet'}
                    </h3>
                    <p className={styles.emptyText}>
                        {activeTab === 'archived'
                            ? 'Archived habits will appear here.'
                            : activeTab === 'done'
                                ? 'Complete a habit to see it here.'
                                : activeTab === 'today'
                                    ? 'Try switching to All, or adjust your weekly schedule.'
                                    : 'Start building better habits today!'}
                    </p>
                    {activeTab !== 'archived' && (
                        <button
                            onClick={() => setShowAddHabit(true)}
                            className={styles.emptyButton}
                        >
                            Create Habit
                        </button>
                    )}
                </div>
            ) : (
            <div className={styles.habitsList}>
                {filteredHabits.map(habit => {
                    const weeklyData = generateWeeklyView(habit.completedDates || []);
                    const scrollableHeatmapData = generateScrollableHeatmapData(habit.completedDates || [], habit.id);
                    const today = getLocalDateString();
                    const isCompletedToday = (habit.completedDates || []).includes(today);
                    const isHeatmapExpanded = expandedHeatmaps[habit.id];
                    const treeOpen = !!treeSectionsOpen[habit.id];
                    const treePanelId = `habit-tree-panel-${habit.id}`;
                    const treeTriggerId = `habit-tree-trigger-${habit.id}`;

                    return (
                        <div key={habit.id} className={styles.habitCard}>
                            {/* Habit Header */}
                            <div className={styles.habitHeader}>
                                <div className={styles.habitInfo}>
                                    <div className={styles.habitMeta}>
                                        <span className={styles.habitEmoji}>{habit.emoji}</span>
                                        <div className={styles.habitTitleBlock}>
                                            <h3 className={styles.habitName} title={habit.name}>
                                                {habit.name}
                                            </h3>
                                            <div className={styles.habitTags}>
                                                {(habit.skills && habit.skills.length > 0 ? habit.skills : [habit.skill || habit.description || 'No Skill']).map((s, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={styles.skillTag}
                                                        title={s}
                                                        style={{ backgroundColor: habit.skillColor || habit.color }}
                                                    >
                                                        {s}
                                                    </span>
                                                ))}
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
                                            onClick={() => handleToggleArchive(habit.id, activeTab !== 'archived')}
                                            className={styles.archiveButton}
                                            title={activeTab === 'archived' ? 'Unarchive' : 'Archive'}
                                        >
                                            <span style={{ fontSize: '1rem' }}>{activeTab === 'archived' ? '↩️' : '📦'}</span>
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

                            {/* Tree Section - compact toggle tied to this habit */}
                            <div
                                className={`${styles.treeSectionDropdown} ${treeOpen ? styles.treeSectionDropdownExpanded : ''}`}
                            >
                                <button
                                    type="button"
                                    className={styles.treeSectionToggle}
                                    id={treeTriggerId}
                                    aria-expanded={treeOpen}
                                    aria-controls={treePanelId}
                                    title={treeOpen ? 'Hide habit tree' : `Show tree for “${habit.name}”`}
                                    onClick={() => {
                                        setTreeSectionsOpen((prev) => ({
                                            ...prev,
                                            [habit.id]: !prev[habit.id],
                                        }));
                                    }}
                                >
                                    <span className={styles.toggleIcon} aria-hidden>
                                        {treeOpen ? '▼' : '▶'}
                                    </span>
                                    <span className={styles.toggleTitle}>
                                        <span className={styles.toggleTreeGlyph} aria-hidden>
                                            🌳
                                        </span>
                                        <span className={styles.toggleTitleText}>
                                            <span className={styles.toggleTreeLabel}>Tree</span>
                                            <span className={styles.toggleHabitName}>{habit.name}</span>
                                        </span>
                                    </span>
                                    <span className={styles.toggleBadge}>Stage {getDisplayTreeStage(habit)}</span>
                                </button>

                                {treeOpen && (
                                    <div
                                        id={treePanelId}
                                        role="region"
                                        aria-labelledby={treeTriggerId}
                                        className={styles.treeSectionContent}
                                    >
                                        {/* Full-Width Window View Tree Display */}
                                        <div className={styles.windowTreeContainer}>
                                            {/* Window Frame Effect */}
                                            <div className={styles.windowFrame}>
                                                {/* Sky Background */}
                                                <div className={styles.skyBackground}>
                                                    {/* Tree Image - Enhanced with Visual Effects */}
                                                    <div 
                                                        className={styles.treeWindowView}
                                                        id={`tree-${habit.id}`}
                                                        onMouseEnter={() => {
                                                            const treeElement = document.getElementById(`tree-${habit.id}`);
                                                            if (treeElement) {
                                                                TreeVisualEffectsManager.addInteractiveEffects(treeElement);
                                                            }
                                                        }}
                                                    >
                                                        <img
                                                            src={treeStages[Math.min(getDisplayTreeStage(habit), treeStages.length - 1)]}
                                                            alt={`Tree Stage ${getDisplayTreeStage(habit) + 1}`}
                                                            className={`${styles.windowTree} ${styles.pixelTree} stage-${getDisplayTreeStage(habit)}`}
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
                                                            <div>Stage: {getDisplayTreeStage(habit) + 1}/6</div>
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
                                                        <span className={styles.levelNumberCompact}>Lv.{getDisplayTreeStage(habit) + 1}</span>
                                                        <span className={styles.stageNameCompact}>
                                                            {getDisplayTreeStage(habit) === 0 && "🌱 Seed"}
                                                            {getDisplayTreeStage(habit) === 1 && "🌱 Sprout"}
                                                            {getDisplayTreeStage(habit) === 2 && "🌿 Sapling"}
                                                            {getDisplayTreeStage(habit) === 3 && "🪴 Young"}
                                                            {getDisplayTreeStage(habit) === 4 && "🌳 Mature"}
                                                            {getDisplayTreeStage(habit) === 5 && "🌳✨ World"}
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
                                                                className={`${styles.stageCard} ${getDisplayTreeStage(habit) === stage.stage ? styles.activeStage : ''}`}
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
                                    {weeklyData.map((day, index) => {
                                        const isAvoidHabit = habit.habitType === 'avoid';
                                        const isPastDay = day.date < today;
                                        const scheduleType = habit.scheduleType || 'daily';
                                        const scheduleDays = habit.scheduleDays && habit.scheduleDays.length > 0
                                            ? habit.scheduleDays
                                            : [0, 1, 2, 3, 4, 5, 6];
                                        const weekdayIndex = new Date(day.date).getDay();
                                        const isScheduled =
                                            scheduleType === 'daily' || scheduleDays.includes(weekdayIndex);

                                        const baseClass = day.isCompleted
                                            ? styles.completed
                                            : isAvoidHabit && isPastDay
                                                ? styles.avoidMiss
                                                : day.isToday
                                                    ? styles.today
                                                    : styles.incomplete;

                                        const dayStatusClass = isScheduled ? baseClass : styles.unscheduled;

                                        return (
                                            <div key={index} className={styles.dayColumn}>
                                                <div className={styles.dayLabel}>{day.dayName}</div>
                                                <div 
                                                    className={`${styles.dayCircle} ${dayStatusClass}`}
                                                    onClick={isScheduled ? () => handleToggleCompletion(habit.id, day.date) : undefined}
                                                >
                                                    {isScheduled && (day.isCompleted ? '✓' : day.isToday ? '○' : '')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Scrollable Month Heatmap */}
                            {isHeatmapExpanded && (
                                <div className={styles.scrollableHeatmapSection}>
                                    <div className={styles.scrollableHeatmapHeader}>
                                        <div className={styles.heatmapTitle}>Activity</div>
                                        <div className={styles.monthNavigation}>
                                            <button
                                                onClick={() => navigateMonth(habit.id, -1, habit.created)}
                                                className={styles.monthNavButton}
                                                disabled={(currentMonthOffset[habit.id] || 0) <= getMinMonthOffset(habit.created || getLocalDateString())}
                                            >
                                                <span style={{ fontSize: '1rem' }}>⬅️</span>
                                            </button>
                                            <span className={styles.monthOffset}>
                                                {(() => {
                                                    const offset = currentMonthOffset[habit.id] || 0;
                                                    if (offset === 0) return 'Current';
                                                    if (offset > 0) return `+${offset} months ahead`;
                                                    return `${Math.abs(offset)} month${Math.abs(offset) === 1 ? '' : 's'} ago`;
                                                })()}
                                            </span>
                                            <button
                                                onClick={() => navigateMonth(habit.id, 1, habit.created)}
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
                                                        {month.days.map((day, dayIndex) => {
                                                            const isAvoidHabit = habit.habitType === 'avoid';
                                                            const isPastDay = day.date < today;
                                                            const isCompleted = day.isCompleted;
                                                            const scheduleType = habit.scheduleType || 'daily';
                                                            const scheduleDays = habit.scheduleDays && habit.scheduleDays.length > 0
                                                                ? habit.scheduleDays
                                                                : [0, 1, 2, 3, 4, 5, 6];
                                                            const weekdayIndex = new Date(day.date).getDay();
                                                            const isScheduled =
                                                                scheduleType === 'daily' || scheduleDays.includes(weekdayIndex);

                                                            const baseDayClass = isCompleted
                                                                ? styles.monthDayCompleted
                                                                : isAvoidHabit && isPastDay
                                                                    ? styles.monthDayAvoidMiss
                                                                    : styles.monthDayIncomplete;

                                                            const dayClass = isScheduled ? baseDayClass : styles.monthDayUnscheduled;
                                                            const dayTitle = `${day.date} - ${
                                                                isCompleted
                                                                    ? 'Completed'
                                                                    : isAvoidHabit && isPastDay
                                                                        ? 'Avoidance failed'
                                                                        : 'Not completed'
                                                            }`;

                                                            return (
                                                                <div
                                                                    key={dayIndex}
                                                                    className={`${styles.monthDay} ${dayClass}`}
                                                                    title={dayTitle}
                                                                    onClick={isScheduled ? () => handleToggleCompletion(habit.id, day.date) : undefined}
                                                                />
                                                            );
                                                        })}
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
            )}

            {/* (Empty state handled above) */}
        </div>
    );
};