import { Vault, TFile } from 'obsidian';
import * as yaml from "js-yaml";

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
        statsArr = statsRaw.map((s: any) => String(s).trim());
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

export type MetadataStyle = 'emoji' | 'tags';

export function generateMarkdownTask({
  title,
  skill,
  className,
  stats,
  xp,
  cp,
  coins,
  priority,
  difficulty,
  due,
  metadataStyle = 'tags',
}: {
  title: string;
  skill: string;
  className: string;
  stats: string[];
  xp: number;
  cp: number;
  coins: number;
  priority?: string;
  difficulty?: string;
  due?: string;
  metadataStyle?: MetadataStyle;
}): string {
  if (metadataStyle === 'emoji') {
    // Emoji-based inline metadata
    // Always include CP, XP, and coins (rounded, 10% of XP)
    const emojiParts: string[] = [];
    if (typeof cp === 'number') emojiParts.push(`⭐${cp}`);
    if (typeof xp === 'number') emojiParts.push(`✨${xp}`);
    const coinsVal = Math.round((typeof xp === 'number' ? xp : 0) * 0.1);
    emojiParts.push(`🪙${coinsVal}`);
    if (priority) emojiParts.push(`🔺[${priority}]`);
    if (difficulty) emojiParts.push(`🔁[${difficulty}]`);
    // Place date last, no space after emoji
    if (due) emojiParts.push(`📅${due}`);
    // Tags for skill and class
    const tags = [`#gamified-task`, `#skill/${skill}`, `#class/${className}`];
    return `- [ ] ${title} ${emojiParts.join(' ')} ${tags.join(' ')}`.replace(/  +/g, ' ').trim();
  } else {
  // Tags for skill and class
  const tags = [`#gamified-task`, `#skill/${skill}`, `#class/${className}`];
    if (priority) tags.push(`#priority/${sanitizeForClassName(priority)}`);
    if (difficulty) tags.push(`#difficulty/${sanitizeForClassName(difficulty)}`);
  // Stat display
  const statLine = stats && stats.length ? `- Stat:: ${stats.join(', ')}` : '';
  return [
    `- [ ] ${title} ${tags.join(' ')}`,
    `  - XP:: ${xp}`,
    `  - Coins:: ${coins}`,
    statLine
  ].filter(Boolean).join('\n');
  }
}

// --- Quest Data Model ---
export interface Subtask {
  text: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  className: string;
  stats: string[];
  xp: number;
  cp: number;
  coins: number; // ensure coins is always present
  priority?: string;
  difficulty?: string;
  due?: string;
  recur?: string;
  skills?: string[];
  description?: string;
  subtasks: { text: string; completed: boolean }[];
  completed: boolean;
  today?: boolean;
  dependencies?: string[];
  rewards?: string[];
  type?: string;
  giver?: string;
  status?: string;
  tags?: string[]; // all tags found
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
  let globalYaml: Record<string, any> = {};
	let i = 0;

