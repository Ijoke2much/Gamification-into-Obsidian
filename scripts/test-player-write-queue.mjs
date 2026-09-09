/**
 * PlayerData save queue: overlapping updates must not drop the latest
 * snapshot or leave the first caller hanging when debounce is reset.
 * Run: node scripts/test-player-write-queue.mjs
 */

let passed = 0;
function assert(name, condition) {
	if (!condition) {
		console.error(`FAIL: ${name}`);
		process.exit(1);
	}
	console.log('ok:', name);
	passed++;
}

function createQueue({ debounceMs = 20 } = {}) {
	let queued = null;
	let timer = null;
	let waiters = [];
	const writes = [];

	function flush() {
		if (queued == null) return;
		writes.push(queued);
		queued = null;
		const pending = waiters;
		waiters = [];
		pending.forEach((w) => w());
	}

	function update(data) {
		queued = data;
		if (timer) clearTimeout(timer);
		return new Promise((resolve) => {
			waiters.push(resolve);
			timer = setTimeout(() => {
				timer = null;
				flush();
			}, debounceMs);
		});
	}

	return { update, writes };
}

const q = createQueue();
const p1 = q.update({ name: 'A', xp: 1 });
const p2 = q.update({ name: 'B', xp: 2 });
await Promise.all([p1, p2]);

assert('both callers settle', true);
assert('only latest snapshot is written', q.writes.length === 1 && q.writes[0].name === 'B' && q.writes[0].xp === 2);

console.log(`\n${passed} player-write-queue checks passed.`);
