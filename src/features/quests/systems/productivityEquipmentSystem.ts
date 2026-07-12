;
import { Boss, PlayerStats } from '../types/BossTypes';
import { EnhancedBattleState } from '../types/EnhancedMoveTypes';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

/**
 * Productivity Equipment System
 * Real-world productivity tools that enhance boss battle performance
 * Bridges the gap between inventory items and combat effectiveness
 */
export class ProductivityEquipmentSystem {
    private static instance: ProductivityEquipmentSystem;
    private equippedGear: Map<EquipmentSlot, ProductivityEquipment> = new Map();
    private equipmentEffects: Map<string, ProductivityEquipment> = new Map();
    private playerInventory: Map<string, number> = new Map(); // itemId -> quantity

    private constructor() {
        this.initializeEquipmentDatabase();
        this.loadEquippedGear();
    }

    static getInstance(): ProductivityEquipmentSystem {
        if (!ProductivityEquipmentSystem.instance) {
            ProductivityEquipmentSystem.instance = new ProductivityEquipmentSystem();
        }
        return ProductivityEquipmentSystem.instance;
    }

    /**
     * Initialize the equipment database with real productivity tools
     */
    private initializeEquipmentDatabase(): void {
        // === WEAPONS (Productivity Tools) ===
        this.equipmentEffects.set('pomodoro-timer', {
            id: 'pomodoro-timer',
            name: 'Pomodoro Timer',
            type: 'weapon',
            rarity: 'common',
            description: 'Focus timer for 25-minute work sessions',
            effects: {
                focusBonus: 0.25, // +25% damage from focused work
                distractionResistance: 0.3, // 30% resistance to distraction debuffs
                energyEfficiency: 0.1 // 10% better energy management
            },
            requirements: {
                materials: { 'timer-component': 1, 'focus-crystal': 1 },
                coins: 50
            },
            source: 'crafting'
        });

        this.equipmentEffects.set('noise-canceling-headphones', {
            id: 'noise-canceling-headphones',
            name: 'Noise-Canceling Headphones',
            type: 'armor',
            rarity: 'uncommon',
            description: 'Blocks external distractions during work',
            effects: {
                distractionImmunity: true, // Complete immunity to distraction effects
                focusBonus: 0.15, // +15% focus damage
                concentrationBonus: 0.2 // +20% concentration during long sessions
            },
            requirements: {
                materials: { 'headphone-driver': 2, 'noise-canceling-chip': 1, 'comfort-padding': 1 },
                coins: 150
            },
            source: 'crafting'
        });

        this.equipmentEffects.set('standing-desk', {
            id: 'standing-desk',
            name: 'Adjustable Standing Desk',
            type: 'armor',
            rarity: 'rare',
            description: 'Ergonomic workspace for sustained productivity',
            effects: {
                enduranceBonus: 0.2, // +20% endurance for long sessions
                energyRegen: 0.15, // +15% energy regeneration
                postureBonus: 0.1 // +10% overall effectiveness
            },
            requirements: {
                materials: { 'desk-frame': 1, 'adjustment-mechanism': 1, 'ergonomic-mat': 1 },
                coins: 300
            },
            source: 'crafting'
        });

        // === ACCESSORIES (Digital Tools) ===
        this.equipmentEffects.set('project-management-app', {
            id: 'project-management-app',
            name: 'Project Management App',
            type: 'accessory',
            rarity: 'uncommon',
            description: 'Digital tool for organizing and tracking tasks',
            effects: {
                organizationBonus: 0.3, // +30% task organization efficiency
                deadlineAwareness: true, // Shows upcoming deadlines
                taskClarity: 0.25 // +25% clarity on task requirements
            },
            requirements: {
                materials: { 'app-license': 1, 'cloud-storage': 1 },
                coins: 100
            },
            source: 'purchase'
        });

        this.equipmentEffects.set('coffee-maker', {
            id: 'coffee-maker',
            name: 'Premium Coffee Maker',
            type: 'accessory',
            rarity: 'common',
            description: 'High-quality coffee for morning productivity boosts',
            effects: {
                morningBonus: 0.25, // +25% damage during morning hours (6-10 AM)
                energyBoost: 0.2, // +20% energy for 2 hours after use
                motivationBonus: 0.15 // +15% motivation
            },
            requirements: {
                materials: { 'coffee-machine': 1, 'premium-beans': 3 },
                coins: 80
            },
            source: 'crafting'
        });

        // === CONSUMABLES (Temporary Boosts) ===
        this.equipmentEffects.set('energy-drink', {
            id: 'energy-drink',
            name: 'Natural Energy Drink',
            type: 'consumable',
            rarity: 'common',
            description: 'Natural energy boost for immediate productivity',
            effects: {
                immediateEnergy: 50, // +50 energy points
                duration: 2, // 2 hours
                focusBonus: 0.2 // +20% focus during duration
            },
            requirements: {
                materials: { 'natural-caffeine': 1, 'vitamin-b': 1 },
                coins: 25
            },
            source: 'crafting'
        });

        this.equipmentEffects.set('motivational-quote', {
            id: 'motivational-quote',
            name: 'Inspirational Quote',
            type: 'consumable',
            rarity: 'common',
            description: 'Words of wisdom to boost motivation',
            effects: {
                motivationBoost: 0.3, // +30% motivation
                duration: 1, // 1 hour
                moraleBonus: 0.25 // +25% morale
            },
            requirements: {
                materials: { 'wisdom-scroll': 1 },
                coins: 10
            },
            source: 'quest-reward'
        });

        // === LEGENDARY EQUIPMENT ===
        this.equipmentEffects.set('productivity-suite', {
            id: 'productivity-suite',
            name: 'Complete Productivity Suite',
            type: 'weapon',
            rarity: 'legendary',
            description: 'Ultimate productivity setup combining all tools',
            effects: {
                focusBonus: 0.4, // +40% focus damage
                enduranceBonus: 0.3, // +30% endurance
                organizationBonus: 0.35, // +35% organization
                distractionImmunity: true,
                energyEfficiency: 0.25, // +25% energy efficiency
                allDayBonus: 0.15 // +15% effectiveness all day
            },
            requirements: {
                materials: {
                    'pomodoro-timer': 1,
                    'noise-canceling-headphones': 1,
                    'project-management-app': 1,
                    'standing-desk': 1,
                    'coffee-maker': 1,
                    'productivity-crystal': 1
                },
                coins: 1000
            },
            source: 'crafting'
        });
    }

