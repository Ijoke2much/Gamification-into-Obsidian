// Utility functions for updating progress on quest completion
// Handles PlayerData, Skill, Class, MasterClass, and Stat updates
// TODO: Implement file I/O and YAML parsing logic

import * as yaml from "js-yaml";
import { TFile, Vault, Notice } from "obsidian";
import matter from "gray-matter";

// Types for dynamic PlayerData fields
interface RewardDebuff {
  type?: string;
  multiplier?: number;
  expiresAt?: string;
}

// Debug functions removed for production - use Obsidian developer tools if needed

// --- Level-Up Calculator (moved to top) ---
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
 * Recursively sanitizes a value for YAML serialization:
 * - Removes object properties with undefined values
 * - Filters out undefined items from arrays
 * - Converts Date to ISO string
 * - Converts NaN/Infinity to 0
 * - Leaves primitives and plain objects intact
 */
export function sanitizeForYaml(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const vType = typeof value;
  if (vType === 'number') {
    if (!Number.isFinite(value as number) || Number.isNaN(value as number)) return 0;
    return value;
  }
  if (vType === 'string' || vType === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const arr: unknown[] = [];
    for (const item of value) {
      const sanitized = sanitizeForYaml(item);
      if (sanitized !== undefined) arr.push(sanitized);
    }
    return arr;
  }

  if (vType === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = sanitizeForYaml(v);
      if (sanitized !== undefined) obj[k] = sanitized;
    }
    return obj;
  }

  // Functions/symbols/others are not serializable
  return undefined;
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
  newFrontmatter: Record<string, unknown>
): Promise<void> {
  const file = vault.getAbstractFileByPath(filePath);
  if (!(file && file instanceof TFile)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = await vault.read(file);
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const sanitized = sanitizeForYaml(newFrontmatter);
  const yamlStr = yaml.dump(sanitized, { lineWidth: 120, skipInvalid: true });
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
  // Notify UI that stats changed
  document.dispatchEvent(new Event('stats-updated'));
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
        // Don't set current and required fields for stats to avoid showing progress bar
        if ('current' in frontmatter) delete frontmatter.current;
        if ('required' in frontmatter) delete frontmatter.required;
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
        // Remove XP fields if present
        if ('xp' in frontmatter) delete frontmatter.xp;
        if ('xpRequired' in frontmatter) delete frontmatter.xpRequired;
      }
      await writeYamlFrontmatter(vault, file.path, frontmatter);
    } catch (error) {
      console.error(`Error resetting ${file.path}:`, error);
    }
  }
  // Notify UI after batch reset
  document.dispatchEvent(new Event('stats-updated'));
}

