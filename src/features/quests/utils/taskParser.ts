import { Vault, TFile } from 'obsidian';
import * as yaml from "js-yaml";


// define priority/difficulty XP logic and generate markdown tasks.

export interface ParsedTask {
  line: string;
  lineNumber: number;
  skill?: string;
  xp?: number;
  cp?: number;
  coins?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Parses a markdown file for completed tasks (lines starting with '- [x]'), extracting all gamification fields from tags, inline Dataview fields, or curly-brace metadata.
 * @param vault Obsidian Vault instance
 * @param file TFile to parse
 */
export async function parseCompletedTasks(vault: Vault, file: TFile): Promise<ParsedTask[]> {
  const content = await vault.read(file);
  const lines = content.split('\n');
  const completedTasks: ParsedTask[] = [];

  // --- Merge all metadata sources (priority: Dataview > curly > pipe) ---
  function getField(
    dataviewFields: Record<string, string>,
    curlyMeta: Record<string, unknown>,
    pipeMeta: Record<string, string>,
    key: string
  ): unknown {
    key = key.toLowerCase();
    if (dataviewFields[key] !== undefined) return dataviewFields[key];
    if (curlyMeta[key] !== undefined) return curlyMeta[key];
    if (pipeMeta[key] !== undefined) return pipeMeta[key];
    return undefined;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('- [x]')) {
      // --- Extract curly-brace metadata ---
      let curlyMeta: Record<string, unknown> = {};
      const curlyMatch = line.match(/\{([^}]+)\}/);
      if (curlyMatch) {
        try {
          const curly = curlyMatch[1]
            .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":') // keys to quoted
            .replace(/'([^']*)'/g, '"$1"'); // single to double quotes
          curlyMeta = JSON.parse(`{${curly}}`);
        } catch (e) {
          curlyMeta = {};
        }
      }

