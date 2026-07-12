/**
 * Lightweight smoke test for Phase 4 notice level logic (no Obsidian runtime).
 * Run: node scripts/test-phase4-notices.mjs
 */

const QUIET_MAX_TIMEOUT = 4000;
const MINIMAL_MAX_TIMEOUT = 2500;
const DEDUPE_MS_QUIET = 3000;
const DEDUPE_MS_MINIMAL = 5000;
const GAME_NOTICE_MIN_TIMEOUT = 60 * 60 * 1000;

function resolveTimeout(requested, level, isGameNotice) {
	if (level === 'quiet') {
		const cap = QUIET_MAX_TIMEOUT;
		return requested === undefined ? cap : Math.min(requested, cap);
	}
	if (level === 'minimal') {
		const cap = MINIMAL_MAX_TIMEOUT;
		return requested === undefined ? cap : Math.min(requested, cap);
	}
	if (requested !== undefined) {
		return isGameNotice ? Math.max(requested, GAME_NOTICE_MIN_TIMEOUT) : requested;
	}
	return isGameNotice ? GAME_NOTICE_MIN_TIMEOUT : undefined;
}

function shouldSuppress(level, priority, key, now, recent) {
	if (priority === 'critical') return false;
	if (level === 'minimal' && priority !== 'high') return true;
	if (level === 'normal') return false;
	const dedupeMs = level === 'minimal' ? DEDUPE_MS_MINIMAL : DEDUPE_MS_QUIET;
	const lastShown = recent.get(key);
	if (lastShown !== undefined && now - lastShown < dedupeMs) return true;
	recent.set(key, now);
	return false;
}

const recent = new Map();
let passed = 0;

function assert(name, condition) {
	if (!condition) {
		console.error(`FAIL: ${name}`);
		process.exit(1);
	}
	console.log(`ok: ${name}`);
	passed++;
}

assert('quiet caps long game notice', resolveTimeout(60000, 'quiet', true) === 4000);
assert('minimal caps game notice', resolveTimeout(undefined, 'minimal', true) === 2500);
assert('normal keeps long game notice', resolveTimeout(5000, 'normal', true) === GAME_NOTICE_MIN_TIMEOUT);
assert('minimal suppresses normal priority', shouldSuppress('minimal', 'normal', 'a', 1000, recent));
assert('minimal allows high priority', !shouldSuppress('minimal', 'high', 'b', 1000, recent));
assert('quiet dedupes repeat', shouldSuppress('quiet', 'normal', 'dup', 1000, recent) === false);
assert('quiet dedupes repeat second time', shouldSuppress('quiet', 'normal', 'dup', 1500, recent) === true);

console.log(`\n${passed} Phase 4 notice checks passed.`);
