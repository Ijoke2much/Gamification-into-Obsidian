import { SearchPreset } from '../types/SearchTypes';

export const SEARCH_PRESETS: SearchPreset[] = [
    {
        id: 'quick-wins',
        name: 'Quick Wins',
        description: 'Low energy, short duration tasks',
        icon: '⚡',
        color: '#10b981',
        filters: {
            energyRange: { min: 1, max: 15 },
            durationRange: { min: 1, max: 15 },
            energyMatch: ['perfect', 'good'],
            status: ['active']
        }
    },
    {
        id: 'deep-work',
        name: 'Deep Work',
        description: 'High energy, long duration tasks',
        icon: '🧠',
        color: '#3b82f6',
        filters: {
            energyRange: { min: 25, max: 50 },
            durationRange: { min: 60, max: 480 },
            energyMatch: ['challenging'],
            status: ['active']
        }
    },
    {
        id: 'overdue-tasks',
        name: 'Overdue Tasks',
        description: 'Tasks that are past their due date',
        icon: '🚨',
        color: '#ef4444',
        filters: {
            status: ['overdue']
        }
    },
    {
        id: 'todays-focus',
        name: "Today's Focus",
        description: 'Tasks due today',
        icon: '📅',
        color: '#f59e0b',
        filters: {
            dueDateRange: {
                start: new Date(new Date().setHours(0, 0, 0, 0)),
                end: new Date(new Date().setHours(23, 59, 59, 999))
            },
            status: ['active']
        }
    },
    {
        id: 'high-priority',
        name: 'High Priority',
        description: 'High and highest priority tasks',
        icon: '🔺',
        color: '#dc2626',
        filters: {
            priority: ['high', 'highest'],
            status: ['active']
        }
    },
    {
        id: 'recurring-tasks',
        name: 'Recurring Tasks',
        description: 'Tasks that repeat regularly',
        icon: '🔄',
        color: '#8b5cf6',
        filters: {
            isRecurring: true,
            status: ['active']
        }
    },
    {
        id: 'favorites',
        name: 'Favorites',
        description: 'Your favorite tasks',
        icon: '⭐',
        color: '#f59e0b',
        filters: {
            isFavorite: true,
            status: ['active']
        }
    },
    {
        id: 'creative-tasks',
        name: 'Creative Tasks',
        description: 'Tasks involving creative skills',
        icon: '🎨',
        color: '#ec4899',
        filters: {
            skills: ['creative', 'design', 'writing', 'art', 'music', 'photography'],
            status: ['active']
        }
    },
    {
        id: 'learning-tasks',
        name: 'Learning Tasks',
        description: 'Tasks focused on skill development',
        icon: '📚',
        color: '#06b6d4',
        filters: {
            skills: ['learning', 'study', 'education', 'training', 'course'],
            status: ['active']
        }
    },
    {
        id: 'physical-tasks',
        name: 'Physical Tasks',
        description: 'Tasks involving physical activity',
        icon: '💪',
        color: '#84cc16',
        filters: {
            skills: ['exercise', 'fitness', 'sports', 'physical', 'health'],
            status: ['active']
        }
    },
    {
        id: 'completed-today',
        name: 'Completed Today',
        description: 'Tasks completed today',
        icon: '✅',
        color: '#10b981',
        filters: {
            status: ['completed'],
            createdDateRange: {
                start: new Date(new Date().setHours(0, 0, 0, 0)),
                end: new Date(new Date().setHours(23, 59, 59, 999))
            }
        }
    },
    {
        id: 'high-reward',
        name: 'High Reward',
        description: 'Tasks with high XP and CP rewards',
        icon: '💰',
        color: '#f59e0b',
        filters: {
            xpRange: { min: 500, max: 10000 },
            cpRange: { min: 100, max: 10000 },
            status: ['active']
        }
    }
];

export const getPresetById = (id: string): SearchPreset | undefined => {
    return SEARCH_PRESETS.find(preset => preset.id === id);
};

export const getPresetsByCategory = (category: 'productivity' | 'energy' | 'priority' | 'rewards' | 'status'): SearchPreset[] => {
    const categoryMap = {
        productivity: ['quick-wins', 'deep-work', 'todays-focus'],
        energy: ['quick-wins', 'deep-work'],
        priority: ['high-priority', 'overdue-tasks'],
        rewards: ['high-reward'],
        status: ['favorites', 'recurring-tasks', 'completed-today']
    };

    return SEARCH_PRESETS.filter(preset =>
        categoryMap[category].includes(preset.id)
    );
};
