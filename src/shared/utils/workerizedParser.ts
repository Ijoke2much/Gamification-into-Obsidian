/**
 * Workerized Parser System
 * 
 * Features:
 * - Web Worker-based parsing for large files
 * - Automatic fallback to main thread
 * - Progress tracking for long operations
 * - Chunked processing to prevent blocking
 * - Worker pool management
 */

import { Quest } from '../../features/quests/utils/taskParser';

export interface ParseTask {
    id: string;
    content: string;
    filePath: string;
    options?: ParseOptions;
}

export interface ParseOptions {
    chunkSize?: number;
    timeout?: number;
    useWorker?: boolean;
}

export interface ParseResult {
    quests: Quest[];
    parseTime: number;
    usedWorker: boolean;
    errors?: string[];
}

export interface WorkerMessage {
    type: 'parse' | 'result' | 'error' | 'progress';
    taskId: string;
    data?: any;
    error?: string;
    progress?: number;
}

export class WorkerizedParser {
    private static instance: WorkerizedParser;

    private workers: Worker[] = [];
    private workerPool: number[] = [];
    private maxWorkers: number;
    private workerCode: string;
    private pendingTasks: Map<string, {
        resolve: (result: ParseResult) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }> = new Map();

    private constructor(maxWorkers: number = 2) {
        this.maxWorkers = maxWorkers;
        this.workerCode = this.generateWorkerCode();
        this.initializeWorkers();
    }

    static getInstance(maxWorkers?: number): WorkerizedParser {
        if (!WorkerizedParser.instance) {
            WorkerizedParser.instance = new WorkerizedParser(maxWorkers);
        }
        return WorkerizedParser.instance;
    }

