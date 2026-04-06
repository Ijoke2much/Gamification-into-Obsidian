import { App, Vault, TFile, Notice } from "obsidian";
import { showGameNotice } from '../../../shared/utils/noticeUtils';
import { ShopItem, ShopLikeItem } from "../../shop/utils/ShopParser";
import { readPlayerData, updatePlayerData } from "../../player/utils/playerDataUtils";
import type { PlayerData, Artifact } from "../../../data/models/PlayerData";
import { addBuff, addDebuff, parseDurationToMs, BuffKind } from "../../../shared/utils/buffEngine";
import { EnhancedInventoryParser } from "./enhancedInventoryParser";
// Remove: import { InventoryItem } from "./InventoryParser";

// --- Add a simple InventoryItem type and parser for now ---
export interface InventoryItem {
  name: string;
  category?: string;
  rarity?: string;
  description?: string;
  icon?: string;
  stock?: number;
  quantity?: number;
  value?: number; // Base value for selling/trading
  price?: number; // Original purchase price (for recomputing value if needed)
  effects?: string[]; // Special effects or uses (parsed from // effect: lines)
  tags: string[]; // <-- Add this line
  usesRemaining?: number;
}

// Helper function to convert ShopItem to ShopLikeItem
function shopItemToShopLikeItem(item: ShopItem): ShopLikeItem {
  const { effects, ...rest } = item;
  return {
    ...rest,
    effects: effects?.map(effect => {
      if (typeof effect === 'string') return effect;
      if (effect.type === 'stat') return `${effect.stat} +${effect.amount}`;
      if (effect.type === 'coins') return `Coins +${effect.amount}`;
      if (effect.type === 'xp') return `XP +${effect.amount}`;
      if (effect.type === 'unlock') return `Unlock: ${effect.skill}`;
      if (effect.type === 'meta') return effect.description;
      return 'Unknown effect';
    })
  };
}

// Centralized inventory file path constant
export const INVENTORY_FILE_PATH = 'Inventory.md';

function dispatchInventoryUpdatedEvent(): void {
  try {
    // @ts-ignore
    window?.dispatchEvent?.(new CustomEvent('inventory-updated'));
  } catch {
    // Ignore dispatch errors silently
  }
}

// Use enhanced parser instead of basic parser
function parseInventoryFile(content: string): InventoryItem[] {
  // Convert enhanced items to basic items for compatibility
  const enhancedItems = EnhancedInventoryParser.parseInventoryFile(content);
  return enhancedItems.map(item => ({
    name: item.name,
    category: item.category,
    rarity: item.rarity,
    description: item.description,
    icon: item.icon,
    stock: item.stock,
    quantity: item.quantity,
    value: item.value,
    price: item.price,
    effects: item.effects,
    tags: item.tags || [],
    usesRemaining: (item as any).usesRemaining
  }));
}

export function computeSellValue(
  item: { price?: number; rarity?: string; category?: string },
  player?: PlayerData
): number {
  const price = Math.max(0, Number(item.price ?? 0));
  if (!price) return 0;

  const rarityMul: Record<string, number> = {
    common: 0.4,
    uncommon: 0.5,
    rare: 0.6,
    epic: 0.7,
    legendary: 0.8,
  };
  let multiplier = rarityMul[(item.rarity || 'common').toLowerCase()] ?? 0.4;

  const category = (item.category || '').toLowerCase();
  if (category === 'consumable' || category === 'potion' || category === 'food') multiplier -= 0.05;
  if (category === 'equipment') multiplier += 0.05;

  if (player) {
    const rep = Math.max(-100, Math.min(100, Number((player as PlayerData & { questReputation?: number }).questReputation ?? 0)));
    multiplier += rep / 1000; // -0.1..+0.1

    const buffs = (player as PlayerData & { buffs?: Array<{ type?: string; value?: number }> }).buffs ?? [];
    const debuffs = (player as PlayerData & { debuffs?: Array<{ type?: string; value?: number }> }).debuffs ?? [];
    const tradeBuffMul = buffs
      .filter((b) => (b.type || '').includes('trade') || (b.type || '').includes('rewards'))
      .reduce((acc: number, b) => acc * Math.max(0, Number(b.value ?? 1)), 1);
    const tradeDebuffMul = debuffs
      .filter((d) => (d.type || '').includes('trade') || (d.type || '').includes('rewards'))
      .reduce((acc: number, d) => acc * Math.max(0, Number(d.value ?? 1)), 1);
    multiplier *= tradeBuffMul;
    multiplier /= tradeDebuffMul || 1;
  }

  multiplier = Math.max(0.2, Math.min(0.9, multiplier));
  return Math.max(1, Math.floor(price * multiplier));
}

