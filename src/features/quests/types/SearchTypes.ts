import { Quest } from '../utils/taskParser';

// Advanced search filter types
export interface AdvancedSearchFilters {
    // Text search
    search: string;
    searchFields: SearchField[];

    // Multi-criteria filters
    priority: string[];
    difficulty: string[];
    skills: string[];
    tags: string[];

    // Energy & time filters
    energyRange: { min: number; max: number };
    durationRange: { min: number; max: number }; // in minutes
    energyMatch: EnergyMatchType[];

    // Date filters
    dueDateRange: { start: Date | null; end: Date | null };
    createdDateRange: { start: Date | null; end: Date | null };

    // Reward filters
    xpRange: { min: number; max: number };
    cpRange: { min: number; max: number };

    // Recurring filters
    isRecurring: boolean | null;
    recurrenceTypes: string[];

    // Status filters
    status: QuestStatus[];
    isFavorite: boolean | null;

    // Completion filters
    subtaskCompletion: SubtaskCompletionFilter;
}

export type SearchField = 'title' | 'description' | 'skills' | 'subtasks' | 'tags' | 'notes';
export type EnergyMatchType = 'perfect' | 'good' | 'challenging' | 'insufficient';
export type QuestStatus = 'active' | 'completed' | 'overdue';
export type SubtaskCompletionFilter = 'all' | 'incomplete' | 'partial' | 'complete';

// Search preset types
export interface SearchPreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    filters: Partial<AdvancedSearchFilters>;
    color: string;
}

// Search result types
export interface SearchResult {
    quest: Quest;
    matchScore: number;
    matchedFields: SearchField[];
    energyMatch: EnergyMatchType;
    highlights: {
        field: SearchField;
        text: string;
        startIndex: number;
        endIndex: number;
    }[];
}

// Filter chip types
export interface FilterChip {
    id: string;
    label: string;
    value: string;
    type: 'search' | 'priority' | 'difficulty' | 'skill' | 'tag' | 'energy' | 'duration' | 'date' | 'reward' | 'recurring' | 'status';
    removable: boolean;
    color: string;
}

// Search suggestions
export interface SearchSuggestion {
    text: string;
    type: 'skill' | 'tag' | 'title' | 'description';
    count: number;
    icon: string;
}
