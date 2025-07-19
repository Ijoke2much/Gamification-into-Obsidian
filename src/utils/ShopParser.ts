// src/utils/ShopParser.ts

import type GamifiedObsidianPlugin from "src/main";
import { App, TFile } from "obsidian";
import type { InventoryItem } from './updateInventoryFile';

// The complete item format used in the shop and inventory
export interface ShopItem {
	name: string;
	price: number;
	tags: string[];
	rarity: string;
	category: string;
	icon?: string; // Optional icon/emoji or image URL
	description?: string; // Optional description
	stock?: number; // Optional stock/quantity
	effects?: ShopItemEffect[]; // Optional effects array
}

// A simpler structure used when adding a new item
export interface NewShopItem {
	name: string;
	price: number;
	tags: string[]; // usually [category, rarity]
}

// Effect types for shop items
export type ShopItemEffect =
	| { type: "stat"; stat: string; amount: number }
	| { type: "coins"; amount: number }
	| { type: "xp"; amount: number }
	| { type: "unlock"; skill: string }
	| { type: "meta"; description: string };

// --- Reusable parser for each line (used for Shop.md and Inventory.md) ---
function parseShopLine(line: string): ShopItem {
	// Extract emoji/icon at the start if present
	const iconMatch = line.match(/^([\p{Emoji}\p{So}\p{Sk}\p{Sc}\p{Sm}])\s+/u);
	let icon = undefined;
	let rest = line;
	if (iconMatch) {
		icon = iconMatch[1];
		rest = line.slice(iconMatch[0].length);
	}
	const name = rest.split(" #")[0].trim();
	const priceMatch = rest.match(/#shop(\d+)/);
	const price = priceMatch ? parseInt(priceMatch[1]) : 0;

	const tagMatches = [...rest.matchAll(/#(\w+)/g)].map(m => m[1]);

	// Rarity options we check for explicitly
	const rarityOptions = ["common", "uncommon", "rare", "epic", "legendary"];
	const rarity = tagMatches.find(t => rarityOptions.includes(t)) ?? "common";

	// Anything that's not rarity or shop<number> becomes category
	const category = tagMatches.find(t =>
		!rarityOptions.includes(t) && !t.startsWith("shop")
	) ?? "misc";

	const tags = tagMatches.filter(t => !t.startsWith("shop"));

	return {
		name,
		price,
		tags,
		rarity,
		category,
		icon,
	};
}

function parseShopLinesWithDescriptions(lines: string[]): ShopItem[] {
	const items: ShopItem[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.startsWith("//")) continue; // skip comment lines not attached to an item
		const item = parseShopLine(line);

		// Parse all immediately following comment lines
		let foundDescription = false;
		const effects: ShopItemEffect[] = [];
		while (i + 1 < lines.length && lines[i + 1].trim().startsWith("//")) {
			const nextLine = lines[i + 1].trim();
			if (nextLine.startsWith("// icon:")) {
				item.icon = nextLine.replace(/^\/\/ icon:/, "").trim();
			} else if (nextLine.startsWith("// stock:")) {
				item.stock = parseInt(nextLine.replace(/^\/\/ stock:/, "").trim(), 10);
			} else if (nextLine.startsWith("// effect:")) {
				const effectStr = nextLine.replace(/^\/\/ effect:/, "").trim();
				const effect = parseEffectLine(effectStr);
				if (effect) effects.push(effect);
			} else if (!foundDescription) {
				item.description = nextLine.replace(/^\/\//, "").trim();
				foundDescription = true;
			}
			i++;
		}
		if (effects.length > 0) item.effects = effects;
		items.push(item);
	}
	return items;
}

// Helper to parse effect lines
function parseEffectLine(effectStr: string): ShopItemEffect | null {
	// Supported syntaxes:
	// stat:statname:+10
	// coins:+50
	// xp:+100
	// unlock:SkillName
	// meta:description
	const parts = effectStr.split(":");
	if (parts[0] === "stat" && parts.length === 3) {
		const stat = parts[1];
		const amount = parseInt(parts[2], 10);
		if (!isNaN(amount)) return { type: "stat", stat, amount };
	} else if (parts[0] === "coins" && parts.length === 2) {
		const amount = parseInt(parts[1], 10);
		if (!isNaN(amount)) return { type: "coins", amount };
	} else if (parts[0] === "xp" && parts.length === 2) {
		const amount = parseInt(parts[1], 10);
		if (!isNaN(amount)) return { type: "xp", amount };
	} else if (parts[0] === "unlock" && parts.length === 2) {
		return { type: "unlock", skill: parts[1] };
	} else if (parts[0] === "meta" && parts.length >= 2) {
		return { type: "meta", description: parts.slice(1).join(":") };
	}
	return null;
}

// --- SHOP.md PARSER ---
export async function getAllShopItems(plugin: GamifiedObsidianPlugin): Promise<ShopItem[]> {
	const files = plugin.app.vault.getMarkdownFiles();
	const shopFile = files.find(f => f.basename.toLowerCase() === "shop");

	if (!shopFile) return [];

	const content = await plugin.app.vault.read(shopFile);
	const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

	return parseShopLinesWithDescriptions(lines);
}

// --- INVENTORY.md PARSER ---
export async function getAllInventoryItems(plugin: GamifiedObsidianPlugin): Promise<ShopItem[]> {
	const files = plugin.app.vault.getMarkdownFiles();
	const invFile = files.find(f => f.basename.toLowerCase() === "inventory");

	if (!invFile) return [];

	const content = await plugin.app.vault.read(invFile);
	const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

	return parseShopLinesWithDescriptions(lines);
}

// ShopTemplates.md PARSER
export async function getAllShopTemplates(plugin: GamifiedObsidianPlugin): Promise<ShopItem[]> {
	const files = plugin.app.vault.getMarkdownFiles();
	const templateFile = files.find(f => f.basename.toLowerCase() === "shoptemplates");

	if (!templateFile) return [];

	const content = await plugin.app.vault.read(templateFile);
	const lines = content.split("\n").map(line => line.trim()).filter(line => line.length > 0);
	return lines.map(parseShopLine); // reuse existing parser
}

export async function loadInventoryFromMarkdown(app: App): Promise<InventoryItem[]> {
	const possibleNames = ["inventory.md", "Inventory.md"];
	let file: TFile | null = null;
	for (const name of possibleNames) {
		const f = app.vault.getAbstractFileByPath(name);
		if (f && f instanceof TFile) {
			file = f;
			break;
		}
	}
	if (!file) return [];

	const content = await app.vault.read(file);
	const lines = content.split("\n").map((line: string) => line.trim());
	const items: InventoryItem[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!line || line.startsWith("//")) continue;
		// Parse item line
		const match = line.match(/^(.+?)(?: x(\d+))?( .+)?$/);
		if (match) {
			const name = match[1].trim();
			const quantity = match[2] ? parseInt(match[2], 10) : 1;
			const tags = match[3]
				? match[3].split(" ").filter((t) => t.startsWith("#"))
				: [];
			// Gather all consecutive comment lines as description
			const descriptionLines: string[] = [];
			let j = i + 1;
			while (j < lines.length && lines[j].startsWith("//")) {
				descriptionLines.push(lines[j].replace(/^\/\//, "").trim());
				j++;
			}
			const description = descriptionLines.length > 0 ? descriptionLines.join("\n") : undefined;
			items.push({ name, quantity, tags, description });
			i = j - 1; // Skip comment lines
		} else {
			// fallback: treat as name only
			items.push({ name: line.trim(), quantity: 1, tags: [], description: undefined });
		}
	}
	return items;
}

export async function writeShopItems(plugin: GamifiedObsidianPlugin, items: ShopItem[]): Promise<void> {
	const files = plugin.app.vault.getMarkdownFiles();
	const shopFile = files.find(f => f.basename.toLowerCase() === "shop");
	if (!shopFile) return;

	const lines: string[] = [];
	for (const item of items) {
		let line = "";
		if (item.icon) line += `${item.icon} `;
		line += `${item.name} #shop${item.price}`;
		if (item.category) line += ` #${item.category}`;
		if (item.rarity) line += ` #${item.rarity}`;
		if (item.tags) {
			for (const tag of item.tags) {
				if (tag !== item.category && tag !== item.rarity && !tag.startsWith("shop")) {
					line += ` #${tag}`;
				}
			}
		}
		lines.push(line);
		if (item.description) lines.push(`// ${item.description}`);
		if (item.icon) lines.push(`// icon: ${item.icon}`);
		if (typeof item.stock === "number") lines.push(`// stock: ${item.stock}`);
		if (item.effects && item.effects.length > 0) {
			for (const effect of item.effects) {
				if (effect.type === "stat") {
					lines.push(`// effect: stat:${effect.stat}:${effect.amount}`);
				} else if (effect.type === "coins") {
					lines.push(`// effect: coins:${effect.amount}`);
				} else if (effect.type === "xp") {
					lines.push(`// effect: xp:${effect.amount}`);
				} else if (effect.type === "unlock") {
					lines.push(`// effect: unlock:${effect.skill}`);
				} else if (effect.type === "meta") {
					lines.push(`// effect: meta:${effect.description}`);
				}
			}
		}
	}
	await plugin.app.vault.modify(shopFile, lines.join("\n"));
}