/**
 * Adds or increments an item in Inventory.md in the vault root.
 * If the item exists, increments its quantity (xN). If not, adds it as a new entry with x1.
 * Preserves associated comments (description, icon, etc.).
 */
export async function addOrIncrementInventoryItem(app: App, item: ShopItem | ShopLikeItem, quantity = 1, inventoryFilePath = INVENTORY_FILE_PATH): Promise<void> {
  // Convert ShopItem to ShopLikeItem if needed
  const shopLikeItem: ShopLikeItem = 'effects' in item && Array.isArray(item.effects) && item.effects.length > 0 && typeof item.effects[0] === 'object'
    ? shopItemToShopLikeItem(item as ShopItem)
    : item as ShopLikeItem;
  let inventoryFile = app.vault.getAbstractFileByPath(inventoryFilePath);
  if (!inventoryFile) {
    // Create Inventory.md if it doesn't exist
    await app.vault.create(inventoryFilePath, "");
    inventoryFile = app.vault.getAbstractFileByPath(inventoryFilePath);
  }
  if (!(inventoryFile instanceof TFile)) {
    throw new Error("Expected TFile but got TAbstractFile");
  }
  const playerData = await readPlayerData(app.vault);
  const content = await app.vault.read(inventoryFile);
  const lines = content.split("\n");
  const tags = [shopLikeItem.category, shopLikeItem.rarity].filter(Boolean);
  // Relaxed: just match by name and optional quantity
  const itemLineRegex = new RegExp(`^${escapeRegExp(shopLikeItem.name)}(?: x(\\d+))?\\b`);
  let found = false;
  const updatedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (itemLineRegex.test(line)) {
      // Found the item, increment quantity
      found = true;
      const match = line.match(/ x(\d+)/);
      const currentQty = match ? parseInt(match[1]) : 1;
      const newQty = currentQty + quantity;
      // Replace the line with updated quantity
      const baseLine = line.replace(/ x\d+/, "").replace(/\s+$/, "");
      updatedLines.push(`${baseLine} x${newQty}`);
      // Copy associated comments
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith("//")) {
        updatedLines.push(lines[j]);
        j++;
      }
      i = j - 1;
    } else {
      updatedLines.push(line);
    }
  }
  if (!found) {
    // Add new item at the end
    let newEntry = `\n${shopLikeItem.name} x${quantity} ${tags.map(t => `#${t}`).join(" ")}`;
    if (shopLikeItem.description) newEntry += `\n// ${shopLikeItem.description}`;
    if (shopLikeItem.icon) newEntry += `\n// icon:${shopLikeItem.icon}`;
    if (typeof shopLikeItem.price === 'number') {
      const sellValue = computeSellValue({ price: shopLikeItem.price, rarity: shopLikeItem.rarity, category: shopLikeItem.category }, playerData ?? undefined);
      newEntry += `\n// price:${shopLikeItem.price}`;
      newEntry += `\n// value:${sellValue}`;
    }
    if (Array.isArray(shopLikeItem.effects)) {
      for (const eff of shopLikeItem.effects!) {
        newEntry += `\n// effect:${eff}`;
      }
    }
    const rawLines = (shopLikeItem as ShopLikeItem & { rawEffectLines?: string[] }).rawEffectLines;
    if (Array.isArray(rawLines) && rawLines.length) {
      for (const raw of rawLines) {
        newEntry += `\n// effect:${raw}`;
      }
    }
    updatedLines.push(newEntry);
  }
  await app.vault.modify(inventoryFile, updatedLines.join("\n"));
  dispatchInventoryUpdatedEvent();
}

