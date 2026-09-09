/**
 * Lightweight smoke test for Phase 4 notice level logic (no Obsidian runtime).
 * Run: node scripts/test-phase4-notices.mjs
 */

const QUIET_MAX_TIMEOUT = 4000;
const MINIMAL_MAX_TIMEOUT = 2500;
const DEDUPE_MS_QUIET = 3000;
const DEDUPE_MS_MINIMAL = 5000;
const NOTICE_PERSIST_TIMEOUT = 0;

function resolveTimeout(requested, level) {
	if (level === 'quiet') {
		const value = requested === undefined || requested === 0 ? QUIET_MAX_TIMEOUT : requested;
		return Math.min(value, QUIET_MAX_TIMEOUT);
	}
	if (level === 'minimal') {
		const value = requested === undefined || requested === 0 ? MINIMAL_MAX_TIMEOUT : requested;
		return Math.min(value, MINIMAL_MAX_TIMEOUT);
	}
	return NOTICE_PERSIST_TIMEOUT;
}

function shouldSuppress(level, priority, key, now, recent) {
	if (priority === 'critical') return false;
	if (level === 'minimal' && priority !== 'high') return true;
	if (level === 'quiet' && priority === 'low') return true;
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

assert('quiet suppresses low priority', shouldSuppress('quiet', 'low', 'shop', 1000, recent));
assert('quiet still shows quest complete (high)', !shouldSuppress('quiet', 'high', 'complete', 1000, recent));
assert('quiet still shows save errors (normal)', !shouldSuppress('quiet', 'normal', 'save-err', 1000, recent));
assert('quiet does not persist on 0', resolveTimeout(0, 'quiet') === 4000);
assert('minimal caps game notice', resolveTimeout(undefined, 'minimal') === 2500);
assert('normal persists until click', resolveTimeout(5000, 'normal') === NOTICE_PERSIST_TIMEOUT);
assert('normal persist ignores requested 0', resolveTimeout(0, 'normal') === NOTICE_PERSIST_TIMEOUT);
assert('minimal suppresses normal priority', shouldSuppress('minimal', 'normal', 'a', 1000, recent));
assert('minimal allows high priority', !shouldSuppress('minimal', 'high', 'b', 1000, recent));
assert('quiet dedupes repeat', shouldSuppress('quiet', 'normal', 'dup', 1000, recent) === false);
assert('quiet dedupes repeat second time', shouldSuppress('quiet', 'normal', 'dup', 1500, recent) === true);

console.log(`\n${passed} Phase 4 notice checks passed.`);
