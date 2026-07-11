// Achievement & Badge System for Gamified Tasks
// Tracks player accomplishments and provides progression rewards

export type AchievementCategory = 'quest' | 'progress' | 'collection' | 'special' | 'pomodoro' | 'energy' | 'habits' | 'crafting' | 'boss';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'legendary';
export type AchievementStatus = 'locked' | 'in_progress' | 'completed';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: BadgeTier;
  icon: string;
  criteria: AchievementCriteria;
  rewards: AchievementRewards;
  hidden?: boolean; // Hidden until discovered/unlocked
  prerequisite?: string; // Required achievement ID
}

export interface AchievementCriteria {
  type: 'quest_count' | 'quest_difficulty' | 'level_reached' | 'xp_total' | 'coins_earned' |
  'stat_level' | 'item_collected' | 'skill_unlocked' | 'consecutive_days' | 'custom' |
  'pomodoro_sessions' | 'pomodoro_streak' | 'pomodoro_xp' | 'pomodoro_session_type' |
  'energy_efficiency' | 'energy_conservation' | 'energy_restoration' | 'habit_streak' | 'habit_category' |
  'crafting_count' | 'crafting_rarity' | 'crafting_efficiency' | 'boss_defeated' | 'boss_streak' | 'boss_difficulty';
  target: number | string;
  current?: number;
  meta?: Record<string, string | number | boolean>; // Additional criteria data
}

export interface AchievementRewards {
  xp?: number;
  coins?: number;
  items?: string[];
  title?: string; // Unlockable player title
  badge?: string; // Special badge identifier
}

export interface PlayerAchievement {
  achievementId: string;
  status: AchievementStatus;
  progress: number; // 0-100 percentage
  unlockedDate?: Date;
  currentValue?: number;
}

