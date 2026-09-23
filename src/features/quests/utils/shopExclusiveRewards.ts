/** Real-life treats stay in the Shop — they cannot be attached to quests. */
const SHOP_EXCLUSIVE_NAME =
	/\b(coffee break|enjoy a treat|treat voucher|loot box treat)\b/i;

const SHOP_EXCLUSIVE_EFFECT =
	/artifact:(coffee break|enjoy a treat)/i;

export function isShopExclusiveCustomReward(reward: {
	name?: string;
	effects?: string[];
}): boolean {
	if (reward.name && SHOP_EXCLUSIVE_NAME.test(reward.name)) return true;
	return (reward.effects ?? []).some((effect) => SHOP_EXCLUSIVE_EFFECT.test(effect));
}

export const GAMIFY_REWARDS_OPEN = '%%gamifyRewards:';
export const GAMIFY_REWARDS_CLOSE = '%%';

export function serializeGamifyRewardsLine(rewards: unknown[]): string {
	return `  ${GAMIFY_REWARDS_OPEN}${JSON.stringify(rewards)}${GAMIFY_REWARDS_CLOSE}`;
}

export function parseGamifyRewardsLine(line: string): unknown[] | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith(GAMIFY_REWARDS_OPEN) || !trimmed.endsWith(GAMIFY_REWARDS_CLOSE)) {
		return null;
	}
	const json = trimmed.slice(GAMIFY_REWARDS_OPEN.length, -GAMIFY_REWARDS_CLOSE.length);
	try {
		const parsed = JSON.parse(json) as unknown;
		return Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
}
