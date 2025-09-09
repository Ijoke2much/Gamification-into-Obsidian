import { InventoryItem } from '../utils/updateInventoryFile';

export interface EnhancedInventoryItem extends InventoryItem {
    isFavorite?: boolean;
    acquiredDate?: string;
    lastUsedDate?: string;
    usageCount?: number;
    subcategory?: string;
    customTags?: string[];
    isEquipped?: boolean;
    setBonus?: string;
    craftingUses?: string[]; // Recipes this item is used in
}

export interface InventoryFilter {
    search?: string;
    category?: string;
    rarity?: string;
    equipped?: boolean;
    favorite?: boolean;
    hasEffects?: boolean;
    priceRange?: { min: number; max: number };
    customTags?: string[];
}

export interface InventorySortOptions {
    field: 'name' | 'rarity' | 'quantity' | 'value' | 'acquiredDate' | 'lastUsed' | 'category';
    order: 'asc' | 'desc';
}

export interface BulkOperation {
    action: 'sell' | 'drop' | 'use' | 'favorite' | 'unfavorite' | 'equip' | 'unequip';
    items: string[]; // item names
}

export interface IconPickerCategory {
    name: string;
    icon: string;
    icons: string[];
}

export interface InventoryState {
    selectedItems: Set<string>;
    viewMode: 'grid' | 'list';
    filter: InventoryFilter;
    sort: InventorySortOptions;
    showBulkActions: boolean;
    showIconPicker: boolean;
    iconPickerItem?: string;
}

export interface ItemStatistics {
    totalItems: number;
    totalValue: number;
    itemsByRarity: { [rarity: string]: number };
    itemsByCategory: { [category: string]: number };
    mostValuableItems: EnhancedInventoryItem[];
    recentlyAddedItems: EnhancedInventoryItem[];
    mostUsedItems: EnhancedInventoryItem[];
}

export type ItemAction = 'use' | 'equip' | 'sell' | 'drop' | 'favorite' | 'edit-icon' | 'view-details';
