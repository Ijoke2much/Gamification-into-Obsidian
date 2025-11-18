export interface TreeRewardConfig {
  enableProgressiveRewards: boolean;
  enableItemDrops: boolean;
  itemDropChance: number; // 0.0 to 1.0
  customRewards: {
    [treeStage: number]: {
      xpMultiplier: number;
      cpMultiplier: number;
      coinMultiplier: number;
    };
  };
}

export interface TreeItemDrop {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
  icon: string;
  effect?: {
    type: 'xp_boost' | 'cp_boost' | 'coin_boost' | 'temporary_buff' | 'streak_protect' | 'double_rewards' | 'growth_accelerator';
    value: number;
    duration?: number; // in minutes
  };
}

export interface TreeSpecialBonus {
  id: string;
  name: string;
  description: string;
  icon: string;
  triggerCondition: {
    type: 'streak_milestone' | 'tree_stage' | 'perfect_week' | 'combo_completion';
    value: number;
  };
  effect: {
    type: 'permanent_multiplier' | 'temporary_boost' | 'special_item' | 'tree_evolution';
    value: number;
    duration?: number;
  };
}

export interface TreeEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  effects: {
    dropRateMultiplier: number;
    rewardMultiplier: number;
    specialItems: TreeItemDrop[];
    visualEffects: string[];
  };
}

export const DEFAULT_TREE_REWARD_CONFIG: TreeRewardConfig = {
  enableProgressiveRewards: true,
  enableItemDrops: true,
  itemDropChance: 0.15, // 15% base chance
  customRewards: {
    0: { xpMultiplier: 1.0, cpMultiplier: 1.0, coinMultiplier: 1.0 },    // Seed
    1: { xpMultiplier: 1.05, cpMultiplier: 1.05, coinMultiplier: 1.05 }, // Sprout
    2: { xpMultiplier: 1.1, cpMultiplier: 1.1, coinMultiplier: 1.1 },    // Sapling
    3: { xpMultiplier: 1.15, cpMultiplier: 1.15, coinMultiplier: 1.15 }, // Young Tree
    4: { xpMultiplier: 1.2, cpMultiplier: 1.2, coinMultiplier: 1.2 },    // Mature Tree
    5: { xpMultiplier: 1.25, cpMultiplier: 1.25, coinMultiplier: 1.25 }, // World Tree
  }
};

