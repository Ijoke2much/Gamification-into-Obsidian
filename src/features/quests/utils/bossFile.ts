import { App, normalizePath, parseYaml, stringifyYaml, TFile, TFolder } from 'obsidian';
import type { JourneyAffinityRule } from '../data/journeyFoeCatalog';
import { parseAffinityRule, serializeAffinityRule } from './foesParser';
import { JOURNEY_OFF_AFFINITY_MULTIPLIER } from './journeyAffinity';

/**
 * File-backed boss system.
 *
 * A boss is a single markdown note in the `Bosses/` folder:
 *   - frontmatter holds its properties AND live fight state
 *   - the body holds a `## Tasks` checklist that drives the HP bar
 *
 * Two bars:
 *   - HP    → lowered by completing the boss's body tasks (the real objective)
 *   - Armor → lowered by "attacks" (on a cooldown); while armor is up, task
 *             damage to HP is damped. Armor slowly regenerates over real time,
 *             so you attack periodically to keep task damage at full.
 *
 * Beating a boss (HP → 0) marks it `defeated`, bumps `times_defeated`, then
 * resets its stats so it is ready to face again later.
 */

export const BOSS_FOLDER = 'Bosses';
export const BOSS_UPDATED_EVENT = 'gamification-boss-updated';

export type BossDifficulty = 'easy' | 'medium' | 'hard';
export type BossStatus = 'dormant' | 'active' | 'defeated';

/** How many on-skill tasks are required to fell a boss of each difficulty. */
export const BOSS_REQUIRED_TASKS: Record<BossDifficulty, number> = {
	easy: 3,
	medium: 5,
	hard: 8,
};

/** HP per task is fixed so the Nth task is always the killing blow. */
export const BOSS_HP_PER_TASK = 100;

/** Armor pools scale with difficulty (~40% of HP). */
export const BOSS_MAX_ARMOR: Record<BossDifficulty, number> = {
	easy: 120,
	medium: 200,
	hard: 320,
};

/** Task HP damage is multiplied by this while armor remains (the "guard"). */
export const BOSS_ARMOR_DAMP_MULTIPLIER = 0.4;

/** A single attack strips this fraction of the armor pool (≈3 attacks to break). */
export const BOSS_ATTACK_ARMOR_FRACTION = 1 / 3;

/** Big cooldown between attacks (default 3h) — you can't spam armor breaks. */
export const BOSS_ATTACK_COOLDOWN_MS = 3 * 60 * 60 * 1000;

/** Armor regenerates this fraction of its max per hour of real time. */
export const BOSS_ARMOR_REGEN_PER_HOUR = 0.08;

const BOSS_DIFFICULTIES: BossDifficulty[] = ['easy', 'medium', 'hard'];

export interface BossTask {
	/** 0-based index into the file's line array (for safe write-back). */
	lineIndex: number;
	text: string;
	completed: boolean;
}

export interface BossFileData {
	filePath: string;
	bossId: string;
	name: string;
	emoji: string;
	description: string;
	/** Raw affinity string as stored in frontmatter, e.g. `skill:Body Builder`. */
	skill: string;
	affinityRule: JourneyAffinityRule;
	difficulty: BossDifficulty;
	maxHp: number;
	maxArmor: number;
	requiredTasks: number;
	currentHp: number;
	currentArmor: number;
	status: BossStatus;
	timesDefeated: number;
	lastDefeated: string | null;
	/** Epoch ms when the next attack becomes available. */
	attackReadyAt: number;
	/** Epoch ms of the last armor-regen settlement (for lazy time-based regen). */
	lastArmorRegenAt: number;
	tasks: BossTask[];
}

/* ── Difficulty helpers ───────────────────────────────────────────────────── */

export function normalizeBossDifficulty(value: unknown): BossDifficulty {
	const v = String(value ?? '').trim().toLowerCase();
	return (BOSS_DIFFICULTIES.find((d) => d === v) as BossDifficulty) ?? 'medium';
}

export function getRequiredTasks(difficulty: BossDifficulty): number {
	return BOSS_REQUIRED_TASKS[difficulty];
}

export function getDefaultMaxHp(difficulty: BossDifficulty): number {
	return getRequiredTasks(difficulty) * BOSS_HP_PER_TASK;
}

