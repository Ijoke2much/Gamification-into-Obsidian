import { Vault, TFile } from 'obsidian';
const matter = require('gray-matter');

// Mobile-safe YAML frontmatter parser
export function parseFrontmatterMobile(content: string): { data: Record<string, any>, content: string } {
  const lines = content.split('\n');
  const firstDashIndex = lines.findIndex(line => line.trim() === '---');

  if (firstDashIndex === -1) {
    return { data: {}, content };
  }

  const secondDashIndex = lines.findIndex((line, index) =>
    index > firstDashIndex && line.trim() === '---'
  );

  if (secondDashIndex === -1) {
    return { data: {}, content };
  }

  const yamlLines = lines.slice(firstDashIndex + 1, secondDashIndex);
  const yamlContent = yamlLines.join('\n');
  const bodyContent = lines.slice(secondDashIndex + 1).join('\n');

  // Enhanced YAML parser for common patterns
  const data: Record<string, any> = {};
  let currentKey = '';
  let currentArrayItems: string[] = [];
  let inArray = false;

  for (let i = 0; i < yamlLines.length; i++) {
    const line = yamlLines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Handle array items (lines starting with -)
    if (trimmed.startsWith('- ')) {
      if (currentKey) {
        const item = trimmed.substring(2).trim();
        // Remove quotes from array items
        const cleanItem = (item.startsWith('"') && item.endsWith('"')) ||
          (item.startsWith("'") && item.endsWith("'"))
          ? item.slice(1, -1) : item;
        currentArrayItems.push(cleanItem);
        inArray = true;
      }
      continue;
    }

    // If we were in an array and hit a non-array line, save the array
    if (inArray && !trimmed.startsWith('- ')) {
      if (currentKey && currentArrayItems.length > 0) {
        data[currentKey] = currentArrayItems;
      }
      currentArrayItems = [];
      inArray = false;
      currentKey = '';
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();

    // Handle empty values (might be followed by array items)
    if (!value) {
      currentKey = key;
      currentArrayItems = [];
      continue;
    }

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse different value types
    if (/^\d+$/.test(value)) {
      data[key] = parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      data[key] = parseFloat(value);
    } else if (value.toLowerCase() === 'true') {
      data[key] = true;
    } else if (value.toLowerCase() === 'false') {
      data[key] = false;
    } else if (value.toLowerCase() === 'null' || value.toLowerCase() === '~') {
      data[key] = null;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      // Inline array parsing
      const arrayContent = value.slice(1, -1).trim();
      if (arrayContent) {
        data[key] = arrayContent.split(',').map(item => {
          const trimmedItem = item.trim();
          return trimmedItem.startsWith('"') && trimmedItem.endsWith('"')
            ? trimmedItem.slice(1, -1)
            : trimmedItem;
        });
      } else {
        data[key] = [];
      }
    } else {
      data[key] = value;
    }

    currentKey = '';
  }

  // Handle any remaining array at the end
  if (inArray && currentKey && currentArrayItems.length > 0) {
    data[currentKey] = currentArrayItems;
  }

  return { data, content: bodyContent };
}

// Mobile detection
export const isMobile = typeof navigator !== 'undefined' &&
  (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()) ||
    window.innerWidth <= 768);

function normVaultPath(path: string): string {
  return path.replace(/\\/g, '/');
}

function pathUnderSkillTreeRoot(path: string): boolean {
  const first = normVaultPath(path).split('/')[0];
  return first !== undefined && first.toLowerCase() === 'skilltree';
}

/**
 * Class notes: SkillTree/.../Class/Note.md (any depth), case-insensitive SkillTree and Class segment.
 * Excludes anything under .../Skills/... so skill files are never treated as classes.
 */
export function isSkillTreeClassNoteFile(file: TFile): boolean {
  const p = normVaultPath(file.path);
  if (!p.toLowerCase().endsWith('.md')) return false;
  if (!pathUnderSkillTreeRoot(p)) return false;
  if (p.toLowerCase().includes('/skills/')) return false;
  const parts = p.split('/');
  const classIdx = parts.findIndex((seg) => seg.toLowerCase() === 'class');
  if (classIdx < 0) return false;
  return classIdx === parts.length - 2;
}

