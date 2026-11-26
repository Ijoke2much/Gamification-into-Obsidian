export interface CraftingMaterial {
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    category: 'herb' | 'mineral' | 'essence' | 'crystal' | 'organic' | 'mystical' | 'component';
    description: string;
    baseValue: number; // CP value
    quality: 'fresh' | 'normal' | 'dried' | 'refined' | 'masterwork';
    qualityMultiplier: number; // affects crafting success and item quality
    source: 'gathering' | 'crafting' | 'trading' | 'reward' | 'quest';
    location?: string; // where to find this material
}

export interface CraftingRecipe {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'weapon' | 'armor' | 'tool' | 'consumable' | 'decoration' | 'mystical' | 'artifact';

    // Material requirements
    materials: {
        materialId: string;
        quantity: number;
        required: boolean; // false = optional material that enhances the result
        qualityRequired?: 'fresh' | 'normal' | 'dried' | 'refined' | 'masterwork'; // minimum quality needed
    }[];

    // Crafting requirements
    craftingTime: number; // in seconds
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    skillRequired: number; // minimum crafting skill level
    craftingStation?: 'forge' | 'alchemy_lab' | 'workbench' | 'enchanting_table';

    // Result
    guaranteedItem?: {
        name: string;
        category: string;
        rarity: string;
        effects: string[];
        icon: string;
        description: string;
        duration?: number;
        quality?: 'basic' | 'fine' | 'superior' | 'masterwork' | 'legendary';
    };

    // Random results (if no guaranteed item)
    possibleResults?: {
        name: string;
        category: string;
        rarity: string;
        effects: string[];
        icon: string;
        description: string;
        weight: number; // probability weight
        duration?: number;
        quality?: 'basic' | 'fine' | 'superior' | 'masterwork' | 'legendary';
    }[];

    // Rewards
    xpReward: number;
    boogersReward: number;
    skillXp: number; // crafting skill experience

    // Unlock conditions
    unlockedBy?: string[]; // recipe IDs that need to be discovered first
    hidden?: boolean; // hidden until discovered
    discoveryMethod?: 'exploration' | 'fragment' | 'experiment' | 'quest' | 'trading';
    requiredLevel?: number; // player level requirement
}

export interface CraftingSession {
    id: string;
    recipeId: string;
    startTime: number;
    endTime?: number;
    status: 'active' | 'completed' | 'failed';
    materialsUsed: { materialId: string; quantity: number; quality: string }[];
    result?: RandomCraftingResult; // the crafted item
    quality: 'basic' | 'fine' | 'superior' | 'masterwork' | 'legendary';
    criticalSuccess?: boolean;
    skillGained: number;
}

export interface CraftingActivity {
    id: string;
    type: 'gathering' | 'mining' | 'fishing' | 'exploring' | 'trading' | 'crafting';
    name: string;
    description: string;
    duration: number; // in minutes
    materialsFound: { materialId: string; quantity: number; chance: number; quality: string }[];
    xpReward: number;
    cpReward: number;
    skillXp: number;
    location?: string;
    requirements?: {
        level?: number;
        skill?: number;
        items?: string[];
    };
}

export interface RandomCraftingResult {
    name: string;
    category: string;
    rarity: string;
    effects: string[];
    icon: string;
    description: string;
    duration?: number;
    materialBonus?: string; // bonus effect from rare materials
    quality: 'basic' | 'fine' | 'superior' | 'masterwork' | 'legendary';
    criticalSuccess?: boolean;
}

export interface CraftingSkill {
    level: number;
    experience: number;
    experienceToNext: number;
    specialties: string[]; // weapon crafting, alchemy, etc.
    mastery: number; // 0-100, affects critical success chance
    unlockedRecipes: string[];
}

export interface GatheringLocation {
    id: string;
    name: string;
    type: 'forest' | 'mountain' | 'river' | 'cave' | 'garden' | 'workshop';
    description: string;
    icon: string;
    materials: { materialId: string; chance: number; quality: string }[];
    requirements?: {
        level?: number;
        skill?: number;
        items?: string[];
    };
    cooldown: number; // minutes between gathering sessions
    lastGathered?: number;
}

export interface RecipeFragment {
    id: string;
    name: string;
    description: string;
    icon: string;
    recipeId: string;
    fragmentNumber: number;
    totalFragments: number;
    location: string; // where this fragment can be found
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface CraftingStation {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: 'forge' | 'alchemy_lab' | 'workbench' | 'enchanting_table';
    level: number; // station quality level
    bonuses: {
        successRate: number;
        qualityChance: number;
        criticalChance: number;
        timeReduction: number;
    };
    requirements: {
        materials: { materialId: string; quantity: number }[];
        skill: number;
        level: number;
    };
    unlocked: boolean;
}

export interface MaterialQuality {
    name: string;
    multiplier: number;
    color: string;
    description: string;
    effects: string[];
}

export interface CraftingEvent {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    bonuses: {
        xpMultiplier: number;
        criticalChance: number;
        rareMaterialChance: number;
        qualityChance: number;
    };
    specialRecipes: string[];
    specialMaterials: string[];
}

// Random item generation interfaces
export interface RandomItemTemplate {
    id: string;
    name: string;
    description: string;
    category: 'consumable' | 'equipment' | 'artifact' | 'enhancement';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    icon: string;

    // Material requirements for generation
    materialRequirements: {
        categories: string[]; // e.g., ['mineral', 'essence']
        minRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
        quantity: number;
    };

    // Possible effects (one will be randomly selected)
    possibleEffects: RandomItemEffect[];

    // Generation weights
    weight: number;
    unlockLevel?: number;
}

export interface RandomItemEffect {
    type: 'stat_boost' | 'buff' | 'real_world_activity' | 'currency' | 'xp' | 'crafting_bonus';
    description: string;

    // For stat boosts
    statType?: string; // e.g., 'focus', 'productivity', 'motivation'
    statValue?: number;
    duration?: number; // in minutes

    // For buffs
    buffType?: 'xp' | 'coins' | 'rewards' | 'trade' | 'crafting';
    multiplier?: number;
    buffDuration?: string; // e.g., '1h', '30m'

    // For real-world activities
    realWorldActivity?: string;
    activityDuration?: number; // in minutes

    // For currency/xp
    amount?: number;

    // For crafting bonuses
    craftingBonus?: {
        type: 'success_rate' | 'quality_chance' | 'material_efficiency';
        value: number;
        duration: string;
    };
}

export interface GeneratedRandomItem {
    id: string;
    templateId: string;
    name: string;
    description: string;
    category: string;
    rarity: string;
    icon: string;
    effect: RandomItemEffect;
    createdAt: string;
    materialsUsed: { name: string; quantity: number }[];
}
