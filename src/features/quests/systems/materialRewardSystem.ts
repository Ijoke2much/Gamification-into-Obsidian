;
import { Boss } from '../types/BossTypes';
import { equipmentCraftingSystem } from './equipmentCraftingSystem';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

/**
 * Material Reward System
 * Handles distribution of crafting materials from boss battles and quest completion
 * Provides balanced material economy for equipment crafting
 */
export class MaterialRewardSystem {
    private static instance: MaterialRewardSystem;
    private materialDatabase: Map<string, MaterialInfo> = new Map();

    private constructor() {
        this.initializeMaterialDatabase();
    }

    static getInstance(): MaterialRewardSystem {
        if (!MaterialRewardSystem.instance) {
            MaterialRewardSystem.instance = new MaterialRewardSystem();
        }
        return MaterialRewardSystem.instance;
    }

    /**
     * Initialize the material database with all crafting materials
     */
    private initializeMaterialDatabase(): void {
        // === BASIC MATERIALS ===
        this.materialDatabase.set('productivity-essence', {
            id: 'productivity-essence',
            name: 'Productivity Essence',
            description: 'Raw essence of productive energy',
            rarity: 'common',
            category: 'essence',
            icon: '✨',
            sources: ['boss-battle', 'quest-completion', 'daily-activity'],
            dropRates: {
                'boss-battle': 0.8,
                'quest-completion': 0.6,
                'daily-activity': 0.3
            }
        });

        this.materialDatabase.set('focus-crystal', {
            id: 'focus-crystal',
            name: 'Focus Crystal',
            description: 'A crystallized form of concentrated attention',
            rarity: 'uncommon',
            category: 'crystal',
            icon: '💎',
            sources: ['boss-battle', 'meditation-tasks', 'deep-work-sessions'],
            dropRates: {
                'boss-battle': 0.5,
                'meditation-tasks': 0.7,
                'deep-work-sessions': 0.4
            }
        });

        this.materialDatabase.set('timer-component', {
            id: 'timer-component',
            name: 'Timer Component',
            description: 'High-precision timing mechanism',
            rarity: 'common',
            category: 'component',
            icon: '⏰',
            sources: ['boss-battle', 'time-management-tasks'],
            dropRates: {
                'boss-battle': 0.6,
                'time-management-tasks': 0.8
            }
        });

        // === ADVANCED MATERIALS ===
        this.materialDatabase.set('endurance-crystal', {
            id: 'endurance-crystal',
            name: 'Endurance Crystal',
            description: 'Crystallized stamina and persistence',
            rarity: 'rare',
            category: 'crystal',
            icon: '💎',
            sources: ['long-boss-battles', 'endurance-challenges'],
            dropRates: {
                'long-boss-battles': 0.3,
                'endurance-challenges': 0.5
            }
        });

        this.materialDatabase.set('creativity-crystal', {
            id: 'creativity-crystal',
            name: 'Creativity Crystal',
            description: 'Crystallized creative inspiration',
            rarity: 'epic',
            category: 'crystal',
            icon: '🎨',
            sources: ['creative-boss-battles', 'artistic-projects'],
            dropRates: {
                'creative-boss-battles': 0.2,
                'artistic-projects': 0.4
            }
        });

        this.materialDatabase.set('intelligence-essence', {
            id: 'intelligence-essence',
            name: 'Intelligence Essence',
            description: 'Pure essence of intellectual prowess',
            rarity: 'epic',
            category: 'essence',
            icon: '🧠',
            sources: ['research-bosses', 'learning-challenges'],
            dropRates: {
                'research-bosses': 0.25,
                'learning-challenges': 0.35
            }
        });

        // === SPECIALIZED COMPONENTS ===
        this.materialDatabase.set('headphone-driver', {
            id: 'headphone-driver',
            name: 'Headphone Driver',
            description: 'Advanced audio driver for noise cancellation',
            rarity: 'uncommon',
            category: 'component',
            icon: '🎧',
            sources: ['focus-boss-battles', 'audio-projects'],
            dropRates: {
                'focus-boss-battles': 0.4,
                'audio-projects': 0.6
            }
        });

        this.materialDatabase.set('noise-canceling-chip', {
            id: 'noise-canceling-chip',
            name: 'Noise-Canceling Chip',
            description: 'Specialized chip for filtering distractions',
            rarity: 'rare',
            category: 'component',
            icon: '🔧',
            sources: ['concentration-bosses', 'tech-projects'],
            dropRates: {
                'concentration-bosses': 0.3,
                'tech-projects': 0.5
            }
        });

        this.materialDatabase.set('comfort-padding', {
            id: 'comfort-padding',
            name: 'Comfort Padding',
            description: 'Ergonomic padding for extended use',
            rarity: 'common',
            category: 'component',
            icon: '🛏️',
            sources: ['comfort-optimization', 'ergonomic-challenges'],
            dropRates: {
                'comfort-optimization': 0.7,
                'ergonomic-challenges': 0.6
            }
        });

        // === RARE ESSENCES ===
        this.materialDatabase.set('silence-essence', {
            id: 'silence-essence',
            name: 'Silence Essence',
            description: 'Pure essence of peaceful quiet',
            rarity: 'rare',
            category: 'essence',
            icon: '🤫',
            sources: ['meditation-bosses', 'quiet-time-challenges'],
            dropRates: {
                'meditation-bosses': 0.35,
                'quiet-time-challenges': 0.45
            }
        });

        this.materialDatabase.set('mastery-essence', {
            id: 'mastery-essence',
            name: 'Mastery Essence',
            description: 'Essence of true skill mastery',
            rarity: 'legendary',
            category: 'essence',
            icon: '👑',
            sources: ['legendary-bosses', 'mastery-achievements'],
            dropRates: {
                'legendary-bosses': 0.1,
                'mastery-achievements': 0.2
            }
        });

        // === LEGENDARY MATERIALS ===
        this.materialDatabase.set('productivity-crystal', {
            id: 'productivity-crystal',
            name: 'Productivity Crystal',
            description: 'Ultimate crystallization of productivity mastery',
            rarity: 'legendary',
            category: 'crystal',
            icon: '💎',
            sources: ['ultimate-bosses', 'productivity-mastery'],
            dropRates: {
                'ultimate-bosses': 0.05,
                'productivity-mastery': 0.1
            }
        });

        this.materialDatabase.set('legendary-core', {
            id: 'legendary-core',
            name: 'Legendary Core',
            description: 'Core component of legendary equipment',
            rarity: 'legendary',
            category: 'component',
            icon: '⭐',
            sources: ['legendary-achievements', 'epic-boss-defeats'],
            dropRates: {
                'legendary-achievements': 0.15,
                'epic-boss-defeats': 0.08
            }
        });
    }

