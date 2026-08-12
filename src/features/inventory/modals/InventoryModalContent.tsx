import React, { useState, useMemo, useEffect } from "react";
import { useInventoryModalContext } from "./InventoryModalContext";
import {
    getRarityColor,
    getRarityDisplayName,
} from "../../../features/quests/utils/questRewardsSystem";
import type { InventoryItem } from "../utils/updateInventoryFile";
import { dropItem, useItem, equipItem, sellItem } from "../utils/updateInventoryFile";
import type { ShopItemEffect } from "../../shop/utils/ShopParser";
import { MaterialUtils } from "../../../shared/utils/materialUtils";
import { EnhancedInventoryItem, InventoryFilter, InventorySortOptions, BulkOperation, InventoryState } from "../types/EnhancedInventoryTypes";
import { InventoryOperations } from "../utils/inventoryOperations";
import { useMobileOptimizations } from "../../../shared/hooks/useMobileOptimizations";
import { useVisualThemeShell } from "../../../shared/hooks/useVisualThemeShell";
import {
    SystemHeader,
} from "../../../shared/components/ui/system/SystemPanel";

// Import CSS modules
import inventoryStyles from '../../../shared/components/ui/Inventory.module.css';

const MOBILE_INV_PAGE = 24;

// Enhanced BotW-style category mapping with better organization
const CATEGORIES = {
    equipment: { name: "Equipment", icon: "⚔️", color: "#FF6B35" },
    potion: { name: "Food", icon: "🍖", color: "#4ECDC4" },
    material: { name: "Materials", icon: "💎", color: "#45B7D1" },
    artifact: { name: "Key Items", icon: "🗝️", color: "#F9CA24" },
    consumable: { name: "Consumables", icon: "🧪", color: "#A55EEA" },
    tool: { name: "Tools", icon: "🔧", color: "#26C281" },
    treasure: { name: "Treasures", icon: "💰", color: "#FD79A8" },
    misc: { name: "Misc", icon: "📦", color: "#6C5CE7" },
};

// Enhanced item icons based on category and name
const getItemIcon = (itemName: string): string => {
    const name = itemName.toLowerCase();
    
    // Specific item icons
    if (name.includes("crystal")) return "💎";
    if (name.includes("potion")) return "🧪";
    if (name.includes("sword") || name.includes("blade")) return "⚔️";
    if (name.includes("shield")) return "🛡️";
    if (name.includes("bow")) return "🏹";
    if (name.includes("staff") || name.includes("wand")) return "🪄";
    if (name.includes("crown")) return "👑";
    if (name.includes("ring")) return "💍";
    if (name.includes("amulet") || name.includes("necklace")) return "📿";
    if (name.includes("key")) return "🗝️";
    if (name.includes("gem") || name.includes("jewel")) return "💎";
    if (name.includes("scroll")) return "📜";
    if (name.includes("book")) return "📚";
    if (name.includes("coin") || name.includes("gold")) return "🪙";
    if (name.includes("food") || name.includes("bread") || name.includes("meat")) return "🍖";
    if (name.includes("health") || name.includes("healing")) return "❤️";
    if (name.includes("mana") || name.includes("magic")) return "💙";
    if (name.includes("arrow")) return "🏹";
    if (name.includes("hammer")) return "🔨";
    if (name.includes("pickaxe")) return "⛏️";
    if (name.includes("axe")) return "🪓";
    
    // Category fallback icons
    return CATEGORIES[itemName as keyof typeof CATEGORIES]?.icon || "📦";
};

// Generate dynamic item descriptions
const getItemDescription = (item: InventoryItem): string => {
    const name = item.name.toLowerCase();
    const rarity = item.rarity || "common";
    
    // Specific item descriptions
    if (name.includes("crystal")) {
        return "A fragment of pure magical crystal that radiates with mystical energy. Its surface shimmers with otherworldly light.";
    }
    if (name.includes("potion")) {
        return "A carefully brewed concoction with mysterious properties. The liquid inside swirls with magical essence.";
    }
    if (name.includes("crown")) {
        return "An ornate crown that once belonged to royalty. Its golden surface is adorned with precious gems.";
    }
    if (name.includes("scroll")) {
        return "An ancient scroll inscribed with arcane knowledge. The parchment feels warm to the touch.";
    }
    if (name.includes("key")) {
        return "A mysterious key that opens doors to unknown secrets. Its metal gleams with an unusual luster.";
    }
    
    // Generic descriptions based on rarity
    const rarityDescriptions = {
        common: "A basic item with simple properties. Commonly found throughout the realm.",
        uncommon: "An item of moderate quality with useful attributes. Not easily found by ordinary means.",
        rare: "A precious item imbued with special properties. Highly sought after by adventurers.",
        epic: "An extraordinary item of remarkable power. Legends speak of its incredible abilities.",
        legendary: "A mythical artifact of unparalleled might. Few have witnessed its true potential."
    };
    
    return rarityDescriptions[rarity as keyof typeof rarityDescriptions] || 
           "A mysterious item with unknown properties. Its true nature remains to be discovered.";
};

// Generate dynamic item lore
const getItemLore = (item: InventoryItem): string => {
    const name = item.name.toLowerCase();
    const category = item.category?.toLowerCase() || "";
    
    // Specific item lore
    if (name.includes("crystal")) {
        return "Ancient texts speak of crystals that fell from the celestial realm, carrying within them the essence of creation itself. Scholars believe these fragments hold the key to understanding the fundamental forces of magic.";
    }
    if (name.includes("crown")) {
        return "Forged in the golden age of the realm, this crown has witnessed the rise and fall of kingdoms. It is said that those who wear it are blessed with wisdom and cursed with the weight of responsibility.";
    }
    if (name.includes("sword") || name.includes("blade")) {
        return "Tempered in the fires of Mount Valor, this blade has tasted the blood of countless foes. Its edge remains forever sharp, and its spirit forever hungry for battle.";
    }
    if (name.includes("potion")) {
        return "Brewed by the master alchemists of the Arcane Tower, this elixir contains the distilled essence of rare herbs and magical components. Handle with care, for its power is not to be underestimated.";
    }
    
    // Category-based lore
    if (category.includes("weapon")) {
        return "Crafted by master smiths in the great forges of the realm. This weapon has seen many battles and carries the spirit of warriors past.";
    }
    if (category.includes("material")) {
        return "A valuable resource gathered from the far reaches of the world. Its potential is limited only by the imagination of those who wield it.";
    }
    if (category.includes("consumable")) {
        return "Prepared with care and imbued with beneficial properties. A wise adventurer always keeps such items close at hand.";
    }
    if (category.includes("key item")) {
        return "An item of great significance that plays a crucial role in the unfolding of destiny. Guard it well, for its loss could spell doom.";
    }
    
    // Generic lore
    return "Though its origins may be humble, every item in an adventurer's possession tells a story. This one awaits the chance to add its chapter to your legend.";
};

