import { Vault, TFile } from 'obsidian';
import { PlayerData } from '../../data/models/PlayerData';

/**
 * Mobile-optimized PlayerData loader with enhanced error handling and retry logic
 */
export class MobilePlayerDataLoader {
    private static instance: MobilePlayerDataLoader;
    private retryCount = 0;
    private maxRetries = 3;
    private retryDelay = 1000;

    static getInstance(): MobilePlayerDataLoader {
        if (!MobilePlayerDataLoader.instance) {
            MobilePlayerDataLoader.instance = new MobilePlayerDataLoader();
        }
        return MobilePlayerDataLoader.instance;
    }

    /**
     * Load PlayerData with mobile-specific optimizations
     */
    async loadPlayerData(vault: Vault): Promise<PlayerData | null> {
        const isMobile = this.isMobileDevice();

        if (isMobile) {
            console.log('📱 [MobilePlayerDataLoader] Starting mobile-optimized PlayerData load...');
        }

        try {
            // Wait for vault to be ready on mobile
            if (isMobile) {
                await this.waitForVaultReady(vault);
            }

            const playerData = await this.attemptLoad(vault);

            if (playerData) {
                console.log('📱 [MobilePlayerDataLoader] PlayerData loaded successfully');
                this.retryCount = 0; // Reset retry count on success
                return playerData;
            }

            // If no data found and we haven't exceeded retries, try again
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`📱 [MobilePlayerDataLoader] Retry ${this.retryCount}/${this.maxRetries} in ${this.retryDelay}ms...`);

                await this.delay(this.retryDelay);
                return this.loadPlayerData(vault);
            }