    /**
     * Generate web worker code
     */
    private generateWorkerCode(): string {
        return `
            // Quest Parser Worker
            self.onmessage = function(e) {
                const { type, taskId, data } = e.data;
                
                if (type === 'parse') {
                    try {
                        const startTime = performance.now();
                        const quests = parseQuests(data.content, data.options);
                        const parseTime = performance.now() - startTime;
                        
                        self.postMessage({
                            type: 'result',
                            taskId,
                            data: { quests, parseTime }
                        });
                    } catch (error) {
                        self.postMessage({
                            type: 'error',
                            taskId,
                            error: error.message || String(error)
                        });
                    }
                }
            };
            
            function parseQuests(content, options = {}) {
                const chunkSize = options.chunkSize || 1000;
                const lines = content.split('\\n');
                const quests = [];
                
                let currentQuest = null;
                let lineNumber = 0;
                
                for (let i = 0; i < lines.length; i++) {
                    lineNumber = i + 1;
                    const line = lines[i];
                    
                    // Progress reporting (every 1000 lines)
                    if (i % 1000 === 0) {
                        self.postMessage({
                            type: 'progress',
                            taskId: self.currentTaskId,
                            progress: i / lines.length
                        });
                    }
                    
                    // Check for task markers
                    if (line.includes('#gamified-task') || line.includes('#gamified')) {
                        const quest = parseQuestLine(line, lineNumber);
                        if (quest) {
                            quests.push(quest);
                            currentQuest = quest;
                        }
                    } else if (currentQuest && line.match(/^\\s+- \\[[ x]\\]/)) {
                        // Subtask
                        const subtask = parseSubtask(line, lineNumber);
                        if (subtask) {
                            if (!currentQuest.subtasks) {
                                currentQuest.subtasks = [];
                            }
                            currentQuest.subtasks.push(subtask);
                        }
                    } else if (currentQuest && !line.trim()) {
                        // Empty line ends quest
                        currentQuest = null;
                    }
                }
                
                return quests;
            }
            
            function parseQuestLine(line, lineNumber) {
                // Match task format: - [ ] Title #gamified-task ✨XP ⭐CP 🪙Coins
                const taskMatch = line.match(/^\\s*- \\[([\\sx])\\]\\s+(.+?)\\s*#gamified(-task)?/);
                if (!taskMatch) return null;
                
                const [, checked, titleAndTags] = taskMatch;
                const completed = checked.toLowerCase() === 'x';
                
                // Extract title (before any metadata)
                let title = titleAndTags.trim();
                
                // Extract XP
                const xpMatch = line.match(/✨(\\d+)/);
                const xp = xpMatch ? parseInt(xpMatch[1]) : 50;
                
                // Extract CP
                const cpMatch = line.match(/⭐(\\d+)/);
                const cp = cpMatch ? parseInt(cpMatch[1]) : xp;
                
                // Extract Coins
                const coinsMatch = line.match(/🪙(\\d+)/);
                const coins = coinsMatch ? parseInt(coinsMatch[1]) : Math.round(xp * 0.1);
                
                // Extract difficulty
                const difficultyMatch = line.match(/🎯(\\w+)/);
                const difficulty = difficultyMatch ? difficultyMatch[1].toLowerCase() : 'medium';
                
                // Extract time estimate
                const timeMatch = line.match(/⏱️(\\d+)/);
                const estimatedMinutes = timeMatch ? parseInt(timeMatch[1]) : undefined;
                
                // Extract due date - support both date and datetime formats
                const dueMatch = line.match(/📅(\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2})?)/);
                const due = dueMatch ? dueMatch[1] : undefined;
                
                // Extract skills (🛠️SkillName)
                const skills = [];
                const skillMatches = line.matchAll(/🛠️([^\\s]+)/g);
                for (const match of skillMatches) {
                    skills.push(match[1]);
                }
                
                // Extract recurrence (🔁weekly, 🔁daily, etc.)
                const recurMatch = line.match(/🔁(\\w+)/);
                const recur = recurMatch ? recurMatch[1] : undefined;
                
                // Extract priority indicators (🔼, 🔽, etc.)
                const priorityMatch = line.match(/[🔼🔽⏫⏬🔺]/);
                const priority = priorityMatch ? priorityMatch[0] : undefined;
                
                // Extract tags
                const tags = extractTags(titleAndTags);
                
                // Clean title (remove metadata)
                title = title
                    .replace(/✨\\d+/g, '')
                    .replace(/⭐\\d+/g, '')
                    .replace(/🪙\\d+/g, '')
                    .replace(/🎯\\w+/g, '')
                    .replace(/⏱️\\d+/g, '')
                    .replace(/📅\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2})?/g, '') // Remove date emojis
                    .replace(/🛠️[^\\s]+/g, '') // Remove skill emojis
                    .replace(/🔁\\w+/g, '') // Remove recurrence
                    .replace(/[🔼🔽⏫⏬🔺]/g, '') // Remove priority indicators
                    .replace(/#[\\w-]+/g, '')
                    .trim();
                
                return {
                    id: generateId(title, lineNumber),
                    title,
                    xp,
                    cp,
                    coins,
                    completed,
                    difficulty,
                    estimatedMinutes,
                    due,
                    recur,
                    priority,
                    tags,
                    skills,
                    lineNumber,
                    subtasks: [],
                    className: '',
                    stats: []
                };
            }
            
            function parseSubtask(line, lineNumber) {
                const match = line.match(/^\\s+- \\[([\\sx])\\]\\s+(.+)/);
                if (!match) return null;
                
                const [, checked, title] = match;
                const completed = checked.toLowerCase() === 'x';
                
                return {
                    id: generateId(title, lineNumber),
                    text: title.trim(),  // Use 'text' instead of 'title' for subtasks
                    completed,
                    lineNumber
                };
            }
            
            function extractTags(text) {
                const tags = [];
                const tagMatches = text.matchAll(/#([\\w-]+)/g);
                for (const match of tagMatches) {
                    const tag = match[1];
                    if (tag !== 'gamified' && tag !== 'gamified-task') {
                        tags.push(tag);
                    }
                }
                return tags;
            }
            
            function generateId(text, lineNumber) {
                const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '-');
                return \`\${clean}-\${lineNumber}\`;
            }
        `;
    }