export async function updatePlayerData(vault: Vault, xp: number, coins: number, cp: number = 0) {
  function getXpRequired(level: number): number {
    return level * level * 1000 - (level - 1) * (level - 1) * 1000;
  }
  try {
    const playerPath = 'SkillTree/PlayerData.md';
    const { frontmatter } = await readYamlFrontmatter(vault, playerPath);

    // 1) Remove expired debuffs and compute active multipliers
    const now = Date.now();
    type MutableFM = Record<string, unknown>;
    const fm = frontmatter as MutableFM;
    let debuffs: RewardDebuff[] = Array.isArray(fm.debuffs) ? (fm.debuffs as RewardDebuff[]) : [];
    debuffs = debuffs.filter((d: RewardDebuff) => {
      if (!d || !d.expiresAt) return true;
      const t = Date.parse(String(d.expiresAt));
      return isNaN(t) || t > now;
    });
    fm.debuffs = debuffs;

    // 1b) Remove expired buffs and compute active multipliers
    let buffs: RewardDebuff[] = Array.isArray((fm as Record<string, unknown>).buffs as RewardDebuff[] | undefined)
      ? (((fm as Record<string, unknown>).buffs as RewardDebuff[]))
      : [];
    buffs = buffs.filter((b: RewardDebuff) => {
      if (!b || !b.expiresAt) return true;
      const t = Date.parse(String(b.expiresAt));
      return isNaN(t) || t > now;
    });
    (fm as Record<string, unknown>).buffs = buffs as unknown as string[];

    // Determine if energy is zero by locating the Energy stat file
    let energyIsZero = false;
    try {
      const energyPath = await findStatPath(vault, 'Energy');
      if (energyPath) {
        const { frontmatter: energyFM } = await readYamlFrontmatter(vault, energyPath);
        const energyVal = Number((energyFM.value as number | string | undefined) ?? 0);
        energyIsZero = energyVal <= 0;
      }
    } catch {
      // Energy stat not found or error reading - continue with energyIsZero = false
    }

    const computeDebuffMultiplier = (kind: 'xp' | 'coins' | 'cp') => {
      // Per rule: no reductions unless energy is zero
      if (!energyIsZero) return 1.0;
      let m = 1.0;
      for (const d of debuffs) {
        const type = String(d.type || '').toLowerCase();
        const mult = Number(d.multiplier);
        if (!mult || mult <= 0 || mult > 1.0) continue;
        if (type === 'rewards' || type === kind) m *= mult;
      }
      return m;
    };

    const computeBuffMultiplier = (kind: 'xp' | 'coins' | 'cp') => {
      let m = 1.0;
      for (const b of buffs) {
        const type = String(b.type || '').toLowerCase();
        const mult = Number(b.multiplier);
        if (!mult || mult <= 0) continue;
        if (type === 'all' || type === 'rewards' || type === kind) m *= mult;
      }
      return m;
    };

    // 2) Apply buffs and debuffs only to positive rewards (do not amplify negatives)
    const xpMul = computeBuffMultiplier('xp') * computeDebuffMultiplier('xp');
    const coinsMul = computeBuffMultiplier('coins') * computeDebuffMultiplier('coins');
    const cpMul = computeBuffMultiplier('cp') * computeDebuffMultiplier('cp');
    let appliedXP = xp > 0 ? Math.floor(xp * xpMul) : xp;
    let appliedCoins = coins > 0 ? Math.floor(coins * coinsMul) : coins;
    const appliedCP = cp > 0 ? Math.floor(cp * cpMul) : cp;

    // 3) Repay failure debt using positive rewards before adding to totals
    let failureDebtXP = Number((fm.failureDebtXP as number | string | undefined) ?? 0);
    let failureDebtCoins = Number((fm.failureDebtCoins as number | string | undefined) ?? 0);

    if (appliedXP > 0 && failureDebtXP > 0) {
      const repay = Math.min(appliedXP, failureDebtXP);
      failureDebtXP -= repay;
      appliedXP -= repay;
    }
    if (appliedCoins > 0 && failureDebtCoins > 0) {
      const repay = Math.min(appliedCoins, failureDebtCoins);
      failureDebtCoins -= repay;
      appliedCoins -= repay;
    }
    fm.failureDebtXP = failureDebtXP;
    fm.failureDebtCoins = failureDebtCoins;

    // 4) Update player totals
    frontmatter.total_exp = (typeof frontmatter.total_exp === 'number' ? frontmatter.total_exp : Number(frontmatter.total_exp) || 0) + appliedXP;
    frontmatter.xp = (typeof frontmatter.xp === 'number' ? frontmatter.xp : Number(frontmatter.xp) || 0) + appliedXP;
    frontmatter.coins = (typeof frontmatter.coins === 'number' ? frontmatter.coins : Number(frontmatter.coins) || 0) + appliedCoins;
    frontmatter.cp = (typeof frontmatter.cp === 'number' ? frontmatter.cp : Number(frontmatter.cp) || 0) + appliedCP;

    // 5) Record coin transaction if coins were earned/spent
    if (appliedCoins !== 0) {
      try {
        const { CoinTransactionTracker } = await import('./coinTransactionTracker');
        const source = appliedCoins > 0 ? 'quest' : 'manual';
        const description = appliedCoins > 0 ? 'Quest completion reward' : 'Manual adjustment';
        await CoinTransactionTracker.recordTransaction(
          vault,
          appliedCoins,
          source,
          description,
          { xp: appliedXP, cp: appliedCP }
        );
      } catch (error) {
        console.warn('[updatePlayerData] Failed to record coin transaction:', error);
      }
    }
    let oldLevel = typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1;

    // Ensure xpRequired is correct for current level
    if (!frontmatter.xpRequired || typeof frontmatter.xpRequired !== 'number') {
      frontmatter.xpRequired = getXpRequired(oldLevel);
    }

    let levelUps = 0;
    const maxLevelUps = 10; // Safety limit to prevent infinite loops

    while ((typeof frontmatter.xp === 'number' ? frontmatter.xp : Number(frontmatter.xp) || 0) >= (typeof frontmatter.xpRequired === 'number' ? frontmatter.xpRequired : getXpRequired(oldLevel)) && levelUps < maxLevelUps) {
      const currentXP: number = typeof frontmatter.xp === 'number' ? frontmatter.xp : Number(frontmatter.xp) || 0;
      const currentXPRequired: number = typeof frontmatter.xpRequired === 'number' ? frontmatter.xpRequired : getXpRequired(oldLevel);

      frontmatter.xp = currentXP - currentXPRequired;
      oldLevel = frontmatter.level = (typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1) + 1;
      frontmatter.xpRequired = getXpRequired(frontmatter.level as number);

      new Notice(`🎉 LEVEL UP! You are now level ${frontmatter.level}!`, 0);
      levelUps++;
    }

    if (levelUps >= maxLevelUps) {
      console.error(`[updatePlayerData] Reached maximum level-ups (${maxLevelUps}), possible infinite loop`);
    }

    // Final check to ensure xpRequired is correct
    if (!frontmatter.xpRequired || typeof frontmatter.xpRequired !== 'number') {
      frontmatter.xpRequired = getXpRequired(typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1);
    }

    // CRITICAL FIX: Use the proper updatePlayerData from playerDataUtils to preserve ALL fields
    // The old writeYamlFrontmatter was wiping achievements, defeatedBosses, unlockedSkills, etc.
    try {
      const { updatePlayerData: properUpdate } = await import('../../features/player/utils/playerDataUtils');
      await properUpdate(vault, frontmatter as unknown as PlayerData);
    } catch (importError) {
      console.warn('[updatePlayerData] Failed to import playerDataUtils, falling back');
      await writeYamlFrontmatter(vault, playerPath, frontmatter);
    }

    // Dispatch event to notify components that player data has been updated
    document.dispatchEvent(new Event('player-data-updated'));
  } catch (err) {
    console.error(`[updatePlayerData] Error:`, err);
    throw err;
  }
}