      // --- Extract inline Dataview fields ([field:: value]) ---
      const dataviewFields: Record<string, string> = {};
      const dvRegex = /\[([a-zA-Z0-9_-]+)::\s*([^\]]+)\]/g;
      let dvMatch;
      while ((dvMatch = dvRegex.exec(line)) !== null) {
        dataviewFields[dvMatch[1].toLowerCase()] = dvMatch[2].trim();
      }

      // --- Extract pipe-separated metadata (// ... | ... | ... ) ---
      const pipeMeta: Record<string, string> = {};
      const pipeMatch = line.match(/\/\/(.*)/);
      if (pipeMatch) {
        pipeMatch[1].split('|').forEach((pair) => {
          const [k, v] = pair.split(':').map((s) => s.trim());
          if (k && v) pipeMeta[k.toLowerCase()] = v;
        });
      }

      // --- Extract tags (e.g., #@writing, #skill/SkillName, #class/ClassName) ---
      const tagRegex = /#([\w/-]+)/g;
      let tagMatch;
      const tagsArr: string[] = [];
      while ((tagMatch = tagRegex.exec(line)) !== null) {
        tagsArr.push(tagMatch[1]);
      }
      // Try to extract skill and class from tags
      let skill: string | undefined = undefined;
      let className: string | undefined = undefined;
      tagsArr.forEach((tag) => {
        if (tag.startsWith('skill/')) skill = tag.replace('skill/', '');
        if (tag.startsWith('class/')) className = tag.replace('class/', '');
      });

      // --- Parse all gamification fields ---
      const xp = getField(dataviewFields, curlyMeta, pipeMeta, 'xp') !== undefined ? Number(getField(dataviewFields, curlyMeta, pipeMeta, 'xp')) : 0;
      const cp = getField(dataviewFields, curlyMeta, pipeMeta, 'cp') !== undefined ? Number(getField(dataviewFields, curlyMeta, pipeMeta, 'cp')) : 0;
      let coins = getField(dataviewFields, curlyMeta, pipeMeta, 'coins') !== undefined ? Number(getField(dataviewFields, curlyMeta, pipeMeta, 'coins')) : undefined;
      if ((coins === undefined || isNaN(coins)) && typeof xp === 'number') {
        coins = Math.round(xp * 0.1);
      }
      const priority = getField(dataviewFields, curlyMeta, pipeMeta, 'priority') as string | number | boolean | undefined;
      const difficulty = getField(dataviewFields, curlyMeta, pipeMeta, 'difficulty');
      const due = getField(dataviewFields, curlyMeta, pipeMeta, 'due');
      const recur = getField(dataviewFields, curlyMeta, pipeMeta, 'recur');
      const description = getField(dataviewFields, curlyMeta, pipeMeta, 'description');
      // Skills and stats: support comma-separated or array
      let skillsArr: string[] = [];
      const skillsRaw = getField(dataviewFields, curlyMeta, pipeMeta, 'skills');
      if (Array.isArray(skillsRaw)) {
        skillsArr = skillsRaw.map((s: unknown) => String(s).trim());
      } else if (typeof skillsRaw === 'string') {
        skillsArr = skillsRaw.split(',').map((s: string) => s.trim());
      }
      let statsArr: string[] = [];
      const statsRaw = getField(dataviewFields, curlyMeta, pipeMeta, 'stats');
      if (Array.isArray(statsRaw)) {
        statsArr = statsRaw.map((s: unknown) => String(s).trim());
      } else if (typeof statsRaw === 'string') {
        statsArr = statsRaw.split(',').map((s: string) => s.trim());
      }

      completedTasks.push({
        line,
        lineNumber: i + 1,
        skill,
        className,
        xp,
        cp,
        coins, // ensure coins is included and always defined
        priority,
        difficulty: difficulty as string | number | boolean | undefined,
        due: due as string | number | boolean | undefined,
        recur: recur as string | number | boolean | undefined,
        description: description as string | number | boolean | undefined,
        skills: skillsArr.join(', '),
        stats: statsArr.join(', '),
        tags: tagsArr.join(', '),
        // Optionally, keep the arrays for internal use (not in ParsedTask interface):
        // _skillsArr: skillsArr,
        // _statsArr: statsArr,
        // _tagsArr: tagsArr,
      });
    }
  }
  return completedTasks;
}

/**
 * Generates a markdown task string for insertion into a note.
 * @param taskData Object containing title, skill, class, stats, xp, coins, etc.
 */
function sanitizeForClassName(value: string): string {
  return value ? value.replace(/\s+/g, '-') : '';
}

export interface SkillMetadata {
  name: string;
  class: string;
  stats?: Record<string, number>;
}

export type MetadataStyle = 'emoji' | 'tags';

