import { App } from 'obsidian';
import { EnhancedInventoryItem, InventoryFilter, InventorySortOptions, BulkOperation, ItemStatistics } from '../types/EnhancedInventoryTypes';
import { readInventory, writeInventory, dropItem, sellItem, useItem, equipItem } from './updateInventoryFile';
import { EnhancedInventoryParser } from './enhancedInventoryParser';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

export class InventoryOperations {

    // Enhanced filtering and sorting
    static filterAndSortInventory(
        inventory: EnhancedInventoryItem[],
        filter: InventoryFilter,
        sort: InventorySortOptions
    ): EnhancedInventoryItem[] {
        let filtered = [...inventory];

        // Apply filters
        if (filter.search) {
            const searchTerm = filter.search.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchTerm) ||
                item.description?.toLowerCase().includes(searchTerm) ||
                item.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                item.category?.toLowerCase().includes(searchTerm) ||
                item.subcategory?.toLowerCase().includes(searchTerm) ||
                item.customTags?.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }

        if (filter.category && filter.category !== 'all') {
            filtered = filtered.filter(item => item.category === filter.category);
        }

        if (filter.rarity && filter.rarity !== 'all') {
            filtered = filtered.filter(item => item.rarity === filter.rarity);
        }

        if (filter.equipped !== undefined) {
            filtered = filtered.filter(item => item.isEquipped === filter.equipped);
        }

        if (filter.favorite !== undefined) {
            filtered = filtered.filter(item => item.isFavorite === filter.favorite);
        }

        if (filter.hasEffects !== undefined) {
            filtered = filtered.filter(item =>
                filter.hasEffects ? (item.effects && item.effects.length > 0) : !item.effects || item.effects.length === 0
            );
        }

        if (filter.priceRange) {
            filtered = filtered.filter(item => {
                const price = item.price || item.value || 0;
                return price >= filter.priceRange!.min && price <= filter.priceRange!.max;
            });
        }

        if (filter.customTags && filter.customTags.length > 0) {
            filtered = filtered.filter(item =>
                filter.customTags!.some(filterTag =>
                    item.customTags?.includes(filterTag) || item.tags?.includes(filterTag)
                )
            );
        }

