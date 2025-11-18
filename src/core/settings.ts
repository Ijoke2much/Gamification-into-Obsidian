import { TreeRewardConfig, DEFAULT_TREE_REWARD_CONFIG } from '../features/habits/utils/treeRewardSystem';

// ============================================================================
// SETTINGS CATEGORIES FOR CARD VIEW
// ============================================================================

export interface SettingsCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  settings: string[];
}

// ============================================================================
// ENHANCED SETTINGS CATEGORIES WITH GROUPED PANELS
// ============================================================================

export interface SettingsGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  categories: SettingsCategory[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'quests',
    name: 'Quests & Timeline',
    icon: '📋',
    description: 'Quest management, timeline view, and task tracking',
    color: '#4CAF50',
    categories: [
      {
        id: 'quest-system',
        name: 'Quest System',
        icon: '🎯',
        description: 'Quest board, auto-refresh, and display settings',
        color: '#4CAF50',
        settings: ['enableSidebarQuestBoard', 'questBoardPosition', 'autoRefreshTasks', 'hideCompletedQuests', 'questRefreshInterval']
      },
      {
        id: 'timeline',
        name: 'Timeline & Calendar',
        icon: '📅',
        description: 'Timeline view, calendar integration, and scheduling',
        color: '#2196F3',
        settings: ['timelineViewSettings', 'calendarIntegration', 'schedulingPreferences']
      }
    ]
  },
  {
    id: 'rewards',
    name: 'Rewards & Progression',
    icon: '🏆',
    description: 'Currency, rewards, shop system, and progression mechanics',
    color: '#FFD700',
    categories: [
      {
        id: 'currency',
        name: 'Currency & Rewards',
        icon: '🪙',
        description: 'Configure XP, coins, and reward systems',
        color: '#FFD700',
        settings: ['xpPerTask', 'coinPerTask', 'currencyName', 'currencySymbol', 'levelingFormula']
      },
      {
        id: 'shop',
        name: 'Shop System',
        icon: '🛒',
        description: 'Seasonal shop, events, and inventory rotation',
        color: '#9C27B0',
        settings: ['enableSeasonalShop', 'shopRotationDays', 'enableSpecialEvents', 'dragonFestivalEnabled', 'mysticalMarketEnabled']
      },
      {
        id: 'tree',
        name: 'Tree Rewards',
        icon: '🌳',
        description: 'Habit tree growth and reward multipliers',
        color: '#8BC34A',
        settings: ['treeRewardConfig']
      }
    ]
  },
  {
    id: 'performance',
    name: 'Performance & Energy',
    icon: '⚡',
    description: 'Performance optimization, energy system, and focus mechanics',
    color: '#FF9800',
    categories: [
      {
        id: 'energy',
        name: 'Energy & Focus',
        icon: '⚡',
        description: 'Energy system, daily resets, and recovery rates',
        color: '#2196F3',
        settings: ['enableEnergyHUD', 'dailyResetHour', 'dailyRestoreEnergy', 'dailyRestoreFocus', 'dailyRestoreMotivation', 'dailyRestoreCalm', 'dailyRestoreStressReduce']
      },
      {
        id: 'performance',
        name: 'Performance',
        icon: '🚀',
        description: 'Performance optimization and caching settings',
        color: '#FF9800',
        settings: ['performanceSettings']
      }
    ]
  },
  {
    id: 'appearance',
    name: 'Appearance & Localization',
    icon: '🎨',
    description: 'Theming, internationalization, and accessibility settings',
    color: '#8B5CF6',
    categories: [
      {
        id: 'theming',
        name: 'Theming',
        icon: '🎨',
        description: 'Dark/light mode, accent colors, and visual customization',
        color: '#8B5CF6',
        settings: ['themeMode', 'accentColor', 'colorPalette', 'accessibilitySettings']
      },
      {
        id: 'internationalization',
        name: 'Internationalization',
        icon: '🌍',
        description: 'Language, date/time formatting, and regional settings',
        color: '#06B6D4',
        settings: ['locale', 'dateFormat', 'timeFormat', 'numberFormat']
      }
    ]
  },
  {
    id: 'advanced',
    name: 'Advanced & Management',
    icon: '🔧',
    description: 'Advanced settings, penalties, and system management',
    color: '#795548',
    categories: [
      {
        id: 'penalties',
        name: 'Penalties & Consequences',
        icon: '⚠️',
        description: 'Failure penalties and debt management',
        color: '#FF5722',
        settings: ['penaltyLowPct', 'penaltyMediumPct', 'penaltyHighPct', 'dailyDebtCapXP', 'dailyDebtCapCoins', 'pomodoroFailOnlyOnReset']
      },
      {
        id: 'advanced-config',
        name: 'Advanced Configuration',
        icon: '🔧',
        description: 'Advanced configuration and system settings',
        color: '#795548',
        settings: ['questCostEasyMental', 'questCostEasyPhysical', 'questCostEasyEmotional', 'questCostMediumMental', 'questCostMediumPhysical', 'questCostMediumEmotional', 'questCostHardMental', 'questCostHardPhysical', 'questCostHardEmotional', 'pomoCostPerMinMental', 'pomoCostPerMinPhysical', 'pomoCostPerMinEmotional', 'breakRestEnergy', 'breakRestFocus', 'breakRestMotivation', 'breakWalkEnergy', 'breakWalkFocus', 'breakWalkMotivation', 'breakMeditationEnergy', 'breakMeditationFocus', 'breakMeditationMotivation', 'breakYogaEnergy', 'breakYogaFocus', 'breakYogaMotivation']
      },
      {
        id: 'files',
        name: 'File Paths',
        icon: '📁',
        description: 'Customize folder and file locations',
        color: '#607D8B',
        settings: ['shopkeeperImagePath', 'questGiverImagePath', 'avatarFolder', 'inventoryFilePath', 'skillTreeRoot', 'masterClassFolder', 'classFolder', 'skillFolder', 'statFolder']
      },
      {
        id: 'tutorials',
        name: 'Tutorials & Help',
        icon: '🎓',
        description: 'Interactive tutorials and onboarding system',
        color: '#6366F1',
        settings: ['tutorialSettings']
      },
      {
        id: 'reset',
        name: 'Reset & Management',
        icon: '🔄',
        description: 'Reset individual systems and player progress',
        color: '#F44336',
        settings: ['resetOptions']
      }
    ]
  }
];

