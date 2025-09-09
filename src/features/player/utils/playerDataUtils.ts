import { Vault, TFile } from "obsidian";
import matter from "gray-matter";
import { PlayerData, DEFAULT_PLAYER } from "../../../data/models/PlayerData";
import { readYamlFrontmatter, sanitizeForYaml } from "../../../shared/utils/progressUpdater";

// Reads and parses PlayerData.md, returns PlayerData object
export async function readPlayerData(vault: Vault): Promise<PlayerData | null> {
  const filePath = "SkillTree/PlayerData.md";
  console.log("[readPlayerData] Looking for file at:", filePath);

  // Debug: List all files to see what Obsidian actually has
  const allFiles = vault.getAllLoadedFiles();
  console.log("[readPlayerData] All files in vault:", allFiles.length);
  const skillTreeFiles = allFiles.filter(f => f.path.includes('SkillTree') || f.path.includes('PlayerData'));
  console.log("[readPlayerData] SkillTree/PlayerData related files:", skillTreeFiles.map(f => ({ path: f.path, type: f.constructor.name })));

  // If vault has very few files, it might not be fully loaded yet
  if (allFiles.length < 5) {
    console.log("[readPlayerData] Vault seems not fully loaded (only", allFiles.length, "files), returning null for retry");
    return null;
  }

  let file = vault.getAbstractFileByPath(filePath);
  console.log("[readPlayerData] File found:", !!file, file?.path);
  let tfile: TFile;

  if (file instanceof TFile) {
    tfile = file;
  } else {
    // Attempt to initialize the file with defaults
    try {
      const folderPath = "SkillTree";
      const folder = vault.getAbstractFileByPath(folderPath);
      if (!folder) {
        try {
          await vault.createFolder(folderPath);
        } catch (e) {
          // ignore if exists or cannot create
        }
      }

      // Double-check if file was created by another process
      file = vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        tfile = file;
      } else {
        const initialFrontmatter = sanitizeForYaml({ ...DEFAULT_PLAYER }) as Record<string, unknown>;
        const initialContent = matter.stringify("\n## Player Profile\n\nThis file is managed by the Gamification plugin.", initialFrontmatter);

        try {
          tfile = await vault.create(filePath, initialContent);
        } catch (createErr: unknown) {
          // If file creation fails with "already exists", try to get the existing file
          if (createErr && typeof createErr === 'object' && 'message' in createErr && typeof createErr.message === 'string' && createErr.message.includes('already exists')) {
            console.log(`[readPlayerData] File creation failed with 'already exists', attempting to read existing file: ${filePath}`);
            file = vault.getAbstractFileByPath(filePath);
            if (file instanceof TFile) {
              tfile = file;
            } else {
              console.error(`[readPlayerData] File still not found after 'already exists' error: ${filePath}`);
              return null;
            }
          } else {
            throw createErr;
          }
        }
      }
    } catch (err) {
      console.error(`[readPlayerData] File not found and failed to create: ${filePath}`, err);
      return null;
    }
  }

  try {
    const content = await vault.read(tfile);
    const { data } = matter(content);
    console.log("[readPlayerData] YAML data:", data);

    // Create complete PlayerData object with all fields
    const playerData: PlayerData = {
      // Core player information
      name: String(data.name ?? DEFAULT_PLAYER.name),
      avatar: String(data.avatar ?? DEFAULT_PLAYER.avatar),
      rank: String(data.rank ?? DEFAULT_PLAYER.rank),
      masterClass: String(data.masterClass ?? DEFAULT_PLAYER.masterClass),
      description: String(data.description ?? DEFAULT_PLAYER.description),

      // Progression system
      level: Number(data.level ?? DEFAULT_PLAYER.level),
      xp: Number(data.xp ?? DEFAULT_PLAYER.xp),
      xpRequired: Number(data.xpRequired ?? DEFAULT_PLAYER.xpRequired),

      // Single currency system
      coins: Number(data.coins ?? DEFAULT_PLAYER.coins),
      cp: Number(data.cp ?? DEFAULT_PLAYER.cp),

      // Player items and progression
      inventory: Array.isArray(data.inventory) ? data.inventory as string[] : DEFAULT_PLAYER.inventory,

      // Player stats and status effects
      stats: (data.stats as PlayerData['stats']) || DEFAULT_PLAYER.stats,
      buffs: Array.isArray(data.buffs) ? data.buffs as PlayerData['buffs'] : [],
      debuffs: Array.isArray(data.debuffs) ? data.debuffs as PlayerData['debuffs'] : [],
      activeArtifacts: Array.isArray(data.activeArtifacts) ? data.activeArtifacts as PlayerData['activeArtifacts'] : [],

      // Penalty system
      failureDebtXP: Number(data.failureDebtXP ?? 0),
      failureDebtCoins: Number(data.failureDebtCoins ?? 0),
      questReputation: Number(data.questReputation ?? 0),

      // System properties
      lastDailyReset: String(data.lastDailyReset || new Date().toISOString()),
    };

    console.log("[readPlayerData] Processed player data:", playerData);
    console.log("[readPlayerData] Stats data:", playerData.stats);

    return playerData;
  } catch (readErr) {
    console.error(`[readPlayerData] Failed to read file content: ${filePath}`, readErr);
    return null;
  }
}