export function getDefaultMaxArmor(difficulty: BossDifficulty): number {
	return BOSS_MAX_ARMOR[difficulty];
}

/** HP removed by a single on-skill, unguarded task completion. */
export function getPerTaskDamage(boss: Pick<BossFileData, 'maxHp' | 'requiredTasks'>): number {
	return Math.max(1, Math.round(boss.maxHp / Math.max(1, boss.requiredTasks)));
}

/* ── Percent helpers (for bars) ───────────────────────────────────────────── */

export function getBossHpPercent(boss: Pick<BossFileData, 'currentHp' | 'maxHp'>): number {
	return Math.round((boss.currentHp / Math.max(1, boss.maxHp)) * 100);
}

export function getBossArmorPercent(boss: Pick<BossFileData, 'currentArmor' | 'maxArmor'>): number {
	if (boss.maxArmor <= 0) return 0;
	return Math.round((boss.currentArmor / boss.maxArmor) * 100);
}

export function isAttackReady(boss: Pick<BossFileData, 'attackReadyAt'>, now = Date.now()): boolean {
	return now >= (boss.attackReadyAt ?? 0);
}

export function getAttackCooldownRemainingMs(
	boss: Pick<BossFileData, 'attackReadyAt'>,
	now = Date.now()
): number {
	return Math.max(0, (boss.attackReadyAt ?? 0) - now);
}

