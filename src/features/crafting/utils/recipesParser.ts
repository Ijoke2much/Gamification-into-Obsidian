import type GamifiedObsidianPlugin from '../../../core/main';
import type { CraftingRecipe } from '../types/CraftingTypes';

const RECIPE_CATEGORIES = [
	'weapon',
	'armor',
	'tool',
	'consumable',
	'decoration',
	'mystical',
	'artifact',
] as const;
const RECIPE_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const;
const RECIPE_STATIONS = ['forge', 'alchemy_lab', 'workbench', 'enchanting_table'] as const;
const MATERIAL_QUALITIES = ['fresh', 'normal', 'dried', 'refined', 'masterwork'] as const;
const OUTPUT_QUALITIES = ['basic', 'fine', 'superior', 'masterwork', 'legendary'] as const;

export const RECIPES_FILE_BASENAME = 'recipes';

const RECIPES_FILE_HEADER = `# Crafting Recipes

// Managed by Gamification — custom entries merge with built-in defaults by id.
// Example:
// 🧪 Moon Tea #recipe #consumable #easy
// // id: moon-tea
// // time: 30
// // skill: 1
// // station: workbench
// // mat: moonleaf:2
// // mat: herb:1
// // out: Moon Tea | consumable | uncommon | 🍵
// // outEffect: Restore 20 Energy
// A calming tea brewed from moon herbs.
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

function parseRecipeHeaderLine(line: string): Partial<CraftingRecipe> | null {
	if (!line.includes('#recipe')) return null;

	const iconMatch = line.match(/^([\p{Emoji}\p{So}\p{Sk}\p{Sc}\p{Sm}])\s+/u);
	let icon: string | undefined;
	let rest = line;
	if (iconMatch) {
		icon = iconMatch[1];
		rest = line.slice(iconMatch[0].length);
	}

	const name = rest.split(' #')[0].trim();
	if (!name) return null;

	const tagMatches = [...rest.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase());
	const difficulty =
		(RECIPE_DIFFICULTIES.find((d) => tagMatches.includes(d)) as CraftingRecipe['difficulty']) ??
		'easy';
	const categoryTag = tagMatches.find(
		(t) =>
			t !== 'recipe' &&
			!RECIPE_DIFFICULTIES.includes(t as (typeof RECIPE_DIFFICULTIES)[number])
	);
	const category = (categoryTag ?? 'consumable') as CraftingRecipe['category'];

	return {
		name,
		icon: icon ?? '📜',
		difficulty,
		category,
	};
}

function parseMaterialSpec(value: string): CraftingRecipe['materials'][number] | null {
	const parts = value.split(':').map((p) => p.trim());
	if (parts.length < 2) return null;

	const materialId = parts[0];
	const quantity = parseInt(parts[1], 10);
	if (!materialId || Number.isNaN(quantity)) return null;

	let qualityRequired: CraftingRecipe['materials'][number]['qualityRequired'];
	let required = true;

	for (let i = 2; i < parts.length; i++) {
		const token = parts[i].toLowerCase();
		if (token === 'optional') required = false;
		else if (MATERIAL_QUALITIES.includes(token as (typeof MATERIAL_QUALITIES)[number])) {
			qualityRequired = token as (typeof MATERIAL_QUALITIES)[number];
		}
	}

	return {
		materialId,
		quantity,
		required,
		...(qualityRequired ? { qualityRequired } : {}),
	};
}

function parseOutputSpec(value: string): NonNullable<CraftingRecipe['guaranteedItem']> | null {
	const segments = value.split('|').map((s) => s.trim());
	if (segments.length < 3) return null;

	const [outName, outCategory, outRarity, outIcon] = segments;
	if (!outName || !outCategory || !outRarity) return null;

	return {
		name: outName,
		category: outCategory,
		rarity: outRarity,
		icon: outIcon || '🎁',
		effects: [],
		description: '',
		quality: 'basic',
	};
}

export function parseRecipesFromLines(lines: string[]): CraftingRecipe[] {
	const recipes: CraftingRecipe[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		if (line.startsWith('#') && !line.includes('#recipe')) continue;

		const header = parseRecipeHeaderLine(line);
		if (!header?.name) continue;

		let id = slugify(header.name);
		let description = header.description ?? '';
		let craftingTime = 30;
		let skillRequired = 1;
		let craftingStation: CraftingRecipe['craftingStation'];
		let xpReward = 10;
		let boogersReward = 5;
		let skillXp = 5;
		const materials: CraftingRecipe['materials'] = [];
		let guaranteedItem: CraftingRecipe['guaranteedItem'];
		const outputEffects: string[] = [];
		let foundDescription = false;

		while (i + 1 < lines.length && lines[i + 1].trim().startsWith('//')) {
			const nextLine = lines[i + 1].trim();
			const meta = parseMetaLine(nextLine);

			if (meta?.key === 'id') id = slugify(meta.value);
			else if (meta?.key === 'time' || meta?.key === 'craftingtime') {
				craftingTime = parseInt(meta.value, 10) || 30;
			} else if (meta?.key === 'skill' || meta?.key === 'skillrequired') {
				skillRequired = parseInt(meta.value, 10) || 1;
			} else if (meta?.key === 'station' || meta?.key === 'craftingstation') {
				if (RECIPE_STATIONS.includes(meta.value as (typeof RECIPE_STATIONS)[number])) {
					craftingStation = meta.value as CraftingRecipe['craftingStation'];
				}
			} else if (meta?.key === 'xp' || meta?.key === 'xpreward') {
				xpReward = parseInt(meta.value, 10) || 10;
			} else if (meta?.key === 'coins' || meta?.key === 'boogers' || meta?.key === 'boogersreward') {
				boogersReward = parseInt(meta.value, 10) || 5;
			} else if (meta?.key === 'skillxp') {
				skillXp = parseInt(meta.value, 10) || 5;
			} else if (meta?.key === 'mat' || meta?.key === 'material') {
				const spec = parseMaterialSpec(meta.value);
				if (spec) materials.push(spec);
			} else if (meta?.key === 'out' || meta?.key === 'output') {
				guaranteedItem = parseOutputSpec(meta.value) ?? guaranteedItem;
			} else if (meta?.key === 'outdesc' || meta?.key === 'outputdesc') {
				if (guaranteedItem) guaranteedItem.description = meta.value;
			} else if (meta?.key === 'outquality' || meta?.key === 'outputquality') {
				if (
					guaranteedItem &&
					OUTPUT_QUALITIES.includes(meta.value as (typeof OUTPUT_QUALITIES)[number])
				) {
					guaranteedItem.quality = meta.value as NonNullable<
						CraftingRecipe['guaranteedItem']
					>['quality'];
				}
			} else if (meta?.key === 'outeffect' || meta?.key === 'outputeffect') {
				outputEffects.push(meta.value);
			} else if (meta?.key === 'icon') {
				header.icon = meta.value;
			} else if (!foundDescription) {
				description = nextLine.replace(/^\/\//, '').trim();
				foundDescription = true;
			}
			i++;
		}

		if (guaranteedItem && outputEffects.length > 0) {
			guaranteedItem.effects = outputEffects;
		}

		recipes.push({
			id,
			name: header.name,
			description,
			icon: header.icon ?? '📜',
			category: header.category ?? 'consumable',
			materials,
			craftingTime,
			difficulty: header.difficulty ?? 'easy',
			skillRequired,
			craftingStation,
			guaranteedItem,
			xpReward,
			boogersReward,
			skillXp,
		});
	}

	return recipes;
}

export function findRecipesFile(plugin: GamifiedObsidianPlugin) {
	return plugin.app.vault
		.getMarkdownFiles()
		.find((f) => f.basename.toLowerCase() === RECIPES_FILE_BASENAME);
}

export async function getVaultRecipes(plugin: GamifiedObsidianPlugin): Promise<CraftingRecipe[]> {
	const file = findRecipesFile(plugin);
	if (!file) return [];

	const content = await plugin.app.vault.read(file);
	return parseRecipesFromLines(content.split('\n'));
}

export async function ensureRecipesFile(plugin: GamifiedObsidianPlugin): Promise<boolean> {
	if (findRecipesFile(plugin)) return true;

	try {
		await plugin.app.vault.create('Recipes.md', RECIPES_FILE_HEADER);
		return true;
	} catch (error) {
		console.error('[recipesParser] Failed to create Recipes.md', error);
		return false;
	}
}

export function serializeRecipe(recipe: CraftingRecipe): string[] {
	const lines: string[] = [];
	let header = '';
	if (recipe.icon) header += `${recipe.icon} `;
	header += `${recipe.name} #recipe #${recipe.category} #${recipe.difficulty}`;
	lines.push(header);
	lines.push(`// id: ${recipe.id}`);
	lines.push(`// time: ${recipe.craftingTime}`);
	lines.push(`// skill: ${recipe.skillRequired}`);
	if (recipe.craftingStation) lines.push(`// station: ${recipe.craftingStation}`);
	if (recipe.xpReward !== 10) lines.push(`// xp: ${recipe.xpReward}`);
	if (recipe.boogersReward !== 5) lines.push(`// coins: ${recipe.boogersReward}`);
	if (recipe.skillXp !== 5) lines.push(`// skillXp: ${recipe.skillXp}`);

	for (const mat of recipe.materials) {
		let spec = `${mat.materialId}:${mat.quantity}`;
		if (mat.qualityRequired) spec += `:${mat.qualityRequired}`;
		if (!mat.required) spec += ':optional';
		lines.push(`// mat: ${spec}`);
	}

	if (recipe.guaranteedItem) {
		const g = recipe.guaranteedItem;
		lines.push(`// out: ${g.name} | ${g.category} | ${g.rarity} | ${g.icon}`);
		if (g.quality && g.quality !== 'basic') lines.push(`// outQuality: ${g.quality}`);
		if (g.description) lines.push(`// outDesc: ${g.description}`);
		for (const effect of g.effects) lines.push(`// outEffect: ${effect}`);
	}

	if (recipe.description) lines.push(`// ${recipe.description}`);
	return lines;
}

