import { TFile, type Vault } from 'obsidian';
import { pickStarterMasterClass } from '../../../data/models/PlayerData';

export const SKILL_TREE_ROOT = 'SkillTree';
export const HUNTER_MASTER_PATH = 'SkillTree/Master-Class/Hunter.md';
export const JESTER_MASTER_PATH = 'SkillTree/Master-Class/Jester 🎭.md';
export const STARTER_CLASS_PATH = 'SkillTree/Master-Class/Class/Focus.md';
export const SKILL_TREE_CANVAS_PATH = 'SkillTree/SkillTree.canvas';

const FOLDERS = [
	'SkillTree',
	'SkillTree/Master-Class',
	'SkillTree/Master-Class/Class',
	'SkillTree/Master-Class/Class/Skills',
	'SkillTree/Master-Class/Skills',
	'SkillTree/Master-Class/Stats',
] as const;

async function ensureFolder(vault: Vault, path: string): Promise<void> {
	if (vault.getAbstractFileByPath(path)) return;
	const parts = path.split('/').filter(Boolean);
	let current = '';
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (vault.getAbstractFileByPath(current)) continue;
		try {
			await vault.createFolder(current);
		} catch {
			/* exists or iCloud race */
		}
	}
}

function isMasterClassNote(file: TFile): boolean {
	if (!file.path.startsWith('SkillTree/Master-Class/')) return false;
	if (!file.path.endsWith('.md')) return false;
	if (file.path.includes('/Class/')) return false;
	if (file.path.includes('/Skills/')) return false;
	if (file.path.includes('/Stats/')) return false;
	if (file.path.includes('/Stat/')) return false;
	return true;
}

function isClassNote(file: TFile): boolean {
	return (
		file.path.startsWith('SkillTree/Master-Class/Class/') &&
		file.path.endsWith('.md') &&
		!file.path.includes('/Skills/')
	);
}

function safeMasterFileName(name: string): string {
	const safe = name.replace(/[\\/:*?"<>|]/g, '').trim();
	return safe || 'Wanderer';
}

function masterNotePathFor(name: string): string {
	return `SkillTree/Master-Class/${safeMasterFileName(name)}.md`;
}

async function readPlayerMasterClass(vault: Vault): Promise<string | null> {
	const pd = vault.getAbstractFileByPath('SkillTree/PlayerData.md');
	if (!(pd instanceof TFile)) return null;
	try {
		const raw = await vault.read(pd);
		const match = raw.match(/^masterClass:\s*(.*)$/m);
		if (!match) return null;
		const value = match[1].trim().replace(/^["']|["']$/g, '');
		return value || null;
	} catch {
		return null;
	}
}

function starterClassNote(masterName: string): string {
	const master = safeMasterFileName(masterName);
	return `---
name: "Focus"
masterClass: "${master}"
tagline: "Stay with the work in front of you"
icon: "🎯"
level: 1
currentCP: 0
requiredCP: 100
totalCP: 0
description: "Starter class for attention and deep work. Link quests here as you go."
type: class
---

# 🎯 Focus

Stay with the work in front of you. Complete quests to earn CP toward this class.
`;
}

function starterMasterNote(masterName: string): string {
	const name = safeMasterFileName(masterName);
	return `---
name: "${name}"
icon: "🏹"
level: 1
currentCP: 0
requiredCP: 400
totalCP: 0
description: "A starting master class. Train skills and find the path that fits you."
type: master
---

# 🏹 ${name}

Your starting class. Complete quests to earn CP, then add classes and skills from the Skill Realm.
`;
}

function buildCanvas(masterPath: string, classPath: string | null): string {
	const nodes: Array<Record<string, unknown>> = [
		{
			id: 'starter-master',
			type: 'file',
			file: masterPath,
			x: 400,
			y: 50,
			width: 300,
			height: 120,
		},
	];
	const edges: Array<Record<string, unknown>> = [];
	if (classPath) {
		nodes.push({
			id: 'focus-class',
			type: 'file',
			file: classPath,
			x: 400,
			y: 250,
			width: 260,
			height: 110,
		});
		edges.push({
			id: 'starter-focus',
			fromNode: 'starter-master',
			fromSide: 'bottom',
			toNode: 'focus-class',
			toSide: 'top',
		});
	}
	return JSON.stringify({ nodes, edges }, null, 2);
}

export function resolveExistingMasterPath(vault: Vault): string | null {
	const jester = vault.getAbstractFileByPath(JESTER_MASTER_PATH);
	if (jester) return JESTER_MASTER_PATH;
	const hunter = vault.getAbstractFileByPath(HUNTER_MASTER_PATH);
	if (hunter) return HUNTER_MASTER_PATH;
	const found = vault.getMarkdownFiles().find((file) => isMasterClassNote(file));
	return found?.path ?? null;
}

/**
 * Create SkillTree folders and a starter master note when the tree is empty.
 * Existing Jester (or any master) vaults are left as-is.
 */
export async function ensureSkillTreeSkeleton(vault: Vault): Promise<void> {
	for (const folder of FOLDERS) {
		await ensureFolder(vault, folder);
	}

	const markdown = vault.getMarkdownFiles();
	const hasMaster = markdown.some((file) => isMasterClassNote(file));
	const hasClass = markdown.some((file) => isClassNote(file));
	const playerClass = await readPlayerMasterClass(vault);
	const masterName = playerClass || pickStarterMasterClass();
	const masterPath = masterNotePathFor(masterName);

	if (!hasMaster && !vault.getAbstractFileByPath(masterPath)) {
		try {
			await vault.create(masterPath, starterMasterNote(masterName));
		} catch {
			/* exists */
		}
	}

	if (!hasClass && !vault.getAbstractFileByPath(STARTER_CLASS_PATH)) {
		try {
			await vault.create(STARTER_CLASS_PATH, starterClassNote(masterName));
		} catch {
			/* exists */
		}
	}

	if (vault.getAbstractFileByPath(SKILL_TREE_CANVAS_PATH)) return;

	const canvasMaster = resolveExistingMasterPath(vault) ?? masterPath;
	const classFile = vault.getAbstractFileByPath(STARTER_CLASS_PATH);
	try {
		await vault.create(
			SKILL_TREE_CANVAS_PATH,
			buildCanvas(canvasMaster, classFile ? STARTER_CLASS_PATH : null)
		);
	} catch {
		/* exists */
	}
}