export async function readInventory(vault: Vault, inventoryFilePath = INVENTORY_FILE_PATH): Promise<InventoryItem[]> {
  const inventoryFile = vault.getAbstractFileByPath(inventoryFilePath);
  if (!(inventoryFile instanceof TFile)) {
    return [];
  }
  const content = await vault.read(inventoryFile);
  return parseInventoryFile(content);
}

export async function addItemToInventory(vault: Vault, item: InventoryItem, inventoryFilePath = INVENTORY_FILE_PATH): Promise<void> {
  let inventoryFile = vault.getAbstractFileByPath(inventoryFilePath);
  if (!inventoryFile) {
    await vault.create(inventoryFilePath, "");
    inventoryFile = vault.getAbstractFileByPath(inventoryFilePath);
  }
  if (!(inventoryFile instanceof TFile)) {
    throw new Error("Expected TFile but got TAbstractFile");
  }
  const content = await vault.read(inventoryFile);
  const lines = content.split("\n");
  const tags = [item.category, item.rarity].filter(Boolean);
  const itemLineRegex = new RegExp(`^${escapeRegExp(item.name)}(?: x(\\d+))?\\b`);
  let found = false;
  const updatedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (itemLineRegex.test(line)) {
      // Found the item, increment quantity
      found = true;
      const match = line.match(/ x(\d+)/);
      const currentQty = match ? parseInt(match[1]) : 1;
      const newQty = currentQty + 1; // Add one item
      // Replace the line with updated quantity
      const baseLine = line.replace(/ x\d+/, "").replace(/\s+$/, "");
      updatedLines.push(`${baseLine} x${newQty}`);
      // Copy associated comments
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith("//")) {
        updatedLines.push(lines[j]);
        j++;
      }
      i = j - 1;
    } else {
      updatedLines.push(line);
    }
  }
  if (!found) {
    // Add new item at the end
    let newEntry = `\n${item.name} x1 ${tags.map(t => `#${t}`).join(" ")}`;
    if (item.description) newEntry += `\n// ${item.description}`;
    if (item.icon) newEntry += `\n// icon:${item.icon}`;
    updatedLines.push(newEntry);
  }
  await vault.modify(inventoryFile, updatedLines.join("\n"));
  dispatchInventoryUpdatedEvent();
}

export async function removeItemFromInventory(vault: Vault, itemName: string, inventoryFilePath = INVENTORY_FILE_PATH): Promise<void> {
  const inventoryFile = vault.getAbstractFileByPath(inventoryFilePath);
  if (!(inventoryFile instanceof TFile)) {
    return;
  }
  const content = await vault.read(inventoryFile);
  const lines = content.split("\n");
  // This regex is a placeholder; you may want to improve it for your use case
  const itemLineRegex = new RegExp(`^${escapeRegExp(itemName)}(?: x(\\d+))?`);
  const updatedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (itemLineRegex.test(line)) {
      // Found the item, remove it and associated comments
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith("//")) {
        j++;
      }
      i = j - 1;
    } else {
      updatedLines.push(line);
    }
  }
  await vault.modify(inventoryFile, updatedLines.join("\n"));
  dispatchInventoryUpdatedEvent();
}

export async function writeInventory(vault: Vault, inventory: InventoryItem[], inventoryFilePath = INVENTORY_FILE_PATH): Promise<void> {
  let inventoryFile = vault.getAbstractFileByPath(inventoryFilePath);
  if (!inventoryFile) {
    await vault.create(inventoryFilePath, "");
    inventoryFile = vault.getAbstractFileByPath(inventoryFilePath);
  }
  if (!(inventoryFile instanceof TFile)) {
    throw new Error("Expected TFile but got TAbstractFile");
  }
  // Use enhanced parser for writing clean content
  const enhancedItems = inventory.map(item => ({
    ...item,
    isFavorite: false,
    acquiredDate: new Date().toISOString(),
    usageCount: 0,
    isEquipped: (item.tags || []).includes('equipped'),
    usesRemaining: item.usesRemaining
  }));

  const content = EnhancedInventoryParser.generateInventoryContent(enhancedItems);
  await vault.modify(inventoryFile, content);
  dispatchInventoryUpdatedEvent();
}

