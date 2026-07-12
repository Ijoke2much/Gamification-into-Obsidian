export interface MobileSettings {
	xpPerTask: number;
	coinPerTask: number;
	currencyName: string;
	currencySymbol: string;
	defaultQuestFilePath: string;
	playerDataPath: string;
	hideCompletedQuests: boolean;
	skillTreeRoot: string;
}

export interface MasterClassProgress {
	level: number;
	currentCP: number;
	requiredCP: number;
	totalCP: number;
	icon?: string;
	filePath?: string;
}

export interface MobilePlayerSnapshot {
	name: string;
	level: number;
	xp: number;
	xpRequired: number;
	coins: number;
	cp: number;
	rank: string;
	masterClass: string;
	energy: number;
	masterProgress: MasterClassProgress | null;
}

export interface MobileQuestItem {
	lineIndex: number;
	title: string;
	completed: boolean;
	xp: number;
	cp: number;
	coins: number;
	difficulty?: string;
	energyCost: number;
	skills: string[];
	stats: string[];
	dueDate?: string;
	rawLine: string;
}

export interface MobileSkillItem {
	name: string;
	level: number;
	currentCP: number;
	requiredCP: number;
	className: string;
	filePath: string;
}

export interface MobileHabitItem {
	id: string;
	name: string;
	emoji: string;
	streak: number;
	doneToday: boolean;
	filePath: string;
	rewardXp: number;
	rewardCp: number;
	rewardCoins: number;
	treeStage: number;
}

export interface QuestCompleteResult {
	xp: number;
	coins: number;
	cp: number;
	leveledUp: boolean;
	newLevel?: number;
	title: string;
	skillLevelUps: string[];
}

export type MobileTab = 'player' | 'quests' | 'calendar' | 'habits' | 'skills';
export type QuestEnergyFilter = 'all' | 'good-fit' | 'low-energy';
