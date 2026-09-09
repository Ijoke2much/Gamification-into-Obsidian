import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import { getPluginAssetUrl } from './pluginAssetUrl';

type GearSlot = 'head' | 'body' | 'hands' | 'feet' | 'weapon' | 'accessory' | 'tool';

export const PIXEL_SPRITES = {
	weapons: {
		sword: 'assets/sprites/weapons/sword.png',
		dagger: 'assets/sprites/weapons/dagger.png',
		staff: 'assets/sprites/weapons/staff.png',
		bow: 'assets/sprites/weapons/bow.png',
		hammer: 'assets/sprites/weapons/hammer.png',
		shield: 'assets/sprites/weapons/shield.png',
	},
	gear: {
		hood: 'assets/sprites/gear/hood.png',
		vest: 'assets/sprites/gear/vest.png',
		gloves: 'assets/sprites/gear/gloves.png',
		boots: 'assets/sprites/gear/boots.png',
		tag: 'assets/sprites/gear/tag.png',
		notebook: 'assets/sprites/gear/notebook.png',
		timer: 'assets/sprites/gear/timer.png',
	},
	slots: {
		head: 'assets/sprites/gear/slot-head.png',
		body: 'assets/sprites/gear/slot-body.png',
		hands: 'assets/sprites/gear/slot-hands.png',
		feet: 'assets/sprites/gear/slot-feet.png',
		weapon: 'assets/sprites/gear/slot-weapon.png',
		accessory: 'assets/sprites/gear/slot-accessory.png',
		tool: 'assets/sprites/gear/slot-tool.png',
	} satisfies Record<GearSlot, string>,
	foes: {
		'wandering-shade': 'assets/sprites/foes/wandering-shade.png',
		'sloth-ghost': 'assets/sprites/foes/sloth-ghost.png',
		'inbox-hydra': 'assets/sprites/foes/inbox-hydra.png',
		'deadline-wraith': 'assets/sprites/foes/deadline-wraith.png',
		procrastinator: 'assets/sprites/foes/procrastinator.png',
	},
} as const;

const DOLL_TO_SPRITE: Record<string, string> = {
	'worn-hood': PIXEL_SPRITES.gear.hood,
	'practice-vest': PIXEL_SPRITES.gear.vest,
	'wrap-gloves': PIXEL_SPRITES.gear.gloves,
	'trail-boots': PIXEL_SPRITES.gear.boots,
	'practice-blade': PIXEL_SPRITES.weapons.sword,
	'hunter-tag': PIXEL_SPRITES.gear.tag,
	'field-notebook': PIXEL_SPRITES.gear.notebook,
};

const NAME_TO_SPRITE: Record<string, string> = {
	'worn hood': PIXEL_SPRITES.gear.hood,
	'practice vest': PIXEL_SPRITES.gear.vest,
	'wrap gloves': PIXEL_SPRITES.gear.gloves,
	'trail boots': PIXEL_SPRITES.gear.boots,
	'practice blade': PIXEL_SPRITES.weapons.sword,
	'hunter tag': PIXEL_SPRITES.gear.tag,
	'field notebook': PIXEL_SPRITES.gear.notebook,
	'pomodoro timer': PIXEL_SPRITES.gear.timer,
};

export interface SpriteLookupItem {
	name?: string;
	icon?: string;
	effects?: unknown[];
}

export type ResolvedDisplayIcon =
	| { kind: 'img'; src: string }
	| { kind: 'emoji'; text: string };

function isRemoteOrAppUrl(value: string): boolean {
	return (
		value.startsWith('http://') ||
		value.startsWith('https://') ||
		value.startsWith('app://') ||
		value.startsWith('data:')
	);
}

export function isImageIconPath(value: string | undefined): boolean {
	if (!value) return false;
	const v = value.trim();
	if (!v) return false;
	if (isRemoteOrAppUrl(v)) return true;
	return /\.(png|jpe?g|gif|webp|svg)$/i.test(v);
}

