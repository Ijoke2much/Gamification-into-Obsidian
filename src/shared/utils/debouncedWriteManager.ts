/**
 * Debounced Write Manager
 * 
 * Features:
 * - Batches multiple write operations to reduce disk I/O
 * - Configurable debounce delays
 * - Priority queue for critical writes
 * - Atomic write operations to prevent conflicts
 * - Error handling and retry logic
 */

import { Vault, TFile } from 'obsidian';

export interface WriteOperation {
    filePath: string;
    content: string | ((current: string) => string | Promise<string>);
    priority: 'low' | 'normal' | 'high' | 'critical';
    timestamp: number;
    retries: number;
    maxRetries: number;
}

export interface WriteStats {
    totalWrites: number;
    batchedWrites: number;
    failedWrites: number;
    retriedWrites: number;
    averageDelay: number;
    totalBytesSaved: number;
}

export interface WriteConfig {
    debounceDelay?: number;
    maxBatchSize?: number;
    enableBatching?: boolean;
    maxRetries?: number;
    retryDelay?: number;
}

export class DebouncedWriteManager {
    private static instance: DebouncedWriteManager;

    private vault: Vault | null = null;
    private writeQueue: Map<string, WriteOperation> = new Map();
    private pendingWrites: Set<string> = new Set();
    private timers: Map<string, NodeJS.Timeout> = new Map();

    // Configuration
    private debounceDelay: number;
    private maxBatchSize: number;
    private enableBatching: boolean;
    private maxRetries: number;
    private retryDelay: number;

    // Statistics
    private stats: WriteStats = {
        totalWrites: 0,
        batchedWrites: 0,
        failedWrites: 0,
        retriedWrites: 0,
        averageDelay: 0,
        totalBytesSaved: 0
    };

    private constructor(config: WriteConfig = {}) {
        this.debounceDelay = config.debounceDelay ?? 1000; // 1 second default
        this.maxBatchSize = config.maxBatchSize ?? 10;
        this.enableBatching = config.enableBatching ?? true;
        this.maxRetries = config.maxRetries ?? 3;
        this.retryDelay = config.retryDelay ?? 1000;
    }

    static getInstance(config?: WriteConfig): DebouncedWriteManager {
        if (!DebouncedWriteManager.instance) {
            DebouncedWriteManager.instance = new DebouncedWriteManager(config);
        }
        return DebouncedWriteManager.instance;
    }

    /**
     * Set the vault instance
     */
    setVault(vault: Vault): void {
        this.vault = vault;
    }

    /**
     * Configure write manager settings
     */
    configure(config: Partial<WriteConfig>): void {
        if (config.debounceDelay !== undefined) this.debounceDelay = config.debounceDelay;
        if (config.maxBatchSize !== undefined) this.maxBatchSize = config.maxBatchSize;
        if (config.enableBatching !== undefined) this.enableBatching = config.enableBatching;
        if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries;
        if (config.retryDelay !== undefined) this.retryDelay = config.retryDelay;
    }

    /**
     * Queue a write operation
     */
    async queueWrite(
        filePath: string,
        content: string | ((current: string) => string | Promise<string>),
        priority: WriteOperation['priority'] = 'normal'
    ): Promise<void> {
        if (!this.vault) {
            throw new Error('[DebouncedWriteManager] Vault not set');
        }

        // Create write operation
        const operation: WriteOperation = {
            filePath,
            content,
            priority,
            timestamp: Date.now(),
            retries: 0,
            maxRetries: this.maxRetries
        };

        // If critical, write immediately
        if (priority === 'critical') {
            await this.executeWrite(operation);
            return;
        }

        // Add to queue
        this.writeQueue.set(filePath, operation);

        // Clear existing timer for this file
        const existingTimer = this.timers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set up debounced write
        const delay = this.getDelayForPriority(priority);
        const timer = setTimeout(() => {
            this.processWrite(filePath);
        }, delay);

        this.timers.set(filePath, timer);
    }

    /**
     * Get delay based on priority
     */
    private getDelayForPriority(priority: WriteOperation['priority']): number {
        switch (priority) {
            case 'critical':
                return 0;
            case 'high':
                return this.debounceDelay * 0.5;
            case 'normal':
                return this.debounceDelay;
            case 'low':
                return this.debounceDelay * 2;
        }
    }

    /**
     * Process a single write from the queue
     */
    private async processWrite(filePath: string): Promise<void> {
        const operation = this.writeQueue.get(filePath);
        if (!operation) return;

        this.writeQueue.delete(filePath);
        this.timers.delete(filePath);

        await this.executeWrite(operation);
    }

