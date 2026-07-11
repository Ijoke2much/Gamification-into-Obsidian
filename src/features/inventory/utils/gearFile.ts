import { App, TFile, Vault } from 'obsidian';
import { InventoryItem, readInventory } from './updateInventoryFile';

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

export interface GearBonuses {
  effects: Partial<Record<GearEffectKey, number>>;
  equippedItems: EquippedGearItem[];
}

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

export function parseGearFile(content: string): GearLoadout {
  const loadout = createEmptyGearLoadout();
  const lines = content.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    const match = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (!match) continue;

    const slot = normalizeSlot(match[1]);
    if (!slot) continue;

    const itemName = match[2].trim();
    loadout[slot] = itemName || null;
  }

  return loadout;
}

export function generateGearFileContent(loadout: GearLoadout): string {
  const lines = [
    '# Gear Loadout',
    '',
    '// Managed by Gamification into Obsidian.',
    '// Equipment here supports rewards, energy, crafting, and boss battle calculations.',
    '// Skill CP should still come from real practice, not gear bonuses.',
    '',
  ];

  for (const slot of GEAR_SLOTS) {
    lines.push(`${GEAR_SLOT_LABELS[slot]}: ${loadout[slot] ?? ''}`);
  }

  return `${lines.join('\n')}\n`;
}

export async function readGearLoadout(vault: Vault, gearFilePath = GEAR_FILE_PATH): Promise<GearLoadout> {
  const file = vault.getAbstractFileByPath(gearFilePath);
  if (!(file instanceof TFile)) {
    return createEmptyGearLoadout();
  }

  const content = await vault.read(file);
  return parseGearFile(content);
}

export async function writeGearLoadout(
  vault: Vault,
  loadout: GearLoadout,
  gearFilePath = GEAR_FILE_PATH
): Promise<void> {
  const content = generateGearFileContent(loadout);
  const file = vault.getAbstractFileByPath(gearFilePath);

  if (file instanceof TFile) {
    await vault.modify(file, content);
  } else {
    await vault.create(gearFilePath, content);
  }

  dispatchGearUpdatedEvent();
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

  const loadout = await readGearLoadout(app.vault, gearFilePath);
  loadout[slot] = item.name;
  await writeGearLoadout(app.vault, loadout, gearFilePath);
  return loadout;
}

export async function unequipGearSlot(
  vault: Vault,
  slot: GearSlot,
  gearFilePath = GEAR_FILE_PATH
): Promise<GearLoadout> {
  const loadout = await readGearLoadout(vault, gearFilePath);
  loadout[slot] = null;
  await writeGearLoadout(vault, loadout, gearFilePath);
  return loadout;
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
