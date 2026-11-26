import type { App } from 'obsidian';
import type { QuestCustomRewardSetting } from '../../../core/settings';
import type { Quest } from './taskParser';
import { isShopExclusiveCustomReward } from './shopExclusiveRewards';
import {
	addCraftingMaterialReward,
	convertEnhancedRewardToQuestItem,
	determineRewardRarity,
} from './questRewardsSystem';
import { addOrIncrementInventoryItem } from '../../inventory/utils/updateInventoryFile';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import { getPluginSettingsFromApp } from '../../../shared/utils/gameplayConfig';
import type { EnhancedCustomReward } from '../components/CustomRewardBuilder';

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
type LootRarity = (typeof RARITY_ORDER)[number];

/** Lower rarities drop more often. Harder quests shift the target toward rarer loot. */
const RARITY_WEIGHT: Record<LootRarity, number> = {
	common: 40,
	uncommon: 22,
	rare: 10,
	epic: 4,
	legendary: 1.5,
};

export function questCustomDropChance(quest: Quest): number {
	const difficulty = (quest.difficulty || 'medium').toLowerCase();
	const priority = (quest.priority || 'medium').toLowerCase();
	const xp = typeof quest.xp === 'number' ? quest.xp : parseInt(String(quest.xp || 0), 10) || 0;

	let chance = 0.28;
	if (difficulty === 'easy' || difficulty === 'lowest' || difficulty === 'low') chance = 0.16;
	else if (difficulty === 'hard' || difficulty === 'highest') chance = 0.5;

	if (xp >= 1000) chance += 0.12;
	else if (xp >= 500) chance += 0.06;
	if (priority === 'high' || priority === 'highest' || priority === 'urgent') chance += 0.05;

	return Math.min(0.72, chance);
}

function pickWeight(reward: QuestCustomRewardSetting, target: LootRarity): number {
	const rarity = (RARITY_ORDER.includes(reward.rarity as LootRarity)
		? reward.rarity
		: 'common') as LootRarity;
	const dist = Math.abs(RARITY_ORDER.indexOf(rarity) - RARITY_ORDER.indexOf(target));
	const closeness = dist === 0 ? 1.8 : dist === 1 ? 0.55 : 0.12;
	return RARITY_WEIGHT[rarity] * closeness;
}

export function rollQuestCustomReward(
	pool: QuestCustomRewardSetting[],
	quest: Quest
): QuestCustomRewardSetting | null {
	const eligible = pool.filter((reward) => !isShopExclusiveCustomReward(reward));
	if (eligible.length === 0) return null;
	if (Math.random() > questCustomDropChance(quest)) return null;

	const target = determineRewardRarity(quest);
	const weights = eligible.map((reward) => pickWeight(reward, target));
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	if (total <= 0) return eligible[Math.floor(Math.random() * eligible.length)] ?? null;

	let roll = Math.random() * total;
	for (let i = 0; i < eligible.length; i++) {
		roll -= weights[i];
		if (roll <= 0) return eligible[i];
	}
	return eligible[eligible.length - 1] ?? null;
}

export async function grantRolledCustomLoot(app: App, quest: Quest): Promise<void> {
	const settings = getPluginSettingsFromApp(app);
	const pool = settings?.questCustomRewardPool ?? [];
	const dropped = rollQuestCustomReward(pool, quest);
	if (!dropped) return;

	const reward = dropped as EnhancedCustomReward;
	if (reward.type === 'material') {
		await addCraftingMaterialReward(app, reward);
	} else {
		const item = convertEnhancedRewardToQuestItem(reward);
		await addOrIncrementInventoryItem(
			app,
			{
				name: item.name,
				category: item.category,
				rarity: item.rarity,
				description: item.description,
				icon: item.icon,
				price: item.value || 0,
				tags: [item.category, item.rarity],
			},
			item.quantity || 1
		);
	}

	const qty = reward.quantity > 1 ? ` ×${reward.quantity}` : '';
	pixelNotice(`${reward.icon || '🎁'} ${reward.name}${qty} dropped!`, 4000, 'high');
}
