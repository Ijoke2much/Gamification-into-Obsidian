import { App, TFile, Vault } from 'obsidian';
import { InventoryItem, readInventory, writeInventory } from './updateInventoryFile';

export const GEAR_FILE_PATH = 'Gear.md';

export type GearSlot =
  | 'head'
  | 'body'
  | 'hands'
  | 'feet'
  | 'weapon'
  | 'accessory'
  | 'tool';

export const GEAR_SLOTS: GearSlot[] = [
  'head',
  'body',
  'hands',
  'feet',
  'weapon',
  'accessory',
  'tool',
];

export const GEAR_SLOT_LABELS: Record<GearSlot, string> = {
  head: 'Head',
  body: 'Body',
  hands: 'Hands',
  feet: 'Feet',
  weapon: 'Weapon',
  accessory: 'Accessory',
  tool: 'Tool',
};

export type GearEffectKey =
  | 'energyCostReduction'
  | 'materialDropBonus'
  | 'coinBonus'
  | 'xpBonus'
  | 'bossDamageBonus'
  | 'craftingSuccessBonus'
  | 'focusSessionBonus'
  | 'distractionResistance';

export interface GearSlotState {
  slot: GearSlot;
  itemName: string | null;
}

export interface EquippedGearItem extends GearSlotState {
  item: InventoryItem | null;
}

export type GearLoadout = Record<GearSlot, string | null>;

export type LoadoutSlot = 'a' | 'b';

export const LOADOUT_SLOTS: LoadoutSlot[] = ['a', 'b'];

export const LOADOUT_SLOT_LABELS: Record<LoadoutSlot, string> = {
  a: 'Brought A',
  b: 'Brought B',
};

export type BattleLoadout = Record<LoadoutSlot, string | null>;

export interface HunterKit {
  look: GearLoadout;
  loadout: BattleLoadout;
}

export interface EquippedLoadoutItem {
  slot: LoadoutSlot;
  itemName: string | null;
  item: InventoryItem | null;
}

export interface GearBonuses {
  effects: Partial<Record<GearEffectKey, number>>;
  equippedItems: EquippedGearItem[];
}

export const GEAR_SLOT_ICONS: Record<GearSlot, string> = {
  head: '🪖',
  body: '👕',
  hands: '🧤',
  feet: '🥾',
  weapon: '⚔️',
  accessory: '💍',
  tool: '🔧',
};

const EFFECT_ALIASES: Record<string, GearEffectKey> = {
  energy: 'energyCostReduction',
  energycost: 'energyCostReduction',
  energycostreduction: 'energyCostReduction',
  material: 'materialDropBonus',
  materials: 'materialDropBonus',
  materialdrop: 'materialDropBonus',
  materialdropbonus: 'materialDropBonus',
  coins: 'coinBonus',
  coin: 'coinBonus',
  coinbonus: 'coinBonus',
  xp: 'xpBonus',
  xpbonus: 'xpBonus',
  boss: 'bossDamageBonus',
  bossdamage: 'bossDamageBonus',
  bossdamagebonus: 'bossDamageBonus',
  crafting: 'craftingSuccessBonus',
  craftingsuccess: 'craftingSuccessBonus',
  craftingsuccessbonus: 'craftingSuccessBonus',
  focus: 'focusSessionBonus',
  focussession: 'focusSessionBonus',
  focussessionbonus: 'focusSessionBonus',
  distraction: 'distractionResistance',
  distractionresistance: 'distractionResistance',
};

export function createEmptyGearLoadout(): GearLoadout {
  return GEAR_SLOTS.reduce((loadout, slot) => {
    loadout[slot] = null;
    return loadout;
  }, {} as GearLoadout);
}

export function createEmptyBattleLoadout(): BattleLoadout {
  return { a: null, b: null };
}

export function createEmptyHunterKit(): HunterKit {
  return {
    look: createEmptyGearLoadout(),
    loadout: createEmptyBattleLoadout(),
  };
}

export function inferGearSlot(item: Pick<InventoryItem, 'name' | 'category' | 'tags'>): GearSlot {
  const hay = [item.category, ...(item.tags ?? []), item.name].join(' ').toLowerCase();
  if (/\b(head|helm|helmet|hat|crown|circlet|hood|cap|mask)\b/.test(hay)) return 'head';
  if (/\b(feet|foot|boot|boots|shoe|shoes|greave)\b/.test(hay)) return 'feet';
  if (/\b(hand|hands|glove|gloves|gauntlet)\b/.test(hay)) return 'hands';
  if (/\b(weapon|sword|blade|axe|bow|staff|wand|hammer|dagger)\b/.test(hay)) return 'weapon';
  if (/\b(tool|timer|board|planner|desk|pomodoro)\b/.test(hay)) return 'tool';
  if (/\b(body|armor|chest|mail|robe|cloak|plate)\b/.test(hay)) return 'body';
  if (/\b(accessory|ring|amulet|necklace|pendant|trinket)\b/.test(hay)) return 'accessory';
  return 'accessory';
}