export const TREE_ITEM_DROPS: TreeItemDrop[] = [
  // Common Items (Stage 1-2)
  {
    id: 'seed_pack',
    name: 'Seed Pack',
    description: 'A collection of magical seeds that boost growth',
    rarity: 'common',
    icon: '🌱',
    effect: { type: 'xp_boost', value: 5, duration: 60 }
  },
  {
    id: 'energy_crystal',
    name: 'Energy Crystal',
    description: 'A small crystal that provides a burst of energy',
    rarity: 'common',
    icon: '💎',
    effect: { type: 'cp_boost', value: 3, duration: 30 }
  },
  {
    id: 'leaf_essence',
    name: 'Leaf Essence',
    description: 'Essence of nature that enhances your connection',
    rarity: 'common',
    icon: '🍃',
    effect: { type: 'coin_boost', value: 2, duration: 45 }
  },

  // Uncommon Items (Stage 2-3)
  {
    id: 'growth_fertilizer',
    name: 'Growth Fertilizer',
    description: 'Special fertilizer that accelerates tree growth',
    rarity: 'uncommon',
    icon: '🌿',
    effect: { type: 'xp_boost', value: 10, duration: 120 }
  },
  {
    id: 'wisdom_orb',
    name: 'Wisdom Orb',
    description: 'An orb containing ancient tree knowledge',
    rarity: 'uncommon',
    icon: '🔮',
    effect: { type: 'cp_boost', value: 8, duration: 90 }
  },

  // Rare Items (Stage 3-4)
  {
    id: 'ancient_sapling',
    name: 'Ancient Sapling',
    description: 'A sapling from the oldest trees in existence',
    rarity: 'rare',
    icon: '🌳',
    effect: { type: 'xp_boost', value: 20, duration: 180 }
  },
  {
    id: 'forest_crown',
    name: 'Forest Crown',
    description: 'A crown that marks you as a guardian of nature',
    rarity: 'rare',
    icon: '👑',
    effect: { type: 'cp_boost', value: 15, duration: 150 }
  },

  // Legendary Items (Stage 4-5)
  {
    id: 'world_tree_seed',
    name: 'World Tree Seed',
    description: 'A seed that could grow into a new world tree',
    rarity: 'legendary',
    icon: '🌍',
    effect: { type: 'xp_boost', value: 50, duration: 300 }
  },
  {
    id: 'nature_spirit',
    name: 'Nature Spirit',
    description: 'A benevolent spirit that grants incredible powers',
    rarity: 'legendary',
    icon: '✨',
    effect: { type: 'cp_boost', value: 40, duration: 240 }
  },
  {
    id: 'streak_guardian',
    name: 'Streak Guardian',
    description: 'Protects your streak from breaking for one day',
    rarity: 'legendary',
    icon: '🛡️',
    effect: { type: 'streak_protect', value: 1, duration: 1440 }
  },
  {
    id: 'golden_acorn',
    name: 'Golden Acorn',
    description: 'Doubles all rewards for the next completion',
    rarity: 'legendary',
    icon: '🥜',
    effect: { type: 'double_rewards', value: 2, duration: 60 }
  },

  // Mythic Items (Stage 5 only - World Tree)
  {
    id: 'yggdrasil_essence',
    name: 'Yggdrasil Essence',
    description: 'Pure essence from the World Tree that transcends reality',
    rarity: 'mythic',
    icon: '🌌',
    effect: { type: 'growth_accelerator', value: 3, duration: 720 }
  },
  {
    id: 'eternal_bloom',
    name: 'Eternal Bloom',
    description: 'A flower that never wilts, granting permanent power',
    rarity: 'mythic',
    icon: '🌺',
    effect: { type: 'xp_boost', value: 100, duration: 480 }
  },
  {
    id: 'tree_lords_crown',
    name: "Tree Lord's Crown",
    description: 'Crown of the ancient tree lords, grants massive bonuses',
    rarity: 'mythic',
    icon: '👑',
    effect: { type: 'double_rewards', value: 5, duration: 360 }
  }
];

// Special bonuses that trigger based on specific conditions
export const TREE_SPECIAL_BONUSES: TreeSpecialBonus[] = [
  {
    id: 'first_sprout',
    name: 'First Growth',
    description: 'Your first tree reaches Sprout stage',
    icon: '🌱',
    triggerCondition: { type: 'tree_stage', value: 1 },
    effect: { type: 'special_item', value: 1 }
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Achieve a 50-day streak',
    icon: '🔥',
    triggerCondition: { type: 'streak_milestone', value: 50 },
    effect: { type: 'permanent_multiplier', value: 1.1 }
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete all habits for 7 consecutive days',
    icon: '⭐',
    triggerCondition: { type: 'perfect_week', value: 7 },
    effect: { type: 'temporary_boost', value: 2.0, duration: 10080 } // 1 week
  },
  {
    id: 'world_tree_master',
    name: 'Master of the World Tree',
    description: 'Achieve World Tree status',
    icon: '🌳',
    triggerCondition: { type: 'tree_stage', value: 5 },
    effect: { type: 'tree_evolution', value: 1 }
  }
];

export const getTreeRewardMultipliers = (treeStage: number, config: TreeRewardConfig) => {
  if (!config.enableProgressiveRewards) {
    return { xpMultiplier: 1.0, cpMultiplier: 1.0, coinMultiplier: 1.0 };
  }

  const stageConfig = config.customRewards[treeStage] || config.customRewards[0];
  return stageConfig;
};

export const calculateTreeRewards = (
  baseXP: number,
  baseCP: number,
  baseCoins: number,
  treeStage: number,
  config: TreeRewardConfig
) => {
  const multipliers = getTreeRewardMultipliers(treeStage, config);

  return {
    xp: Math.round(baseXP * multipliers.xpMultiplier),
    cp: Math.round(baseCP * multipliers.cpMultiplier),
    coins: Math.round(baseCoins * multipliers.coinMultiplier),
    multipliers
  };
};