// --- Auto-Update Associated Stats Function ---
async function updateAssociatedStats(vault: Vault, skillPath: string, skillName: string, cp: number) {
  try {
    // Get skill metadata to find associated stats
    const { getSkillMetadata } = await import('./skillDiscovery');
    const skillMetadata = await getSkillMetadata(vault, skillName);

    if (!skillMetadata || !skillMetadata.stats) {
      return;
    }

    // Each stat receives the same CP as the skill (not divided)
    const statCP = Math.floor(cp * 0.5); // 50% of skill CP to each stat

    if (statCP <= 0) {
      return;
    }

    // Update each associated stat
    for (const [statName, statPath] of Object.entries(skillMetadata.stats)) {
      try {
        await updateStatProgress(vault, statPath, statCP);
      } catch (err) {
        console.error(`[updateAssociatedStats] Error updating stat ${statName}:`, err);
      }
    }

  } catch (err) {
    console.error(`[updateAssociatedStats] Error:`, err);
  }
}

// --- Skill Progress Updater ---
export async function updateSkillProgress(vault: Vault, skillPath: string, cp: number) {
  try {
    const { frontmatter } = await readYamlFrontmatter(vault, skillPath);
    frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) + cp;
    frontmatter.totalCP = (typeof frontmatter.totalCP === 'number' ? frontmatter.totalCP : Number(frontmatter.totalCP) || 0) + cp;
    let leveledUp = false;
    while ((typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) >= (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("skill", 1))) {
      frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) - (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("skill", 1));
      frontmatter.level = (typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1) + 1;
      frontmatter.requiredCP = calculateRequiredCP("skill", frontmatter.level as number);
      leveledUp = true;
    }
    await writeYamlFrontmatter(vault, skillPath, frontmatter);
    new Notice(`Gained ${cp} CP for skill: ${frontmatter.name || skillPath}`, 0);
    document.dispatchEvent(new Event('stats-updated'));

    // --- AUTO-UPDATE ASSOCIATED STATS ---
    await updateAssociatedStats(vault, skillPath, String(frontmatter.name || skillPath), cp);

    return leveledUp;
  } catch (err) {
    console.error(`[updateSkillProgress] Error:`, err);
    throw err;
  }
}

