// Enhanced Task Linking Types for Pomodoro Integration

export interface AttachedQuest {
    id: string;
    title: string;
    filePath: string;
    lineNumber: number;

    // Enhanced quest properties
    progress: number;
    estimatedDuration: number; // in minutes
    actualTimeSpent: number; // in minutes
    difficulty: 'easy' | 'medium' | 'hard' | 'epic';
    priority: 'low' | 'medium' | 'high' | 'urgent';

    // Quest metadata
    description?: string;
    dueDate?: string;
    tags: string[];
    skills: string[];

    // Enhanced rewards system
    rewards: {
        baseXP: number;
        baseCoins: number;
        cp?: number;
        materials?: string[];
        // New: Dynamic bonuses based on performance
        focusBonus?: number; // Extra XP for uninterrupted sessions
        speedBonus?: number; // Extra XP for completing under estimated time
        streakBonus?: number; // Extra XP for consecutive quest completions
    };

    // Subtasks with enhanced tracking
    subtasks: Array<{
        id: string;
        text: string;
        completed: boolean;
        estimatedMinutes?: number;
        actualMinutes?: number;
        completedAt?: Date;
        pomodoroSessionsUsed?: number;
    }>;

    // Pomodoro integration
    pomodoroSessions: Array<{
        sessionId: string;
        startTime: Date;
        endTime?: Date;
        sessionType: string;
        completed: boolean;
        interruptions: number;
        focusScore: number; // 0-100 based on interruptions and session quality
    }>;

    // Quest analytics
    analytics: {
        totalSessions: number;
        totalTimeSpent: number;
        averageFocusScore: number;
        completionRate: number;
        estimatedVsActual: number; // ratio of actual to estimated time
    };

    // Quest status
    status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
    attachedAt: Date;
    completedAt?: Date;
    isTimedQuest: boolean;
    isCriticalPath: boolean; // For project management integration
}

export interface QuestSuggestion {
    quest: AttachedQuest;
    relevanceScore: number;
    reason: string;
    suggestedSessionType: string;
}

export interface MultiQuestSession {
    id: string;
    attachedQuests: AttachedQuest[];
    sessionType: string;
    totalEstimatedTime: number;
    questDistribution: Array<{
        questId: string;
        allocatedMinutes: number;
        priority: number;
    }>;
    startTime?: Date;
    endTime?: Date;
}

// Enhanced task linking service interface
export interface TaskLinkingService {
    // Smart quest suggestions
    suggestQuests(sessionType: string, availableTime: number): Promise<QuestSuggestion[]>;

    // Multi-quest management
    createMultiQuestSession(quests: AttachedQuest[], sessionType: string): MultiQuestSession;

    // Quest performance tracking
    updateQuestProgress(questId: string, sessionData: any): Promise<void>;

    // Smart time estimation
    estimateQuestDuration(quest: AttachedQuest): number;

    // Quest difficulty scaling
    adjustRewardsForDifficulty(quest: AttachedQuest, performance: any): any;
}
