import { TFile, type Vault } from 'obsidian';
import { parseFrontmatter, writeFrontmatter } from './yaml';

export type ProgressKind = 'master' | 'class' | 'skill' | 'stat';

export function calculateRequiredCP(kind: ProgressKind, level: number): number {
	const lv = Math.max(1, Math.floor(level || 1));
	switch (kind) {
		case 'master':
			return 100 * lv * lv;
		case 'class':
			return 50 * lv * lv;
		case 'skill':
			return 20 * lv * lv;
		case 'stat':
			return 10 * lv * lv;
		default:
			return 10 * lv * lv;
	}
}

export async function distributeQuestCP(
	vault: Vault,
	cp: number,
	skills: string[],
	stats: string[]
): Promise<string[]> {
	if (cp <= 0) return [];
	const levelUps: string[] = [];

	for (const rawName of skills) {
		const skillName = String(rawName || '').trim();
		if (!skillName) continue;
		const skillPath = await findSkillPath(vault, skillName);
		if (!skillPath) continue;

		if (await bumpProgressFile(vault, skillPath, cp, 'skill')) {
			levelUps.push(`${skillName} (Skill)`);
		}

		const classPath = await findClassPathForSkill(vault, skillPath);
		if (classPath && await bumpProgressFile(vault, classPath, cp, 'class')) {
			levelUps.push(`${skillName} class`);
		}

		const masterPath = await findMasterClassPathForSkill(vault, skillPath);
		if (masterPath && await bumpProgressFile(vault, masterPath, cp, 'master')) {
			levelUps.push(`Master class`);
		}
	}

	for (const rawName of stats) {
		const statName = String(rawName || '').trim();
		if (!statName) continue;
		const statPath = await findStatPath(vault, statName);
		if (!statPath) continue;
		if (await bumpProgressFile(vault, statPath, cp, 'stat')) {
			levelUps.push(`${statName} (Stat)`);
		}
	}

	return levelUps;
}

async function bumpProgressFile(
	vault: Vault,
	filePath: string,
	cp: number,
	kind: ProgressKind
): Promise<boolean> {
	const file = vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) return false;

	const raw = await vault.read(file);
	const { data, body } = parseFrontmatter(raw);
	let level = numberField(data.level, 1);
	let currentCP = numberField(data.currentCP ?? data.cp, 0) + cp;
	let totalCP = numberField(data.totalCP, 0) + cp;
	let requiredCP = numberField(data.requiredCP, calculateRequiredCP(kind, level));
	let leveledUp = false;

	while (currentCP >= requiredCP && requiredCP > 0) {
		currentCP -= requiredCP;
		level += 1;
		requiredCP = calculateRequiredCP(kind, level);
		leveledUp = true;
	}

	const next: Record<string, unknown> = {
		...data,
		level,
		currentCP,
		totalCP,
		requiredCP,
	};

	if (kind === 'stat' && leveledUp) {
		const value = numberField(data.value, 0) + 3;
		next.value = value;
	}

	await vault.modify(file, writeFrontmatter(next, body));
	return leveledUp;
}

async function findSkillPath(vault: Vault, skillName: string): Promise<string | null> {
	const needle = skillName.toLowerCase();
	for (const f of vault.getAllLoadedFiles()) {
		if (!(f instanceof TFile)) continue;
		if (!f.path.includes('/Skills/') || !f.path.endsWith('.md')) continue;
		if (f.basename.toLowerCase() === needle) return f.path;
		const raw = await vault.read(f);
		const { data } = parseFrontmatter(raw);
		if (String(data.name || '').trim().toLowerCase() === needle) return f.path;
	}
	return null;
}

async function findClassPathForSkill(vault: Vault, skillPath: string): Promise<string | null> {
	const raw = await vault.read(vault.getAbstractFileByPath(skillPath) as TFile);
	const { data } = parseFrontmatter(raw);
	const className = String(data.class || '').trim();
	if (!className) return null;
	const candidate = `SkillTree/Master-Class/Class/${className}.md`;
	const file = vault.getAbstractFileByPath(candidate);
	return file instanceof TFile ? candidate : null;
}

async function findMasterClassPathForSkill(vault: Vault, skillPath: string): Promise<string | null> {
	const classPath = await findClassPathForSkill(vault, skillPath);
	if (!classPath) return null;
	const raw = await vault.read(vault.getAbstractFileByPath(classPath) as TFile);
	const { data } = parseFrontmatter(raw);
	const master = String(data.master || data.masterClass || '').trim();
	if (!master) return null;

	for (const f of vault.getAllLoadedFiles()) {
		if (!(f instanceof TFile)) continue;
		if (!f.path.startsWith('SkillTree/Master-Class/')) continue;
		if (f.path.includes('/Class/') || f.path.includes('/Skills/')) continue;
		if (!f.path.endsWith('.md')) continue;
		const fm = parseFrontmatter(await vault.read(f)).data;
		if (String(fm.name || f.basename).trim().toLowerCase() === master.toLowerCase()) {
			return f.path;
		}
	}
	return null;
}

async function findStatPath(vault: Vault, statName: string): Promise<string | null> {
	const needle = statName.toLowerCase();
	for (const f of vault.getAllLoadedFiles()) {
		if (!(f instanceof TFile)) continue;
		if (!f.path.includes('/Stats/') && !f.path.includes('/Stat/')) continue;
		if (!f.path.endsWith('.md')) continue;
		if (f.basename.toLowerCase() === needle) return f.path;
		const { data } = parseFrontmatter(await vault.read(f));
		if (String(data.name || '').trim().toLowerCase() === needle) return f.path;
	}
	return null;
}

function numberField(value: unknown, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
	return fallback;
}