// Update dropInventoryItem to use writeInventory directly
export async function dropInventoryItem(app: App, itemName: string): Promise<void> {
  // Delegate to unified dropItem
  await dropItem(app, itemName);
}

// Drop an item from inventory by name
export async function dropItem(app: App, itemName: string): Promise<void> {
  const inventory = await readInventory(app.vault);
  const idx = inventory.findIndex((item) => item.name === itemName);
  if (idx === -1) return; // Item not found
  const item = inventory[idx];
  if (item && item.quantity && item.quantity > 1) {
    item.quantity -= 1;
  } else if (item) {
    inventory.splice(idx, 1);
  }
  await writeInventory(app.vault, inventory);
}

export async function useItem(app: App, itemName: string): Promise<void> {
  const inventory = await readInventory(app.vault);
  const item = inventory.find((it) => it.name === itemName);
  if (!item) return;

  // Enhanced consumable system integration - fully enabled

  const effects = item.effects ?? [];
  const obsidianApp = app as { plugins?: { plugins?: Record<string, { settings?: { currencyName?: string; currencySymbol?: string } }> } };
  const plugin = obsidianApp?.plugins?.plugins?.["Gamification-into-Obsidian"];
  const currencyName = plugin?.settings?.currencyName || "Coins";
  const currencySymbol = plugin?.settings?.currencySymbol || "🪙";

  // Apply immediate effects (coins/xp) and timed buffs
  let appliedSomething = false;
  const player = await readPlayerData(app.vault);

  for (const e of effects) {
    const effectStr = e.toLowerCase();
    // coins:+N
    const mCoins = effectStr.match(/^coins:\+?(\d+)/);
    if (mCoins) {
      const amount = parseInt(mCoins[1], 10);
      if (player && amount > 0) {
        const newData = { ...player, coins: Math.max(0, Number(player.coins || 0)) + amount } as typeof player;
        await updatePlayerData(app.vault, newData);

        // Record coin transaction
        try {
          const { CoinTransactionTracker } = await import('../../../shared/utils/coinTransactionTracker');
          await CoinTransactionTracker.recordTransaction(
            app.vault,
            amount,
            'item_use',
            `Used ${itemName}`,
            { itemName, effect: 'coins' }
          );
        } catch (error) {
          console.warn('[useItem] Failed to record coin transaction:', error);
        }

        try { showGameNotice(`${currencySymbol} +${amount} ${currencyName.toLowerCase()}`, 2000); } catch {
          // Ignore notice errors silently
        }
        appliedSomething = true;
      }
      continue;
    }
    // xp:+N
    const mXp = effectStr.match(/^xp:\+?(\d+)/);
    if (mXp) {
      const amount = parseInt(mXp[1], 10);
      if (amount > 0) {
        // Use progressUpdater path for proper level logic
        const { updatePlayerData: upd } = await import("../../../shared/utils/progressUpdater");
        await upd(app.vault, amount, 0, 0);
        try { showGameNotice(`⭐ +${amount} XP`, 2000); } catch {
          // Ignore notice errors silently
        }
        appliedSomething = true;
      }
      continue;
    }

    // artifact:activity:duration:category (e.g., artifact:Watch anime episode:60:entertainment)
    const mArtifact = effectStr.match(/^artifact:([^:]+):(\d+)(?::([^:]+))?/);
    if (mArtifact) {
      const activity = mArtifact[1];
      const durationMinutes = parseInt(mArtifact[2], 10);
      const category = mArtifact[3] || 'entertainment';

      if (durationMinutes > 0 && player) {
        const startedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

        const artifact = {
          name: item.name,
          realWorldActivity: activity,
          durationMinutes: durationMinutes,
          startedAt: startedAt,
          expiresAt: expiresAt,
          description: `Activated by using ${item.name}`,
          icon: item.icon,
          category: category as any
        };

        const currentArtifacts = player.activeArtifacts || [];
        const newData = {
          ...player,
          activeArtifacts: [...currentArtifacts, artifact]
        };

        await updatePlayerData(app.vault, newData);

        try {
          showGameNotice(`🏺 Real-world activity activated: ${activity} (${durationMinutes} minutes)`, 3000);
        } catch {
          // Ignore notice errors silently
        }

        appliedSomething = true;
      }
      continue;
    }

    // buff:xp|coins|cp|rewards|trade;mult=1.5;dur=30m
    const mBuff = effectStr.match(/^buff:([a-z]+);mult=([0-9.]+);dur=([0-9smhdw]+)(?:;source=(.+))?/);
    if (mBuff) {
      const type = mBuff[1] as BuffKind;
      const mult = parseFloat(mBuff[2]);
      const durStr = mBuff[3];
      const source = mBuff[4] || item.name;
      const ms = parseDurationToMs(durStr) ?? 0;
      const expiresAt = ms > 0 ? Date.now() + ms : undefined;
      if (mult > 0 && (expiresAt || mult !== 1)) {
        await addBuff(app.vault, { type, multiplier: mult, expiresAt, source });
        try { showGameNotice(`✨ Buff applied: ${type} x${mult} for ${durStr}`, 2500); } catch {
          // Ignore notice errors silently
        }
        appliedSomething = true;
      }
      continue;
    }
    // debuff:xp|coins|cp|rewards|trade;mult=0.7;dur=1h
    const mDebuff = effectStr.match(/^debuff:([a-z]+);mult=([0-9.]+);dur=([0-9smhdw]+)(?:;source=(.+))?/);
    if (mDebuff) {
      const type = mDebuff[1] as BuffKind;
      const mult = parseFloat(mDebuff[2]);
      const durStr = mDebuff[3];
      const source = mDebuff[4] || item.name;
      const ms = parseDurationToMs(durStr) ?? 0;
      const expiresAt = ms > 0 ? Date.now() + ms : undefined;
      if (mult > 0 && mult <= 1 && (expiresAt || mult !== 1)) {
        await addDebuff(app.vault, { type, multiplier: mult, expiresAt, source });
        try { showGameNotice(`⚠️ Debuff applied: ${type} x${mult} for ${durStr}`, 2500); } catch {
          // Ignore notice errors silently
        }
        appliedSomething = true;
      }
      continue;
    }
  }

  // Consume one item or decrement uses after applying effects
  if (typeof item.usesRemaining === 'number') {
    item.usesRemaining = Math.max(0, (item.usesRemaining || 0) - 1);
    if (item.usesRemaining > 0) {
      await writeInventory(app.vault, inventory);
      try { showGameNotice(`${itemName} used. (${item.usesRemaining} uses left)`, 1500); } catch {}
    } else {
      await dropItem(app, itemName);
      try { showGameNotice(`${itemName} broke.`, 1500); } catch {}
    }
  } else {
    await dropItem(app, itemName);
    if (!appliedSomething) {
      try { showGameNotice(`${itemName} used.`, 1500); } catch {
        // Ignore notice errors silently
      }
    }
  }
}

