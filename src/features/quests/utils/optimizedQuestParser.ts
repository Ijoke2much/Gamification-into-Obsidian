// Optimized Quest Parser for Large Files
// Implements incremental parsing, caching, and performance optimizations

import { Vault, TFile } from 'obsidian';
import { Quest } from './taskParser';

export interface QuestCache {
    quests: Map<string, Quest>;
    fileHash: string;
    lastModified: Date;
    parseTime: number;
}

export interface IncrementalChange {
    type: 'add' | 'modify' | 'delete';
    lineNumber: number;
    oldContent?: string;
    newContent?: string;
    affectedQuests: string[];
}

export class OptimizedQuestParser {
    private static instance: OptimizedQuestParser;
    private questCache: Map<string, QuestCache> = new Map();
    private backgroundWorker?: Worker;
    private parseQueue: Array<{ filePath: string; content: string }> = [];
    private isProcessing = false;

    static getInstance(): OptimizedQuestParser {
        if (!this.instance) {
            this.instance = new OptimizedQuestParser();
        }
        return this.instance;
    }

    /**
     * Initialize background worker for parsing
     */
    private initializeBackgroundWorker(): void {
        if (typeof Worker !== 'undefined') {
            this.backgroundWorker = new Worker(URL.createObjectURL(new Blob([`
        self.onmessage = function(e) {
          const { content, filePath } = e.data;
          const startTime = performance.now();
          
          // Parse quests in background
          const quests = parseQuestsInBackground(content);
          const parseTime = performance.now() - startTime;
          
          self.postMessage({
            quests,
            filePath,
            parseTime,
            success: true
          });
        };
        
        function parseQuestsInBackground(content) {
          // Simplified parsing for background worker
          const lines = content.split('\\n');
          const quests = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('#gamified-task')) {
              const quest = parseQuestLine(line, i);
              if (quest) quests.push(quest);
            }
          }
          
          return quests;
        }
        
        function parseQuestLine(line, lineNumber) {
          // Basic quest parsing for performance
          const match = line.match(/- \\[( |x)\\] (.+?) #gamified-task/);
          if (!match) return null;
          
          const [, checked, title] = match;
          const xp = extractXP(line);
          const cp = extractCP(line);
          
          return {
            id: title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            title: title.trim(),
            xp: xp || 50,
            cp: cp || xp || 50,
            completed: checked === 'x',
            lineNumber: lineNumber + 1
          };
        }
        
        function extractXP(line) {
          const match = line.match(/✨(\\d+)/);
          return match ? parseInt(match[1]) : null;
        }
        
        function extractCP(line) {
          const match = line.match(/⭐(\\d+)/);
          return match ? parseInt(match[1]) : null;
        }
      `], { type: 'application/javascript' })));
        }
    }

    /**
     * Parse quests with caching and incremental updates
     */
    async parseQuestsOptimized(filePath: string, content: string): Promise<Quest[]> {
        const fileHash = this.generateFileHash(content);
        const cached = this.questCache.get(filePath);

        // Return cached result if file hasn't changed
        if (cached && cached.fileHash === fileHash) {
            console.log(`[OptimizedParser] Using cached quests for ${filePath}`);
            return Array.from(cached.quests.values());
        }

        // Check if we can do incremental parsing
        if (cached && this.canIncrementalParse(cached, content)) {
            return await this.parseIncremental(filePath, cached, content);
        }

        // Full parse required
        return await this.parseFull(filePath, content, fileHash);
    }

    /**
     * Incremental parsing for changed sections only
     */
    private async parseIncremental(
        filePath: string,
        cached: QuestCache,
        newContent: string
    ): Promise<Quest[]> {
        console.log(`[OptimizedParser] Performing incremental parse for ${filePath}`);

        const changes = this.detectChanges(cached, newContent);
        const updatedQuests = new Map(cached.quests);

        // Process each change
        for (const change of changes) {
            switch (change.type) {
                case 'add':
                    const newQuest = this.parseQuestAtLine(newContent, change.lineNumber);
                    if (newQuest) {
                        updatedQuests.set(newQuest.id, newQuest);
                    }
                    break;

                case 'modify':
                    const modifiedQuest = this.parseQuestAtLine(newContent, change.lineNumber);
                    if (modifiedQuest) {
                        updatedQuests.set(modifiedQuest.id, modifiedQuest);
                    }
                    break;

                case 'delete':
                    change.affectedQuests.forEach(questId => {
                        updatedQuests.delete(questId);
                    });
                    break;
            }
        }

        // Update cache
        const newHash = this.generateFileHash(newContent);
        this.questCache.set(filePath, {
            quests: updatedQuests,
            fileHash: newHash,
            lastModified: new Date(),
            parseTime: performance.now()
        });

        return Array.from(updatedQuests.values());
    }

