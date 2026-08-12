import { Vault, TFile } from "obsidian";
const matter = require("gray-matter");
import { PlayerData, DEFAULT_PLAYER } from "../../../data/models/PlayerData";
import { readYamlFrontmatter, sanitizeForYaml } from "../../../shared/utils/progressUpdater";
import { isLikelyMobileDevice } from "../../../shared/utils/deviceDetect";

// ---------------------------------------------------------------------------
// Reliability: backups, write queue with debounce + lock, schema versioning
// ---------------------------------------------------------------------------
const BACKUP_DIR = "SkillTree/.playerdata_backups";
const BACKUP_PREFIX = "PlayerData.";
const MAX_BACKUPS = 5;
const SCHEMA_VERSION = 1;

let writeLock = false;
let queuedData: PlayerData | null = null;
let debounceTimer: number | null = null;
const DEBOUNCE_MS = 500;

async function ensureBackupDir(vault: Vault) {
  const dir = vault.getAbstractFileByPath(BACKUP_DIR);
  if (!dir) {
    try { await vault.createFolder(BACKUP_DIR); } catch { /* ignore */ }
  }
}

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function createBackup(vault: Vault, src: TFile) {
  await ensureBackupDir(vault);
  const content = await vault.read(src);
  const name = `${BACKUP_PREFIX}${timestamp()}.md`;
  await vault.create(`${BACKUP_DIR}/${name}`, content);
  // Trim oldest backups
  const files = vault.getFiles().filter(f => f.path.startsWith(BACKUP_DIR + "/") && f.basename.startsWith(BACKUP_PREFIX));
  files.sort((a, b) => (a.stat.ctime ?? 0) - (b.stat.ctime ?? 0));
  while (files.length > MAX_BACKUPS) {
    const f = files.shift();
    if (f) { try { await vault.delete(f); } catch { /* ignore */ } }
  }
}

export async function listPlayerDataBackups(vault: Vault): Promise<TFile[]> {
  await ensureBackupDir(vault);
  return vault.getFiles()
    .filter(f => f.path.startsWith(BACKUP_DIR + "/") && f.basename.startsWith(BACKUP_PREFIX))
    .sort((a, b) => (b.stat.ctime ?? 0) - (a.stat.ctime ?? 0));
}

export async function restorePlayerDataBackup(vault: Vault, backupPath: string): Promise<void> {
  const target = vault.getAbstractFileByPath("SkillTree/PlayerData.md");
  const backup = vault.getAbstractFileByPath(backupPath);
  if (target instanceof TFile && backup instanceof TFile) {
    const content = await vault.read(backup);
    document.dispatchEvent(new Event('player-data-saving'));
    await vault.modify(target, content);
    document.dispatchEvent(new Event('player-data-saved'));
    document.dispatchEvent(new Event('player-data-updated'));
  } else {
    throw new Error("Backup or target file not found");
  }
}

async function performWrite(vault: Vault, tfile: TFile, updated: string) {
  if (!updated || updated.trim().length === 0) throw new Error("Refusing to write empty PlayerData");
  await createBackup(vault, tfile);
  document.dispatchEvent(new Event('player-data-saving'));
  await vault.modify(tfile, updated);
  document.dispatchEvent(new Event('player-data-saved'));
  document.dispatchEvent(new Event('player-data-updated'));
}

