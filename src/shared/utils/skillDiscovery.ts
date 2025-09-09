import { Vault, TFile } from 'obsidian';
import matter from 'gray-matter';

export interface SkillMetadata {
  name: string;
  class: string;
  classPath: string;
  masterClass: string;
  masterClassPath: string;
  stats: { [statName: string]: string }; // stat name -> stat file path
  description?: string;
  filePath: string;

  // Additional metadata properties for Canvas enhancement
  level?: number;
  cp?: number;
  maxCP?: number;
}

export interface ClassMetadata {
  name: string;
  masterClass: string;
  level: number;
  currentCP: number;
  requiredCP: number;
  totalCP: number;
  description: string;
  filePath: string;
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
              description: data.description || '',
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
 * Scans the vault for all class files in SkillTree/Master-Class/Class/*.md
 * and returns a list of classes with metadata.
 * @param vault Obsidian Vault instance
 * @returns Promise<ClassMetadata[]> Array of class metadata
 */
export async function getAllClasses(vault: Vault): Promise<ClassMetadata[]> {
  const classes: ClassMetadata[] = [];
  const allFiles = vault.getAllLoadedFiles();

  for (const file of allFiles) {
    if (file instanceof TFile) {
      if (
        file.path.startsWith('SkillTree/Master-Class/Class/') &&
        file.path.endsWith('.md')
      ) {
        try {
          const content = await vault.read(file);
          const { data } = matter(content);

          if (data.name) {
            classes.push({
              name: data.name,
              masterClass: data.masterClass || 'Jester',
              level: data.level || 1,
              currentCP: data.currentCP || 0,
              requiredCP: data.requiredCP || 100,
              totalCP: data.totalCP || 0,
              description: data.description || '',
              filePath: file.path
            });
          }
        } catch (error) {
          console.error(`Failed to parse class file ${file.path}:`, error);
        }
      }
    }
  }

  return classes;
}

/**
 * Scans the vault for all skills in SkillTree/*Skills*.md, parses their YAML frontmatter,
 * and returns a list of skills with metadata.
 *  Obsidian Vault instance
 */
export async function getAllSkills(vault: Vault): Promise<SkillMetadata[]> {
  const skills: SkillMetadata[] = [];
  const allFiles = vault.getAllLoadedFiles();
  for (const file of allFiles) {
    if (file instanceof TFile) {
      if (
        file.path.startsWith('SkillTree/') &&
        file.path.includes('/Skills/') &&
        file.path.endsWith('.md')
      ) {
        const content = await vault.read(file);
        const { data } = matter(content);
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
              const { data: clsData } = matter(clsContent);
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
          skills.push({
            name: data.name,
            class: className,
            classPath,
            masterClass: masterClass || '',
            masterClassPath,
            stats,
            description: data.description,
            filePath: file.path,
            level: data.level,
            cp: data.cp,
            maxCP: data.maxCP
          });
        }
      }
    }
  }
  return skills;
} 