export function generateMarkdownTask({
  title,
  description,
  subtasks,
  skills,
  priority,
  difficulty,
  xp,
  cp,
  due,
  recur,
  customRewards,
  metadataStyle = "emoji",
}: {
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
  if (metadataStyle === 'emoji') {
    // Emoji-based inline metadata
    // Always include CP, XP, and coins (rounded, 10% of XP)
    const emojiParts: string[] = [];
    if (typeof cp === 'number') emojiParts.push(`⭐${cp}`);
    if (typeof xp === 'number') emojiParts.push(`✨${xp}`);
    const coinsVal = Math.round((typeof xp === 'number' ? xp : 0) * 0.1);
    emojiParts.push(`🪙${coinsVal}`);
    // Use Tasks plugin compatible priority emojis
    if (priority) {
      const priorityToEmoji: Record<string, string> = {
        'highest': '🔺',
        'high': '⏫',
        'medium': '🔼',
        'low': '🔽',
        'lowest': '⏬'
      };
      const emoji = priorityToEmoji[priority.toLowerCase()] || '🔼';
      emojiParts.push(emoji);
    }
    // Add difficulty as separate metadata (not as priority emoji)
    if (difficulty) {
      // Use difficulty-specific emojis that won't conflict with priority
      const difficultyToEmoji: Record<string, string> = {
        'hard': '🔥', // fire for hard
        'medium': '⚖️', // balance for medium  
        'easy': '🌱' // seedling for easy
      };
      const emoji = difficultyToEmoji[difficulty.toLowerCase()] || '⚖️';
      emojiParts.push(emoji);
    }
    // Place date last, no space after emoji
    if (due) emojiParts.push(`📅${due}`);
    // Tags for skill and class
    const skill = skills[0]?.name || '';
    const className = skills[0]?.class || '';
    const tags = [`#gamified-task`, `#skill/${skill}`, `#class/${className}`];
    let taskLine = `- [ ] ${title} ${emojiParts.join(' ')} ${tags.join(' ')}`.replace(/  +/g, ' ').trim();

    // Add custom rewards as metadata comment if present
    if (customRewards && customRewards.length > 0) {
      taskLine += ` // rewards: ${customRewards.join(', ')}`;
    }

    // Add description if provided - with better formatting
    if (description && description.trim()) {
      taskLine += `\n  💭 ${description.trim()}`;
    }

    // Add subtasks if any
    if (subtasks && subtasks.length > 0) {
      taskLine += `\n`;
      subtasks.forEach((subtask) => {
        taskLine += `  - [ ] ${subtask.text}`;
        if (subtask.description) {
          taskLine += ` - ${subtask.description}`;
        }
        taskLine += `\n`;
      });
    }

    return taskLine;
  } else {
    // Tags for skill and class
    const skill = skills[0]?.name || '';
    const className = skills[0]?.class || '';
    const tags = [`#gamified-task`, `#skill/${skill}`, `#class/${className}`];
    if (priority) tags.push(`#priority/${sanitizeForClassName(priority)}`);
    if (difficulty) tags.push(`#difficulty/${sanitizeForClassName(difficulty)}`);
    // Stat display
    const stats = skills.find(s => s.stats)?.stats ? Object.keys(skills.find(s => s.stats)!.stats!) : [];
    const statLine = stats.length ? `  - Stats:: ${stats.join(', ')}` : '';
    const rewardsLine = customRewards && customRewards.length ? `  - Rewards:: ${customRewards.join(', ')}` : '';
    const descriptionLine = description && description.trim() ? `  - Description:: ${description.trim()}` : '';

    const result = [
      `- [ ] ${title} ${tags.join(' ')}`,
      descriptionLine ? `  💭 ${description}` : '',
      `  - XP:: ${xp}`,
      `  - CP:: ${cp}`,
      `  - Coins:: ${Math.round(xp * 0.1)}`,
      statLine,
      rewardsLine
    ].filter(Boolean).join('\n');

    // Add subtasks if any
    if (subtasks && subtasks.length > 0) {
      const subtaskLines = subtasks.map(subtask => {
        let line = `  - [ ] ${subtask.text}`;
        if (subtask.description) {
          line += ` - ${subtask.description}`;
        }
        return line;
      });
      return result + '\n' + subtaskLines.join('\n');
    }

    return result;
  }
}

// --- Quest Data Model ---
export interface Subtask {
  text: string;
  completed: boolean;
  description?: string;
}

export interface Quest {
  id: string;
  title: string;
  className: string;
  stats: string[];
  xp: number;
  cp: number;
  coins: number; // 10% of xp
  priority?: string;
  difficulty?: string;
  due?: string;
  recur?: string;
  skills?: string[];
  description?: string;
  subtasks: { text: string; completed: boolean; description?: string }[];
  completed: boolean;
  today?: boolean;
  dependencies?: string[];
  rewards?: string[];
  type?: string;
  giver?: string;
  status?: string;
  tags?: string[]; // all tags found
  isFavorite?: boolean;
  createdDate?: string;
  lastModified?: string;
  estimatedTime?: string;
  notes?: string;
  // Boss system properties
  bossId?: string;
  bossProgress?: {
    currentHP: number;
    maxHP: number;
    phase: number;
    lastUpdated: Date;
    isActive: boolean;
  };
  // Advanced quest system properties
  completedAt?: Date;
  lineNumber?: number;
  templateId?: string;
  sharedQuestId?: string;
  totalXP?: number;
  totalCP?: number;
}

// --- Quest Parsing Utility ---
/**
 * Parses quests from the GamifiedTasks.md file. Supports YAML frontmatter, inline, curly, pipe, and tag-based metadata.
 * Extracts metadata, subtasks, completion state, and extended fields.
 * @param markdown The contents of GamifiedTasks.md
 * @returns Quest[]
 */
export function parseQuestsFromMarkdown(md: string): Quest[] {
  const lines = md.split("\n");
  const quests: Quest[] = [];
  let globalYaml: Record<string, unknown> = {};
  let i = 0;

  // --- Parse YAML frontmatter if present at the top ---
  if (lines[0].trim() === '---') {
    let yamlEnd = 1;
    while (yamlEnd < lines.length && lines[yamlEnd].trim() !== '---') yamlEnd++;
    if (yamlEnd < lines.length) {
      try {
        globalYaml = yaml.load(lines.slice(1, yamlEnd).join('\n')) as Record<string, unknown>;
      } catch (e) {
        globalYaml = {};
      }
      i = yamlEnd + 1;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("- [")) {
      // --- Main quest line: match #gamified-task, inline, curly, pipe, and tags ---
      const mainMatch = line.match(/- \[( |x)\] (.+?) #gamified-task(.*)/);
      if (mainMatch) {
        const [, checked, title, afterTask] = mainMatch;
        const meta: Record<string, string> = {};
        let curlyMeta: Record<string, unknown> = {};
        let pipeMetaStr = '';
        const tagArr: string[] = [];
        const tagFields: Record<string, string> = {};
        let yamlMeta: Record<string, unknown> = {};

        // --- Helper to get field from all sources (priority: YAML > curly > pipe > tag > global YAML)
        const getField = (key: string): unknown => {
          key = key.toLowerCase();
          if (yamlMeta[key] !== undefined) return yamlMeta[key];
          if (curlyMeta[key] !== undefined) return curlyMeta[key];
          if (meta[key] !== undefined) return meta[key];
          if (tagFields[key] !== undefined) return tagFields[key];
          if (globalYaml[key] !== undefined) return globalYaml[key];
          return undefined;
        };

        // --- Extract tags from the line ---
        const tagRegex = /#([\w/-]+)/g;
        let tagMatch;
        while ((tagMatch = tagRegex.exec(line)) !== null) {
          tagArr.push(tagMatch[1]);
          // Tag-based metadata: #priority/high, #difficulty/3, #type/main, #status/active, #depends/quest1
          const [tagKey, tagVal] = tagMatch[1].split('/');
          if (tagVal) tagFields[tagKey.toLowerCase()] = tagVal;
        }

        // --- Extract emoji-based metadata from the line and merge into meta ---
        const emojiMeta = parseEmojiMetadata(line);
        Object.assign(meta, emojiMeta);

        // --- Extract inline metadata (// ... | ... | ... ) and curly-brace metadata ---
        const pipeMatch = afterTask.match(/\/\/(.*)/);
        if (pipeMatch) {
          pipeMetaStr = pipeMatch[1];
          // Remove curly-brace part if present
          const curlyMatch = pipeMetaStr.match(/\{([\s\S]+)\}$/);
          if (curlyMatch) {
            try {
              const curly = curlyMatch[1]
                .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":')
                .replace(/'([^']*)'/g, '"$1"');
              curlyMeta = JSON.parse(`{${curly}}`);
            } catch (e) {
              curlyMeta = {};
            }
            pipeMetaStr = pipeMetaStr.replace(/\{[\s\S]+\}$/, "");
          }
          pipeMetaStr.split("|").forEach((pair) => {
            const [k, v] = pair.split(":").map((s) => s.trim());
            if (k && v) meta[k.toLowerCase()] = v;
          });
        }

        // --- Check for YAML block above the quest line ---
        if (i > 0 && lines[i - 1].trim() === '---') {
          // Find start of YAML block
          let yamlStart = i - 2;
          while (yamlStart >= 0 && lines[yamlStart].trim() !== '---') yamlStart--;
          if (yamlStart >= 0) {
            try {
              yamlMeta = yaml.load(lines.slice(yamlStart + 1, i - 1).join('\n')) as Record<string, unknown>;
            } catch (e) {
              yamlMeta = {};
            }
          }
        }

        // --- Clean title by removing emoji metadata ---
        const cleanTitle = title
          .replace(/📅\d{4}-\d{2}-\d{2}/g, '') // Remove date emojis
          .replace(/[🔺⏫🔼🔽⏬]/gu, '') // Remove all Tasks plugin priority emojis
          .replace(/💰\d+/g, '') // Remove coins
          .replace(/⭐\d+/g, '') // Remove XP
          .replace(/🧠\d+/g, '') // Remove CP
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        // --- Extract quest data ---
        const xp = parseInt(String(getField('xp') || '0'));
        const cp = parseInt(String(getField('cp') || '0')); // Add CP parsing
        const className = String(getField('class') || '');
        const stats = String(getField('stats') || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const priority = String(getField('priority') || '');
        const difficulty = String(getField('difficulty') || '');
        const due = String(getField('due') || '');
        const recur = String(getField('recur') || '');
        const skills = String(getField('skills') || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const description = String(getField('description') || '');
        const dependencies = String(getField('depends') || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const rewards = String(getField('rewards') || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const type = String(getField('type') || '');
        const giver = String(getField('giver') || '');
        const status = String(getField('status') || '');
        const isFavorite = Boolean(getField('favorite') || getField('starred') || false);
        const createdDate = String(getField('created') || '');
        const lastModified = String(getField('modified') || '');
        const estimatedTime = String(getField('time') || getField('estimate') || '');
        const notes = String(getField('notes') || '');

        // --- Parse description and subtasks ---
        const subtasks: { text: string; completed: boolean; description?: string }[] = [];
        let questDescription = description as string;
        let j = i + 1;

        // Check for description line immediately after quest (starts with 💭 or indented description)
        if (j < lines.length) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('💭')) {
            questDescription = nextLine.replace(/^💭\s*/, '');
            j++;
          } else if (nextLine && !nextLine.startsWith('-') && !nextLine.startsWith('  -')) {
            // Plain description line
            questDescription = nextLine;
            j++;
          }
        }

        while (j < lines.length) {
          const line = lines[j];
          // Check for subtasks with proper indentation (at least 2 spaces or 1 tab)
          if (line.match(/^(\s{2,}|\t+)- \[( |x)\]/)) {
            const subtaskMatch = line.match(/^(\s{2,}|\t+)- \[( |x)\] (.+)/);
            if (subtaskMatch) {
              const [, , subtaskChecked, subtaskText] = subtaskMatch;
              // Check if there's a description after " - "
              const parts = subtaskText.trim().split(' - ');
              subtasks.push({
                text: parts[0].trim(),
                completed: subtaskChecked === 'x',
                description: parts.length > 1 ? parts.slice(1).join(' - ').trim() : undefined
              });
            }
            j++;
          } else if (line.trim() === '' || line.match(/^(\s{2,}|\t+)/)) {
            // Skip empty lines or other indented content (like nested subtasks)
            j++;
          } else {
            // Hit a non-indented line, stop parsing subtasks
            break;
          }
        }
        i = j - 1;

        // --- Create quest object ---
        quests.push({
          id: cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          title: cleanTitle,
          className,
          stats,
          xp,
          cp, // Add CP to quest object
          coins: Math.round(xp * 0.1), // Calculate coins as 10% of XP
          priority,
          difficulty,
          due,
          recur,
          skills,
          description: questDescription || description, // Use parsed description if available
          subtasks,
          completed: checked === 'x',
          dependencies,
          rewards,
          type,
          giver,
          status,
          tags: tagArr,
          isFavorite,
          createdDate,
          lastModified,
          estimatedTime,
          notes,
        });
      }
    }
    i++;
  }
  return quests;
}

// Emoji to field mapping for gamified tasks - compatible with Tasks plugin
const EMOJI_FIELD_MAP: Record<string, string> = {
  '🛫': 'start',
  '📅': 'due',
  '🔺': 'priority', // Tasks plugin: highest priority
  '⏫': 'priority', // Tasks plugin: high priority
  '🔼': 'priority', // Tasks plugin: medium priority  
  '🔽': 'priority', // Tasks plugin: low priority
  '⏬': 'priority', // Tasks plugin: lowest priority
  '🔁': 'recurrence',
  '✨': 'xp',
  '🪙': 'coins',
  '⭐': 'cp', // Added mapping for CP
  '🔥': 'difficulty', // Hard difficulty
  '⚖️': 'difficulty', // Medium difficulty
  '🌱': 'difficulty', // Easy difficulty
  // Add more as needed
};

// Helper to extract emoji-based metadata from a task line
function parseEmojiMetadata(line: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Regex to match emoji followed by value (word, date, or bracketed field), with Unicode flag
  const emojiRegex = /([🛫📅🔺⏫🔼🔽⏬🔁✨🪙⭐🔥🌱]|⚖️)\s*(\[[^\]]+\]|\S+)/gu;
  let match;
  while ((match = emojiRegex.exec(line)) !== null) {
    const emoji = match[1];
    let value = match[2].trim();
    // Remove brackets for Dataview-style fields
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1);
    }
    const field = EMOJI_FIELD_MAP[emoji];
    if (field) {
      result[field] = value;
    }
  }

  // --- Extract priority symbols (standalone emojis without values) - Tasks plugin compatible ---
  if (line.includes('🔺')) {
    result['priority'] = 'highest';
  } else if (line.includes('⏫')) {
    result['priority'] = 'high';
  } else if (line.includes('🔼')) {
    result['priority'] = 'medium';
  } else if (line.includes('🔽')) {
    result['priority'] = 'low';
  } else if (line.includes('⏬')) {
    result['priority'] = 'lowest';
  }

  // --- Extract difficulty symbols (standalone emojis without values) ---
  if (line.includes('🔥')) {
    result['difficulty'] = 'hard';
  } else if (line.includes('⚖️')) {
    result['difficulty'] = 'medium';
  } else if (line.includes('🌱')) {
    result['difficulty'] = 'easy';
  }

  // --- Extract skill from 🛠️SkillName pattern if present ---
  const skillEmojiRegex = /🛠️\s*([\w\s-]+)/u;
  const skillMatch = line.match(skillEmojiRegex);
  if (skillMatch) {
    // Only add if not already present
    if (!result["skills"]) {
      result["skills"] = skillMatch[1].trim();
    }
  }

  // Note: Stats are now automatically updated by skills, so no manual stats parsing needed
  return result;
}

// This takes a line of text and returns a ParsedTask object for the pomodoro tab
export function parseTaskLine(line: string): ParsedTask {
  const task: ParsedTask = {
    line: line.trim(),
    lineNumber: -1,
  };

  // XP ✨
  const xpMatch = line.match(/✨(\d+)/);
  if (xpMatch) task.xp = parseInt(xpMatch[1]);

  // CP ⭐
  const cpMatch = line.match(/⭐(\d+)/);
  if (cpMatch) task.cp = parseInt(cpMatch[1]);

  // Coins 💰
  const coinsMatch = line.match(/💰(\d+)/);
  if (coinsMatch) task.coins = parseInt(coinsMatch[1]);

  // Skill (🛠️<Skill>)
  const skillMatch = line.match(/🛠️(\w+)/);
  if (skillMatch) task.skill = skillMatch[1];

  // Note: Stats are now automatically updated by skills, so no manual stats parsing needed

  return task;
}
