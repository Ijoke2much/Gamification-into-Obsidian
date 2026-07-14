import { TreeRewardConfig, DEFAULT_TREE_REWARD_CONFIG } from '../features/habits/utils/treeRewardSystem';
import type { GameItemDefinition } from '../features/inventory/types/EnhancedInventoryTypes';
import {
	DEFAULT_VISUAL_THEME_SETTINGS,
	type VisualThemeSettings,
} from '../shared/themes/types';

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

// Dedicated type for quest save locations so they can be reused
// across settings, UI, and quest-creation logic.
export interface QuestSaveLocation {
  id: string;
  label: string;
  filePath: string;
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
        id: 'game-data-hub',
        name: 'Game data hub',
        icon: '🧰',
        description: 'Create and edit shop items, materials, and crafting recipes in vault markdown files',
        color: '#673AB7',
        settings: []
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
        settings: ['enableEnergyHUD', 'energyHudMode', 'dailyResetHour', 'dailyRestoreEnergy', 'dailyRestoreFocus', 'dailyRestoreMotivation', 'dailyRestoreCalm', 'dailyRestoreStressReduce']
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
        id: 'game-modules',
        name: 'Feature Modules',
        icon: '🧩',
        description: 'Enable or hide tabs and major game systems',
        color: '#7C4DFF',
        settings: ['gameplayProfile', 'modules']
      },
      {
        id: 'experience-feel',
        name: 'Experience & Feel',
        icon: '✨',
        description: 'Notifications, quest filters, and optional boss battles',
        color: '#26A69A',
        settings: ['notificationLevel', 'preferQuickComplete']
      },
      {
        id: 'penalties',
        name: 'Penalties & Consequences',
        icon: '⚠️',
        description: 'Failure penalties and debt management',
        color: '#FF5722',
        settings: ['gameplayProfile', 'modules', 'penaltyLowPct', 'penaltyMediumPct', 'penaltyHighPct', 'dailyDebtCapXP', 'dailyDebtCapCoins', 'pomodoroFailOnlyOnReset']
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
    settings: ['enableEnergyHUD', 'energyHudMode', 'dailyResetHour', 'dailyRestoreEnergy', 'dailyRestoreFocus', 'dailyRestoreMotivation', 'dailyRestoreCalm', 'dailyRestoreStressReduce']
  },
  {
    id: 'penalties',
    name: 'Penalties & Consequences',
    icon: '⚠️',
    description: 'Failure penalties and debt management',
    color: '#FF5722',
    settings: ['gameplayProfile', 'modules', 'penaltyLowPct', 'penaltyMediumPct', 'penaltyHighPct', 'dailyDebtCapXP', 'dailyDebtCapCoins', 'pomodoroFailOnlyOnReset']
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
// GAMEPLAY PROFILE & MODULE TOGGLES
// ============================================================================

export type GameplayProfile = 'lite' | 'balanced' | 'hardcore';

/** Phase 4 — how chatty reward/status toasts are */
export type NotificationLevel = 'normal' | 'quiet' | 'minimal';

export type EnergyHudMode = 'off' | 'simple' | 'focus' | 'full';

export interface GamificationModules {
  /** Master switch for penalty / debt mechanics */
  enablePenalties?: boolean;
  /** Reduce rewards when completing overdue quests */
  enableOverduePenalties?: boolean;
  /** Boss battle timeout penalties */
  enableBossPenalties?: boolean;
  /** XP/coin debt when marking a quest failed */
  enableFailureDebt?: boolean;
  /** Pomodoro attachment time-limit penalties */
  enablePomodoroPenalties?: boolean;
  /** Player tab: Shop */
  enableShopTab?: boolean;
  /** Player tab: Crafting */
  enableCraftingTab?: boolean;
  /** Player tab: Habits / tree */
  enableHabitsTab?: boolean;
  /** Player tab: Achievements */
  enableAchievementsTab?: boolean;
  /** Player tab: Pomodoro */
  enablePomodoroTab?: boolean;
  /** Player tab: Analytics */
  enableAnalyticsTab?: boolean;
  /** Boss battle arena & sidebar boss */
  enableBossBattles?: boolean;
  /** Energy HUD, costs, and daily energy resets */
  enableEnergySystem?: boolean;
  /** Productivity equipment in inventory modal */
  enableProductivityGear?: boolean;
}

/** Lite: quests + pomodoro + energy only */
export const LITE_GAMEPLAY_MODULES: Required<GamificationModules> = {
  enablePenalties: false,
  enableOverduePenalties: false,
  enableBossPenalties: false,
  enableFailureDebt: false,
  enablePomodoroPenalties: false,
  enableShopTab: false,
  enableCraftingTab: false,
  enableHabitsTab: false,
  enableAchievementsTab: false,
  enablePomodoroTab: true,
  enableAnalyticsTab: false,
  enableBossBattles: false,
  enableEnergySystem: true,
  enableProductivityGear: false,
};

/** Balanced default: core loop without shop/crafting/analytics clutter */
export const BALANCED_GAMEPLAY_MODULES: Required<GamificationModules> = {
  enablePenalties: false,
  enableOverduePenalties: false,
  enableBossPenalties: false,
  enableFailureDebt: false,
  enablePomodoroPenalties: false,
  enableShopTab: false,
  enableCraftingTab: false,
  enableHabitsTab: true,
  enableAchievementsTab: true,
  enablePomodoroTab: true,
  enableAnalyticsTab: false,
  enableBossBattles: true,
  enableEnergySystem: true,
  enableProductivityGear: false,
};

/** Hardcore: all features + penalties */
export const HARDCORE_GAMEPLAY_MODULES: Required<GamificationModules> = {
  enablePenalties: true,
  enableOverduePenalties: true,
  enableBossPenalties: true,
  enableFailureDebt: true,
  enablePomodoroPenalties: true,
  enableShopTab: true,
  enableCraftingTab: true,
  enableHabitsTab: true,
  enableAchievementsTab: true,
  enablePomodoroTab: true,
  enableAnalyticsTab: true,
  enableBossBattles: true,
  enableEnergySystem: true,
  enableProductivityGear: true,
};

/** @deprecated alias — use BALANCED_GAMEPLAY_MODULES */
export const DEFAULT_GAMEPLAY_MODULES = BALANCED_GAMEPLAY_MODULES;

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
    name: "Balanced (Recommended)",
    description: "Quests and rewards without punishment loops. Turn on penalties in settings or use Hardcore when you want a challenge.",
    icon: "⚖️",
    settings: {
      gameplayProfile: 'balanced',
      modules: { ...BALANCED_GAMEPLAY_MODULES },
      notificationLevel: 'normal',
      preferQuickComplete: true,
      energyHudMode: 'simple',
      xpPerTask: 10,
      coinPerTask: 5,
      penaltyLowPct: 0.10,
      penaltyMediumPct: 0.20,
      penaltyHighPct: 0.30,
      enableSidebarQuestBoard: true,
      autoRefreshTasks: false,
      hideCompletedQuests: false,
    }
  },
  {
    name: "Beginner Friendly",
    description: "Gentle settings for new players with lower penalties and higher rewards. Perfect for getting started!",
    icon: "🌟",
    settings: {
      gameplayProfile: 'lite',
      modules: { ...LITE_GAMEPLAY_MODULES },
      notificationLevel: 'quiet',
      preferQuickComplete: true,
      energyHudMode: 'simple',
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
        enableTimeBlocks: true,
        colorMode: 'adaptive',
        useCustomDayRange: false,
        dayStartHour: 0,
        dayEndHour: 23
      }
    }
  },
  {
    name: "Hardcore Mode",
    description: "Challenging settings with higher penalties and lower rewards. For experienced players seeking a challenge!",
    icon: "💀",
    settings: {
      gameplayProfile: 'hardcore',
      modules: { ...HARDCORE_GAMEPLAY_MODULES },
      notificationLevel: 'normal',
      preferQuickComplete: false,
      energyHudMode: 'full',
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
        enableTimeBlocks: true,
        colorMode: 'adaptive',
        useCustomDayRange: false,
        dayStartHour: 0,
        dayEndHour: 23
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
  // Quest file locations
  // Default markdown file used when creating new quests from the modal
  defaultQuestFilePath?: string;
  // Optional list of named save locations that appear in the quest modal dropdown
  questSaveLocations?: QuestSaveLocation[];
  /** How new quests are stored: append to a list file, or one task per note. */
  questStorageMode?: 'list' | 'per-note';
  /** Folder for per-note task files when questStorageMode is 'per-note'. */
  taskNoteFolder?: string;
  /** Markdown file for project contract headers (POST A NEW CONTRACT). */
  projectsFilePath?: string;
  /** Brain-dump file for quick capture (not shown on quest board until promoted). */
  captureFilePath?: string;
  /** Preset tag chips in quick capture modal (without # prefix). */
  captureTags?: string[];
  /** Remember last selected capture tag between sessions. */
  captureRememberLastTag?: boolean;
  /** Show optional description field in brain dump modal. */
  captureIncludeDescription?: boolean;
  /** How capture descriptions are written to markdown. */
  captureDescriptionFormat?: 'thought' | 'dataview' | 'both';

  /** Award XP/CP/currency when tasks are checked off outside the plugin UI. */
  externalCompletionSync?: boolean;
  /** Show a batch summary when external completions are detected. */
  externalCompletionSummary?: boolean;
  /** Detect TaskNotes-style frontmatter (status: done) for completions. */
  taskNotesCompatibility?: boolean;
  /** Folder scanned for TaskNotes completions (defaults to task note folder). */
  taskNotesFolder?: string;
  /** Extra vault paths (files or folders) to watch for quest completions. */
  externalWatchPaths?: string[];

  /** Periodic focus check-in prompts while Obsidian is open. */
  enableFocusCheckIns?: boolean;
  /** Minutes between check-in button appearances. */
  focusCheckInIntervalMinutes?: number;
  /** Markdown file for check-in log entries. */
  focusCheckInLogPath?: string;
  /** Minutes to snooze when user clicks Snooze. */
  focusCheckInSnoozeMinutes?: number;

  // Custom game item definitions (e.g., weapons and real-world artifacts)
  // These are configuration-level definitions which can be rendered in the
  // Shop or converted into inventory entries when acquired.
  customArtifacts?: GameItemDefinition[];

  // Timeline & Calendar Settings
  timelineViewSettings?: {
    enableTimelineView: boolean;
    defaultTimelineView: 'day' | 'week' | 'month';
    showCompletedTasks: boolean;
    groupByCategory: boolean;
    enableTimeBlocks: boolean;
    // Timeline color strategy for quest block palettes.
    colorMode?: 'adaptive' | 'priority' | 'difficulty' | 'tag';
    // If false, quest timeline always uses full-day (00:00 - 23:59) window.
    useCustomDayRange?: boolean;
    // Inclusive hour window when custom range is enabled (0-23).
    dayStartHour?: number;
    dayEndHour?: number;
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

  // Gameplay profile & penalty modules (Phase 1 — opt-in hardcore)
  gameplayProfile?: GameplayProfile;
  modules?: GamificationModules;
  /** Set after first-run experience picker (Phase 3 onboarding) */
  gameplayOnboardingComplete?: boolean;

  /** Phase 4 — toast volume: normal | quiet (shorter/deduped) | minimal (errors only) */
  notificationLevel?: NotificationLevel;
  /** Phase 4 — allow completing quests without finishing tactical boss UI */
  preferQuickComplete?: boolean;

  // Failure penalty settings
  penaltyLowPct: number;     // 0.10 default
  penaltyMediumPct: number;  // 0.20 default
  penaltyHighPct: number;    // 0.30 default
  dailyDebtCapXP: number;    // Max XP debt added per day
  dailyDebtCapCoins: number; // Max coin debt added per day
  pomodoroFailOnlyOnReset: boolean; // If true, only Reset counts as failure

  // Energy/Focus system settings
  enableEnergyHUD?: boolean;
  /** HUD complexity preset — hidden stats are not updated by quests or daily reset */
  energyHudMode?: EnergyHudMode;
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

  // Shopkeeper dialogue overrides (optional - user-edited strings)
  shopkeeperDialogueOverrides?: {
    greeting?: string;
    purchaseConfirmation?: string;
    purchaseSuccess?: string;
    purchaseFollowUp?: string;
    farewell?: string;
    noThanks?: string;
    insufficientFunds?: string;
    addItem?: string;
    addArtifact?: string;
    imageUpdated?: string;
  };

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

  /** Gameplay visual theme preset (Classic = original pixel vault look). */
  visualTheme?: VisualThemeSettings;

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

  // Item definitions
  customArtifacts: [],

  // Quest Board Default Settings
  enableSidebarQuestBoard: true,
  questBoardPosition: 'right',
  autoRefreshTasks: false,
  hideCompletedQuests: false,
  questRefreshInterval: 0, // Default to disabled
  // Quest file locations
  defaultQuestFilePath: 'GamifiedTasks.md',
  questSaveLocations: [],
  questStorageMode: 'list',
  taskNoteFolder: 'Gamified/Tasks',
  projectsFilePath: 'GamifiedProjects.md',
  captureFilePath: 'Capture.md',
  captureTags: ['idea', 'work', 'plugin', 'personal', 'read-later'],
  captureRememberLastTag: true,
  captureIncludeDescription: true,
  captureDescriptionFormat: 'thought',
  externalCompletionSync: true,
  externalCompletionSummary: true,
  taskNotesCompatibility: true,
  taskNotesFolder: '',
  externalWatchPaths: [],
  enableFocusCheckIns: true,
  focusCheckInIntervalMinutes: 120,
  focusCheckInLogPath: 'CheckIns.md',
  focusCheckInSnoozeMinutes: 30,

  // Timeline & Calendar Default Settings
  timelineViewSettings: {
    enableTimelineView: true,
    defaultTimelineView: 'day',
    showCompletedTasks: true,
    groupByCategory: true,
    enableTimeBlocks: true,
    colorMode: 'adaptive',
    useCustomDayRange: false,
    dayStartHour: 0,
    dayEndHour: 23
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

  // Gameplay profile defaults (balanced = penalties off until opted in)
  gameplayProfile: 'balanced',
  modules: { ...BALANCED_GAMEPLAY_MODULES },
  gameplayOnboardingComplete: false,
  notificationLevel: 'normal',
  preferQuickComplete: true,

  // Failure penalty defaults
  penaltyLowPct: 0.10,
  penaltyMediumPct: 0.20,
  penaltyHighPct: 0.30,
  dailyDebtCapXP: 500,
  dailyDebtCapCoins: 50,
  pomodoroFailOnlyOnReset: true,

  // Energy/Focus defaults (mirror runtime defaults)
  enableEnergyHUD: true,
  energyHudMode: 'simple',
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

  // Visual theme — Classic preserves the original pixel/RPG look
  visualTheme: { ...DEFAULT_VISUAL_THEME_SETTINGS },

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
    enableAnalyticsTab: false,
    enableEnergyDebug: false
  }
}; 