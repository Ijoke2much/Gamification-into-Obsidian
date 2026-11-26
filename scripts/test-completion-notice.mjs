/**
 * Smoke test: one completion toast carries chip/materials flavor.
 * Run: node scripts/test-completion-notice.mjs
 */

function appendQuestCompletionFlavor(lines, result) {
	if (result.materialsGranted?.length) {
		const summary = result.materialsGranted.map((m) => `${m.icon} ${m.name}`).join(', ');
		lines.push(`📦 ${summary}`);
	}
	if (result.journeyDamage != null && !result.journeyDefeated) {
		if (result.journeyGrazed) {
			lines.push(`Journey graze −${result.journeyDamage} HP`);
		} else {
			const hp = result.journeyHpPercent != null ? ` · foe ${result.journeyHpPercent}%` : '';
			lines.push(`Journey −${result.journeyDamage} HP${hp}`);
		}
	}
	if (result.bossRaidDamage != null && !result.bossRaidDefeated) {
		const label = result.bossRaidBossName || 'Gate boss';
		if (result.bossRaidGrazed) {
			lines.push(`Raid graze −${result.bossRaidDamage} HP vs ${label}`);
		} else {
			const hp = result.bossRaidHpPercent != null ? ` · ${result.bossRaidHpPercent}%` : '';
			lines.push(`Raid −${result.bossRaidDamage} HP vs ${label}${hp}`);
		}
	}
}

function buildCompletionNoticeText(result) {
	const lines = [
		`✅ QUEST COMPLETE!\n+${result.awardedXP} XP · +${result.awardedCP} CP · 🪙${result.awardedCoins} Coins`,
	];
	if (result.dreamNotice) lines.push(result.dreamNotice);
	appendQuestCompletionFlavor(lines, result);
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

const chip = buildCompletionNoticeText({
	awardedXP: 12,
	awardedCP: 4,
	awardedCoins: 3,
	dreamNotice: 'Dream survived · −3 HP',
	journeyDamage: 8,
	journeyDefeated: false,
	journeyHpPercent: 72,
	materialsGranted: [{ icon: '🪵', name: 'Scrap Wood' }],
});

assert('single string includes XP', chip.includes('+12 XP'));
assert('dream stays on the same toast', chip.includes('Dream survived'));
assert('journey chip is folded in', chip.includes('Journey −8 HP · foe 72%'));
assert('materials are folded in', chip.includes('📦 🪵 Scrap Wood'));

const fallen = { journeyDamage: 20, journeyDefeated: true };
const fallenLines = [];
appendQuestCompletionFlavor(fallenLines, fallen);
assert('defeated journey is not folded (separate high toast)', fallenLines.length === 0);

console.log(`\n${passed} completion-notice checks passed.`);