// Legacy categories for backward compatibility
export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'currency',
    name: 'Currency & Rewards',
    icon: '🪙',
    description: 'Configure XP, coins, and reward systems',
    color: '#FFD700',
    settings: ['xpPerTask', 'coinPerTask', 'currencyName', 'currencySymbol', 'levelingFormula']
  },
  {
    id: 'quests',
    name: 'Quest System',
    icon: '📋',
    description: 'Quest board, auto-refresh, and display settings',
    color: '#4CAF50',
    settings: ['enableSidebarQuestBoard', 'questBoardPosition', 'autoRefreshTasks', 'hideCompletedQuests', 'questRefreshInterval']
  },
  {
    id: 'energy',
    name: 'Energy & Focus',
    icon: '⚡',
    description: 'Energy system, daily resets, and recovery rates',
    color: '#2196F3',
    settings: ['enableEnergyHUD', 'dailyResetHour', 'dailyRestoreEnergy', 'dailyRestoreFocus', 'dailyRestoreMotivation', 'dailyRestoreCalm', 'dailyRestoreStressReduce']
  },
  {
    id: 'penalties',
    name: 'Penalties & Consequences',
    icon: '⚠️',
    description: 'Failure penalties and debt management',
    color: '#FF5722',
    settings: ['penaltyLowPct', 'penaltyMediumPct', 'penaltyHighPct', 'dailyDebtCapXP', 'dailyDebtCapCoins', 'pomodoroFailOnlyOnReset']
  },
  {
    id: 'shop',
    name: 'Shop System',
    icon: '🛒',
    description: 'Seasonal shop, events, and inventory rotation',
    color: '#9C27B0',
    settings: ['enableSeasonalShop', 'shopRotationDays', 'enableSpecialEvents', 'dragonFestivalEnabled', 'mysticalMarketEnabled']
  },
  {
    id: 'tree',
    name: 'Tree Rewards',
    icon: '🌳',
    description: 'Habit tree growth and reward multipliers',
    color: '#8BC34A',
    settings: ['treeRewardConfig']
  },
  {
    id: 'tutorials',
    name: 'Tutorials & Help',
    icon: '🎓',
    description: 'Interactive tutorials and onboarding system',
    color: '#6366F1',
    settings: ['tutorialSettings']
  },
  {
    id: 'files',
    name: 'File Paths',
    icon: '📁',
    description: 'Customize folder and file locations',
    color: '#607D8B',
    settings: ['shopkeeperImagePath', 'questGiverImagePath', 'avatarFolder', 'inventoryFilePath', 'skillTreeRoot', 'masterClassFolder', 'classFolder', 'skillFolder', 'statFolder']
  },
  {
    id: 'performance',
    name: 'Performance',
    icon: '⚡',
    description: 'Performance optimization and caching settings',
    color: '#FF9800',
    settings: ['performanceSettings']
  },
  {
    id: 'advanced',
    name: 'Advanced',
    icon: '🔧',
    description: 'Advanced configuration and system settings',
    color: '#795548',
    settings: ['questCostEasyMental', 'questCostEasyPhysical', 'questCostEasyEmotional', 'questCostMediumMental', 'questCostMediumPhysical', 'questCostMediumEmotional', 'questCostHardMental', 'questCostHardPhysical', 'questCostHardEmotional', 'pomoCostPerMinMental', 'pomoCostPerMinPhysical', 'pomoCostPerMinEmotional', 'breakRestEnergy', 'breakRestFocus', 'breakRestMotivation', 'breakWalkEnergy', 'breakWalkFocus', 'breakWalkMotivation', 'breakMeditationEnergy', 'breakMeditationFocus', 'breakMeditationMotivation', 'breakYogaEnergy', 'breakYogaFocus', 'breakYogaMotivation']
  },
  {
    id: 'reset',
    name: 'Reset & Management',
    icon: '🔄',
    description: 'Reset individual systems and player progress',
    color: '#F44336',
    settings: ['resetOptions']
  }
];

