import type { Tutorial } from '../types/TutorialTypes';

export const TUTORIAL_DEFINITIONS: Tutorial[] = [
    {
        id: 'welcome-tour',
        title: '🎮 Welcome to Gamified Obsidian',
        description: 'Learn the basics of turning your notes into an engaging game experience',
        category: 'getting-started',
        difficulty: 'beginner',
        estimatedTime: 5,
        enabled: true,
        badge: '🏆 First Steps',
        steps: [
            {
                id: 'welcome',
                title: 'Welcome to Your Gaming Journey!',
                description: 'Transform your productivity into an engaging RPG experience. Let\'s explore the main features together.',
                position: 'center',
                skippable: true,
                showSkip: true,
                showNext: true
            },
            {
                id: 'tabs-overview',
                title: 'Navigation Tabs',
                description: 'These tabs give you access to different aspects of your gaming experience: Player stats, Quests, Boss battles, Habits, and more.',
                target: '.tab-container, .nav-tabs',
                position: 'bottom',
                showBack: true,
                showNext: true
            },
            {
                id: 'player-tab',
                title: 'Your Player Character',
                description: 'View your level, XP, skills, and character progression. Click on the Player tab to see your stats.',
                target: '[data-tab="player"], .player-tab',
                position: 'bottom',
                action: { type: 'click', target: '[data-tab="player"], .player-tab' },
                showBack: true,
                showNext: true
            },
            {
                id: 'level-xp',
                title: 'Level & Experience',
                description: 'Your level and XP progress. Complete tasks and quests to gain experience and level up!',
                target: '.level-display, .xp-bar, .player-level',
                position: 'left',
                showBack: true,
                showNext: true
            },
            {
                id: 'quest-intro',
                title: 'Quest System',
                description: 'Transform your tasks into epic quests! Click on the Quest tab to manage your adventures.',
                target: '[data-tab="quests"], .quest-tab',
                position: 'bottom',
                action: { type: 'click', target: '[data-tab="quests"], .quest-tab' },
                showBack: true,
                showNext: true
            },
            {
                id: 'tutorial-complete',
                title: 'Ready to Begin!',
                description: 'You\'re all set! Explore the other tutorials in Settings → Tutorials to learn advanced features. Happy gaming!',
                position: 'center',
                showBack: true,
                showNext: false
            }
        ]
    },

    {
        id: 'quest-management',
        title: '📋 Quest Management Mastery',
        description: 'Master the art of creating, organizing, and completing quests',
        category: 'quest-management',
        difficulty: 'beginner',
        estimatedTime: 8,
        enabled: true,
        badge: '🗡️ Quest Master',
        steps: [
            {
                id: 'quest-overview',
                title: 'Quest System Overview',
                description: 'Quests turn your everyday tasks into exciting adventures with XP, rewards, and progression.',
                target: '.quest-list, .quest-container',
                position: 'top',
                showNext: true
            },
            {
                id: 'create-quest',
                title: 'Creating Your First Quest',
                description: 'Click the "Add Quest" button to create a new quest. You can also use templates for common quest types.',
                target: '.add-quest-btn, .create-quest-button',
                position: 'bottom',
                action: { type: 'click', target: '.add-quest-btn, .create-quest-button' },
                showBack: true,
                showNext: true
            },
            {
                id: 'quest-details',
                title: 'Quest Details',
                description: 'Fill in your quest title, description, difficulty, and estimated time. Higher difficulty = more rewards!',
                target: '.quest-form, .modal-content',
                position: 'left',
                showBack: true,
                showNext: true
            },
            {
                id: 'subtasks',
                title: 'Breaking Down with Subtasks',
                description: 'Add subtasks to break large quests into manageable chunks. Each completed subtask gives you progress!',
                target: '.subtask-section, .subtasks-container',
                position: 'right',
                showBack: true,
                showNext: true
            },
            {
                id: 'quest-completion',
                title: 'Completing Quests',
                description: 'Check off subtasks and complete quests to earn XP, coins, and materials. Watch your character grow!',
                target: '.quest-checkbox, .complete-button',
                position: 'top',
                showBack: true,
                showNext: true
            },
            {
                id: 'quest-filters',
                title: 'Organizing with Filters',
                description: 'Use filters to sort by priority, difficulty, or tags. Keep your quest log organized and focused.',
                target: '.quest-filters, .filter-bar',
                position: 'bottom',
                showBack: true,
                showNext: false
            }
        ]
    },

    {
        id: 'boss-battles',
        title: '⚔️ Epic Boss Battles',
        description: 'Learn to face mighty bosses and turn large projects into epic encounters',
        category: 'boss-battles',
        difficulty: 'intermediate',
        estimatedTime: 10,
        enabled: true,
        badge: '🐉 Dragon Slayer',
        prerequisites: ['quest-management'],
        steps: [
            {
                id: 'boss-intro',
                title: 'What Are Boss Battles?',
                description: 'Boss battles transform large, complex projects into epic encounters with unique challenges and huge rewards.',
                target: '.boss-container, .boss-battle-ui',
                position: 'center',
                showNext: true
            },
            {
                id: 'boss-selection',
                title: 'Choosing Your Boss',
                description: 'Select a boss that matches your current project. Each boss has unique personality traits and battle mechanics.',
                target: '.boss-list, .available-bosses',
                position: 'top',
                showBack: true,
                showNext: true
            },
            {
                id: 'boss-personality',
                title: 'Understanding AI Personalities',
                description: 'Each boss has a unique AI personality - Aggressive, Tactical, Chaotic, and more. Study their traits to develop winning strategies.',
                target: '.boss-personality, .personality-display',
                position: 'right',
                showBack: true,
                showNext: true
            },
            {
                id: 'battle-moves',
                title: 'Combat Moves',
                description: 'Your moves are powered by your skills and stats. Different moves are effective against different boss personalities.',
                target: '.move-buttons, .battle-actions',
                position: 'bottom',
                showBack: true,
                showNext: true
            },
            {
                id: 'task-integration',
                title: 'Tasks as Damage',
                description: 'Completing real-world tasks deals damage to the boss. More important tasks = more damage!',
                target: '.linked-tasks, .task-damage',
                position: 'left',
                showBack: true,
                showNext: true
            },
            {
                id: 'victory-rewards',
                title: 'Victory Rewards',
                description: 'Defeating bosses grants massive XP, rare materials, and special achievements. The bigger the boss, the better the loot!',
                target: '.victory-screen, .boss-rewards',
                position: 'center',
                showBack: true,
                showNext: false
            }
        ]
    },

    {
        id: 'habits-pomodoro',
        title: '🌱 Habits & Focus Sessions',
        description: 'Build lasting habits and master focus with gamified Pomodoro sessions',
        category: 'habits-pomodoro',
        difficulty: 'beginner',
        estimatedTime: 7,
        enabled: true,
        badge: '🧘 Zen Master',
        steps: [
            {
                id: 'habits-intro',
                title: 'Growing Your Habit Trees',
                description: 'Habits grow beautiful trees as you maintain consistency. Each habit has its own growing tree visualization.',
                target: '.habit-tree, .tree-visualization',
                position: 'top',
                showNext: true
            },
            {
                id: 'habit-creation',
                title: 'Creating Habits',
                description: 'Add habits that align with your goals. Set the difficulty and choose rewards that motivate you.',
                target: '.add-habit-btn, .habit-form',
                position: 'bottom',
                showBack: true,
                showNext: true
            },
            {
                id: 'habit-streaks',
                title: 'Building Streaks',
                description: 'Consistency is key! Maintain daily streaks to grow your tree from seed to magnificent world tree.',
                target: '.streak-counter, .habit-streak',
                position: 'right',
                showBack: true,
                showNext: true
            },
            {
                id: 'pomodoro-intro',
                title: 'Focus Sessions',
                description: 'Use Pomodoro sessions to maintain deep focus. Different session types give different CP (focus points) rewards.',
                target: '.pomodoro-timer, .session-controls',
                position: 'left',
                showBack: true,
                showNext: true
            },
            {
                id: 'session-types',
                title: 'Session Types',
                description: 'Choose Deep Work (0.3 CP/min), Extended (0.2 CP/min), or Standard (0.1 CP/min) based on your focus needs.',
                target: '.session-type-buttons, .timer-modes',
                position: 'bottom',
                showBack: true,
                showNext: true
            },
            {
                id: 'focus-rewards',
                title: 'Focus Rewards',
                description: 'Completing sessions earns XP, CP, materials, and advances your quests. Stay focused for maximum rewards!',
                target: '.session-rewards, .reward-display',
                position: 'center',
                showBack: true,
                showNext: false
            }
        ]
    },

    {
        id: 'mobile-optimization',
        title: '📱 Mobile Gaming Experience',
        description: 'Learn mobile-specific features and touch interactions for gaming on the go',
        category: 'mobile-specific',
        difficulty: 'beginner',
        estimatedTime: 5,
        enabled: true,
        badge: '📱 Mobile Master',
        steps: [
            {
                id: 'mobile-interface',
                title: 'Mobile-Optimized Interface',
                description: 'The interface automatically adapts for mobile devices with larger touch targets and optimized layouts.',
                position: 'center',
                showNext: true
            },
            {
                id: 'touch-interactions',
                title: 'Touch Interactions',
                description: 'Tap to complete tasks, swipe to navigate between sections, and long-press for additional options.',
                target: '.touch-demo, .mobile-controls',
                position: 'bottom',
                showBack: true,
                showNext: true
            },
            {
                id: 'gesture-controls',
                title: 'Gesture Controls',
                description: 'Swipe left/right on quest cards for quick actions, pinch to zoom on analytics charts.',
                target: '.swipeable, .quest-card',
                position: 'top',
                showBack: true,
                showNext: true
            },
            {
                id: 'mobile-notifications',
                title: 'Mobile Notifications',
                description: 'Receive mobile-optimized notifications for achievements, completed sessions, and quest progress.',
                target: '.notification-area',
                position: 'top',
                showBack: true,
                showNext: true
            },
            {
                id: 'offline-sync',
                title: 'Offline Capability',
                description: 'Continue gaming even offline! Your progress syncs automatically when you reconnect.',
                position: 'center',
                showBack: true,
                showNext: false
            }
        ]
    },

    {
        id: 'analytics-achievements',
        title: '📊 Analytics & Achievements',
        description: 'Master your performance tracking and unlock prestigious achievements',
        category: 'analytics-achievements',
        difficulty: 'intermediate',
        estimatedTime: 6,
        enabled: true,
        badge: '📈 Analytics Expert',
        steps: [
            {
                id: 'analytics-overview',
                title: 'Your Performance Dashboard',
                description: 'Track your productivity patterns, battle performance, and progress over time with detailed analytics.',
                target: '.analytics-dashboard, .analytics-tab',
                position: 'top',
                showNext: true
            },
            {
                id: 'achievement-system',
                title: 'Achievement System',
                description: 'Unlock achievements for various milestones: speed victories, perfect streaks, boss masteries, and more.',
                target: '.achievements-panel, .achievement-list',
                position: 'right',
                showBack: true,
                showNext: true
            },
            {
                id: 'progress-tracking',
                title: 'Progress Tracking',
                description: 'Monitor your improvement with trend analysis, performance metrics, and AI-powered insights.',
                target: '.progress-charts, .trend-analysis',
                position: 'left',
                showBack: true,
                showNext: true
            },
            {
                id: 'ai-insights',
                title: 'AI-Powered Insights',
                description: 'Get personalized recommendations based on your performance patterns and areas for improvement.',
                target: '.ai-insights, .recommendations',
                position: 'bottom',
                showBack: true,
                showNext: false
            }
        ]
    }
];

export const getTutorialById = (id: string): Tutorial | undefined => {
    return TUTORIAL_DEFINITIONS.find(tutorial => tutorial.id === id);
};

export const getTutorialsByCategory = (category: string): Tutorial[] => {
    return TUTORIAL_DEFINITIONS.filter(tutorial => tutorial.category === category);
};

export const getBeginnerTutorials = (): Tutorial[] => {
    return TUTORIAL_DEFINITIONS.filter(tutorial => tutorial.difficulty === 'beginner');
};

export const getEnabledTutorials = (): Tutorial[] => {
    return TUTORIAL_DEFINITIONS.filter(tutorial => tutorial.enabled);
};