export async function writeVaultRecipes(
	plugin: GamifiedObsidianPlugin,
	recipes: CraftingRecipe[]
): Promise<void> {
	await ensureRecipesFile(plugin);
	const file = findRecipesFile(plugin);
	if (!file) return;

	const body = [
		'# Crafting Recipes',
		'',
		'// Managed by Gamification — custom entries merge with built-in defaults by id.',
		'',
		...recipes.flatMap((r, idx) => (idx === 0 ? serializeRecipe(r) : ['', ...serializeRecipe(r)])),
	].join('\n');

	await plugin.app.vault.modify(file, body);
}

export async function upsertVaultRecipe(
	plugin: GamifiedObsidianPlugin,
	recipe: CraftingRecipe
): Promise<void> {
	const existing = await getVaultRecipes(plugin);
	const idx = existing.findIndex((r) => r.id === recipe.id);
	if (idx >= 0) existing[idx] = recipe;
	else existing.push(recipe);
	await writeVaultRecipes(plugin, existing);
}

export function formatRecipeMaterials(recipe: CraftingRecipe): string {
	if (!recipe.materials.length) return '—';
	return recipe.materials
		.map((m) => `${m.materialId}×${m.quantity}${m.required ? '' : '?'}`)
		.join(', ');
}

export function formatRecipeOutput(recipe: CraftingRecipe): string {
	if (recipe.guaranteedItem) {
		return `${recipe.guaranteedItem.icon ?? ''} ${recipe.guaranteedItem.name}`.trim();
	}
	if (recipe.possibleResults?.length) return 'Random result';
	return '—';
}

export { notifyCraftingDataUpdated } from './materialsParser';
