import { InventoryItem } from '../../features/inventory/utils/updateInventoryFile';
import { getCraftingMaterials, findMaterialByIdOrName } from '../../features/crafting/utils/craftingMaterialRegistry';

/**
 * Utility functions for identifying and working with crafting materials
 */
export class MaterialUtils {

    /**
     * Check if an inventory item is a crafting material
     */
    static isCraftingMaterial(item: InventoryItem): boolean {
        // Check if it's explicitly categorized as material
        if (item.category === "material") return true;

        // Check if it's a known crafting material category
        const craftingCategories = ['mineral', 'herb', 'crystal', 'essence', 'organic', 'mystical', 'component'];
        if (craftingCategories.includes(item.category || '')) return true;

        // Check if it has crafting-related tags
        if (item.tags?.some(tag => ['craftable', 'material', 'ingredient'].includes(tag.toLowerCase()))) return true;

        // Check against known crafting material names from the crafting engine
        const knownMaterials = getCraftingMaterials();
        return knownMaterials.some(material =>
            material.name.toLowerCase() === item.name.toLowerCase() ||
            material.id.toLowerCase() === item.name.toLowerCase().replace(/\s+/g, '-') ||
            findMaterialByIdOrName(knownMaterials, item.name) !== undefined ||
            item.name.toLowerCase().includes(material.name.toLowerCase()) ||
            material.name.toLowerCase().includes(item.name.toLowerCase())
        );
    }

    /**
     * Get all crafting materials from inventory
     */
    static filterCraftingMaterials(inventory: InventoryItem[]): InventoryItem[] {
        return inventory.filter(item => this.isCraftingMaterial(item));
    }

    /**
     * Group materials by their quality or category for better organization
     */
    /**
     * Effective quality of an item: explicit quality tag first, otherwise
     * mapped from rarity. The quality filter chips and their counts must both
     * use this — filtering by raw tags while counting by rarity shows nothing.
     */
    static getItemQuality(item: InventoryItem): string {
        const qualityTag = item.tags?.find(tag =>
            tag.includes('masterwork') || tag.includes('refined') || tag.includes('fresh') || tag.includes('dried')
        );
        if (qualityTag) {
            if (qualityTag.includes('masterwork')) return 'masterwork';
            if (qualityTag.includes('refined')) return 'refined';
            if (qualityTag.includes('fresh')) return 'fresh';
            return 'dried';
        }

        switch (item.rarity) {
            case 'legendary': return 'masterwork';
            case 'epic': return 'refined';
            case 'uncommon': return 'refined';
            case 'common': return 'normal';
            default: return 'other';
        }
    }

    static groupMaterialsByQuality(materials: InventoryItem[]): { [quality: string]: InventoryItem[] } {
        const grouped: { [quality: string]: InventoryItem[] } = {
            'masterwork': [],
            'refined': [],
            'normal': [],
            'fresh': [],
            'dried': [],
            'other': []
        };

        materials.forEach(item => {
            grouped[this.getItemQuality(item)].push(item);
        });

        return grouped;
    }

    /**
     * Get material categories for filtering
     */
    static getMaterialCategories(): string[] {
        return ['material', 'mineral', 'herb', 'crystal', 'essence', 'organic', 'mystical'];
    }

