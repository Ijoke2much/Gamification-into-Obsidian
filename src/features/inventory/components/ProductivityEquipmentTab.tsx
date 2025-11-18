import React, { useState, useEffect } from 'react';
import { productivityEquipmentSystem, ProductivityEquipment, EquipmentSlot } from '../../quests/systems/productivityEquipmentSystem';
import styles from './ProductivityEquipmentTab.module.css';

interface ProductivityEquipmentTabProps {
    onEquipmentChange?: () => void;
}

export const ProductivityEquipmentTab: React.FC<ProductivityEquipmentTabProps> = ({
    onEquipmentChange
}) => {
    const [equippedGear, setEquippedGear] = useState<Map<EquipmentSlot, ProductivityEquipment>>(new Map());
    const [availableEquipment, setAvailableEquipment] = useState<ProductivityEquipment[]>([]);
    const [inventory, setInventory] = useState<Map<string, number>>(new Map());
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'weapon' | 'armor' | 'accessory' | 'consumable'>('all');
    const [showCrafting, setShowCrafting] = useState(false);

    useEffect(() => {
        loadEquipmentData();
    }, []);

    const loadEquipmentData = () => {
        const gear = productivityEquipmentSystem.getEquippedGear();
        const equipment = productivityEquipmentSystem.getAllEquipment();
        const inv = productivityEquipmentSystem.getInventory();

        setEquippedGear(gear);
        setAvailableEquipment(equipment);
        setInventory(inv);
    };

    const getFilteredEquipment = () => {
        if (selectedCategory === 'all') {
            return availableEquipment;
        }
        return availableEquipment.filter(eq => eq.type === selectedCategory);
    };

    const getRarityColor = (rarity: string): string => {
        switch (rarity) {
            case 'common': return '#64748b';
            case 'uncommon': return '#10b981';
            case 'rare': return '#3b82f6';
            case 'epic': return '#8b5cf6';
            case 'legendary': return '#ffd700';
            default: return '#64748b';
        }
    };

    const getCategoryIcon = (type: string): string => {
        switch (type) {
            case 'weapon': return '⚔️';
            case 'armor': return '🛡️';
            case 'accessory': return '💍';
            case 'consumable': return '🧪';
            default: return '📦';
        }
    };

    const handleEquip = async (equipment: ProductivityEquipment) => {
        const slot = getDefaultSlot(equipment.type);
        const success = await productivityEquipmentSystem.equipItem(equipment.id, slot);
        if (success) {
            loadEquipmentData();
            onEquipmentChange?.();
        }
    };

    const handleUnequip = async (slot: EquipmentSlot) => {
        const success = await productivityEquipmentSystem.unequipItem(slot);
        if (success) {
            loadEquipmentData();
            onEquipmentChange?.();
        }
    };

    const handleUseConsumable = async (equipment: ProductivityEquipment) => {
        const success = await productivityEquipmentSystem.useConsumable(equipment.id);
        if (success) {
            loadEquipmentData();
            onEquipmentChange?.();
        }
    };

    const handleCraft = async (equipment: ProductivityEquipment) => {
        const success = await productivityEquipmentSystem.craftItem(equipment.id);
        if (success) {
            loadEquipmentData();
            onEquipmentChange?.();
        }
    };

    const getDefaultSlot = (type: string): EquipmentSlot => {
        switch (type) {
            case 'weapon': return 'weapon';
            case 'armor': return 'armor';
            case 'accessory': return 'accessory1';
            default: return 'weapon';
        }
    };

    const getSlotName = (slot: EquipmentSlot): string => {
        switch (slot) {
            case 'weapon': return 'Weapon';
            case 'armor': return 'Armor';
            case 'accessory1': return 'Accessory 1';
            case 'accessory2': return 'Accessory 2';
            default: return 'Unknown';
        }
    };

    const canCraft = (equipment: ProductivityEquipment) => {
        const result = productivityEquipmentSystem.canCraft(equipment.id);
        return result.canCraft;
    };

    const getInventoryQuantity = (equipmentId: string): number => {
        return inventory.get(equipmentId) || 0;
    };

    const renderEquippedGear = () => {
        const slots: EquipmentSlot[] = ['weapon', 'armor', 'accessory1', 'accessory2'];

        return (
            <div className={styles.equippedGearSection}>
                <h3 className={styles.sectionTitle}>🛡️ Equipped Gear</h3>
                <div className={styles.equipmentSlots}>
                    {slots.map(slot => {
                        const equipment = equippedGear.get(slot);
                        return (
                            <div key={slot} className={styles.equipmentSlot}>
                                <div className={styles.slotHeader}>
                                    <span className={styles.slotName}>{getSlotName(slot)}</span>
                                    {equipment && (
                                        <button
                                            className={styles.unequipButton}
                                            onClick={() => handleUnequip(slot)}
                                            title="Unequip"
                                        >
                                            ❌
                                        </button>
                                    )}
                                </div>
                                
                                {equipment ? (
                                    <div 
                                        className={styles.equippedItem}
                                        style={{ borderColor: getRarityColor(equipment.rarity) }}
                                    >
                                        <div className={styles.itemIcon}>
                                            {getCategoryIcon(equipment.type)}
                                        </div>
                                        <div className={styles.itemInfo}>
                                            <div className={styles.itemName}>{equipment.name}</div>
                                            <div 
                                                className={styles.itemRarity}
                                                style={{ color: getRarityColor(equipment.rarity) }}
                                            >
                                                {equipment.rarity.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.emptySlot}>
                                        <div className={styles.emptySlotIcon}>📦</div>
                                        <div className={styles.emptySlotText}>Empty</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderEquipmentList = () => {
        const filteredEquipment = getFilteredEquipment();

        return (
            <div className={styles.equipmentListSection}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>🎒 Available Equipment</h3>
                    <div className={styles.categoryFilters}>
                        {(['all', 'weapon', 'armor', 'accessory', 'consumable'] as const).map(category => (
                            <button
                                key={category}
                                className={`${styles.categoryButton} ${selectedCategory === category ? styles.active : ''}`}
                                onClick={() => setSelectedCategory(category)}
                            >
                                {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.equipmentGrid}>
                    {filteredEquipment.map(equipment => {
                        const quantity = getInventoryQuantity(equipment.id);
                        const canCraftItem = canCraft(equipment);
                        const isEquipped = Array.from(equippedGear.values()).some(eq => eq.id === equipment.id);

                        return (
                            <div
                                key={equipment.id}
                                className={`${styles.equipmentCard} ${isEquipped ? styles.equipped : ''}`}
                                style={{ borderColor: getRarityColor(equipment.rarity) }}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.itemIcon}>
                                        {getCategoryIcon(equipment.type)}
                                    </div>
                                    <div 
                                        className={styles.itemRarity}
                                        style={{ color: getRarityColor(equipment.rarity) }}
                                    >
                                        {equipment.rarity.toUpperCase()}
                                    </div>
                                </div>

                                <div className={styles.cardContent}>
                                    <h4 className={styles.itemName}>{equipment.name}</h4>
                                    <p className={styles.itemDescription}>{equipment.description}</p>
                                    
                                    {equipment.effects && (
                                        <div className={styles.itemEffects}>
                                            <div className={styles.effectsTitle}>Effects:</div>
                                            {Object.entries(equipment.effects).map(([key, value]) => {
                                                if (typeof value === 'boolean' && value) {
                                                    return (
                                                        <div key={key} className={styles.effectItem}>
                                                            ✅ {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                                        </div>
                                                    );
                                                } else if (typeof value === 'number' && value > 0) {
                                                    return (
                                                        <div key={key} className={styles.effectItem}>
                                                            +{Math.round(value * 100)}% {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.cardFooter}>
                                    <div className={styles.itemQuantity}>
                                        Owned: {quantity}
                                    </div>
                                    
                                    <div className={styles.itemActions}>
                                        {equipment.type === 'consumable' ? (
                                            <button
                                                className={styles.useButton}
                                                onClick={() => handleUseConsumable(equipment)}
                                                disabled={quantity === 0}
                                            >
                                                Use
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.equipButton}
                                                onClick={() => handleEquip(equipment)}
                                                disabled={quantity === 0 || isEquipped}
                                            >
                                                {isEquipped ? 'Equipped' : 'Equip'}
                                            </button>
                                        )}
                                        
                                        {equipment.source === 'crafting' && (
                                            <button
                                                className={styles.craftButton}
                                                onClick={() => handleCraft(equipment)}
                                                disabled={!canCraftItem}
                                                title={canCraftItem ? 'Craft' : 'Missing materials'}
                                            >
                                                Craft
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderCraftingSection = () => {
        if (!showCrafting) return null;

        return (
            <div className={styles.craftingSection}>
                <h3 className={styles.sectionTitle}>🔨 Crafting</h3>
                <div className={styles.craftingInfo}>
                    <p>Use materials from your inventory to craft productivity equipment.</p>
                    <p>Materials can be obtained by completing quests, defeating bosses, or purchasing from the shop.</p>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.productivityEquipmentTab}>
            {renderEquippedGear()}
            {renderEquipmentList()}
            {renderCraftingSection()}
        </div>
    );
};