export const getTreeItemDrop = (
  treeStage: number,
  streak: number,
  config: TreeRewardConfig,
  isSpecialEvent: boolean = false
): TreeItemDrop | null => {
  if (!config.enableItemDrops) return null;

  // Calculate drop chance based on tree stage and streak
  const baseChance = config.itemDropChance;
  const stageBonus = Math.min(treeStage * 0.02, 0.1); // +2% per stage, max +10%
  const streakBonus = Math.min(streak * 0.001, 0.05); // +0.1% per streak day, max +5%
  const eventBonus = isSpecialEvent ? 0.1 : 0; // +10% during special events
  const totalChance = Math.min(baseChance + stageBonus + streakBonus + eventBonus, 0.6); // Cap at 60%

  if (Math.random() > totalChance) return null;

  // Filter items by rarity based on tree stage
  const availableItems = TREE_ITEM_DROPS.filter(item => {
    switch (item.rarity) {
      case 'common': return treeStage >= 1;
      case 'uncommon': return treeStage >= 2;
      case 'rare': return treeStage >= 3;
      case 'legendary': return treeStage >= 4;
      case 'mythic': return treeStage >= 5; // Only World Tree can drop mythic items
      default: return false;
    }
  });

  if (availableItems.length === 0) return null;

  // Weighted random selection (rarer items are less likely)
  const rarityWeights = {
    common: 0.45,
    uncommon: 0.25,
    rare: 0.15,
    legendary: 0.08,
    mythic: 0.02
  };

  // Adjust weights during special events (higher chance for rare items)
  if (isSpecialEvent) {
    rarityWeights.common = 0.35;
    rarityWeights.uncommon = 0.25;
    rarityWeights.rare = 0.20;
    rarityWeights.legendary = 0.15;
    rarityWeights.mythic = 0.05;
  }

  const random = Math.random();
  let cumulativeWeight = 0;

  for (const item of availableItems) {
    cumulativeWeight += rarityWeights[item.rarity];
    if (random <= cumulativeWeight) {
      return item;
    }
  }

  return availableItems[0]; // Fallback
};

// Function to check and trigger special bonuses
export const checkSpecialBonuses = (
  habit: any,
  allHabits: any[]
): TreeSpecialBonus[] => {
  const triggeredBonuses: TreeSpecialBonus[] = [];

  for (const bonus of TREE_SPECIAL_BONUSES) {
    let shouldTrigger = false;

    switch (bonus.triggerCondition.type) {
      case 'tree_stage':
        shouldTrigger = habit.currentTreeStage >= bonus.triggerCondition.value;
        break;
      case 'streak_milestone':
        shouldTrigger = habit.streak >= bonus.triggerCondition.value;
        break;
      case 'perfect_week':
        // Check if all habits were completed for the past 7 days
        const pastWeek = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        });

        shouldTrigger = allHabits.every(h =>
          pastWeek.every(date =>
            h.completedDates?.includes(date) || false
          )
        );
        break;
      case 'combo_completion':
        // Check if multiple habits were completed on the same day
        const today = new Date().toISOString().split('T')[0];
        const completedToday = allHabits.filter(h =>
          h.completedDates?.includes(today)
        ).length;
        shouldTrigger = completedToday >= bonus.triggerCondition.value;
        break;
    }

    if (shouldTrigger) {
      triggeredBonuses.push(bonus);
    }
  }

  return triggeredBonuses;
};

export const getTreeRewardDescription = (treeStage: number, config: TreeRewardConfig) => {
  if (!config.enableProgressiveRewards) return 'Base rewards only';

  const multipliers = getTreeRewardMultipliers(treeStage, config);
  const xpBonus = Math.round((multipliers.xpMultiplier - 1) * 100);
  const cpBonus = Math.round((multipliers.cpMultiplier - 1) * 100);
  const coinBonus = Math.round((multipliers.coinMultiplier - 1) * 100);

  return `+${xpBonus}% XP, +${cpBonus}% CP, +${coinBonus}% Coins`;
};

export const getTreeStageName = (treeStage: number) => {
  const names = ['Seed', 'Sprout', 'Sapling', 'Young Tree', 'Mature Tree', 'World Tree'];
  return names[treeStage] || 'Unknown';
};
