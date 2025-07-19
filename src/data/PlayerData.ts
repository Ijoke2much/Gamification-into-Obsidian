// This file stores real data of the player class

// import { ceil, floor, pow } from "mathjs";

export interface PlayerData {
	name: string;
	avatar: string;
	rank: string;
	masterClass: string;
	description: string;
	level: number;
	xp: number;
	xpRequired: number;
	coins: number;
	inventory: string[];
	unlockedSkills?: string[];
	stats?: { [key: string]: number };
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
	inventory: [],
	unlockedSkills: [],
	stats: {},
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

	setUnlockedSkills(skills: string[]) {
		this.data.unlockedSkills = skills;
		this.triggerSave();
	}

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

	static fromJSON(json: any): Player {
		const player = new Player();
		player.data = { ...DEFAULT_PLAYER, ...json };
		return player;
	}

	reset() {
		this.data = { ...DEFAULT_PLAYER };
		this.triggerSave();
	}
}