    /**
     * Equip an item to a specific slot
     */
    async equipItem(itemId: string, slot: EquipmentSlot): Promise<boolean> {
        const equipment = this.equipmentEffects.get(itemId);
        if (!equipment) {
            pixelNotice(`❌ Equipment "${itemId}" not found`, 3000);
            return false;
        }

        // Check if player has the item
        const quantity = this.playerInventory.get(itemId) || 0;
        if (quantity < 1) {
            pixelNotice(`❌ You don't have "${equipment.name}" in your inventory`, 3000);
            return false;
        }

        // Unequip current item in slot
        const currentItem = this.equippedGear.get(slot);
        if (currentItem) {
            await this.unequipItem(slot);
        }

        // Equip new item
        this.equippedGear.set(slot, equipment);
        this.saveEquippedGear();

        pixelNotice(`✅ Equipped "${equipment.name}"`, 3000);
        return true;
    }

    /**
     * Unequip an item from a slot
     */
    async unequipItem(slot: EquipmentSlot): Promise<boolean> {
        const equipment = this.equippedGear.get(slot);
        if (!equipment) {
            return false;
        }

        // Return item to inventory
        const currentQuantity = this.playerInventory.get(equipment.id) || 0;
        this.playerInventory.set(equipment.id, currentQuantity + 1);

        // Remove from equipped gear
        this.equippedGear.delete(slot);
        this.saveEquippedGear();

        pixelNotice(`📦 Unequipped "${equipment.name}"`, 3000);
        return true;
    }

    /**
     * Apply equipment effects to battle calculations
     */
    applyEquipmentEffects(
        baseStats: PlayerStats,
        battleState: EnhancedBattleState,
        timeOfDay: number
    ): EquipmentBattleModifiers {
        const modifiers: EquipmentBattleModifiers = {
            statBonuses: { ...baseStats },
            specialEffects: [],
            damageMultipliers: {},
            resistanceEffects: {},
            timeBasedBonuses: {}
        };

        // Apply effects from all equipped gear
        for (const [slot, equipment] of this.equippedGear.entries()) {
            this.applyEquipmentEffect(equipment, modifiers, timeOfDay);
        }

        return modifiers;
    }

