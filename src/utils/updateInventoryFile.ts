import { App, Vault, TFile } from "obsidian";
import { ShopItem } from "./ShopParser";
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
  tags: string[]; // <-- Add this line
}

function parseInventoryFile(content: string): InventoryItem[] {
  // Very basic parser: each item is a line like 'ItemName xN #category #rarity' with optional comment lines
  const items: InventoryItem[] = [];
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line && !line.startsWith("//")) {
      // Parse item line
      const match = line.match(/^(.*?) x(\d+)(.*)$/);
      if (match) {
        const name = match[1].trim();
        const quantity = parseInt(match[2]);
        const tags = match[3].split(" ").filter((t) => t.startsWith("#")).map(t => t.replace('#', ''));
        const category = tags[0];
        const rarity = tags[1];
        let description = "";
        let icon = "";
        let stock: number | undefined = undefined;
        // Look ahead for comment lines
        let j = i + 1;
        let newIcon = icon;
        let newStock: number | undefined = stock;
        let newDescription = description;
        while (j < lines.length && lines[j].trim().startsWith("//")) {
          const comment = lines[j].trim().replace("//", "").trim();
          if (comment.startsWith("icon:")) newIcon = comment.replace("icon:", "").trim();
          else if (comment.startsWith("stock:")) {
            const parsedStock = parseInt(comment.replace("stock:", "").trim());
            if (!isNaN(parsedStock)) newStock = parsedStock;
          }
          else newDescription += (newDescription ? " " : "") + comment;
          j++;
        }
        icon = newIcon;
        stock = newStock; 
        description = newDescription;
        items.push({ name, quantity, category, rarity, description, icon, stock, tags }); // <-- Add tags here
        i = j - 1;
      }
    }
    i++;
  }
  return items;
}

/**
 * Adds or increments an item in Inventory.md in the vault root.
 * If the item exists, increments its quantity (xN). If not, adds it as a new entry with x1.
 * Preserves associated comments (description, icon, etc.).
 */
export async function addOrIncrementInventoryItem(app: App, item: ShopItem, quantity = 1, inventoryFilePath = 'Inventory.md'): Promise<void> {
  let inventoryFile = app.vault.getAbstractFileByPath(inventoryFilePath);
  if (!inventoryFile) {
    // Create Inventory.md if it doesn't exist
    await app.vault.create(inventoryFilePath, "");
    inventoryFile = app.vault.getAbstractFileByPath(inventoryFilePath);
  }
  if (!(inventoryFile instanceof TFile)) {
    throw new Error("Expected TFile but got TAbstractFile");
  }
  const content = await app.vault.read(inventoryFile);
  const lines = content.split("\n");
  const tags = [item.category, item.rarity].filter(Boolean);
  const itemLineRegex = new RegExp(
    `^${escapeRegExp(item.name)}(?: x(\\d+))? #${escapeRegExp(item.category || "")} #${escapeRegExp(item.rarity || "")}`
  );
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
    let newEntry = `\n${item.name} x${quantity} ${tags.map(t => `#${t}`).join(" ")}`;
    if (item.description) newEntry += `\n// ${item.description}`;
    if (item.icon) newEntry += `\n// icon:${item.icon}`;
    updatedLines.push(newEntry);
  }
  await app.vault.modify(inventoryFile, updatedLines.join("\n"));
}

export async function readInventory(vault: Vault, inventoryFilePath = 'Inventory.md'): Promise<InventoryItem[]> {
  const inventoryFile = vault.getAbstractFileByPath(inventoryFilePath);
  if (!(inventoryFile instanceof TFile)) {
    return [];
  }
  const content = await vault.read(inventoryFile);
  return parseInventoryFile(content);
}

export async function addItemToInventory(vault: Vault, item: InventoryItem, inventoryFilePath = 'Inventory.md'): Promise<void> {
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
  const itemLineRegex = new RegExp(
    `^${escapeRegExp(item.name)}(?: x(\\d+))? #${escapeRegExp(item.category || "")} #${escapeRegExp(item.rarity || "")}`
  );
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
}

export async function removeItemFromInventory(vault: Vault, itemName: string, inventoryFilePath = 'Inventory.md'): Promise<void> {
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
}

export async function writeInventory(vault: Vault, inventory: InventoryItem[], inventoryFilePath = 'Inventory.md'): Promise<void> {
    let inventoryFile = vault.getAbstractFileByPath(inventoryFilePath);
    if (!inventoryFile) {
        await vault.create(inventoryFilePath, "");
        inventoryFile = vault.getAbstractFileByPath(inventoryFilePath);
    }
    if (!(inventoryFile instanceof TFile)) {
        throw new Error("Expected TFile but got TAbstractFile");
    }
    // Reconstruct the file content from the inventory array
    const lines: string[] = [];
    for (const item of inventory) {
        let line = `${item.name} x${item.quantity ?? 1}`;
        if (item.category) line += ` #${item.category}`;
        if (item.rarity) line += ` #${item.rarity}`;
        lines.push(line);
        if (item.description) lines.push(`// ${item.description}`);
        if (item.icon) lines.push(`// icon:${item.icon}`);
    }
    await vault.modify(inventoryFile, lines.join("\n"));
}

// Update dropInventoryItem to use writeInventory directly
export async function dropInventoryItem(app: App, itemName: string): Promise<void> {
    const inventory = await readInventory(app.vault);
    const idx = inventory.findIndex(item => item.name === itemName);
    if (idx === -1) return; // Item not found
    const item = inventory[idx];
    if (item && item.quantity && item.quantity > 1) {
        item.quantity -= 1;
    } else {
        inventory.splice(idx, 1);
    }
    await writeInventory(app.vault, inventory);
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

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 