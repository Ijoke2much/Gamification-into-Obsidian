import { IconPickerCategory } from '../types/EnhancedInventoryTypes';

export class IconPicker {

    static getIconCategories(): IconPickerCategory[] {
        return [
            {
                name: "Weapons",
                icon: "⚔️",
                icons: [
                    "⚔️", "🗡️", "🔪", "🏹", "🪓", "🔨", "⛏️", "🛡️", "🪃", "🏴‍☠️",
                    "🔱", "⚡", "🏹", "🗿", "⛓️", "🪚", "🔧", "⚙️", "🪛", "🔩"
                ]
            },
            {
                name: "Potions & Food",
                icon: "🧪",
                icons: [
                    "🧪", "🍷", "🍺", "🧋", "☕", "🍖", "🍞", "🧄", "🧅", "🍎",
                    "🥛", "🍯", "🧈", "🥓", "🌶️", "🍄", "🥕", "🍇", "🍓", "🥥"
                ]
            },
            {
                name: "Gems & Materials",
                icon: "💎",
                icons: [
                    "💎", "💍", "👑", "🪙", "🥇", "🥈", "🥉", "⭐", "✨", "🔮",
                    "🏺", "⚱️", "🧿", "📿", "💰", "💳", "🪪", "🎖️", "🏆", "🎗️"
                ]
            },
            {
                name: "Magic & Mystical",
                icon: "🪄",
                icons: [
                    "🪄", "📜", "📚", "🔮", "🧿", "🕯️", "🌟", "⚡", "🔥", "❄️",
                    "🌊", "🌪️", "☄️", "🌙", "☀️", "⭐", "✨", "💫", "🌈", "🔯"
                ]
            },
            {
                name: "Tools & Equipment",
                icon: "🔧",
                icons: [
                    "🔧", "⚙️", "🪚", "📏", "📐", "🧲", "🔬", "🗝️", "📦", "⚖️",
                    "🎒", "🧰", "⛏️", "🔨", "🪓", "🛠️", "⚒️", "🔩", "🪛", "⚗️"
                ]
            },
            {
                name: "Artifacts & Keys",
                icon: "🗝️",
                icons: [
                    "🗝️", "🏺", "📿", "🧭", "🗿", "⚱️", "🎭", "🎨", "🪅", "🎯",
                    "🎲", "🃏", "🎪", "🎊", "🎉", "🎁", "🎀", "🏮", "🎐", "🔔"
                ]
            },
            {
                name: "Nature & Organic",
                icon: "🌿",
                icons: [
                    "🌿", "🌱", "🌳", "🍄", "🌸", "🌺", "🌻", "🍃", "🪴", "🌰",
                    "🐚", "🪨", "🏔️", "🌋", "🏝️", "🌊", "🌀", "🌪️", "☄️", "🌙"
                ]
            },
            {
                name: "Animals & Creatures",
                icon: "🐉",
                icons: [
                    "🐉", "🦅", "🐺", "🦁", "🐍", "🦂", "🕷️", "🐙", "🦋", "🐝",
                    "🐢", "🐸", "🦎", "🐲", "🦄", "🐅", "🐆", "🐈", "🦊", "🐻"
                ]
            },
            {
                name: "Symbols & Effects",
                icon: "⚡",
                icons: [
                    "⚡", "🔥", "❄️", "💧", "🌟", "✨", "💫", "🌈", "⭐", "🔯",
                    "♦️", "♠️", "♥️", "♣️", "🔱", "⚜️", "🔰", "⚠️", "☢️", "☣️"
                ]
            },
            {
                name: "Containers & Storage",
                icon: "📦",
                icons: [
                    "📦", "📫", "📪", "📬", "📭", "🗃️", "🗄️", "🗂️", "📋", "📊",
                    "🎒", "👜", "👝", "🛍️", "🧳", "💼", "🎁", "📦", "⚰️", "⚱️"
                ]
            }
        ];
    }

    static getRecentIcons(): string[] {
        try {
            return JSON.parse(localStorage.getItem('recent-inventory-icons') || '[]');
        } catch (error) {
            return [];
        }
    }

    static saveRecentIcon(icon: string): void {
        try {
            const recent = this.getRecentIcons();
            const filtered = recent.filter(i => i !== icon);
            filtered.unshift(icon);
            localStorage.setItem('recent-inventory-icons', JSON.stringify(filtered.slice(0, 12)));
        } catch (error) {
            console.warn('Failed to save recent icon:', error);
        }
    }

