// Integration file to add seasonal functionality to existing shop
import type GamifiedObsidianPlugin from "../../../core/main";
import { SeasonalInventoryManager } from "./seasonalInventoryManager";
import { EnhancedShopSystem } from "./enhancedShopSystem";
;
import { pixelNotice } from '../../../shared/utils/noticeUtils';

export class ShopIntegration {
    private plugin: GamifiedObsidianPlugin;
    private seasonalManager: SeasonalInventoryManager | null = null;
    private enhancedShop: EnhancedShopSystem | null = null;
    private rotationCheckInterval: NodeJS.Timeout | null = null;

    constructor(plugin: GamifiedObsidianPlugin) {
        this.plugin = plugin;
    }

    /**
     * Whether seasonal + enhanced shop subsystems are ready
     */
    isInitialized(): boolean {
        return this.seasonalManager !== null && this.enhancedShop !== null;
    }

    /**
     * Initialize the enhanced shop system
     */
    async initialize(): Promise<void> {
        try {
            // Initialize seasonal manager
            this.seasonalManager = new SeasonalInventoryManager(this.plugin);
            await this.seasonalManager.initialize();

            // Initialize enhanced shop system
            this.enhancedShop = new EnhancedShopSystem(this.plugin);
            await this.enhancedShop.initialize(this.seasonalManager);

            // Set up automatic rotation checking
            this.setupRotationTimer();

            console.log('Shop integration initialized with enhanced shop system');

            // Add commands for manual control
            this.addShopCommands();

        } catch (error) {
            console.error('Failed to initialize shop integration:', error);
            throw error;
        }
    }

    /**
     * Add shop management commands
     */
    private addShopCommands(): void {
        // Manual refresh command
        this.plugin.addCommand({
            id: 'refresh-shop-inventory',
            name: 'Refresh Shop Inventory',
            callback: async () => {
                if (this.seasonalManager && this.enhancedShop) {
                    await this.seasonalManager.refreshInventory();
                    await this.enhancedShop.updatePrices();
                    pixelNotice('🛒 Shop inventory and prices refreshed!');
                } else {
                    pixelNotice('❌ Shop system not initialized');
                }
            }
        });

        // Check shop status
        this.plugin.addCommand({
            id: 'check-shop-status',
            name: 'Check Shop Status',
            callback: () => {
                if (this.enhancedShop) {
                    const status = this.enhancedShop.getShopStatus();
                    const shopkeeper = status.currentShopkeeper;
                    const market = status.marketConditions;
                    pixelNotice(`🏪 ${shopkeeper.avatar} ${shopkeeper.name}\n💭 Mood: ${Math.round(shopkeeper.mood)}% | Rep: ${Math.round(shopkeeper.reputation)}%\n📈 Market: ${market.overall} (${market.volatility}% volatility)\n💰 Special Offers: ${status.specialOffers.length}`, 6000);
                } else {
                    pixelNotice('❌ Shop system not initialized');
                }
            }
        });

        // Trigger special events (only if enabled in settings)
        if (this.plugin.settings.enableSpecialEvents) {
            if (this.plugin.settings.dragonFestivalEnabled) {
                this.plugin.addCommand({
                    id: 'trigger-dragon-festival',
                    name: 'Trigger Dragon Festival Event',
                    callback: async () => {
                        if (this.seasonalManager) {
                            await this.seasonalManager.triggerSpecialEvent('Dragon Festival', 7);
                        } else {
                            pixelNotice('❌ Shop system not initialized');
                        }
                    }
                });
            }

            if (this.plugin.settings.mysticalMarketEnabled) {
                this.plugin.addCommand({
                    id: 'trigger-mystical-market',
                    name: 'Trigger Mystical Market Event',
                    callback: async () => {
                        if (this.seasonalManager) {
                            await this.seasonalManager.triggerSpecialEvent('Mystical Market', 3);
                        } else {
                            pixelNotice('❌ Shop system not initialized');
                        }
                    }
                });
            }
        }

        // Market event commands (enhanced shop)
        this.plugin.addCommand({
            id: 'trigger-market-event',
            name: 'Trigger Random Market Event',
            callback: () => {
                if (this.enhancedShop) {
                    const events = ['dragon_sighting', 'plague_outbreak', 'merchant_festival'];
                    const randomEvent = events[Math.floor(Math.random() * events.length)];
                    this.enhancedShop.triggerMarketEvent(randomEvent);
                } else {
                    pixelNotice('❌ Enhanced shop system not initialized');
                }
            }
        });

        // Rotate shopkeeper command
        this.plugin.addCommand({
            id: 'rotate-shopkeeper',
            name: 'Rotate Shopkeeper',
            callback: () => {
                if (this.enhancedShop) {
                    this.enhancedShop.rotateShopkeeper();
                } else {
                    pixelNotice('❌ Enhanced shop system not initialized');
                }
            }
        });
    }

    /**
     * Set up automatic rotation checking
     */
    private setupRotationTimer(): void {
        // Check every hour for rotation needs
        this.rotationCheckInterval = setInterval(async () => {
            if (this.seasonalManager && this.seasonalManager.shouldRotateInventory()) {
                console.log('Auto-rotating shop inventory...');
                await this.seasonalManager.refreshInventory();
            }
        }, 60 * 60 * 1000); // 1 hour
    }

    /**
     * Get current shop inventory
     */
    getCurrentInventory() {
        return this.seasonalManager?.getCurrentShopInventory() || [];
    }

    /**
     * Get seasonal information for UI
     */
    getSeasonalInfo() {
        return this.seasonalManager?.getSeasonInfo() || null;
    }

    /**
     * Check if inventory needs rotation
     */
    needsRotation(): boolean {
        return this.seasonalManager?.shouldRotateInventory() || false;
    }

    /**
     * Force refresh inventory
     */
    async refreshInventory(): Promise<void> {
        if (this.seasonalManager) {
            await this.seasonalManager.refreshInventory();
        }
    }

    /**
     * Get enhanced shop inventory
     */
    async getEnhancedInventory() {
        return this.enhancedShop?.getEnhancedInventory() || [];
    }

    /**
     * Get shop status
     */
    getShopStatus() {
        return this.enhancedShop?.getShopStatus() || null;
    }

    /**
     * Process enhanced purchase
     */
    async processPurchase(itemName: string, quantity: number) {
        return this.enhancedShop?.processPurchase(itemName, quantity) || { success: false, message: 'Shop not available', finalPrice: 0 };
    }

    /**
     * Cleanup when plugin unloads
     */
    cleanup(): void {
        if (this.rotationCheckInterval) {
            clearInterval(this.rotationCheckInterval);
            this.rotationCheckInterval = null;
        }

        // Cleanup enhanced shop system
        if (this.enhancedShop) {
            this.enhancedShop.cleanup();
        }
    }
}

// Export singleton instance for use in other components
let shopIntegrationInstance: ShopIntegration | null = null;

export function getShopIntegration(): ShopIntegration | null {
    return shopIntegrationInstance;
}

export function setShopIntegration(integration: ShopIntegration): void {
    shopIntegrationInstance = integration;
}