import { App } from 'obsidian';
import { Quest } from '../utils/taskParser';
import { addOrIncrementInventoryItem } from '../../inventory/utils/updateInventoryFile';
import type { EnhancedCustomReward } from '../components/CustomRewardBuilder';
import { CraftingEngine } from '../../crafting/utils/craftingEngine';
import type { CraftingMaterial } from '../../crafting/types/CraftingTypes';

// Quest reward item types
export interface QuestRewardItem {
  name: string;
  category: 'equipment' | 'potion' | 'material' | 'artifact' | 'consumable' | 'scroll';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  icon: string;
  quantity?: number;
  value?: number; // Base value for selling/trading
  effects?: string[]; // Special effects or uses
}

// Predefined quest reward items pool
export const QUEST_REWARD_ITEMS: QuestRewardItem[] = [
  // Equipment - Common
  { name: 'Iron Sword', category: 'equipment', rarity: 'common', description: 'A sturdy iron blade for aspiring warriors', icon: '⚔️', value: 50, effects: ['Increases combat effectiveness'] },
  { name: 'Leather Boots', category: 'equipment', rarity: 'common', description: 'Comfortable boots for long journeys', icon: '🥾', value: 30, effects: ['Improves movement speed'] },
  { name: 'Wooden Shield', category: 'equipment', rarity: 'common', description: 'Basic protection for beginners', icon: '🛡️', value: 25, effects: ['Provides basic defense'] },

  // Potions - Common to Rare
  { name: 'Health Potion', category: 'potion', rarity: 'common', description: 'Restores vitality and energy', icon: '🧪', value: 20, effects: ['Restores health', 'Instant use'] },
  { name: 'Mana Elixir', category: 'potion', rarity: 'uncommon', description: 'Replenishes magical energy', icon: '💙', value: 35, effects: ['Restores mana', 'Enhances focus'] },
  { name: 'Stamina Draught', category: 'potion', rarity: 'uncommon', description: 'Boosts endurance for demanding tasks', icon: '🟢', value: 40, effects: ['Increases stamina', 'Reduces fatigue'] },
  { name: 'Elixir of Wisdom', category: 'potion', rarity: 'rare', description: 'Temporarily enhances learning ability', icon: '🔮', value: 75, effects: ['Boosts XP gain', 'Improves problem-solving'] },

  // Materials - Various rarities
  { name: 'Ancient Parchment', category: 'material', rarity: 'uncommon', description: 'Old parchment with mysterious writings', icon: '📜', value: 45, effects: ['Crafting material', 'Research component'] },
  { name: 'Crystal Shard', category: 'material', rarity: 'rare', description: 'A fragment of pure magical crystal', icon: '💎', value: 100, effects: ['Magical enhancement', 'Enchanting component'] },
  { name: 'Dragon Scale', category: 'material', rarity: 'epic', description: 'A scale from an ancient dragon', icon: '🐲', value: 250, effects: ['Legendary crafting', 'Powerful enchantments'] },

  // Artifacts - Rare to Legendary  
  { name: 'Compass of Truth', category: 'artifact', rarity: 'rare', description: 'Always points towards your true goal', icon: '🧭', value: 150, effects: ['Reveals hidden objectives', 'Guidance enhancement'] },
  { name: 'Tome of Knowledge', category: 'artifact', rarity: 'epic', description: 'Contains the wisdom of ancient scholars', icon: '📚', value: 300, effects: ['Permanent XP bonus', 'Unlocks hidden skills'] },
  { name: 'Crown of the Eternal', category: 'artifact', rarity: 'legendary', description: 'A crown worn by the greatest of heroes', icon: '👑', value: 500, effects: ['Massive stat boost', 'Leadership abilities'] },

  // Consumables
  { name: 'Focus Incense', category: 'consumable', rarity: 'common', description: 'Helps maintain concentration', icon: '🕯️', value: 15, effects: ['Improves focus', 'Single use'] },
  { name: 'Lucky Charm', category: 'consumable', rarity: 'uncommon', description: 'Increases fortune for a short time', icon: '🍀', value: 60, effects: ['Boosts luck', 'Better quest rewards'] },

  // Scrolls
  { name: 'Scroll of Motivation', category: 'scroll', rarity: 'uncommon', description: 'Inspires the reader to greater achievements', icon: '📃', value: 55, effects: ['Motivation boost', 'Temporary stat increase'] },
  { name: 'Ancient Spell Scroll', category: 'scroll', rarity: 'rare', description: 'Contains a powerful forgotten spell', icon: '📋', value: 120, effects: ['Magical abilities', 'Single use spell'] },
];