// --- Class Progress Updater ---
export async function updateClassProgress(vault: Vault, classPath: string, cp: number) {
  try {
    const { frontmatter } = await readYamlFrontmatter(vault, classPath);
    frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) + cp;
    frontmatter.totalCP = (typeof frontmatter.totalCP === 'number' ? frontmatter.totalCP : Number(frontmatter.totalCP) || 0) + cp;
    let leveledUp = false;
    while ((typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) >= (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("class", 1))) {
      frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) - (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("class", 1));
      frontmatter.level = (typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1) + 1;
      frontmatter.requiredCP = calculateRequiredCP("class", frontmatter.level as number);
      leveledUp = true;
    }
    await writeYamlFrontmatter(vault, classPath, frontmatter);
    // Reduced notification spam - only show level ups, not every CP gain
    if (leveledUp) {
      new Notice(`${frontmatter.name || classPath} class leveled up! Now level ${frontmatter.level}!`, 0);
    }
    document.dispatchEvent(new Event('stats-updated'));
    return leveledUp;
  } catch (err) {
    console.error(`[updateClassProgress] Error:`, err);
    throw err;
  }
}

// --- Master Class Progress Updater ---
export async function updateMasterClassProgress(vault: Vault, masterClassPath: string, cp: number) {
  try {
    const { frontmatter } = await readYamlFrontmatter(vault, masterClassPath);
    frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) + cp;
    frontmatter.totalCP = (typeof frontmatter.totalCP === 'number' ? frontmatter.totalCP : Number(frontmatter.totalCP) || 0) + cp;
    let leveledUp = false;
    while ((typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) >= (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("master", 1))) {
      frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) - (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("master", 1));
      frontmatter.level = (typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1) + 1;
      frontmatter.requiredCP = calculateRequiredCP("master", frontmatter.level as number);
      leveledUp = true;
    }
    await writeYamlFrontmatter(vault, masterClassPath, frontmatter);
    // Reduced notification spam - only show level ups, not every CP gain
    if (leveledUp) {
      new Notice(`${frontmatter.name || masterClassPath} master class leveled up! Now level ${frontmatter.level}!`, 0);
    }
    document.dispatchEvent(new Event('stats-updated'));
    return leveledUp;
  } catch (err) {
    console.error(`[updateMasterClassProgress] Error:`, err);
    throw err;
  }
}

// --- Stat Progress Updater (Fixed to use only currentCP, totalCP, requiredCP) ---
export async function updateStatProgress(vault: Vault, statPath: string, cp: number) {
  try {
    const { frontmatter } = await readYamlFrontmatter(vault, statPath);
    frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) + cp;
    frontmatter.totalCP = (typeof frontmatter.totalCP === 'number' ? frontmatter.totalCP : Number(frontmatter.totalCP) || 0) + cp;
    let leveledUp = false;
    while ((typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) >= (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("stat", 1))) {
      frontmatter.currentCP = (typeof frontmatter.currentCP === 'number' ? frontmatter.currentCP : Number(frontmatter.currentCP) || 0) - (typeof frontmatter.requiredCP === 'number' ? frontmatter.requiredCP : Number(frontmatter.requiredCP) || calculateRequiredCP("stat", 1));
      frontmatter.level = (typeof frontmatter.level === 'number' ? frontmatter.level : Number(frontmatter.level) || 1) + 1;
      frontmatter.requiredCP = calculateRequiredCP("stat", frontmatter.level as number);
      // On each level-up, increase the stat's value by 3 points (was 15 previously)
      const currentValue = typeof frontmatter.value === 'number' ? frontmatter.value : Number(frontmatter.value) || 0;
      frontmatter.value = currentValue + 3;
      leveledUp = true;
    }
    await writeYamlFrontmatter(vault, statPath, frontmatter);
    // Reduced notification spam - only show level ups, not every CP gain
    if (leveledUp) {
      new Notice(`${frontmatter.name || statPath} stat leveled up! Now level ${frontmatter.level}!`, 0);
    }
    document.dispatchEvent(new Event('stats-updated'));
    return leveledUp;
  } catch (err) {
    console.error(`[updateStatProgress] Error:`, err);
    throw err;
  }
}

