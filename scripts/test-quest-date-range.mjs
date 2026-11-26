/**
 * Multi-day quest occupancy + schedule emoji helpers.
 * Keep in sync with src/features/quests/utils/questDateRange.ts
 * Run: node scripts/test-quest-date-range.mjs
 */

function datePart(iso) {
	if (!iso) return undefined;
	const p = iso.trim().split('T')[0];
	return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : undefined;
}

function addLocalDays(iso, days) {
	const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
	const next = new Date(y, (m || 1) - 1, d || 1);
	next.setDate(next.getDate() + days);
	const yy = next.getFullYear();
	const mm = `${next.getMonth() + 1}`.padStart(2, '0');
	const dd = `${next.getDate()}`.padStart(2, '0');
	return `${yy}-${mm}-${dd}`;
}

function questRangeParts(quest) {
	const due = datePart(quest.due);
	const start = datePart(quest.start);
	if (!due && !start) return {};
	if (!due) return { start, due: start };
	if (!start) return { start: due, due };
	if (start <= due) return { start, due };
	return { start: due, due: start };
}

function isQuestOnDate(quest, iso, todayISO) {
	const { start, due } = questRangeParts(quest);
	if (start && due) return iso >= start && iso <= due;
	if (quest.today && todayISO && iso === todayISO) return true;
	return false;
}

function eachIsoDayInclusive(start, due) {
	const { start: a, due: b } = questRangeParts({ start, due });
	if (!a || !b) return [];
	const out = [];
	let cursor = a;
	while (cursor <= b && out.length < 366) {
		out.push(cursor);
		cursor = addLocalDays(cursor, 1);
	}
	return out;
}

function shiftQuestRange(quest, days) {
	const { start, due } = questRangeParts(quest);
	if (!due) return {};
	const time = quest.due?.includes('T') ? quest.due.split('T')[1] : undefined;
	const newDueDay = addLocalDays(due, days);
	const newStart = start ? addLocalDays(start, days) : undefined;
	return {
		start: newStart && newStart !== newDueDay ? newStart : undefined,
		due: time ? `${newDueDay}T${time}` : newDueDay,
	};
}

function injectScheduleEmojis(line, dueISO, startDay) {
	const dueDay = dueISO.split('T')[0];
	const startPart = startDay && startDay !== dueDay ? `🛫${startDay} ` : '';
	const insert = `${startPart}📅${dueISO} `;
	const gamifiedIdx = line.indexOf('#gamified-task');
	if (gamifiedIdx !== -1) {
		return `${line.slice(0, gamifiedIdx)}${insert}${line.slice(gamifiedIdx)}`;
	}
	return `${line} ${insert}`.replace(/\s{2,}/g, ' ').trim();
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

const rangeQuest = { start: '2026-09-07', due: '2026-09-09' };
assert('mon in range', isQuestOnDate(rangeQuest, '2026-09-07') === true);
assert('tue in range', isQuestOnDate(rangeQuest, '2026-09-08') === true);
assert('wed in range', isQuestOnDate(rangeQuest, '2026-09-09') === true);
assert('thu out of range', isQuestOnDate(rangeQuest, '2026-09-10') === false);
assert('span days', eachIsoDayInclusive('2026-09-07', '2026-09-09').join(',') === '2026-09-07,2026-09-08,2026-09-09');

const single = { due: '2026-09-09T14:00' };
assert('timed due day only', isQuestOnDate(single, '2026-09-09') === true);
assert('timed not previous day', isQuestOnDate(single, '2026-09-08') === false);

const todayPin = { today: true };
assert('today pin', isQuestOnDate(todayPin, '2026-09-09', '2026-09-09') === true);
assert('today pin other day', isQuestOnDate(todayPin, '2026-09-08', '2026-09-09') === false);

const shifted = shiftQuestRange({ start: '2026-09-07', due: '2026-09-09T10:00' }, 2);
assert('shift due', shifted.due === '2026-09-11T10:00');
assert('shift start', shifted.start === '2026-09-09');

const sameDayShift = shiftQuestRange({ due: '2026-09-09' }, 1);
assert('single-day shift omits start', shifted.start !== undefined && sameDayShift.start === undefined);
assert('single-day new due', sameDayShift.due === '2026-09-10');

const line = injectScheduleEmojis('- [ ] Pack #gamified-task', '2026-09-09T10:00', '2026-09-07');
assert('writes start emoji', line.includes('🛫2026-09-07'));
assert('writes due emoji', line.includes('📅2026-09-09T10:00'));
assert('same-day omits start emoji', !injectScheduleEmojis('- [ ] Pack #gamified-task', '2026-09-09', '2026-09-09').includes('🛫'));

console.log(`passed ${passed}`);
