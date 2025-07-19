import { Vault, TFile } from "obsidian";
import matter from "gray-matter";
import { PlayerData } from "src/data/PlayerData";
import { readYamlFrontmatter } from "./progressUpdater";

// Reads and parses PlayerData.md, returns PlayerData object
export async function readPlayerData(vault: Vault): Promise<PlayerData | null> {
  const filePath = "SkillTree/PlayerData.md";
  const file = vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) {
    console.error(`[readPlayerData] File not found: ${filePath}`);
    return null;
  }
  const content = await vault.read(file);
  const { data } = matter(content);
  console.log("[readPlayerData] YAML data:", data); // <-- ADD THIS LINE
  // Optionally: validate/normalize fields here
  return {
    name: data.name ?? "",
    avatar: data.avatar ?? "",
    rank: data.rank ?? "",
    masterClass: data.masterClass ?? "",
    description: data.description ?? "",
    level: Number(data.level ?? 1),
    xp: Number(data.xp ?? 0),
    xpRequired: Number(data.xpRequired ?? 100),
    coins: Number(data.coins ?? 0),
    inventory: Array.isArray(data.inventory) ? data.inventory : [],
    // Add more fields as needed
  };
}

// Writes updated PlayerData to PlayerData.md (updates YAML frontmatter, preserves rest of file)
export async function updatePlayerData(vault: Vault, newData: PlayerData): Promise<void> {
  const filePath = "SkillTree/PlayerData.md";
  const file = vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) {
    throw new Error(`[updatePlayerData] File not found: ${filePath}`);
  }
  const content = await vault.read(file);
  const parsed = matter(content);
  // Overwrite YAML frontmatter with newData
  const updated = matter.stringify(parsed.content, {
    ...parsed.data,
    ...newData,
  });
  await vault.modify(file, updated);
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