// --- Helper function to find skill path ---
async function findSkillPath(vault: Vault, skillName: string): Promise<string | null> {
  try {
    const allFiles = vault.getFiles();
    for (const file of allFiles) {
      if (file instanceof TFile) {
        if (
          file.path.startsWith('SkillTree/') &&
          file.path.includes('/Skills/') &&
          file.path.endsWith('.md')
        ) {
          const content = await vault.read(file);
          const { data } = matter(content);
          const target = String(skillName || '').trim().toLowerCase();
          const nameInFile = String((data.name || '')).trim().toLowerCase();
          if (nameInFile === target) {
            return file.path;
          }
        }
      }
    }
    // Fallback: scan ALL markdown files for frontmatter name/title match
    for (const file of allFiles) {
      if (file instanceof TFile && file.extension === 'md') {
        try {
          const content = await vault.read(file);
          const { data } = matter(content);
          const target = String(skillName || '').trim().toLowerCase();
          const nameInFile = String((data?.name || data?.title || '')).trim().toLowerCase();
          if (nameInFile === target) {
            return file.path;
          }
        } catch {
          // ignore malformed files
        }
      }
    }
    return null;
  } catch (err) {
    console.error(`[findSkillPath] Error finding skill ${skillName}:`, err);
    return null;
  }
}

