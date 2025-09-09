// Enhanced Quest Sharing Between Vaults
// Cross-vault quest synchronization and collaboration

import { Vault, TFile, App } from 'obsidian';
import { Quest } from '../utils/taskParser';

// Define QuestDifficulty type if not imported
type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'epic';

// Define SyncEvent interface
interface SyncEvent {
    timestamp: Date;
    type: 'import' | 'export' | 'conflict' | 'resolve';
    vaultId: string;
    questId: string;
    details: string;
}

export interface SharedQuest {
    id: string;
    quest: Quest;
    vaultId: string;
    sharedBy: string;
    sharedAt: Date;
    lastModified: Date;
    permissions: QuestPermissions;
    metadata: SharedQuestMetadata;
    syncStatus: SyncStatus;
}

export interface QuestPermissions {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canComplete: boolean;
    allowedVaults: string[];
}

export interface SharedQuestMetadata {
    originalVault: string;
    originalQuestId: string;
    sharedQuests: string[]; // IDs of quests created from this shared quest
    allowedVaults: string[]; // Vaults that are allowed to access this quest
    version: number;
    lastSync: Date;
    conflictResolution: 'manual' | 'auto' | 'latest-wins';
    syncHistory: SyncEvent[];
}

export interface SyncStatus {
    status: 'synced' | 'pending' | 'conflict' | 'error';
    lastSync: Date;
    conflicts: QuestConflict[];
    errorMessage?: string;
}

export interface QuestConflict {
    type: 'content' | 'completion' | 'metadata';
    field: string;
    localValue: any;
    remoteValue: any;
    resolution: 'local' | 'remote' | 'manual' | 'merge';
}

export interface VaultConnection {
    vaultId: string;
    vaultName: string;
    connectionType: 'read' | 'write' | 'full';
    lastSync: Date;
    status: 'connected' | 'disconnected' | 'error';
    syncInterval: number; // minutes
}

export interface QuestSharingConfig {
    enableSharing: boolean;
    autoSync: boolean;
    syncInterval: number; // minutes
    conflictResolution: 'auto' | 'manual' | 'prompt';
    defaultPermissions: QuestPermissions;
    allowedVaults: string[];
    shareLocation: string; // Path where shared quests are stored
}

export class QuestSharingSystem {
    private static instance: QuestSharingSystem;
    private app: App;
    private config: QuestSharingConfig;
    private connections: Map<string, VaultConnection> = new Map();
    private sharedQuests: Map<string, SharedQuest> = new Map();
    private syncQueue: Array<{ questId: string; action: 'create' | 'update' | 'delete' }> = [];
    private isSyncing = false;

    static getInstance(app: App): QuestSharingSystem {
        if (!this.instance) {
            this.instance = new QuestSharingSystem(app);
        }
        return this.instance;
    }

    constructor(app: App) {
        this.app = app;
        this.config = this.getDefaultConfig();
        this.initializeSharingSystem();
    }

    /**
     * Initialize the sharing system
     */
    private async initializeSharingSystem(): Promise<void> {
        await this.loadConfiguration();
        await this.loadSharedQuests();
        await this.setupAutoSync();
    }

    /**
     * Share a quest with other vaults
     */
    async shareQuest(
        quest: Quest,
        targetVaults: string[],
        permissions: Partial<QuestPermissions> = {}
    ): Promise<SharedQuest> {
        const sharedQuest: SharedQuest = {
            id: this.generateSharedQuestId(),
            quest: { ...quest },
            vaultId: this.getCurrentVaultId(),
            sharedBy: this.getCurrentUser(),
            sharedAt: new Date(),
            lastModified: new Date(),
            permissions: { ...this.config.defaultPermissions, ...permissions },
            metadata: this.extractQuestMetadata(quest),
            syncStatus: {
                status: 'pending',
                lastSync: new Date(),
                conflicts: []
            }
        };

        // Save shared quest locally
        await this.saveSharedQuest(sharedQuest);

        // Queue for sync to target vaults
        for (const vaultId of targetVaults) {
            this.queueSync(sharedQuest.id, 'create');
        }

        // Notify other vaults
        await this.notifyVaults(targetVaults, {
            type: 'quest_shared',
            questId: sharedQuest.id,
            sharedQuest
        });

        return sharedQuest;
    }