    static suggestIconForItem(itemName: string): string[] {
        const name = itemName.toLowerCase();
        const suggestions: string[] = [];

        // Weapon suggestions
        if (name.includes('sword') || name.includes('blade')) suggestions.push("⚔️", "🗡️");
        if (name.includes('bow')) suggestions.push("🏹");
        if (name.includes('hammer')) suggestions.push("🔨");
        if (name.includes('axe')) suggestions.push("🪓");
        if (name.includes('shield')) suggestions.push("🛡️");
        if (name.includes('staff') || name.includes('wand')) suggestions.push("🪄");
        if (name.includes('dagger') || name.includes('knife')) suggestions.push("🔪");

        // Potion and consumable suggestions
        if (name.includes('potion') || name.includes('elixir')) suggestions.push("🧪", "🍷");
        if (name.includes('health')) suggestions.push("❤️", "🧪", "🍖");
        if (name.includes('mana') || name.includes('magic')) suggestions.push("💙", "🔮", "✨");
        if (name.includes('food') || name.includes('bread')) suggestions.push("🍖", "🍞");
        if (name.includes('drink') || name.includes('ale') || name.includes('wine')) suggestions.push("🍷", "🍺");

        // Material suggestions
        if (name.includes('crystal')) suggestions.push("💎", "🔮", "✨");
        if (name.includes('gold')) suggestions.push("🥇", "🪙", "💰");
        if (name.includes('silver')) suggestions.push("🥈");
        if (name.includes('iron') || name.includes('ore')) suggestions.push("⛏️", "🔧");
        if (name.includes('dragon')) suggestions.push("🐉", "🔥");
        if (name.includes('scale')) suggestions.push("🐉", "🐍");
        if (name.includes('wood') || name.includes('timber')) suggestions.push("🪵", "🌳");
        if (name.includes('stone') || name.includes('rock')) suggestions.push("🪨", "🗿");
        if (name.includes('herb') || name.includes('plant')) suggestions.push("🌿", "🍃");
        if (name.includes('essence') || name.includes('spirit')) suggestions.push("✨", "🌟");

        // Artifact suggestions
        if (name.includes('crown')) suggestions.push("👑");
        if (name.includes('key')) suggestions.push("🗝️");
        if (name.includes('scroll')) suggestions.push("📜");
        if (name.includes('book') || name.includes('tome')) suggestions.push("📚");
        if (name.includes('ring')) suggestions.push("💍");
        if (name.includes('amulet') || name.includes('pendant')) suggestions.push("📿");
        if (name.includes('crown') || name.includes('tiara')) suggestions.push("👑");
        if (name.includes('artifact') || name.includes('relic')) suggestions.push("🏺", "⚱️");

        // Tool suggestions
        if (name.includes('pickaxe')) suggestions.push("⛏️");
        if (name.includes('shovel')) suggestions.push("🪚");
        if (name.includes('rope') || name.includes('chain')) suggestions.push("⛓️");
        if (name.includes('compass')) suggestions.push("🧭");
        if (name.includes('map')) suggestions.push("🗺️");

        // Special effects and elements
        if (name.includes('fire') || name.includes('flame')) suggestions.push("🔥");
        if (name.includes('ice') || name.includes('frost')) suggestions.push("❄️");
        if (name.includes('lightning') || name.includes('thunder')) suggestions.push("⚡");
        if (name.includes('water') || name.includes('aqua')) suggestions.push("💧", "🌊");
        if (name.includes('wind') || name.includes('air')) suggestions.push("🌪️");
        if (name.includes('earth') || name.includes('ground')) suggestions.push("🌍");
        if (name.includes('light') || name.includes('holy')) suggestions.push("✨", "🌟");
        if (name.includes('dark') || name.includes('shadow')) suggestions.push("🌙", "🔯");

        // Rarity-based suggestions
        if (name.includes('legendary') || name.includes('mythic')) suggestions.push("🌟", "✨", "👑");
        if (name.includes('epic')) suggestions.push("⭐", "💎");
        if (name.includes('rare')) suggestions.push("💎", "✨");
        if (name.includes('ancient')) suggestions.push("🏺", "⚱️", "🗿");

        // Remove duplicates and return
        return [...new Set(suggestions)];
    }

    static searchIcons(query: string): string[] {
        const allCategories = this.getIconCategories();
        const allIcons: string[] = [];

        allCategories.forEach(category => {
            allIcons.push(...category.icons);
        });

        if (!query) return allIcons;

        // Simple search - could be enhanced with better matching
        const suggestions = this.suggestIconForItem(query);
        const filtered = allIcons.filter(icon =>
            suggestions.includes(icon) ||
            // Add more sophisticated matching logic here if needed
            false
        );

        return [...new Set([...suggestions, ...filtered])];
    }

    static getPopularIcons(): string[] {
        // Most commonly used icons across all categories
        return [
            "⚔️", "🛡️", "🧪", "💎", "🪙", "🗝️", "📜", "🔮", "🌟", "✨",
            "🔥", "❄️", "⚡", "🌿", "🐉", "👑", "💍", "🏺", "📚", "🔨"
        ];
    }
}