function resolveClassDisplayName(data: Record<string, any>, file: TFile): string {
  const fromYaml =
    data.name ??
    data.Name ??
    data.title ??
    data.Title;
  const trimmed = fromYaml !== undefined && fromYaml !== null ? String(fromYaml).trim() : '';
  if (trimmed) return trimmed;
  return file.basename.replace(/\.md$/i, '').trim() || 'Unnamed class';
}

export interface SkillMetadata {
  name: string;
  class: string;
  classPath: string;
  masterClass: string;
  masterClassPath: string;
  stats: { [statName: string]: string }; // stat name -> stat file path
  description?: string;
  /** Short flavor line (frontmatter: epithet) shown in codex / UI */
  epithet?: string;
  filePath: string;

  // Additional metadata properties for Canvas enhancement
  level?: number;
  /** CP toward current level milestone (YAML: cp or currentCP) */
  cp?: number;
  /** CP required for current milestone (YAML: maxCP or requiredCP) */
  maxCP?: number;
  /** Lifetime CP if tracked separately (YAML: totalCP) */
  totalCP?: number;

  // Icon metadata (for habits, views, etc.)
  icon?: string; // emoji or short text
  iconImage?: string; // vault-relative image / svg path

  /** Optional milestone (YAML: mastered / isMastered) — not tied to a numeric level cap */
  mastered?: boolean;
}

export interface ClassMetadata {
  name: string;
  masterClass: string;
  level: number;
  currentCP: number;
  requiredCP: number;
  totalCP: number;
  description: string;
  /** Short flavor line (frontmatter: tagline) for class identity in UI */
  tagline?: string;
  filePath: string;
  icon?: string;
  iconImage?: string;
}

export interface StatMetadata {
  name: string;
  level: number;
  currentCP: number;
  requiredCP: number;
  totalCP: number;
  description: string;
  filePath: string;
}

/**
 * Gets metadata for a specific skill by name.
 * @param vault Obsidian Vault instance
 * @param skillName Name of the skill to find
 * @returns Promise<SkillMetadata | null> The skill metadata or null if not found
 */
export async function getSkillMetadata(vault: Vault, skillName: string): Promise<SkillMetadata | null> {
  const skills = await getAllSkills(vault);
  const target = skillName.trim().toLowerCase();
  return (
    skills.find(skill => skill.name.trim().toLowerCase() === target) ||
    null
  );
}

/**
 * Scans the vault for all stat files in SkillTree/Master-Class/Stats/*.md
 * and returns a list of stats with metadata.
 * @param vault Obsidian Vault instance
 * @returns Promise<StatMetadata[]> Array of stat metadata
 */
export async function getAllStats(vault: Vault): Promise<StatMetadata[]> {
  const stats: StatMetadata[] = [];
  const allFiles = vault.getAllLoadedFiles();

  for (const file of allFiles) {
    if (file instanceof TFile) {
      if (
        file.path.startsWith('SkillTree/Master-Class/Stats/') &&
        file.path.endsWith('.md')
      ) {
        try {
          const content = await vault.read(file);
          const { data } = matter(content);

          if (data.name) {
            stats.push({
              name: data.name,
              level: data.level || 1,
              currentCP: data.currentCP || 0,
              requiredCP: data.requiredCP || 100,
              totalCP: data.totalCP || 0,
              description: data.Description || data.description || '',
              filePath: file.path
            });
          }
        } catch (error) {
          console.error(`Failed to parse stat file ${file.path}:`, error);
        }
      }
    }
  }

  return stats;
}

/**
 * Scans the vault for class files under SkillTree/.../Class/*.md (flexible path;
 * SkillTree + Class segment are case-insensitive). Names default from frontmatter
 * (name / title) or the note filename.
 * @param vault Obsidian Vault instance
 * @returns Promise<ClassMetadata[]> Array of class metadata
 */