/** Lightweight markdown/YAML parse used on mobile/tablet (gray-matter can fail there). */
function parsePlayerDataFromMarkdown(content: string): PlayerData | null {
  if (!content || !content.trim()) return null;

  const yamlMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!yamlMatch) return null;

  const yamlContent = yamlMatch[1];
  const data: Record<string, string | number | unknown[]> = {};
  const lines = yamlContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();

    if (value === '>-' || value === '|-' || value === '>' || value === '|') {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (/^\d+$/.test(value)) {
      data[key] = parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      data[key] = parseFloat(value);
    } else if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      data[key] = arrayContent.trim()
        ? arrayContent.split(',').map((item) => item.trim().replace(/['"]/g, ''))
        : [];
    } else {
      if (key === 'description' && (value.length < 5 || value.includes('>') || value.includes('|'))) {
        continue;
      }
      data[key] = value;
    }
  }

  if (!data.name && data.level === undefined && data.xp === undefined) {
    // Still allow defaults, but require at least some parsed keys
    if (Object.keys(data).length === 0) return null;
  }

  return {
    name: String(data.name ?? DEFAULT_PLAYER.name),
    avatar: String(data.avatar ?? DEFAULT_PLAYER.avatar),
    rank: String(data.rank ?? DEFAULT_PLAYER.rank),
    masterClass: String(data.masterClass ?? DEFAULT_PLAYER.masterClass),
    description: String(data.description ?? DEFAULT_PLAYER.description),
    level: Number(data.level ?? DEFAULT_PLAYER.level),
    xp: Number(data.xp ?? DEFAULT_PLAYER.xp),
    xpRequired: Number(data.xpRequired ?? DEFAULT_PLAYER.xpRequired),
    total_exp: Number(data.total_exp ?? DEFAULT_PLAYER.total_exp),
    coins: Number(data.coins ?? DEFAULT_PLAYER.coins),
    cp: Number(data.cp ?? DEFAULT_PLAYER.cp),
    inventory: Array.isArray(data.inventory) ? (data.inventory as string[]) : DEFAULT_PLAYER.inventory,
    stats: (data.stats as unknown as PlayerData['stats']) || DEFAULT_PLAYER.stats,
    buffs: Array.isArray(data.buffs) ? (data.buffs as PlayerData['buffs']) : [],
    debuffs: Array.isArray(data.debuffs) ? (data.debuffs as PlayerData['debuffs']) : [],
    activeArtifacts: Array.isArray(data.activeArtifacts)
      ? (data.activeArtifacts as PlayerData['activeArtifacts'])
      : [],
    failureDebtXP: Number(data.failureDebtXP ?? 0),
    failureDebtCoins: Number(data.failureDebtCoins ?? 0),
    questReputation: Number(data.questReputation ?? 0),
    lastDailyReset: String(data.lastDailyReset || new Date().toISOString()),
  };
}

// Reads and parses PlayerData.md, returns PlayerData object
export async function readPlayerData(vault: Vault): Promise<PlayerData | null> {
  let filePath = "SkillTree/PlayerData.md";
  console.log("[readPlayerData] Looking for file at:", filePath);

  // iPad/iPhone/Android: Obsidian body classes + Platform + iPad desktop-UA touch heuristic
  const isMobile = isLikelyMobileDevice();
  if (isMobile) {
    console.log("📱 [Mobile/Tablet] Reading PlayerData (adapter-first path)");

    // Use the proven working method: direct adapter.read
    try {
      console.log("📱 [Mobile] Using direct adapter.read method...");
      const content = await vault.adapter.read(filePath);
      console.log("📱 [Mobile] File read successfully, length:", content.length);
      const parsed = parsePlayerDataFromMarkdown(content);
      if (parsed) {
        console.log("📱 [Mobile] PlayerData created successfully:", parsed.name, "Level", parsed.level);
        return parsed;
      }
      console.warn("📱 [Mobile] adapter.read succeeded but YAML parse failed; falling back");
    } catch (mobileError) {
      console.error("📱 [Mobile] Direct adapter.read failed:", mobileError);
      console.log("📱 [Mobile] Falling back to normal method...");
    }
  }

  // Debug: List all files to see what Obsidian actually has (mobile-only to avoid
  // expensive full-vault scans on desktop, which can slow down plugin reloads).
  if (isMobile) {
    const allFiles = vault.getAllLoadedFiles();
    console.log("[readPlayerData] All files in vault:", allFiles.length);

    console.log("📱 [Mobile] First 10 files:", allFiles.slice(0, 10).map(f => f.path));

    const skillTreeFiles = allFiles.filter(f => f.path.includes('SkillTree') || f.path.includes('PlayerData'));
    console.log("[readPlayerData] SkillTree/PlayerData related files:", skillTreeFiles.map(f => ({ path: f.path, type: f.constructor.name })));

    // More lenient check for mobile - vault might load differently
    const minFiles = 1;
    if (allFiles.length < minFiles) {
      console.log(`[readPlayerData] Vault seems not fully loaded (only ${allFiles.length} files), returning null for retry`);
      console.log("📱 [Mobile] Vault loading issue detected, will retry...");
      console.log("📱 [Mobile] This might be an iCloud sync issue - files may still be downloading");
      return null;
    }

    // On mobile, if we have enough files but still can't find PlayerData, skip the early checks
    if (allFiles.length >= 10) {
      console.log("📱 [Mobile] Sufficient files loaded, proceeding with PlayerData search...");
    }

    // Special handling for iCloud on mobile - files might be in different locations
    if (allFiles.length > 0) {
      console.log("📱 [Mobile] iCloud context detected, checking for file variations...");

      // Look for any PlayerData file regardless of exact path
      const anyPlayerDataFile = allFiles.find(f =>
        f.path.toLowerCase().includes('playerdata') && f.path.endsWith('.md')
      );

      if (anyPlayerDataFile) {
        console.log("📱 [Mobile] Found PlayerData file at alternative location:", anyPlayerDataFile.path);
        // Update filePath to use the found location
        filePath = anyPlayerDataFile.path;
      }

      // Force direct file access on mobile since we know the file exists
      console.log("📱 [Mobile] Forcing direct file access for:", filePath);
    }
  }

  let file = vault.getAbstractFileByPath(filePath);
  console.log("[readPlayerData] File found:", !!file, file?.path);

  // Try alternative paths on mobile if the first one fails
  if (!file && isMobile) {
    console.log("📱 [Mobile] Primary path failed, trying alternative paths...");

    // Try with different case variations
    const alternativePaths = [
      "skilltree/PlayerData.md",
      "SKILLTREE/PlayerData.md",
      "SkillTree/playerdata.md",
      "SkillTree/PLAYERDATA.md"
    ];

    for (const altPath of alternativePaths) {
      const altFile = vault.getAbstractFileByPath(altPath);
      if (altFile) {
        console.log("📱 [Mobile] Found file at alternative path:", altPath);
        file = altFile;
        break;
      }
    }
  }

  if (isMobile) {
    console.log("📱 [Mobile] Final file lookup result:", {
      found: !!file,
      path: file?.path,
      type: file?.constructor.name
    });
  }

  let tfile: TFile | null = null;

  if (file instanceof TFile) {
    tfile = file;
    if (isMobile) {
      console.log("📱 [Mobile] File is valid TFile, proceeding to read...");
    }
  } else if (file && isMobile) {
    // On mobile, sometimes files are not recognized as TFile but still accessible
    console.log("📱 [Mobile] File exists but not TFile, attempting mobile workaround...");
    try {
      // Force cast to TFile for mobile
      tfile = file as TFile;
      console.log("📱 [Mobile] Mobile workaround successful, proceeding...");
    } catch (mobileErr) {
      console.log("📱 [Mobile] Mobile workaround failed:", mobileErr);
      tfile = null;
    }
  }

  if (!tfile) {
    if (isMobile) {
      console.log("📱 [Mobile] No valid TFile found, checking if file truly doesn't exist...");
    }

    // CRITICAL FIX: Only create a new file if it truly doesn't exist
    // Check if file exists but is not accessible as TFile (temporary vault issue)
    const fileExists = vault.getAbstractFileByPath(filePath) !== null;

    if (fileExists) {
      console.error(`[readPlayerData] File exists but not accessible as TFile: ${filePath}`);
      console.error(`[readPlayerData] This is likely a temporary vault access issue during plugin reload`);
      console.error(`[readPlayerData] Returning null instead of creating new file to prevent data loss`);
      return null;
    }

    // Only create new file if it truly doesn't exist
    console.log(`[readPlayerData] File truly doesn't exist, creating new PlayerData.md with defaults`);

    // Attempt to initialize the file with defaults
    try {
      const folderPath = "SkillTree";
      const folder = vault.getAbstractFileByPath(folderPath);
      if (!folder) {
        if (isMobile) {
          console.log("📱 [Mobile] SkillTree folder not found, creating...");
        }
        try {
          await vault.createFolder(folderPath);
          if (isMobile) {
            console.log("📱 [Mobile] SkillTree folder created successfully");
          }
        } catch (e) {
          if (isMobile) {
            console.log("📱 [Mobile] Failed to create SkillTree folder:", e);
          }
          // ignore if exists or cannot create
        }
      }

      const initialFrontmatter = sanitizeForYaml({ ...DEFAULT_PLAYER }) as Record<string, unknown>;
      const initialContent = matter.stringify("\n## Player Profile\n\nThis file is managed by the Gamification plugin.", initialFrontmatter);

      try {
        tfile = await vault.create(filePath, initialContent);
        console.log('✅ Created new PlayerData file with defaults');
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
    } catch (err) {
      console.error(`[readPlayerData] File not found and failed to create: ${filePath}`, err);
      return null;
    }
  }

  try {
    if (isMobile) {
      console.log("📱 [Mobile] Attempting to read file content...");
    }

    const content = await vault.read(tfile);

    if (isMobile) {
      console.log("📱 [Mobile] File content length:", content.length);
      console.log("📱 [Mobile] First 200 chars:", content.substring(0, 200));
    }

    // CRITICAL SAFEGUARD: If file exists but is empty, attempt recovery from backup
    if (!content || content.trim().length === 0) {
      console.error("❌ [CRITICAL] PlayerData.md file is empty! Attempting recovery from backup...");
      
      // Try to restore from backup
      const backupFile = vault.getAbstractFileByPath("SkillTree/PlayerData.backup.md");
      if (backupFile instanceof TFile) {
        try {
          const backupContent = await vault.read(backupFile);
          if (backupContent && backupContent.trim().length > 0) {
            await vault.modify(tfile, backupContent);
            console.log("✅ [RECOVERY] Successfully restored from backup!");
            
            // Re-read the restored content
            const restoredContent = await vault.read(tfile);
            const { data } = matter(restoredContent);
            const playerData: PlayerData = {
              name: String(data.name ?? 'The Tester'),
              avatar: String(data.avatar ?? 'assets/sonic.png'),
              rank: String(data.rank ?? 'E'),
              masterClass: String(data.masterClass ?? 'Jester'),
              description: String(data.description ?? 'A player'),
              level: Number(data.level ?? 1),
              xp: Number(data.xp ?? 0),
              xpRequired: Number(data.xpRequired ?? 100),
              total_exp: Number(data.total_exp ?? 0),
              coins: Number(data.coins ?? 0),
              cp: Number(data.cp ?? 0),
              inventory: Array.isArray(data.inventory) ? data.inventory as string[] : [],
              stats: (data.stats as PlayerData['stats']) || { energy: 80, focus: 75, motivation: 85, calm: 70, stress: 20 },
              buffs: Array.isArray(data.buffs) ? data.buffs as PlayerData['buffs'] : [],
              debuffs: Array.isArray(data.debuffs) ? data.debuffs as PlayerData['debuffs'] : [],
              activeArtifacts: Array.isArray(data.activeArtifacts) ? data.activeArtifacts as PlayerData['activeArtifacts'] : [],
              failureDebtXP: Number(data.failureDebtXP ?? 0),
              failureDebtCoins: Number(data.failureDebtCoins ?? 0),
              questReputation: Number(data.questReputation ?? 0),
              bossHealthBoosts: data.bossHealthBoosts as Record<string, number> | undefined,
              defeatedBosses: Array.isArray(data.defeatedBosses) ? data.defeatedBosses as string[] : [],
              consecutiveBossWins: Number(data.consecutiveBossWins ?? 0),
              totalBossVictories: Number(data.totalBossVictories ?? 0),
              unlockedSkills: Array.isArray(data.unlockedSkills) ? data.unlockedSkills as string[] : [],
              achievements: Array.isArray(data.achievements) ? data.achievements as string[] : [],
              lastDailyReset: String(data.lastDailyReset || new Date().toISOString()),
            };
            Object.keys(data).forEach(key => {
              if ((key.startsWith('debtUsedXP_') || key.startsWith('debtUsedCoins_')) && data[key] !== undefined) {
                playerData[key] = Number(data[key]);
              }
            });
            return playerData;
          }
        } catch (backupError) {
          console.error("❌ [RECOVERY] Failed to restore from backup:", backupError);
        }
      }
      
      console.error("❌ Cannot recover data. Manual intervention required.");
      throw new Error("PlayerData.md exists but is empty - data loss detected!");
    }

    const { data } = matter(content);
    console.log("[readPlayerData] YAML data:", data);

    // Schema/version guard
    const fileVersion = Number((data as any).schemaVersion ?? 0);
    if (!Number.isFinite(fileVersion) || fileVersion < SCHEMA_VERSION) {
      console.warn(`[PlayerData] Outdated or missing schemaVersion (${fileVersion}). Will auto-bump on next save.`);
    }

    if (isMobile) {
      console.log("📱 [Mobile] YAML parsing successful, data keys:", Object.keys(data));
    }

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
      total_exp: Number(data.total_exp ?? DEFAULT_PLAYER.total_exp),

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
      bossHealthBoosts: data.bossHealthBoosts as Record<string, number> | undefined,

      // Boss battle system
      defeatedBosses: Array.isArray(data.defeatedBosses) ? data.defeatedBosses as string[] : [],
      consecutiveBossWins: Number(data.consecutiveBossWins ?? 0),
      totalBossVictories: Number(data.totalBossVictories ?? 0),

      // Skill system
      unlockedSkills: Array.isArray(data.unlockedSkills) ? data.unlockedSkills as string[] : [],

      // Achievement system
      achievements: Array.isArray(data.achievements) ? data.achievements as string[] : [],

      // System properties
      lastDailyReset: String(data.lastDailyReset || new Date().toISOString()),
    };

    // Add dynamic debt tracking fields (debtUsedXP_YYYY-MM-DD, debtUsedCoins_YYYY-MM-DD)
    Object.keys(data).forEach(key => {
      if ((key.startsWith('debtUsedXP_') || key.startsWith('debtUsedCoins_')) && data[key] !== undefined) {
        playerData[key] = Number(data[key]);
      }
    });

    console.log("[readPlayerData] Processed player data:", playerData);
    console.log("[readPlayerData] Stats data:", playerData.stats);

    return playerData;
  } catch (readErr) {
    console.error(`[readPlayerData] Failed to read file content: ${filePath}`, readErr);

    if (isMobile) {
      console.error("📱 [Mobile] File reading error details:", {
        error: readErr,
        fileName: tfile?.name,
        filePath: tfile?.path,
        fileSize: tfile?.stat?.size
      });
    }

    // Last-resort: adapter.read + lightweight parse (helps iPad desktop-UA / gray-matter failures)
    try {
      const raw = await vault.adapter.read(filePath);
      const recovered = parsePlayerDataFromMarkdown(raw);
      if (recovered) {
        console.log("[readPlayerData] Recovered via adapter.read fallback:", recovered.name);
        return recovered;
      }
    } catch (fallbackErr) {
      console.error("[readPlayerData] adapter.read fallback also failed:", fallbackErr);
    }

    return null;
  }
}

// Writes updated PlayerData to PlayerData.md (updates YAML frontmatter, preserves rest of file)
export async function updatePlayerData(vault: Vault, newData: PlayerData): Promise<void> {
  const filePath = "SkillTree/PlayerData.md";
  // SAFEGUARD
  if (!newData.name || newData.level === undefined || newData.xp === undefined) {
    throw new Error('Cannot save PlayerData: critical fields missing');
  }
  const file = vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) {
    throw new Error(`[updatePlayerData] File exists but not accessible: ${filePath}`);
  }

  // Queue latest data and debounce
  queuedData = { ...newData, schemaVersion: SCHEMA_VERSION } as any;
  if (debounceTimer) window.clearTimeout(debounceTimer);

  await new Promise<void>((resolve) => {
    debounceTimer = window.setTimeout(async () => {
      if (writeLock) { resolve(); return; }
      writeLock = true;
      try {
        const content = await vault.read(file);
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
        let updated: string;
        if (!content || content.trim().length === 0) {
          updated = createPlayerDataContent(queuedData!);
        } else if (isMobile) {
          updated = updateYamlContent(content, queuedData!);
        } else {
          const parsed = matter(content);
          const merged = { ...parsed.data, ...queuedData } as Record<string, unknown>;
          const sanitized = sanitizeForYaml(merged) as Record<string, unknown>;
          updated = matter.stringify(parsed.content, sanitized);
        }
        // retries
        let attempts = 0;
        while (true) {
          try {
            await performWrite(vault, file, updated);
            break;
          } catch (e) {
            if (++attempts > 2) throw e;
            await new Promise(r => setTimeout(r, 250 * attempts));
          }
        }
      } finally {
        writeLock = false;
        queuedData = null;
        resolve();
      }
    }, DEBOUNCE_MS);
  });
}