// ============================================================================
// SETTINGS VALIDATION
// ============================================================================

export interface SettingsValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSettings(settings: GamificationPluginSettings): SettingsValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Currency validation
  if (settings.xpPerTask < 0) {
    errors.push("XP per task cannot be negative");
  }
  if (settings.coinPerTask < 0) {
    errors.push("Coins per task cannot be negative");
  }
  if (!settings.currencyName?.trim()) {
    errors.push("Currency name is required");
  }

  // Penalty validation
  if (settings.penaltyLowPct < 0 || settings.penaltyLowPct > 1) {
    errors.push("Low penalty percentage must be between 0 and 1");
  }
  if (settings.penaltyMediumPct < 0 || settings.penaltyMediumPct > 1) {
    errors.push("Medium penalty percentage must be between 0 and 1");
  }
  if (settings.penaltyHighPct < 0 || settings.penaltyHighPct > 1) {
    errors.push("High penalty percentage must be between 0 and 1");
  }

  // Energy validation
  if (settings.dailyResetHour !== undefined && (settings.dailyResetHour < 0 || settings.dailyResetHour > 23)) {
    errors.push("Daily reset hour must be between 0 and 23");
  }

  // Quest board validation
  if (settings.questRefreshInterval < 0) {
    errors.push("Quest refresh interval cannot be negative");
  }

  // Warnings
  if (settings.xpPerTask === 0) {
    warnings.push("XP per task is set to 0 - players won't gain XP");
  }
  if (settings.coinPerTask === 0) {
    warnings.push("Coins per task is set to 0 - players won't gain coins");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// SETTINGS PRESETS
// ============================================================================

export interface SettingsPreset {
  name: string;
  description: string;
  icon: string;
  settings: Partial<GamificationPluginSettings>;
}

export const SETTINGS_PRESETS: SettingsPreset[] = [
  {
    name: "Beginner Friendly",
    description: "Gentle settings for new players with lower penalties and higher rewards. Perfect for getting started!",
    icon: "🌟",
    settings: {
      xpPerTask: 15,
      coinPerTask: 8,
      penaltyLowPct: 0.05,
      penaltyMediumPct: 0.10,
      penaltyHighPct: 0.15,
      enableSidebarQuestBoard: true,
      autoRefreshTasks: false,
      hideCompletedQuests: false,
      timelineViewSettings: {
        enableTimelineView: true,
        defaultTimelineView: 'day',
        showCompletedTasks: true,
        groupByCategory: true,
        enableTimeBlocks: true
      }
    }
  },
  {
    name: "Hardcore Mode",
    description: "Challenging settings with higher penalties and lower rewards. For experienced players seeking a challenge!",
    icon: "💀",
    settings: {
      xpPerTask: 5,
      coinPerTask: 2,
      penaltyLowPct: 0.20,
      penaltyMediumPct: 0.35,
      penaltyHighPct: 0.50,
      dailyDebtCapXP: 1000,
      dailyDebtCapCoins: 100,
      enableSidebarQuestBoard: true,
      autoRefreshTasks: true,
      questRefreshInterval: 15,
      hideCompletedQuests: true
    }
  },
  {
    name: "Focus on Energy",
    description: "Emphasizes energy management with higher energy costs and recovery. Great for productivity-focused users!",
    icon: "⚡",
    settings: {
      questCostEasyMental: 8,
      questCostEasyPhysical: 3,
      questCostEasyEmotional: 3,
      questCostMediumMental: 15,
      questCostMediumPhysical: 8,
      questCostMediumEmotional: 8,
      questCostHardMental: 25,
      questCostHardPhysical: 15,
      questCostHardEmotional: 12,
      dailyRestoreEnergy: 50,
      dailyRestoreFocus: 35,
      dailyRestoreMotivation: 40,
      dailyRestoreCalm: 25,
      dailyRestoreStressReduce: 20,
      enableEnergyHUD: true,
      schedulingPreferences: {
        defaultTaskDuration: 45,
        enableSmartScheduling: true,
        workingHoursStart: 8,
        workingHoursEnd: 18
      }
    }
  },
  {
    name: "Quest Master",
    description: "Optimized for quest-heavy gameplay with enhanced quest features and timeline integration!",
    icon: "📋",
    settings: {
      enableSidebarQuestBoard: true,
      autoRefreshTasks: true,
      questRefreshInterval: 30,
      hideCompletedQuests: true,
      xpPerTask: 12,
      coinPerTask: 6,
      timelineViewSettings: {
        enableTimelineView: true,
        defaultTimelineView: 'week',
        showCompletedTasks: true,
        groupByCategory: true,
        enableTimeBlocks: true
      },
      schedulingPreferences: {
        defaultTaskDuration: 30,
        enableSmartScheduling: true,
        workingHoursStart: 9,
        workingHoursEnd: 17
      }
    }
  },
  {
    name: "Shop Enthusiast",
    description: "Enhanced shop features with frequent rotations and events. Perfect for collection-focused gameplay!",
    icon: "🛒",
    settings: {
      enableSeasonalShop: true,
      shopRotationDays: 3,
      enableSpecialEvents: true,
      dragonFestivalEnabled: true,
      mysticalMarketEnabled: true,
      xpPerTask: 8,
      coinPerTask: 10, // Higher coin rewards for shop purchases
      treeRewardConfig: {
        enableProgressiveRewards: true,
        enableItemDrops: true,
        itemDropChance: 0.15,
        customRewards: {
          0: { xpMultiplier: 1.0, cpMultiplier: 1.0, coinMultiplier: 1.0 },    // Seed
          1: { xpMultiplier: 1.05, cpMultiplier: 1.05, coinMultiplier: 1.05 }, // Sprout
          2: { xpMultiplier: 1.1, cpMultiplier: 1.1, coinMultiplier: 1.1 },    // Sapling
          3: { xpMultiplier: 1.15, cpMultiplier: 1.15, coinMultiplier: 1.15 }, // Young Tree
          4: { xpMultiplier: 1.2, cpMultiplier: 1.2, coinMultiplier: 1.2 },    // Mature Tree
          5: { xpMultiplier: 1.25, cpMultiplier: 1.25, coinMultiplier: 1.25 }, // World Tree
        }
      }
    }
  },
  {
    name: "Safe Defaults",
    description: "Reset all settings to their safe, recommended defaults. Perfect for troubleshooting or starting fresh!",
    icon: "🛡️",
    settings: {
      // This will be populated with DEFAULT_SETTINGS in the UI
    }
  }
];

// ============================================================================
// MAIN SETTINGS INTERFACE
// ============================================================================

export interface GamificationPluginSettings {
  xpPerTask: number;
  coinPerTask: number;
  currencyName?: string;
  currencySymbol?: string;
  levelingFormula: string;
  shopkeeperImagePath: string; // Path or URL to the shopkeeper image
  questGiverImagePath: string; // Path or URL to the quest giver image
  avatarFolder: string; // Folder for avatar images
  inventoryFilePath: string; // Path to the inventory file
  skillTreeRoot: string; // Root folder for skill tree (default: 'SkillTree')
  masterClassFolder: string; // Folder for master class files
  classFolder: string; // Folder for class files
  skillFolder: string; // Folder for skill files
  statFolder: string; // Folder for stat files

  // Quest Board Settings
  enableSidebarQuestBoard: boolean; // Enable compact sidebar quest board
  questBoardPosition: 'left' | 'right'; // Position of the quest board in sidebar
  autoRefreshTasks: boolean; // Auto-refresh tasks when files change
  hideCompletedQuests: boolean; // Hide completed quests by default
  questRefreshInterval: number; // Quest refresh interval in seconds (0 = disabled)

  // Timeline & Calendar Settings
  timelineViewSettings?: {
    enableTimelineView: boolean;
    defaultTimelineView: 'day' | 'week' | 'month';
    showCompletedTasks: boolean;
    groupByCategory: boolean;
    enableTimeBlocks: boolean;
  };
  calendarIntegration?: {
    enableCalendarSync: boolean;
    calendarProvider: 'google' | 'outlook' | 'apple' | 'none';
    syncFrequency: number; // minutes
  };
  schedulingPreferences?: {
    defaultTaskDuration: number; // minutes
    enableSmartScheduling: boolean;
    workingHoursStart: number; // 0-23
    workingHoursEnd: number; // 0-23
  };

  // Tutorial Settings
  tutorialSettings?: {
    enabled: boolean;
    showWelcomeTutorial: boolean;
    autoStartTutorials: boolean;
    showTutorialBadges: boolean;
    mobileOptimizations: boolean;
    preferences: {
      enableTooltips: boolean;
      enableHighlights: boolean;
      autoPlay: boolean;
      reducedAnimations: boolean;
      mobileOptimized: boolean;
      showProgressBar: boolean;
      enableSounds: boolean;
      pauseOnWindowBlur: boolean;
    };
  };

  // Failure penalty settings
  penaltyLowPct: number;     // 0.10 default
  penaltyMediumPct: number;  // 0.20 default
  penaltyHighPct: number;    // 0.30 default
  dailyDebtCapXP: number;    // Max XP debt added per day
  dailyDebtCapCoins: number; // Max coin debt added per day
  pomodoroFailOnlyOnReset: boolean; // If true, only Reset counts as failure

  // Energy/Focus system settings
  enableEnergyHUD?: boolean;
  dailyResetHour?: number; // 0-23
  // Daily restore values
  dailyRestoreEnergy?: number;
  dailyRestoreFocus?: number;
  dailyRestoreMotivation?: number;
  dailyRestoreCalm?: number;
  dailyRestoreStressReduce?: number;
  // Quest energy costs by difficulty
  questCostEasyMental?: number;
  questCostEasyPhysical?: number;
  questCostEasyEmotional?: number;
  questCostMediumMental?: number;
  questCostMediumPhysical?: number;
  questCostMediumEmotional?: number;
  questCostHardMental?: number;
  questCostHardPhysical?: number;
  questCostHardEmotional?: number;
  // Pomodoro per-minute costs
  pomoCostPerMinMental?: number;
  pomoCostPerMinPhysical?: number;
  pomoCostPerMinEmotional?: number;
  // Break recoveries
  breakRestEnergy?: number;
  breakRestFocus?: number;
  breakRestMotivation?: number;
  breakWalkEnergy?: number;
  breakWalkFocus?: number;
  breakWalkMotivation?: number;
  breakMeditationEnergy?: number;
  breakMeditationFocus?: number;
  breakMeditationMotivation?: number;
  breakYogaEnergy?: number;
  breakYogaFocus?: number;
  breakYogaMotivation?: number;

  // Tree Reward System Settings
  treeRewardConfig: TreeRewardConfig;

  // Shop System Settings
  enableSeasonalShop?: boolean;
  shopRotationDays?: number;
  enableSpecialEvents?: boolean;
  dragonFestivalEnabled?: boolean;
  mysticalMarketEnabled?: boolean;

  // Performance Settings
  performanceSettings?: {
    enableCache: boolean;
    cacheTTL: number; // milliseconds
    maxCacheSize: number; // number of entries
    maxCacheMemoryMB: number; // megabytes
    enableDebouncedWrites: boolean;
    writeDebounceDelay: number; // milliseconds
    maxWriteBatchSize: number;
    enableWorkerParsing: boolean;
    maxWorkers: number;
    parsingChunkSize: number; // lines per chunk
    autoCleanupInterval: number; // milliseconds
  };

  // Internationalization Settings
  internationalization?: {
    locale: string;
    dateFormat: 'short' | 'medium' | 'long' | 'full';
    timeFormat: 'short' | 'medium' | 'long';
    numberFormat: 'standard' | 'scientific' | 'engineering';
    currencyFormat: 'standard' | 'accounting';
  };

  // Theming Settings
  theming?: {
    mode: 'light' | 'dark' | 'auto';
    accentColor: string;
    colorPalette: 'default' | 'ocean' | 'forest' | 'sunset' | 'custom';
    accessibility: {
      colorBlindFriendly: boolean;
      highContrast: boolean;
      reducedMotion: boolean;
    };
    customColors?: {
      primary: string;
      secondary: string;
      success: string;
      warning: string;
      error: string;
      background: string;
      surface: string;
      text: string;
      textSecondary: string;
    };
  };

  // Beta / Feature Flags
  betaMode?: boolean;
  featureFlags?: {
    enableAnalyticsTab: boolean;
    enableEnergyDebug: boolean;
  };

  // Reset Options (not saved in settings, used for UI actions)
  resetOptions?: {
    resetSkills?: boolean;
    resetMasterClass?: boolean;
    resetClass?: boolean;
    resetStats?: boolean;
    resetPlayerProgress?: boolean;
  };
}

export const DEFAULT_SETTINGS: GamificationPluginSettings = {
  xpPerTask: 10,
  coinPerTask: 5,
  currencyName: "Coins",
  currencySymbol: "🪙",
  levelingFormula: "linear",
  shopkeeperImagePath: "assets/shopkeeper.jpg", // Default image path
  questGiverImagePath: "assets/quest-giver.jpg", // Default quest giver image path
  avatarFolder: 'assets/',
  inventoryFilePath: 'Inventory.md', // Default inventory file path
  skillTreeRoot: 'SkillTree', // Default skill tree root folder
  masterClassFolder: 'SkillTree/Master-Class',
  classFolder: 'SkillTree/Master-Class/Class',
  skillFolder: 'SkillTree/Master-Class/Class/Skills',
  statFolder: 'SkillTree/Master-Class/Stats',

  // Quest Board Default Settings
  enableSidebarQuestBoard: true,
  questBoardPosition: 'right',
  autoRefreshTasks: false,
  hideCompletedQuests: false,
  questRefreshInterval: 0, // Default to disabled

  // Timeline & Calendar Default Settings
  timelineViewSettings: {
    enableTimelineView: true,
    defaultTimelineView: 'day',
    showCompletedTasks: true,
    groupByCategory: true,
    enableTimeBlocks: true
  },
  calendarIntegration: {
    enableCalendarSync: false,
    calendarProvider: 'none',
    syncFrequency: 60 // 1 hour
  },
  schedulingPreferences: {
    defaultTaskDuration: 25, // 25 minutes (Pomodoro)
    enableSmartScheduling: true,
    workingHoursStart: 9,
    workingHoursEnd: 17
  },

  // Failure penalty defaults
  penaltyLowPct: 0.10,
  penaltyMediumPct: 0.20,
  penaltyHighPct: 0.30,
  dailyDebtCapXP: 500,
  dailyDebtCapCoins: 50,
  pomodoroFailOnlyOnReset: true,

  // Energy/Focus defaults (mirror runtime defaults)
  enableEnergyHUD: true,
  dailyResetHour: 6,
  dailyRestoreEnergy: 30,
  dailyRestoreFocus: 20,
  dailyRestoreMotivation: 25,
  dailyRestoreCalm: 15,
  dailyRestoreStressReduce: 10,
  questCostEasyMental: 5,
  questCostEasyPhysical: 2,
  questCostEasyEmotional: 2,
  questCostMediumMental: 10,
  questCostMediumPhysical: 5,
  questCostMediumEmotional: 5,
  questCostHardMental: 15,
  questCostHardPhysical: 10,
  questCostHardEmotional: 8,
  pomoCostPerMinMental: 3,
  pomoCostPerMinPhysical: 1,
  pomoCostPerMinEmotional: 0.5,
  breakRestEnergy: 20,
  breakRestFocus: 15,
  breakRestMotivation: 10,
  breakWalkEnergy: 25,
  breakWalkFocus: 20,
  breakWalkMotivation: 15,
  breakMeditationEnergy: 10,
  breakMeditationFocus: 30,
  breakMeditationMotivation: 20,
  breakYogaEnergy: 30,
  breakYogaFocus: 25,
  breakYogaMotivation: 25,

  // Tree Reward System Defaults
  treeRewardConfig: DEFAULT_TREE_REWARD_CONFIG,

  // Shop System Defaults
  enableSeasonalShop: true,
  shopRotationDays: 7,
  enableSpecialEvents: true,
  dragonFestivalEnabled: true,
  mysticalMarketEnabled: true,

  // Performance Defaults
  performanceSettings: {
    enableCache: true,
    cacheTTL: 300000, // 5 minutes
    maxCacheSize: 1000, // entries
    maxCacheMemoryMB: 50, // MB
    enableDebouncedWrites: true,
    writeDebounceDelay: 1000, // 1 second
    maxWriteBatchSize: 10,
    enableWorkerParsing: true,
    maxWorkers: 2,
    parsingChunkSize: 1000, // lines
    autoCleanupInterval: 60000 // 1 minute
  },

  // Internationalization Defaults
  internationalization: {
    locale: 'en-US',
    dateFormat: 'short',
    timeFormat: 'short',
    numberFormat: 'standard',
    currencyFormat: 'standard'
  },

  // Theming Defaults
  theming: {
    mode: 'auto',
    accentColor: '#667eea',
    colorPalette: 'default',
    accessibility: {
      colorBlindFriendly: false,
      highContrast: false,
      reducedMotion: false
    }
  },

  // Beta / Feature Flags defaults
  betaMode: true,
  featureFlags: {
    enableAnalyticsTab: true,
    enableEnergyDebug: false
  }
}; 