    /**
     * Import a shared quest into current vault
     */
    async importSharedQuest(sharedQuestId: string): Promise<Quest> {
        const sharedQuest = this.sharedQuests.get(sharedQuestId);
        if (!sharedQuest) {
            throw new Error(`Shared quest ${sharedQuestId} not found`);
        }

        // Check permissions
        if (!this.canImportQuest(sharedQuest)) {
            throw new Error('Insufficient permissions to import this quest');
        }

        // Create local copy of the quest
        const importedQuest: Quest = {
            ...sharedQuest.quest,
            id: `${sharedQuest.quest.id}_imported_${Date.now()}`,
            sharedQuestId: sharedQuestId,
            // Remove importedAt as it doesn't exist in Quest interface
        };

        // Add to local quest file
        await this.addQuestToLocalFile(importedQuest);

        // Update shared quest metadata
        sharedQuest.metadata.sharedQuests.push(importedQuest.id);
        await this.saveSharedQuest(sharedQuest);

        return importedQuest;
    }

    /**
     * Sync quests with connected vaults
     */
    async syncWithVaults(): Promise<void> {
        if (this.isSyncing) return;

        this.isSyncing = true;
        console.log('[QuestSharing] Starting vault synchronization...');

        try {
            // Process sync queue
            await this.processSyncQueue();

            // Sync with each connected vault
            for (const [vaultId, connection] of this.connections) {
                if (connection.status === 'connected') {
                    await this.syncWithVault(vaultId);
                }
            }

            console.log('[QuestSharing] Synchronization completed');
        } catch (error) {
            console.error('[QuestSharing] Synchronization failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Resolve conflicts between local and remote quests
     */
    async resolveConflicts(sharedQuestId: string, conflicts: QuestConflict[]): Promise<void> {
        const sharedQuest = this.sharedQuests.get(sharedQuestId);
        if (!sharedQuest) return;

        for (const conflict of conflicts) {
            const resolution = await this.resolveConflict(conflict);

            switch (resolution) {
                case 'local':
                    // Keep local changes
                    break;
                case 'remote':
                    // Apply remote changes
                    this.applyRemoteChanges(sharedQuest, conflict);
                    break;
                case 'merge':
                    // Merge changes intelligently
                    this.mergeChanges(sharedQuest, conflict);
                    break;
                case 'manual':
                    // Let user decide (implement UI for this)
                    await this.promptUserResolution(conflict);
                    break;
            }
        }

        // Update sync status
        sharedQuest.syncStatus.status = 'synced';
        sharedQuest.syncStatus.lastSync = new Date();
        await this.saveSharedQuest(sharedQuest);
    }

    /**
     * Get quests shared by other vaults
     */
    async getSharedQuestsFromVault(vaultId: string): Promise<SharedQuest[]> {
        const sharedQuests: SharedQuest[] = [];

        for (const [id, sharedQuest] of this.sharedQuests) {
            if (sharedQuest.vaultId === vaultId && this.canAccessQuest(sharedQuest)) {
                sharedQuests.push(sharedQuest);
            }
        }

        return sharedQuests;
    }

    /**
     * Get quests shared by current vault
     */
    async getQuestsSharedByCurrentVault(): Promise<SharedQuest[]> {
        const currentVaultId = this.getCurrentVaultId();
        const sharedQuests: SharedQuest[] = [];

        for (const [id, sharedQuest] of this.sharedQuests) {
            if (sharedQuest.vaultId === currentVaultId) {
                sharedQuests.push(sharedQuest);
            }
        }

        return sharedQuests;
    }

    /**
     * Update quest sharing permissions
     */
    async updateQuestPermissions(
        sharedQuestId: string,
        permissions: Partial<QuestPermissions>
    ): Promise<void> {
        const sharedQuest = this.sharedQuests.get(sharedQuestId);
        if (!sharedQuest) return;

        sharedQuest.permissions = { ...sharedQuest.permissions, ...permissions };
        sharedQuest.lastModified = new Date();

        await this.saveSharedQuest(sharedQuest);
        this.queueSync(sharedQuestId, 'update');
    }

    /**
     * Remove shared quest
     */
    async removeSharedQuest(sharedQuestId: string): Promise<void> {
        const sharedQuest = this.sharedQuests.get(sharedQuestId);
        if (!sharedQuest) return;

        // Check permissions
        if (!this.canDeleteQuest(sharedQuest)) {
            throw new Error('Insufficient permissions to delete this quest');
        }

        // Remove from local storage
        this.sharedQuests.delete(sharedQuestId);
        await this.saveSharedQuestsToFile();

        // Queue deletion sync
        this.queueSync(sharedQuestId, 'delete');

        // Notify other vaults
        await this.notifyVaults(sharedQuest.metadata.allowedVaults, {
            type: 'quest_removed',
            questId: sharedQuestId
        });
    }

    /**
     * Private helper methods
     */
    private getDefaultConfig(): QuestSharingConfig {
        return {
            enableSharing: true,
            autoSync: true,
            syncInterval: 5, // 5 minutes
            conflictResolution: 'prompt',
            defaultPermissions: {
                canEdit: true,
                canDelete: false,
                canShare: true,
                canComplete: true,
                allowedVaults: []
            },
            allowedVaults: [],
            shareLocation: '.obsidian/plugins/gamification/shared-quests'
        };
    }

    private async loadConfiguration(): Promise<void> {
        try {
            const configFile = this.app.vault.getAbstractFileByPath('.obsidian/plugins/gamification/sharing-config.json');
            if (configFile instanceof TFile) {
                const content = await this.app.vault.read(configFile);
                this.config = { ...this.config, ...JSON.parse(content) };
            }
        } catch (error) {
            console.warn('[QuestSharing] Could not load configuration, using defaults');
        }
    }

    private async loadSharedQuests(): Promise<void> {
        try {
            const sharedQuestsFile = this.app.vault.getAbstractFileByPath(`${this.config.shareLocation}/shared-quests.json`);
            if (sharedQuestsFile instanceof TFile) {
                const content = await this.app.vault.read(sharedQuestsFile);
                const questsData = JSON.parse(content);

                for (const [id, questData] of Object.entries(questsData)) {
                    this.sharedQuests.set(id, questData as SharedQuest);
                }
            }
        } catch (error) {
            console.warn('[QuestSharing] Could not load shared quests');
        }
    }

    private async setupAutoSync(): Promise<void> {
        if (this.config.autoSync) {
            setInterval(() => {
                this.syncWithVaults();
            }, this.config.syncInterval * 60 * 1000);
        }
    }

    private generateSharedQuestId(): string {
        return `shared-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateLocalQuestId(): string {
        return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private getCurrentVaultId(): string {
        // Use vault name as ID, or generate a unique ID
        return this.app.vault.getName() || 'default-vault';
    }

    private getCurrentUser(): string {
        // This could be enhanced with user authentication
        return 'current-user';
    }

    private extractQuestMetadata(quest: Quest): SharedQuestMetadata {
        return {
            originalVault: this.getCurrentVaultId(),
            originalQuestId: quest.id,
            sharedQuests: [],
            allowedVaults: [], // Initialize allowedVaults
            version: 1,
            lastSync: new Date(),
            conflictResolution: 'manual',
            syncHistory: []
        };
    }

    private async saveSharedQuest(sharedQuest: SharedQuest): Promise<void> {
        this.sharedQuests.set(sharedQuest.id, sharedQuest);
        await this.saveSharedQuestsToFile();
    }

    private async saveSharedQuestsToFile(): Promise<void> {
        try {
            const questsData: Record<string, SharedQuest> = {};
            for (const [id, quest] of this.sharedQuests) {
                questsData[id] = quest;
            }

            const content = JSON.stringify(questsData, null, 2);
            await this.app.vault.adapter.write(`${this.config.shareLocation}/shared-quests.json`, content);
        } catch (error) {
            console.error('[QuestSharing] Failed to save shared quests:', error);
        }
    }

    private queueSync(questId: string, action: 'create' | 'update' | 'delete'): void {
        this.syncQueue.push({ questId, action });
    }

    private async processSyncQueue(): Promise<void> {
        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const item of queue) {
            try {
                await this.processSyncItem(item);
            } catch (error) {
                console.error(`[QuestSharing] Failed to process sync item:`, error);
            }
        }
    }

    private async processSyncItem(item: { questId: string; action: 'create' | 'update' | 'delete' }): Promise<void> {
        const sharedQuest = this.sharedQuests.get(item.questId);
        if (!sharedQuest) return;

        // Process based on action type
        switch (item.action) {
            case 'create':
                await this.broadcastQuestCreation(sharedQuest);
                break;
            case 'update':
                await this.broadcastQuestUpdate(sharedQuest);
                break;
            case 'delete':
                await this.broadcastQuestDeletion(item.questId);
                break;
        }
    }

    private async syncWithVault(vaultId: string): Promise<void> {
        const connection = this.connections.get(vaultId);
        if (!connection || connection.status !== 'connected') return;

        try {
            // Get remote quests
            const remoteQuests = await this.getRemoteQuests(vaultId);

            // Compare with local quests
            const conflicts = this.detectConflicts(remoteQuests);

            if (conflicts.length > 0) {
                await this.resolveConflicts(vaultId, conflicts);
            }

            // Update connection status
            connection.lastSync = new Date();
            connection.status = 'connected';
        } catch (error) {
            connection.status = 'error';
            console.error(`[QuestSharing] Sync failed for vault ${vaultId}:`, error);
        }
    }

    private canImportQuest(sharedQuest: SharedQuest): boolean {
        const currentVaultId = this.getCurrentVaultId();
        return sharedQuest.permissions.allowedVaults.includes(currentVaultId) ||
            sharedQuest.permissions.allowedVaults.length === 0;
    }

    private canAccessQuest(sharedQuest: SharedQuest): boolean {
        const currentVaultId = this.getCurrentVaultId();
        return sharedQuest.permissions.allowedVaults.includes(currentVaultId) ||
            sharedQuest.permissions.allowedVaults.length === 0;
    }

    private canDeleteQuest(sharedQuest: SharedQuest): boolean {
        return sharedQuest.permissions.canDelete &&
            sharedQuest.vaultId === this.getCurrentVaultId();
    }

    private async addQuestToLocalFile(quest: Quest): Promise<void> {
        // Add quest to the local GamifiedTasks.md file
        const questFile = this.app.vault.getAbstractFileByPath('GamifiedTasks.md');
        if (questFile instanceof TFile) {
            const content = await this.app.vault.read(questFile);
            const questLine = this.formatQuestForFile(quest);
            const newContent = content + '\n' + questLine;
            await this.app.vault.modify(questFile, newContent);
        }
    }

    private formatQuestForFile(quest: Quest): string {
        // Format quest as markdown task line
        const status = quest.completed ? 'x' : ' ';
        const xp = quest.xp ? ` ✨${quest.xp}` : '';
        const cp = quest.cp ? ` ⭐${quest.cp}` : '';
        const skills = quest.skills?.length ? ` 🛠️${quest.skills.join(',')}` : '';
        const tags = quest.tags?.map(tag => `#${tag}`).join(' ') || '';

        return `- [${status}] ${quest.title}${xp}${cp}${skills} #gamified-task ${tags}`;
    }

    private async notifyVaults(vaultIds: string[], message: any): Promise<void> {
        // This would implement the actual vault-to-vault communication
        // For now, we'll simulate it
        console.log(`[QuestSharing] Notifying vaults ${vaultIds.join(', ')}:`, message);
    }

    private async getRemoteQuests(vaultId: string): Promise<SharedQuest[]> {
        // This would fetch quests from the remote vault
        // For now, return empty array
        return [];
    }

    private detectConflicts(remoteQuests: SharedQuest[]): QuestConflict[] {
        // Compare local and remote quests to detect conflicts
        const conflicts: QuestConflict[] = [];

        for (const remoteQuest of remoteQuests) {
            const localQuest = this.sharedQuests.get(remoteQuest.id);
            if (localQuest && localQuest.lastModified.getTime() !== remoteQuest.lastModified.getTime()) {
                conflicts.push({
                    type: 'content',
                    field: 'lastModified',
                    localValue: localQuest.lastModified,
                    remoteValue: remoteQuest.lastModified,
                    resolution: 'manual'
                });
            }
        }

        return conflicts;
    }

    private async resolveConflict(conflict: QuestConflict): Promise<'local' | 'remote' | 'merge' | 'manual'> {
        switch (this.config.conflictResolution) {
            case 'auto':
                return 'local'; // Default to local changes
            case 'manual':
                return 'manual';
            case 'prompt':
                return 'manual'; // Would show UI prompt
            default:
                return 'manual';
        }
    }

    private applyRemoteChanges(sharedQuest: SharedQuest, conflict: QuestConflict): void {
        // Apply remote changes to local quest
        (sharedQuest as any)[conflict.field] = conflict.remoteValue;
    }

    private mergeChanges(sharedQuest: SharedQuest, conflict: QuestConflict): void {
        // Intelligently merge changes
        // This would implement sophisticated merging logic
    }

    private async promptUserResolution(conflict: QuestConflict): Promise<void> {
        // This would show a UI dialog for user to choose resolution
        console.log('[QuestSharing] User resolution needed for conflict:', conflict);
    }

    private async broadcastQuestCreation(sharedQuest: SharedQuest): Promise<void> {
        await this.notifyVaults(sharedQuest.permissions.allowedVaults, {
            type: 'quest_created',
            questId: sharedQuest.id,
            sharedQuest
        });
    }

    private async broadcastQuestUpdate(sharedQuest: SharedQuest): Promise<void> {
        await this.notifyVaults(sharedQuest.permissions.allowedVaults, {
            type: 'quest_updated',
            questId: sharedQuest.id,
            sharedQuest
        });
    }

    private async broadcastQuestDeletion(questId: string): Promise<void> {
        // Get the quest before deletion to notify other vaults
        const sharedQuest = this.sharedQuests.get(questId);
        if (sharedQuest) {
            await this.notifyVaults(sharedQuest.permissions.allowedVaults, {
                type: 'quest_deleted',
                questId
            });
        }
    }
}
