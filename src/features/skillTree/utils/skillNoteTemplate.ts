import { TFile, Vault } from 'obsidian';

export const SKILL_DASHBOARD_TEMPLATE_PATH = 'SkillTree/Templates/Skill Dashboard.md';

export type SkillNoteTemplateVars = {
    name: string;
    className: string;
    stats?: string[];
    icon?: string;
    iconImage?: string;
    epithet?: string;
    description?: string;
    level?: number;
    currentCP?: number;
    requiredCP?: number;
    totalCP?: number;
};

function yamlEscape(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function statsYaml(stats: string[]): string {
    if (!stats.length) return '  - General';
    return stats.map((s) => `  - ${s}`).join('\n');
}

function fallbackSkillDashboardBody(vars: SkillNoteTemplateVars): string {
    const name = vars.name.trim();
    const className = vars.className.trim();
    const icon = (vars.icon || '').trim() || '◆';
    const iconImage = (vars.iconImage || '').trim();
    const epithet = (vars.epithet || '').trim();
    const description = (vars.description || 'No description provided').trim();
    const stats = vars.stats?.length ? vars.stats : [];
    const level = vars.level ?? 1;
    const currentCP = vars.currentCP ?? 0;
    const requiredCP = vars.requiredCP ?? 100;
    const totalCP = vars.totalCP ?? 0;
    const iconImageLine = iconImage ? `iconImage: "${yamlEscape(iconImage)}"\n` : '';
    const epithetLine = epithet ? `epithet: "${yamlEscape(epithet)}"\n` : '';

    return `---
name: "${yamlEscape(name)}"
class: "${yamlEscape(className)}"
stats:
${statsYaml(stats)}
icon: "${yamlEscape(icon)}"
${iconImageLine}${epithetLine}level: ${level}
currentCP: ${currentCP}
requiredCP: ${requiredCP}
totalCP: ${totalCP}
Description: "${yamlEscape(description)}"
type: skill
cssclasses:
  - skill-dashboard
  - wide-page
---

# ${icon} ${name}

\`\`\`datacorejsx
const { SkillDashboard } = await dc.require(
  dc.headerLink("SkillTree/Templates/Skill Dashboard Engine.md", "SkillDashboard")
);

return function View() {
  return <SkillDashboard />;
}
\`\`\`
`;
}

/**
 * Fill Skill Dashboard.md placeholders. Falls back to an embedded copy if missing.
 */
export async function buildSkillNoteFromTemplate(
    vault: Vault,
    vars: SkillNoteTemplateVars
): Promise<string> {
    const name = vars.name.trim();
    const className = vars.className.trim();
    const icon = (vars.icon || '').trim() || '◆';
    const iconImage = (vars.iconImage || '').trim();
    const epithet = (vars.epithet || '').trim();
    const description = (vars.description || 'No description provided').trim();
    const stats = vars.stats?.length ? vars.stats : [];
    const level = String(vars.level ?? 1);
    const currentCP = String(vars.currentCP ?? 0);
    const requiredCP = String(vars.requiredCP ?? 100);
    const totalCP = String(vars.totalCP ?? 0);

    const file = vault.getAbstractFileByPath(SKILL_DASHBOARD_TEMPLATE_PATH);
    if (!(file instanceof TFile)) {
        return fallbackSkillDashboardBody({
            ...vars,
            name,
            className,
            icon,
            iconImage,
            epithet,
            description,
            stats,
        });
    }

    let content = await vault.read(file);
    const replacements: Record<string, string> = {
        '{{NAME}}': name,
        '{{CLASS}}': className,
        '{{STATS_YAML}}': statsYaml(stats),
        '{{ICON}}': icon,
        '{{ICON_IMAGE}}': iconImage,
        '{{EPITHET}}': epithet,
        '{{DESCRIPTION}}': description,
        '{{LEVEL}}': level,
        '{{CURRENT_CP}}': currentCP,
        '{{REQUIRED_CP}}': requiredCP,
        '{{TOTAL_CP}}': totalCP,
    };

    for (const [token, value] of Object.entries(replacements)) {
        content = content.split(token).join(value);
    }

    return content;
}
