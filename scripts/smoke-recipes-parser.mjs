/**
 * Smoke test: commented / fenced examples must not become ghost recipes.
 * Run: node scripts/smoke-recipes-parser.mjs
 */

function parseRecipesFromLines(lines) {
	const recipes = [];
	let inFence = false;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line.startsWith('```')) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		if (!line) continue;
		if (line.startsWith('//')) continue;
		if (line.startsWith('#') && !line.includes('#recipe')) continue;
		if (!line.includes('#recipe')) continue;

		const iconMatch = line.match(/^([\p{Emoji}\p{So}\p{Sk}\p{Sc}\p{Sm}])\s+/u);
		let rest = line;
		if (iconMatch) rest = line.slice(iconMatch[0].length);
		const name = rest
			.split(' #')[0]
			.trim()
			.replace(/^\/\/\s*/, '')
			.trim();
		if (!name) continue;
		recipes.push({ name });
		while (i + 1 < lines.length && lines[i + 1].trim().startsWith('//')) i++;
	}
	return recipes;
}

const oldHeader = `# Crafting Recipes

// Managed by Gamification — custom entries merge with built-in defaults by id.
// Example:
// 🧪 Moon Tea #recipe #consumable #easy
// // id: moon-tea
// // mat: herb:1
// // out: Moon Tea | consumable | uncommon | 🍵
`;

// Mirrors RECIPES_FILE_HEADER in recipesParser.ts (runtime string, not TS-escaped)
const newHeader = `# Crafting Recipes

Managed by Gamification — custom entries merge with built-in defaults by id.

Format (title line must include the recipe tag; meta lines use // key: value):

\`\`\`
🧪 Moon Tea #recipe #consumable #easy
// id: moon-tea
// mat: herb:2
// out: Moon Tea | consumable | uncommon | 🍵
// outEffect: energy:+20
// A calming tea brewed from moon herbs.
\`\`\`

Add your recipes below this line.
`;

const realRecipe = `
🍵 Real Tea #recipe #consumable #easy
// id: real-tea
// mat: herb:1
// out: Real Tea | consumable | common | 🍵
// outEffect: energy:+15
`;

const fromOld = parseRecipesFromLines((oldHeader + realRecipe).split('\n'));
const fromNew = parseRecipesFromLines((newHeader + realRecipe).split('\n'));

const assert = (cond, msg) => {
	if (!cond) {
		console.error('FAIL:', msg);
		process.exit(1);
	}
};

assert(fromOld.length === 1, `old header should yield 1 recipe, got ${fromOld.length}: ${JSON.stringify(fromOld)}`);
assert(fromOld[0].name === 'Real Tea', `expected Real Tea, got ${fromOld[0].name}`);
assert(!fromOld.some((r) => r.name.includes('Moon') || r.name.includes('//')), 'ghost Moon Tea from old header');

assert(fromNew.length === 1, `new header should yield 1 recipe, got ${fromNew.length}: ${JSON.stringify(fromNew)}`);
assert(fromNew[0].name === 'Real Tea', `expected Real Tea from new header, got ${fromNew[0].name}`);

console.log('OK: recipes parser smoke — no ghost Moon Tea; real recipes still parse');
