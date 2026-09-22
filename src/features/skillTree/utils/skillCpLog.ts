import { TFile, type Vault } from 'obsidian';
import { isSkillOnActiveGate } from './activeGateTraining';

export const SKILL_CP_LOG_PATH = 'SkillTree/SkillCpLog.md';
export const SKILL_CP_LOGGED_EVENT = 'skill-cp-logged';
const MAX_ENTRIES = 400;

export type SkillCpSource = 'quest' | 'gate' | 'battle' | 'other';

export interface SkillCpEntry {
	timestamp: number;
	skillName: string;
	skillPath?: string;
	cp: number;
	source: SkillCpSource;
}

function startOfLocalWeek(now = new Date()): Date {
	const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const weekday = d.getDay();
	const daysFromMonday = (weekday + 6) % 7;
	d.setDate(d.getDate() - daysFromMonday);
	d.setHours(0, 0, 0, 0);
	return d;
}

function inferSource(
	skillName: string,
	className: string | undefined,
	requested?: SkillCpSource
): SkillCpSource {
	if (requested && requested !== 'quest') return requested;
	if (isSkillOnActiveGate(skillName, className)) return 'gate';
	return requested ?? 'quest';
}

export async function recordSkillCpGain(
	vault: Vault,
	input: {
		skillName: string;
		cp: number;
		skillPath?: string;
		className?: string;
		source?: SkillCpSource;
	}
): Promise<void> {
	if (!input.cp || input.cp <= 0) return;
	const entry: SkillCpEntry = {
		timestamp: Date.now(),
		skillName: input.skillName.trim() || 'Unknown skill',
		skillPath: input.skillPath,
		cp: Math.round(input.cp),
		source: inferSource(input.skillName, input.className, input.source),
	};

	const entries = await loadSkillCpLog(vault);
	entries.unshift(entry);
	if (entries.length > MAX_ENTRIES) entries.splice(MAX_ENTRIES);
	await saveSkillCpLog(vault, entries);
	document.dispatchEvent(new CustomEvent(SKILL_CP_LOGGED_EVENT, { detail: entry }));
}

export async function loadSkillCpLog(vault: Vault): Promise<SkillCpEntry[]> {
	const file = vault.getAbstractFileByPath(SKILL_CP_LOG_PATH);
	if (!(file instanceof TFile)) return [];
	try {
		const content = await vault.read(file);
		const out: SkillCpEntry[] = [];
		for (const line of content.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed.startsWith('- ')) continue;
			try {
				const parsed = JSON.parse(trimmed.slice(2)) as SkillCpEntry;
				if (parsed?.skillName && typeof parsed.cp === 'number') {
					out.push(parsed);
				}
			} catch {
				/* skip bad line */
			}
		}
		return out;
	} catch {
		return [];
	}
}

async function saveSkillCpLog(vault: Vault, entries: SkillCpEntry[]): Promise<void> {
	const body = [
		'# Skill CP log',
		'',
		'Append-only weekly training log (plugin-managed).',
		'',
		...entries.map((e) => `- ${JSON.stringify(e)}`),
		'',
	].join('\n');
	const existing = vault.getAbstractFileByPath(SKILL_CP_LOG_PATH);
	if (existing instanceof TFile) {
		await vault.modify(existing, body);
		return;
	}
	await vault.create(SKILL_CP_LOG_PATH, body);
}

export interface WeeklySkillCpRow {
	skillName: string;
	cp: number;
	fromGate: boolean;
}

export function summarizeSkillCpThisWeek(
	entries: SkillCpEntry[],
	now = new Date()
): WeeklySkillCpRow[] {
	const weekStart = startOfLocalWeek(now).getTime();
	const bySkill = new Map<string, WeeklySkillCpRow>();
	for (const entry of entries) {
		if (entry.timestamp < weekStart) continue;
		const key = entry.skillName.trim() || 'Unknown skill';
		const row = bySkill.get(key) ?? { skillName: key, cp: 0, fromGate: false };
		row.cp += entry.cp;
		if (entry.source === 'gate') row.fromGate = true;
		bySkill.set(key, row);
	}
	return Array.from(bySkill.values()).sort((a, b) => b.cp - a.cp);
}