    /**
     * Apply effects from a specific equipment piece
     */
    private applyEquipmentEffect(
        equipment: ProductivityEquipment,
        modifiers: EquipmentBattleModifiers,
        timeOfDay: number
    ): void {
        const effects = equipment.effects;

        // Stat bonuses
        if (effects.focusBonus) {
            modifiers.statBonuses.focus = (modifiers.statBonuses.focus || 0) + effects.focusBonus;
        }
        if (effects.enduranceBonus) {
            modifiers.statBonuses.endurance = (modifiers.statBonuses.endurance || 0) + effects.enduranceBonus;
        }
        if (effects.energyEfficiency) {
            modifiers.statBonuses.motivation = (modifiers.statBonuses.motivation || 0) + effects.energyEfficiency;
        }

        // Special effects
        if (effects.distractionImmunity) {
            modifiers.specialEffects.push('distraction_immunity');
        }
        if (effects.deadlineAwareness) {
            modifiers.specialEffects.push('deadline_awareness');
        }

        // Time-based bonuses
        if (effects.morningBonus && timeOfDay >= 6 && timeOfDay <= 10) {
            modifiers.timeBasedBonuses.morning = effects.morningBonus;
        }

        // Damage multipliers
        if (effects.focusBonus) {
            modifiers.damageMultipliers.focus = (modifiers.damageMultipliers.focus || 1) + effects.focusBonus;
        }
        if (effects.organizationBonus) {
            modifiers.damageMultipliers.organization = (modifiers.damageMultipliers.organization || 1) + effects.organizationBonus;
        }

        // Resistance effects
        if (effects.distractionResistance) {
            modifiers.resistanceEffects.distraction = effects.distractionResistance;
        }
    }

    /**
     * Use a consumable item
     */
    async useConsumable(itemId: string): Promise<boolean> {
        const equipment = this.equipmentEffects.get(itemId);
        if (!equipment || equipment.type !== 'consumable') {
            pixelNotice(`❌ "${itemId}" is not a consumable item`, 3000);
            return false;
        }

        const quantity = this.playerInventory.get(itemId) || 0;
        if (quantity < 1) {
            pixelNotice(`❌ You don't have "${equipment.name}" in your inventory`, 3000);
            return false;
        }

        // Consume the item
        this.playerInventory.set(itemId, quantity - 1);

        // Apply temporary effects
        this.applyTemporaryEffect(equipment);

        pixelNotice(`✅ Used "${equipment.name}"`, 3000);
        return true;
    }

    /**
     * Apply temporary effects from consumables
     */
    private applyTemporaryEffect(equipment: ProductivityEquipment): void {
        const effects = equipment.effects;

        // Store temporary effect with duration
        const tempEffect = {
            equipmentId: equipment.id,
            effects: effects,
            duration: effects.duration || 1, // hours
            appliedAt: new Date()
        };

        // This would integrate with a temporary effects system
        console.log('Applied temporary effect:', tempEffect);
    }

    /**
     * Get all available equipment
     */
    getAllEquipment(): ProductivityEquipment[] {
        return Array.from(this.equipmentEffects.values());
    }

    /**
     * Get equipment by type
     */
    getEquipmentByType(type: EquipmentType): ProductivityEquipment[] {
        return this.getAllEquipment().filter(eq => eq.type === type);
    }

    /**
     * Get equipped gear
     */
    getEquippedGear(): Map<EquipmentSlot, ProductivityEquipment> {
        return new Map(this.equippedGear);
    }

    /**
     * Get equipment in a specific slot
     */
    getEquippedItem(slot: EquipmentSlot): ProductivityEquipment | null {
        return this.equippedGear.get(slot) || null;
    }

    /**
     * Check if player can craft an item
     */
    canCraft(itemId: string): { canCraft: boolean; missingMaterials: string[] } {
        const equipment = this.equipmentEffects.get(itemId);
        if (!equipment) {
            return { canCraft: false, missingMaterials: [] };
        }

        const missingMaterials: string[] = [];
        const requirements = equipment.requirements;

        // Check materials
        for (const [material, required] of Object.entries(requirements.materials)) {
            const available = this.playerInventory.get(material) || 0;
            const requiredNum = required as number;
            if (available < requiredNum) {
                missingMaterials.push(`${material} (need ${requiredNum}, have ${available})`);
            }
        }

        return {
            canCraft: missingMaterials.length === 0,
            missingMaterials
        };
    }