    /**
     * Full parsing when incremental isn't possible
     */
    private async parseFull(filePath: string, content: string, fileHash: string): Promise<Quest[]> {
        console.log(`[OptimizedParser] Performing full parse for ${filePath}`);

        // Use background worker if available
        if (this.backgroundWorker) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Background parsing timeout'));
                }, 10000);

                this.backgroundWorker!.onmessage = (e) => {
                    clearTimeout(timeout);
                    if (e.data.success) {
                        const quests = e.data.quests;
                        this.updateCache(filePath, quests, fileHash);
                        resolve(quests);
                    } else {
                        reject(new Error('Background parsing failed'));
                    }
                };

                this.backgroundWorker!.postMessage({ content, filePath });
            });
        }

        // Fallback to main thread parsing
        const startTime = performance.now();
        const quests = await this.parseQuestsMainThread(content);
        const parseTime = performance.now() - startTime;

        this.updateCache(filePath, quests, fileHash);
        console.log(`[OptimizedParser] Full parse completed in ${parseTime.toFixed(2)}ms`);

        return quests;
    }

    /**
     * Main thread parsing with chunking for large files
     */
    private async parseQuestsMainThread(content: string): Promise<Quest[]> {
        const lines = content.split('\n');
        const quests: Quest[] = [];
        const chunkSize = 1000; // Process in chunks

        for (let i = 0; i < lines.length; i += chunkSize) {
            const chunk = lines.slice(i, i + chunkSize);

            // Process chunk
            for (let j = 0; j < chunk.length; j++) {
                const line = chunk[j];
                if (line.includes('#gamified-task')) {
                    const quest = this.parseQuestLine(line, i + j);
                    if (quest) quests.push(quest);
                }
            }

            // Yield control to prevent blocking
            if (i + chunkSize < lines.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return quests;
    }

    /**
     * Virtual scrolling for quest lists
     */
    createVirtualQuestList(quests: Quest[], containerHeight: number): VirtualQuestList {
        return new VirtualQuestList(quests, containerHeight);
    }

    /**
     * Utility methods
     */
    private generateFileHash(content: string): string {
        // Simple hash for change detection
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    private canIncrementalParse(cached: QuestCache, newContent: string): boolean {
        // Only do incremental if file size hasn't changed dramatically
        const sizeDiff = Math.abs(newContent.length - cached.fileHash.length);
        return sizeDiff < newContent.length * 0.1; // Less than 10% change
    }

    private detectChanges(cached: QuestCache, newContent: string): IncrementalChange[] {
        // Simplified change detection
        const changes: IncrementalChange[] = [];
        const oldLines = cached.fileHash.split('\n');
        const newLines = newContent.split('\n');

        // Find added/modified lines
        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
            if (i >= oldLines.length) {
                changes.push({
                    type: 'add',
                    lineNumber: i,
                    newContent: newLines[i],
                    affectedQuests: []
                });
            } else if (i >= newLines.length) {
                changes.push({
                    type: 'delete',
                    lineNumber: i,
                    oldContent: oldLines[i],
                    affectedQuests: []
                });
            } else if (oldLines[i] !== newLines[i]) {
                changes.push({
                    type: 'modify',
                    lineNumber: i,
                    oldContent: oldLines[i],
                    newContent: newLines[i],
                    affectedQuests: []
                });
            }
        }

        return changes;
    }

    private updateCache(filePath: string, quests: Quest[], fileHash: string): void {
        const questMap = new Map();
        quests.forEach(quest => questMap.set(quest.id, quest));

        this.questCache.set(filePath, {
            quests: questMap,
            fileHash,
            lastModified: new Date(),
            parseTime: performance.now()
        });
    }

    private parseQuestAtLine(content: string, lineNumber: number): Quest | null {
        const lines = content.split('\n');
        if (lineNumber >= lines.length) return null;

        const line = lines[lineNumber];
        if (!line.includes('#gamified-task')) return null;

        return this.parseQuestLine(line, lineNumber);
    }

    private parseQuestLine(line: string, lineNumber: number): Quest | null {
        // Simplified quest parsing for performance
        const match = line.match(/- \[( |x)\] (.+?) #gamified-task/);
        if (!match) return null;

        const [, checked, title] = match;
        const xp = this.extractXP(line);
        const cp = this.extractCP(line);

        return {
            id: title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            title: title.trim(),
            xp: xp || 50,
            cp: cp || xp || 50,
            coins: Math.round((xp || 50) * 0.1),
            completed: checked === 'x',
            lineNumber: lineNumber + 1,
            subtasks: [],
            className: '',
            stats: [],
            skills: [],
            tags: []
        };
    }

    private extractXP(line: string): number | null {
        const match = line.match(/✨(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    private extractCP(line: string): number | null {
        const match = line.match(/⭐(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    /**
     * Clear cache for a specific file
     */
    clearCache(filePath?: string): void {
        if (filePath) {
            this.questCache.delete(filePath);
        } else {
            this.questCache.clear();
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { cachedFiles: number; totalQuests: number } {
        let totalQuests = 0;
        this.questCache.forEach(cache => {
            totalQuests += cache.quests.size;
        });

        return {
            cachedFiles: this.questCache.size,
            totalQuests
        };
    }
}

/**
 * Virtual scrolling implementation for large quest lists
 */
export class VirtualQuestList {
    private quests: Quest[];
    private containerHeight: number;
    private questHeight: number = 80; // pixels per quest
    private visibleRange: { start: number; end: number } = { start: 0, end: 50 };

    constructor(quests: Quest[], containerHeight: number) {
        this.quests = quests;
        this.containerHeight = containerHeight;
        this.updateVisibleRange(0);
    }

    updateVisibleRange(scrollTop: number): void {
        this.visibleRange.start = Math.floor(scrollTop / this.questHeight);
        this.visibleRange.end = Math.min(
            this.visibleRange.start + Math.ceil(this.containerHeight / this.questHeight) + 5,
            this.quests.length
        );
    }

    getVisibleQuests(): Quest[] {
        return this.quests.slice(this.visibleRange.start, this.visibleRange.end);
    }

    getTotalHeight(): number {
        return this.quests.length * this.questHeight;
    }

    getVisibleRange(): { start: number; end: number } {
        return { ...this.visibleRange };
    }

    getOffsetY(): number {
        return this.visibleRange.start * this.questHeight;
    }
}
