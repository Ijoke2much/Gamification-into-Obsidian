import type GamifiedObsidianPlugin from '../../../core/main';
import type { CraftingMaterial } from '../types/CraftingTypes';
import {
	clearVaultMarkdownFileCache,
	resolveVaultMarkdownFile,
} from '../../../shared/utils/resolveVaultMarkdownFile';

const MATERIAL_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const MATERIAL_CATEGORIES = ['herb', 'mineral', 'essence', 'crystal', 'organic', 'mystical', 'component'] as const;
const MATERIAL_QUALITIES = ['fresh', 'normal', 'dried', 'refined', 'masterwork'] as const;
const MATERIAL_SOURCES = ['gathering', 'crafting', 'trading', 'reward', 'quest'] as const;

const QUALITY_MULTIPLIERS: Record<string, number> = {
	fresh: 1.5,
	normal: 1.0,
	dried: 0.8,
	refined: 1.3,
	masterwork: 2.0,
};

export const MATERIALS_FILE_BASENAME = 'materials';

const MATERIALS_FILE_HEADER = `# Crafting Materials

Managed by Gamification — custom entries merge with built-in defaults by id.

Format (title line must include the material tag; meta lines use // key: value):

\`\`\`
🌙 Moonleaf #material #herb #uncommon
// id: moonleaf
// baseValue: 8
// Gathers only under moonlight.
\`\`\`

Add your materials below this line.
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

function parseMaterialHeaderLine(line: string): Partial<CraftingMaterial> & { tags: string[] } | null {
	if (!line.includes('#material')) return null;
	if (line.startsWith('//')) return null;

	const iconMatch = line.match(/^([\p{Emoji}\p{So}\p{Sk}\p{Sc}\p{Sm}])\s+/u);
	let icon: string | undefined;
	let rest = line;
	if (iconMatch) {
		icon = iconMatch[1];
		rest = line.slice(iconMatch[0].length);
	}
	// Corrupted / pasted example lines like "📦 // 🌙 Moonleaf #material"
	if (rest.trimStart().startsWith('//')) return null;

	const name = rest
		.split(' #')[0]
		.trim()
		.replace(/^\/\/\s*/, '')
		.trim();
	if (!name || name.startsWith('//')) return null;

	const tagMatches = [...rest.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase());
	const rarity =
		(MATERIAL_RARITIES.find((r) => tagMatches.includes(r)) as CraftingMaterial['rarity']) ?? 'common';
	const categoryTag = tagMatches.find(
		(t) => t !== 'material' && !MATERIAL_RARITIES.includes(t as typeof MATERIAL_RARITIES[number])
	);
	const category = (categoryTag ?? 'organic') as CraftingMaterial['category'];

	return {
		name,
		icon: icon ?? '📦',
		rarity,
		category,
		tags: tagMatches,
	};
}

export function parseMaterialsFromLines(lines: string[]): CraftingMaterial[] {
	const materials: CraftingMaterial[] = [];

	let inFence = false;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line.startsWith('```')) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		if (!line) continue;
		// Comment lines are never material titles (avoids header examples becoming ghosts)
		if (line.startsWith('//')) continue;
		if (line.startsWith('#') && !line.includes('#material')) continue;

		const header = parseMaterialHeaderLine(line);
		if (!header?.name) continue;

		let id = slugify(header.name);
		let description = '';
		let baseValue = 1;
		let quality: CraftingMaterial['quality'] = 'normal';
		let qualityMultiplier = 1.0;
		let source: CraftingMaterial['source'] = 'gathering';
		let location: string | undefined;
		let foundDescription = false;

		while (i + 1 < lines.length && lines[i + 1].trim().startsWith('//')) {
			const nextLine = lines[i + 1].trim();
			const meta = parseMetaLine(nextLine);

			if (meta?.key === 'id') id = slugify(meta.value);
			else if (meta?.key === 'basevalue') baseValue = parseInt(meta.value, 10) || 1;
			else if (meta?.key === 'quality' && MATERIAL_QUALITIES.includes(meta.value as typeof MATERIAL_QUALITIES[number])) {
				quality = meta.value as CraftingMaterial['quality'];
				qualityMultiplier = QUALITY_MULTIPLIERS[quality] ?? 1.0;
			} else if (meta?.key === 'qualitymultiplier') {
				qualityMultiplier = parseFloat(meta.value) || 1.0;
			} else if (meta?.key === 'source' && MATERIAL_SOURCES.includes(meta.value as typeof MATERIAL_SOURCES[number])) {
				source = meta.value as CraftingMaterial['source'];
			} else if (meta?.key === 'location') location = meta.value;
			else if (meta?.key === 'icon') header.icon = meta.value;
			else if (!foundDescription) {
				description = nextLine.replace(/^\/\//, '').trim();
				foundDescription = true;
			}
			i++;
		}

		materials.push({
			id,
			name: header.name,
			icon: header.icon ?? '📦',
			rarity: header.rarity ?? 'common',
			category: header.category ?? 'organic',
			description,
			baseValue,
			quality,
			qualityMultiplier,
			source,
			location,
		});
	}

	return materials;
}

