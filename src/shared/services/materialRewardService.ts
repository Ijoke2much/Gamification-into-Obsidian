import { CraftingMaterial } from '../../features/crafting/types/CraftingTypes';

export class MaterialRewardService {
    // Get materials based on quest difficulty
    static getQuestMaterials(difficulty: string): { materials: string[], quantity: number, quality: string } {
        switch (difficulty.toLowerCase()) {
            case 'easy':
                return {
                    materials: ['wood', 'stone', 'herb'],
                    quantity: 2,
                    quality: 'normal'
                };
            case 'medium':
                return {
                    materials: ['iron', 'silver', 'crystal'],
                    quantity: 2,
                    quality: 'refined'
                };
            case 'hard':
                return {
                    materials: ['gold', 'diamond', 'essence'],
                    quantity: 1,
                    quality: 'masterwork'
                };
            case 'epic':
                return {
                    materials: ['dragon', 'star', 'phoenix'],
                    quantity: 1,
                    quality: 'masterwork'
                };
            case 'legendary':
                return {
                    materials: ['void', 'time'],
                    quantity: 1,
                    quality: 'masterwork'
                };
            default:
                return {
                    materials: ['wood', 'stone'],
                    quantity: 1,
                    quality: 'normal'
                };
        }
    }

    // Get materials based on habit tree stage
    static getHabitTreeMaterials(treeStage: number): { materials: string[], quantity: number, quality: string } {
        switch (treeStage) {
            case 1: // Sprout
                return {
                    materials: ['wood', 'herb'],
                    quantity: 2,
                    quality: 'fresh'
                };
            case 2: // Sapling
                return {
                    materials: ['stone', 'iron'],
                    quantity: 3,
                    quality: 'normal'
                };
            case 3: // Young Tree
                return {
                    materials: ['silver', 'crystal'],
                    quantity: 2,
                    quality: 'refined'
                };
            case 4: // Mature Tree
                return {
                    materials: ['gold', 'essence'],
                    quantity: 2,
                    quality: 'refined'
                };
            case 5: // World Tree
                return {
                    materials: ['diamond', 'phoenix'],
                    quantity: 1,
                    quality: 'masterwork'
                };
            default:
                return {
                    materials: ['wood'],
                    quantity: 1,
                    quality: 'normal'
                };
        }
    }

    // Get materials based on pomodoro session type and duration
    static getPomodoroMaterials(sessionType: string, duration: number): { materials: string[], quantity: number, quality: string } {
        // Base materials based on session type
        let baseMaterials: string[] = [];
        let baseQuantity = 1;
        let baseQuality = 'normal';

        switch (sessionType.toLowerCase()) {
            case 'short':
                baseMaterials = ['herb'];
                baseQuantity = 1;
                baseQuality = 'fresh';
                break;
            case 'classic':
                baseMaterials = ['wood', 'stone'];
                baseQuantity = 2;
                baseQuality = 'normal';
                break;
            case 'extended':
                baseMaterials = ['iron', 'crystal'];
                baseQuantity = 2;
                baseQuality = 'refined';
                break;
            case 'deepwork':
                baseMaterials = ['silver', 'essence'];
                baseQuantity = 2;
                baseQuality = 'refined';
                break;
            case 'custom':
                baseMaterials = ['wood', 'iron'];
                baseQuantity = 1;
                baseQuality = 'normal';
                break;
            case 'quickfocus':
                baseMaterials = ['herb'];
                baseQuantity = 1;
                baseQuality = 'fresh';
                break;
            default:
                baseMaterials = ['wood'];
                baseQuantity = 1;
                baseQuality = 'normal';
        }

        // Bonus materials for longer sessions
        let bonusMaterials: string[] = [];
        if (duration >= 120) { // 2+ hours
            bonusMaterials = ['diamond', 'phoenix'];
        } else if (duration >= 60) { // 1+ hour
            bonusMaterials = ['gold', 'essence'];
        } else if (duration >= 30) { // 30+ minutes
            bonusMaterials = ['silver', 'crystal'];
        }

        return {
            materials: [...baseMaterials, ...bonusMaterials],
            quantity: baseQuantity + (bonusMaterials.length > 0 ? 1 : 0),
            quality: bonusMaterials.length > 0 ? 'masterwork' : baseQuality
        };
    }

    // Get random material from a list with quality variation
    static getRandomMaterial(materialIds: string[], quality: string): { materialId: string, quality: string } {
        const materialId = materialIds[Math.floor(Math.random() * materialIds.length)];

        // Add some quality variation
        const qualityVariation = Math.random();
        let finalQuality = quality;

        if (qualityVariation > 0.95) {
            finalQuality = 'masterwork';
        } else if (qualityVariation > 0.85) {
            finalQuality = 'refined';
        } else if (qualityVariation > 0.70) {
            finalQuality = 'normal';
        } else if (qualityVariation > 0.50) {
            finalQuality = 'fresh';
        } else {
            finalQuality = 'dried';
        }

        return { materialId, quality: finalQuality };
    }

    // Calculate material rarity bonus
    static getMaterialRarityBonus(materialId: string): number {
        const rarityBonus = {
            'wood': 1.0, 'stone': 1.0, 'herb': 1.0,
            'iron': 1.2, 'silver': 1.5, 'crystal': 1.5,
            'gold': 2.0, 'diamond': 2.5, 'essence': 2.0,
            'dragon': 3.0, 'star': 3.0, 'phoenix': 3.0,
            'void': 5.0, 'time': 5.0
        };

        return rarityBonus[materialId as keyof typeof rarityBonus] || 1.0;
    }

    // Get materials based on boss type and difficulty
    static getBossMaterials(bossType: string, difficulty: string): { materials: string[], quantity: number, quality: string } {
        // Base materials by boss type
        const bossMaterialPools = {
            'procrastination-beast': ['herb', 'wood', 'essence'],
            'distraction-demon': ['crystal', 'silver', 'iron'],
            'perfectionism-dragon': ['dragon', 'gold', 'diamond'],
            'burnout-hydra': ['phoenix', 'essence', 'star'],
            'chaos-lord': ['void', 'time', 'star']
        };

        const baseMaterials = bossMaterialPools[bossType as keyof typeof bossMaterialPools] || ['wood', 'stone'];

        // Difficulty scaling
        const difficultyConfig = {
            'easy': { quantity: 1, quality: 'normal' },
            'medium': { quantity: 2, quality: 'refined' },
            'hard': { quantity: 3, quality: 'masterwork' },
            'nightmare': { quantity: 4, quality: 'masterwork' }
        };

        const config = difficultyConfig[difficulty as keyof typeof difficultyConfig] ||
            difficultyConfig.medium;

        return {
            materials: baseMaterials,
            quantity: config.quantity,
            quality: config.quality
        };
    }
}