// Predefined Achievement Definitions
export const ACHIEVEMENTS: Achievement[] = [
  // === QUEST MILESTONES ===
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Complete your first quest',
    category: 'quest',
    tier: 'bronze',
    icon: '🚶',
    criteria: { type: 'quest_count', target: 1 },
    rewards: { xp: 50, coins: 25, title: 'Novice Adventurer' }
  },
  {
    id: 'quest_apprentice',
    title: 'Quest Apprentice',
    description: 'Complete 10 quests',
    category: 'quest',
    tier: 'bronze',
    icon: '📋',
    criteria: { type: 'quest_count', target: 10 },
    rewards: { xp: 200, coins: 100 }
  },
  {
    id: 'quest_journeyman',
    title: 'Quest Journeyman',
    description: 'Complete 50 quests',
    category: 'quest',
    tier: 'silver',
    icon: '🎯',
    criteria: { type: 'quest_count', target: 50 },
    rewards: { xp: 750, coins: 500, title: 'Seasoned Adventurer' }
  },
  {
    id: 'quest_master',
    title: 'Quest Master',
    description: 'Complete 100 quests',
    category: 'quest',
    tier: 'gold',
    icon: '🏆',
    criteria: { type: 'quest_count', target: 100 },
    rewards: { xp: 2000, coins: 1500, title: 'Quest Master', items: ['Crown of the Eternal'] }
  },
  {
    id: 'challenge_seeker',
    title: 'Challenge Seeker',
    description: 'Complete 10 hard difficulty quests',
    category: 'quest',
    tier: 'silver',
    icon: '⚡',
    criteria: { type: 'quest_difficulty', target: 10, meta: { difficulty: 'hard' } },
    rewards: { xp: 500, coins: 300, title: 'Challenge Seeker' }
  },

  // === PROGRESS ACHIEVEMENTS ===
  {
    id: 'level_5',
    title: 'Rising Star',
    description: 'Reach level 5',
    category: 'progress',
    tier: 'bronze',
    icon: '⭐',
    criteria: { type: 'level_reached', target: 5 },
    rewards: { coins: 100, title: 'Rising Star' }
  },
  {
    id: 'level_10',
    title: 'Experienced',
    description: 'Reach level 10',
    category: 'progress',
    tier: 'silver',
    icon: '🌟',
    criteria: { type: 'level_reached', target: 10 },
    rewards: { coins: 250, title: 'Experienced', items: ['Elixir of Wisdom'] }
  },
  {
    id: 'level_25',
    title: 'Veteran',
    description: 'Reach level 25',
    category: 'progress',
    tier: 'gold',
    icon: '💫',
    criteria: { type: 'level_reached', target: 25 },
    rewards: { coins: 1000, title: 'Veteran', items: ['Tome of Knowledge'] }
  },
  {
    id: 'xp_millionaire',
    title: 'XP Millionaire',
    description: 'Earn 1,000,000 total XP',
    category: 'progress',
    tier: 'legendary',
    icon: '💎',
    criteria: { type: 'xp_total', target: 1000000 },
    rewards: { coins: 5000, title: 'XP Legend', items: ['Dragon Scale', 'Ancient Spell Scroll'] }
  },

  // === COLLECTION ACHIEVEMENTS ===
  {
    id: 'wealthy',
    title: 'Wealthy',
    description: 'Accumulate 1,000 coins',
    category: 'collection',
    tier: 'bronze',
    icon: '💰',
    criteria: { type: 'coins_earned', target: 1000 },
    rewards: { xp: 100, title: 'Wealthy' }
  },
  {
    id: 'treasure_hunter',
    title: 'Treasure Hunter',
    description: 'Collect 50 items',
    category: 'collection',
    tier: 'silver',
    icon: '🏴‍☠️',
    criteria: { type: 'custom', target: 50, meta: { type: 'inventory_count' } },
    rewards: { xp: 300, coins: 200, title: 'Treasure Hunter' }
  },
  {
    id: 'legendary_collector',
    title: 'Legendary Collector',
    description: 'Collect a legendary item',
    category: 'collection',
    tier: 'gold',
    icon: '👑',
    criteria: { type: 'item_collected', target: 'legendary', meta: { rarity: 'legendary' } },
    rewards: { xp: 1000, coins: 500, title: 'Legendary Collector' }
  },

  // === SPECIAL ACHIEVEMENTS ===
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Complete 10 quests in a single day',
    category: 'special',
    tier: 'gold',
    icon: '✨',
    criteria: { type: 'custom', target: 10, meta: { type: 'daily_quests' } },
    rewards: { xp: 1500, coins: 1000, title: 'Perfectionist', items: ['Lucky Charm'] },
    hidden: true
  },
  {
    id: 'consistent',
    title: 'Consistent',
    description: 'Complete quests for 7 consecutive days',
    category: 'special',
    tier: 'silver',
    icon: '📅',
    criteria: { type: 'consecutive_days', target: 7 },
    rewards: { xp: 500, coins: 300, title: 'Consistent' }
  },
  {
    id: 'stat_specialist',
    title: 'Stat Specialist',
    description: 'Reach level 10 in any stat',
    category: 'progress',
    tier: 'silver',
    icon: '📊',
    criteria: { type: 'stat_level', target: 10 },
    rewards: { xp: 400, coins: 250, title: 'Stat Specialist' }
  },
  {
    id: 'polymath',
    title: 'Polymath',
    description: 'Reach level 5 in 5 different stats',
    category: 'progress',
    tier: 'gold',
    icon: '🧠',
    criteria: { type: 'custom', target: 5, meta: { type: 'multi_stat_level', level: 5 } },
    rewards: { xp: 1000, coins: 750, title: 'Polymath', items: ['Compass of Truth'] }
  },

  // === POMODORO ACHIEVEMENTS ===
  {
    id: 'pomodoro_first_session',
    title: 'Getting Started',
    description: 'Complete your first pomodoro session',
    category: 'pomodoro',
    tier: 'bronze',
    icon: '🌱',
    criteria: { type: 'pomodoro_sessions', target: 1 },
    rewards: { xp: 25, coins: 10, title: 'Focus Novice' }
  },
  {
    id: 'pomodoro_focused_mind',
    title: 'Focused Mind',
    description: 'Complete 10 pomodoro sessions',
    category: 'pomodoro',
    tier: 'bronze',
    icon: '🧘',
    criteria: { type: 'pomodoro_sessions', target: 10 },
    rewards: { xp: 50, coins: 25 }
  },
  {
    id: 'pomodoro_productivity_master',
    title: 'Productivity Master',
    description: 'Complete 50 pomodoro sessions',
    category: 'pomodoro',
    tier: 'silver',
    icon: '⚡',
    criteria: { type: 'pomodoro_sessions', target: 50 },
    rewards: { xp: 100, coins: 75, title: 'Productivity Master' }
  },
  {
    id: 'pomodoro_focus_champion',
    title: 'Focus Champion',
    description: 'Complete 100 pomodoro sessions',
    category: 'pomodoro',
    tier: 'gold',
    icon: '🏆',
    criteria: { type: 'pomodoro_sessions', target: 100 },
    rewards: { xp: 200, coins: 150, title: 'Focus Champion', items: ['Crown of Concentration'] }
  },
  {
    id: 'pomodoro_streak_3',
    title: 'Building Habits',
    description: 'Maintain a 3-day pomodoro streak',
    category: 'pomodoro',
    tier: 'bronze',
    icon: '🔥',
    criteria: { type: 'pomodoro_streak', target: 3 },
    rewards: { xp: 30, coins: 15 }
  },
  {
    id: 'pomodoro_streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day pomodoro streak',
    category: 'pomodoro',
    tier: 'silver',
    icon: '🥉',
    criteria: { type: 'pomodoro_streak', target: 7 },
    rewards: { xp: 75, coins: 50, title: 'Week Warrior' }
  },
  {
    id: 'pomodoro_streak_14',
    title: 'Consistency King',
    description: 'Maintain a 14-day pomodoro streak',
    category: 'pomodoro',
    tier: 'gold',
    icon: '🥈',
    criteria: { type: 'pomodoro_streak', target: 14 },
    rewards: { xp: 150, coins: 100, title: 'Consistency King' }
  },
  {
    id: 'pomodoro_streak_30',
    title: 'Unstoppable Force',
    description: 'Maintain a 30-day pomodoro streak',
    category: 'pomodoro',
    tier: 'legendary',
    icon: '💎',
    criteria: { type: 'pomodoro_streak', target: 30 },
    rewards: { xp: 300, coins: 250, title: 'Unstoppable Force', items: ['Diamond Focus Ring'] }
  },
  {
    id: 'pomodoro_xp_500',
    title: 'Experience Gained',
    description: 'Earn 500 pomodoro XP',
    category: 'pomodoro',
    tier: 'bronze',
    icon: '⭐',
    criteria: { type: 'pomodoro_xp', target: 500 },
    rewards: { xp: 50, coins: 25 }
  },
  {
    id: 'pomodoro_xp_2000',
    title: 'XP Collector',
    description: 'Earn 2000 pomodoro XP',
    category: 'pomodoro',
    tier: 'silver',
    icon: '🌟',
    criteria: { type: 'pomodoro_xp', target: 2000 },
    rewards: { xp: 100, coins: 75, title: 'XP Collector' }
  },
  {
    id: 'pomodoro_deep_thinker',
    title: 'Deep Thinker',
    description: 'Complete 5 Deep Work sessions',
    category: 'pomodoro',
    tier: 'silver',
    icon: '🧠',
    criteria: { type: 'pomodoro_session_type', target: 5, meta: { sessionType: 'deepWork' } },
    rewards: { xp: 75, coins: 50, title: 'Deep Thinker' }
  },
  {
    id: 'pomodoro_speed_demon',
    title: 'Speed Demon',
    description: 'Complete 10 Quick Focus sessions',
    category: 'pomodoro',
    tier: 'bronze',
    icon: '🚀',
    criteria: { type: 'pomodoro_session_type', target: 10, meta: { sessionType: 'quickFocus' } },
    rewards: { xp: 60, coins: 40, title: 'Speed Demon' }
  },

  // === ENERGY ACHIEVEMENTS ===
  {
    id: 'energy_conservation_novice',
    title: 'Energy Conservation Novice',
    description: 'Maintain energy above 50% for 5 consecutive days',
    category: 'energy',
    tier: 'bronze',
    icon: '🔋',
    criteria: { type: 'energy_conservation', target: 5 },
    rewards: { xp: 100, coins: 50, title: 'Energy Saver' }
  },
  {
    id: 'energy_efficiency_master',
    title: 'Energy Efficiency Master',
    description: 'Complete 20 tasks with energy efficiency above 80%',
    category: 'energy',
    tier: 'silver',
    icon: '⚡',
    criteria: { type: 'energy_efficiency', target: 20, meta: { efficiency: 80 } },
    rewards: { xp: 300, coins: 150, title: 'Efficiency Master' }
  },
  {
    id: 'energy_restoration_expert',
    title: 'Energy Restoration Expert',
    description: 'Restore energy to full 10 times',
    category: 'energy',
    tier: 'silver',
    icon: '🔌',
    criteria: { type: 'energy_restoration', target: 10 },
    rewards: { xp: 250, coins: 125, title: 'Restoration Expert' }
  },
  {
    id: 'energy_management_guru',
    title: 'Energy Management Guru',
    description: 'Maintain perfect energy balance for 30 days',
    category: 'energy',
    tier: 'gold',
    icon: '🎯',
    criteria: { type: 'energy_conservation', target: 30 },
    rewards: { xp: 1000, coins: 500, title: 'Energy Guru', items: ['Crystal of Balance'] }
  },
  {
    id: 'energy_legend',
    title: 'Energy Legend',
    description: 'Achieve 100% energy efficiency on 50 tasks',
    category: 'energy',
    tier: 'legendary',
    icon: '💎',
    criteria: { type: 'energy_efficiency', target: 50, meta: { efficiency: 100 } },
    rewards: { xp: 2000, coins: 1000, title: 'Energy Legend', items: ['Infinity Battery'] }
  },

  // === HABITS ACHIEVEMENTS ===
  {
    id: 'habit_starter',
    title: 'Habit Starter',
    description: 'Complete your first habit',
    category: 'habits',
    tier: 'bronze',
    icon: '🌱',
    criteria: { type: 'habit_streak', target: 1 },
    rewards: { xp: 50, coins: 25, title: 'Habit Starter' }
  },
  {
    id: 'habit_builder',
    title: 'Habit Builder',
    description: 'Maintain a 7-day habit streak',
    category: 'habits',
    tier: 'bronze',
    icon: '📅',
    criteria: { type: 'habit_streak', target: 7 },
    rewards: { xp: 150, coins: 75, title: 'Habit Builder' }
  },
  {
    id: 'habit_master',
    title: 'Habit Master',
    description: 'Maintain a 30-day habit streak',
    category: 'habits',
    tier: 'silver',
    icon: '🏆',
    criteria: { type: 'habit_streak', target: 30 },
    rewards: { xp: 500, coins: 250, title: 'Habit Master' }
  },
  {
    id: 'habit_category_expert',
    title: 'Habit Category Expert',
    description: 'Complete all habits in a category',
    category: 'habits',
    tier: 'gold',
    icon: '🎯',
    criteria: { type: 'habit_category', target: 1 },
    rewards: { xp: 750, coins: 375, title: 'Category Expert', items: ['Habit Crystal'] }
  },
  {
    id: 'habit_legend',
    title: 'Habit Legend',
    description: 'Maintain a 100-day habit streak',
    category: 'habits',
    tier: 'legendary',
    icon: '💎',
    criteria: { type: 'habit_streak', target: 100 },
    rewards: { xp: 2000, coins: 1000, title: 'Habit Legend', items: ['Crown of Consistency'] }
  },

  // === CRAFTING ACHIEVEMENTS ===
  {
    id: 'crafting_novice',
    title: 'Crafting Novice',
    description: 'Craft your first item',
    category: 'crafting',
    tier: 'bronze',
    icon: '🔨',
    criteria: { type: 'crafting_count', target: 1 },
    rewards: { xp: 100, coins: 50, title: 'Crafting Novice' }
  },
  {
    id: 'crafting_apprentice',
    title: 'Crafting Apprentice',
    description: 'Craft 25 items',
    category: 'crafting',
    tier: 'bronze',
    icon: '⚒️',
    criteria: { type: 'crafting_count', target: 25 },
    rewards: { xp: 300, coins: 150, title: 'Crafting Apprentice' }
  },
  {
    id: 'crafting_master',
    title: 'Crafting Master',
    description: 'Craft 100 items',
    category: 'crafting',
    tier: 'silver',
    icon: '🏭',
    criteria: { type: 'crafting_count', target: 100 },
    rewards: { xp: 750, coins: 375, title: 'Crafting Master' }
  },
  {
    id: 'rare_crafter',
    title: 'Rare Crafter',
    description: 'Craft a rare item',
    category: 'crafting',
    tier: 'gold',
    icon: '💎',
    criteria: { type: 'crafting_rarity', target: 'rare' },
    rewards: { xp: 500, coins: 250, title: 'Rare Crafter', items: ['Masterwork Tools'] }
  },
  {
    id: 'crafting_legend',
    title: 'Crafting Legend',
    description: 'Craft 50 items with 100% efficiency',
    category: 'crafting',
    tier: 'legendary',
    icon: '👑',
    criteria: { type: 'crafting_efficiency', target: 50, meta: { efficiency: 100 } },
    rewards: { xp: 2000, coins: 1000, title: 'Crafting Legend', items: ['Legendary Forge'] }
  },

  // === BOSS ACHIEVEMENTS ===
  {
    id: 'boss_slayer',
    title: 'Boss Slayer',
    description: 'Defeat your first boss',
    category: 'boss',
    tier: 'bronze',
    icon: '⚔️',
    criteria: { type: 'boss_defeated', target: 1 },
    rewards: { xp: 200, coins: 100, title: 'Boss Slayer' }
  },
  {
    id: 'boss_hunter',
    title: 'Boss Hunter',
    description: 'Defeat 10 bosses',
    category: 'boss',
    tier: 'silver',
    icon: '🎯',
    criteria: { type: 'boss_defeated', target: 10 },
    rewards: { xp: 500, coins: 250, title: 'Boss Hunter' }
  },
  {
    id: 'boss_streak_master',
    title: 'Boss Streak Master',
    description: 'Defeat 5 bosses in a row',
    category: 'boss',
    tier: 'gold',
    icon: '🔥',
    criteria: { type: 'boss_streak', target: 5 },
    rewards: { xp: 1000, coins: 500, title: 'Streak Master', items: ['Boss Slayer Armor'] }
  },
  {
    id: 'legendary_boss_slayer',
    title: 'Legendary Boss Slayer',
    description: 'Defeat a legendary boss',
    category: 'boss',
    tier: 'gold',
    icon: '👑',
    criteria: { type: 'boss_difficulty', target: 'legendary' },
    rewards: { xp: 1500, coins: 750, title: 'Legendary Slayer', items: ['Dragon Scale Armor'] }
  },
  {
    id: 'boss_legend',
    title: 'Boss Legend',
    description: 'Defeat 50 bosses',
    category: 'boss',
    tier: 'legendary',
    icon: '💎',
    criteria: { type: 'boss_defeated', target: 50 },
    rewards: { xp: 3000, coins: 1500, title: 'Boss Legend', items: ['Crown of Conquest'] }
  }
];

