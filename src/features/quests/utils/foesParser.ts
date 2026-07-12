import type GamifiedObsidianPlugin from '../../../core/main';
import type { JourneyAffinityRule, JourneyFoeDefinition } from '../data/journeyFoeCatalog';

const FOE_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const FOE_LOOT_TIERS = ['common', 'uncommon', 'rare'] as const;

export const FOES_FILE_BASENAME = 'foes';

const FOES_FILE_HEADER = `# Journey Foes

// Managed by Gamification — custom entries merge with built-in defaults by id.
// affinity values: neutral | random | random-skill | random-class | skill:<Skill Name> | class:<Class Name>
// Example:
// 🏋️ Gym Demon #foe #hard
// // id: gym-demon
// // hp: 120
// // window: 7
// // loot: rare
// // affinity: skill:Body Builder
// // whisper: Only iron breaks this one.
// A demon that feeds on skipped workouts.
`;

function slugify(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function parseMetaLine(line: string): { key: string; value: string } | null {
	const m = line.match(/^\/\/\s*([a-zA-Z]+):\s*(.+)$/);
	if (!m) return null;
	return { key: m[1].toLowerCase(), value: m[2].trim() };
}

export function parseAffinityRule(value: string): JourneyAffinityRule {
	const v = value.trim();
	const lower = v.toLowerCase();
	if (lower === 'neutral') return { kind: 'neutral' };
	if (lower === 'random') return { kind: 'random' };
	if (lower === 'random-skill') return { kind: 'random-skill' };
	if (lower === 'random-class') return { kind: 'random-class' };
	const fixedMatch = v.match(/^(skill|class)\s*:\s*(.+)$/i);
	if (fixedMatch) {
		const target = fixedMatch[2].trim();
		if (target) {
			return fixedMatch[1].toLowerCase() === 'skill'
				? { kind: 'fixed-skill', skill: target }
				: { kind: 'fixed-class', className: target };
		}
	}
	return { kind: 'neutral' };
}

export function serializeAffinityRule(rule: JourneyAffinityRule): string {
	switch (rule.kind) {
		case 'neutral':
		case 'random':
		case 'random-skill':
		case 'random-class':
			return rule.kind;
		case 'fixed-skill':
			return `skill:${rule.skill}`;
		case 'fixed-class':
			return `class:${rule.className}`;
	}
}

function parseFoeHeaderLine(
	line: string
): { name: string; emoji?: string; difficulty: JourneyFoeDefinition['difficulty'] } | null {
	if (!line.includes('#foe')) return null;

	const iconMatch = line.match(/^([\p{Emoji}\p{So}\p{Sk}\p{Sc}\p{Sm}])\s+/u);
	let emoji: string | undefined;
	let rest = line;
	if (iconMatch) {
		emoji = iconMatch[1];
		rest = line.slice(iconMatch[0].length);
	}

	const name = rest.split(' #')[0].trim();
	if (!name) return null;

	const tagMatches = [...rest.matchAll(/#([\w-]+)/g)].map((m) => m[1].toLowerCase());
	const difficulty =
		(FOE_DIFFICULTIES.find((d) => tagMatches.includes(d)) as JourneyFoeDefinition['difficulty']) ??
		'medium';

	return { name, emoji, difficulty };
}

export function parseFoesFromLines(lines: string[]): JourneyFoeDefinition[] {
	const foes: JourneyFoeDefinition[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		if (line.startsWith('#') && !line.includes('#foe')) continue;

		const header = parseFoeHeaderLine(line);
		if (!header) continue;

		let id = slugify(header.name);
		let description = '';
		let maxHp = 100;
		let windowDays = 7;
		let lootTier: JourneyFoeDefinition['lootTier'] = 'common';
		let pathWhisper = '';
		let affinityRule: JourneyAffinityRule = { kind: 'neutral' };
		let emoji = header.emoji ?? '👾';
		let sprite = '';
		let foundDescription = false;

		while (i + 1 < lines.length && lines[i + 1].trim().startsWith('//')) {
			const nextLine = lines[i + 1].trim();
			const meta = parseMetaLine(nextLine);

			if (meta?.key === 'id') id = slugify(meta.value);
			else if (meta?.key === 'hp' || meta?.key === 'maxhp') {
				maxHp = Math.max(10, parseInt(meta.value, 10) || 100);
			} else if (meta?.key === 'window' || meta?.key === 'windowdays' || meta?.key === 'days') {
				windowDays = Math.max(1, parseInt(meta.value, 10) || 7);
			} else if (meta?.key === 'loot' || meta?.key === 'loottier') {
				const v = meta.value.toLowerCase();
				if (FOE_LOOT_TIERS.includes(v as (typeof FOE_LOOT_TIERS)[number])) {
					lootTier = v as JourneyFoeDefinition['lootTier'];
				}
			} else if (meta?.key === 'affinity') {
				affinityRule = parseAffinityRule(meta.value);
			} else if (meta?.key === 'whisper' || meta?.key === 'pathwhisper') {
				pathWhisper = meta.value;
			} else if (meta?.key === 'emoji' || meta?.key === 'icon') {
				emoji = meta.value;
			} else if (meta?.key === 'sprite' || meta?.key === 'image') {
				sprite = meta.value;
			} else if (!foundDescription) {
				description = nextLine.replace(/^\/\//, '').trim();
				foundDescription = true;
			}
			i++;
		}

		foes.push({
			id,
			name: header.name,
			description,
			emoji,
			maxHp,
			windowDays,
			difficulty: header.difficulty,
			lootTier,
			pathWhisper: pathWhisper || 'The road waits. Finish what you start.',
			affinityRule,
			...(sprite ? { sprite } : {}),
			isCustom: true,
		});
	}

	return foes;
}

export function findFoesFile(plugin: GamifiedObsidianPlugin) {
	return plugin.app.vault
		.getMarkdownFiles()
		.find((f) => f.basename.toLowerCase() === FOES_FILE_BASENAME);
}

export async function getVaultFoes(plugin: GamifiedObsidianPlugin): Promise<JourneyFoeDefinition[]> {
	const file = findFoesFile(plugin);
	if (!file) return [];

	const content = await plugin.app.vault.read(file);
	return parseFoesFromLines(content.split('\n'));
}

export async function ensureFoesFile(plugin: GamifiedObsidianPlugin): Promise<boolean> {
	if (findFoesFile(plugin)) return true;

	try {
		await plugin.app.vault.create('Foes.md', FOES_FILE_HEADER);
		return true;
	} catch (error) {
		console.error('[foesParser] Failed to create Foes.md', error);
		return false;
	}
}

export function serializeFoe(foe: JourneyFoeDefinition): string[] {
	const lines: string[] = [];
	let header = '';
	if (foe.emoji) header += `${foe.emoji} `;
	header += `${foe.name} #foe #${foe.difficulty}`;
	lines.push(header);
	lines.push(`// id: ${foe.id}`);
	lines.push(`// hp: ${foe.maxHp}`);
	lines.push(`// window: ${foe.windowDays}`);
	lines.push(`// loot: ${foe.lootTier}`);
	lines.push(`// affinity: ${serializeAffinityRule(foe.affinityRule)}`);
	if (foe.sprite) lines.push(`// sprite: ${foe.sprite}`);
	if (foe.pathWhisper) lines.push(`// whisper: ${foe.pathWhisper}`);
	if (foe.description) lines.push(`// ${foe.description}`);
	return lines;
}

export async function writeVaultFoes(
	plugin: GamifiedObsidianPlugin,
	foes: JourneyFoeDefinition[]
): Promise<void> {
	await ensureFoesFile(plugin);
	const file = findFoesFile(plugin);
	if (!file) return;

	const body = [
		'# Journey Foes',
		'',
		'// Managed by Gamification — custom entries merge with built-in defaults by id.',
		'// affinity values: neutral | random | random-skill | random-class | skill:<Skill Name> | class:<Class Name>',
		'',
		...foes.flatMap((f, idx) => (idx === 0 ? serializeFoe(f) : ['', ...serializeFoe(f)])),
	].join('\n');

	await plugin.app.vault.modify(file, body);
}

export async function upsertVaultFoe(
	plugin: GamifiedObsidianPlugin,
	foe: JourneyFoeDefinition
): Promise<void> {
	const existing = await getVaultFoes(plugin);
	const idx = existing.findIndex((f) => f.id === foe.id);
	if (idx >= 0) existing[idx] = foe;
	else existing.push(foe);
	await writeVaultFoes(plugin, existing);
}
