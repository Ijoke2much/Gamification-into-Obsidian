/**
 * Helper function to generate markdown task content with full support for descriptions
 */

import { SkillMetadata } from './taskParser';

export function generateTaskContent(taskData: {
    title: string;
    description?: string;
    subtasks: { text: string; completed: boolean; description?: string }[];
    skills: SkillMetadata[];
    priority: string;
    difficulty: string;
    xp: number;
    cp: number;
    due?: string;
    recur?: string;
    customRewards?: string[];
    metadataStyle?: "emoji" | "tags";
}): string {
    let content = `- [ ] ${taskData.title}\n`;

    // Add description if provided
    if (taskData.description && taskData.description.trim()) {
        content += `${taskData.description.trim()}\n`;
    }

    // Add metadata
    content += `[subtasks:: ${taskData.subtasks ? taskData.subtasks.length : 0}]\n`;

    const skillsStr = taskData.skills && taskData.skills.length > 0
        ? taskData.skills.map(s => s.name).join(', ')
        : '';
    content += `[skills:: ${skillsStr}]\n`;

    const rewardsStr = taskData.customRewards && taskData.customRewards.length > 0
        ? taskData.customRewards.join(', ')
        : '';
    content += `[rewards:: ${rewardsStr}]\n`;

    content += `[xp:: ${taskData.xp}]\n`;
    content += `[cp:: ${taskData.cp}]\n`;

    if (taskData.priority) content += `[priority:: ${taskData.priority}]\n`;
    if (taskData.difficulty) content += `[difficulty:: ${taskData.difficulty}]\n`;
    if (taskData.due) content += `[due:: ${taskData.due}]\n`;
    if (taskData.recur) content += `[recur:: ${taskData.recur}]\n`;

    // Add subtasks if any
    if (taskData.subtasks && taskData.subtasks.length > 0) {
        content += `\n`;
        taskData.subtasks.forEach((subtask) => {
            content += `  - [ ] ${subtask.text}`;
            if (subtask.description) {
                content += ` - ${subtask.description}`;
            }
            content += `\n`;
        });
    }

    return content;
}