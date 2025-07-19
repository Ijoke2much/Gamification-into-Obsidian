// Utility functions for updating progress on quest completion
// Handles PlayerData, Skill, Class, MasterClass, and Stat updates
// TODO: Implement file I/O and YAML parsing logic

import * as yaml from "js-yaml";
import { TFile, Vault, Notice } from "obsidian";

/**
 * Reads a markdown file, parses YAML frontmatter, and returns { frontmatter, body, raw }.
 * @param vault Obsidian Vault instance
 * @param filePath Path to the markdown file
 */
export async function readYamlFrontmatter(
  vault: Vault,
  filePath: string
): Promise<{ frontmatter: Record<string, string | number | boolean | string[] | undefined>; body: string; raw: string }> {
  const file = vault.getAbstractFileByPath(filePath);
  if (!(file && file instanceof TFile)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = await vault.read(file);
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (match) {
    const frontmatter = (yaml.load(match[1]) || {}) as Record<string, string | number | boolean | string[] | undefined>;
    const body = match[2] || "";
    return { frontmatter, body, raw };
  } else {
    // No frontmatter, treat whole file as body
    return { frontmatter: {} as Record<string, string | number | boolean | string[] | undefined>, body: raw, raw };
  }
}

/**
 * Writes new YAML frontmatter to a markdown file, preserving the rest of the file.
 * @param vault Obsidian Vault instance
 * @param filePath Path to the markdown file
 * @param newFrontmatter Object to serialize as YAML frontmatter
 */
export async function writeYamlFrontmatter(
  vault: Vault,
  filePath: string,
  newFrontmatter: Record<string, string | number | boolean | string[] | undefined>
): Promise<void> {
  const file = vault.getAbstractFileByPath(filePath);
  if (!(file && file instanceof TFile)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = await vault.read(file);
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const yamlStr = yaml.dump(newFrontmatter, { lineWidth: 120 });
  let newContent: string;
  if (match) {
    // Replace existing frontmatter
    newContent = `---\n${yamlStr}---\n${match[2]}`;
  } else {
    // No frontmatter, prepend
    newContent = `---\n${yamlStr}---\n${raw}`;
  }
  await vault.modify(file, newContent);
}

/**
 * Resets the progress fields in the YAML frontmatter of a file.
 * Sets level: 1, currentCP: 0, totalCP: 0, leaves other fields unchanged.
 */
export async function resetProgressYaml(vault: Vault, filePath: string) {
  const { frontmatter } = await readYamlFrontmatter(vault, filePath);
  frontmatter.level = 1;
  frontmatter.currentCP = 0;
  frontmatter.totalCP = 0;
  await writeYamlFrontmatter(vault, filePath, frontmatter);
}

/**
 * Batch resets all YAML frontmatter for a given type in a folder.
 * @param vault Obsidian Vault instance
 * @param folderPath Folder containing the files to reset
 * @param type One of 'skill', 'class', 'master', 'stat'
 */
export async function resetYamlFrontmatterForType(
  vault: Vault,
  folderPath: string,
  type: 'skill' | 'class' | 'master' | 'stat'
) {
  // Get all files in the folder
  const files = vault.getFiles().filter(f => f.path.startsWith(folderPath) && f.extension === 'md');
  for (const file of files) {
    try {
      const { frontmatter } = await readYamlFrontmatter(vault, file.path);
      if (type === 'stat') {
        frontmatter.level = 1;
        frontmatter.value = 0;
        frontmatter.current = 0;
        frontmatter.required = calculateRequiredCP('stat', 1);
        if ('currentCP' in frontmatter) frontmatter.currentCP = 0;
        if ('totalCP' in frontmatter) frontmatter.totalCP = 0;
        if ('requiredCP' in frontmatter) frontmatter.requiredCP = calculateRequiredCP('stat', 1);
        // Remove XP fields if present
        if ('xp' in frontmatter) delete frontmatter.xp;
        if ('xpRequired' in frontmatter) delete frontmatter.xpRequired;
      } else {
        frontmatter.level = 1;
        frontmatter.currentCP = 0;
        frontmatter.totalCP = 0;
        frontmatter.requiredCP = calculateRequiredCP(type, 1);
      }
      await writeYamlFrontmatter(vault, file.path, frontmatter);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Could not reset file: ${file.path}`, e);
    }
  }
}

// --- Player Data Updater ---
export async function updatePlayerData(vault: Vault, xp: number, coins: number) {
  function getXpRequired(level: number): number {
    return level * level * 1000 - (level - 1) * (level - 1) * 1000;
  }
  try {
    console.log(`[updatePlayerData] Called with xp=${xp}, coins=${coins}`);
    const playerPath = 'SkillTree/PlayerData.md';
    const { frontmatter } = await readYamlFrontmatter(vault, playerPath);
    const before = { ...frontmatter };
    frontmatter.total_exp = (typeof frontmatter.total_exp === 'number' ? frontmatter.total_exp : Number(frontmatter.total_exp) || 0) + xp;
    frontmatter.xp = (typeof frontmatter.xp === 'number' ? frontmatter.xp : Number(frontmatter.xp) || 0) + xp;
    frontmatter.coins = (typeof frontmatter.coins === 'number' ? frontmatter.coins : Number(frontmatter.coins) || 0) + coins;
    let oldLevel = typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1;
    while ((typeof frontmatter.xp === 'number' ? frontmatter.xp : Number(frontmatter.xp) || 0) >= (typeof frontmatter.xpRequired === 'number' ? frontmatter.xpRequired : getXpRequired(oldLevel))) {
      frontmatter.xp = (typeof frontmatter.xp === 'number' ? frontmatter.xp : Number(frontmatter.xp) || 0) - (typeof frontmatter.xpRequired === 'number' ? frontmatter.xpRequired : getXpRequired(oldLevel));
      oldLevel = frontmatter.level = (typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1) + 1;
      frontmatter.xpRequired = getXpRequired(frontmatter.level as number);
      new Notice(`You leveled up! Now level ${frontmatter.level}!`);
    }
    if (!frontmatter.xpRequired || frontmatter.level !== undefined) {
      frontmatter.xpRequired = getXpRequired(typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1);
    }
    console.log(`[updatePlayerData] Before:`, before, `After:`, frontmatter);
    await writeYamlFrontmatter(vault, playerPath, frontmatter);
  } catch (err) {
    console.error(`[updatePlayerData] Error:`, err);
    throw err;
  }
}

// --- Skill Progress Updater ---
export async function updateSkillProgress(vault: Vault, skillPath: string, cp: number) {
  try {
    console.log(`[updateSkillProgress] Called with skillPath=${skillPath}, cp=${cp}`);
    const { frontmatter } = await readYamlFrontmatter(vault, skillPath);
    const before = { ...frontmatter };
    frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) + cp;
    let leveledUp = false;
    while ((typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) >= (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("skill", 1))) {
      frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) - (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("skill", 1));
      frontmatter.level = (typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1) + 1;
      frontmatter.requiredCP = calculateRequiredCP("skill", frontmatter.level as number);
      leveledUp = true;
    }
    console.log(`[updateSkillProgress] Before:`, before, `After:`, frontmatter);
    await writeYamlFrontmatter(vault, skillPath, frontmatter);
    new Notice(`Gained ${cp} CP for skill: ${frontmatter.name || skillPath}`);
    return leveledUp;
  } catch (err) {
    console.error(`[updateSkillProgress] Error:`, err);
    throw err;
  }
}

// --- Class Progress Updater ---
export async function updateClassProgress(vault: Vault, classPath: string, cp: number) {
  try {
    console.log(`[updateClassProgress] Called with classPath=${classPath}, cp=${cp}`);
    const { frontmatter } = await readYamlFrontmatter(vault, classPath);
    const before = { ...frontmatter };
    frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) + cp;
    let leveledUp = false;
    while ((typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) >= (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("class", 1))) {
      frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) - (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("class", 1));
      frontmatter.level = (typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1) + 1;
      frontmatter.requiredCP = calculateRequiredCP("class", frontmatter.level as number);
      leveledUp = true;
    }
    console.log(`[updateClassProgress] Before:`, before, `After:`, frontmatter);
    await writeYamlFrontmatter(vault, classPath, frontmatter);
    new Notice(`Gained ${cp} CP for class: ${frontmatter.name || classPath}`);
    return leveledUp;
  } catch (err) {
    console.error(`[updateClassProgress] Error:`, err);
    throw err;
  }
}

// --- Master Class Progress Updater ---
export async function updateMasterClassProgress(vault: Vault, masterClassPath: string, cp: number) {
  try {
    console.log(`[updateMasterClassProgress] Called with masterClassPath=${masterClassPath}, cp=${cp}`);
    const { frontmatter } = await readYamlFrontmatter(vault, masterClassPath);
    const before = { ...frontmatter };
    frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) + cp;
    let leveledUp = false;
    while ((typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) >= (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("master", 1))) {
      frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) - (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("master", 1));
      frontmatter.level = (typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1) + 1;
      frontmatter.requiredCP = calculateRequiredCP("master", frontmatter.level as number);
      leveledUp = true;
    }
    console.log(`[updateMasterClassProgress] Before:`, before, `After:`, frontmatter);
    await writeYamlFrontmatter(vault, masterClassPath, frontmatter);
    new Notice(`Gained ${cp} CP for master class: ${frontmatter.name || masterClassPath}`);
    return leveledUp;
  } catch (err) {
    console.error(`[updateMasterClassProgress] Error:`, err);
    throw err;
  }
}

// --- Stat Progress Updater ---
export async function updateStatProgress(vault: Vault, statPath: string, cp: number) {
  try {
    console.log(`[updateStatProgress] Called with statPath=${statPath}, cp=${cp}`);
    const { frontmatter } = await readYamlFrontmatter(vault, statPath);
    const before = { ...frontmatter };
    frontmatter.current = (typeof frontmatter.current === 'number' ? frontmatter.current : Number(frontmatter.current) || 0) + cp;
    let leveledUp = false;
    let required = (typeof frontmatter.required === 'number' ? frontmatter.required : Number(frontmatter.required) || calculateRequiredCP('stat', Number(frontmatter.level) || 1));
    let level = typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1;
    let value = typeof frontmatter.value === 'number' ? frontmatter.value : Number(frontmatter.value) || 0;
    while ((typeof frontmatter.current === 'number' ? frontmatter.current : Number(frontmatter.current) || 0) >= required) {
      frontmatter.current = (typeof frontmatter.current === 'number' ? frontmatter.current : Number(frontmatter.current) || 0) - required;
      level = level + 1;
      frontmatter.level = level;
      required = calculateRequiredCP('stat', level);
      frontmatter.required = required;
      value = value + 15;
      frontmatter.value = value;
      leveledUp = true;
      new Notice(`${frontmatter.name || statPath} leveled up! Now level ${level}!`);
    }
    console.log(`[updateStatProgress] Before:`, before, `After:`, frontmatter);
    await writeYamlFrontmatter(vault, statPath, frontmatter);
    new Notice(`Gained ${cp} CP for stat: ${frontmatter.name || statPath}`);
    return leveledUp;
  } catch (err) {
    console.error(`[updateStatProgress] Error:`, err);
    throw err;
  }
}

// --- Level-Up Calculator ---
export function calculateRequiredCP(type: "master" | "class" | "skill" | "stat", level: number): number {
  switch (type) {
    case "master":
      return 100 * level * level;
    case "class":
      return 50 * level * level;
    case "skill":
      return 20 * level * level;
    case "stat":
      return 10 * level * level;
    default:
      return 10 * level * level;
  }
} 