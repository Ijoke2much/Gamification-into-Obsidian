/** Plugin-owned notes live under this folder so they stay apart from the rest of the vault. */
export const GAMIFIED_ROOT = 'Gamified';

export const DEFAULT_INVENTORY_PATH = `${GAMIFIED_ROOT}/Inventory.md`;
export const DEFAULT_GEAR_PATH = `${GAMIFIED_ROOT}/Gear.md`;
export const DEFAULT_FOES_PATH = `${GAMIFIED_ROOT}/Foes.md`;
export const DEFAULT_SHOP_PATH = `${GAMIFIED_ROOT}/Shop.md`;
export const DEFAULT_RECIPES_PATH = `${GAMIFIED_ROOT}/Recipes.md`;
export const DEFAULT_MATERIALS_PATH = `${GAMIFIED_ROOT}/Materials.md`;
export const DEFAULT_QUEST_FILE_PATH = `${GAMIFIED_ROOT}/GamifiedTasks.md`;
export const DEFAULT_PROJECTS_PATH = `${GAMIFIED_ROOT}/GamifiedProjects.md`;
export const DEFAULT_CAPTURE_PATH = `${GAMIFIED_ROOT}/Capture.md`;
export const DEFAULT_CHECKINS_PATH = `${GAMIFIED_ROOT}/CheckIns.md`;
export const DEFAULT_BOSS_FOLDER = `${GAMIFIED_ROOT}/Bosses`;
export const DEFAULT_TASK_NOTE_FOLDER = `${GAMIFIED_ROOT}/Tasks`;

export const DEFAULT_SKILL_TREE_ROOT = `${GAMIFIED_ROOT}/SkillTree`;
export const DEFAULT_MASTER_CLASS_FOLDER = `${DEFAULT_SKILL_TREE_ROOT}/Master-Class`;
export const DEFAULT_CLASS_FOLDER = `${DEFAULT_MASTER_CLASS_FOLDER}/Class`;
export const DEFAULT_SKILL_FOLDER = `${DEFAULT_CLASS_FOLDER}/Skills`;
export const DEFAULT_STAT_FOLDER = `${DEFAULT_MASTER_CLASS_FOLDER}/Stats`;
export const DEFAULT_PLAYER_DATA_PATH = `${DEFAULT_SKILL_TREE_ROOT}/PlayerData.md`;
export const DEFAULT_HABITS_FOLDER = `${DEFAULT_SKILL_TREE_ROOT}/Habits`;
export const DEFAULT_HABITS_FILE = `${DEFAULT_SKILL_TREE_ROOT}/Habits.md`;

let playerDataFilePath = DEFAULT_PLAYER_DATA_PATH;
let habitsFolderPath = DEFAULT_HABITS_FOLDER;
let habitsFilePath = DEFAULT_HABITS_FILE;

export function applyDataPaths(settings: {
	playerDataFilePath?: string;
	habitsFolderPath?: string;
	habitsFilePath?: string;
}): void {
	const player = settings.playerDataFilePath?.trim();
	const habitsFolder = settings.habitsFolderPath?.trim();
	const habitsFile = settings.habitsFilePath?.trim();
	if (player) playerDataFilePath = player;
	if (habitsFolder) habitsFolderPath = habitsFolder;
	if (habitsFile) habitsFilePath = habitsFile;
}

export function configuredPlayerDataPath(): string {
	return playerDataFilePath;
}

export function configuredHabitsFolderPath(): string {
	return habitsFolderPath;
}

export function configuredHabitsFilePath(): string {
	return habitsFilePath;
}

export const LEGACY_PLAYER_DATA_PATH = 'SkillTree/PlayerData.md';
export const LEGACY_INVENTORY_PATH = 'Inventory.md';
export const LEGACY_GEAR_PATH = 'Gear.md';
export const LEGACY_BOSS_FOLDER = 'Bosses';

const LEGACY_PATHS: Record<string, string> = {
	'Inventory.md': DEFAULT_INVENTORY_PATH,
	SkillTree: DEFAULT_SKILL_TREE_ROOT,
	'SkillTree/Master-Class': DEFAULT_MASTER_CLASS_FOLDER,
	'SkillTree/Master-Class/Class': DEFAULT_CLASS_FOLDER,
	'SkillTree/Master-Class/Class/Skills': DEFAULT_SKILL_FOLDER,
	'SkillTree/Master-Class/Skills': `${DEFAULT_MASTER_CLASS_FOLDER}/Skills`,
	'SkillTree/Master-Class/Stats': DEFAULT_STAT_FOLDER,
	'GamifiedTasks.md': DEFAULT_QUEST_FILE_PATH,
	'GamifiedProjects.md': DEFAULT_PROJECTS_PATH,
	'Capture.md': DEFAULT_CAPTURE_PATH,
	'CheckIns.md': DEFAULT_CHECKINS_PATH,
	'SkillTree/PlayerData.md': DEFAULT_PLAYER_DATA_PATH,
	'SkillTree/Habits': DEFAULT_HABITS_FOLDER,
	'SkillTree/Habits.md': DEFAULT_HABITS_FILE,
};

/**
 * Point settings at Gamified/ only when that folder is already there.
 * A vault that still keeps notes in SkillTree/ stays on those paths.
 */
export function migrateLegacyVaultPaths<T extends Record<string, unknown>>(
	settings: T,
	exists: (path: string) => boolean = () => false,
): boolean {
	let changed = false;
	const move = (key: string) => {
		const current = settings[key];
		if (typeof current !== 'string') return;
		const next = LEGACY_PATHS[current];
		if (next && next !== current && (exists(next) || !exists(current))) {
			settings[key] = next;
			changed = true;
			return;
		}
		const legacy = Object.keys(LEGACY_PATHS).find((oldPath) => LEGACY_PATHS[oldPath] === current);
		if (legacy && !exists(current) && exists(legacy)) {
			settings[key] = legacy;
			changed = true;
		}
	};
	move('inventoryFilePath');
	move('skillTreeRoot');
	move('masterClassFolder');
	move('classFolder');
	move('skillFolder');
	move('statFolder');
	move('defaultQuestFilePath');
	move('projectsFilePath');
	move('captureFilePath');
	move('focusCheckInLogPath');
	move('playerDataFilePath');
	move('habitsFolderPath');
	move('habitsFilePath');
	const locations = settings.questSaveLocations;
	if (Array.isArray(locations)) {
		for (const entry of locations) {
			if (!entry || typeof entry !== 'object') continue;
			const filePath = (entry as { filePath?: string }).filePath;
			const next = filePath ? LEGACY_PATHS[filePath] : undefined;
			if (next) {
				(entry as { filePath: string }).filePath = next;
				changed = true;
			}
		}
	}
	const attached = settings.pomodoroAttachedQuest;
	if (attached && typeof attached === 'object') {
		const filePath = (attached as { filePath?: string }).filePath;
		const next = filePath ? LEGACY_PATHS[filePath] : undefined;
		if (next) {
			(attached as { filePath: string }).filePath = next;
			changed = true;
		}
	}
	return changed;
}