// Achievement progress tracking
export class AchievementTracker {
  private achievements: Map<string, PlayerAchievement> = new Map();

  constructor(savedAchievements?: PlayerAchievement[]) {
    if (savedAchievements) {
      savedAchievements.forEach(achievement => {
        this.achievements.set(achievement.achievementId, achievement);
      });
    }
    this.initializeAchievements();
  }

  private initializeAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
      if (!this.achievements.has(achievement.id)) {
        this.achievements.set(achievement.id, {
          achievementId: achievement.id,
          status: 'locked',
          progress: 0,
          currentValue: 0
        });
      }
    });
  }

  // Update achievement progress
  updateProgress(achievementId: string, currentValue: number): boolean {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    const playerAchievement = this.achievements.get(achievementId);

    if (!achievement || !playerAchievement) {
      return false;
    }

    const target = typeof achievement.criteria.target === 'number' ? achievement.criteria.target : 0;
    const progress = Math.min((currentValue / target) * 100, 100);

    playerAchievement.currentValue = currentValue;
    playerAchievement.progress = progress;

    // Update status based on progress, only if not already completed
    if (playerAchievement.status === 'completed') {
      return false; // Already completed, no change
    }

    if (currentValue >= target) {
      playerAchievement.status = 'completed';
      playerAchievement.unlockedDate = new Date();
      return true; // Achievement just unlocked!
    } else if (currentValue > 0 && playerAchievement.status === 'locked') {
      playerAchievement.status = 'in_progress';
    }

    return false;
  }

  // Get all achievements with their current status
  getAllAchievements(): { achievement: Achievement; playerData: PlayerAchievement }[] {
    return ACHIEVEMENTS.map(achievement => ({
      achievement,
      playerData: this.achievements.get(achievement.id)!
    }));
  }

  // Get completed achievements
  getCompletedAchievements(): Achievement[] {
    return ACHIEVEMENTS.filter(achievement => {
      const playerData = this.achievements.get(achievement.id);
      return playerData?.status === 'completed';
    });
  }

  // Get achievements in progress
  getInProgressAchievements(): { achievement: Achievement; playerData: PlayerAchievement }[] {
    return ACHIEVEMENTS
      .map(achievement => ({
        achievement,
        playerData: this.achievements.get(achievement.id)!
      }))
      .filter(item => item.playerData.status === 'in_progress');
  }

  // Export achievement data for saving
  exportAchievements(): PlayerAchievement[] {
    return Array.from(this.achievements.values());
  }

  // Load saved achievement data
  loadSavedAchievements(savedAchievements: PlayerAchievement[]): void {
    savedAchievements.forEach(achievement => {
      this.achievements.set(achievement.achievementId, achievement);
    });
    // Re-initialize to ensure all achievements are present
    this.initializeAchievements();
  }

  // Get achievement by ID
  getAchievement(id: string): { achievement: Achievement; playerData: PlayerAchievement } | null {
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    const playerData = this.achievements.get(id);

    if (achievement && playerData) {
      return { achievement, playerData };
    }
    return null;
  }

  /** Completed achievements unlocked within the last N ms (newest first). */
  getRecentlyUnlocked(withinMs = 7 * 24 * 60 * 60 * 1000): {
    achievement: Achievement;
    playerData: PlayerAchievement;
  }[] {
    const cutoff = Date.now() - withinMs;
    return this.getAllAchievements()
      .filter(
        ({ playerData }) =>
          playerData.status === 'completed' &&
          playerData.unlockedDate &&
          new Date(playerData.unlockedDate).getTime() >= cutoff
      )
      .sort(
        (a, b) =>
          new Date(b.playerData.unlockedDate!).getTime() -
          new Date(a.playerData.unlockedDate!).getTime()
      );
  }

  /** Top completed achievements for the trophy showcase (legendary/gold first). */
  getShowcaseAchievements(limit = 6): {
    achievement: Achievement;
    playerData: PlayerAchievement;
  }[] {
    const tierOrder: Record<BadgeTier, number> = {
      legendary: 4,
      gold: 3,
      silver: 2,
      bronze: 1,
    };
    return this.getAllAchievements()
      .filter(({ playerData }) => playerData.status === 'completed')
      .sort((a, b) => {
        const tierDiff =
          tierOrder[b.achievement.tier] - tierOrder[a.achievement.tier];
        if (tierDiff !== 0) return tierDiff;
        const aDate = a.playerData.unlockedDate
          ? new Date(a.playerData.unlockedDate).getTime()
          : 0;
        const bDate = b.playerData.unlockedDate
          ? new Date(b.playerData.unlockedDate).getTime()
          : 0;
        return bDate - aDate;
      })
      .slice(0, limit);
  }

  getTierCounts(): Record<BadgeTier, { earned: number; total: number }> {
    const tiers: BadgeTier[] = ['bronze', 'silver', 'gold', 'legendary'];
    const counts = {} as Record<BadgeTier, { earned: number; total: number }>;
    for (const tier of tiers) {
      const total = ACHIEVEMENTS.filter((a) => a.tier === tier).length;
      const earned = ACHIEVEMENTS.filter((a) => {
        if (a.tier !== tier) return false;
        return this.achievements.get(a.id)?.status === 'completed';
      }).length;
      counts[tier] = { earned, total };
    }
    return counts;
  }
} 