    /**
     * Get material rarity order for sorting
     */
    static getMaterialRarityOrder(): { [key: string]: number } {
        return { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
    }

    /**
     * Get default icon for an inventory item based on its properties
     */
    static getDefaultIcon(item: InventoryItem): string {
        const name = item.name.toLowerCase();
        const category = item.category?.toLowerCase() || '';

        // If it already has an icon, use it
        if (item.icon && item.icon.trim()) {
            return item.icon;
        }

        // Material-specific icons
        if (this.isCraftingMaterial(item) || category === 'material') {
            if (name.includes('crystal') || name.includes('gem') || name.includes('diamond')) return '💎';
            if (name.includes('wood') || name.includes('timber') || name.includes('log')) return '🪵';
            if (name.includes('stone') || name.includes('rock') || name.includes('boulder')) return '🪨';
            if (name.includes('iron') || name.includes('metal') || name.includes('ore')) return '⛏️';
            if (name.includes('silver')) return '🥈';
            if (name.includes('gold')) return '🥇';
            if (name.includes('herb') || name.includes('plant') || name.includes('leaf')) return '🌿';
            if (name.includes('essence') || name.includes('spirit')) return '✨';
            if (name.includes('phoenix') || name.includes('fire')) return '🔥';
            if (name.includes('dragon') || name.includes('scale')) return '🐉';
            if (name.includes('star') || name.includes('stellar')) return '⭐';
            if (name.includes('void') || name.includes('shadow') || name.includes('dark')) return '🌌';
            if (name.includes('time') || name.includes('temporal')) return '⏰';
            return '💎'; // Default material icon
        }

        // Equipment icons
        if (category === 'equipment' || category === 'weapon' || category === 'armor') {
            if (name.includes('sword') || name.includes('blade')) return '⚔️';
            if (name.includes('shield') || name.includes('buckler')) return '🛡️';
            if (name.includes('bow') || name.includes('crossbow')) return '🏹';
            if (name.includes('staff') || name.includes('wand') || name.includes('rod')) return '🪄';
            if (name.includes('hammer') || name.includes('mace')) return '🔨';
            if (name.includes('axe')) return '🪓';
            if (name.includes('dagger') || name.includes('knife')) return '🔪';
            if (name.includes('armor') || name.includes('helmet') || name.includes('gauntlet')) return '🛡️';
            return '⚔️'; // Default equipment icon
        }

        // Potion/Consumable icons
        if (category === 'potion' || category === 'consumable' || category === 'food') {
            if (name.includes('potion') || name.includes('elixir') || name.includes('tonic')) return '🧪';
            if (name.includes('health') || name.includes('healing') || name.includes('cure')) return '❤️';
            if (name.includes('mana') || name.includes('magic') || name.includes('arcane')) return '💙';
            if (name.includes('food') || name.includes('bread') || name.includes('meat')) return '🍖';
            if (name.includes('drink') || name.includes('wine') || name.includes('ale')) return '🍷';
            return '🧪'; // Default consumable icon
        }

        // Artifact/Key Item icons
        if (category === 'artifact' || category === 'key') {
            if (name.includes('crown') || name.includes('tiara') || name.includes('circlet')) return '👑';
            if (name.includes('key') || name.includes('keycard') || name.includes('pass')) return '🗝️';
            if (name.includes('ring')) return '💍';
            if (name.includes('amulet') || name.includes('pendant') || name.includes('necklace')) return '📿';
            if (name.includes('scroll') || name.includes('parchment')) return '📜';
            if (name.includes('book') || name.includes('tome') || name.includes('grimoire')) return '📚';
            if (name.includes('relic') || name.includes('ancient')) return '🏺';
            return '🗝️'; // Default artifact icon
        }

        // Tool icons
        if (category === 'tool') {
            if (name.includes('pickaxe')) return '⛏️';
            if (name.includes('shovel') || name.includes('spade')) return '🪚';
            if (name.includes('hammer')) return '🔨';
            if (name.includes('wrench') || name.includes('spanner')) return '🔧';
            if (name.includes('saw')) return '🪚';
            return '🔧'; // Default tool icon
        }

        // Currency/Treasure icons
        if (category === 'treasure' || category === 'currency') {
            if (name.includes('coin') || name.includes('gold') || name.includes('money')) return '🪙';
            if (name.includes('treasure') || name.includes('chest')) return '💰';
            if (name.includes('jewel') || name.includes('gem')) return '💎';
            return '💰'; // Default treasure icon
        }

        // Generic category fallbacks
        const categoryIcons: { [key: string]: string } = {
            'equipment': '⚔️',
            'weapon': '⚔️',
            'armor': '🛡️',
            'potion': '🧪',
            'consumable': '🧪',
            'food': '🍖',
            'material': '💎',
            'artifact': '🗝️',
            'key': '🗝️',
            'tool': '🔧',
            'treasure': '💰',
            'currency': '🪙',
            'misc': '📦',
            'test': '🧪'
        };

        return categoryIcons[category] || '📦'; // Default fallback icon
    }
}