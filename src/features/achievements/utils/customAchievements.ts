import type { App, TFile } from 'obsidian';
import type { Achievement, BadgeTier } from '../../../data/models/AchievementSystem';
import { emitAchievementUnlocked } from '../../../shared/utils/achievementGalleryEvents';
import { playerStore } from '../../../shared/state/playerStore';
import { clearSkillsCache, getAllSkills, type SkillMetadata } from '../../../shared/utils/skillDiscovery';
import { loadCompletionLedger } from '../../quests/utils/completionLedger';

const STORE_PATH = '.obsidian/plugins/Gamification-into-Obsidian/custom-achievements.json';

export const CUSTOM_ACHIEVEMENTS_CHANGED = 'gamification:custom-achievements-changed';

export type SkillAchievementRule = 'uses' | 'level' | 'cp' | 'mastered';

export interface CustomAchievement {
	id: string;
	title: string;
	skillName: string;
	/** Vault path of the skill note. The live name is read from this file. */
	skillPath?: string;
	/** Names this badge has answered to, so older quest lines still count after a rename. */
	skillAliases?: string[];
	rule?: SkillAchievementRule;
	target: number;
	tier: BadgeTier;
	icon: string;
	imagePath?: string;
	coins?: number;
	titleReward?: string;
	uses: number;
	countedKeys: string[];
	status: 'locked' | 'in_progress' | 'completed';
	unlockedDate?: string;
	rewarded?: boolean;
}

export function skillRuleLabel(item: Pick<CustomAchievement, 'skillName' | 'target' | 'rule'>): string {
	const skill = item.skillName || 'a skill';
	const rule = item.rule ?? 'uses';
	if (rule === 'level') return `${skill} reaches level ${item.target}`;
	if (rule === 'cp') return `${skill} earns ${item.target} CP`;
	if (rule === 'mastered') return `${skill} is mastered`;
	return `Use ${skill} ${item.target} time${item.target === 1 ? '' : 's'}`;
}

export function skillUseLabel(skillName: string, target: number): string {
	return skillRuleLabel({ skillName, target, rule: 'uses' });
}

export function customToAchievement(item: CustomAchievement): Achievement {
	const rule = item.rule ?? 'uses';
	return {
		id: item.id,
		title: item.title,
		description: skillRuleLabel(item),
		category: 'special',
		tier: item.tier,
		icon: item.icon || '🏅',
		imagePath: item.imagePath,
		criteria: {
			type: 'custom',
			target: rule === 'mastered' ? 1 : item.target,
			meta: { type: `skill_${rule}`, skill: item.skillName },
		},
		rewards: {
			coins: item.coins,
			title: item.titleReward,
		},
	};
}

function normalizeSkill(name: string): string {
	return name.trim().toLowerCase();
}

function notifyCustomAchievements(): void {
	window.dispatchEvent(new CustomEvent(CUSTOM_ACHIEVEMENTS_CHANGED));
}

function fileBaseName(path: string): string {
	return path.split('/').pop()?.replace(/\.md$/i, '') ?? '';
}

function findSkill(skills: SkillMetadata[], item: CustomAchievement): SkillMetadata | undefined {
	if (item.skillPath) {
		const byPath = skills.find((skill) => skill.filePath === item.skillPath);
		if (byPath) return byPath;
	}
	const wanted = normalizeSkill(item.skillName);
	return skills.find((skill) => normalizeSkill(skill.name) === wanted);
}

function aliasSet(item: CustomAchievement, live?: SkillMetadata): Set<string> {
	const names = [item.skillName, live?.name, ...(item.skillAliases ?? [])];
	for (const path of [item.skillPath, live?.filePath]) {
		if (!path) continue;
		const base = fileBaseName(path);
		names.push(base, base.replace(/-/g, ' '));
	}
	return new Set(names.map((name) => (name ? normalizeSkill(name) : '')).filter(Boolean));
}

