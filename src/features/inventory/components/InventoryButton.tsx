import React, { useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { InventoryModalClass } from '../modals/InventoryModalClass';
import styles from './InventoryButton.module.css';

interface InventoryButtonProps {
    plugin: GamifiedObsidianPlugin;
    variant?: 'primary' | 'secondary' | 'icon';
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

export const InventoryButton: React.FC<InventoryButtonProps> = ({
    plugin,
    variant = 'primary',
    size = 'medium',
    className = ''
}) => {
    const handleOpenInventory = () => {
        // Use the existing InventoryModalClass to open the inventory
        new InventoryModalClass(plugin.app).open();
    };

    const getButtonClass = () => {
        const baseClass = styles.inventoryButton;
        const variantClass = styles[variant];
        const sizeClass = styles[size];
        return `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();
    };

    const getButtonContent = () => {
        switch (variant) {
            case 'icon':
                return '🎒';
            case 'secondary':
                return '🎒 Items';
            default:
                return '🎒 View Inventory';
        }
    };

    return (
        <button
            className={getButtonClass()}
            onClick={handleOpenInventory}
            title="Open Inventory"
        >
            {getButtonContent()}
        </button>
    );
};

export default InventoryButton;