export function formatCooldown(ms: number): string {
	if (ms <= 0) return 'Ready';
	const totalSec = Math.ceil(ms / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

/* ── Pure fight logic (returns a new boss snapshot; callers persist it) ─────── */

/** Settle time-based armor regen up to `now`, returning a new snapshot. */
export function settleArmorRegen(boss: BossFileData, now = Date.now()): BossFileData {
	if (boss.status !== 'active') return boss;
	if (boss.currentArmor >= boss.maxArmor) {
		return { ...boss, lastArmorRegenAt: now };
	}
	const last = boss.lastArmorRegenAt || now;
	const hours = Math.max(0, (now - last) / (60 * 60 * 1000));
	if (hours <= 0) return boss;
	const regen = boss.maxArmor * BOSS_ARMOR_REGEN_PER_HOUR * hours;
	if (regen < 1) return boss; // wait until at least 1 point accrues to avoid churn
	const currentArmor = Math.min(boss.maxArmor, Math.round(boss.currentArmor + regen));
	return { ...boss, currentArmor, lastArmorRegenAt: now };
}

export interface BossAttackResult {
	boss: BossFileData;
	applied: boolean;
	armorDamage: number;
	armorBroke: boolean;
	reason?: string;
}

/** Land an attack: strips armor, then starts the attack cooldown. */
export function applyAttack(boss: BossFileData, now = Date.now()): BossAttackResult {
	if (boss.status === 'defeated') {
		return { boss, applied: false, armorDamage: 0, armorBroke: false, reason: 'Boss already defeated.' };
	}
	if (!isAttackReady(boss, now)) {
		return {
			boss,
			applied: false,
			armorDamage: 0,
			armorBroke: false,
			reason: `Attack on cooldown (${formatCooldown(getAttackCooldownRemainingMs(boss, now))}).`,
		};
	}

	const settled = settleArmorRegen(boss, now);
	if (settled.currentArmor <= 0) {
		// Still consume the cooldown so attacks stay paced even when armor is down.
		return {
			boss: { ...settled, attackReadyAt: now + BOSS_ATTACK_COOLDOWN_MS },
			applied: true,
			armorDamage: 0,
			armorBroke: false,
			reason: 'Armor already shattered — focus on tasks.',
		};
	}

	const variance = 0.85 + Math.random() * 0.3; // 0.85×–1.15×
	const rawDamage = settled.maxArmor * BOSS_ATTACK_ARMOR_FRACTION * variance;
	const armorDamage = Math.max(1, Math.round(rawDamage));
	const currentArmor = Math.max(0, settled.currentArmor - armorDamage);

	return {
		boss: {
			...settled,
			currentArmor,
			attackReadyAt: now + BOSS_ATTACK_COOLDOWN_MS,
		},
		applied: true,
		armorDamage,
		armorBroke: settled.currentArmor > 0 && currentArmor <= 0,
	};
}

export interface BossArmorDamageResult {
	boss: BossFileData;
	armorDamage: number;
	armorBroke: boolean;
}

/**
 * Subtract a flat amount of armor (settling regen first). Used when battle
 * "moves" break armor — each move keeps its own cooldown, so there is no
 * global attack timer here (unlike `applyAttack`).
 */
export function damageArmor(boss: BossFileData, amount: number, now = Date.now()): BossArmorDamageResult {
	const settled = settleArmorRegen(boss, now);
	const dmg = Math.max(0, Math.round(amount));
	const currentArmor = Math.max(0, settled.currentArmor - dmg);
	return {
		boss: { ...settled, currentArmor, status: 'active' },
		armorDamage: settled.currentArmor - currentArmor,
		armorBroke: settled.currentArmor > 0 && currentArmor <= 0,
	};
}

export interface BossTaskResult {
	boss: BossFileData;
	hpDamage: number;
	/** True when the task missed the boss's skill (reduced damage). */
	grazed: boolean;
	/** True when armor damped the hit (armor still up). */
	damped: boolean;
	defeated: boolean;
}

/**
 * Apply a completed task to the boss HP.
 * - `matchesSkill` false → graze (25% damage) for off-skill work.
 * - armor up → damped (40%). Break armor with attacks for full task damage.
 * When HP reaches 0 the boss is marked defeated and its stats reset.
 */
export function applyTaskCompletion(
	boss: BossFileData,
	matchesSkill: boolean,
	now = Date.now(),
	options?: { damageMultiplier?: number }
): BossTaskResult {
	if (boss.status === 'defeated') {
		return { boss, hpDamage: 0, grazed: false, damped: false, defeated: true };
	}

	const settled = settleArmorRegen(boss, now);
	const perTask = getPerTaskDamage(settled);
	const grazed = !matchesSkill;
	const damped = settled.currentArmor > 0;

	let damage = perTask;
	if (grazed) damage *= JOURNEY_OFF_AFFINITY_MULTIPLIER;
	if (damped) damage *= BOSS_ARMOR_DAMP_MULTIPLIER;
	const mult = options?.damageMultiplier ?? 1;
	const hpDamage = Math.max(1, Math.round(damage * mult));

	const currentHp = Math.max(0, settled.currentHp - hpDamage);
	const defeated = currentHp <= 0;

	if (defeated) {
		return {
			boss: resetBossStats({ ...settled, currentHp: 0 }, now),
			hpDamage,
			grazed,
			damped,
			defeated: true,
		};
	}

	return {
		boss: { ...settled, currentHp, status: 'active' },
		hpDamage,
		grazed,
		damped,
		defeated: false,
	};
}

/** Mark a boss defeated and reset its stats so it can be faced again. */
export function resetBossStats(boss: BossFileData, now = Date.now()): BossFileData {
	return {
		...boss,
		status: 'defeated',
		timesDefeated: boss.timesDefeated + 1,
		lastDefeated: new Date(now).toISOString(),
		currentHp: boss.maxHp,
		currentArmor: boss.maxArmor,
		attackReadyAt: 0,
		lastArmorRegenAt: now,
		// Task checkboxes are reset in the file body by the caller.
		tasks: boss.tasks.map((t) => ({ ...t, completed: false })),
	};
}

/** Begin (or resume) a fight: flip to active and prime regen/cooldown clocks. */
export function activateBoss(boss: BossFileData, now = Date.now()): BossFileData {
	if (boss.status === 'active') return boss;
	return {
		...boss,
		status: 'active',
		// A freshly-woken boss starts with a ready attack and full timers.
		attackReadyAt: 0,
		lastArmorRegenAt: now,
	};
}

/* ── Parsing ──────────────────────────────────────────────────────────────── */

function slugify(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const TASK_LINE = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;

function parseBossTasks(lines: string[]): BossTask[] {
	const tasks: BossTask[] = [];
	lines.forEach((line, lineIndex) => {
		const m = line.match(TASK_LINE);
		if (!m) return;
		tasks.push({
			lineIndex,
			completed: m[1].toLowerCase() === 'x',
			text: m[2].trim(),
		});
	});
	return tasks;
}

function splitFrontmatter(content: string): { fm: Record<string, unknown>; body: string } {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) return { fm: {}, body: content };
	let fm: Record<string, unknown> = {};
	try {
		fm = (parseYaml(match[1]) as Record<string, unknown>) ?? {};
	} catch {
		fm = {};
	}
	return { fm, body: match[2] ?? '' };
}

function num(value: unknown, fallback: number): number {
	const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
	return Number.isFinite(n) ? n : fallback;
}

/** Parse a boss note's full contents into structured fight data. */
export function parseBossFile(filePath: string, content: string): BossFileData {
	const { fm, body } = splitFrontmatter(content);
	const lines = content.split('\n');
	const tasks = parseBossTasks(lines);

	const difficulty = normalizeBossDifficulty(fm['difficulty']);
	const requiredTasks = Math.max(1, Math.round(num(fm['required_tasks'], getRequiredTasks(difficulty))));
	const maxHp = Math.max(1, Math.round(num(fm['max_hp'], requiredTasks * BOSS_HP_PER_TASK)));
	const maxArmor = Math.max(0, Math.round(num(fm['max_armor'], getDefaultMaxArmor(difficulty))));

	const name =
		(typeof fm['name'] === 'string' && (fm['name'] as string).trim()) ||
		filePath.split('/').pop()?.replace(/\.md$/i, '') ||
		'Boss';
	const skill = typeof fm['skill'] === 'string' ? (fm['skill'] as string) : 'neutral';

	// Pull the first non-empty body line (that isn't a heading/task) as description.
	let description = typeof fm['description'] === 'string' ? (fm['description'] as string) : '';
	if (!description) {
		const bodyLine = body
			.split('\n')
			.map((l) => l.trim())
			.find((l) => l && !l.startsWith('#') && !TASK_LINE.test(l));
		description = bodyLine ?? '';
	}

	const status: BossStatus =
		fm['status'] === 'active' || fm['status'] === 'defeated' ? (fm['status'] as BossStatus) : 'dormant';

	return {
		filePath,
		bossId: (typeof fm['boss_id'] === 'string' && (fm['boss_id'] as string)) || slugify(name),
		name,
		emoji: (typeof fm['emoji'] === 'string' && (fm['emoji'] as string)) || '👹',
		description,
		skill,
		affinityRule: parseAffinityRule(skill),
		difficulty,
		maxHp,
		maxArmor,
		requiredTasks,
		currentHp: Math.max(0, Math.min(maxHp, Math.round(num(fm['current_hp'], maxHp)))),
		currentArmor: Math.max(0, Math.min(maxArmor, Math.round(num(fm['current_armor'], maxArmor)))),
		status,
		timesDefeated: Math.max(0, Math.round(num(fm['times_defeated'], 0))),
		lastDefeated: typeof fm['last_defeated'] === 'string' ? (fm['last_defeated'] as string) : null,
		attackReadyAt: Math.max(0, Math.round(num(fm['attack_ready_at'], 0))),
		lastArmorRegenAt: Math.max(0, Math.round(num(fm['last_armor_regen_at'], Date.now()))),
		tasks,
	};
}

/* ── File IO ──────────────────────────────────────────────────────────────── */

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const parts = normalizePath(folderPath).split('/').filter(Boolean);
	let current = '';
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current);
		}
	}
}

