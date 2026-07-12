import { TFile, TFolder, Vault } from 'obsidian';
import type { MobileSkillItem } from './types';
import { parseFrontmatter } from './yaml';
import { calculateRequiredCP } from './progress';

export async function loadSkills(vault: Vault): Promise<MobileSkillItem[]> {
	const skills: MobileSkillItem[] = [];

	for (const f of vault.getAllLoadedFiles()) {
		if (!(f instanceof TFile)) continue;
		if (!f.path.startsWith('SkillTree/')) continue;
		if (!f.path.includes('/Skills/')) continue;
		if (!f.path.endsWith('.md')) continue;

		const { data } = parseFrontmatter(await vault.read(f));
		const name = String(data.name || f.basename).trim();
		const className = String(data.class || 'Unknown').trim();
		const level = numberField(data.level, 1);
		const currentCP = numberField(data.currentCP ?? data.cp, 0);
		const requiredCP = numberField(data.requiredCP, calculateRequiredCP('skill', level));

		skills.push({
			name,
			level,
			currentCP,
			requiredCP,
			className,
			filePath: f.path,
		});
	}

	return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function numberField(value: unknown, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
	return fallback;
}