export async function getAllClasses(vault: Vault): Promise<ClassMetadata[]> {
  const classes: ClassMetadata[] = [];
  const seenNamesLower = new Set<string>();
  const allFiles = vault.getAllLoadedFiles();

  for (const file of allFiles) {
    if (!(file instanceof TFile)) continue;
    if (!isSkillTreeClassNoteFile(file)) continue;

    try {
      const content = await vault.read(file);
      const { data } = isMobile ? parseFrontmatterMobile(content) : matter(content);

      if (isMobile) {
        console.log('📱 [Mobile] Parsing class file:', file.path, 'Data:', data);
      }

      const name = resolveClassDisplayName(data, file);
      const dedupeKey = name.toLowerCase();
      if (seenNamesLower.has(dedupeKey)) continue;
      seenNamesLower.add(dedupeKey);

      const rawTag = data.tagline ?? data.Tagline;
      const taglineStr =
        rawTag !== undefined && rawTag !== null ? String(rawTag).trim() : '';

      classes.push({
        name,
        masterClass:
          String(data.masterClass ?? data.MasterClass ?? data.master ?? '').trim() ||
          'Jester',
        level: data.level || 1,
        currentCP: data.currentCP || 0,
        requiredCP: data.requiredCP || 100,
        totalCP: data.totalCP || 0,
        description: data.Description || data.description || '',
        tagline: taglineStr || undefined,
        filePath: file.path,
        icon: data.icon,
        iconImage: data.iconImage
      });
    } catch (error) {
      console.error(`Failed to parse class file ${file.path}:`, error);
    }
  }

  classes.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  return classes;
}

// Skills cache for faster modal open (avoids re-scanning vault on every open)
let skillsCache: SkillMetadata[] | null = null;
let skillsCacheTime = 0;
const SKILLS_CACHE_TTL_MS = 45_000; // 45 seconds

export function clearSkillsCache(): void {
  skillsCache = null;
  skillsCacheTime = 0;
}

/**
 * Scans the vault for all skills in SkillTree/*Skills*.md, parses their YAML frontmatter,
 * and returns a list of skills with metadata. Results are cached for 45s for faster modal open.
 * @param vault Obsidian Vault instance
 * @returns Promise<SkillMetadata[]> Array of skill metadata
 */
