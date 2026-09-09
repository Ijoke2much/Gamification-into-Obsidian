/**
 * Smoke test: list-file complete checks off the tapped line, not the first checkbox.
 * Run: node scripts/test-quest-complete-line.mjs
 */

function countGamifiedTaskMarkers(content) {
	return content.match(/#gamified-task/g)?.length ?? 0;
}

function isSingleQuestNoteContent(content, hasTaskNotesStatus) {
	if (countGamifiedTaskMarkers(content) > 1) return false;
	if (hasTaskNotesStatus) return true;
	return /gamified-task:\s*true/.test(content);
}

function isTaskLineDone(line) {
	return /^\s*[-*+]\s*\[[xX]\]/.test(line);
}

function isTaskLineOpen(line) {
	return /^\s*[-*+]\s*\[\s\]/.test(line);
}

function markTaskLineComplete(line) {
	if (isTaskLineDone(line)) return line;
	return line.replace(/^(\s*[-*+]\s*)\[\s\]/, '$1[x]');
}

function completeListFile(content, title) {
	if (isSingleQuestNoteContent(content, false)) {
		throw new Error('should use shared-note path');
	}
	const lines = content.split('\n');
	const index = lines.findIndex((line) => line.includes('#gamified-task') && line.includes(title));
	if (index < 0) throw new Error('line not found');
	lines[index] = markTaskLineComplete(lines[index]);
	return lines.join('\n');
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

const listFile = [
	'- [x] already done #gamified-task',
	'- [ ] test notice #gamified-task ⏱️32m',
	'- [ ] later #gamified-task',
].join('\n');

assert('list file is not a single quest note', isSingleQuestNoteContent(listFile, false) === false);

const after = completeListFile(listFile, 'test notice');
const afterLines = after.split('\n');
assert('first line stays done', isTaskLineDone(afterLines[0]));
assert('test notice is checked off', isTaskLineDone(afterLines[1]) && afterLines[1].includes('test notice'));
assert('later quest stays open', isTaskLineOpen(afterLines[2]));

const single = '---\nstatus: open\ngamified-task: true\n---\n- [ ] only #gamified-task';
assert('per-note is a single quest note', isSingleQuestNoteContent(single, true) === true);

const weird = '  - [ ] spaced #gamified-task';
assert('mark handles indent', isTaskLineDone(markTaskLineComplete(weird)));

function questTitleLineRegex(title) {
	const trimmed = title.trim();
	if (!trimmed) return null;
	const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`-\\s*\\[[ xX]\\]\\s*${escaped}(?:\\s|#|\\[|$)`);
}

function lineMatchesQuestTitle(line, quest) {
	const titleRe = questTitleLineRegex(quest.title || '');
	return Boolean(titleRe && line.includes('#gamified-task') && titleRe.test(line));
}

function findQuestLineIndex(lines, quest) {
	if (typeof quest.lineNumber === 'number' && quest.lineNumber > 0) {
		const idx = quest.lineNumber - 1;
		if (idx >= 0 && idx < lines.length && lineMatchesQuestTitle(lines[idx], quest)) {
			return idx;
		}
	}
	const titleRe = questTitleLineRegex(quest.title || '');
	if (!titleRe) return -1;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes('#gamified-task') && titleRe.test(lines[i])) return i;
	}
	return -1;
}

const dupes = [
	'- [ ] Call mom #gamified-task',
	'- [ ] later #gamified-task',
	'- [ ] Call mom #gamified-task',
];
const secondMom = findQuestLineIndex(dupes, { title: 'Call mom', lineNumber: 3 });
assert('duplicate titles use lineNumber', secondMom === 2);
dupes[secondMom] = markTaskLineComplete(dupes[secondMom]);
assert('first duplicate stays open', isTaskLineOpen(dupes[0]));
assert('targeted duplicate is complete', isTaskLineDone(dupes[2]));

console.log(`\n${passed} complete-line checks passed.`);