    /**
     * Calculate material rewards for boss battle completion
     */
    calculateBossRewards(
        boss: Boss,
        damageDealt: number,
        timeSpent: number,
        victory: boolean
    ): MaterialReward[] {
        const rewards: MaterialReward[] = [];

        // Base material count based on boss difficulty and victory
        const baseMaterialCount = victory ?
            this.getBossBaseMaterialCount(boss) :
            Math.floor(this.getBossBaseMaterialCount(boss) * 0.3); // 30% for partial completion

        // Time efficiency bonus
        const timeEfficiencyMultiplier = this.calculateTimeEfficiencyMultiplier(timeSpent);

        // Damage efficiency bonus
        const damageEfficiencyMultiplier = this.calculateDamageEfficiencyMultiplier(damageDealt, boss.stats.maxHP);

        const finalMaterialCount = Math.floor(baseMaterialCount * timeEfficiencyMultiplier * damageEfficiencyMultiplier);

        // Select materials based on boss type and rarity
        const availableMaterials = this.getBossMaterials(boss);

        for (let i = 0; i < finalMaterialCount; i++) {
            const material = this.selectRandomMaterial(availableMaterials, 'boss-battle');
            if (material) {
                const existingReward = rewards.find(r => r.materialId === material.id);
                if (existingReward) {
                    existingReward.quantity += 1;
                } else {
                    rewards.push({
                        materialId: material.id,
                        materialName: material.name,
                        quantity: 1,
                        rarity: material.rarity,
                        source: 'boss-battle'
                    });
                }
            }
        }

        // Bonus rare materials for victory
        if (victory) {
            const bonusRareMaterials = this.calculateBonusRareMaterials(boss);
            rewards.push(...bonusRareMaterials);
        }

        return rewards;
    }