  // --- Parse YAML frontmatter if present at the top ---
  if (lines[0].trim() === '---') {
    let yamlEnd = 1;
    while (yamlEnd < lines.length && lines[yamlEnd].trim() !== '---') yamlEnd++;
    if (yamlEnd < lines.length) {
      try {
        globalYaml = yaml.load(lines.slice(1, yamlEnd).join('\n')) as Record<string, any>;
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
        let yamlMeta: Record<string, any> = {};

        // --- Helper to get field from all sources (priority: YAML > curly > pipe > tag > global YAML)
        const getField = (key: string): any => {
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
              yamlMeta = yaml.load(lines.slice(yamlStart + 1, i - 1).join('\n')) as Record<string, any>;
            } catch (e) {
              yamlMeta = {};
            }
          }
        }

        // --- Parse all gamification fields (define at top for use in both objects) ---
        const xp = getField('xp') !== undefined ? Number(getField('xp')) : 0;
        const cp = getField('cp') !== undefined ? Number(getField('cp')) : 0;
        let coins = getField('coins') !== undefined ? Number(getField('coins')) : undefined;
        if ((coins === undefined || isNaN(coins)) && typeof xp === 'number') {
          coins = Math.round(xp * 0.1);
        }
        // --- Skills ---
        let skills: string[] = [];
        const skillsRaw = getField('skills');
        if (Array.isArray(skillsRaw)) {
          skills = skillsRaw.map((s: any) => String(s).trim());
        } else if (typeof skillsRaw === 'string') {
          skills = skillsRaw.split(',').map((s: string) => s.trim());
        }
        // If still empty, check for skill in emoji metadata (🛠️SkillName)
        if (skills.length === 0 && meta["skills"]) {
          skills = [meta["skills"]];
        }
        // --- Class ---
        // const className = getField('class') || '';
        // --- Main skill (for completedTasks) ---
        // const skill = skills.length > 0 ? skills[0] : '';

        // --- Stats ---
        let stats: string[] = [];
        const statsRaw = getField('stats');
        if (Array.isArray(statsRaw)) {
          stats = statsRaw.map((s: any) => String(s).trim());
        } else if (typeof statsRaw === 'string') {
          stats = statsRaw.split(',').map((s: string) => s.trim());
        }

        // --- Dependencies ---
        let dependencies: string[] = [];
        const depRaw = getField('dependencies') || getField('depends');
        if (Array.isArray(depRaw)) {
          dependencies = depRaw.map((d: unknown) => String(d).trim());
        } else if (typeof depRaw === 'string') {
          dependencies = depRaw.split(',').map((d: string) => d.trim());
        } else if (tagFields['depends']) {
          dependencies = [tagFields['depends']];
        }

        // --- Rewards ---
        let rewards: string[] = [];
        const rewardsRaw = getField('rewards');
        if (Array.isArray(rewardsRaw)) {
          rewards = (rewardsRaw as unknown[]).map((r) => String(r).trim());
        } else if (typeof rewardsRaw === 'string') {
          rewards = rewardsRaw.split(',').map((r: string) => r.trim());
        }

        // --- Subtasks ---
				const subtasks = [];
				let j = i + 1;
				while (j < lines.length && lines[j].trim().startsWith("- [")) {
					const sub = lines[j].trim();
					const subMatch = sub.match(/- \[( |x)\] (.+?)(?: ✅ (\d{4}-\d{2}-\d{2}))?$/);
					if (subMatch) {
						subtasks.push({
							text: subMatch[2],
							completed: subMatch[1] === "x",
						});
					}
					j++;
				}

        const priority = getField('priority');
        const difficulty = getField('difficulty');
        const due = getField('due');
        const recur = getField('recur');
        const description = getField('description');

        // --- Quest object ---
        const quest: Quest = {
					id: `${title}-${i}`,
					title,
          className: getField('class') || '',
					stats,
          xp,
          cp,
          coins: coins !== undefined ? coins : 0,
          priority,
          difficulty,
          due,
          recur,
					skills,
          description,
					subtasks,
          completed: checked === 'x',
          today: getField('special') === 'today',
          dependencies,
          rewards,
          type: getField('type'),
          giver: getField('giver'),
          status: getField('status'),
          tags: tagArr,
        };
        quests.push(quest);
				i = j - 1;
			}
		}
		i++;
	}
	return quests;
}

// Emoji to field mapping for gamified tasks
const EMOJI_FIELD_MAP: Record<string, string> = {
  '🛫': 'start',
  '📅': 'due',
  '🔺': 'priority',
  '🔁': 'recurrence',
  '✨': 'xp',
  '🪙': 'coins',
  '⭐': 'cp', // Added mapping for CP
  // Add more as needed
};

// Helper to extract emoji-based metadata from a task line
function parseEmojiMetadata(line: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Regex to match emoji followed by value (word, date, or bracketed field), with Unicode flag
  const emojiRegex = /([🛫📅🔺🔁✨🪙⭐])\s*(\[[^\]]+\]|\S+)/gu;
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
  // --- Extract skill from 🛠️SkillName pattern if present ---
  const skillEmojiRegex = /🛠️\s*([\w\s-]+)/u;
  const skillMatch = line.match(skillEmojiRegex);
  if (skillMatch) {
    // Only add if not already present
    if (!result["skills"]) {
      result["skills"] = skillMatch[1].trim();
    }
  }
  return result;
} 