// --- Helper function to find stat path ---
async function findStatPath(vault: Vault, statName: string): Promise<string | null> {
  try {
    const allFiles = vault.getAllLoadedFiles();

    for (const file of allFiles) {
      if (file instanceof TFile) {
        // Check multiple possible directory structures for stats
        if (
          (file.path.startsWith('SkillTree/') && file.path.includes('/Stats/') && file.path.endsWith('.md')) ||
          (file.path.startsWith('SkillTree/') && file.path.includes('/stats/') && file.path.endsWith('.md')) ||
          (file.path.startsWith('SkillTree/Master-Class/Stats/') && file.path.endsWith('.md')) ||
          (file.path.includes('/Stats/') && file.path.endsWith('.md')) ||
          (file.path.includes('/stats/') && file.path.endsWith('.md'))
        ) {
          try {
            const content = await vault.read(file);
            const { data } = matter(content);

            // Check both name and title fields for stat identification
            const statNameInFile = data.name || data.title || '';

            if (statNameInFile === statName) {
              return file.path;
            }
          } catch (readError) {
            // Continue searching if file read fails
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.error(`[findStatPath] Error finding stat ${statName}:`, err);
    return null;
  }
}

// --- Main CP Distribution System ---
export async function distributeCPFromQuest(vault: Vault, quest: { skills?: string[], stats?: string[], cp: number }) {
  try {
    const skills = quest.skills || [];
    const stats = quest.stats || [];
    const fullCP = quest.cp; // Full CP amount for each entity

    // Track level ups for notifications
    const levelUps: string[] = [];

    // Distribute full CP to skills (robust name trimming)
    for (const skillNameRaw of skills) {
      const skillName = String(skillNameRaw || '').trim();
      if (fullCP > 0) {
        let skillPath = await findSkillPath(vault, skillName);
        if (!skillPath) {
          // Last-chance fallback: try common path structure
          const candidate = `SkillTree/Master-Class/Skills/${skillName}.md`;
          const f = vault.getAbstractFileByPath(candidate);
          if (f instanceof TFile) skillPath = candidate;
        }

        if (skillPath) {
          const leveledUp = await updateSkillProgress(vault, skillPath, fullCP);
          if (leveledUp) {
            levelUps.push(`${skillName} (Skill)`);
          }

          // Get skill metadata to find associated class and master class
          const { getSkillMetadata } = await import('./skillDiscovery');
          const skillMetadata = await getSkillMetadata(vault, skillName);

          if (skillMetadata) {
            // Check if class file exists before updating
            const classFile = vault.getAbstractFileByPath(skillMetadata.classPath);
            if (classFile) {
              const classLeveledUp = await updateClassProgress(vault, skillMetadata.classPath, fullCP);
              if (classLeveledUp) {
                levelUps.push(`${skillMetadata.class} (Class)`);
              }
            }

            // Check if master class file exists before updating
            const masterClassFile = skillMetadata.masterClassPath ? vault.getAbstractFileByPath(skillMetadata.masterClassPath) : null;
            if (masterClassFile) {
              const masterLeveledUp = await updateMasterClassProgress(vault, skillMetadata.masterClassPath, fullCP);
              if (masterLeveledUp) {
                levelUps.push(`${skillMetadata.masterClass} (Master Class)`);
              }
            }
          }
        }
      }
    }

    // Distribute full CP to stats (Note: Skills now auto-update their associated stats)
    // This section handles any explicitly defined stats in quest metadata
    for (const statName of stats) {
      if (fullCP > 0) {
        const statPath = await findStatPath(vault, statName);
        if (statPath) {
          const leveledUp = await updateStatProgress(vault, statPath, fullCP);
          if (leveledUp) {
            levelUps.push(`${statName} (Stat)`);
          }
        }
      }
    }

    // Show a summary notification for all level-ups
    if (levelUps.length > 0) {
      new Notice(`Level ups: ${levelUps.join(', ')}`, 0);
    }
  } catch (err) {
    console.error(`[distributeCPFromQuest] Error:`, err);
    throw err;
  }
}

// Import PlayerData type
import { PlayerData } from '../../data/models/PlayerData';

// Define minimal interface for playerStore
interface PlayerStoreInterface {
  get(): Promise<PlayerData | null>;
  update(updater: (data: PlayerData) => PlayerData | Promise<PlayerData>): Promise<void>;
}

// --- Manual Level Check and Fix Function ---
export async function checkAndFixPlayerLevel(vault: Vault, playerStoreInstance?: PlayerStoreInterface): Promise<{ level: number; xp: number; xpRequired: number; leveledUp: boolean }> {
  function getXpRequired(level: number): number {
    return level * level * 1000 - (level - 1) * (level - 1) * 1000;
  }

  try {
    // Get player store instance - either passed as parameter or imported
    let playerStore: PlayerStoreInterface = playerStoreInstance || null as unknown as PlayerStoreInterface;
    if (!playerStore) {
      const { playerStore: importedPlayerStore } = await import('../state/playerStore');
      playerStore = importedPlayerStore as unknown as PlayerStoreInterface;
    }

    // Get current player data from store
    const currentData = await playerStore.get();
    if (!currentData) {
      console.error("[checkAndFixPlayerLevel] No player data available");
      throw new Error("No player data available");
    }

    let currentLevel = currentData.level || 1;
    let currentXP = currentData.xp || 0;
    let currentXPRequired = currentData.xpRequired || getXpRequired(currentLevel);

    // Ensure xpRequired is correct for current level
    if (currentXPRequired !== getXpRequired(currentLevel)) {
      currentXPRequired = getXpRequired(currentLevel);
    }

    let leveledUp = false;
    let levelUps = 0;
    const maxLevelUps = 10;

    // Check for level ups
    while (currentXP >= currentXPRequired && levelUps < maxLevelUps) {
      currentXP -= currentXPRequired;
      currentLevel++;
      currentXPRequired = getXpRequired(currentLevel);

      leveledUp = true;
      levelUps++;
    }

    if (leveledUp) {
      // Update the player store with new level data
      await playerStore.update((data: PlayerData) => ({
        ...data,
        level: currentLevel,
        xp: currentXP,
        xpRequired: currentXPRequired
      }));

      new Notice(`🎉 Level up! You are now level ${currentLevel}!`, 3000);
    }

    return {
      level: currentLevel,
      xp: currentXP,
      xpRequired: currentXPRequired,
      leveledUp
    };

  } catch (error) {
    console.error("[checkAndFixPlayerLevel] Error:", error);
    throw error;
  }
}