// Writes updated PlayerData to PlayerData.md (updates YAML frontmatter, preserves rest of file)
export async function updatePlayerData(vault: Vault, newData: PlayerData): Promise<void> {
  const filePath = "SkillTree/PlayerData.md";
  const file = vault.getAbstractFileByPath(filePath);
  let tfile: TFile;
  if (file instanceof TFile) {
    tfile = file;
  } else {
    // Create the file if it doesn't exist
    try {
      const folderPath = "SkillTree";
      const folder = vault.getAbstractFileByPath(folderPath);
      if (!folder) {
        try {
          await vault.createFolder(folderPath);
        } catch (e) {
          // ignore if exists or cannot create
        }
      }
      const fm = sanitizeForYaml({ ...DEFAULT_PLAYER, ...newData }) as Record<string, unknown>;
      const initialContent = matter.stringify("\n## Player Profile\n\nThis file is managed by the Gamification plugin.", fm);
      tfile = await vault.create(filePath, initialContent);
    } catch (err) {
      throw new Error(`[updatePlayerData] Failed to create ${filePath}: ${String(err)}`);
    }
  }
  const content = await vault.read(tfile);
  const parsed = matter(content);
  // Overwrite YAML frontmatter with newData
  const merged = {
    ...parsed.data,
    ...newData,
  } as Record<string, unknown>;
  const sanitized = sanitizeForYaml(merged) as Record<string, unknown>;
  const updated = matter.stringify(parsed.content, sanitized);
  await vault.modify(tfile, updated);

  // Dispatch event to notify components that player data has been updated
  document.dispatchEvent(new Event('player-data-updated'));
}

// Alias for updatePlayerData for clarity
export const writePlayerData = updatePlayerData;

/**
 * Finds a file in a folder whose frontmatter 'name' matches the given name (case-insensitive, ignores whitespace).
 */
export async function findFileByFrontmatterName(
  vault: Vault,
  folder: string,
  name: string
): Promise<string | null> {
  const files = vault.getFiles().filter(
    (f) => f.path.startsWith(folder) && f.extension === "md"
  );
  for (const file of files) {
    try {
      const { frontmatter } = await readYamlFrontmatter(vault, file.path);
      if (
        typeof frontmatter.name === "string" &&
        frontmatter.name.replace(/\s+/g, "").toLowerCase() ===
        name.replace(/\s+/g, "").toLowerCase()
      ) {
        return file.path;
      }
    } catch {
      // Ignore errors and continue
    }
  }
  return null;
}