    /**
     * Execute a write operation
     */
    private async executeWrite(operation: WriteOperation): Promise<void> {
        if (!this.vault) {
            console.error('[DebouncedWriteManager] Vault not set');
            return;
        }

        // Check if already writing to this file
        if (this.pendingWrites.has(operation.filePath)) {
            // Re-queue the operation
            setTimeout(() => {
                this.writeQueue.set(operation.filePath, operation);
                this.processWrite(operation.filePath);
            }, 100);
            return;
        }

        this.pendingWrites.add(operation.filePath);

        try {
            const file = this.vault.getAbstractFileByPath(operation.filePath);

            if (!(file instanceof TFile)) {
                // File doesn't exist, create it
                const folderPath = operation.filePath.substring(0, operation.filePath.lastIndexOf('/'));
                if (folderPath) {
                    await this.ensureFolderExists(folderPath);
                }

                const content = typeof operation.content === 'function'
                    ? await operation.content('')
                    : operation.content;

                await this.vault.create(operation.filePath, content);
                this.stats.totalWrites++;
                this.stats.totalBytesSaved += content.length;
            } else {
                // File exists, modify it
                let content: string;

                if (typeof operation.content === 'function') {
                    const currentContent = await this.vault.read(file);
                    content = await operation.content(currentContent);
                } else {
                    content = operation.content;
                }

                await this.vault.modify(file, content);
                this.stats.totalWrites++;
                this.stats.totalBytesSaved += content.length;
            }

            console.log(`[DebouncedWriteManager] Successfully wrote to ${operation.filePath}`);

        } catch (error) {
            console.error(`[DebouncedWriteManager] Failed to write ${operation.filePath}:`, error);
            this.stats.failedWrites++;

            // Retry logic
            if (operation.retries < operation.maxRetries) {
                operation.retries++;
                this.stats.retriedWrites++;

                console.log(`[DebouncedWriteManager] Retrying write to ${operation.filePath} (attempt ${operation.retries}/${operation.maxRetries})`);

                setTimeout(() => {
                    this.writeQueue.set(operation.filePath, operation);
                    this.processWrite(operation.filePath);
                }, this.retryDelay * operation.retries);
            }
        } finally {
            this.pendingWrites.delete(operation.filePath);
        }
    }

    /**
     * Ensure folder exists, creating if necessary
     */
    private async ensureFolderExists(folderPath: string): Promise<void> {
        if (!this.vault) return;

        const folder = this.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
            try {
                await this.vault.createFolder(folderPath);
            } catch (error) {
                // Folder might already exist or parent doesn't exist
                console.warn(`[DebouncedWriteManager] Could not create folder ${folderPath}:`, error);
            }
        }
    }

    /**
     * Flush all pending writes immediately
     */
    async flush(): Promise<void> {
        console.log(`[DebouncedWriteManager] Flushing ${this.writeQueue.size} pending writes`);

        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();

        // Process all writes
        const writes = Array.from(this.writeQueue.keys());
        await Promise.all(writes.map(filePath => this.processWrite(filePath)));
    }

    /**
     * Cancel a pending write
     */
    cancel(filePath: string): boolean {
        const timer = this.timers.get(filePath);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(filePath);
        }

        return this.writeQueue.delete(filePath);
    }

    /**
     * Check if a file has pending writes
     */
    hasPendingWrites(filePath: string): boolean {
        return this.writeQueue.has(filePath) || this.pendingWrites.has(filePath);
    }

    /**
     * Get pending write count
     */
    getPendingCount(): number {
        return this.writeQueue.size + this.pendingWrites.size;
    }

    /**
     * Get statistics
     */
    getStats(): WriteStats {
        const totalOps = this.stats.totalWrites + this.stats.failedWrites;
        const avgDelay = totalOps > 0 ? this.stats.totalBytesSaved / totalOps : 0;

        return {
            ...this.stats,
            averageDelay: avgDelay
        };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            totalWrites: 0,
            batchedWrites: 0,
            failedWrites: 0,
            retriedWrites: 0,
            averageDelay: 0,
            totalBytesSaved: 0
        };
    }

    /**
     * Batch write multiple files at once
     */
    async batchWrite(operations: Array<{
        filePath: string;
        content: string;
        priority?: WriteOperation['priority'];
    }>): Promise<void> {
        if (!this.enableBatching) {
            // Execute sequentially if batching disabled
            for (const op of operations) {
                await this.queueWrite(op.filePath, op.content, op.priority);
            }
            return;
        }

        // Split into batches
        for (let i = 0; i < operations.length; i += this.maxBatchSize) {
            const batch = operations.slice(i, i + this.maxBatchSize);

            await Promise.all(batch.map(op =>
                this.queueWrite(op.filePath, op.content, op.priority)
            ));

            this.stats.batchedWrites += batch.length;
        }
    }

    /**
     * Clean up on plugin unload
     */
    async destroy(): Promise<void> {
        console.log('[DebouncedWriteManager] Destroying write manager...');
        await this.flush();
        this.writeQueue.clear();
        this.pendingWrites.clear();
        this.timers.clear();
    }
}

// Export singleton instance
export const debouncedWriteManager = DebouncedWriteManager.getInstance();