    /**
     * Calculate material rewards for quest completion
     */
    calculateQuestRewards(
        questType: string,
        difficulty: number,
        completionTime: number,
        perfectCompletion: boolean
    ): MaterialReward[] {
        const rewards: MaterialReward[] = [];

        const baseMaterialCount = Math.max(1, Math.floor(difficulty / 2));
        const completionMultiplier = perfectCompletion ? 1.5 : 1.0;
        const finalCount = Math.floor(baseMaterialCount * completionMultiplier);

        // Select materials based on quest type
        const questMaterials = this.getQuestTypeMaterials(questType);

        for (let i = 0; i < finalCount; i++) {
            const material = this.selectRandomMaterial(questMaterials, 'quest-completion');
            if (material) {
                const existingReward = rewards.find(r => r.materialId === material.id);
                if (existingReward) {
                    existingReward.quantity += 1;
                } else {
                    rewards.push({
                        materialId: material.id,
                        materialName: material.name,
                        quantity: 1,
                        rarity: material.rarity,
                        source: 'quest-completion'
                    });
                }
            }
        }

        return rewards;
    }

    /**
     * Award materials to player and update crafting system
     */
    async awardMaterials(rewards: MaterialReward[]): Promise<void> {
        if (rewards.length === 0) return;

        const materialMap: Record<string, number> = {};

        // Consolidate rewards
        for (const reward of rewards) {
            materialMap[reward.materialId] = (materialMap[reward.materialId] || 0) + reward.quantity;
        }

        // Add to crafting system
        equipmentCraftingSystem.addMaterials(materialMap);

        // Show notification
        this.showMaterialRewardNotification(rewards);
    }

    /**
     * Get base material count for a boss
     */
    private getBossBaseMaterialCount(boss: Boss): number {
        switch (boss.category) {
            case 'single-session': return 2;
            case 'multi-phase': return 4;
            case 'timed': return 3;
            case 'endurance': return 6;
            case 'rush': return 2;
            default: return 3;
        }
    }

    /**
     * Calculate time efficiency multiplier
     */
    private calculateTimeEfficiencyMultiplier(timeSpent: number): number {
        // Reward faster completion (within reason)
        // Base: 1.0x for normal time, up to 1.5x for fast completion
        const optimalTime = 3600; // 1 hour as baseline
        if (timeSpent <= optimalTime * 0.5) return 1.5; // Very fast
        if (timeSpent <= optimalTime) return 1.2; // Fast
        if (timeSpent <= optimalTime * 2) return 1.0; // Normal
        return 0.8; // Slow
    }

    /**
     * Calculate damage efficiency multiplier
     */
    private calculateDamageEfficiencyMultiplier(damageDealt: number, maxHP: number): number {
        const damageRatio = damageDealt / maxHP;
        if (damageRatio >= 1.0) return 1.3; // Full damage
        if (damageRatio >= 0.8) return 1.1; // High damage
        if (damageRatio >= 0.5) return 1.0; // Medium damage
        return 0.7; // Low damage
    }

    /**
     * Get materials available from a specific boss
     */
    private getBossMaterials(boss: Boss): MaterialInfo[] {
        const materials: MaterialInfo[] = [];

        // Add common materials
        materials.push(
            this.materialDatabase.get('productivity-essence')!,
            this.materialDatabase.get('timer-component')!
        );

        // Add materials based on boss type/name
        const bossName = boss.name.toLowerCase();

        if (bossName.includes('focus') || bossName.includes('concentration')) {
            materials.push(
                this.materialDatabase.get('focus-crystal')!,
                this.materialDatabase.get('headphone-driver')!,
                this.materialDatabase.get('silence-essence')!
            );
        }

        if (bossName.includes('endurance') || bossName.includes('marathon')) {
            materials.push(
                this.materialDatabase.get('endurance-crystal')!,
                this.materialDatabase.get('comfort-padding')!
            );
        }

        if (bossName.includes('creative') || bossName.includes('art')) {
            materials.push(
                this.materialDatabase.get('creativity-crystal')!,
                this.materialDatabase.get('intelligence-essence')!
            );
        }

        // Add rare materials for higher tier bosses (based on boss type)
        if (boss.type === 'epic-boss' || boss.type === 'legendary-boss') {
            materials.push(
                this.materialDatabase.get('mastery-essence')!,
                this.materialDatabase.get('productivity-crystal')!,
                this.materialDatabase.get('legendary-core')!
            );
        }

        return materials.filter(m => m); // Remove any undefined
    }

