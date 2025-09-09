// This file stores real data of the player class

// import { ceil, floor, pow } from "mathjs";

export interface Buff {
	name: string;
	type: 'multiplier' | 'flat' | 'temporary';
	value: number;
	expiresAt?: string;
	description?: string;
	icon?: string;
	category?: 'energy' | 'focus' | 'motivation' | 'general';
}

export interface Debuff {
	name: string;
	type: 'multiplier' | 'flat' | 'temporary';
	value: number;
	expiresAt?: string;
	description?: string;
	icon?: string;
	category?: 'energy' | 'focus' | 'motivation' | 'general';
}

export interface Artifact {
	name: string;
	realWorldActivity: string;
	durationMinutes: number;
	startedAt: string; // ISO timestamp
	expiresAt: string; // ISO timestamp
	description: string;
	icon?: string;
	category?: 'entertainment' | 'learning' | 'exercise' | 'social' | 'creative' | 'relaxation';
}

export interface PlayerStats {
	energy?: number;      // Physical energy (0-100)
	focus?: number;       // Mental focus (0-100)
	motivation?: number;  // Emotional motivation (0-100)
	calm?: number;        // Stress reduction (0-100)
	stress?: number;      // Stress level (0-100)
	[key: string]: number | undefined;
}

export interface PlayerData {
	// Core player information
	name: string;
	avatar: string;
	rank: string;
	masterClass: string;
	description: string;

	// Progression system
	level: number;
	xp: number;
	xpRequired: number;

	// Single currency system
	coins: number;
	cp?: number; // Character Points - optional for backwards compatibility

	// Player items and progression
	inventory: string[];

	// Player stats and status effects
	stats?: PlayerStats;
	buffs?: Buff[];
	debuffs?: Debuff[];
	activeArtifacts?: Artifact[];

	// Penalty system
	failureDebtXP?: number;
	failureDebtCoins?: number;
	questReputation?: number; // -100..+100 influences shop prices and rewards
	bossHealthBoosts?: Record<string, number>; // Tracks permanent boss health increases from timeouts

	// System properties
	lastDailyReset?: string;  // ISO timestamp of last daily reset

	// Data that exists for analytics/other systems but isn't displayed in player tab
	// Vault reference for file operations
	vault?: import('obsidian').Vault; // Will be set by the plugin when loading player data
}

export const DEFAULT_PLAYER: PlayerData = {
	name: "The Jish",
	avatar: "assets/sonic.png",
	rank: "Novice",
	masterClass: "Jester",
	description: "",
	level: 1,
	xp: 0,
	xpRequired: 100,
	coins: 0,
	cp: 0,
	inventory: [],
	stats: {
		energy: 80,      // Start with good energy
		focus: 75,       // Start with decent focus
		motivation: 85,  // Start with high motivation
		calm: 70,        // Start with moderate calm
		stress: 20       // Start with low stress
	},
	activeArtifacts: [],
	lastDailyReset: new Date().toISOString()
};

export class Player {
	data: PlayerData;
	private saveCallback?: () => void;

	constructor() {
		this.data = { ...DEFAULT_PLAYER };
	}

	setSaveCallback(cb: () => void) {
		this.saveCallback = cb;
	}

	private triggerSave() {
		this.saveCallback?.();
	}

	setAvatar(path: string) {
		this.data.avatar = path;
		this.triggerSave();
	}

	setName(name: string) {
		this.data.name = name;
		this.triggerSave();
	}

	setRank(rank: string) {
		this.data.rank = rank;
		this.triggerSave();
	}

	setMasterClass(masterClass: string) {
		this.data.masterClass = masterClass;
		this.triggerSave();
	}

	setDescription(description: string) {
		this.data.description = description;
		this.triggerSave();
	}

	setLevel(level: number) {
		this.data.level = level;
		this.triggerSave();
	}

	setXP(xp: number) {
		this.data.xp = xp;
		this.triggerSave();
	}

	setXPRequired(xpRequired: number) {
		this.data.xpRequired = xpRequired;
		this.triggerSave();
	}

	setCoins(coins: number) {
		this.data.coins = coins;
		this.triggerSave();
	}

	setInventory(inventory: string[]) {
		this.data.inventory = inventory;
		this.triggerSave();
	}

	// setUnlockedSkills removed - skills are now handled by the skill tree module

	setStats(stats: { [key: string]: number }) {
		this.data.stats = stats;
		this.triggerSave();
	}

	// Level/XP progress helpers
	getLevel(): number {
		return this.data.level;
	}

	getXP(): number {
		return this.data.xp;
	}

	getXPRequired(): number {
		return this.data.xpRequired;
	}

	getXPPercent(): number {
		if (this.data.xpRequired === 0) return 0;
		return Math.min(this.data.xp / this.data.xpRequired, 1);
	}

	getCoins(): number {
		return this.data.coins;
	}

	getRank(): string {
		return this.data.rank;
	}

	toJSON() {
		return { ...this.data };
	}

	static fromJSON(json: Partial<PlayerData>): Player {
		const player = new Player();
		player.data = { ...DEFAULT_PLAYER, ...json };
		return player;
	}

	reset() {
		this.data = { ...DEFAULT_PLAYER };
		this.triggerSave();
	}
}