import { App, TFile, TFolder } from "obsidian";
import yaml from "js-yaml";

// Add StatFrontmatter type for YAML frontmatter

type StatFrontmatter = {
  name?: string;
  value?: number;
  level?: number;
  current?: number;
  required?: number;
  description?: string;
  currentCP?: number;
  totalCP?: number;
  requiredCP?: number;
  code?: string;
};

export interface Stat {
  name: string;
  value: number;
  level: number;
  current: number;
  required: number;
  description?: string;
  currentCP?: number;
  totalCP?: number;
  requiredCP?: number;
  code?: string;
}

export interface StatDebugInfo {
  folderPath: string;
  filesFound: string[];
  parsedStats: Stat[];
  errors: { file: string; error: string }[];
}

// Add LegacyStatData type for legacy stat objects

type LegacyStatData = {
  value?: number;
  level?: number;
  current?: number;
  required?: number;
};

// Add LegacyStatsFrontmatter type for legacy stats frontmatter

type LegacyStatsFrontmatter = {
  stats: Record<string, LegacyStatData>;
};

// Enhanced: Read all .md files in the given folder and aggregate stats, with optional debug info
export async function getStatsFromFolder(
  app: App,
  folderPath: string,
  opts?: { debug?: boolean }
): Promise<Stat[] | StatDebugInfo> {
  const folder = app.vault.getAbstractFileByPath(folderPath);
  const debug = opts?.debug;
  const filesFound: string[] = [];
  const parsedStats: Stat[] = [];
  const errors: { file: string; error: string }[] = [];
  if (!(folder instanceof TFolder)) {
    if (debug) {
      return {
        folderPath,
        filesFound: [],
        parsedStats: [],
        errors: [{ file: folderPath, error: 'Not a folder or not found' }],
      };
    }
    return [];
  }
  for (const file of folder.children) {
    if (file instanceof TFile && file.extension === "md") {
      filesFound.push(file.path);
      try {
        const content = await app.vault.read(file);
        const match = content.match(/^---([\s\S]*?)---/);
        if (!match) throw new Error('No YAML frontmatter');
        const frontmatter = yaml.load(match[1]);
        if (!frontmatter || typeof frontmatter !== "object") throw new Error('Invalid YAML');
        const fm = frontmatter as StatFrontmatter;
        const name = fm.name || file.basename;
        // Use value, fallback to current if value is missing or 0
        let value = fm.value;
        if (typeof value !== 'number' || value === 0) {
          value = fm.current ?? 0;
        }
        const stat: Stat = {
          name,
          value,
          level: fm.level ?? 1,
          current: fm.current ?? 0,
          required: fm.required ?? 100,
          description: fm.description ?? '',
          currentCP: fm.currentCP ?? 0,
          totalCP: fm.totalCP ?? 0,
          requiredCP: fm.requiredCP ?? 0,
          code: fm.code ?? undefined,
        };
        console.log(`[getStatsFromFolder] Loaded stat:`, stat); // Debug log
        parsedStats.push(stat);
      } catch (e: unknown) {
        errors.push({ file: file.path, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  if (debug) {
    return { folderPath, filesFound, parsedStats, errors };
  }
  return parsedStats;
}

// Legacy: single file loader (kept for backward compatibility)
export async function getStatsFromFile(app: App): Promise<Stat[]> {
  const file = app.vault.getAbstractFileByPath("SkillTree/Stat/Stats.md");
  if (!(file instanceof TFile)) return [];
  const content = await app.vault.read(file);
  const match = content.match(/^---([\s\S]*?)---/);
  if (!match) return [];
  const frontmatter = yaml.load(match[1]);
  if (!frontmatter || typeof frontmatter !== "object" || !("stats" in frontmatter)) return [];
  const statsObj = (frontmatter as LegacyStatsFrontmatter).stats;
  if (!statsObj || typeof statsObj !== "object") return [];
  return Object.entries(statsObj).map(([name, data]: [string, LegacyStatData]) => ({
    name,
    value: data.value ?? 0,
    level: data.level ?? 1,
    current: data.current ?? 0,
    required: data.required ?? 100,
  }));
}

export async function resetStatsFile(app: App): Promise<void> {
  const file = app.vault.getAbstractFileByPath("SkillTree/Stat/Stats.md");
  if (!(file instanceof TFile)) return;
  const defaultStats = `---\nstats:\n  Muscle:\n    value: 0\n    level: 1\n    current: 0\n    required: 100\n  Intelligence:\n    value: 0\n    level: 1\n    current: 0\n    required: 100\n  Dexterity:\n    value: 0\n    level: 1\n    current: 0\n    required: 100\n  Charisma:\n    value: 0\n    level: 1\n    current: 0\n    required: 100\n---\n`;
  await app.vault.modify(file, defaultStats);
} 