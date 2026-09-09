/**
 * Smoke test: property keys win over missing line rewards.
 * Run: node scripts/test-property-rewards.mjs
 */

function asNumber(value) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const n = parseInt(value, 10);
		if (!Number.isNaN(n)) return n;
	}
	return undefined;
}

function lookupRaw(raw, keys) {
	for (const key of keys) {
		if (raw[key] !== undefined) return raw[key];
	}
	const lower = new Map(Object.keys(raw).map((key) => [key.toLowerCase(), raw[key]]));
	for (const key of keys) {
		const value = lower.get(key.toLowerCase());
		if (value !== undefined) return value;
	}
	return undefined;
}

function pickRewardNumber(source, keys) {
	if (!source) return undefined;
	return asNumber(lookupRaw(source, keys));
}

const XP_KEYS = ['xp', 'XP', 'exp', 'experience'];
const CP_KEYS = ['cp', 'CP', 'classPoints', 'class-points', 'class_points'];

function applyLine(quest, line) {
	const xpMatch = line.match(/✨\uFE0F?(\d+)/u);
	const cpMatch = line.match(/⭐\uFE0F?(\d+)/u) || line.match(/🧠(\d+)/);
	if (xpMatch) quest.xp = parseInt(xpMatch[1], 10);
	if (cpMatch) quest.cp = parseInt(cpMatch[1], 10);
}

function hydrate(quest, line, fm) {
	const next = { ...quest };
	applyLine(next, line);
	const xp = pickRewardNumber(fm, XP_KEYS);
	const cp = pickRewardNumber(fm, CP_KEYS);
	if (xp !== undefined) next.xp = xp;
	if (cp !== undefined) next.cp = cp;
	return next;
}

function shouldApply(content) {
	const count = content.match(/#gamified-task/g)?.length ?? 0;
	if (count > 1) return false;
	return content.startsWith('---');
}

let passed = 0;
function assert(name, condition) {
	if (!condition) {
		console.error(`FAIL: ${name}`);
		process.exit(1);
	}
	console.log(`ok: ${name}`);
	passed++;
}

const fromLine = hydrate({ xp: 0, cp: 0 }, '⭐50 ✨200', {});
assert('line fills when properties missing', fromLine.xp === 200 && fromLine.cp === 50);

const fromProps = hydrate({ xp: 0, cp: 0 }, '⭐50 ✨200', { xp: 900, cp: 12 });
assert('properties override line', fromProps.xp === 900 && fromProps.cp === 12);

const alias = hydrate({ xp: 0, cp: 0 }, '', { XP: '80', 'class-points': '7' });
assert('property aliases', alias.xp === 80 && alias.cp === 7);

const vs = hydrate({ xp: 0, cp: 0 }, '⭐\uFE0F40 ✨\uFE0F10', {});
assert('emoji variation selector on line', vs.xp === 10 && vs.cp === 40);

assert(
	'skip list files with many tasks',
	shouldApply('---\nxp: 1\n---\n- [ ] a #gamified-task\n- [ ] b #gamified-task') === false
);
assert(
	'apply single-task notes',
	shouldApply('---\nxp: 1\n---\n- [ ] a #gamified-task') === true
);

console.log(`\n${passed} property-reward checks passed.`);