export function findMaterialsFile(plugin: GamifiedObsidianPlugin) {
	return resolveVaultMarkdownFile(plugin.app, MATERIALS_FILE_BASENAME, [
		'Materials.md',
		'materials.md',
		'Gamification/Materials.md',
		'Gamified/Materials.md',
	]);
}

export async function getVaultMaterials(plugin: GamifiedObsidianPlugin): Promise<CraftingMaterial[]> {
	const file = findMaterialsFile(plugin);
	if (!file) return [];

	const content = await plugin.app.vault.read(file);
	const lines = content.split('\n');
	return parseMaterialsFromLines(lines);
}

export async function ensureMaterialsFile(plugin: GamifiedObsidianPlugin): Promise<boolean> {
	const existing = findMaterialsFile(plugin);
	if (existing) return true;

	try {
		clearVaultMarkdownFileCache(MATERIALS_FILE_BASENAME);
		await plugin.app.vault.create('Materials.md', MATERIALS_FILE_HEADER);
		clearVaultMarkdownFileCache(MATERIALS_FILE_BASENAME);
		return true;
	} catch (error) {
		console.error('[materialsParser] Failed to create Materials.md', error);
		return false;
	}
}

export function serializeMaterial(material: CraftingMaterial): string[] {
	const lines: string[] = [];
	let header = '';
	if (material.icon) header += `${material.icon} `;
	header += `${material.name} #material #${material.category} #${material.rarity}`;
	lines.push(header);
	lines.push(`// id: ${material.id}`);
	if (material.baseValue !== 1) lines.push(`// baseValue: ${material.baseValue}`);
	if (material.quality !== 'normal') lines.push(`// quality: ${material.quality}`);
	if (material.qualityMultiplier !== (QUALITY_MULTIPLIERS[material.quality] ?? 1.0)) {
		lines.push(`// qualityMultiplier: ${material.qualityMultiplier}`);
	}
	if (material.source !== 'gathering') lines.push(`// source: ${material.source}`);
	if (material.location) lines.push(`// location: ${material.location}`);
	if (material.description) lines.push(`// ${material.description}`);
	return lines;
}

export async function writeVaultMaterials(
	plugin: GamifiedObsidianPlugin,
	materials: CraftingMaterial[]
): Promise<void> {
	await ensureMaterialsFile(plugin);
	const file = findMaterialsFile(plugin);
	if (!file) return;

	const body = [
		'# Crafting Materials',
		'',
		'// Managed by Gamification — custom entries merge with built-in defaults by id.',
		'',
		...materials.flatMap((m, idx) => (idx === 0 ? serializeMaterial(m) : ['', ...serializeMaterial(m)])),
	].join('\n');

	await plugin.app.vault.modify(file, body);
}

export async function upsertVaultMaterial(
	plugin: GamifiedObsidianPlugin,
	material: CraftingMaterial
): Promise<void> {
	const existing = await getVaultMaterials(plugin);
	const idx = existing.findIndex((m) => m.id === material.id);
	if (idx >= 0) existing[idx] = material;
	else existing.push(material);
	await writeVaultMaterials(plugin, existing);
}

export function notifyCraftingDataUpdated(): void {
	document.dispatchEvent(new CustomEvent('crafting-data-updated'));
}