// Helper function to serialize value to YAML format
function serializeYamlValue(value: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);

  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    // Escape quotes and handle multiline strings
    if (value.includes('\n') || value.includes('"') || value.includes(':')) {
      return `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return `"${value}"`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = value.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        // Array of objects - each item needs proper indentation
        const objLines = Object.entries(item).map(([k, v]) => {
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            // Nested object
            return `${spaces}  ${k}:\n${serializeYamlValue(v, indent + 2)}`;
          }
          return `${spaces}  ${k}: ${serializeYamlValue(v, 0)}`;
        });
        return `${i === 0 ? '' : spaces}- \n${objLines.join('\n')}`;
      } else {
        // Array of primitives
        return `${spaces}- ${serializeYamlValue(item, 0)}`;
      }
    });
    return items[0].startsWith(spaces) ? `\n${items.join('\n')}` : `\n${spaces}- ${items.join(`\n${spaces}- `)}`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).map(([k, v]) => {
      return `${spaces}  ${k}: ${serializeYamlValue(v, indent + 1)}`;
    });
    return entries.length > 0 ? `\n${entries.join('\n')}` : '{}';
  }

  return String(value);
}

// Helper function to create PlayerData content without gray-matter
function createPlayerDataContent(data: PlayerData): string {
  const yamlLines = [
    '---',
    `schemaVersion: ${SCHEMA_VERSION}`,
    `name: ${serializeYamlValue(data.name)}`,
    `avatar: ${serializeYamlValue(data.avatar)}`,
    `rank: ${serializeYamlValue(data.rank)}`,
    `masterClass: ${serializeYamlValue(data.masterClass)}`,
    `description: ${serializeYamlValue(data.description)}`,
    `level: ${data.level}`,
    `xp: ${data.xp}`,
    `xpRequired: ${data.xpRequired}`,
    `total_exp: ${data.total_exp}`,
    `coins: ${data.coins}`,
    `cp: ${data.cp || 0}`,
    `inventory: ${serializeYamlValue(data.inventory || [])}`,
  ];

  // Add stats if present
  if (data.stats) {
    yamlLines.push(`stats: ${serializeYamlValue(data.stats)}`);
  }

  // Add buffs if present
  if (data.buffs && data.buffs.length > 0) {
    yamlLines.push(`buffs: ${serializeYamlValue(data.buffs)}`);
  } else {
    yamlLines.push('buffs: []');
  }

  // Add debuffs if present
  if (data.debuffs && data.debuffs.length > 0) {
    yamlLines.push(`debuffs: ${serializeYamlValue(data.debuffs)}`);
  } else {
    yamlLines.push('debuffs: []');
  }

  // Add activeArtifacts if present
  if (data.activeArtifacts && data.activeArtifacts.length > 0) {
    yamlLines.push(`activeArtifacts: ${serializeYamlValue(data.activeArtifacts)}`);
  } else {
    yamlLines.push('activeArtifacts: []');
  }

  // Add penalty system fields
  yamlLines.push(`failureDebtXP: ${data.failureDebtXP || 0}`);
  yamlLines.push(`failureDebtCoins: ${data.failureDebtCoins || 0}`);
  yamlLines.push(`questReputation: ${data.questReputation || 0}`);

  // Add bossHealthBoosts if present
  if (data.bossHealthBoosts && Object.keys(data.bossHealthBoosts).length > 0) {
    yamlLines.push(`bossHealthBoosts: ${serializeYamlValue(data.bossHealthBoosts)}`);
  }

  // Add boss battle system fields
  if (data.defeatedBosses && data.defeatedBosses.length > 0) {
    yamlLines.push(`defeatedBosses: ${serializeYamlValue(data.defeatedBosses)}`);
  } else {
    yamlLines.push('defeatedBosses: []');
  }
  yamlLines.push(`consecutiveBossWins: ${data.consecutiveBossWins || 0}`);
  yamlLines.push(`totalBossVictories: ${data.totalBossVictories || 0}`);

  // Add skill system fields
  if (data.unlockedSkills && data.unlockedSkills.length > 0) {
    yamlLines.push(`unlockedSkills: ${serializeYamlValue(data.unlockedSkills)}`);
  } else {
    yamlLines.push('unlockedSkills: []');
  }

  // Add achievement system fields
  if (data.achievements && data.achievements.length > 0) {
    yamlLines.push(`achievements: ${serializeYamlValue(data.achievements)}`);
  } else {
    yamlLines.push('achievements: []');
  }

  // Add legacy fields
  if (data.total_exp !== undefined) {
    yamlLines.push(`total_exp: ${data.total_exp}`);
  }

  // Add dynamic debt tracking fields (debtUsedXP_YYYY-MM-DD, debtUsedCoins_YYYY-MM-DD)
  Object.keys(data).forEach(key => {
    if ((key.startsWith('debtUsedXP_') || key.startsWith('debtUsedCoins_')) && data[key] !== undefined) {
      yamlLines.push(`${key}: ${data[key]}`);
    }
  });

  yamlLines.push(`lastDailyReset: ${serializeYamlValue(data.lastDailyReset || new Date().toISOString())}`);
  yamlLines.push('---');
  yamlLines.push('');
  yamlLines.push('## Player Profile');
  yamlLines.push('');
  yamlLines.push('This file is managed by the Gamification plugin.');

  return yamlLines.join('\n');
}

// Helper function to update YAML content without gray-matter
function updateYamlContent(content: string, newData: PlayerData): string {
  const lines = content.split('\n');
  const yamlStart = lines.findIndex(l => l.trim() === '---');
  const yamlEnd = lines.findIndex((l, i) => i > yamlStart && l.trim() === '---');

  if (yamlStart === -1 || yamlEnd === -1) {
    // No YAML frontmatter found, create new content
    return createPlayerDataContent(newData);
  }

  // Read existing YAML to preserve fields that shouldn't be overwritten
  const existingYamlLines = lines.slice(yamlStart + 1, yamlEnd);
  const existingData: Record<string, string> = {};

  for (const line of existingYamlLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    existingData[key] = value;
  }

  // Mobile-safe description handling - preserve existing if new one is corrupted
  let safeDescription = newData.description;
  if (!safeDescription || safeDescription === '>-' || safeDescription.length < 10) {
    console.log('📱 [Mobile] Description appears corrupted, preserving existing:', existingData.description);
    safeDescription = existingData.description || DEFAULT_PLAYER.description;
  }

  // Update specific fields in YAML
  const beforeYaml = lines.slice(0, yamlStart + 1);
  const afterYaml = lines.slice(yamlEnd);

  const updatedYaml = [
    `schemaVersion: ${SCHEMA_VERSION}`,
    `name: ${serializeYamlValue(newData.name)}`,
    `avatar: ${serializeYamlValue(newData.avatar)}`,
    `rank: ${serializeYamlValue(newData.rank)}`,
    `masterClass: ${serializeYamlValue(newData.masterClass)}`,
    `description: ${serializeYamlValue(safeDescription)}`,
    `level: ${newData.level}`,
    `xp: ${newData.xp}`,
    `xpRequired: ${newData.xpRequired}`,
    `total_exp: ${newData.total_exp}`,
    `coins: ${newData.coins}`,
    `cp: ${newData.cp || 0}`,
    `inventory: ${serializeYamlValue(newData.inventory || [])}`,
  ];

  // Add stats if present
  if (newData.stats) {
    updatedYaml.push(`stats: ${serializeYamlValue(newData.stats)}`);
  }

  // Add buffs if present
  if (newData.buffs && newData.buffs.length > 0) {
    updatedYaml.push(`buffs: ${serializeYamlValue(newData.buffs)}`);
  } else {
    updatedYaml.push('buffs: []');
  }

  // Add debuffs if present
  if (newData.debuffs && newData.debuffs.length > 0) {
    updatedYaml.push(`debuffs: ${serializeYamlValue(newData.debuffs)}`);
  } else {
    updatedYaml.push('debuffs: []');
  }

  // Add activeArtifacts if present
  if (newData.activeArtifacts && newData.activeArtifacts.length > 0) {
    updatedYaml.push(`activeArtifacts: ${serializeYamlValue(newData.activeArtifacts)}`);
  } else {
    updatedYaml.push('activeArtifacts: []');
  }

  // Add penalty system fields
  updatedYaml.push(`failureDebtXP: ${newData.failureDebtXP || 0}`);
  updatedYaml.push(`failureDebtCoins: ${newData.failureDebtCoins || 0}`);
  updatedYaml.push(`questReputation: ${newData.questReputation || 0}`);

  // Add bossHealthBoosts if present
  if (newData.bossHealthBoosts && Object.keys(newData.bossHealthBoosts).length > 0) {
    updatedYaml.push(`bossHealthBoosts: ${serializeYamlValue(newData.bossHealthBoosts)}`);
  }

  // Add boss battle system fields
  if (newData.defeatedBosses && newData.defeatedBosses.length > 0) {
    updatedYaml.push(`defeatedBosses: ${serializeYamlValue(newData.defeatedBosses)}`);
  } else {
    updatedYaml.push('defeatedBosses: []');
  }
  updatedYaml.push(`consecutiveBossWins: ${newData.consecutiveBossWins || 0}`);
  updatedYaml.push(`totalBossVictories: ${newData.totalBossVictories || 0}`);

  // Add skill system fields
  if (newData.unlockedSkills && newData.unlockedSkills.length > 0) {
    updatedYaml.push(`unlockedSkills: ${serializeYamlValue(newData.unlockedSkills)}`);
  } else {
    updatedYaml.push('unlockedSkills: []');
  }

  // Add achievement system fields
  if (newData.achievements && newData.achievements.length > 0) {
    updatedYaml.push(`achievements: ${serializeYamlValue(newData.achievements)}`);
  } else {
    updatedYaml.push('achievements: []');
  }

  // Add legacy fields
  if (newData.total_exp !== undefined) {
    updatedYaml.push(`total_exp: ${newData.total_exp}`);
  }

  // Add dynamic debt tracking fields (debtUsedXP_YYYY-MM-DD, debtUsedCoins_YYYY-MM-DD)
  Object.keys(newData).forEach(key => {
    if ((key.startsWith('debtUsedXP_') || key.startsWith('debtUsedCoins_')) && newData[key] !== undefined) {
      updatedYaml.push(`${key}: ${newData[key]}`);
    }
  });

  updatedYaml.push(`lastDailyReset: ${serializeYamlValue(newData.lastDailyReset || new Date().toISOString())}`);

  return [...beforeYaml, ...updatedYaml, ...afterYaml].join('\n');
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