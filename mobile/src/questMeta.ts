import type { MobileQuestItem } from './types';

export function parseQuestLine(
	line: string,
	lineIndex: number,
	defaults: { xp: number; coins: number }
): MobileQuestItem | null {
	if (!line.includes('#gamified-task')) return null;
	const checkboxMatch = line.match(/^- \[( |x)\]/i);
	if (!checkboxMatch) return null;

	const completed = checkboxMatch[1].toLowerCase() === 'x';
	const title = extractTitle(line);
	const xp = extractNumber(line, /✨(\d+)/, defaults.xp);
	const cp = extractNumber(line, /⭐(\d+)/, xp);
	const coins = extractNumber(line, /💰(\d+)/, defaults.coins);
	const energyCost = parseEnergyCost(line);
	const skills = extractList(line, /skills:\s*([^|}]+)/i, /🛠️\s*([^✨⭐💰🔁🔥⚖️🌱📅#\n\r]+)/);
	const stats = extractList(line, /stats:\s*([^|}]+)/i);
	const dueDate = parseDueDate(line);

	return {
		lineIndex,
		title,
		completed,
		xp,
		cp,
		coins,
		difficulty: extractDifficulty(line),
		energyCost,
		skills,
		stats,
		dueDate,
		rawLine: line,
	};
}

export function parseEnergyCost(line: string): number {
	const brace = line.match(/\{([^}]*)\}/);
	if (brace) {
		const m = brace[1].match(/(?:energy|energyCost)\s*:\s*(\d+)/i);
		if (m) return Math.min(100, parseInt(m[1], 10));
	}
	const m2 = line.match(/(?:\||\s)(?:energy|energyCost)\s*:\s*(\d+)/i);
	if (m2) return Math.min(100, parseInt(m2[1], 10));
	if (line.includes('🔥')) return 15;
	if (line.includes('🌱')) return 5;
	return 10;
}

export type EnergyMatch = 'perfect' | 'good' | 'challenging' | 'insufficient';

export function getEnergyMatch(currentEnergy: number, questCost: number): EnergyMatch {
	if (questCost <= currentEnergy * 0.3) return 'perfect';
	if (questCost <= currentEnergy * 0.6) return 'good';
	if (questCost <= currentEnergy) return 'challenging';
	return 'insufficient';
}

function extractTitle(line: string): string {
	const match = line.match(/- \[(?: |x)\]\s+(.+?)\s*#gamified-task/i);
	if (!match) return 'Quest';
	let title = match[1].trim();
	title = title.replace(/\{[^}]+\}/g, '').trim();
	title = title.replace(/\/\/.*$/, '').trim();
	title = title.replace(/✨\d+/g, '').replace(/⭐\d+/g, '').replace(/💰\d+/g, '').trim();
	return title || 'Quest';
}

function extractNumber(line: string, pattern: RegExp, fallback: number): number {
	const match = line.match(pattern);
	if (!match) return fallback;
	const n = parseInt(match[1], 10);
	return Number.isFinite(n) ? n : fallback;
}

function extractList(line: string, pattern: RegExp, emojiPattern?: RegExp): string[] {
	const match = line.match(pattern);
	if (match) {
		return match[1].split(/[;,]/).map((s) => s.trim()).filter(Boolean);
	}
	if (emojiPattern) {
		const em = line.match(emojiPattern);
		if (em) {
			return em[1].split(/[;,]/).map((s) => s.trim()).filter(Boolean);
		}
	}
	return [];
}

function extractDifficulty(line: string): string | undefined {
	if (line.includes('🔥')) return 'hard';
	if (line.includes('🌱')) return 'easy';
	if (line.includes('⚖️')) return 'medium';
	return undefined;
}

function parseDueDate(line: string): string | undefined {
	const emoji = line.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
	if (emoji) return emoji[1];
	const meta = line.match(/due\s*:\s*(\d{4}-\d{2}-\d{2})/i);
	if (meta) return meta[1];
	return undefined;
}