        // Apply sorting
        const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };

        filtered.sort((a, b) => {
            let comparison = 0;

            // Favorites always go first (unless sorting by specific criteria)
            if (sort.field !== 'name' && sort.field !== 'category') {
                if (a.isFavorite && !b.isFavorite) return -1;
                if (!a.isFavorite && b.isFavorite) return 1;
            }

            switch (sort.field) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'rarity':
                    const rarityA = rarityOrder[a.rarity as keyof typeof rarityOrder] || 0;
                    const rarityB = rarityOrder[b.rarity as keyof typeof rarityOrder] || 0;
                    comparison = rarityA - rarityB;
                    break;
                case 'quantity':
                    comparison = (a.quantity || 1) - (b.quantity || 1);
                    break;
                case 'value':
                    comparison = (a.price || a.value || 0) - (b.price || b.value || 0);
                    break;
                case 'acquiredDate':
                    comparison = new Date(a.acquiredDate || 0).getTime() - new Date(b.acquiredDate || 0).getTime();
                    break;
                case 'lastUsed':
                    comparison = new Date(a.lastUsedDate || 0).getTime() - new Date(b.lastUsedDate || 0).getTime();
                    break;
                case 'category':
                    comparison = (a.category || '').localeCompare(b.category || '');
                    break;
                default:
                    comparison = a.name.localeCompare(b.name);
            }

            return sort.order === 'desc' ? -comparison : comparison;
        });

        return filtered;
    }

    // Bulk operations
    static async performBulkOperation(app: App, operation: BulkOperation): Promise<void> {
        const { action, items } = operation;
        let successCount = 0;
        let totalValue = 0;

        // Calculate total value for selling operations
        if (action === 'sell') {
            const inventory = await this.readEnhancedInventory(app);
            for (const itemName of items) {
                const item = inventory.find(i => i.name === itemName);
                if (item) {
                    totalValue += (item.price || item.value || 0);
                }
            }
        }

        for (const itemName of items) {
            try {
                switch (action) {
                    case 'sell':
                        await sellItem(app, itemName);
                        successCount++;
                        break;
                    case 'drop':
                        await dropItem(app, itemName);
                        successCount++;
                        break;
                    case 'use':
                        await useItem(app, itemName);
                        await this.recordItemUsage(app, itemName);
                        successCount++;
                        break;
                    case 'favorite':
                        await this.toggleFavorite(app, itemName, true);
                        successCount++;
                        break;
                    case 'unfavorite':
                        await this.toggleFavorite(app, itemName, false);
                        successCount++;
                        break;
                    case 'equip':
                        await equipItem(app, itemName);
                        successCount++;
                        break;
                    case 'unequip':
                        await equipItem(app, itemName); // Toggle function
                        successCount++;
                        break;
                }
            } catch (error) {
                console.error(`Failed to ${action} item ${itemName}:`, error);
            }
        }

        // Enhanced notifications
        let message = `${action} completed for ${successCount}/${items.length} items`;
        if (action === 'sell' && totalValue > 0) {
            message += ` (${totalValue} coins earned)`;
        }

        pixelNotice(message, 3000);
    }

    // Enhanced inventory reading with parsing
    static async readEnhancedInventory(app: App): Promise<EnhancedInventoryItem[]> {
        try {
            const inventoryFile = app.vault.getAbstractFileByPath('Inventory.md');
            if (!inventoryFile) {
                return [];
            }

            const content = await app.vault.read(inventoryFile as any);
            return EnhancedInventoryParser.parseInventoryFile(content);
        } catch (error) {
            console.error('Failed to read enhanced inventory:', error);
            return [];
        }
    }

    // Enhanced inventory writing
    static async writeEnhancedInventory(app: App, inventory: EnhancedInventoryItem[]): Promise<void> {
        const content = EnhancedInventoryParser.generateInventoryContent(inventory);
        const inventoryFile = app.vault.getAbstractFileByPath('Inventory.md');

        if (inventoryFile) {
            await app.vault.modify(inventoryFile as any, content);
        } else {
            await app.vault.create('Inventory.md', content);
        }

        // Dispatch update event
        try {
            // @ts-ignore
            window?.dispatchEvent?.(new CustomEvent('inventory-updated'));
        } catch {
            // Ignore dispatch errors silently
        }
    }

    // Icon management
    static async updateItemIcon(app: App, itemName: string, newIcon: string): Promise<void> {
        const inventory = await this.readEnhancedInventory(app);
        const item = inventory.find(it => it.name === itemName);
        if (!item) return;

        item.icon = newIcon;
        await this.writeEnhancedInventory(app, inventory);

        // Save to recent icons
        this.saveRecentIcon(newIcon);
    }

    // Favorite management
    static async toggleFavorite(app: App, itemName: string, favorite?: boolean): Promise<void> {
        const inventory = await this.readEnhancedInventory(app);
        const item = inventory.find(it => it.name === itemName);
        if (!item) return;

        item.isFavorite = favorite !== undefined ? favorite : !item.isFavorite;
        await this.writeEnhancedInventory(app, inventory);
    }

    // Item usage tracking
    static async recordItemUsage(app: App, itemName: string): Promise<void> {
        const inventory = await this.readEnhancedInventory(app);
        const item = inventory.find(it => it.name === itemName);
        if (!item) return;

        item.lastUsedDate = new Date().toISOString();
        item.usageCount = (item.usageCount || 0) + 1;
        await this.writeEnhancedInventory(app, inventory);
    }

    // Custom tags management
    static async addCustomTag(app: App, itemName: string, tag: string): Promise<void> {
        const inventory = await this.readEnhancedInventory(app);
        const item = inventory.find(it => it.name === itemName);
        if (!item) return;

        item.customTags = item.customTags || [];
        if (!item.customTags.includes(tag)) {
            item.customTags.push(tag);
            await this.writeEnhancedInventory(app, inventory);
        }
    }

    static async removeCustomTag(app: App, itemName: string, tag: string): Promise<void> {
        const inventory = await this.readEnhancedInventory(app);
        const item = inventory.find(it => it.name === itemName);
        if (!item || !item.customTags) return;

        item.customTags = item.customTags.filter(t => t !== tag);
        await this.writeEnhancedInventory(app, inventory);
    }

    // Import/Export functionality
    static async exportInventory(app: App): Promise<string> {
        const inventory = await this.readEnhancedInventory(app);
        return JSON.stringify(inventory, null, 2);
    }

    static async importInventory(app: App, jsonData: string): Promise<void> {
        try {
            const inventory = JSON.parse(jsonData) as EnhancedInventoryItem[];
            await this.writeEnhancedInventory(app, inventory);
            pixelNotice(`Imported ${inventory.length} items successfully`, 3000);
        } catch (error) {
            pixelNotice('Failed to import inventory: Invalid JSON format', 3000);
            throw error;
        }
    }

    // Statistics calculation (for analytics integration)
    static calculateInventoryStatistics(inventory: EnhancedInventoryItem[]): ItemStatistics {
        const stats: ItemStatistics = {
            totalItems: inventory.reduce((sum, item) => sum + (item.quantity || 1), 0),
            totalValue: inventory.reduce((sum, item) => sum + ((item.price || item.value || 0) * (item.quantity || 1)), 0),
            itemsByRarity: {},
            itemsByCategory: {},
            mostValuableItems: [],
            recentlyAddedItems: [],
            mostUsedItems: []
        };

        // Calculate counts by rarity and category
        inventory.forEach(item => {
            const rarity = item.rarity || 'common';
            const category = item.category || 'misc';

            stats.itemsByRarity[rarity] = (stats.itemsByRarity[rarity] || 0) + (item.quantity || 1);
            stats.itemsByCategory[category] = (stats.itemsByCategory[category] || 0) + (item.quantity || 1);
        });

        // Most valuable items (top 5)
        stats.mostValuableItems = [...inventory]
            .sort((a, b) => ((b.price || b.value || 0) * (b.quantity || 1)) - ((a.price || a.value || 0) * (a.quantity || 1)))
            .slice(0, 5);

        // Recently added items (top 5)
        stats.recentlyAddedItems = [...inventory]
            .sort((a, b) => new Date(b.acquiredDate || 0).getTime() - new Date(a.acquiredDate || 0).getTime())
            .slice(0, 5);

        // Most used items (top 5)
        stats.mostUsedItems = [...inventory]
            .filter(item => item.usageCount && item.usageCount > 0)
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, 5);

        return stats;
    }

    // Recent icons management
    private static saveRecentIcon(icon: string): void {
        try {
            const recent = JSON.parse(localStorage.getItem('recent-inventory-icons') || '[]');
            const filtered = recent.filter((i: string) => i !== icon);
            filtered.unshift(icon);
            localStorage.setItem('recent-inventory-icons', JSON.stringify(filtered.slice(0, 10)));
        } catch (error) {
            console.warn('Failed to save recent icon:', error);
        }
    }

    static getRecentIcons(): string[] {
        try {
            return JSON.parse(localStorage.getItem('recent-inventory-icons') || '[]');
        } catch (error) {
            return [];
        }
    }

    // Duplicate detection
    static findDuplicateItems(inventory: EnhancedInventoryItem[]): EnhancedInventoryItem[][] {
        const duplicates: EnhancedInventoryItem[][] = [];
        const nameMap = new Map<string, EnhancedInventoryItem[]>();

        inventory.forEach(item => {
            const key = item.name.toLowerCase();
            if (!nameMap.has(key)) {
                nameMap.set(key, []);
            }
            nameMap.get(key)!.push(item);
        });

        nameMap.forEach(items => {
            if (items.length > 1) {
                duplicates.push(items);
            }
        });

        return duplicates;
    }

    // Batch item updates
    static async updateMultipleItems(
        app: App,
        updates: { itemName: string; changes: Partial<EnhancedInventoryItem> }[]
    ): Promise<void> {
        const inventory = await this.readEnhancedInventory(app);

        updates.forEach(update => {
            const item = inventory.find(it => it.name === update.itemName);
            if (item) {
                Object.assign(item, update.changes);
            }
        });

        await this.writeEnhancedInventory(app, inventory);
    }
}