export function isPluginSpritePath(value: string): boolean {
	return value.replace(/^\//, '').startsWith('assets/sprites/');
}

function spriteFromEffects(effects: unknown[] | undefined): string | null {
	if (!effects) return null;
	for (const raw of effects) {
		if (typeof raw !== 'string') continue;
		const match = raw.match(/doll\s*=\s*([a-z0-9-]+)/i);
		if (match) {
			const path = DOLL_TO_SPRITE[match[1].toLowerCase()];
			if (path) return path;
		}
	}
	return null;
}

function spriteFromName(name: string | undefined): string | null {
	if (!name) return null;
	const key = name.trim().toLowerCase();
	if (NAME_TO_SPRITE[key]) return NAME_TO_SPRITE[key];
	if (key.includes('pomodoro') || (key.includes('timer') && !key.includes('hour'))) {
		return PIXEL_SPRITES.gear.timer;
	}
	if (key.includes('dagger') || key.includes('knife')) return PIXEL_SPRITES.weapons.dagger;
	if (key.includes('sword') || key.includes('blade')) return PIXEL_SPRITES.weapons.sword;
	if (key.includes('staff') || key.includes('wand')) return PIXEL_SPRITES.weapons.staff;
	if (key.includes('bow')) return PIXEL_SPRITES.weapons.bow;
	if (key.includes('hammer')) return PIXEL_SPRITES.weapons.hammer;
	if (key.includes('shield')) return PIXEL_SPRITES.weapons.shield;
	if (key.includes('hood') || key.includes('helm') || key.includes('hat')) return PIXEL_SPRITES.gear.hood;
	if (key.includes('vest') || key.includes('coat') || key.includes('armor')) return PIXEL_SPRITES.gear.vest;
	if (key.includes('glove') || key.includes('wrap')) return PIXEL_SPRITES.gear.gloves;
	if (key.includes('boot')) return PIXEL_SPRITES.gear.boots;
	if (key.includes('notebook') || key.includes('journal')) return PIXEL_SPRITES.gear.notebook;
	if (key.includes('tag') || key.includes('plaque')) return PIXEL_SPRITES.gear.tag;
	return null;
}

function resolvePathToUrl(path: string, app?: App): string | null {
	const trimmed = path.trim();
	if (!trimmed) return null;
	if (isRemoteOrAppUrl(trimmed)) return trimmed;

	if (isPluginSpritePath(trimmed)) {
		const url = getPluginAssetUrl(trimmed, app);
		if (url) return url;
	}

	const obsidianApp =
		app ?? (typeof window !== 'undefined' ? (window as { app?: App }).app : undefined);
	if (!obsidianApp) return isPluginSpritePath(trimmed) ? null : trimmed;

	const file = obsidianApp.vault.getAbstractFileByPath(trimmed);
	if (file instanceof TFile) {
		return obsidianApp.vault.adapter.getResourcePath(file.path);
	}

	if (isImageIconPath(trimmed) && !isPluginSpritePath(trimmed)) {
		return trimmed;
	}

	const pluginUrl = getPluginAssetUrl(trimmed, app);
	return pluginUrl || null;
}

export function resolveItemSpritePath(item?: SpriteLookupItem | null): string | null {
	if (!item) return null;
	const icon = item.icon?.trim();
	if (icon && isImageIconPath(icon)) return icon.replace(/^\//, '');
	return spriteFromEffects(item.effects) ?? spriteFromName(item.name);
}

export function resolveItemDisplayIcon(
	item?: SpriteLookupItem | null,
	fallbackEmoji = '📦',
	app?: App
): ResolvedDisplayIcon {
	const path = resolveItemSpritePath(item);
	if (path) {
		const src = resolvePathToUrl(path, app);
		if (src) return { kind: 'img', src };
	}
	const icon = item?.icon?.trim();
	if (icon && !isImageIconPath(icon)) return { kind: 'emoji', text: icon };
	return { kind: 'emoji', text: fallbackEmoji };
}

export function resolveSlotSpriteUrl(slot: GearSlot, app?: App): string | null {
	return resolvePathToUrl(PIXEL_SPRITES.slots[slot], app);
}

export function bundledFoeSpritePath(foeId: string): string | undefined {
	return PIXEL_SPRITES.foes[foeId as keyof typeof PIXEL_SPRITES.foes];
}

export function resolveBundledFoeSpriteUrl(foeId: string, app?: App): string | null {
	const path = bundledFoeSpritePath(foeId);
	if (!path) return null;
	return getPluginAssetUrl(path, app) || null;
}
