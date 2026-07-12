// Enhanced Inventory System Export Module

export { InventoryOperations } from './utils/inventoryOperations';
export { EnhancedInventoryParser } from './utils/enhancedInventoryParser';
export { IconPicker } from './utils/iconPicker';
export { MaterialUtils } from '../../shared/utils/materialUtils';
export {
    GEAR_FILE_PATH,
    GEAR_SLOTS,
    GEAR_SLOT_LABELS,
    createEmptyGearLoadout,
    parseGearFile,
    generateGearFileContent,
    readGearLoadout,
    writeGearLoadout,
    equipInventoryItemToGearSlot,
    unequipGearSlot,
    getEquippedGearItems,
    calculateGearBonuses,
    parseGearEffect
} from './utils/gearFile';

// Enhanced Types
export type {
    EnhancedInventoryItem,
    InventoryFilter,
    InventorySortOptions,
    BulkOperation,
    IconPickerCategory,
    InventoryState,
    ItemStatistics,
    ItemAction
} from './types/EnhancedInventoryTypes';

export type {
    GearSlot,
    GearEffectKey,
    GearSlotState,
    EquippedGearItem,
    GearLoadout,
    GearBonuses
} from './utils/gearFile';

// Existing exports for compatibility
export type { InventoryItem } from './utils/updateInventoryFile';
export {
    readInventory,
    writeInventory,
    addOrIncrementInventoryItem,
    addItemToInventory,
    removeItemFromInventory,
    dropItem,
    useItem,
    equipItem,
    sellItem,
    computeSellValue,
    BUFF_PRESETS,
    giveBuffPreset,
    INVENTORY_FILE_PATH
} from './utils/updateInventoryFile';

// Export existing components for compatibility
export { default as InventoryModalContent } from './modals/InventoryModalContent';
export { default as InventoryModal } from './modals/InventoryModal';
export { InventoryModalClass } from './modals/InventoryModalClass';
export { useInventoryModalContext } from './modals/InventoryModalContext';