    /**
     * Get materials based on quest type
     */
    private getQuestTypeMaterials(questType: string): MaterialInfo[] {
        const materials: MaterialInfo[] = [
            this.materialDatabase.get('productivity-essence')!
        ];

        switch (questType.toLowerCase()) {
            case 'focus':
            case 'meditation':
                materials.push(
                    this.materialDatabase.get('focus-crystal')!,
                    this.materialDatabase.get('silence-essence')!
                );
                break;

            case 'creative':
            case 'writing':
            case 'design':
                materials.push(
                    this.materialDatabase.get('creativity-crystal')!,
                    this.materialDatabase.get('intelligence-essence')!
                );
                break;

            case 'learning':
            case 'research':
                materials.push(
                    this.materialDatabase.get('intelligence-essence')!,
                    this.materialDatabase.get('focus-crystal')!
                );
                break;

            default:
                materials.push(this.materialDatabase.get('timer-component')!);
                break;
        }

        return materials.filter(m => m);
    }

    /**
     * Select a random material from available options
     */
    private selectRandomMaterial(materials: MaterialInfo[], source: string): MaterialInfo | null {
        if (materials.length === 0) return null;

        // Filter materials by drop rates for this source
        const availableMaterials = materials.filter(material => {
            const dropRate = material.dropRates[source] || 0;
            return Math.random() < dropRate;
        });

        if (availableMaterials.length === 0) return null;

        // Weight by rarity (rarer materials are less likely)
        const weights = availableMaterials.map(material => {
            switch (material.rarity) {
                case 'common': return 100;
                case 'uncommon': return 50;
                case 'rare': return 20;
                case 'epic': return 8;
                case 'legendary': return 3;
                default: return 50;
            }
        });

        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < availableMaterials.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return availableMaterials[i];
            }
        }

        return availableMaterials[0]; // Fallback
    }

    /**
     * Calculate bonus rare materials for boss victory
     */
    private calculateBonusRareMaterials(boss: Boss): MaterialReward[] {
        const bonusRewards: MaterialReward[] = [];

        // Epic/Legendary bosses have chance for rare materials
        if (boss.type === 'epic-boss' || boss.type === 'legendary-boss') {
            if (Math.random() < 0.3) { // 30% chance
                const rareMaterial = boss.type === 'legendary-boss'
                    ? this.materialDatabase.get('legendary-core')!
                    : this.materialDatabase.get('mastery-essence')!;

                bonusRewards.push({
                    materialId: rareMaterial.id,
                    materialName: rareMaterial.name,
                    quantity: 1,
                    rarity: rareMaterial.rarity,
                    source: 'bonus-reward'
                });
            }
        }

        return bonusRewards;
    }

    /**
     * Show material reward notification
     */
    private showMaterialRewardNotification(rewards: MaterialReward[]): void {
        if (rewards.length === 0) return;

        const totalItems = rewards.reduce((sum, reward) => sum + reward.quantity, 0);

        if (rewards.length === 1) {
            const reward = rewards[0];
            pixelNotice(`🎁 Found ${reward.quantity}x ${reward.materialName}!`, 4000);
        } else {
            pixelNotice(`🎁 Found ${totalItems} crafting materials!`, 4000);
        }

        // Show rare material notifications separately
        const rareRewards = rewards.filter(r => ['epic', 'legendary'].includes(r.rarity));
        for (const rareReward of rareRewards) {
            pixelNotice(`✨ RARE: ${rareReward.quantity}x ${rareReward.materialName}!`, 6000);
        }
    }

    /**
     * Get all available materials
     */
    getAllMaterials(): MaterialInfo[] {
        return Array.from(this.materialDatabase.values());
    }

    /**
     * Get material information by ID
     */
    getMaterial(materialId: string): MaterialInfo | null {
        return this.materialDatabase.get(materialId) || null;
    }
}

// Type definitions
export interface MaterialInfo {
    id: string;
    name: string;
    description: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    category: 'essence' | 'crystal' | 'component';
    icon: string;
    sources: string[];
    dropRates: Record<string, number>;
}

export interface MaterialReward {
    materialId: string;
    materialName: string;
    quantity: number;
    rarity: string;
    source: string;
}

// Export singleton instance
export const materialRewardSystem = MaterialRewardSystem.getInstance();