// Get rarity based on quest XP and difficulty
export function determineRewardRarity(quest: Quest): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
  const xp = typeof quest.xp === 'number' ? quest.xp : parseInt(String(quest.xp || 0));
  const difficulty = quest.difficulty?.toLowerCase() || 'medium';
  const priority = quest.priority?.toLowerCase() || 'medium';

  let rarityScore = 0;

  // Base score from XP
  if (xp >= 2000) rarityScore += 30; // Legendary tier
  else if (xp >= 1000) rarityScore += 20; // Epic tier  
  else if (xp >= 500) rarityScore += 15; // Rare tier
  else if (xp >= 200) rarityScore += 10; // Uncommon tier
  else rarityScore += 5; // Common tier

  // Difficulty bonus
  if (difficulty === 'hard') rarityScore += 15;
  else if (difficulty === 'medium') rarityScore += 8;
  else rarityScore += 3;

  // Priority bonus
  if (priority === 'high') rarityScore += 10;
  else if (priority === 'medium') rarityScore += 5;
  else rarityScore += 2;

  // Add some randomness
  rarityScore += Math.random() * 20;

  // Adjust thresholds by player reputation (if available on window)
  const app: any = (window as any).app;
  const plugin = app?.plugins?.plugins?.["Gamification-into-Obsidian"];
  const rep = Math.max(-100, Math.min(100, Number(plugin?.player?.data?.questReputation ?? 0)));
  const shift = rep / 50; // -2..+2 points shift

  // Determine rarity based on final score with shift
  if (rarityScore + shift >= 45) return 'legendary';
  if (rarityScore + shift >= 35) return 'epic';
  if (rarityScore + shift >= 25) return 'rare';
  if (rarityScore + shift >= 15) return 'uncommon';
  return 'common';
}

// Parse custom rewards from quest metadata
export function parseQuestCustomRewards(quest: Quest): QuestRewardItem[] {
  const rewards: QuestRewardItem[] = [];

  // Check for custom reward metadata in quest (supports both formats)
  const rewardMetadata = (quest as unknown as Record<string, unknown>)['rewards'] || (quest as unknown as Record<string, unknown>)['reward'];

  if (typeof rewardMetadata === 'string') {
    // Parse string format like "Health Potion,Iron Sword,Crystal Shard x2"
    const rewardStrings = rewardMetadata.split(',').map((r: string) => r.trim());

    rewardStrings.forEach(rewardStr => {
      const quantityMatch = rewardStr.match(/^(.+?)\s+x(\d+)$/);
      const itemName = quantityMatch ? quantityMatch[1].trim() : rewardStr;
      const quantity = quantityMatch ? parseInt(quantityMatch[2]) : 1;

      const item = QUEST_REWARD_ITEMS.find(i =>
        i.name.toLowerCase() === itemName.toLowerCase()
      );

      if (item) {
        rewards.push({ ...item, quantity });
      }
    });
  }

  return rewards;
}