function normalizeLoadoutSlot(value: string): LoadoutSlot | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  if (normalized === 'a' || normalized === 'broughta' || normalized === '1') return 'a';
  if (normalized === 'b' || normalized === 'broughtb' || normalized === '2') return 'b';
  return null;
}

export function parseHunterKit(content: string): HunterKit {
  const kit = createEmptyHunterKit();
  let section: 'look' | 'loadout' | 'flat' = 'flat';

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;

    const heading = line.match(/^#{1,3}\s*(.+)$/);
    if (heading) {
      const title = heading[1].trim().toLowerCase();
      if (title.startsWith('loadout') || title.startsWith('brought')) {
        section = 'loadout';
      } else if (title.startsWith('look') || title.startsWith('gear')) {
        section = 'look';
      }
      continue;
    }

    const match = line.match(/^([A-Za-z0-9]+):\s*(.*)$/);
    if (!match) continue;

    const itemName = match[2].trim() || null;
    if (section === 'loadout') {
      const loadoutSlot = normalizeLoadoutSlot(match[1]);
      if (loadoutSlot) kit.loadout[loadoutSlot] = itemName;
      continue;
    }

    const lookSlot = normalizeSlot(match[1]);
    if (lookSlot) kit.look[lookSlot] = itemName;
  }

  return kit;
}

/** Look slots only — older Gear.md files without sections still parse. */
export function parseGearFile(content: string): GearLoadout {
  return parseHunterKit(content).look;
}

export function generateHunterKitContent(kit: HunterKit): string {
  const lines = [
    '# Gear',
    '',
    '// Managed by Gamification into Obsidian.',
    '// Look = dream equipment on the hunter portrait. Loadout = tools you bring to work.',
    '// Dream combat stats (ATK/DEF/HP) come from look gear. Skill CP still comes from practice.',
    '',
    '## Look',
    '',
  ];

  for (const slot of GEAR_SLOTS) {
    lines.push(`${GEAR_SLOT_LABELS[slot]}: ${kit.look[slot] ?? ''}`);
  }

  lines.push('', '## Loadout', '');
  for (const slot of LOADOUT_SLOTS) {
    lines.push(`${slot.toUpperCase()}: ${kit.loadout[slot] ?? ''}`);
  }

  return `${lines.join('\n')}\n`;
}

export function generateGearFileContent(loadout: GearLoadout): string {
  return generateHunterKitContent({
    look: loadout,
    loadout: createEmptyBattleLoadout(),
  });
}

export async function readHunterKit(vault: Vault, gearFilePath = GEAR_FILE_PATH): Promise<HunterKit> {
  const file = vault.getAbstractFileByPath(gearFilePath);
  if (!(file instanceof TFile)) {
    return createEmptyHunterKit();
  }

  const content = await vault.read(file);
  return parseHunterKit(content);
}

export async function writeHunterKit(
  vault: Vault,
  kit: HunterKit,
  gearFilePath = GEAR_FILE_PATH
): Promise<void> {
  const content = generateHunterKitContent(kit);
  const file = vault.getAbstractFileByPath(gearFilePath);

  if (file instanceof TFile) {
    await vault.modify(file, content);
  } else {
    await vault.create(gearFilePath, content);
  }

  dispatchGearUpdatedEvent();
}

export async function readGearLoadout(vault: Vault, gearFilePath = GEAR_FILE_PATH): Promise<GearLoadout> {
  const kit = await readHunterKit(vault, gearFilePath);
  return kit.look;
}

export async function writeGearLoadout(
  vault: Vault,
  loadout: GearLoadout,
  gearFilePath = GEAR_FILE_PATH
): Promise<void> {
  const kit = await readHunterKit(vault, gearFilePath);
  kit.look = loadout;
  await writeHunterKit(vault, kit, gearFilePath);
}

export async function equipInventoryItemToGearSlot(
  app: App,
  itemName: string,
  slot: GearSlot,
  gearFilePath = GEAR_FILE_PATH
): Promise<GearLoadout> {
  const inventory = await readInventory(app.vault);
  const item = inventory.find((candidate) => candidate.name === itemName);
  if (!item) {
    throw new Error(`Cannot equip "${itemName}" because it is not in inventory.`);
  }

  const kit = await readHunterKit(app.vault, gearFilePath);
  for (const other of GEAR_SLOTS) {
    if (kit.look[other] === item.name) kit.look[other] = null;
  }
  kit.look[slot] = item.name;
  await writeHunterKit(app.vault, kit, gearFilePath);
  return kit.look;
}

export async function unequipGearSlot(
  vault: Vault,
  slot: GearSlot,
  gearFilePath = GEAR_FILE_PATH
): Promise<GearLoadout> {
  const kit = await readHunterKit(vault, gearFilePath);
  kit.look[slot] = null;
  await writeHunterKit(vault, kit, gearFilePath);
  return kit.look;
}