    /**
     * Craft an equipment item
     */
    async craftItem(itemId: string): Promise<boolean> {
        const equipment = this.equipmentEffects.get(itemId);
        if (!equipment) {
            pixelNotice(`❌ Equipment "${itemId}" not found`, 3000);
            return false;
        }

        const canCraft = this.canCraft(itemId);
        if (!canCraft.canCraft) {
            pixelNotice(`❌ Missing materials: ${canCraft.missingMaterials.join(', ')}`, 5000);
            return false;
        }

        // Consume materials
        const requirements = equipment.requirements;
        for (const [material, required] of Object.entries(requirements.materials)) {
            const current = this.playerInventory.get(material) || 0;
            const requiredNum = required as number;
            this.playerInventory.set(material, current - requiredNum);
        }

        // Add crafted item to inventory
        const currentQuantity = this.playerInventory.get(itemId) || 0;
        this.playerInventory.set(itemId, currentQuantity + 1);

        pixelNotice(`✅ Crafted "${equipment.name}"`, 3000);
        return true;
    }

    /**
     * Add item to inventory (from quests, purchases, etc.)
     */
    addToInventory(itemId: string, quantity: number = 1): void {
        const current = this.playerInventory.get(itemId) || 0;
        this.playerInventory.set(itemId, current + quantity);
    }

    /**
     * Get inventory contents
     */
    getInventory(): Map<string, number> {
        return new Map(this.playerInventory);
    }

    /**
     * Save equipped gear to localStorage
     */
    private saveEquippedGear(): void {
        try {
            const gearData = Array.from(this.equippedGear.entries()).map(([slot, equipment]) => ({
                slot,
                equipmentId: equipment.id
            }));
            localStorage.setItem('productivity-equipped-gear', JSON.stringify(gearData));
        } catch (error) {
            console.error('Failed to save equipped gear:', error);
        }
    }

    /**
     * Load equipped gear from localStorage
     */
    private loadEquippedGear(): void {
        try {
            const saved = localStorage.getItem('productivity-equipped-gear');
            if (saved) {
                const gearData = JSON.parse(saved);
                for (const { slot, equipmentId } of gearData) {
                    const equipment = this.equipmentEffects.get(equipmentId);
                    if (equipment) {
                        this.equippedGear.set(slot, equipment);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load equipped gear:', error);
        }
    }
}

// Type definitions
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory1' | 'accessory2';
export type EquipmentType = 'weapon' | 'armor' | 'accessory' | 'consumable';
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ProductivityEquipment {
    id: string;
    name: string;
    type: EquipmentType;
    rarity: EquipmentRarity;
    description: string;
    effects: EquipmentEffects;
    requirements: EquipmentRequirements;
    source: 'crafting' | 'purchase' | 'quest-reward' | 'achievement';
}

export interface EquipmentEffects {
    // Stat bonuses
    focusBonus?: number;
    enduranceBonus?: number;
    energyEfficiency?: number;
    organizationBonus?: number;
    concentrationBonus?: number;
    motivationBonus?: number;
    postureBonus?: number;

    // Special effects
    distractionImmunity?: boolean;
    deadlineAwareness?: boolean;
    distractionResistance?: number;

    // Time-based effects
    morningBonus?: number;
    allDayBonus?: number;

    // Consumable effects
    immediateEnergy?: number;
    duration?: number; // hours
    motivationBoost?: number;
    moraleBonus?: number;

    // Additional effects
    energyRegen?: number;
    taskClarity?: number;
    energyBoost?: number;
}

export interface EquipmentRequirements {
    materials: Record<string, number>;
    coins: number;
}

export interface EquipmentBattleModifiers {
    statBonuses: Partial<PlayerStats>;
    specialEffects: string[];
    damageMultipliers: Record<string, number>;
    resistanceEffects: Record<string, number>;
    timeBasedBonuses: Record<string, number>;
}

// Export singleton instance
export const productivityEquipmentSystem = ProductivityEquipmentSystem.getInstance();