// Parse enhanced custom rewards from quest metadata
export function parseEnhancedCustomRewards(quest: Quest): EnhancedCustomReward[] {
  const rewards: EnhancedCustomReward[] = [];

  // Check for enhanced custom rewards metadata
  const enhancedRewardMetadata = (quest as unknown as Record<string, unknown>)['enhancedRewards'];

  if (Array.isArray(enhancedRewardMetadata)) {
    enhancedRewardMetadata.forEach((rewardData: any) => {
      if (typeof rewardData === 'object' && rewardData.name) {
        rewards.push(rewardData as EnhancedCustomReward);
      }
    });
  }

  return rewards;
}

// Convert enhanced custom reward to quest reward item for processing
export function convertEnhancedRewardToQuestItem(enhancedReward: EnhancedCustomReward): QuestRewardItem {
  return {
    name: enhancedReward.name,
    category: enhancedReward.category as any || 'consumable',
    rarity: enhancedReward.rarity,
    description: enhancedReward.description,
    icon: enhancedReward.icon,
    quantity: enhancedReward.quantity,
    value: enhancedReward.materialData?.baseValue || 0,
    effects: enhancedReward.effects || []
  };
}

// Add crafting material to the crafting system
export async function addCraftingMaterialReward(app: App, enhancedReward: EnhancedCustomReward): Promise<void> {
  if (enhancedReward.type !== 'material' || !enhancedReward.materialData) {
    return;
  }

  try {
    // Create a crafting material from the enhanced reward
    const craftingMaterial: CraftingMaterial = {
      id: `custom_${enhancedReward.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      name: enhancedReward.name,
      icon: enhancedReward.icon,
      rarity: enhancedReward.rarity,
      category: enhancedReward.materialData.category,
      description: enhancedReward.description,
      baseValue: enhancedReward.materialData.baseValue,
      quality: enhancedReward.materialData.quality,
      qualityMultiplier: getQualityMultiplier(enhancedReward.materialData.quality),
      source: 'quest',
      location: 'quest_reward'
    };

    // Add the material to the player's crafting inventory
    await CraftingEngine.addMaterialToInventory(app, craftingMaterial, enhancedReward.quantity);

    console.log('🎮 [Enhanced Rewards] Added crafting material:', craftingMaterial.name, 'x' + enhancedReward.quantity);
  } catch (error) {
    console.error('🎮 [Enhanced Rewards] Error adding crafting material:', error);
  }
}

// Get quality multiplier for crafting materials
function getQualityMultiplier(quality: string): number {
  const qualityMultipliers: Record<string, number> = {
    'fresh': 1.5,
    'normal': 1.0,
    'dried': 0.8,
    'refined': 1.3,
    'masterwork': 2.0
  };
  return qualityMultipliers[quality] || 1.0;
}

// Generate random rewards based on quest properties
export function generateRandomRewards(quest: Quest, numRewards = 1): QuestRewardItem[] {
  const rewards: QuestRewardItem[] = [];
  const targetRarity = determineRewardRarity(quest);

  // Get items of target rarity and nearby rarities
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const targetIndex = rarityOrder.indexOf(targetRarity);

  const candidateItems = QUEST_REWARD_ITEMS.filter(item => {
    const itemIndex = rarityOrder.indexOf(item.rarity);
    return Math.abs(itemIndex - targetIndex) <= 1; // Allow ±1 rarity difference
  });

  // Prefer items that match quest skills/themes
  const questSkills = quest.skills || [];
  const preferredItems = candidateItems.filter(item => {
    // Match themes
    if (questSkills.some(skill => skill.toLowerCase().includes('combat') || skill.toLowerCase().includes('warrior'))) {
      return item.category === 'equipment' && ['sword', 'shield', 'armor'].some(word => item.name.toLowerCase().includes(word));
    }
    if (questSkills.some(skill => skill.toLowerCase().includes('magic') || skill.toLowerCase().includes('wizard'))) {
      return item.category === 'scroll' || item.category === 'artifact' || item.name.toLowerCase().includes('mana');
    }
    if (questSkills.some(skill => skill.toLowerCase().includes('craft') || skill.toLowerCase().includes('build'))) {
      return item.category === 'material';
    }
    return true;
  });

  const itemPool = preferredItems.length > 0 ? preferredItems : candidateItems;

  for (let i = 0; i < numRewards && itemPool.length > 0; i++) {
    const randomItem = itemPool[Math.floor(Math.random() * itemPool.length)];

    // Determine quantity based on rarity (lower rarity = potentially higher quantity)  
    let quantity = 1;
    if (randomItem.rarity === 'common' && Math.random() < 0.3) quantity = 2;
    if (randomItem.rarity === 'uncommon' && Math.random() < 0.15) quantity = 2;

    rewards.push({ ...randomItem, quantity });
  }

  return rewards;
}

// Generate random rewards by specific rarity and count
export function generateRandomRewardsByRarity(
  targetRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
  numRewards: number = 1
): QuestRewardItem[] {
  const rewards: QuestRewardItem[] = [];

  // Get items of target rarity
  const candidateItems = QUEST_REWARD_ITEMS.filter(item => item.rarity === targetRarity);

  if (candidateItems.length === 0) {
    console.warn(`🎮 [Quest Rewards] No items found for rarity: ${targetRarity}`);
    return [];
  }

  for (let i = 0; i < numRewards; i++) {
    // Select random item from candidates
    const randomItem = candidateItems[Math.floor(Math.random() * candidateItems.length)];

    // Determine quantity based on rarity (rarer items = fewer quantity)
    let quantity = 1;
    if (targetRarity === 'common') quantity = Math.random() < 0.3 ? 2 : 1;
    if (targetRarity === 'uncommon') quantity = Math.random() < 0.2 ? 2 : 1;
    // Rare+ items stay at 1 to maintain their value

    // Clone the item to avoid modifying the original
    const rewardItem = { ...randomItem, quantity };

    // Avoid duplicates in the same reward set
    const existingItem = rewards.find(r => r.name === rewardItem.name);
    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + quantity;
    } else {
      rewards.push(rewardItem);
    }
  }

  return rewards;
}

// Calculate number of rewards based on quest properties
export function calculateNumRewards(quest: Quest): number {
  const xp = typeof quest.xp === 'number' ? quest.xp : parseInt(String(quest.xp || 0));
  const hasSubtasks = quest.subtasks && quest.subtasks.length > 0;
  const isHighPriority = quest.priority?.toLowerCase() === 'high';
  const isHardDifficulty = quest.difficulty?.toLowerCase() === 'hard';

  let numRewards = 1; // Base reward

  // Bonus rewards for significant quests
  if (xp >= 1000) numRewards += 1;
  if (xp >= 2000) numRewards += 1;
  if (hasSubtasks && quest.subtasks!.length >= 5) numRewards += 1;
  if (isHighPriority) numRewards += 1;
  if (isHardDifficulty) numRewards += 1;

  // Cap at reasonable number
  return Math.min(numRewards, 4);
}

// Main reward processing function
export async function processQuestRewards(app: App, quest: Quest): Promise<QuestRewardItem[]> {
  if (!quest.completed) {
    return []; // Only process rewards for completed quests
  }

  console.log('🎮 [Quest Rewards] Processing rewards for quest:', quest.title);
  const rewards: QuestRewardItem[] = [];

  // 1. Process enhanced custom rewards first
  const enhancedRewards = parseEnhancedCustomRewards(quest);
  for (const enhancedReward of enhancedRewards) {
    if (enhancedReward.type === 'material') {
      // Add to crafting system
      await addCraftingMaterialReward(app, enhancedReward);
    } else {
      // Convert to quest item and add to regular rewards
      const questItem = convertEnhancedRewardToQuestItem(enhancedReward);
      rewards.push(questItem);
    }
  }
  console.log('🎮 [Quest Rewards] Enhanced custom rewards:', enhancedRewards.length);

  // 2. Get legacy custom defined rewards
  const customRewards = parseQuestCustomRewards(quest);
  rewards.push(...customRewards);
  console.log('🎮 [Quest Rewards] Legacy custom rewards:', customRewards.length);

  // 2. Generate random rewards if no custom rewards or to supplement
  const numRandomRewards = customRewards.length > 0 ?
    Math.max(0, calculateNumRewards(quest) - customRewards.length) :
    calculateNumRewards(quest);

  if (numRandomRewards > 0) {
    const randomRewards = generateRandomRewards(quest, numRandomRewards);
    rewards.push(...randomRewards);
    console.log('🎮 [Quest Rewards] Random rewards:', randomRewards.length);
  }

  console.log('🎮 [Quest Rewards] Total rewards to add:', rewards.length);

  // 3. Add items to inventory
  for (const reward of rewards) {
    try {
      console.log('🎮 [Quest Rewards] Adding to inventory:', reward.name, reward.quantity || 1);
      await addOrIncrementInventoryItem(app, {
        name: reward.name,
        category: reward.category,
        rarity: reward.rarity,
        description: reward.description,
        icon: reward.icon,
        price: reward.value || 0, // Quest rewards are free
        tags: [reward.category, reward.rarity], // Generate tags from category and rarity
      }, reward.quantity || 1);
      console.log('🎮 [Quest Rewards] Successfully added:', reward.name);
    } catch (error) {
      console.error('🎮 [Quest Rewards] Error adding item to inventory:', reward.name, error);
    }
  }

  // 4. Add material rewards based on quest difficulty
  try {
    console.log('🎮 [Quest Rewards] Adding material rewards...');
    const { MaterialInventoryManager } = await import("../../../shared/services/materialInventoryManager");

    // Determine difficulty from quest properties
    let difficulty = 'medium'; // default
    if (quest.difficulty === 'hard' || quest.difficulty === 'Hard') difficulty = 'hard';
    else if (quest.difficulty === 'easy' || quest.difficulty === 'Easy') difficulty = 'easy';
    else if (quest.difficulty === 'medium' || quest.difficulty === 'Medium') difficulty = 'medium';

    console.log('🎮 [Quest Rewards] Quest difficulty:', difficulty);

    // Add materials to inventory
    const materialReward = await MaterialInventoryManager.addQuestMaterials(app, difficulty);

    console.log('🎮 [Quest Rewards] Material rewards:', materialReward.materials.length);

    // Show material reward notification
    if (materialReward.materials.length > 0) {
      MaterialInventoryManager.showMaterialRewardNotification(
        materialReward.materials,
        materialReward.quality,
        'quest completion'
      );
    }
  } catch (error) {
    console.error('🎮 [Quest Rewards] Error adding material rewards:', error);
  }

  console.log('🎮 [Quest Rewards] Final rewards count:', rewards.length);
  return rewards;
}

// Preview quest rewards without completing the quest
export function previewQuestRewards(quest: Quest): QuestRewardItem[] {
  const rewards: QuestRewardItem[] = [];

  // 1. Get custom defined rewards first
  const customRewards = parseQuestCustomRewards(quest);
  rewards.push(...customRewards);

  // 2. Generate preview of random rewards (deterministic based on quest properties)
  const numRandomRewards = customRewards.length > 0 ?
    Math.max(0, calculateNumRewards(quest) - customRewards.length) :
    calculateNumRewards(quest);

  if (numRandomRewards > 0) {
    // Use quest ID as seed for consistent preview
    const questSeed = quest.id ? quest.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;

    const targetRarity = determineRewardRarity(quest);
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const targetIndex = rarityOrder.indexOf(targetRarity);

    const candidateItems = QUEST_REWARD_ITEMS.filter(item => {
      const itemIndex = rarityOrder.indexOf(item.rarity);
      return Math.abs(itemIndex - targetIndex) <= 1;
    });

    // Prefer items that match quest skills/themes  
    const questSkills = quest.skills || [];
    const preferredItems = candidateItems.filter(item => {
      if (questSkills.some(skill => skill.toLowerCase().includes('combat') || skill.toLowerCase().includes('warrior'))) {
        return item.category === 'equipment' && ['sword', 'shield', 'armor'].some(word => item.name.toLowerCase().includes(word));
      }
      if (questSkills.some(skill => skill.toLowerCase().includes('magic') || skill.toLowerCase().includes('wizard'))) {
        return item.category === 'scroll' || item.category === 'artifact' || item.name.toLowerCase().includes('mana');
      }
      if (questSkills.some(skill => skill.toLowerCase().includes('craft') || skill.toLowerCase().includes('build'))) {
        return item.category === 'material';
      }
      return true;
    });

    const itemPool = preferredItems.length > 0 ? preferredItems : candidateItems;

    // Generate deterministic preview based on quest properties
    for (let i = 0; i < numRandomRewards && itemPool.length > 0; i++) {
      const index = (questSeed + i * 7) % itemPool.length; // Deterministic selection
      const previewItem = itemPool[index];

      let quantity = 1;
      if (previewItem.rarity === 'common' && (questSeed + i) % 10 < 3) quantity = 2;
      if (previewItem.rarity === 'uncommon' && (questSeed + i) % 10 < 1) quantity = 2;

      rewards.push({ ...previewItem, quantity });
    }
  }

  return rewards;
}

// Rarity color mapping for UI
export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return '#9E9E9E';
    case 'uncommon': return '#4CAF50';
    case 'rare': return '#2196F3';
    case 'epic': return '#9C27B0';
    case 'legendary': return '#FF9800';
    default: return '#9E9E9E';
  }
}

// Rarity display name
export function getRarityDisplayName(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

// Get rarity border style
export function getRarityBorder(rarity: string): string {
  const color = getRarityColor(rarity);
  return `2px solid ${color}`;
}

// Get rarity glow effect
export function getRarityGlow(rarity: string): string {
  const color = getRarityColor(rarity);
  return `0 0 10px ${color}40, 0 0 20px ${color}20`;
}

// Test function to verify rewards system is working
export function testRewardsSystem(): void {
  console.log('🎮 Quest Rewards System Test');
  console.log('Available items:', QUEST_REWARD_ITEMS.length);

  // Test rarity distribution
  const rarities = QUEST_REWARD_ITEMS.map(item => item.rarity);
  const rarityCount = rarities.reduce((acc, rarity) => {
    acc[rarity] = (acc[rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Rarity distribution:', rarityCount);

  // Test sample quest
  const sampleQuest: Quest = {
    id: 'test-quest',
    title: 'Test Quest',
    className: 'test',
    stats: [],
    xp: 500,
    cp: 50,
    coins: 50,
    difficulty: 'medium',
    priority: 'high',
    completed: false,
    subtasks: [],
    skills: ['programming']
  };

  console.log('Sample quest rewards preview:', previewQuestRewards(sampleQuest));
}

// Test inventory system directly
export async function testInventorySystem(app: App): Promise<void> {
  console.log('🎮 Testing Inventory System...');

  try {
    // Test adding a simple item
    await addOrIncrementInventoryItem(app, {
      name: 'Test Sword',
      category: 'equipment',
      rarity: 'common',
      description: 'A test item to verify inventory system',
      icon: '⚔️',
      price: 50,
      tags: ['equipment', 'common']
    }, 1);

    console.log('✅ Test item added successfully');

    // Check if inventory file exists
    const inventoryFile = app.vault.getAbstractFileByPath('Inventory.md');
    if (inventoryFile) {
      console.log('✅ Inventory.md file exists');
      const content = await app.vault.read(inventoryFile as any);
      console.log('📄 Inventory content:', content);
    } else {
      console.log('❌ Inventory.md file not found');
    }

  } catch (error) {
    console.error('❌ Inventory test failed:', error);
  }
}