    /**
     * Initialize worker pool
     */
    private initializeWorkers(): void {
        if (typeof Worker === 'undefined') {
            console.warn('[WorkerizedParser] Web Workers not supported in this environment');
            return;
        }

        try {
            const blob = new Blob([this.workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);

            for (let i = 0; i < this.maxWorkers; i++) {
                const worker = new Worker(workerUrl);
                worker.onmessage = this.handleWorkerMessage.bind(this);
                worker.onerror = this.handleWorkerError.bind(this);
                this.workers.push(worker);
                this.workerPool.push(i);
            }

            console.log(`[WorkerizedParser] Initialized ${this.maxWorkers} workers`);
        } catch (error) {
            console.error('[WorkerizedParser] Failed to initialize workers:', error);
        }
    }

    /**
     * Handle worker messages
     */
    private handleWorkerMessage(e: MessageEvent<WorkerMessage>): void {
        const { type, taskId, data, error, progress } = e.data;

        const pending = this.pendingTasks.get(taskId);
        if (!pending) return;

        switch (type) {
            case 'result':
                clearTimeout(pending.timeout);
                this.pendingTasks.delete(taskId);
                pending.resolve({
                    quests: data.quests,
                    parseTime: data.parseTime,
                    usedWorker: true
                });
                break;

            case 'error':
                clearTimeout(pending.timeout);
                this.pendingTasks.delete(taskId);
                pending.reject(new Error(error || 'Worker parsing failed'));
                break;

            case 'progress':
                // Could emit progress events here
                console.log(`[WorkerizedParser] Task ${taskId} progress: ${Math.round((progress || 0) * 100)}%`);
                break;
        }
    }

    /**
     * Handle worker errors
     */
    private handleWorkerError(error: ErrorEvent): void {
        console.error('[WorkerizedParser] Worker error:', error);
    }

    /**
     * Get an available worker from the pool
     */
    private getAvailableWorker(): Worker | null {
        if (this.workerPool.length === 0) return null;

        const workerId = this.workerPool.shift()!;
        return this.workers[workerId];
    }

    /**
     * Release worker back to pool
     */
    private releaseWorker(worker: Worker): void {
        const workerId = this.workers.indexOf(worker);
        if (workerId !== -1 && !this.workerPool.includes(workerId)) {
            this.workerPool.push(workerId);
        }
    }

    /**
     * Parse content using worker or main thread
     */
    async parse(task: ParseTask): Promise<ParseResult> {
        const options = {
            chunkSize: 1000,
            timeout: 10000,
            useWorker: true,
            ...task.options
        };

        // Try worker parsing if enabled and workers available
        if (options.useWorker && this.workers.length > 0) {
            try {
                return await this.parseWithWorker(task, options);
            } catch (error) {
                console.warn('[WorkerizedParser] Worker parsing failed, falling back to main thread:', error);
            }
        }

        // Fallback to main thread
        return await this.parseMainThread(task, options);
    }

    /**
     * Parse using web worker
     */
    private async parseWithWorker(task: ParseTask, options: ParseOptions): Promise<ParseResult> {
        const worker = this.getAvailableWorker();
        if (!worker) {
            throw new Error('No available workers');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingTasks.delete(task.id);
                this.releaseWorker(worker);
                reject(new Error('Worker parsing timeout'));
            }, options.timeout);

            this.pendingTasks.set(task.id, {
                resolve: (result) => {
                    this.releaseWorker(worker);
                    resolve(result);
                },
                reject: (error) => {
                    this.releaseWorker(worker);
                    reject(error);
                },
                timeout
            });

            worker.postMessage({
                type: 'parse',
                taskId: task.id,
                data: {
                    content: task.content,
                    options
                }
            });
        });
    }

    /**
     * Parse on main thread with chunking
     */
    private async parseMainThread(task: ParseTask, options: ParseOptions): Promise<ParseResult> {
        const startTime = performance.now();

        // Import the actual parser
        const { parseQuestsFromMarkdown } = await import('../../features/quests/utils/taskParser');

        try {
            const quests = await parseQuestsFromMarkdown(task.content);
            const parseTime = performance.now() - startTime;

            return {
                quests,
                parseTime,
                usedWorker: false
            };
        } catch (error) {
            return {
                quests: [],
                parseTime: performance.now() - startTime,
                usedWorker: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }

    /**
     * Parse multiple files in parallel
     */
    async parseMultiple(tasks: ParseTask[]): Promise<ParseResult[]> {
        return Promise.all(tasks.map(task => this.parse(task)));
    }

    /**
     * Clean up workers
     */
    destroy(): void {
        console.log('[WorkerizedParser] Destroying workers...');

        // Clear pending tasks
        for (const [taskId, pending] of this.pendingTasks.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Parser destroyed'));
        }
        this.pendingTasks.clear();

        // Terminate workers
        for (const worker of this.workers) {
            worker.terminate();
        }
        this.workers = [];
        this.workerPool = [];
    }

    /**
     * Get worker pool status
     */
    getStatus(): {
        totalWorkers: number;
        availableWorkers: number;
        pendingTasks: number;
    } {
        return {
            totalWorkers: this.workers.length,
            availableWorkers: this.workerPool.length,
            pendingTasks: this.pendingTasks.size
        };
    }
}

// Export singleton instance
export const workerizedParser = WorkerizedParser.getInstance();