// Material-specific icons for better visual identification
const getMaterialIcon = (itemName: string): string => {
    const name = itemName.toLowerCase();
    
    // Specific material icons
    if (name.includes("wood")) return "🪵";
    if (name.includes("stone")) return "🪨";
    if (name.includes("iron")) return "⛏️";
    if (name.includes("silver")) return "🥈";
    if (name.includes("gold")) return "🥇";
    if (name.includes("crystal")) return "💎";
    if (name.includes("diamond")) return "💎";
    if (name.includes("herb")) return "🌿";
    if (name.includes("essence")) return "✨";
    if (name.includes("phoenix")) return "🔥";
    if (name.includes("dragon")) return "🐉";
    if (name.includes("star")) return "⭐";
    if (name.includes("void")) return "🌌";
    if (name.includes("time")) return "⏰";
    
    // Default material icon
    return "💎";
};

interface InventoryModalContentProps {
    onClose?: () => void;
}

const InventoryModalContent: React.FC<InventoryModalContentProps> = ({ onClose }) => {
    console.log('🎒 InventoryModalContent component loaded!');
    const { isMobile } = useMobileOptimizations();
    const { isSystemTheme } = useVisualThemeShell();
    const { app, inventory, reloadInventory } = useInventoryModalContext();
    const useSystemChrome = isMobile || isSystemTheme;
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<"all" | "materials" | "equipment" | "artifact">("all");
    const [sortMethod, setSortMethod] = useState<"name" | "rarity" | "quantity" | "value">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [viewMode, setViewMode] = useState<"grid" | "list">(() =>
        typeof document !== "undefined" &&
        (document.body.classList.contains("is-mobile") ||
            document.body.classList.contains("is-phone") ||
            document.body.classList.contains("is-tablet"))
            ? "list"
            : "grid"
    );
    const [showFilters, setShowFilters] = useState(false);
    const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_INV_PAGE);
    
    // Enhanced modal state
    const [enhancedState, setEnhancedState] = useState<InventoryState>({
        selectedItems: new Set(),
        viewMode: 'grid',
        filter: {},
        sort: { field: 'name', order: 'asc' },
        showBulkActions: false,
        showIconPicker: false,
    });

    // Get currency settings
    const obsidianApp = app as { plugins?: { plugins?: Record<string, { settings?: { currencyName?: string; currencySymbol?: string } }> } };
    const plugin = obsidianApp?.plugins?.plugins?.["Gamification-into-Obsidian"];
    const currencyName = plugin?.settings?.currencyName || "Coins";
    const currencySymbol = plugin?.settings?.currencySymbol || "🪙";

    // Get all available categories from inventory
    const availableCategories = useMemo(() => {
        return [...new Set(inventory.map((item: InventoryItem) => item.category).filter(Boolean))];
    }, [inventory]);

    // Process inventory based on selected tab, search, filters, and sort
    const processedInventory = useMemo(() => {
        let filtered = [...inventory];

        // Filter by tab (simplified to All, Materials, Equipment, Artifacts)
        if (activeTab === "materials") {
            filtered = filtered.filter(item => MaterialUtils.isCraftingMaterial(item));
        } else if (activeTab === "equipment") {
            filtered = filtered.filter(item =>
                item.category === 'equipment' ||
                item.tags?.includes('weapon') ||
                item.tags?.includes('armor')
            );
        } else if (activeTab === "artifact") {
            filtered = filtered.filter(item =>
                item.category === 'artifact' ||
                item.tags?.includes('artifact') ||
                item.tags?.includes('key')
            );
        }

        // Material quality chip (desktop materials tab)
        if (selectedCategory && selectedCategory !== "all") {
            const q = selectedCategory.toLowerCase();
            filtered = filtered.filter(item =>
                item.tags?.some(tag => String(tag).toLowerCase().includes(q))
            );
        }

        // Search (search bar + enhanced filter search stay in sync)
        const qSearch = (enhancedState.filter.search || searchTerm || "").trim().toLowerCase();
        if (qSearch) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(qSearch) ||
                item.description?.toLowerCase().includes(qSearch) ||
                item.tags?.some(tag => tag.toLowerCase().includes(qSearch))
            );
        }

        // Enhanced panel filters (were written but never applied)
        const ef = enhancedState.filter;
        if (ef.category) {
            filtered = filtered.filter(item => item.category === ef.category);
        }
        if (ef.rarity) {
            filtered = filtered.filter(
                item => (item.rarity || "common").toLowerCase() === ef.rarity!.toLowerCase()
            );
        }
        if (ef.equipped) {
            filtered = filtered.filter(item => item.tags?.includes("equipped"));
        }
        if (ef.hasEffects) {
            filtered = filtered.filter(
                item => Array.isArray(item.effects) && item.effects.length > 0
            );
        }

        // Sort — prefer list controls; fall back to enhanced sort field
        const rarityOrder: Record<string, number> = {
            common: 1,
            uncommon: 2,
            rare: 3,
            epic: 4,
            legendary: 5,
            mythic: 6,
        };
        const field =
            sortMethod ||
            (enhancedState.sort.field === "rarity" ||
            enhancedState.sort.field === "quantity" ||
            enhancedState.sort.field === "value" ||
            enhancedState.sort.field === "name"
                ? enhancedState.sort.field
                : "name");
        const order = sortOrder || enhancedState.sort.order || "asc";

        filtered.sort((a, b) => {
            let comparison = 0;
            switch (field) {
                case "rarity":
                    comparison =
                        (rarityOrder[a.rarity || "common"] || 0) -
                        (rarityOrder[b.rarity || "common"] || 0);
                    break;
                case "quantity":
                    comparison = (Number(a.quantity) || 1) - (Number(b.quantity) || 1);
                    break;
                case "value":
                    comparison = (Number(a.value) || 0) - (Number(b.value) || 0);
                    break;
                case "name":
                default:
                    comparison = a.name.localeCompare(b.name);
            }
            return order === "desc" ? -comparison : comparison;
        });

        return filtered;
    }, [
        inventory,
        activeTab,
        selectedCategory,
        searchTerm,
        sortMethod,
        sortOrder,
        enhancedState.filter,
        enhancedState.sort.field,
        enhancedState.sort.order,
    ]);

    // Get materials with quality information
    const materials = useMemo(() => {
        return MaterialUtils.filterCraftingMaterials(inventory);
    }, [inventory]);

    // Group materials by quality for better organization
    const materialsByQuality = useMemo(() => {
        return MaterialUtils.groupMaterialsByQuality(materials);
    }, [materials]);

    // Get selected item data
    const selectedItemData = useMemo(() => {
        if (!selectedItem || !Array.isArray(inventory)) {
            console.log('❌ No selected item or invalid inventory:', { selectedItem, inventoryCount: inventory?.length });
            return null;
        }
        const foundItem = inventory.find((item: InventoryItem) => item.name === selectedItem);
        console.log('🔍 Looking for item:', selectedItem, 'Found:', foundItem);
        return foundItem;
    }, [selectedItem, inventory]);

    useEffect(() => {
        setMobileVisibleCount(MOBILE_INV_PAGE);
    }, [activeTab, selectedCategory, searchTerm, sortMethod, sortOrder]);

    useEffect(() => {
        if (isMobile && viewMode !== "list") {
            setViewMode("list");
        }
    }, [isMobile, viewMode]);

    const visibleInventory = useMemo(() => {
        if (!isMobile) return processedInventory;
        return processedInventory.slice(0, mobileVisibleCount);
    }, [isMobile, processedInventory, mobileVisibleCount]);

    // Debug inventory data
    console.log('📦 Inventory data:', { inventoryCount: inventory?.length, inventory: inventory?.slice(0, 3) });

    // Show empty state if no inventory
    if (!Array.isArray(inventory) || inventory.length === 0) {
        return (
            <div className={inventoryStyles.emptyState}>
                <div className={inventoryStyles.emptyStateIcon}>🎒</div>
                <div className={inventoryStyles.emptyStateTitle}>
                    Your inventory is empty
                </div>
                <div className={inventoryStyles.emptyStateSubtitle}>
                    Complete quests to discover amazing treasures!
                </div>
            </div>
        );
    }

    const handleItemClick = (itemName: string) => {
        console.log('🔍 Item clicked:', itemName);
        setSelectedItem(itemName);
        console.log('✅ Selected item set to:', itemName);
    };

    return (
        <div
            className={`${inventoryStyles.inventoryModalContent}${isMobile ? ` ${inventoryStyles.inventoryModalContentMobile}` : ""}${useSystemChrome && !isMobile ? ` ${inventoryStyles.inventoryModalContentSystem}` : ""}`}
            data-gamification-mobile={isMobile ? "true" : "false"}
            data-inventory-system={useSystemChrome ? "true" : "false"}
        >
            {useSystemChrome && (
                <div className={inventoryStyles.mobileSystemHeader}>
                    <SystemHeader
                        icon="🎒"
                        label="SYSTEM: INVENTORY"
                        title="Hunter storage"
                    />
                    {/* Sole list-view close — hidden while item detail is open (detail owns the one X) */}
                    {onClose && !selectedItemData ? (
                        <button
                            type="button"
                            className={inventoryStyles.mobileInvClose}
                            onClick={onClose}
                            aria-label="Close inventory"
                        >
                            ✕
                        </button>
                    ) : null}
                </div>
            )}
            {/* Left Panel - Categories & Items Grid */}
            <div
                className={`${inventoryStyles.inventoryLeftPanel} ${
                    selectedItemData ? inventoryStyles.inventoryLeftPanelSplit : ""
                }`}
            >
                {/* Tab Navigation */}
                <div className={inventoryStyles.tabNavigation}>
                    <button
                        className={`${inventoryStyles.tabButton} ${activeTab === "all" ? inventoryStyles.activeTab : ""}`}
                        onClick={() => setActiveTab("all")}
                    >
                        <span className={inventoryStyles.tabIcon}>📦</span>
                        {isMobile ? "All" : "All Items"}
                    </button>
                    <button
                        className={`${inventoryStyles.tabButton} ${activeTab === "materials" ? inventoryStyles.activeTab : ""}`}
                        onClick={() => setActiveTab("materials")}
                    >
                        <span className={inventoryStyles.tabIcon}>💎</span>
                        {isMobile ? "Mats" : "Materials"}
                        {materials.length > 0 && (
                            <span className={inventoryStyles.tabBadge}>{materials.length}</span>
                        )}
                    </button>
                    <button
                        className={`${inventoryStyles.tabButton} ${activeTab === "equipment" ? inventoryStyles.activeTab : ""}`}
                        onClick={() => setActiveTab("equipment")}
                    >
                        <span className={inventoryStyles.tabIcon}>⚔️</span>
                        {isMobile ? "Gear" : "Equipment"}
                    </button>
                    <button
                        className={`${inventoryStyles.tabButton} ${activeTab === "artifact" ? inventoryStyles.activeTab : ""}`}
                        onClick={() => setActiveTab("artifact")}
                    >
                        <span className={inventoryStyles.tabIcon}>🗝️</span>
                        {isMobile ? "Keys" : "Artifacts"}
                    </button>
                    
                    {/* Refresh — icon-only on phone to save tab space */}
                    <button
                        className={inventoryStyles.tabButton}
                        onClick={async () => {
                            console.log('🎒 [Inventory] Manual refresh triggered');
                            await reloadInventory();
                        }}
                        style={{ marginLeft: 'auto' }}
                        title="Refresh Inventory"
                        aria-label="Refresh Inventory"
                    >
                        <span className={inventoryStyles.tabIcon}>🔄</span>
                        {!isMobile && "Refresh"}
                    </button>
                </div>

                {/* Category chips removed for simplified tab layout */}

                {/* Materials Quality Filter — desktop chrome; phone keeps tabs + search only */}
                {activeTab === "materials" && !isMobile && (
                    <div className={inventoryStyles.qualityFilter}>
                        <div className={inventoryStyles.qualityTitle}>Quality Filter:</div>
                        <div className={inventoryStyles.qualityButtons}>
                            {Object.entries(materialsByQuality).map(([quality, items]) => (
                                items.length > 0 && (
                                    <button
                                        key={quality}
                                        className={inventoryStyles.qualityButton}
                                        onClick={() => setSelectedCategory(quality)}
                                        style={{
                                            background: selectedCategory === quality 
                                                ? "rgba(69, 183, 209, 0.3)" 
                                                : "rgba(255, 255, 255, 0.05)",
                                            borderColor: selectedCategory === quality 
                                                ? "#45B7D1" 
                                                : "rgba(255, 255, 255, 0.1)"
                                        }}
                                    >
                                        <span className={inventoryStyles.qualityIcon}>
                                            {quality === 'masterwork' ? '⭐' : 
                                             quality === 'refined' ? '✨' : 
                                             quality === 'normal' ? '⚪' : 
                                             quality === 'fresh' ? '🌱' : '🍂'}
                                        </span>
                                        <span className={inventoryStyles.qualityName}>
                                            {quality.charAt(0).toUpperCase() + quality.slice(1)}
                                        </span>
                                        <span className={inventoryStyles.qualityCount}>
                                            {items.length}
                                        </span>
                                    </button>
                                )
                            ))}
                        </div>
                        
                        {/* Materials Summary */}
                        <div className={inventoryStyles.materialsSummary}>
                            <div className={inventoryStyles.summaryItem}>
                                <span className={inventoryStyles.summaryIcon}>💎</span>
                                <span className={inventoryStyles.summaryLabel}>Total Materials:</span>
                                <span className={inventoryStyles.summaryValue}>{materials.length}</span>
                            </div>
                            <div className={inventoryStyles.summaryItem}>
                                <span className={inventoryStyles.summaryIcon}>💰</span>
                                <span className={inventoryStyles.summaryLabel}>Total Value:</span>
                                <span className={inventoryStyles.summaryValue}>
                                    {currencySymbol} {materials.reduce((total, item) => total + (item.value || 0), 0)}
                                </span>
                            </div>
                            <div className={inventoryStyles.summaryItem}>
                                <span className={inventoryStyles.summaryIcon}>⭐</span>
                                <span className={inventoryStyles.summaryLabel}>Masterwork:</span>
                                <span className={inventoryStyles.summaryValue}>
                                    {materialsByQuality.masterwork.length}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search + filters */}
                <div className={inventoryStyles.searchContainer}>
                    <input
                        type="search"
                        placeholder={isMobile ? "Search items…" : "🔍 Search items, descriptions, tags..."}
                        value={enhancedState.filter.search || searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const value = e.target.value;
                            setSearchTerm(value);
                            setEnhancedState(prev => ({
                                ...prev,
                                filter: { ...prev.filter, search: value }
                            }));
                        }}
                        className={inventoryStyles.searchBar}
                    />
                </div>

                {/* Phone: compact sort that actually drives the list */}
                {isMobile ? (
                    <div className={inventoryStyles.mobileSortRow}>
                        <label className={inventoryStyles.mobileSortLabel} htmlFor="inv-mobile-sort">
                            Sort
                        </label>
                        <select
                            id="inv-mobile-sort"
                            className={inventoryStyles.mobileSortSelect}
                            value={sortMethod}
                            onChange={(e) => {
                                const field = e.target.value as typeof sortMethod;
                                setSortMethod(field);
                                setEnhancedState(prev => ({
                                    ...prev,
                                    sort: { ...prev.sort, field: field as InventorySortOptions['field'] }
                                }));
                            }}
                        >
                            <option value="name">Name</option>
                            <option value="rarity">Rarity</option>
                            <option value="quantity">Quantity</option>
                            <option value="value">Value</option>
                        </select>
                        <button
                            type="button"
                            className={inventoryStyles.mobileSortOrder}
                            onClick={() => {
                                const next = sortOrder === "asc" ? "desc" : "asc";
                                setSortOrder(next);
                                setEnhancedState(prev => ({
                                    ...prev,
                                    sort: { ...prev.sort, order: next }
                                }));
                            }}
                            aria-label="Toggle sort order"
                        >
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </button>
                        <button
                            type="button"
                            className={`${inventoryStyles.filterToggle} ${showFilters ? inventoryStyles.active : ""}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            Filters
                        </button>
                    </div>
                ) : (
                <div className={inventoryStyles.filterControls}>
                    <div className={inventoryStyles.filterSection}>
                        <button
                            className={`${inventoryStyles.filterToggle} ${showFilters ? inventoryStyles.active : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            🔽 Filters & Sort
                        </button>
                    </div>
                    
                    {showFilters && (
                        <div className={inventoryStyles.filterOptions}>
                            {/* Enhanced Filter Bar */}
                            <div className={inventoryStyles.enhancedFilterBar}>
                                {/* Category filter */}
                                <select
                                    value={enhancedState.filter.category || 'all'}
                                    onChange={(e) => setEnhancedState(prev => ({
                                        ...prev,
                                        filter: { ...prev.filter, category: e.target.value === 'all' ? undefined : e.target.value }
                                    }))}
                                    className={inventoryStyles.filterSelect}
                                >
                                    <option value="all">All Categories</option>
                                    <option value="equipment">Equipment</option>
                                    <option value="material">Materials</option>
                                    <option value="consumable">Consumables</option>
                                    <option value="artifact">Artifacts</option>
                                    <option value="tool">Tools</option>
                                    <option value="treasure">Treasures</option>
                                </select>

                                {/* Rarity filter */}
                                <select
                                    value={enhancedState.filter.rarity || 'all'}
                                    onChange={(e) => setEnhancedState(prev => ({
                                        ...prev,
                                        filter: { ...prev.filter, rarity: e.target.value === 'all' ? undefined : e.target.value }
                                    }))}
                                    className={inventoryStyles.filterSelect}
                                >
                                    <option value="all">All Rarities</option>
                                    <option value="common">Common</option>
                                    <option value="uncommon">Uncommon</option>
                                    <option value="rare">Rare</option>
                                    <option value="epic">Epic</option>
                                    <option value="legendary">Legendary</option>
                                </select>

                                {/* Special filters */}
                                <div className={inventoryStyles.toggleFilters}>
                                    <label className={inventoryStyles.toggleFilter}>
                                        <input
                                            type="checkbox"
                                            checked={enhancedState.filter.equipped === true}
                                            onChange={(e) => setEnhancedState(prev => ({
                                                ...prev,
                                                filter: { ...prev.filter, equipped: e.target.checked ? true : undefined }
                                            }))}
                                        />
                                        Equipped Only
                                    </label>
                                    <label className={inventoryStyles.toggleFilter}>
                                        <input
                                            type="checkbox"
                                            checked={enhancedState.filter.favorite === true}
                                            onChange={(e) => setEnhancedState(prev => ({
                                                ...prev,
                                                filter: { ...prev.filter, favorite: e.target.checked ? true : undefined }
                                            }))}
                                        />
                                        Favorites Only
                                    </label>
                                    <label className={inventoryStyles.toggleFilter}>
                                        <input
                                            type="checkbox"
                                            checked={enhancedState.filter.hasEffects === true}
                                            onChange={(e) => setEnhancedState(prev => ({
                                                ...prev,
                                                filter: { ...prev.filter, hasEffects: e.target.checked ? true : undefined }
                                            }))}
                                        />
                                        Has Effects
                                    </label>
                                </div>
                            </div>

                            {/* Enhanced Sort controls */}
                            <div className={inventoryStyles.enhancedSortBar}>
                                <label>Sort by:</label>
                                <select
                                    value={enhancedState.sort.field}
                                    onChange={(e) => {
                                        const field = e.target.value as InventorySortOptions['field'];
                                        setEnhancedState(prev => ({
                                            ...prev,
                                            sort: { ...prev.sort, field }
                                        }));
                                        if (
                                            field === "name" ||
                                            field === "rarity" ||
                                            field === "quantity" ||
                                            field === "value"
                                        ) {
                                            setSortMethod(field);
                                        }
                                    }}
                                    className={inventoryStyles.sortSelect}
                                >
                                    <option value="name">Name</option>
                                    <option value="rarity">Rarity</option>
                                    <option value="quantity">Quantity</option>
                                    <option value="value">Value</option>
                                    <option value="acquiredDate">Acquired Date</option>
                                    <option value="lastUsed">Last Used</option>
                                    <option value="category">Category</option>
                                </select>
                                <button
                                    className={`${inventoryStyles.sortOrderButton} ${enhancedState.sort.order === 'desc' ? inventoryStyles.active : ''}`}
                                    onClick={() => {
                                        const next = enhancedState.sort.order === 'asc' ? 'desc' : 'asc';
                                        setEnhancedState(prev => ({
                                            ...prev,
                                            sort: { ...prev.sort, order: next }
                                        }));
                                        setSortOrder(next);
                                    }}
                                >
                                    {enhancedState.sort.order === 'asc' ? '↑' : '↓'}
                                </button>
                            </div>

                            {/* Original Sort Method */}
                            <div className={inventoryStyles.filterGroup}>
                                <label className={inventoryStyles.filterLabel}>Sort by:</label>
                                <select
                                    value={sortMethod}
                                    onChange={(e) => setSortMethod(e.target.value as any)}
                                    className={inventoryStyles.filterSelect}
                                >
                                    <option value="name">Name</option>
                                    <option value="rarity">Rarity</option>
                                    <option value="quantity">Quantity</option>
                                    <option value="value">Value</option>
                                </select>
                            </div>

                            {/* Sort Order */}
                            <div className={inventoryStyles.filterGroup}>
                                <label className={inventoryStyles.filterLabel}>Order:</label>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                    className={inventoryStyles.filterSelect}
                                >
                                    <option value="asc">Ascending</option>
                                    <option value="desc">Descending</option>
                                </select>
                            </div>

                            {/* View Mode — desktop only (phone stays list) */}
                            {!isMobile && (
                            <div className={inventoryStyles.filterGroup}>
                                <label className={inventoryStyles.filterLabel}>View:</label>
                                <div className={inventoryStyles.viewModeButtons}>
                                    <button
                                        className={`${inventoryStyles.viewModeButton} ${viewMode === 'grid' ? inventoryStyles.active : ''}`}
                                        onClick={() => setViewMode('grid')}
                                    >
                                        ⊞ Grid
                                    </button>
                                    <button
                                        className={`${inventoryStyles.viewModeButton} ${viewMode === 'list' ? inventoryStyles.active : ''}`}
                                        onClick={() => setViewMode('list')}
                                    >
                                        ≡ List
                                    </button>
                                </div>
                            </div>
                            )}
                        </div>
                    )}
                </div>
                )}

                {/* Phone filter panel — same state, now wired into the list */}
                {isMobile && showFilters && (
                    <div className={inventoryStyles.mobileFilterPanel}>
                        <select
                            value={enhancedState.filter.category || "all"}
                            onChange={(e) =>
                                setEnhancedState((prev) => ({
                                    ...prev,
                                    filter: {
                                        ...prev.filter,
                                        category:
                                            e.target.value === "all"
                                                ? undefined
                                                : e.target.value,
                                    },
                                }))
                            }
                            className={inventoryStyles.filterSelect}
                        >
                            <option value="all">All Categories</option>
                            <option value="equipment">Equipment</option>
                            <option value="material">Materials</option>
                            <option value="consumable">Consumables</option>
                            <option value="artifact">Artifacts</option>
                            <option value="tool">Tools</option>
                            <option value="treasure">Treasures</option>
                            <option value="misc">Misc</option>
                        </select>
                        <select
                            value={enhancedState.filter.rarity || "all"}
                            onChange={(e) =>
                                setEnhancedState((prev) => ({
                                    ...prev,
                                    filter: {
                                        ...prev.filter,
                                        rarity:
                                            e.target.value === "all"
                                                ? undefined
                                                : e.target.value,
                                    },
                                }))
                            }
                            className={inventoryStyles.filterSelect}
                        >
                            <option value="all">All Rarities</option>
                            <option value="common">Common</option>
                            <option value="uncommon">Uncommon</option>
                            <option value="rare">Rare</option>
                            <option value="epic">Epic</option>
                            <option value="legendary">Legendary</option>
                        </select>
                        <label className={inventoryStyles.toggleFilter}>
                            <input
                                type="checkbox"
                                checked={enhancedState.filter.equipped === true}
                                onChange={(e) =>
                                    setEnhancedState((prev) => ({
                                        ...prev,
                                        filter: {
                                            ...prev.filter,
                                            equipped: e.target.checked
                                                ? true
                                                : undefined,
                                        },
                                    }))
                                }
                            />
                            Equipped only
                        </label>
                    </div>
                )}

                {/* Enhanced Selection Controls — desktop bulk only */}
                {!isMobile && enhancedState.selectedItems.size > 0 && (
                    <div className={inventoryStyles.selectionBar}>
                        <div className={inventoryStyles.selectionInfo}>
                            {enhancedState.selectedItems.size} item(s) selected
                        </div>
                        <div className={inventoryStyles.selectionActions}>
                            <button 
                                onClick={() => {
                                    const allVisible = new Set(processedInventory.map(item => item.name));
                                    setEnhancedState(prev => ({ 
                                        ...prev, 
                                        selectedItems: allVisible,
                                        showBulkActions: allVisible.size > 0 
                                    }));
                                }} 
                                className={inventoryStyles.selectionButton}
                            >
                                Select All Visible
                            </button>
                            <button 
                                onClick={() => setEnhancedState(prev => ({ 
                                    ...prev, 
                                    selectedItems: new Set(),
                                    showBulkActions: false 
                                }))} 
                                className={inventoryStyles.selectionButton}
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}

                {/* Bulk Actions — desktop only */}
                {!isMobile && enhancedState.showBulkActions && (
                    <div className={inventoryStyles.bulkActions}>
                        <button 
                            onClick={async () => {
                                const selectedItemNames = Array.from(enhancedState.selectedItems);
                                if (selectedItemNames.length === 0) return;
                                
                                try {
                                    await InventoryOperations.performBulkOperation(app, {
                                        action: 'favorite',
                                        items: selectedItemNames
                                    });
                                    await reloadInventory();
                                    setEnhancedState(prev => ({ 
                                        ...prev, 
                                        selectedItems: new Set(),
                                        showBulkActions: false 
                                    }));
                                } catch (error) {
                                    console.error('Bulk operation failed:', error);
                                }
                            }}
                            className={inventoryStyles.bulkActionButton}
                        >
                            ⭐ Favorite
                        </button>
                        <button 
                            onClick={async () => {
                                const selectedItemNames = Array.from(enhancedState.selectedItems);
                                if (selectedItemNames.length === 0) return;
                                
                                try {
                                    await InventoryOperations.performBulkOperation(app, {
                                        action: 'sell',
                                        items: selectedItemNames
                                    });
                                    await reloadInventory();
                                    setEnhancedState(prev => ({ 
                                        ...prev, 
                                        selectedItems: new Set(),
                                        showBulkActions: false 
                                    }));
                                } catch (error) {
                                    console.error('Bulk operation failed:', error);
                                }
                            }}
                            className={inventoryStyles.bulkActionButton}
                        >
                            💰 Sell
                        </button>
                        <button 
                            onClick={async () => {
                                const selectedItemNames = Array.from(enhancedState.selectedItems);
                                if (selectedItemNames.length === 0) return;
                                
                                try {
                                    await InventoryOperations.performBulkOperation(app, {
                                        action: 'drop',
                                        items: selectedItemNames
                                    });
                                    await reloadInventory();
                                    setEnhancedState(prev => ({ 
                                        ...prev, 
                                        selectedItems: new Set(),
                                        showBulkActions: false 
                                    }));
                                } catch (error) {
                                    console.error('Bulk operation failed:', error);
                                }
                            }}
                            className={inventoryStyles.bulkActionButton}
                        >
                            🗑️ Drop
                        </button>
                        <button 
                            onClick={async () => {
                                const selectedItemNames = Array.from(enhancedState.selectedItems);
                                if (selectedItemNames.length === 0) return;
                                
                                try {
                                    await InventoryOperations.performBulkOperation(app, {
                                        action: 'use',
                                        items: selectedItemNames
                                    });
                                    await reloadInventory();
                                    setEnhancedState(prev => ({ 
                                        ...prev, 
                                        selectedItems: new Set(),
                                        showBulkActions: false 
                                    }));
                                } catch (error) {
                                    console.error('Bulk operation failed:', error);
                                }
                            }}
                            className={inventoryStyles.bulkActionButton}
                        >
                            ⚡ Use
                        </button>
                    </div>
                )}

                {/* Items Grid - Enhanced Layout */}
                <div className={inventoryStyles.inventoryContent}>
                    {processedInventory.length === 0 ? (
                        <div className={inventoryStyles.emptyState}>
                            <div className={inventoryStyles.emptyStateIcon}>
                                {activeTab === "materials" ? "💎" : activeTab === "equipment" ? "⚔️" : activeTab === "artifact" ? "🗝️" : "📦"}
                            </div>
                            <div className={inventoryStyles.emptyStateText}>
                                {activeTab === "materials" ? "No Materials Found" : 
                                 activeTab === "equipment" ? "No Equipment Found" : 
                                 activeTab === "artifact" ? "No Artifacts Found" : "No Items Found"}
                            </div>
                            <div className={inventoryStyles.emptyStateSubtext}>
                                {searchTerm ? "Try adjusting your search terms" : 
                                 activeTab === "materials" ? "Complete quests, habits, and pomodoros to earn materials!" :
                                 activeTab === "equipment" ? "Craft or earn equipment to see it here!" :
                                 activeTab === "artifact" ? "Discover key items and artifacts during your journey!" :
                                 "Your inventory is empty"}
                            </div>
                        </div>
                    ) : (
                        <div className={`${inventoryStyles.inventoryGrid}${isMobile ? ` ${inventoryStyles.inventoryGridMobileList}` : ""}`}>
                            {visibleInventory.map((item: InventoryItem) => {
                                const isSelected = selectedItem === item.name;
                                const isHovered = !isMobile && hoveredItem === item.name;
                                const isEnhancedSelected = !isMobile && enhancedState.selectedItems.has(item.name);
                                const rarityColor = getRarityColor(item.rarity || "common");
                                const isMaterial = item.category === "material";
                                const isEquipped = item.tags?.includes('equipped') || false;
                                const isFavorite = false; // Will be populated from enhanced data

                                return (
                                    <div
                                        key={item.name}
                                        className={`${inventoryStyles.inventorySlot} ${
                                            isSelected ? inventoryStyles.selected : ""
                                        } ${isMaterial ? inventoryStyles.materialSlot : ""} ${
                                            isEnhancedSelected ? inventoryStyles.enhancedSelected : ""
                                        } ${isFavorite ? inventoryStyles.favorite : ""} ${
                                            isEquipped ? inventoryStyles.equipped : ""
                                        }`}
                                        onClick={() => handleItemClick(item.name)}
                                        onMouseEnter={() => !isMobile && setHoveredItem(item.name)}
                                        onMouseLeave={() => !isMobile && setHoveredItem("")}
                                        style={{
                                            borderColor: isSelected || isHovered || isEnhancedSelected
                                                ? rarityColor 
                                                : "rgba(255, 255, 255, 0.15)"
                                        }}
                                    >
                                        {/* Enhanced Selection Checkbox — desktop only */}
                                        {!isMobile && (
                                        <div className={inventoryStyles.itemCheckbox}>
                                            <input
                                                type="checkbox"
                                                checked={isEnhancedSelected}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    const newSelected = new Set(enhancedState.selectedItems);
                                                    if (newSelected.has(item.name)) {
                                                        newSelected.delete(item.name);
                                                    } else {
                                                        newSelected.add(item.name);
                                                    }
                                                    setEnhancedState(prev => ({ 
                                                        ...prev, 
                                                        selectedItems: newSelected,
                                                        showBulkActions: newSelected.size > 0 
                                                    }));
                                                }}
                                            />
                                        </div>
                                        )}

                                        {/* Favorite Indicator */}
                                        {isFavorite && (
                                            <div className={inventoryStyles.favoriteIndicator}>⭐</div>
                                        )}

                                        {/* Equipped Indicator */}
                                        {isEquipped && (
                                            <div className={inventoryStyles.equippedIndicator}>🛡️</div>
                                        )}

                                        {/* Quantity Badge */}
                                        {item.quantity && item.quantity > 1 && (
                                            <div className={inventoryStyles.quantityBadge}>
                                                {item.quantity}
                                            </div>
                                        )}

                                        {/* Quality Badge for Materials */}
                                        {isMaterial && (
                                            <div className={inventoryStyles.qualityBadge}>
                                                {item.tags?.some(tag => tag.includes('masterwork')) ? '⭐' :
                                                 item.tags?.some(tag => tag.includes('refined')) ? '✨' :
                                                 item.tags?.some(tag => tag.includes('fresh')) ? '🌱' :
                                                 item.tags?.some(tag => tag.includes('dried')) ? '🍂' : '⚪'}
                                            </div>
                                        )}

                                        {/* Rarity Indicator */}
                                        <div 
                                            className={inventoryStyles.rarityIndicator}
                                            style={{ color: rarityColor }}
                                        />

                                        {/* Item Icon - No click handler to avoid conflicts */}
                                        <div className={inventoryStyles.itemIcon}>
                                            {item.icon || (isMaterial ? getMaterialIcon(item.name) : getItemIcon(item.name))}
                                        </div>

                                        {/* Change icon — desktop only */}
                                        {!isMobile && (
                                        <button
                                            className={inventoryStyles.changeIconButton}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEnhancedState(prev => ({ 
                                                    ...prev, 
                                                    showIconPicker: true, 
                                                    iconPickerItem: item.name 
                                                }));
                                            }}
                                            title="Change icon"
                                            aria-label="Change icon"
                                        >
                                            ✏️
                                        </button>
                                        )}

                                        {/* Item Name */}
                                        <div className={inventoryStyles.itemName}>
                                            {item.name}
                                        </div>

                                        {/* Item Rarity */}
                                        <div 
                                            className={inventoryStyles.itemRarity}
                                            style={{ color: rarityColor }}
                                        >
                                            {getRarityDisplayName(item.rarity || "common")}
                                        </div>

                                        {/* Material Category — desktop list chrome */}
                                        {isMaterial && !isMobile && (
                                            <div className={inventoryStyles.materialCategory}>
                                                {item.tags?.find(tag => ['organic', 'mineral', 'crystal', 'essence', 'mystical'].includes(tag)) || 'material'}
                                            </div>
                                        )}


                                    </div>
                                );
                            })}
                            {isMobile && processedInventory.length > mobileVisibleCount && (
                                <button
                                    type="button"
                                    className={inventoryStyles.mobileShowMore}
                                    onClick={() =>
                                        setMobileVisibleCount((n) => n + MOBILE_INV_PAGE)
                                    }
                                >
                                    Show more ({processedInventory.length - mobileVisibleCount} left)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Item details — bottom sheet on phone, side panel on desktop */}
            {selectedItemData && (
                <div
                    className={isMobile ? inventoryStyles.itemDetailBackdrop : undefined}
                    onClick={isMobile ? () => setSelectedItem(null) : undefined}
                    role={isMobile ? "presentation" : undefined}
                    style={isMobile ? undefined : { display: "contents" }}
                >
                <div
                    className={`${inventoryStyles.itemDetailsPanel}${isMobile ? ` ${inventoryStyles.itemDetailsPanelMobile}` : ""}`}
                    onClick={isMobile ? (e) => e.stopPropagation() : undefined}
                >
                    {/* Enhanced Item Header with Close Button */}
                    <div className={inventoryStyles.selectedItemHeader}>
                        <div className={inventoryStyles.selectedItemIcon}>
                            {selectedItemData.icon || getItemIcon(selectedItemData.name)}
                        </div>
                        
                        <div className={inventoryStyles.selectedItemName}>
                            {selectedItemData.name}
                        </div>
                        
                        <div 
                            className={inventoryStyles.selectedItemRarity}
                            style={{ 
                                color: getRarityColor(selectedItemData.rarity || "common"),
                                borderColor: getRarityColor(selectedItemData.rarity || "common") + "40"
                            }}
                        >
                            ✦ {getRarityDisplayName(selectedItemData.rarity || "common")} ✦
                        </div>

                        {/* Sole X while detail is open — returns to list (list header owns inventory close) */}
                        <button
                            type="button"
                            className={inventoryStyles.closeItemButton}
                            onClick={() => setSelectedItem(null)}
                            title="Close item details"
                            aria-label="Close item details"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Item Description */}
                    <div className={inventoryStyles.itemDescription}>
                        {selectedItemData.description || getItemDescription(selectedItemData)}
                    </div>

                    {/* Enhanced Item Stats */}
                    <div className={inventoryStyles.selectedItemDetails}>
                        {/* Effects/Boosts */}
                        {(selectedItemData.effects && selectedItemData.effects.length > 0) && (
                            <div className={inventoryStyles.detailItem}>
                                <div className={inventoryStyles.detailLabel}>
                                    <span className={inventoryStyles.detailIcon}>✨</span>
                                    Effects
                                </div>
                                <div className={inventoryStyles.detailValue}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {selectedItemData.effects.map((eff, idx) => (
                                            <span key={idx} style={{
                                                background: '#1f3b4d',
                                                color: '#cbe9ff',
                                                border: '1px solid #2c5b73',
                                                borderRadius: 2,
                                                padding: '2px 8px',
                                                fontSize: '0.8em'
                                            }}>
                                                {renderInventoryEffect(eff, currencyName)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Quantity */}
                        {selectedItemData.quantity && (
                            <div className={inventoryStyles.detailItem}>
                                <div className={inventoryStyles.detailLabel}>
                                    <span className={inventoryStyles.detailIcon}>📦</span>
                                    Quantity
                                </div>
                                <div className={inventoryStyles.detailValue}>
                                    {selectedItemData.quantity}
                                </div>
                            </div>
                        )}

                        {/* Category */}
                        <div className={inventoryStyles.detailItem}>
                            <div className={inventoryStyles.detailLabel}>
                                <span className={inventoryStyles.detailIcon}>🏷️</span>
                                Category
                            </div>
                            <div className={inventoryStyles.detailValue}>
                                {CATEGORIES[selectedItemData.category as keyof typeof CATEGORIES]?.name || selectedItemData.category || "Miscellaneous"}
                            </div>
                        </div>

                        {/* Rarity Details */}
                        <div className={inventoryStyles.detailItem}>
                            <div className={inventoryStyles.detailLabel}>
                                <span className={inventoryStyles.detailIcon}>⭐</span>
                                Rarity Level
                            </div>
                            <div 
                                className={inventoryStyles.detailValue}
                                style={{ color: getRarityColor(selectedItemData.rarity || "common") }}
                            >
                                {getRarityDisplayName(selectedItemData.rarity || "common")}
                            </div>
                        </div>

                        {/* Item Tags (if available) */}
                        {!isMobile && selectedItemData.tags && selectedItemData.tags.length > 0 && (
                            <div className={inventoryStyles.detailItem}>
                                <div className={inventoryStyles.detailLabel}>
                                    <span className={inventoryStyles.detailIcon}>🏷️</span>
                                    Tags
                                </div>
                                <div className={inventoryStyles.detailValue}>
                                    {selectedItemData.tags.join(", ")}
                                </div>
                            </div>
                        )}

                        {/* Item Value (if available) */}
                        {typeof selectedItemData.value === 'number' && (
                            <div className={inventoryStyles.detailItem}>
                                <div className={inventoryStyles.detailLabel}>
                                    <span className={inventoryStyles.detailIcon}>💰</span>
                                    Value (Sell Price)
                                </div>
                                <div className={inventoryStyles.detailValue}>
                                    {currencySymbol} {selectedItemData.value} {currencyName.toLowerCase()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className={inventoryStyles.itemActions}>
                        <button 
                            className={inventoryStyles.actionButton}
                            onClick={async () => {
                                const usesLeft = (selectedItemData as any).usesRemaining;
                                const willRemove = typeof usesLeft === 'number'
                                    ? usesLeft <= 1
                                    : !selectedItemData.quantity || selectedItemData.quantity <= 1;
                                await useItem(app, selectedItemData.name);
                                await reloadInventory();
                                if (willRemove) {
                                    setSelectedItem(null);
                                }
                            }}
                        >
                            <span>⚡</span>
                            Use
                        </button>
                        
                        <button 
                            className={inventoryStyles.actionButton}
                            onClick={async () => {
                                await dropItem(app, selectedItemData.name);
                                await reloadInventory();
                                setSelectedItem(null);
                            }}
                        >
                            <span>🗑️</span>
                            Drop
                        </button>

                        <button 
                            className={inventoryStyles.actionButton}
                            onClick={async () => {
                                await equipItem(app, selectedItemData.name);
                                await reloadInventory();
                            }}
                        >
                            <span>🛡️</span>
                            {selectedItemData.tags?.includes('equipped') ? 'Unequip' : 'Equip'}
                        </button>

                        <button 
                            className={inventoryStyles.actionButton}
                            onClick={async () => {
                                const saleValue = Math.max(0, Number(selectedItemData.value ?? 0));
                                const confirmMsg = saleValue > 0
                                  ? `Sell ${selectedItemData.name} for ${saleValue} ${currencyName.toLowerCase()}?`
                                  : `Sell ${selectedItemData.name}?`;
                                const confirmed = confirm(confirmMsg);
                                if (!confirmed) return;
                                await sellItem(app, selectedItemData.name);
                                await reloadInventory();
                                setSelectedItem(null);
                            }}
                        >
                            <span>💰</span>
                            Sell
                        </button>

                        {!isMobile && (
                        <button 
                            className={`${inventoryStyles.actionButton} ${inventoryStyles.favoriteActionButton}`}
                            onClick={async () => {
                                console.log('Toggle favorite for:', selectedItemData.name);
                            }}
                            title="Toggle favorite"
                        >
                            <span>⭐</span>
                            Favorite
                        </button>
                        )}
                    </div>

                    {/* Item Lore — desktop only */}
                    {!isMobile && (
                    <div className={inventoryStyles.itemLore}>
                        <div className={inventoryStyles.loreTitle}>✨ Item Lore</div>
                        <div className={inventoryStyles.loreText}>
                            {getItemLore(selectedItemData)}
                        </div>
                    </div>
                    )}
                </div>
                </div>
            )}

            {/* Icon Picker Modal */}
            {enhancedState.showIconPicker && enhancedState.iconPickerItem && (
                <div className={inventoryStyles.iconPickerOverlay} onClick={() => setEnhancedState(prev => ({ ...prev, showIconPicker: false, iconPickerItem: undefined }))}>
                    <div className={inventoryStyles.iconPickerModal} onClick={(e) => e.stopPropagation()}>
                        <div className={inventoryStyles.iconPickerHeader}>
                            <h3>Choose Icon for {enhancedState.iconPickerItem}</h3>
                            <button 
                                onClick={() => setEnhancedState(prev => ({ ...prev, showIconPicker: false, iconPickerItem: undefined }))} 
                                className={inventoryStyles.iconPickerClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={inventoryStyles.iconPickerContent}>
                            <div className={inventoryStyles.iconPickerSearch}>
                                <input
                                    type="text"
                                    placeholder="Search icons..."
                                    className={inventoryStyles.iconSearchInput}
                                />
                            </div>

                            <div className={inventoryStyles.iconGrid}>
                                {/* Popular icons */}
                                {['⚔️', '🛡️', '🏹', '🪄', '💎', '🧪', '🍖', '🗝️', '📜', '📚', '🪙', '❤️', '💙', '🏆', '👑', '💍', '📿', '🔨', '⛏️', '🪓'].map(icon => {
                                    const currentItem = inventory.find(item => item.name === enhancedState.iconPickerItem);
                                    const isCurrentIcon = currentItem?.icon === icon;
                                    
                                    return (
                                        <button
                                            key={icon}
                                            className={`${inventoryStyles.iconButton} ${isCurrentIcon ? inventoryStyles.current : ''}`}
                                                                                    onClick={async () => {
                                            try {
                                                // Update the item icon
                                                await InventoryOperations.updateItemIcon(app, enhancedState.iconPickerItem!, icon);
                                                // Reload inventory to show the updated icon
                                                await reloadInventory();
                                                // Close the icon picker
                                                setEnhancedState(prev => ({ ...prev, showIconPicker: false, iconPickerItem: undefined }));
                                            } catch (error) {
                                                console.error('Failed to update item icon:', error);
                                            }
                                        }}
                                        >
                                            {icon}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryModalContent;

function renderInventoryEffect(raw: string | ShopItemEffect, currencyName: string): string {
    if (typeof raw !== 'string') {
        switch (raw.type) {
            case 'xp': return `+${raw.amount} XP`;
            case 'coins': return `+${raw.amount} ${currencyName}`;
            case 'stat': return `+${raw.amount} ${raw.stat}`;
            case 'unlock': return `Unlocks: ${raw.skill}`;
            case 'meta': return raw.description;
            default: return 'Effect';
        }
    }
    const mBuff = raw.match(/^buff:([a-z]+);mult=([0-9.]+);dur=([0-9smhdw]+)/i);
    if (mBuff) {
        const kind = mBuff[1];
        const mult = parseFloat(mBuff[2]);
        const dur = mBuff[3];
        const label = kind === 'rewards' ? 'All rewards' : kind === 'trade' ? 'Sell value' : kind.toUpperCase();
        const pct = Math.round((mult - 1) * 100);
        return `+${pct}% ${label} for ${dur}`;
    }
    const mDebuff = raw.match(/^debuff:([a-z]+);mult=([0-9.]+);dur=([0-9smhdw]+)/i);
    if (mDebuff) {
        const kind = mDebuff[1];
        const mult = parseFloat(mDebuff[2]);
        const dur = mDebuff[3];
        const label = kind === 'rewards' ? 'All rewards' : kind === 'trade' ? 'Sell value' : kind.toUpperCase();
        const pct = Math.round((1 - mult) * 100);
        return `-${pct}% ${label} for ${dur}`;
    }
    const mSimple = raw.match(/^(xp|coins):\+?(\d+)/i);
    if (mSimple) {
        const type = mSimple[1].toLowerCase();
        const amt = parseInt(mSimple[2], 10);
        return type === 'xp' ? `+${amt} XP` : `+${amt} ${currencyName}`;
    }
    return raw;
}