export async function equipInventoryItemToLoadoutSlot(
  app: App,
  itemName: string,
  slot: LoadoutSlot,
  gearFilePath = GEAR_FILE_PATH
): Promise<HunterKit> {
  const inventory = await readInventory(app.vault);
  const item = inventory.find((candidate) => candidate.name === itemName);
  if (!item) {
    throw new Error(`Cannot bring "${itemName}" because it is not in inventory.`);
  }

  const kit = await readHunterKit(app.vault, gearFilePath);
  for (const other of LOADOUT_SLOTS) {
    if (kit.loadout[other] === item.name) kit.loadout[other] = null;
  }
  kit.loadout[slot] = item.name;
  await writeHunterKit(app.vault, kit, gearFilePath);
  return kit;
}

export async function unequipLoadoutSlot(
  vault: Vault,
  slot: LoadoutSlot,
  gearFilePath = GEAR_FILE_PATH
): Promise<HunterKit> {
  const kit = await readHunterKit(vault, gearFilePath);
  kit.loadout[slot] = null;
  await writeHunterKit(vault, kit, gearFilePath);
  return kit;
}

export function kitItemNames(kit: HunterKit): Set<string> {
  const names = new Set<string>();
  for (const name of Object.values(kit.look)) {
    if (name) names.add(name);
  }
  for (const name of Object.values(kit.loadout)) {
    if (name) names.add(name);
  }
  return names;
}

export async function getHunterKitItems(
  app: App,
  gearFilePath = GEAR_FILE_PATH
): Promise<{ kit: HunterKit; look: EquippedGearItem[]; loadout: EquippedLoadoutItem[] }> {
  const [kit, inventory] = await Promise.all([
    readHunterKit(app.vault, gearFilePath),
    readInventory(app.vault),
  ]);

  const findItem = (itemName: string | null) =>
    itemName ? inventory.find((candidate) => candidate.name === itemName) ?? null : null;

  return {
    kit,
    look: GEAR_SLOTS.map((slot) => ({
      slot,
      itemName: kit.look[slot],
      item: findItem(kit.look[slot]),
    })),
    loadout: LOADOUT_SLOTS.map((slot) => ({
      slot,
      itemName: kit.loadout[slot],
      item: findItem(kit.loadout[slot]),
    })),
  };
}

export async function getEquippedGearItems(
  app: App,
  gearFilePath = GEAR_FILE_PATH
): Promise<EquippedGearItem[]> {
  const [loadout, inventory] = await Promise.all([
    readGearLoadout(app.vault, gearFilePath),
    readInventory(app.vault),
  ]);

  return GEAR_SLOTS.map((slot) => {
    const itemName = loadout[slot];
    return {
      slot,
      itemName,
      item: itemName ? inventory.find((candidate) => candidate.name === itemName) ?? null : null,
    };
  });
}

export async function calculateGearBonuses(
  app: App,
  gearFilePath = GEAR_FILE_PATH
): Promise<GearBonuses> {
  const equippedItems = await getEquippedGearItems(app, gearFilePath);
  const effects: Partial<Record<GearEffectKey, number>> = {};

  for (const equipped of equippedItems) {
    for (const effectLine of equipped.item?.effects ?? []) {
      const parsed = parseGearEffect(effectLine);
      if (!parsed) continue;

      effects[parsed.key] = (effects[parsed.key] ?? 0) + parsed.value;
    }
  }

  return { effects, equippedItems };
}

export async function syncKitEquippedTags(app: App, kit: HunterKit): Promise<void> {
  const inventory = await readInventory(app.vault);
  const worn = kitItemNames(kit);
  let changed = false;
  for (const item of inventory) {
    const shouldWear = worn.has(item.name);
    const hasTag = (item.tags ?? []).includes('equipped');
    if (shouldWear && !hasTag) {
      item.tags = [...(item.tags ?? []), 'equipped'];
      changed = true;
    } else if (!shouldWear && hasTag) {
      item.tags = (item.tags ?? []).filter((tag) => tag !== 'equipped');
      changed = true;
    }
  }
  if (changed) {
    await writeInventory(app.vault, inventory);
  }
}

export function parseGearEffect(effectLine: string): { key: GearEffectKey; value: number } | null {
  const normalized = effectLine.trim().toLowerCase();
  const match = normalized.match(/^(?:gear:)?([a-z-]+)\s*[:=]\s*([+-]?\d+(?:\.\d+)?%?)$/);
  if (!match) return null;

  const key = EFFECT_ALIASES[match[1].replace(/-/g, '')];
  if (!key) return null;

  const rawValue = match[2];
  const numericValue = parseFloat(rawValue.replace('%', ''));
  if (!Number.isFinite(numericValue)) return null;

  const value = rawValue.includes('%') ? numericValue / 100 : numericValue;
  return { key, value };
}

function normalizeSlot(value: string): GearSlot | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  return GEAR_SLOTS.find((slot) => slot === normalized) ?? null;
}

function dispatchGearUpdatedEvent(): void {
  try {
    window?.dispatchEvent?.(new CustomEvent('gear-updated'));
  } catch {
    // Ignore dispatch errors outside the browser runtime.
  }
}
