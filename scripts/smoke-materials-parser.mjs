/**
 * Smoke test: commented / fenced examples must not become ghost materials.
 * Run: node scripts/smoke-materials-parser.mjs
 */

function parseMaterialsFromLines(lines) {
	const materials = [];
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
		if (line.startsWith('#') && !line.includes('#material')) continue;
		if (!line.includes('#material')) continue;

		const iconMatch = line.match(/^([\p{Emoji}\p{So}\p{Sk}\p{Sc}\p{Sm}])\s+/u);
		let rest = line;
		if (iconMatch) rest = line.slice(iconMatch[0].length);
		if (rest.trimStart().startsWith('//')) continue;
		const name = rest
			.split(' #')[0]
			.trim()
			.replace(/^\/\/\s*/, '')
			.trim();
		if (!name || name.startsWith('//')) continue;
		materials.push({ name });
		while (i + 1 < lines.length && lines[i + 1].trim().startsWith('//')) i++;
	}
	return materials;
}

const oldHeader = `# Crafting Materials

// Managed by Gamification — custom entries merge with built-in defaults by id.
// Example:
// 🌙 Moonleaf #material #herb #uncommon
// // id: moonleaf
// // baseValue: 8
// // quality: fresh
// // source: quest
// Gathers only under moonlight.
`;

const newHeader = `# Crafting Materials

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

const realMaterial = `
🌿 Real Herb #material #herb #common
// id: real-herb
// baseValue: 3
`;

const corrupted = `
📦 // 🌙 Moonleaf #material #herb #uncommon
// id: moonleaf
`;

const fromOld = parseMaterialsFromLines((oldHeader + realMaterial).split('\n'));
const fromNew = parseMaterialsFromLines((newHeader + realMaterial).split('\n'));
const fromCorrupt = parseMaterialsFromLines((corrupted + realMaterial).split('\n'));

const assert = (cond, msg) => {
	if (!cond) {
		console.error('FAIL:', msg);
		process.exit(1);
	}
};

assert(fromOld.length === 1, `old header: expected 1 material, got ${fromOld.length}: ${JSON.stringify(fromOld)}`);
assert(fromOld[0].name === 'Real Herb', `old header: expected Real Herb, got ${fromOld[0].name}`);
assert(fromNew.length === 1, `new header: expected 1 material, got ${fromNew.length}: ${JSON.stringify(fromNew)}`);
assert(fromNew[0].name === 'Real Herb', `new header: expected Real Herb, got ${fromNew[0].name}`);
assert(!fromOld.some((m) => m.name.includes('Moonleaf') || m.name.includes('//')), 'old: no Moonleaf ghost');
assert(!fromNew.some((m) => m.name.includes('Moonleaf') || m.name.includes('//')), 'new: no Moonleaf ghost');
assert(fromCorrupt.length === 1 && fromCorrupt[0].name === 'Real Herb', 'corrupted emoji+// line skipped');

console.log('OK: materials parser ignores // and fenced examples');