function rememberSkill(item: CustomAchievement, live?: SkillMetadata): CustomAchievement {
	return {
		...item,
		skillName: live?.name || item.skillName,
		skillPath: live?.filePath || item.skillPath,
		skillAliases: [...aliasSet(item, live)],
		rule: item.rule ?? 'uses',
	};
}

function applyMetric(item: CustomAchievement, value: number, goal = item.target): CustomAchievement {
	const amount = Math.max(0, Math.round(value));
	if (item.status === 'completed' || item.rewarded) {
		return { ...item, uses: Math.max(item.uses, amount), status: 'completed' };
	}
	const next = { ...item, uses: amount };
	if (amount <= 0) {
		next.status = 'locked';
		return next;
	}
	if (amount >= Math.max(1, goal)) {
		next.unlockedDate = new Date().toISOString();
		next.status = 'completed';
		return next;
	}
	next.status = 'in_progress';
	return next;
}

export function skillsOnTaskLine(taskLine: string): string[] {
	const names: string[] = [];
	const field = taskLine.match(/skills:\s*([^|}#]+)/i);
	if (field) {
		names.push(...field[1].split(',').map((part) => part.trim()));
	}
	const emoji = taskLine.match(/🛠️\s*([^✨⭐💰🔁🔥⚖️🌱📅#\n\r]+)/);
	if (emoji) {
		names.push(...emoji[1].split(/[;,]/).map((part) => part.trim()));
	}
	for (const match of taskLine.matchAll(/#skill\/([^\s#]+)/gi)) {
		names.push(match[1].replace(/-/g, ' '));
	}
	return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

export async function deleteCustomAchievement(app: App, id: string): Promise<CustomAchievement[]> {
	const items = (await loadCustomAchievements(app)).filter((item) => item.id !== id);
	await saveCustomAchievements(app, items);
	notifyCustomAchievements();
	return items;
}

export async function loadCustomAchievements(app: App): Promise<CustomAchievement[]> {
	try {
		if (!(await app.vault.adapter.exists(STORE_PATH))) return [];
		const raw = await app.vault.adapter.read(STORE_PATH);
		const parsed = JSON.parse(raw) as CustomAchievement[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

async function saveCustomAchievements(app: App, items: CustomAchievement[]): Promise<void> {
	await app.vault.adapter.write(STORE_PATH, JSON.stringify(items, null, 2));
}

export async function createCustomAchievement(
	app: App,
	draft: Omit<CustomAchievement, 'id' | 'uses' | 'countedKeys' | 'status' | 'rewarded'>
): Promise<CustomAchievement> {
	const items = await loadCustomAchievements(app);
	const created: CustomAchievement = {
		...draft,
		id: `custom-${Date.now().toString(36)}`,
		uses: 0,
		countedKeys: [],
		status: 'locked',
		rewarded: false,
		icon: draft.icon || '🏅',
		rule: draft.rule ?? 'uses',
		skillAliases: draft.skillAliases?.length ? draft.skillAliases : [draft.skillName],
		target: (draft.rule ?? 'uses') === 'mastered' ? 1 : Math.max(1, Math.round(draft.target)),
	};
	items.push(created);
	await saveCustomAchievements(app, items);
	await recountCustomAchievements(app);
	return created;
}

function applyUses(item: CustomAchievement, keys: string[]): CustomAchievement {
	const merged = [...new Set([...(item.countedKeys ?? []), ...keys])];
	if (item.status === 'completed' || item.rewarded) {
		return {
			...item,
			countedKeys: merged,
			uses: Math.max(item.uses, merged.length, item.target),
			status: 'completed',
		};
	}
	const next = { ...item, countedKeys: keys, uses: keys.length };
	if (next.uses <= 0) {
		next.status = 'locked';
		return next;
	}
	if (next.uses >= next.target) {
		next.unlockedDate = new Date().toISOString();
		next.status = 'completed';
		return next;
	}
	next.status = 'in_progress';
	return next;
}

async function skillUseKeys(app: App): Promise<Map<string, string[]>> {
	const ledger = await loadCompletionLedger(app);
	const byFile = new Map<string, number[]>();
	for (const key of Object.keys(ledger)) {
		if (key.endsWith(':note') || key.endsWith(':status')) continue;
		const match = key.match(/^(.*):(\d+)$/);
		if (!match) continue;
		const filePath = match[1];
		const line = Number(match[2]);
		const lines = byFile.get(filePath) ?? [];
		lines.push(line);
		byFile.set(filePath, lines);
	}

	const uses = new Map<string, string[]>();
	for (const [filePath, lines] of byFile) {
		const file = app.vault.getAbstractFileByPath(filePath);
		if (!file || !('extension' in file)) continue;
		let content = '';
		try {
			content = await app.vault.read(file as TFile);
		} catch {
			continue;
		}
		const rows = content.split(/\r?\n/);
		for (const lineNumber of lines) {
			const row = rows[lineNumber - 1] ?? '';
			if (!row.includes('- [x]') && !row.includes('- [X]')) continue;
			const key = `${filePath}:${lineNumber}`;
			for (const skill of skillsOnTaskLine(row)) {
				const id = normalizeSkill(skill);
				const list = uses.get(id) ?? [];
				if (!list.includes(key)) list.push(key);
				uses.set(id, list);
			}
		}
	}
	return uses;
}

/** Rebuild counts from quests and skill notes, then award anything that just finished. */
export async function recountCustomAchievements(app: App): Promise<CustomAchievement[]> {
	const items = await loadCustomAchievements(app);
	if (items.length === 0) return items;
	const skills = await getAllSkills(app.vault);
	const needsUses = items.some((item) => (item.rule ?? 'uses') === 'uses');
	const uses = needsUses ? await skillUseKeys(app) : new Map<string, string[]>();
	const unlocked: CustomAchievement[] = [];
	const next = items.map((item) => {
		const live = findSkill(skills, item);
		const linked = rememberSkill(item, live);
		const rule = linked.rule ?? 'uses';
		let updated = linked;
		if (rule === 'uses') {
			const keys: string[] = [];
			for (const name of aliasSet(linked, live)) {
				for (const key of uses.get(name) ?? []) {
					if (!keys.includes(key)) keys.push(key);
				}
			}
			updated = { ...applyUses(linked, keys), skillName: linked.skillName, skillPath: linked.skillPath, skillAliases: linked.skillAliases, rule };
		} else if (!live) {
			updated = linked;
		} else if (rule === 'level') {
			updated = applyMetric(linked, Number(live.level) || 0);
		} else if (rule === 'cp') {
			updated = applyMetric(linked, Number(live.totalCP ?? live.cp) || 0);
		} else {
			updated = applyMetric(linked, live.mastered ? 1 : 0, 1);
		}
		if (updated.status === 'completed' && !item.rewarded) unlocked.push(updated);
		return updated;
	});
	const changed = next.length !== items.length || next.some((item, index) => JSON.stringify(item) !== JSON.stringify(items[index]));
	if (!changed && unlocked.length === 0) return items;
	if (changed) await saveCustomAchievements(app, next);
	for (const item of unlocked) {
		await awardCustomAchievement(app, item.id);
	}
	const saved = await loadCustomAchievements(app);
	notifyCustomAchievements();
	return saved;
}

/** Drop the skill cache, then recount. Used when a note in the vault changes. */
export async function syncCustomAchievementsFromVault(app: App): Promise<void> {
	const items = await loadCustomAchievements(app);
	if (items.length === 0) return;
	clearSkillsCache();
	await recountCustomAchievements(app);
}

async function awardCustomAchievement(app: App, id: string): Promise<void> {
	const items = await loadCustomAchievements(app);
	const item = items.find((entry) => entry.id === id);
	if (!item || item.rewarded || item.status !== 'completed') return;
	item.rewarded = true;
	await saveCustomAchievements(app, items);
	if (item.coins && item.coins > 0) {
		try {
			await playerStore.addCoins(item.coins);
		} catch (error) {
			console.warn('[CustomAchievements] Could not grant coins', error);
		}
	}
	emitAchievementUnlocked(customToAchievement(item));
}
