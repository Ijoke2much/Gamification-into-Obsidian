import { App, Modal, Notice } from "obsidian";
import styles from "./AttachTaskModal.module.css";

export class AttachTaskModal extends Modal {
    onSelect: (task: {
        text: string;
        path: string;
        line: number;
        subtasks?: Array<{ completed: boolean; text: string }>;
        description?: string;
        dueDate?: string;
        tags?: string[];
        rewards?: { xp: number; coins: number; cp?: number; materials?: string[] };
        skills?: string[];
    }) => void;

    constructor(app: App, onSelect: (task: {
        text: string;
        path: string;
        line: number;
        subtasks?: Array<{ completed: boolean; text: string }>;
        description?: string;
        dueDate?: string;
        tags?: string[];
        rewards?: { xp: number; coins: number; cp?: number; materials?: string[] };
        skills?: string[];
    }) => void) {
        super(app);
        this.onSelect = onSelect;
    }

    async onOpen() {
        try {
            const { contentEl, modalEl } = this;

            // Clear any existing content
            contentEl.empty();

            // Ensure this modal has the highest z-index and proper styling
            if (modalEl) {
                modalEl.style.zIndex = "10001";
                modalEl.classList.add("pomodoro-attach-task-modal");
                modalEl.classList.add(styles.modal);

                // Ensure the modal is properly positioned
                modalEl.style.position = "fixed";
                modalEl.style.top = "50%";
                modalEl.style.left = "50%";
                modalEl.style.transform = "translate(-50%, -50%)";
                modalEl.style.background = "var(--background-primary)";
                modalEl.style.border = "1px solid var(--background-modifier-border)";
                modalEl.style.borderRadius = "8px";
                modalEl.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
                modalEl.style.minWidth = "400px";
                modalEl.style.maxWidth = "600px";
                modalEl.style.pointerEvents = "auto";
            }

            // Add title
            const titleEl = contentEl.createEl("h2", { text: "Attach Task to Pomodoro" });
            titleEl.addClass(styles.modalTitle);

            // Add description
            const descEl = contentEl.createEl("p", { text: "Select an unchecked gamified task (with #gamified-task tag) to attach to your current Pomodoro session:" });
            descEl.addClass(styles.modalDescription);

            // Create container for tasks
            const tasksContainer = contentEl.createEl("div");
            tasksContainer.addClass(styles.tasksContainer);

            try {
                // Get all markdown files
                const files = this.app.vault.getMarkdownFiles();
                const allTasks: Array<{
                    text: string;
                    path: string;
                    line: number;
                    subtasks?: Array<{ completed: boolean; text: string }>;
                    description?: string;
                    dueDate?: string;
                    tags?: string[];
                    rewards?: { xp: number; coins: number; cp?: number; materials?: string[] };
                    skills?: string[];
                }> = [];

                // Process each file to find tasks
                for (const file of files) {
                    try {
                        const content = await this.app.vault.read(file);
                        const lines = content.split('\n');

                        lines.forEach((line, index) => {
                            // Look for unchecked task patterns: - [ ] or * [ ] (not - [x] or * [x])
                            const uncheckedTaskMatch = line.match(/^[\s]*[-*][\s]*\[[\s]?\][\s]*(.+)$/);
                            if (uncheckedTaskMatch) {
                                const taskText = uncheckedTaskMatch[1].trim();
                                // Only include unchecked tasks that have the #gamified-task tag
                                if (taskText.includes('#gamified-task')) {
                                    // Extract additional information
                                    const subtasks: Array<{ completed: boolean; text: string }> = [];
                                    let description = '';
                                    let dueDate = '';
                                    const tags: string[] = [];
                                    let skills: string[] = [];
                                    const rewards: { xp: number; coins: number; cp?: number; materials?: string[] } = { xp: 0, coins: 0, materials: [] };

                                    // Extract rewards from the task text
                                    const xpMatch = taskText.match(/⭐(\d+)/);
                                    const coinsMatch = taskText.match(/✨(\d+)/);
                                    const cpMatch = taskText.match(/🪙(\d+)/);
                                    const materialMatch = taskText.match(/💎(\d+)/);
                                    const magicMatch = taskText.match(/🔮(\d+)/);
                                    const weaponMatch = taskText.match(/⚔️(\d+)/);
                                    const armorMatch = taskText.match(/🛡️(\d+)/);

                                    if (xpMatch) rewards.xp = parseInt(xpMatch[1]);
                                    if (coinsMatch) rewards.coins = parseInt(coinsMatch[1]);
                                    if (cpMatch) rewards.cp = parseInt(cpMatch[1]);

                                    // Add material rewards to tags for display
                                    if (materialMatch) {
                                        tags.push(`#material-${materialMatch[1]}`);
                                        if (!rewards.materials) rewards.materials = [];
                                        rewards.materials.push(`💎${materialMatch[1]} Materials`);
                                    }
                                    if (magicMatch) {
                                        tags.push(`#magic-${magicMatch[1]}`);
                                        if (!rewards.materials) rewards.materials = [];
                                        rewards.materials.push(`🔮${magicMatch[1]} Magic`);
                                    }
                                    if (weaponMatch) {
                                        tags.push(`#weapon-${weaponMatch[1]}`);
                                        if (!rewards.materials) rewards.materials = [];
                                        rewards.materials.push(`⚔️${weaponMatch[1]} Weapons`);
                                    }
                                    if (armorMatch) {
                                        tags.push(`#armor-${armorMatch[1]}`);
                                        if (!rewards.materials) rewards.materials = [];
                                        rewards.materials.push(`🛡️${armorMatch[1]} Armor`);
                                    }

                                    // Extract skills (🛠️Skill Name pattern)
                                    const skillMatches = taskText.match(/🛠️([^⭐✨🪙🔼🔄\s]+(?:\s+[^⭐✨🪙🔼🔄\s]+)*)/gu);
                                    if (skillMatches) {
                                        skills = skillMatches.map(skill => skill.replace('🛠️', '').trim());
                                    }

                                    // Extract quest type indicators
                                    const isTimedQuest = taskText.includes('🕐') || taskText.includes('⏰');
                                    const isRepeatable = taskText.includes('🔄');
                                    const isUpgradeable = taskText.includes('🔼');

                                    // Look for subtasks (indented tasks below this task)
                                    for (let i = index + 1; i < lines.length; i++) {
                                        const nextLine = lines[i];

                                        // Stop if we hit another main task (not indented)
                                        if (nextLine.match(/^[-*][\s]*\[/)) {
                                            break;
                                        }

                                        // Skip empty lines but continue processing
                                        if (nextLine.trim() === '') {
                                            continue;
                                        }

                                        // Check for indented subtasks
                                        const subtaskMatch = nextLine.match(/^[\s]+[-*][\s]*\[([x\s]?)\][\s]*(.+)$/);
                                        if (subtaskMatch) {
                                            subtasks.push({
                                                completed: subtaskMatch[1].trim() === 'x',
                                                text: subtaskMatch[2].trim()
                                            });
                                        }

                                        // Check for description (lines starting with >, //, or 💭)
                                        const descMatch = nextLine.match(/^[\s]*(?:>|\/\/|💭)[\s]*(.+)$/);
                                        if (descMatch) {
                                            description += (description ? ' ' : '') + descMatch[1].trim();
                                        }
                                    }

                                    // Extract due date from task text (📅 YYYY-MM-DD pattern)
                                    const dueDateMatch = taskText.match(/📅[\s]*(\d{4}-\d{2}-\d{2})/);
                                    if (dueDateMatch) {
                                        dueDate = dueDateMatch[1];
                                    }

                                    // Extract tags from task text
                                    const tagMatches = taskText.match(/#[\w-]+/g);
                                    if (tagMatches) {
                                        tags.push(...tagMatches);
                                    }

                                    // Add quest type tags
                                    if (isTimedQuest) tags.push('#timed-quest');
                                    if (isRepeatable) tags.push('#repeatable');
                                    if (isUpgradeable) tags.push('#upgradeable');

                                    // Debug logging
                                    console.log('Parsed quest:', {
                                        text: taskText,
                                        subtasks,
                                        description,
                                        dueDate,
                                        tags,
                                        rewards,
                                        skills
                                    });

                                    allTasks.push({
                                        text: taskText,
                                        path: file.path,
                                        line: index + 1,
                                        subtasks: subtasks.length > 0 ? subtasks : undefined,
                                        description: description || undefined,
                                        dueDate: dueDate || undefined,
                                        tags: tags.length > 0 ? tags : undefined,
                                        rewards: rewards,
                                        skills: skills.length > 0 ? skills : undefined
                                    });
                                }
                            }
                        });
                    } catch (error) {
                        console.warn(`Error reading file ${file.path}:`, error);
                    }
                }

                if (allTasks.length === 0) {
                    const noTasksEl = tasksContainer.createEl("p", { text: "No unchecked gamified tasks found. Add #gamified-task tag to your unchecked tasks to see them here." });
                    noTasksEl.addClass(styles.noTasksMessage);
                } else {
                    // Display tasks
                    allTasks.forEach((task) => {
                        const taskEl = tasksContainer.createEl("div", {
                            cls: styles.taskItem
                        });

                        const taskTextEl = taskEl.createEl("div", { text: task.text });
                        taskTextEl.addClass(styles.taskText);

                        const taskPathEl = taskEl.createEl("div", { text: `${task.path}:${task.line}` });
                        taskPathEl.addClass(styles.taskPath);

                        // Add click handler
                        taskEl.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.onSelect(task);
                            this.close();
                        });

                        // Add hover effect
                        taskEl.addEventListener('mouseenter', () => {
                            taskEl.addClass(styles.taskItemHover);
                        });

                        taskEl.addEventListener('mouseleave', () => {
                            taskEl.removeClass(styles.taskItemHover);
                        });
                    });
                }
            } catch (error) {
                console.error("Error loading tasks:", error);
                const errorEl = tasksContainer.createEl("p", { text: "Error loading tasks. Please try again." });
                errorEl.addClass(styles.errorMessage);
            }

            // Add close button
            const closeButton = contentEl.createEl("button", { text: "Cancel" });
            closeButton.addClass(styles.closeButton);
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            });

        } catch (error) {
            console.error("Error in AttachTaskModal onOpen:", error);
            new Notice("Error opening task selection modal");
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
