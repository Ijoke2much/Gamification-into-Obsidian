import type { App } from 'obsidian';
import {
	applyDreamDurabilityToItem,
	buildDreamCombatStats,
	dreamTickNoticeLine,
	forecastDreamRaid,
	getDreamItemDurability,
	nextDreamDurability,
	planDreamBattleTick,
	type DreamBattleTickPlan,
	type DreamRaidHint,
} from './dreamCombat';
import { playerStore } from '../../../shared/state/playerStore';
import { getHunterKitItems } from '../../inventory/utils/gearFile';
import { readInventory, writeInventory } from '../../inventory/utils/updateInventoryFile';
import { getActiveBossFileRaid } from '../../quests/utils/bossRaidService';
import { readBoss } from '../../quests/utils/bossFile';
import { isBookOfEasyEnabled } from '../../../shared/utils/gameplayConfig';

export interface DreamBattleTickResult extends DreamBattleTickPlan {
	notice: string;
}

async function loadRaidHint(app: App): Promise<DreamRaidHint | null> {
	const raid = getActiveBossFileRaid();
	if (!raid || raid.defeated) return null;
	try {
		const boss = await readBoss(app, raid.bossFilePath);
		if (!boss) return null;
		return {
			name: boss.name,
			difficulty: boss.difficulty,
			timesDefeated: boss.timesDefeated,
		};
	} catch {
		return null;
	}
}

function dispatchGearUpdated(): void {
	try {
		window.dispatchEvent(new CustomEvent('gear-updated'));
	} catch {
		/* ignore */
	}
}

/**
 * Option 1 survival tick. Never throws, never blocks quest completion.
 * Book of Easy skips look wear only — HP still chips.
 */
export async function applyDreamBattleOnQuestComplete(
	app: App,
	settings?: { bookOfEasy?: boolean } | Record<string, unknown> | null
): Promise<DreamBattleTickResult | null> {
	try {
		const unbreaking = isBookOfEasyEnabled(settings);
		const player = await playerStore.get();
		if (!player) return null;

		const { look } = await getHunterKitItems(app);
		const raidHint = await loadRaidHint(app);
		const stats = buildDreamCombatStats(player.level ?? 1, look, player.dream, unbreaking);
		const forecast = forecastDreamRaid(stats, player.level ?? 1, raidHint);
		const plan = planDreamBattleTick(stats, forecast, look, unbreaking);

		let hpToStore = plan.hpAfter;
		if (plan.wearNames.length > 0) {
			const inventory = await readInventory(app.vault);
			const wearSet = new Set(plan.wearNames.map((name) => name.toLowerCase()));
			let changed = false;
			for (let i = 0; i < inventory.length; i++) {
				if (!wearSet.has(inventory[i].name.toLowerCase())) continue;
				const current = getDreamItemDurability(inventory[i], false);
				inventory[i] = applyDreamDurabilityToItem(
					inventory[i],
					nextDreamDurability(current)
				);
				changed = true;
			}
			if (changed) {
				await writeInventory(app.vault, inventory);
				dispatchGearUpdated();
				const { look: wornLook } = await getHunterKitItems(app);
				const afterWear = buildDreamCombatStats(
					player.level ?? 1,
					wornLook,
					{ ...player.dream, hp: plan.hpAfter },
					unbreaking
				);
				hpToStore = afterWear.hp;
			}
		}

		const lastBossName = plan.bossName?.trim() || null;
		await playerStore.update((data) => ({
			...data,
			dream: {
				...data.dream,
				hp: hpToStore,
				lastOutcome: plan.outcome,
				lastBossName,
			},
		}));

		const result: DreamBattleTickResult = {
			...plan,
			hpAfter: hpToStore,
			notice: dreamTickNoticeLine({ ...plan, hpAfter: hpToStore }),
		};
		return result;
	} catch (error) {
		console.warn('[dreamBattleTick] skipped:', error);
		return null;
	}
}
