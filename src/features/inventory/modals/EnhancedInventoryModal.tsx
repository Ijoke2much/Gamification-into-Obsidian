import React, { useState, useEffect } from 'react';
import { useInventoryModalContext } from './InventoryModalContext';
import { ProductivityEquipmentTab } from '../components/ProductivityEquipmentTab';
import { CraftingTab } from '../components/CraftingTab';
import { productivityEquipmentSystem } from '../../quests/systems/productivityEquipmentSystem';
import { equipmentCraftingSystem } from '../../quests/systems/equipmentCraftingSystem';
import styles from './EnhancedInventoryModal.module.css';

interface EnhancedInventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const EnhancedInventoryModal: React.FC<EnhancedInventoryModalProps> = ({
    isOpen,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'equipment' | 'crafting'>('inventory');
    const { inventory, reloadInventory } = useInventoryModalContext();

    useEffect(() => {
        if (isOpen) {
            reloadInventory();
        }
    }, [isOpen, reloadInventory]);

    if (!isOpen) return null;

    const handleEquipmentChange = () => {
        // Refresh any equipment-dependent data
        console.log('Equipment changed, refreshing data...');
    };

    const renderTabNavigation = () => {
        return (
            <div className={styles.tabNavigation}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'inventory' ? styles.active : ''}`}
                    onClick={() => setActiveTab('inventory')}
                >
                    📦 Inventory
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'equipment' ? styles.active : ''}`}
                    onClick={() => setActiveTab('equipment')}
                >
                    ⚔️ Equipment
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'crafting' ? styles.active : ''}`}
                    onClick={() => setActiveTab('crafting')}
                >
                    🔨 Crafting
                </button>
            </div>
        );
    };

    const renderInventoryTab = () => {
        return (
            <div className={styles.inventoryTab}>
                <div className={styles.inventoryHeader}>
                    <h2 className={styles.inventoryTitle}>📦 Inventory</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        ❌
                    </button>
                </div>
                
                <div className={styles.inventoryContent}>
                    {inventory.length === 0 ? (
                        <div className={styles.emptyInventory}>
                            <div className={styles.emptyIcon}>📦</div>
                            <div className={styles.emptyTitle}>Inventory Empty</div>
                            <div className={styles.emptyDescription}>
                                Complete quests and defeat bosses to collect items!
                            </div>
                        </div>
                    ) : (
                        <div className={styles.inventoryGrid}>
                            {inventory.map((item, index) => (
                                <div key={index} className={styles.inventoryItem}>
                                    <div className={styles.itemIcon}>
                                        {getItemIcon(item.name)}
                                    </div>
                                    <div className={styles.itemInfo}>
                                        <div className={styles.itemName}>{item.name}</div>
                                        <div className={styles.itemQuantity}>x{item.quantity}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderEquipmentTab = () => {
        return (
            <div className={styles.equipmentTab}>
                <div className={styles.equipmentHeader}>
                    <h2 className={styles.equipmentTitle}>⚔️ Productivity Equipment</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        ❌
                    </button>
                </div>
                
                <div className={styles.equipmentContent}>
                    <ProductivityEquipmentTab onEquipmentChange={handleEquipmentChange} />
                </div>
            </div>
        );
    };

    const renderCraftingTab = () => {
        return (
            <div className={styles.craftingTab}>
                <div className={styles.craftingHeader}>
                    <h2 className={styles.craftingTitle}>🔨 Equipment Crafting</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        ❌
                    </button>
                </div>
                
                <div className={styles.craftingContent}>
                    <CraftingTab 
                        onCraftingComplete={(result) => {
                            console.log('Crafting completed:', result);
                            // Refresh equipment data
                            handleEquipmentChange();
                        }} 
                    />
                </div>
            </div>
        );
    };

    const getItemIcon = (itemName: string): string => {
        const name = itemName.toLowerCase();
        
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
        if (name.includes("energy")) return "⚡";
        if (name.includes("tool")) return "🔧";
        if (name.includes("material")) return "🧱";
        if (name.includes("treasure")) return "💰";
        
        return "📦";
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                {renderTabNavigation()}
                
                <div className={styles.tabContent}>
                    {activeTab === 'inventory' && renderInventoryTab()}
                    {activeTab === 'equipment' && renderEquipmentTab()}
                    {activeTab === 'crafting' && renderCraftingTab()}
                </div>
            </div>
        </div>
    );
};