            console.warn('📱 [MobilePlayerDataLoader] Max retries exceeded, returning null');
            return null;

        } catch (error) {
            console.error('📱 [MobilePlayerDataLoader] Error loading PlayerData:', error);

            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`📱 [MobilePlayerDataLoader] Error retry ${this.retryCount}/${this.maxRetries} in ${this.retryDelay}ms...`);

                await this.delay(this.retryDelay);
                return this.loadPlayerData(vault);
            }

            return null;
        }
    }

    /**
     * Wait for vault to be ready on mobile devices
     */
    private async waitForVaultReady(vault: Vault): Promise<void> {
        const maxWaitTime = 10000; // 10 seconds
        const checkInterval = 500; // 500ms
        let waited = 0;

        while (waited < maxWaitTime) {
            const files = vault.getAllLoadedFiles();

            if (files.length > 0) {
                console.log(`📱 [MobilePlayerDataLoader] Vault ready with ${files.length} files after ${waited}ms`);
                return;
            }

            console.log(`📱 [MobilePlayerDataLoader] Waiting for vault... (${waited}ms)`);
            await this.delay(checkInterval);
            waited += checkInterval;
        }

        console.warn('📱 [MobilePlayerDataLoader] Vault not ready after maximum wait time');
    }

    /**
     * Attempt to load PlayerData with multiple fallback strategies
     */
    private async attemptLoad(vault: Vault): Promise<PlayerData | null> {
        const isMobile = this.isMobileDevice();

        // Try multiple file paths for mobile compatibility
        const possiblePaths = [
            'SkillTree/PlayerData.md',
            'skilltree/PlayerData.md',
            'SKILLTREE/PlayerData.md',
            'SkillTree/playerdata.md',
            'SkillTree/PLAYERDATA.md',
            'PlayerData.md', // Fallback to root
            'playerdata.md'
        ];

        for (const path of possiblePaths) {
            try {
                const file = vault.getAbstractFileByPath(path) as TFile;

                if (file && file instanceof TFile) {
                    console.log(`📱 [MobilePlayerDataLoader] Found file at: ${path}`);

                    const content = await vault.read(file);
                    if (content) {
                        const playerData = this.parsePlayerData(content, path);
                        if (playerData) {
                            return playerData;
                        }
                    }
                }
            } catch (error) {
                if (isMobile) {
                    console.log(`📱 [MobilePlayerDataLoader] Failed to load from ${path}:`, error);
                }
                continue;
            }
        }

        // If no file found, try to create a default one
        if (isMobile) {
            console.log('📱 [MobilePlayerDataLoader] No PlayerData file found, attempting to create default...');
            return this.createDefaultPlayerData(vault);
        }

        return null;
    }

    /**
     * Parse PlayerData from file content
     */
    private parsePlayerData(content: string, filePath: string): PlayerData | null {
        try {
            // Extract YAML frontmatter
            const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (!yamlMatch) {
                console.warn(`📱 [MobilePlayerDataLoader] No YAML frontmatter found in ${filePath}`);
                return null;
            }

            const yamlContent = yamlMatch[1];

            // Simple YAML parsing for mobile (avoiding heavy libraries)
            const data: any = {};
            const lines = yamlContent.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const colonIndex = trimmed.indexOf(':');
                    if (colonIndex > 0) {
                        const key = trimmed.substring(0, colonIndex).trim();
                        let value = trimmed.substring(colonIndex + 1).trim();

                        // Remove quotes if present
                        if ((value.startsWith('"') && value.endsWith('"')) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }

                        // Parse numbers
                        if (!isNaN(Number(value))) {
                            data[key] = Number(value);
                        } else if (value === 'true' || value === 'false') {
                            data[key] = value === 'true';
                        } else if (value.startsWith('[') && value.endsWith(']')) {
                            // Simple array parsing
                            try {
                                data[key] = JSON.parse(value);
                            } catch {
                                data[key] = [];
                            }
                        } else {
                            data[key] = value;
                        }
                    }
                }
            }

            // Validate required fields
            if (!data.name || typeof data.level !== 'number') {
                console.warn(`📱 [MobilePlayerDataLoader] Invalid PlayerData structure in ${filePath}`);
                return null;
            }

            // Create PlayerData object with defaults
            const playerData: PlayerData = {
                name: data.name || 'Player',
                avatar: data.avatar || 'assets/sonic.png',
                rank: data.rank || 'E',
                masterClass: data.masterClass || 'Jester',
                description: data.description || 'A mobile player',
                level: data.level || 1,
                xp: data.xp || 0,
                xpRequired: data.xpRequired || 100,
                coins: data.coins || 0,
                inventory: data.inventory || [],
                stats: data.stats || {
                    energy: 80,
                    focus: 75,
                    motivation: 85,
                    calm: 70,
                    stress: 20
                },
                ...data // Include any additional fields
            };

            console.log(`📱 [MobilePlayerDataLoader] Successfully parsed PlayerData from ${filePath}`);
            return playerData;

        } catch (error) {
            console.error(`📱 [MobilePlayerDataLoader] Error parsing PlayerData from ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Create default PlayerData file
     */
    private async createDefaultPlayerData(vault: Vault): Promise<PlayerData | null> {
        try {
            const defaultData: PlayerData = {
                name: 'Mobile Player',
                avatar: 'assets/sonic.png',
                rank: 'E',
                masterClass: 'Jester',
                description: 'A mobile player',
                level: 1,
                xp: 0,
                xpRequired: 100,
                total_exp: 0,
                coins: 0,
                inventory: [],
                stats: {
                    energy: 80,
                    focus: 75,
                    motivation: 85,
                    calm: 70,
                    stress: 20
                }
            };

            const content = `---
name: ${defaultData.name}
avatar: ${defaultData.avatar}
rank: ${defaultData.rank}
masterClass: ${defaultData.masterClass}
description: ${defaultData.description}
level: ${defaultData.level}
xp: ${defaultData.xp}
xpRequired: ${defaultData.xpRequired}
coins: ${defaultData.coins}
inventory: []
stats:
  energy: 80
  focus: 75
  motivation: 85
  calm: 70
  stress: 20
---

# Player Data

Welcome to the gamified Obsidian plugin! This file contains your player data.
`;

            // Try to create the SkillTree folder first
            try {
                await vault.createFolder('SkillTree');
            } catch (folderError) {
                // Folder might already exist, that's okay
                console.log('📱 [MobilePlayerDataLoader] SkillTree folder already exists or creation failed');
            }

            // Create the PlayerData file
            await vault.create('SkillTree/PlayerData.md', content);
            console.log('📱 [MobilePlayerDataLoader] Default PlayerData.md created successfully');

            return defaultData;

        } catch (error) {
            console.error('📱 [MobilePlayerDataLoader] Failed to create default PlayerData:', error);
            return null;
        }
    }

    /**
     * Check if running on mobile device
     */
    private isMobileDevice(): boolean {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isSmallScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        return isMobileUA || (isSmallScreen && isTouchDevice);
    }

    /**
     * Delay utility
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Reset retry count (useful for manual retries)
     */
    resetRetryCount(): void {
        this.retryCount = 0;
    }
}