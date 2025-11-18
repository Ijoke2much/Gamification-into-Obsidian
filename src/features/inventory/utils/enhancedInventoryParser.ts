import { InventoryItem } from './updateInventoryFile';
import { EnhancedInventoryItem } from '../types/EnhancedInventoryTypes';

export class EnhancedInventoryParser {

    static parseInventoryFile(content: string): EnhancedInventoryItem[] {
        const items: EnhancedInventoryItem[] = [];
        const lines = content.split("\n");
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();
            if (line && !line.startsWith("//")) {
                const item = this.parseInventoryLine(line);
                if (item) {
                    // Look ahead for comment lines
                    let j = i + 1;
                    while (j < lines.length && lines[j].trim().startsWith("//")) {
                        const comment = lines[j].trim().replace("//", "").trim();
                        this.parseComment(item, comment);
                        j++;
                    }
                    items.push(item);
                    i = j - 1;
                }
            }
            i++;
        }
        return items;
    }

    private static parseInventoryLine(line: string): EnhancedInventoryItem | null {
        // Handle formats like:
        // "Dragon Scale #material #epic x33"
        // "Test #test #common x4" 
        // "Iron Ore #mineral #common x5"
        // "Crown of the Eternal #artifact #legendary x1"

        const parts = line.split(/\s+/);
        let nameParts: string[] = [];
        let quantity = 1;
        const tags: string[] = [];

        for (const part of parts) {
            if (part.startsWith("#")) {
                // Tag - extract without #
                tags.push(part.substring(1));
            } else if (part.match(/^x\d+$/)) {
                // Quantity like "x5"
                const qty = parseInt(part.substring(1));
                if (!isNaN(qty)) quantity = qty;
            } else {
                // Part of the name
                nameParts.push(part);
            }
        }

        const name = nameParts.join(" ").trim();
        if (!name) return null;

        // Determine category and rarity from tags
        const category = this.determineCategory(tags, name);
        const rarity = this.determineRarity(tags);

        return {
            name,
            quantity,
            category,
            rarity,
            tags,
            description: "",
            icon: "",
            effects: [],
            acquiredDate: new Date().toISOString(),
            usageCount: 0,
            isFavorite: false,
            isEquipped: tags.includes('equipped')
        };
    }

    private static parseComment(item: EnhancedInventoryItem, comment: string): void {
        if (comment.startsWith("icon:")) {
            item.icon = comment.replace("icon:", "").trim();
        } else if (comment.startsWith("stock:")) {
            const parsedStock = parseInt(comment.replace("stock:", "").trim());
            if (!isNaN(parsedStock)) item.stock = parsedStock;
        } else if (comment.startsWith("price:")) {
            const parsedPrice = parseInt(comment.replace("price:", "").trim());
            if (!isNaN(parsedPrice)) item.price = parsedPrice;
        } else if (comment.startsWith("value:")) {
            const parsedValue = parseInt(comment.replace("value:", "").trim());
            if (!isNaN(parsedValue)) item.value = parsedValue;
        } else if (comment.startsWith("uses:")) {
            const uses = parseInt(comment.replace("uses:", "").trim());
            if (!isNaN(uses)) (item as any).usesRemaining = uses;
        } else if (comment.startsWith("effect:")) {
            item.effects = item.effects || [];
            item.effects.push(comment.replace("effect:", "").trim());
        } else if (comment.startsWith("acquired:")) {
            item.acquiredDate = comment.replace("acquired:", "").trim();
        } else if (comment.startsWith("lastUsed:")) {
            item.lastUsedDate = comment.replace("lastUsed:", "").trim();
        } else if (comment.startsWith("usageCount:")) {
            const count = parseInt(comment.replace("usageCount:", "").trim());
            if (!isNaN(count)) item.usageCount = count;
        } else if (comment.startsWith("favorite:")) {
            item.isFavorite = comment.replace("favorite:", "").trim() === "true";
        } else if (comment.startsWith("subcategory:")) {
            item.subcategory = comment.replace("subcategory:", "").trim();
        } else if (comment.startsWith("setBonus:")) {
            item.setBonus = comment.replace("setBonus:", "").trim();
        } else if (comment.startsWith("customTags:")) {
            const customTagsStr = comment.replace("customTags:", "").trim();
            item.customTags = customTagsStr ? customTagsStr.split(',').map(t => t.trim()) : [];
        } else {
            // Regular description
            item.description = item.description
                ? `${item.description} ${comment}`
                : comment;
        }
    }

    private static determineCategory(tags: string[], itemName: string): string {
        // Priority mapping for categories with enhanced subcategory support
        const categoryMappings: { [key: string]: string } = {
            // Equipment categories
            'equipment': 'equipment',
            'weapon': 'equipment',
            'armor': 'equipment',
            'tool': 'tool',

            // Consumable categories
            'consumable': 'consumable',
            'potion': 'potion',
            'food': 'potion',
            'scroll': 'consumable',
            'book': 'consumable',

            // Artifact categories
            'artifact': 'artifact',
            'treasure': 'treasure',
            'key': 'artifact',

            // Material categories (enhanced mapping)
            'material': 'material',
            'mineral': 'material',
            'herb': 'material',
            'crystal': 'material',
            'essence': 'material',
            'organic': 'material',
            'mystical': 'material',

            // Misc categories
            'misc': 'misc',
            'test': 'misc'
        };

        // Check tags for explicit category
        for (const tag of tags) {
            if (categoryMappings[tag]) {
                return categoryMappings[tag];
            }
        }

        // Enhanced name-based detection
        const name = itemName.toLowerCase();

        // Equipment detection
        if (name.includes('sword') || name.includes('blade') || name.includes('dagger')) return 'equipment';
        if (name.includes('bow') || name.includes('crossbow') || name.includes('arrow')) return 'equipment';
        if (name.includes('staff') || name.includes('wand') || name.includes('rod')) return 'equipment';
        if (name.includes('armor') || name.includes('helmet') || name.includes('gauntlet')) return 'equipment';
        if (name.includes('shield') || name.includes('buckler')) return 'equipment';

        // Consumable detection
        if (name.includes('potion') || name.includes('elixir') || name.includes('tonic')) return 'potion';
        if (name.includes('food') || name.includes('bread') || name.includes('meat')) return 'potion';
        if (name.includes('scroll') || name.includes('tome') || name.includes('book')) return 'consumable';
        if (name.includes('charm') || name.includes('blessing') || name.includes('token')) return 'consumable';

        // Material detection
        if (name.includes('crystal') || name.includes('gem') || name.includes('shard')) return 'material';
        if (name.includes('ore') || name.includes('ingot') || name.includes('bar')) return 'material';
        if (name.includes('scale') || name.includes('hide') || name.includes('leather')) return 'material';
        if (name.includes('wood') || name.includes('timber') || name.includes('plank')) return 'material';
        if (name.includes('herb') || name.includes('flower') || name.includes('root')) return 'material';

        // Artifact detection
        if (name.includes('crown') || name.includes('tiara') || name.includes('circlet')) return 'artifact';
        if (name.includes('key') || name.includes('keycard') || name.includes('pass')) return 'artifact';
        if (name.includes('relic') || name.includes('artifact') || name.includes('ancient')) return 'artifact';
        if (name.includes('ring') || name.includes('amulet') || name.includes('necklace')) return 'artifact';

        return 'misc';
    }

    private static determineRarity(tags: string[]): string {
        const rarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
        for (const rarity of rarities) {
            if (tags.includes(rarity)) return rarity;
        }
        return 'common';
    }

    // Generate enhanced inventory file content
    static generateInventoryContent(items: EnhancedInventoryItem[]): string {
        const lines: string[] = [];

        for (const item of items) {
            // Main item line
            let line = `${item.name} x${item.quantity ?? 1}`;
            if (item.category) line += ` #${item.category}`;
            if (item.rarity) line += ` #${item.rarity}`;

            // Add extra tags (excluding category and rarity)
            const extraTags = (item.tags ?? []).filter(
                (t) => t && t !== item.category && t !== item.rarity
            );
            if (extraTags.length) {
                line += ` ${extraTags.map((t) => `#${t}`).join(" ")}`;
            }

            lines.push(line);

            // Add comment lines
            if (item.description) lines.push(`// ${item.description}`);
            if (item.icon) lines.push(`// icon:${item.icon}`);
            if (typeof item.price === 'number') lines.push(`// price:${item.price}`);
            if (typeof item.value === 'number') lines.push(`// value:${item.value}`);
        if (typeof (item as any).usesRemaining === 'number') lines.push(`// uses:${(item as any).usesRemaining}`);
            if (item.acquiredDate) lines.push(`// acquired:${item.acquiredDate}`);
            if (item.lastUsedDate) lines.push(`// lastUsed:${item.lastUsedDate}`);
            if (item.usageCount) lines.push(`// usageCount:${item.usageCount}`);
            if (item.isFavorite) lines.push(`// favorite:true`);
            if (item.subcategory) lines.push(`// subcategory:${item.subcategory}`);
            if (item.setBonus) lines.push(`// setBonus:${item.setBonus}`);
            if (item.customTags && item.customTags.length > 0) {
                lines.push(`// customTags:${item.customTags.join(',')}`);
            }

            if (Array.isArray(item.effects)) {
                for (const eff of item.effects) {
                    lines.push(`// effect:${eff}`);
                }
            }
        }

        return lines.join("\n");
    }
}
