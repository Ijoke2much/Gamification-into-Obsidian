// Pomodoro Statistics and Achievement Types
export interface PomodoroStats {
    // Session Counters (Feature 2)
    totalSessions: number;
    todaySessions: number;
    weekSessions: number;
    thisWeekSessions: number;

    // Streak System (Feature 3)
    currentStreak: number;
    longestStreak: number;
    lastSessionDate: string;
    streakStartDate: string;

    // XP System
    totalPomodoroXP: number;
    todayXP: number;
    weekXP: number;

    // Session Types Tracking
    sessionsByType: {
        classic: number;
        extended: number;
        short: number;
        custom: number;
        deepWork: number;
        quickFocus: number;
    };

    // Daily/Weekly Reset Tracking
    lastResetDate: string;
    lastWeekResetDate: string;

    // Additional analytics properties
    todayFocusTime?: number; // Total focus time today in minutes
}

// Achievement System (Feature 4)
export interface PomodoroAchievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
    unlockedAt?: string;
    category: 'sessions' | 'streaks' | 'xp' | 'special';
    requirement: {
        type: 'sessions' | 'streak' | 'xp' | 'sessionType';
        value: number;
        sessionType?: keyof PomodoroStats['sessionsByType'];
    };
}

// Session Types (Feature 5)
export interface SessionType {
    id: string;
    name: string;
    description: string;
    duration: number; // in seconds
    breakDuration: number; // in seconds
    xpMultiplier: number;
    icon: string;
    color: string;
    category: 'deepWork' | 'quickFocus' | 'standard';
}

// Notification System
export interface PomodoroNotification {
    id: string;
    type: 'achievement' | 'streak' | 'milestone' | 'xp' | 'info';
    title: string;
    message: string;
    icon: string;
    timestamp: number;
    duration: number; // how long to show (ms)
}