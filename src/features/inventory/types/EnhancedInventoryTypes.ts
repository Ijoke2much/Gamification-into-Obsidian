import { InventoryItem } from '../utils/updateInventoryFile';

// ============================================================================
// Enhanced Inventory Item (runtime owned items)
// ============================================================================

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
    usesRemaining?: number;
}

// ============================================================================
// Game Item Definitions (configuration-level item schema)
// Used for defining weapons, materials, and artifacts in a structured way.
// These definitions can then be rendered in the Shop or converted to
// InventoryItem entries when the player acquires them.
// ============================================================================

export type ItemType =
    | 'material'   // Foundational crafting ingredients and materials
    | 'weapon'     // One-time use items for bosses / combat
    | 'artifact';  // Real-world reward items / special promises

export type ItemEffectKind =
    | 'stat-bonus'  // XP/CP/etc. modifiers
    | 'boss-bonus'  // Extra damage/shields or bonuses in boss fights
    | 'real-world'; // Real-world activities, timers, approvals, etc.

export interface ItemEffect {
    kind: ItemEffectKind;
    /**
     * Effect payload, shape depends on kind:
     * - stat-bonus: { xpBonusPercent: number; appliesToTags?: string[]; ... }
     * - boss-bonus: { damageBonusPercent?: number; shieldHP?: number; bossId?: string; ... }
     * - real-world: { durationMinutes?: number; maxUses?: number; requiresApproval?: boolean; ... }
     */
    data: Record<string, unknown>;
}

export interface GameItemDefinition {
    /** Stable identifier for this item definition */
    id: string;
    /** Display name */
    name: string;
    /** High-level type (material / weapon / artifact) */
    type: ItemType;
    /** Rarity tier for display and drop logic */
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    /** Whether the item can exist in stacks in the inventory */
    stackable: boolean;
    /** Optional flavor description */
    description?: string;
    /** Optional icon (emoji or image URL) */
    icon?: string;
    /** Optional effect definition describing what this item does */
    effect?: ItemEffect;
    /** Optional shop price in currency units */
    priceInCoins?: number;
    /**
     * Optional material requirements for purchasing / crafting this item.
     * These IDs should correspond to your material IDs / names in markdown.
     */
    requiredMaterials?: Array<{ id: string; amount: number }>;
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