export function getBossFolder(): string {
	return BOSS_FOLDER;
}

function listBossTFiles(app: App): TFile[] {
	const folder = app.vault.getAbstractFileByPath(normalizePath(BOSS_FOLDER));
	if (!(folder instanceof TFolder)) return [];
	return folder.children.filter((c): c is TFile => c instanceof TFile && c.extension === 'md');
}

export async function listBosses(app: App): Promise<BossFileData[]> {
	const files = listBossTFiles(app);
	const bosses: BossFileData[] = [];
	for (const file of files) {
		try {
			const content = await app.vault.read(file);
			bosses.push(parseBossFile(file.path, content));
		} catch (error) {
			console.error(`[bossFile] Failed to read ${file.path}`, error);
		}
	}
	return bosses;
}

export async function readBoss(app: App, filePath: string): Promise<BossFileData | null> {
	const file = app.vault.getAbstractFileByPath(normalizePath(filePath));
	if (!(file instanceof TFile)) return null;
	const content = await app.vault.read(file);
	return parseBossFile(file.path, content);
}

/** Persist a boss's live fight state into its frontmatter (body untouched). */
export async function writeBossState(app: App, boss: BossFileData): Promise<void> {
	const file = app.vault.getAbstractFileByPath(normalizePath(boss.filePath));
	if (!(file instanceof TFile)) return;

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm['boss_id'] = boss.bossId;
		fm['name'] = boss.name;
		fm['emoji'] = boss.emoji;
		fm['skill'] = serializeAffinityRule(boss.affinityRule);
		fm['difficulty'] = boss.difficulty;
		fm['max_hp'] = boss.maxHp;
		fm['max_armor'] = boss.maxArmor;
		fm['required_tasks'] = boss.requiredTasks;
		fm['current_hp'] = boss.currentHp;
		fm['current_armor'] = boss.currentArmor;
		fm['status'] = boss.status;
		fm['times_defeated'] = boss.timesDefeated;
		fm['last_defeated'] = boss.lastDefeated ?? '';
		fm['attack_ready_at'] = boss.attackReadyAt;
		fm['last_armor_regen_at'] = boss.lastArmorRegenAt;
	});

	dispatchBossUpdated();
}