export async function getAllSkills(vault: Vault): Promise<SkillMetadata[]> {
  const now = Date.now();
  if (skillsCache && (now - skillsCacheTime) < SKILLS_CACHE_TTL_MS) {
    return skillsCache;
  }

  const skills: SkillMetadata[] = [];
  const allFiles = vault.getAllLoadedFiles();

  if (isMobile) {
    console.log('📱 [Mobile] getAllSkills called, total files:', allFiles.length);
    const skillFiles = allFiles.filter(f =>
      f.path.startsWith('SkillTree/') &&
      f.path.includes('/Skills/') &&
      f.path.endsWith('.md')
    );
    console.log('📱 [Mobile] Found potential skill files:', skillFiles.map(f => f.path));
  }

  for (const file of allFiles) {
    if (file instanceof TFile) {
      if (
        file.path.startsWith('SkillTree/') &&
        file.path.includes('/Skills/') &&
        file.path.endsWith('.md')
      ) {
        const content = await vault.read(file);
        const { data } = isMobile ? parseFrontmatterMobile(content) : matter(content);

        if (isMobile) {
          console.log('📱 [Mobile] Parsing skill file:', file.path);
          console.log('📱 [Mobile] Raw content preview:', content.substring(0, 200));
          console.log('📱 [Mobile] Parsed data:', data);
          console.log('📱 [Mobile] Has required fields?', {
            hasName: !!data.name,
            hasClass: !!data.class,
            hasStats: !!data.stats,
            name: data.name,
            class: data.class,
            stats: data.stats
          });
        }
        if (data.name && data.class && data.stats) {
          // Expected pathParts: [SkillTree, Master-Class, <MasterName>, Skills, <Skill>.md]
          const pathParts = file.path.split('/');
          const mcIdx = pathParts.findIndex((p) => p === 'Master-Class');
          const className = data.class as string; // From YAML
          // Class files are stored at SkillTree/Master-Class/Class/<Class>.md
          const classPath = `SkillTree/Master-Class/Class/${className}.md`;

          // Derive master class by reading the class file's frontmatter if available
          let masterClass: string | undefined;
          try {
            const clsFile = vault.getAbstractFileByPath(classPath);
            if (clsFile instanceof TFile) {
              const clsContent = await vault.read(clsFile);
              const { data: clsData } = isMobile ? parseFrontmatterMobile(clsContent) : matter(clsContent);
              masterClass = (clsData.master || clsData.masterClass) as string | undefined;
            }
          } catch {
            // ignore
          }
          // Fallback: if folder structure includes a master between Master-Class and Skills, use it
          if (!masterClass && mcIdx >= 0 && pathParts[mcIdx + 1] && pathParts[mcIdx + 1] !== 'Skills') {
            masterClass = pathParts[mcIdx + 1];
          }

          // Find the actual master class file in the master class folder
          let masterClassPath = masterClass ? `SkillTree/Master-Class/${masterClass}/${masterClass}.md` : '';
          const masterClassFiles = allFiles.filter(f =>
            f instanceof TFile &&
            f.path.startsWith(`SkillTree/Master-Class/`) &&
            f.path.endsWith('.md') &&
            !f.path.includes('/Class/') &&
            !f.path.includes('/Skills/') &&
            !f.path.includes('/Stat/') &&
            !f.path.includes('/Stats/')
          );
          if (masterClassFiles.length > 0) {
            if (masterClass) {
              // Prefer a file that matches the master name
              const exact = masterClassFiles.find(f => f.path === `SkillTree/Master-Class/${masterClass}.md` || f.path.endsWith(`/${masterClass}.md`));
              masterClassPath = (exact || masterClassFiles[0]).path;
            } else {
              masterClassPath = masterClassFiles[0].path;
            }
          }
          // Stats are in SkillTree/Master-Class/Stats/<Stat>.md
          const statsArr = Array.isArray(data.stats) ? data.stats : [data.stats];
          const stats: { [statName: string]: string } = {};
          for (const statNameRaw of statsArr) {
            const statName = String(statNameRaw || '').trim();
            if (!statName) continue;
            stats[statName] = `SkillTree/Master-Class/Stats/${statName}.md`;
          }
          const epithetRaw = data.epithet ?? data.Epithet ?? data.tagline ?? data.Tagline;
          const epithetStr =
            epithetRaw !== undefined && epithetRaw !== null
              ? String(epithetRaw).trim()
              : '';
          const cpRaw = data.cp ?? data.currentCP ?? data.CP;
          const cpNum =
            typeof cpRaw === 'number' && !Number.isNaN(cpRaw)
              ? cpRaw
              : parseInt(String(cpRaw ?? 0), 10) || 0;
          const reqRaw = data.maxCP ?? data.requiredCP ?? data.RequiredCP;
          let maxCPNum: number | undefined;
          if (reqRaw !== undefined && reqRaw !== null && reqRaw !== '') {
            const n =
              typeof reqRaw === 'number' && !Number.isNaN(reqRaw)
                ? reqRaw
                : parseInt(String(reqRaw), 10);
            maxCPNum = n > 0 ? n : undefined;
          }
          const totalRaw = data.totalCP ?? data.TotalCP;
          const totalNum =
            totalRaw !== undefined && totalRaw !== null && totalRaw !== ''
              ? (typeof totalRaw === 'number' && !Number.isNaN(totalRaw)
                  ? totalRaw
                  : parseInt(String(totalRaw), 10)) || cpNum
              : cpNum;

          const masteredRaw = data.mastered ?? data.isMastered ?? data.Mastered;
          const mastered =
            masteredRaw === true ||
            masteredRaw === 'true' ||
            String(masteredRaw).toLowerCase() === 'yes';

          skills.push({
            name: data.name,
            class: className,
            classPath,
            masterClass: masterClass || '',
            masterClassPath,
            stats,
            description: data.Description || data.description,
            epithet: epithetStr || undefined,
            filePath: file.path,
            level: data.level,
            cp: cpNum,
            maxCP: maxCPNum,
            totalCP: totalNum,
            icon: data.icon,
            iconImage: data.iconImage,
            mastered: mastered || undefined
          });
        }
      }
    }
  }

  if (isMobile) {
    console.log('📱 [Mobile] getAllSkills final results:', {
      totalSkillsFound: skills.length,
      skillNames: skills.map(s => s.name),
      skillPaths: skills.map(s => s.filePath)
    });
  }

  skillsCache = skills;
  skillsCacheTime = Date.now();
  return skills;
} 