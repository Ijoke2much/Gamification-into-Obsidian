import { TFile, Vault } from 'obsidian';

export const CLASS_DASHBOARD_TEMPLATE_PATH = 'SkillTree/Templates/Class Dashboard.md';

export type ClassNoteTemplateVars = {
    name: string;
    masterClass: string;
    tagline?: string;
    icon?: string;
    iconImage?: string;
    description?: string;
    level?: number;
    currentCP?: number;
    requiredCP?: number;
    totalCP?: number;
};

function yamlEscape(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function fallbackClassDashboardBody(vars: ClassNoteTemplateVars): string {
    const name = vars.name.trim();
    const master = (vars.masterClass || 'Jester').trim() || 'Jester';
    const icon = (vars.icon || '').trim() || '❖';
    const tagline = (vars.tagline || '').trim();
    const iconImage = (vars.iconImage || '').trim();
    const description = (vars.description || 'No description provided').trim();
    const level = vars.level ?? 1;
    const currentCP = vars.currentCP ?? 0;
    const requiredCP = vars.requiredCP ?? 100;
    const totalCP = vars.totalCP ?? 0;

    const iconImageLine = iconImage ? `iconImage: "${yamlEscape(iconImage)}"\n` : '';
    const taglineLine = tagline ? `tagline: "${yamlEscape(tagline)}"\n` : 'tagline: ""\n';

    return `---
name: "${yamlEscape(name)}"
masterClass: "${yamlEscape(master)}"
${taglineLine}icon: "${yamlEscape(icon)}"
${iconImageLine}level: ${level}
currentCP: ${currentCP}
requiredCP: ${requiredCP}
totalCP: ${totalCP}
description: "${yamlEscape(description)}"
type: class
cssclasses:
  - class-dashboard
  - wide-page
---

# ${icon} ${name}

\`\`\`datacorejsx
const { ClassDashboard } = await dc.require(
  dc.headerLink("SkillTree/Templates/Class Dashboard Engine.md", "ClassDashboard")
);

return function View() {
  return <ClassDashboard />;
}
\`\`\`
`;
}

/**
 * Fill Class Dashboard.md placeholders. Falls back to an embedded copy if the vault template is missing.
 */
export async function buildClassNoteFromTemplate(
    vault: Vault,
    vars: ClassNoteTemplateVars
): Promise<string> {
    const name = vars.name.trim();
    const master = (vars.masterClass || 'Jester').trim() || 'Jester';
    const icon = (vars.icon || '').trim() || '❖';
    const tagline = (vars.tagline || '').trim();
    const iconImage = (vars.iconImage || '').trim();
    const description = (vars.description || 'No description provided').trim();
    const level = String(vars.level ?? 1);
    const currentCP = String(vars.currentCP ?? 0);
    const requiredCP = String(vars.requiredCP ?? 100);
    const totalCP = String(vars.totalCP ?? 0);

    const file = vault.getAbstractFileByPath(CLASS_DASHBOARD_TEMPLATE_PATH);
    if (!(file instanceof TFile)) {
        return fallbackClassDashboardBody({
            ...vars,
            name,
            masterClass: master,
            icon,
            tagline,
            iconImage,
            description,
        });
    }

    let content = await vault.read(file);
    const replacements: Record<string, string> = {
        '{{NAME}}': name,
        '{{MASTER_CLASS}}': master,
        '{{TAGLINE}}': tagline,
        '{{ICON}}': icon,
        '{{ICON_IMAGE}}': iconImage,
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
