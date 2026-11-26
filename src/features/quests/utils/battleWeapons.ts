/** Loadout chosen at battle start; persisted in tactical battle save. */

export type BattleWeaponId =
  | 'balanced'
  | 'greatblade'
  | 'rapier'
  | 'ward'
  | 'bulwark'
  | 'tome'
  | 'momentum'
  | 'finisher';

export interface BattleWeaponDef {
  id: BattleWeaponId;
  label: string;
  icon: string;
  blurb: string;
  /** Short tooltip line */
  summary: string;
  /** Multiplier on task (subquest) structural damage */
  taskDamageMult: number;
  /** Multiplier on battle move damage after stats */
  moveDamageMult: number;
  /** Added to crit chance (0–100 scale) */
  moveCritBonus: number;
  /** Multiplier on real-time move cooldown duration (>1 = slower) */
  moveCooldownMult: number;
  /** Softens deadline-tied HP cap (>1 = slightly higher bar from time alone) */
  timeTiedHpRelief: number;
  /** Reduces boss-applied turn block (Emergency Meeting etc.), min 1 turn if any block */
  blockTurnReduction: number;
  /** Extra bonus XP per move (still respects session cap) */
  extraMoveRewardXp: number;
  extraMoveRewardCoins: number;
  /** After completing a task, next battle move has shorter cooldown */
  momentumCooldownAfterTask: boolean;
  /** Flat XP credited toward victory animation / recap (not move cap) */
  finisherBonusXp: number;
}

export const BATTLE_WEAPONS: Record<BattleWeaponId, BattleWeaponDef> = {
  balanced: {
    id: 'balanced',
    label: 'Skill Blade',
    icon: '⚔️',
    blurb: 'No special modifiers — balanced for any project.',
    summary: 'Balanced — no special tradeoffs',
    taskDamageMult: 1,
    moveDamageMult: 1,
    moveCritBonus: 0,
    moveCooldownMult: 1,
    timeTiedHpRelief: 1,
    blockTurnReduction: 0,
    extraMoveRewardXp: 0,
    extraMoveRewardCoins: 0,
    momentumCooldownAfterTask: false,
    finisherBonusXp: 0
  },
  greatblade: {
    id: 'greatblade',
    label: 'Greatblade',
    icon: '🗡️',
    blurb: '+12% task damage; battle moves hit a bit softer (−8%).',
    summary: 'Tasks ↑ damage · moves ↓ damage',
    taskDamageMult: 1.12,
    moveDamageMult: 0.92,
    moveCritBonus: 0,
    moveCooldownMult: 1,
    timeTiedHpRelief: 1,
    blockTurnReduction: 0,
    extraMoveRewardXp: 0,
    extraMoveRewardCoins: 0,
    momentumCooldownAfterTask: false,
    finisherBonusXp: 0
  },
  rapier: {
    id: 'rapier',
    label: 'Rapier',
    icon: '🤺',
    blurb: '+12% crit chance on battle moves.',
    summary: 'Moves ↑ crit chance',
    taskDamageMult: 1,
    moveDamageMult: 1,
    moveCritBonus: 12,
    moveCooldownMult: 1,
    timeTiedHpRelief: 1,
    blockTurnReduction: 0,
    extraMoveRewardXp: 0,
    extraMoveRewardCoins: 0,
    momentumCooldownAfterTask: false,
    finisherBonusXp: 0
  },
  ward: {
    id: 'ward',
    label: 'Deadline Ward',
    icon: '🛡️',
    blurb: 'Deadline pressure is slightly gentler on the boss bar (+6% time-tied HP).',
    summary: 'Deadline bar slightly gentler',
    taskDamageMult: 1,
    moveDamageMult: 1,
    moveCritBonus: 0,
    moveCooldownMult: 1,
    timeTiedHpRelief: 1.06,
    blockTurnReduction: 0,
    extraMoveRewardXp: 0,
    extraMoveRewardCoins: 0,
    momentumCooldownAfterTask: false,
    finisherBonusXp: 0
  },
  bulwark: {
    id: 'bulwark',
    label: 'Bulwark',
    icon: '🏰',
    blurb: 'Turn-blocking boss hits are shorter by 1 turn (min 1).',
    summary: 'Shorter meeting / block turns',
    taskDamageMult: 1,
    moveDamageMult: 1,
    moveCritBonus: 0,
    moveCooldownMult: 1,
    timeTiedHpRelief: 1,
    blockTurnReduction: 1,
    extraMoveRewardXp: 0,
    extraMoveRewardCoins: 0,
    momentumCooldownAfterTask: false,
    finisherBonusXp: 0
  },
  tome: {
    id: 'tome',
    label: 'Ritual Tome',
    icon: '📖',
    blurb: '+12% move cooldowns; +1 bonus XP & +1 coin per move (still capped).',
    summary: 'Moves ↑ CD & bonus XP/coins',
    taskDamageMult: 1,
    moveDamageMult: 1,
    moveCritBonus: 0,
    moveCooldownMult: 1.12,
    timeTiedHpRelief: 1,
    blockTurnReduction: 0,
    extraMoveRewardXp: 1,
    extraMoveRewardCoins: 1,
    momentumCooldownAfterTask: false,
    finisherBonusXp: 0
  },
  momentum: {
    id: 'momentum',
    label: 'Twin Momentum',
    icon: '⚡',
    blurb: 'After each task, your next battle move recharges 15% faster.',
    summary: 'After task → next move faster',
    taskDamageMult: 1,
    moveDamageMult: 1,
    moveCritBonus: 0,
    moveCooldownMult: 1,
    timeTiedHpRelief: 1,
    blockTurnReduction: 0,
    extraMoveRewardXp: 0,
    extraMoveRewardCoins: 0,
    momentumCooldownAfterTask: true,
    finisherBonusXp: 0
  },
  finisher: {
    id: 'finisher',
    label: 'Hammer of Closure',
    icon: '🔨',
    blurb: '+15 XP in the victory tally when you complete the quest.',
    summary: 'Victory +15 XP (Hammer)',
    taskDamageMult: 1,
    moveDamageMult: 1,
    moveCritBonus: 0,
    moveCooldownMult: 1,
    timeTiedHpRelief: 1,
    blockTurnReduction: 0,
    extraMoveRewardXp: 0,
    extraMoveRewardCoins: 0,
    momentumCooldownAfterTask: false,
    finisherBonusXp: 15
  }
};

