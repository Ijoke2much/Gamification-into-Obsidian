import { TFile, type Vault } from 'obsidian';
import type { MasterClassProgress } from './types';
import { parseFrontmatter } from './yaml';

export async function loadMasterClassProgress(
	vault: Vault,
	masterClassName: string | undefined
): Promise<MasterClassProgress | null> {
	const target = String(masterClassName || '').trim().toLowerCase();
	if (!target) return null;

	const candidates: TFile[] = [];
	for (const f of vault.getAllLoadedFiles()) {
		if (!(f instanceof TFile)) continue;
		if (!f.path.startsWith('SkillTree/Master-Class/')) continue;
		if (!f.path.endsWith('.md')) continue;
		if (f.path.includes('/Class/')) continue;
		if (f.path.includes('/Skills/')) continue;
		if (f.path.includes('/Stats/')) continue;
		if (f.path.includes('/Stat/')) continue;
		candidates.push(f);
	}

	let best: { file: TFile; data: Record<string, unknown> } | null = null;

	for (const file of candidates) {
		const base = file.basename.trim().toLowerCase();
		if (!base.includes(target) && !base.startsWith(target)) continue;
		const raw = await vault.read(file);
		const { data } = parseFrontmatter(raw);
		const fmName = String(data.name || '').trim().toLowerCase();
		if (fmName && fmName === target) {
			best = { file, data };
			break;
		}
		if (!best) best = { file, data };
	}

	if (!best) {
		for (const file of candidates) {
			const raw = await vault.read(file);
			const { data } = parseFrontmatter(raw);
			const fmName = String(data.name || '').trim().toLowerCase();
			if (fmName && fmName === target) {
				best = { file, data };
				break;
			}
		}
	}

	if (!best) return null;

	const d = best.data;
	return {
		level: numberField(d.level, 1),
		currentCP: numberField(d.currentCP ?? d.cp, 0),
		requiredCP: numberField(d.requiredCP, 400),
		totalCP: numberField(d.totalCP, 0),
		icon: typeof d.icon === 'string' ? d.icon : undefined,
		filePath: best.file.path,
	};
}

function numberField(value: unknown, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
	return fallback;
}