// --- Buff Presets ---
type BuffPreset = {
  name: string;
  price: number;
  tags: string[];
  rarity: string;
  category: string;
  icon?: string;
  description?: string;
  effectLines: string[];
};

export const BUFF_PRESETS: Record<string, BuffPreset> = {
  xp_booster_30m: {
    name: "XP Booster (30m)", price: 0, tags: ["consumable", "rare"], rarity: "rare", category: "consumable",
    icon: "⭐", description: "+50% XP for 30 minutes", effectLines: ["buff:xp;mult=1.5;dur=30m"]
  },
  cp_booster_30m: {
    name: "CP Booster (30m)", price: 0, tags: ["consumable", "rare"], rarity: "rare", category: "consumable",
    icon: "🎯", description: "+50% CP for 30 minutes", effectLines: ["buff:cp;mult=1.5;dur=30m"]
  },
  rewards_booster_1h: {
    name: "Rewards Booster (1h)", price: 0, tags: ["consumable", "epic"], rarity: "epic", category: "consumable",
    icon: "✨", description: "+25% XP/Coins/CP for 1 hour", effectLines: ["buff:rewards;mult=1.25;dur=1h"]
  },
  trade_booster_1h: {
    name: "Trade Booster (1h)", price: 0, tags: ["consumable", "uncommon"], rarity: "uncommon", category: "consumable",
    icon: "💱", description: "+10% sell value for 1 hour", effectLines: ["buff:trade;mult=1.1;dur=1h"]
  }
};