export const BATTLE_WEAPON_ORDER: BattleWeaponId[] = [
  'balanced',
  'greatblade',
  'rapier',
  'ward',
  'bulwark',
  'tome',
  'momentum',
  'finisher'
];

export function getWeaponDef(id: BattleWeaponId | string | undefined): BattleWeaponDef {
  if (id && id in BATTLE_WEAPONS) {
    return BATTLE_WEAPONS[id as BattleWeaponId];
  }
  return BATTLE_WEAPONS.balanced;
}

export function parseBattleWeaponId(raw: unknown): BattleWeaponId {
  if (typeof raw === 'string' && raw in BATTLE_WEAPONS) {
    return raw as BattleWeaponId;
  }
  return 'balanced';
}

/** Strip quantity suffix, wikilinks, common suffixes from an inventory line */
function normalizeInventoryWeaponLine(line: string): string {
  let s = line.trim();
  const wiki = /^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*/;
  const wm = s.match(wiki);
  if (wm) s = wm[1].trim();
  s = s.replace(/\s*\(equipped\)\s*/gi, '').replace(/\s*x\d+\s*$/i, '').trim();
  return s;
}

/**
 * Map a single PlayerData inventory string to a battle weapon id, if it clearly refers to one.
 * Matches: exact weapon label, `battle_weapon:id`, or `id` as whole line.
 */
export function inferBattleWeaponIdFromInventoryEntry(line: string): BattleWeaponId | null {
  const raw = line.trim();
  if (!raw) return null;

  const tag = raw.match(/battle_weapon\s*[:=]\s*([a-z0-9_]+)/i);
  if (tag && tag[1] in BATTLE_WEAPONS) {
    return tag[1] as BattleWeaponId;
  }

  const normalized = normalizeInventoryWeaponLine(raw);
  const lower = normalized.toLowerCase();
  const head = lower.split(/\s*[|·•—\-]\s*/)[0].trim();

  for (const id of BATTLE_WEAPON_ORDER) {
    const def = BATTLE_WEAPONS[id];
    const lbl = def.label.toLowerCase();
    if (lower === id || head === id || lower === lbl || head === lbl) {
      return id;
    }
  }

  return null;
}

export interface InventoryBattleWeaponRow {
  id: BattleWeaponId;
  /** Text after | or — on the inventory line, if any */
  inventoryNote?: string;
}

/**
 * Weapons available for tactical loadout from `PlayerData.inventory`.
 * If nothing matches, all catalog weapons are available (backwards compatible).
 */
export function getBattleWeaponsFromInventory(
  inventory: string[] | undefined | null
): InventoryBattleWeaponRow[] {
  const inv = inventory ?? [];
  const rows: InventoryBattleWeaponRow[] = [];
  const seen = new Set<BattleWeaponId>();

  for (const line of inv) {
    const id = inferBattleWeaponIdFromInventoryEntry(line);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const raw = line.trim();
    const normalized = normalizeInventoryWeaponLine(raw);
    let inventoryNote: string | undefined;
    const sep = normalized.match(/\s*[|·•—\-]\s*(.+)$/);
    if (sep) inventoryNote = sep[1].trim();
    rows.push({ id, inventoryNote });
  }

  if (rows.length === 0) {
    return BATTLE_WEAPON_ORDER.map(id => ({ id }));
  }

  return rows.sort(
    (a, b) => BATTLE_WEAPON_ORDER.indexOf(a.id) - BATTLE_WEAPON_ORDER.indexOf(b.id)
  );
}

/** If id is not owned (or catalog fallback disallows), pick first allowed weapon. */
export function clampBattleWeaponToInventory(
  id: BattleWeaponId,
  inventory: string[] | undefined | null
): BattleWeaponId {
  const rows = getBattleWeaponsFromInventory(inventory);
  const allowed = new Set(rows.map(r => r.id));
  if (allowed.has(id)) return id;
  return rows[0]?.id ?? 'balanced';
}