/** Toggle a body checkbox by line index and write it back. */
export async function setBossTaskCompleted(
	app: App,
	boss: BossFileData,
	lineIndex: number,
	completed: boolean
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(normalizePath(boss.filePath));
	if (!(file instanceof TFile)) return;

	const content = await app.vault.read(file);
	const lines = content.split('\n');
	const line = lines[lineIndex];
	if (line == null) return;
	const m = line.match(TASK_LINE);
	if (!m) return;

	lines[lineIndex] = line.replace(/\[( |x|X)\]/, completed ? '[x]' : '[ ]');
	await app.vault.modify(file, lines.join('\n'));
	dispatchBossUpdated();
}

/** Default checklist labels seeded / reset at the start of each gate fight. */
export function buildDefaultBossStrikeTasks(count: number, bossName?: string): string[] {
	const label = (bossName ?? 'Boss').trim() || 'Boss';
	return Array.from(
		{ length: Math.max(1, count) },
		(_, i) => `Strike ${i + 1} — tap to hit ${label} (resets each gate)`
	);
}

function replaceTasksSection(body: string, taskLines: string[]): string {
	const lines = body.split('\n');
	const startIdx = lines.findIndex((l) => /^##\s+Tasks/i.test(l.trim()));
	if (startIdx === -1) {
		return `${body.trimEnd()}\n\n## Tasks\n\n${taskLines.join('\n')}\n`;
	}
	let endIdx = lines.length;
	for (let i = startIdx + 1; i < lines.length; i++) {
		if (/^##\s+/.test(lines[i].trim())) {
			endIdx = i;
			break;
		}
	}
	const before = lines.slice(0, startIdx + 1);
	const after = lines.slice(endIdx);
	return [...before, '', ...taskLines, '', ...after.filter((l, i) => i > 0 || l.trim() !== '')].join('\n');
}

/** Rewrite the boss body checklist with fresh debug strikes (all unchecked). */
export async function resetBossStrikeTasks(app: App, boss: BossFileData): Promise<BossFileData> {
	const file = app.vault.getAbstractFileByPath(normalizePath(boss.filePath));
	if (!(file instanceof TFile)) return boss;

	const content = await app.vault.read(file);
	const { fm, body } = splitFrontmatter(content);
	const labels = buildDefaultBossStrikeTasks(boss.requiredTasks, boss.name);
	const taskLines = labels.map((t) => `- [ ] ${t}`);
	const newBody = replaceTasksSection(body, taskLines);
	const newContent = `---\n${stringifyYaml(fm)}---\n\n${newBody.replace(/^\n+/, '')}`;
	await app.vault.modify(file, newContent);
	dispatchBossUpdated();
	return parseBossFile(file.path, newContent);
}

/** Reset every body checkbox to unchecked (used when a boss is defeated/reset). */
export async function resetBossTasksInFile(app: App, boss: BossFileData): Promise<void> {
	const file = app.vault.getAbstractFileByPath(normalizePath(boss.filePath));
	if (!(file instanceof TFile)) return;

	const content = await app.vault.read(file);
	const lines = content.split('\n').map((line) => {
		const m = line.match(TASK_LINE);
		if (!m) return line;
		return line.replace(/\[( |x|X)\]/, '[ ]');
	});
	await app.vault.modify(file, lines.join('\n'));
	dispatchBossUpdated();
}

export interface CreateBossInput {
	name: string;
	emoji?: string;
	description?: string;
	/** Affinity string, e.g. `skill:Body Builder`, `class:Physical`, or `neutral`. */
	skill?: string;
	difficulty: BossDifficulty;
	/** Optional starter tasks (checkbox list) written into the body. */
	tasks?: string[];
}

/** Create a new boss note in the Bosses/ folder. Returns the created file. */
export async function createBossFile(app: App, input: CreateBossInput): Promise<TFile> {
	await ensureFolder(app, BOSS_FOLDER);

	const difficulty = normalizeBossDifficulty(input.difficulty);
	const requiredTasks = getRequiredTasks(difficulty);
	const maxHp = getDefaultMaxHp(difficulty);
	const maxArmor = getDefaultMaxArmor(difficulty);
	const skill = (input.skill ?? 'neutral').trim() || 'neutral';
	const now = Date.now();

	const baseName = (input.name || 'Boss').trim().replace(/[\\/:*?"<>|]/g, '');
	let filePath = normalizePath(`${BOSS_FOLDER}/${baseName}.md`);
	let suffix = 0;
	while (app.vault.getAbstractFileByPath(filePath)) {
		suffix += 1;
		filePath = normalizePath(`${BOSS_FOLDER}/${baseName} ${suffix}.md`);
	}

	const frontmatter: Record<string, unknown> = {
		boss_id: slugify(baseName) || `boss-${now}`,
		name: baseName,
		emoji: input.emoji?.trim() || '👹',
		skill,
		difficulty,
		max_hp: maxHp,
		max_armor: maxArmor,
		required_tasks: requiredTasks,
		current_hp: maxHp,
		current_armor: maxArmor,
		status: 'dormant',
		times_defeated: 0,
		last_defeated: '',
		attack_ready_at: 0,
		last_armor_regen_at: now,
	};

	const starterTasks = (input.tasks ?? []).map((t) => t.trim()).filter(Boolean);
	const taskLines = (
		starterTasks.length
			? starterTasks
			: buildDefaultBossStrikeTasks(requiredTasks, baseName)
	).map((t) => `- [ ] ${t}`);

	const bodyParts = [
		`# ${input.emoji?.trim() ? `${input.emoji.trim()} ` : ''}${baseName}`,
		'',
		input.description?.trim() || 'A boss that only real work can fell.',
		'',
		'## Tasks',
		'',
		...taskLines,
		'',
	];

	const content = `---\n${stringifyYaml(frontmatter)}---\n\n${bodyParts.join('\n')}`;
	return app.vault.create(filePath, content);
}

/** Update an existing boss note's metadata and task checklist (name/file path unchanged). */
export async function updateBossDefinition(
	app: App,
	filePath: string,
	input: CreateBossInput
): Promise<BossFileData> {
	const existing = await readBoss(app, filePath);
	if (!existing) {
		throw new Error(`Boss not found: ${filePath}`);
	}

	const difficulty = normalizeBossDifficulty(input.difficulty);
	const requiredTasks = getRequiredTasks(difficulty);
	const maxHp = getDefaultMaxHp(difficulty);
	const maxArmor = getDefaultMaxArmor(difficulty);
	const skill = (input.skill ?? 'neutral').trim() || 'neutral';
	const name = input.name.trim() || existing.name;
	const emoji = input.emoji?.trim() || '👹';
	const description = input.description?.trim() || existing.description;

	const file = app.vault.getAbstractFileByPath(normalizePath(filePath));
	if (!(file instanceof TFile)) {
		throw new Error(`Boss file missing: ${filePath}`);
	}

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm['name'] = name;
		fm['emoji'] = emoji;
		fm['skill'] = skill;
		fm['description'] = description;
		fm['difficulty'] = difficulty;
		fm['required_tasks'] = requiredTasks;
		fm['max_hp'] = maxHp;
		fm['max_armor'] = maxArmor;
		fm['current_hp'] = Math.min(existing.currentHp, maxHp);
		fm['current_armor'] = Math.min(existing.currentArmor, maxArmor);
	});

	const starterTasks = (input.tasks ?? []).map((t) => t.trim()).filter(Boolean);
	const labels = starterTasks.length
		? starterTasks
		: buildDefaultBossStrikeTasks(requiredTasks, name);
	const taskLines = labels.map((t) => `- [ ] ${t}`);

	const content = await app.vault.read(file);
	const { fm } = splitFrontmatter(content);
	const bodyParts = [
		`# ${emoji ? `${emoji} ` : ''}${name}`,
		'',
		description,
		'',
		'## Tasks',
		'',
		...taskLines,
		'',
	];
	const newContent = `---\n${stringifyYaml(fm)}---\n\n${bodyParts.join('\n')}`;
	await app.vault.modify(file, newContent);
	dispatchBossUpdated();
	return parseBossFile(file.path, newContent);
}

/**
 * Rename a boss vault note (and update metadata). Migrates active raid pointers.
 * Returns the boss at its new path.
 */
export async function renameBossFile(
	app: App,
	filePath: string,
	newName: string
): Promise<BossFileData> {
	const existing = await readBoss(app, filePath);
	if (!existing) {
		throw new Error(`Boss not found: ${filePath}`);
	}

	const baseName = (newName || existing.name).trim().replace(/[\\/:*?"<>|]/g, '');
	if (!baseName) {
		throw new Error('Boss name cannot be empty.');
	}

	const normalizedOld = normalizePath(filePath);
	let newPath = normalizePath(`${BOSS_FOLDER}/${baseName}.md`);

	if (newPath !== normalizedOld) {
		let suffix = 0;
		while (app.vault.getAbstractFileByPath(newPath)) {
			const existingAtPath = app.vault.getAbstractFileByPath(newPath);
			if (existingAtPath instanceof TFile && existingAtPath.path === normalizedOld) break;
			suffix += 1;
			newPath = normalizePath(`${BOSS_FOLDER}/${baseName} ${suffix}.md`);
		}
	}

	const file = app.vault.getAbstractFileByPath(normalizedOld);
	if (!(file instanceof TFile)) {
		throw new Error(`Boss file missing: ${filePath}`);
	}

	if (newPath !== normalizedOld) {
		await app.fileManager.renameFile(file, newPath);
	}

	const renamed = app.vault.getAbstractFileByPath(newPath);
	if (!(renamed instanceof TFile)) {
		throw new Error(`Rename failed for boss: ${filePath}`);
	}

	await app.fileManager.processFrontMatter(renamed, (fm) => {
		fm['name'] = baseName;
		fm['boss_id'] = slugify(baseName) || existing.bossId;
	});

	const content = await app.vault.read(renamed);
	const { fm, body } = splitFrontmatter(content);
	const emoji = String(fm['emoji'] ?? existing.emoji ?? '👹').trim();
	const description =
		String(fm['description'] ?? existing.description ?? '').trim() ||
		'A boss that only real work can fell.';
	const taskSection = body.match(/## Tasks[\s\S]*/)?.[0] ?? '## Tasks\n\n';
	const bodyParts = [
		`# ${emoji ? `${emoji} ` : ''}${baseName}`,
		'',
		description,
		'',
		taskSection.trimEnd(),
		'',
	];
	const newContent = `---\n${stringifyYaml(fm)}---\n\n${bodyParts.join('\n')}`;
	await app.vault.modify(renamed, newContent);
	dispatchBossUpdated();
	return parseBossFile(renamed.path, newContent);
}

function dispatchBossUpdated(): void {
	try {
		window?.dispatchEvent?.(new CustomEvent(BOSS_UPDATED_EVENT));
	} catch {
		/* non-browser runtime */
	}
}
