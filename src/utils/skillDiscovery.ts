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
          // pathParts: [SkillTree, Master-Class, Skills, Skill.md]
          const pathParts = file.path.split('/');
          const masterClass = pathParts[1];
          const className = data.class; // Use from YAML
          const classPath = `SkillTree/${masterClass}/Class/${className}.md`;
          const masterClassPath = `SkillTree/${masterClass}/${masterClass}.md`;
          // Stats are in SkillTree/<MasterClass>/Stat/<Stat>.md
          const statsArr = Array.isArray(data.stats) ? data.stats : [data.stats];
          const stats: { [statName: string]: string } = {};
          for (const statName of statsArr) {
            stats[statName] = `SkillTree/${masterClass}/Stat/${statName}.md`;
          }
          skills.push({
            name: data.name,
            class: className,
            classPath,
            masterClass,
            masterClassPath,
            stats,
            description: data.description,
            filePath: file.path,
          });
        }
      }
    }
  }
  return skills;
} 