export async function giveBuffPreset(app: App, presetKey: keyof typeof BUFF_PRESETS, quantity = 1): Promise<void> {
  const preset = BUFF_PRESETS[presetKey];
  if (!preset) throw new Error(`Unknown preset: ${presetKey as string}`);
  const item = { ...preset, effects: preset.effectLines } as unknown as ShopLikeItem;
  await addOrIncrementInventoryItem(app, item, quantity);
}

export async function equipItem(app: App, itemName: string): Promise<void> {
  const inventory = await readInventory(app.vault);
  const item = inventory.find((it) => it.name === itemName);
  if (!item) return;
  const hasEquipped = (item.tags ?? []).includes('equipped');
  const withoutEquipped = (item.tags ?? []).filter(t => t !== 'equipped');
  item.tags = hasEquipped ? withoutEquipped : [...withoutEquipped, 'equipped'];
  await writeInventory(app.vault, inventory);
}

export async function sellItem(app: App, itemName: string): Promise<void> {
  // Determine value from inventory
  const inventory = await readInventory(app.vault);
  const item = inventory.find((it) => it.name === itemName);
  let saleValue = Math.max(0, Number(item?.value ?? 0));
  if (!saleValue && item) {
    const player = await readPlayerData(app.vault);
    saleValue = computeSellValue({ price: item.price, rarity: item.rarity, category: item.category }, player ?? undefined);
    // Store computed sale value back to item for persistence
    item.value = saleValue;
    await writeInventory(app.vault, inventory);
  }

  // Remove one from inventory
  await dropItem(app, itemName);

  // Credit coins if value exists
  if (saleValue > 0) {
    const player = await readPlayerData(app.vault);
    if (player) {
      const updated = { ...player, coins: Math.max(0, Number(player.coins || 0)) + saleValue } as typeof player;
      await updatePlayerData(app.vault, updated);

      // Record coin transaction
      try {
        const { CoinTransactionTracker } = await import('../../../shared/utils/coinTransactionTracker');
        await CoinTransactionTracker.recordTransaction(
          app.vault,
          saleValue,
          'item_sale',
          `Sold ${itemName}`,
          { itemName, rarity: item?.rarity || 'common', category: item?.category || 'misc' }
        );
      } catch (error) {
        console.warn('[sellItem] Failed to record coin transaction:', error);
      }
      try {
        const obsidianApp = app as { plugins?: { plugins?: Record<string, { settings?: { currencyName?: string; currencySymbol?: string } }> } };
        const plugin = obsidianApp?.plugins?.plugins?.["gamified-obsidian-plugin"]
          || obsidianApp?.plugins?.plugins?.["Gamification-into-Obsidian"];
        const currencyName = plugin?.settings?.currencyName || "Coins";
        const currencySymbol = plugin?.settings?.currencySymbol || "🪙";
        // @ts-ignore
        new window.Notice(`${currencySymbol} +${saleValue} ${currencyName.toLowerCase()}`, 2000);
      } catch {
        // Ignore notice errors silently
      }
    }
  }
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}