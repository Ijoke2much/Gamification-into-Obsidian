import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { TFile, WorkspaceLeaf } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import { getAllSkills, getAllClasses, getAllStats, SkillMetadata, ClassMetadata, StatMetadata, parseFrontmatterMobile, isMobile, clearSkillsCache } from '../../../shared/utils/skillDiscovery';
import { SkillRealmMap } from '../components/SkillRealmMap';
import { SkillCodexDetail } from '../components/SkillCodexDetail';
import { skillToProgressView } from '../utils/skillProgressView';
import { syncClassSkillEdgesOnCanvas } from '../utils/canvasClassSkillSync';
import { readPlayerData } from '../../../features/player/utils/playerDataUtils';
import { useMasterClassProgress } from '../../../features/player/hooks/useMasterClassProgress';
import styles from './SkillTreeModal.module.css';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
const matter = require('gray-matter');

interface CanvasNode {
    id: string;
    type: string;
    text?: string;
    file?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
}

interface CanvasEdge {
    id: string;
    fromNode: string;
    toNode: string;
    fromSide: string;
    toSide: string;
    color: string;
    width: number;
}

interface CanvasData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    metadata?: {
        version: string;
        frontmatter: {
            type: string;
            title: string;
            description: string;
        };
    };
}

export type SkillTreeModalTab = 'overview' | 'mobile' | 'manage' | 'create';

interface SkillTreeModalProps {
    isOpen: boolean;
    onClose: () => void;
    plugin: GamifiedObsidianPlugin;
    initialTab?: SkillTreeModalTab;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
    isOpen,
    onClose,
    plugin,
    initialTab = 'mobile'
}) => {
    const [activeTab, setActiveTab] = useState<SkillTreeModalTab>(initialTab);
    const [skills, setSkills] = useState<SkillMetadata[]>([]);
    const [classes, setClasses] = useState<Record<string, SkillMetadata[]>>({});
    const [allClasses, setAllClasses] = useState<ClassMetadata[]>([]);
    const [allStats, setAllStats] = useState<StatMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [iconEditSkillPath, setIconEditSkillPath] = useState<string | null>(null);
    const [iconEditValue, setIconEditValue] = useState<string>('');
    
    const [codexSkill, setCodexSkill] = useState<SkillMetadata | null>(null);
    const [playerMasterClass, setPlayerMasterClass] = useState('');
    
    const { classIcon: masterClassIcon, progress: masterClassProgress } =
        useMasterClassProgress(plugin, playerMasterClass || undefined);
    
    // Create form states
    const [createType, setCreateType] = useState<'skill' | 'class'>('skill');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        /** Class frontmatter — short flavor */
        tagline: '',
        /** Skill frontmatter — short flavor */
        epithet: '',
        class: '',
        stats: [] as string[],
        category: '',
        showStatsDropdown: false,
        icon: '',
        iconImage: ''
    });

    // Load skill data
    useEffect(() => {
        if (isOpen) {
            loadSkillData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setCodexSkill(null);
        }
    }, [isOpen]);

    const loadSkillData = async () => {
        try {
            setIsLoading(true);
            clearSkillsCache();
            
            const allSkills = await getAllSkills(plugin.app.vault);
            const allClassesData = await getAllClasses(plugin.app.vault);
            const allStatsData = await getAllStats(plugin.app.vault);
            const playerData = await readPlayerData(plugin.app.vault);
            setPlayerMasterClass(playerData?.masterClass ?? '');
            
            // No need to filter - getAllSkills already returns only skills
            setSkills(allSkills);
            setAllClasses(allClassesData);
            setAllStats(allStatsData);
            
            // Group skills by class
            const classGroups = allSkills.reduce((acc, skill) => {
                if (!acc[skill.class]) acc[skill.class] = [];
                acc[skill.class].push(skill);
                return acc;
            }, {} as Record<string, SkillMetadata[]>);
            
            // Add all class files to ensure they're counted even if they have no skills
            allClassesData.forEach(classItem => {
                if (!classGroups[classItem.name]) {
                    classGroups[classItem.name] = [];
                }
            });
            
            setClasses(classGroups);

            // Keep canvas in sync with all existing classes
            await ensureClassesOnCanvas(allClassesData);

            const canvasOpen = plugin.app.workspace.getLeavesOfType('canvas').some((leaf: WorkspaceLeaf) => {
                const view = leaf.view as { file?: TFile } | undefined;
                return view?.file?.path === 'SkillTree/SkillTree.canvas';
            });
            const edgeSync = await syncClassSkillEdgesOnCanvas(
                plugin.app.vault,
                allSkills,
                () => canvasOpen
            );
            if (edgeSync.added > 0) {
                console.log(`[Gamified] Skill canvas: added ${edgeSync.added} class→skill edge(s)`);
            }
        } catch (error) {
            console.error('Failed to load skill data:', error);
            showNotice('❌ Failed to load skill data');
        } finally {
            setIsLoading(false);
        }
    };

    const showNotice = (message: string) => {
        pixelNotice(message);
    };

    /**
     * Helper to serialize frontmatter in a mobile-safe way, preserving arrays.
     */
    const buildYamlFromData = (data: Record<string, any>): string => {
        const lines: string[] = ['---'];

        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
                lines.push(`${key}:`);
                value.forEach((item) => {
                    const serialized =
                        typeof item === 'string'
                            ? `"${item.replace(/"/g, '\\"')}"`
                            : item;
                    lines.push(`  - ${serialized}`);
                });
            } else if (value === null || value === undefined) {
                lines.push(`${key}:`);
            } else if (typeof value === 'string') {
                lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
            } else {
                lines.push(`${key}: ${value}`);
            }
        }

        lines.push('---');
        return lines.join('\n');
    };

    const handleCanvasView = async () => {
        try {
            const canvasFile = plugin.app.vault.getAbstractFileByPath('SkillTree/SkillTree.canvas');
            if (canvasFile && canvasFile instanceof TFile) {
                const leaf = plugin.app.workspace.getLeaf();
                await leaf.openFile(canvasFile);
                onClose();
            } else {
                const shouldCreate = confirm('No SkillTree.canvas file found. Would you like to create one?');
                if (shouldCreate) {
                    await createInitialCanvas();
                }
            }
        } catch (error) {
            console.error('Failed to open canvas:', error);
            showNotice('❌ Failed to open canvas file');
        }
    };

    /**
     * Update the icon frontmatter for a specific skill file.
     * If the icon property does not exist, it will be created.
     */
    const openSkillIconEditor = (skill: SkillMetadata) => {
        setIconEditSkillPath(skill.filePath);
        setIconEditValue((skill.icon || '').trim());
    };

    const cancelSkillIconEditor = () => {
        setIconEditSkillPath(null);
        setIconEditValue('');
    };

    const saveSkillIcon = async (skill: SkillMetadata) => {
        try {
            const newIcon = (iconEditSkillPath === skill.filePath ? iconEditValue : skill.icon || '').trim();

            const file = plugin.app.vault.getAbstractFileByPath(skill.filePath);
            if (!file || !(file instanceof TFile)) {
                showNotice('❌ Skill file not found');
                return;
            }

            const rawContent = await plugin.app.vault.read(file);
            const { data, content: markdownContent } = isMobile
                ? parseFrontmatterMobile(rawContent)
                : matter(rawContent);

            const updatedData: Record<string, any> = { ...data };

            if (newIcon) {
                // Create or update icon property
                updatedData.icon = newIcon;
            } else {
                // Remove icon if user cleared the value
                delete updatedData.icon;
            }

            let updatedContent: string;

            if (isMobile) {
                // Mobile-safe YAML writer (mirrors skillBasedBattleEngine.ts)
                const yamlLines = [
                    '---',
                    ...Object.entries(updatedData).map(([key, value]) =>
                        `${key}: ${typeof value === 'string' ? `"${value}"` : value}`
                    ),
                    '---'
                ];
                updatedContent = yamlLines.join('\n') + '\n' + markdownContent;
            } else {
                updatedContent = matter.stringify(markdownContent, updatedData);
            }

            await plugin.app.vault.modify(file, updatedContent);

            showNotice('✅ Skill icon updated');

            // Clear editor state
            setIconEditSkillPath(null);
            setIconEditValue('');

            // Reload skill data so UI reflects the new icon
            await loadSkillData();
        } catch (error: any) {
            console.error('Failed to update skill icon:', error);
            const message =
                error && typeof error === 'object' && 'message' in error
                    ? String(error.message)
                    : String(error);
            showNotice(`❌ Failed to update skill icon: ${message}`);
        }
    };

    /**
     * Update the icon frontmatter for the class associated with a skill.
     * If the icon property does not exist, it will be created.
     */
    const handleClassIconChangeForSkill = async (skill: SkillMetadata) => {
        try {
            const classMeta: ClassMetadata | undefined = allClasses.find(
                (cls) => cls.name === skill.class
            );

            if (!classMeta) {
                showNotice(`❌ Class "${skill.class}" not found`);
                return;
            }

            const defaultValue = (classMeta.icon || '').trim();
            const input = window.prompt(
                `Enter a new icon for class "${classMeta.name}".\n\nUse an emoji or short label. Leave empty to remove the icon.`,
                defaultValue
            );

            if (input === null) {
                return;
            }

            const newIcon = input.trim();

            const file = plugin.app.vault.getAbstractFileByPath(classMeta.filePath);
            if (!file || !(file instanceof TFile)) {
                showNotice('❌ Class file not found');
                return;
            }

            const rawContent = await plugin.app.vault.read(file);
            const parsed = isMobile ? parseFrontmatterMobile(rawContent) : matter(rawContent);
            const data = { ...parsed.data } as Record<string, any>;

            if (newIcon) {
                data.icon = newIcon;
            } else {
                delete data.icon;
            }

            const updatedContent = isMobile
                ? `${buildYamlFromData(data)}\n${parsed.content}`
                : matter.stringify(parsed.content, data);
            await plugin.app.vault.modify(file, updatedContent);

            showNotice('✅ Class icon updated');

            // Reload data so any class-derived views stay in sync
            await loadSkillData();
        } catch (error) {
            console.error('Failed to update class icon:', error);
            showNotice('❌ Failed to update class icon');
        }
    };

    const createInitialCanvas = async () => {
        try {
            const initialCanvas: CanvasData = {
                "nodes": [
                    {
                        "id": "jester-master",
                        "type": "file",
                        "file": "SkillTree/Master-Class/Jester 🎭.md",
                        "x": 400,
                        "y": 50,
                        "width": 300,
                        "height": 120
                    }
                ],
                "edges": [],
                "metadata": {
                    "version": "1.0-1.0",
                    "frontmatter": {
                        "type": "canvas",
                        "title": "Skill Tree",
                        "description": "Visual representation of skills and progression"
                    }
                }
            };
    
            await plugin.app.vault.create('SkillTree/SkillTree.canvas', JSON.stringify(initialCanvas, null, 2));
            showNotice('✅ Created initial canvas file');
            
            // Open the newly created canvas
            await handleCanvasView();
        } catch (error) {
            console.error('Failed to create canvas:', error);
            showNotice('❌ Failed to create canvas file');
        }
    };

    const handleSkillEdit = async (skill: SkillMetadata) => {
        try {
            const file = plugin.app.vault.getAbstractFileByPath(skill.filePath);
            if (file && file instanceof TFile) {
                const leaf = plugin.app.workspace.getLeaf();
                await leaf.openFile(file);
                setCodexSkill(null);
                onClose();
            }
        } catch (error) {
            console.error('Failed to open skill file:', error);
            showNotice('❌ Failed to open skill file');
        }
    };

    const handleCreateNew = async () => {
        if (!formData.name.trim()) {
            showNotice('❌ Name is required');
            return;
        }

        try {
            if (createType === 'skill') {
                // Validate skill requirements
                if (!formData.class.trim()) {
                    showNotice('❌ Skill must be assigned to a class');
                    return;
                }
                if (formData.stats.length === 0) {
                    showNotice('❌ Skill must have associated stats');
                    return;
                }
                await createNewSkill();
            } else if (createType === 'class') {
                await createNewClass();
            }
            
            // Reset form
            setFormData({
                name: '',
                description: '',
                tagline: '',
                epithet: '',
                class: '',
                stats: [],
                category: '',
                showStatsDropdown: false,
                icon: '',
                iconImage: ''
            });
            
            // Reload data
            await loadSkillData();
        } catch (error) {
            console.error('Failed to create:', error);
            showNotice(`❌ Failed to create ${createType}: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const createNewSkill = async () => {
        const name = formData.name.trim();
        const statsArray = formData.stats;
        const skillPath = `SkillTree/Master-Class/Skills/${name}.md`;
        const iconLine = formData.icon ? `icon: "${formData.icon}"\n` : '';
        const iconImageLine = formData.iconImage ? `iconImage: "${formData.iconImage}"\n` : '';
        const epithet = formData.epithet.trim();
        const epithetLine = epithet
            ? `epithet: "${epithet.replace(/"/g, '\\"')}"\n`
            : '';
        
        const content = `---
name: ${name}
class: ${formData.class.trim()}
stats:
${statsArray.map(s => `  - ${s}`).join('\n')}
${iconLine}${iconImageLine}${epithetLine}level: 1
currentCP: 0
requiredCP: 100
totalCP: 0
Description: ${formData.description}
---

# ${name}

${epithet ? `> *${epithet}*\n\n` : ''}${formData.description}

## Class Assignment
This skill belongs to the **${formData.class.trim()}** class.

## Associated Stats
${statsArray.map(stat => `- **${stat}**: Primary stat that affects this skill`).join('\n')}

## Progression
- Level 1: Unlocked
- Level 2: Requires 100 CP
- Level 3: Requires 250 CP
- Level 4: Requires 500 CP
- Level 5: Requires 1000 CP

## Usage
This skill can be used in various activities and quests.
`;
    
                await plugin.app.vault.create(skillPath, content);
                showNotice(`✅ Created skill "${name}" assigned to ${formData.class.trim()}`);
                
                // Add to canvas
                await addSkillToCanvas(name, formData.class.trim());
            };

            const createNewClass = async () => {
                const name = formData.name.trim();
                const classPath = `SkillTree/Master-Class/Class/${name}.md`;
                const iconLine = formData.icon ? `icon: "${formData.icon}"\n` : '';
                const iconImageLine = formData.iconImage ? `iconImage: "${formData.iconImage}"\n` : '';
                const tagline = formData.tagline.trim();
                const taglineLine = tagline
                    ? `tagline: "${tagline.replace(/"/g, '\\"')}"\n`
                    : '';
                
                const content = `---
name: ${name}
masterClass: Jester
${iconLine}${iconImageLine}${taglineLine}level: 1
currentCP: 0
requiredCP: 100
totalCP: 0
description: ${formData.description || 'No description provided'}
---

# ${name}

${tagline ? `> *${tagline}*\n\n` : ''}## Class Overview
This class represents a specialized path within the skill tree.

## Skills
- No skills assigned yet

## Progression
- Level 1: Unlocked
- Level 2: Requires 100 CP
- Level 3: Requires 250 CP
- Level 4: Requires 500 CP
- Level 5: Requires 1000 CP

## Master Class
This class belongs to the **Jester** master class.
`;
            
                await plugin.app.vault.create(classPath, content);
                showNotice(`✅ Created class "${name}"`);
                
                // Add to canvas (as a standalone node – you can drag it near Jester)
                await addClassToCanvas(name);
            };

    const addSkillToCanvas = async (skillName: string, className: string) => {
        try {
            const name = skillName.trim();
            const classDisplayName = className.trim();

            const canvasFile = plugin.app.vault.getAbstractFileByPath('SkillTree/SkillTree.canvas');
            if (!canvasFile || !(canvasFile instanceof TFile)) {
                showNotice('❌ Canvas file not found. Please create it first.');
                return;
            }

            const content = await plugin.app.vault.read(canvasFile);
            const canvasData: CanvasData = JSON.parse(content);

            // Find the class node
            const classNode = canvasData.nodes.find((node: CanvasNode) => 
                node.file === `SkillTree/Master-Class/Class/${classDisplayName}.md`
            );

            if (!classNode) {
                showNotice(`❌ Class node "${className}" not found in canvas`);
                return;
            }

            // Avoid creating duplicate nodes for the same skill file
            const existingSkillNode = canvasData.nodes.find((node: CanvasNode) =>
                node.file === `SkillTree/Master-Class/Skills/${name}.md`
            );

            if (existingSkillNode) {
                // Skill node already exists on canvas, do not add another
                return;
            }

            // Calculate position for new skill node (below the class)
            const skillX = classNode.x;
            const skillY = classNode.y + classNode.height + 50;

            // Create new skill node
            const newNode: CanvasNode = {
                "id": `skill-${name.toLowerCase().replace(/\s+/g, '-')}`,
                "type": "file",
                "file": `SkillTree/Master-Class/Skills/${name}.md`,
                "x": skillX,
                "y": skillY,
                "width": 160,
                "height": 60
            };

            // Create connection from class to skill
            const newEdge = {
                "id": `edge-${classNode.id}-${newNode.id}`,
                "fromNode": classNode.id,
                "toNode": newNode.id,
                "fromSide": "bottom",
                "toSide": "top",
                "color": "#6b7280",
                "width": 2
            };

            canvasData.nodes.push(newNode);
            canvasData.edges.push(newEdge);

            await plugin.app.vault.modify(canvasFile, JSON.stringify(canvasData, null, 2));
            
        } catch (error) {
            console.error('Failed to add skill to canvas:', error);
            showNotice('❌ Failed to add skill to canvas');
        }
    };

    const addClassToCanvas = async (className: string) => {
        try {
            const name = className.trim();

            // IMPORTANT: Avoid modifying the canvas file while it is open in a Canvas view.
            // Obsidian will happily overwrite external changes when the view autosaves,
            // which would make our newly-added nodes disappear.
            const canvasLeaves = plugin.app.workspace.getLeavesOfType('canvas');
            const canvasOpenForSkillTree = canvasLeaves.some((leaf: WorkspaceLeaf) => {
                // Canvas views expose a `file` property on their view instance, but the
                // core Obsidian typings don't model the CanvasView explicitly. We use a
                // lightweight structural type here rather than `any` to keep linting happy.
                const view = leaf.view as { file?: TFile } | undefined;
                return view?.file?.path === 'SkillTree/SkillTree.canvas';
            });

            if (canvasOpenForSkillTree) {
                showNotice('⚠️ Please close the SkillTree canvas tab before creating new classes so they can be saved. Then reopen it from the Skill Tree Manager.');
                return;
            }

            const canvasFile = plugin.app.vault.getAbstractFileByPath('SkillTree/SkillTree.canvas');
            if (!canvasFile || !(canvasFile instanceof TFile)) {
                showNotice('❌ Canvas file not found. Please create it first.');
                return;
            }

            window.console.log('[SkillTreeModal] addClassToCanvas: updating canvas file at', canvasFile.path, 'for class', name);

            const content = await plugin.app.vault.read(canvasFile);
            const canvasData: CanvasData = JSON.parse(content);

            // Find the Jester master class node (we only use this to position near it)
            const masterNode = canvasData.nodes.find((node: CanvasNode) => 
                node.file === 'SkillTree/Master-Class/Jester 🎭.md'
            );

            if (!masterNode) {
                showNotice('❌ Jester master class node not found in canvas');
                return;
            }

            // If this class already has a node, don't add a duplicate
            const existingClassNode = canvasData.nodes.find((node: CanvasNode) =>
                node.file === `SkillTree/Master-Class/Class/${name}.md`
            );

            if (existingClassNode) {
                window.console.log('[SkillTreeModal] addClassToCanvas: node already exists for', name, '→ skipping');
                return;
            }

            // Calculate position for new class node
            const existingClasses = canvasData.nodes.filter((node: CanvasNode) => 
                node.id !== masterNode.id && node.file && node.file.includes('SkillTree/Master-Class/Class/')
            );
            const classCount = existingClasses.length;
            
            // Position classes in a loose arc near the master node (but not connected)
            const angle = (classCount * 60) * (Math.PI / 180); // 60 degrees apart
            const radius = 260; // slightly farther so it's clearly separate
            const x = masterNode.x + Math.cos(angle) * radius;
            const y = masterNode.y + masterNode.height + 80 + Math.sin(angle) * radius;

            // Create new class node (no edge – user can manually connect / add portal via properties)
            const newNode: CanvasNode = {
                "id": `class-${name.toLowerCase().replace(/\s+/g, '-')}`,
                "type": "file",
                "file": `SkillTree/Master-Class/Class/${name}.md`,
                "x": Math.round(x),
                "y": Math.round(y),
                "width": 200,
                "height": 80
            };

            window.console.log('[SkillTreeModal] addClassToCanvas: nodes before push', canvasData.nodes.length);
            canvasData.nodes.push(newNode);
            window.console.log('[SkillTreeModal] addClassToCanvas: nodes after push', canvasData.nodes.length);

            await plugin.app.vault.modify(canvasFile, JSON.stringify(canvasData, null, 2));

            // Verify that the node actually exists after write
            const verifyContent = await plugin.app.vault.read(canvasFile);
            const verifyData: CanvasData = JSON.parse(verifyContent);
            const persistedNode = verifyData.nodes.find((node: CanvasNode) => 
                node.file === `SkillTree/Master-Class/Class/${name}.md`
            );

            if (!persistedNode) {
                window.console.warn('[SkillTreeModal] addClassToCanvas: write appeared to succeed but node not found on re-read for', name);
                showNotice(`⚠️ Tried to add class "${name}" to Skill Tree canvas, but it may not have been saved. Try closing all SkillTree canvas tabs and creating again.`);
                return;
            }

            window.console.log('[SkillTreeModal] addClassToCanvas: successfully persisted node for', name, 'at position', {
                x: persistedNode.x,
                y: persistedNode.y
            });

            // Surface feedback so we know this actually ran
            showNotice(`✅ Added class "${name}" to Skill Tree canvas. Drag it where you want and add it to the Jester properties if needed.`);
        } catch (error) {
            window.console.error('Failed to add class to canvas:', error);
            showNotice('❌ Failed to add class to canvas');
        }
    };

    /**
     * Ensure every discovered class has a corresponding node on the SkillTree canvas.
     * This is a safety net in case per-class creation ever fails or classes were created manually.
     */
    const ensureClassesOnCanvas = async (classesList: ClassMetadata[]) => {
        try {
            // Same caveat as addClassToCanvas – don't silently modify while the canvas is open,
            // or Obsidian may overwrite our changes from the open view.
            const canvasLeaves = plugin.app.workspace.getLeavesOfType('canvas');
            const canvasOpenForSkillTree = canvasLeaves.some((leaf: WorkspaceLeaf) => {
                const view = leaf.view as { file?: TFile } | undefined;
                return view?.file?.path === 'SkillTree/SkillTree.canvas';
            });

            if (canvasOpenForSkillTree) {
                // Best-effort sync only when the canvas is closed.
                return;
            }

            const canvasFile = plugin.app.vault.getAbstractFileByPath('SkillTree/SkillTree.canvas');
            if (!canvasFile || !(canvasFile instanceof TFile)) {
                // If there is no canvas yet, nothing to sync
                return;
            }

            const content = await plugin.app.vault.read(canvasFile);
            const canvasData: CanvasData = JSON.parse(content);

            const masterNode = canvasData.nodes.find((node: CanvasNode) => 
                node.file === 'SkillTree/Master-Class/Jester 🎭.md'
            );

            if (!masterNode) {
                // Can't place classes without a master node
                return;
            }

            let didChange = false;

            for (const classMeta of classesList) {
                const name = classMeta.name.trim();
                if (!name) continue;

                const alreadyExists = canvasData.nodes.find((node: CanvasNode) =>
                    node.file === `SkillTree/Master-Class/Class/${name}.md`
                );
                if (alreadyExists) continue;

                // Position after existing + newly added classes (same pattern as addClassToCanvas)
                const existingClasses = canvasData.nodes.filter((node: CanvasNode) => 
                    node.id !== masterNode.id && node.file && node.file.includes('SkillTree/Master-Class/Class/')
                );
                const classCount = existingClasses.length;
                const angle = (classCount * 60) * (Math.PI / 180); // 60 degrees apart
                const radius = 260;
                const x = masterNode.x + Math.cos(angle) * radius;
                const y = masterNode.y + masterNode.height + 80 + Math.sin(angle) * radius;

                const newNode: CanvasNode = {
                    "id": `class-${name.toLowerCase().replace(/\s+/g, '-')}`,
                    "type": "file",
                    "file": `SkillTree/Master-Class/Class/${name}.md`,
                    "x": Math.round(x),
                    "y": Math.round(y),
                    "width": 200,
                    "height": 80
                };

                canvasData.nodes.push(newNode);
                didChange = true;
            }

            if (didChange) {
                await plugin.app.vault.modify(canvasFile, JSON.stringify(canvasData, null, 2));
            }
        } catch (error) {
            console.error('Failed to sync classes to canvas:', error);
            // Don't spam notices here; this is a best-effort background sync
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modalContent} data-skill-system="true">
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Skill Codex</h2>
                    <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className={styles.tabNavigation}>
                    <button 
                        className={`${styles.tab} ${activeTab === 'mobile' ? styles.active : ''}`}
                        onClick={() => setActiveTab('mobile')}
                    >
                        ⚔ Realm Map
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        📊 Canvas
                    </button>

                    <button 
                        className={`${styles.tab} ${activeTab === 'manage' ? styles.active : ''}`}
                        onClick={() => setActiveTab('manage')}
                    >
                        ⚙️ Manage Skills
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'create' ? styles.active : ''}`}
                        onClick={() => setActiveTab('create')}
                    >
                        🆕 Create New
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {isLoading ? (
                        <div className={styles.loading}>Loading skill data...</div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className={styles.overviewTab}>
                                    <h3 className={styles.sectionTitle}>📊 Canvas</h3>
                                    <div className={styles.canvasActions}>
                                        <button 
                                            className={styles.primaryButton}
                                            onClick={handleCanvasView}
                                        >
                                            👁️ View Canvas File
                                        </button>
                                    </div>
                                    
                                    <div className={styles.skillOverview}>
                                        <h4 className={styles.sectionSubtitle}>Realm map</h4>
                                        <div className={styles.stats}>
                                            <div className={styles.statItem}>
                                                <span>Total Skills:</span>
                                                <span>{skills.length}</span>
                                            </div>
                                            <div className={styles.statItem}>
                                                <span>Classes:</span>
                                                <span>{Object.keys(classes).length}</span>
                                            </div>
                                        </div>
                                        
                                        <div className={styles.classBreakdown}>
                                            {Object.entries(classes).map(([className, classSkills]) => (
                                                <div key={className} className={styles.classItem}>
                                                    <strong>{className}</strong>
                                                    <span>({classSkills.length} skills)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'manage' && (
                                <div className={styles.manageTab}>
                                    <h3 className={styles.sectionTitle}>⚙️ Manage paths</h3>
                                    
                                    <div className={styles.classFilter}>
                                        <label>Filter by Class:</label>
                                        <select 
                                            value={selectedClass} 
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                        >
                                            <option value="">All Classes</option>
                                            {Object.keys(classes).map(className => (
                                                <option key={className} value={className}>
                                                    {className}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.skillsList}>
                                        {(selectedClass ? classes[selectedClass] : skills).length === 0 ? (
                                            <div className={styles.emptyState}>
                                                <div className={styles.emptyIcon}>🌳</div>
                                                <div className={styles.emptyTitle}>No Skills Found</div>
                                                <div className={styles.emptyDescription}>
                                                    {selectedClass 
                                                        ? `No skills found for class "${selectedClass}". Create a new skill to get started!`
                                                        : "No skills found. Create your first skill to start building your skill tree!"}
                                                </div>
                                                <button 
                                                    className={styles.primaryButton}
                                                    onClick={() => setActiveTab('create')}
                                                    style={{ marginTop: '16px' }}
                                                >
                                                    🆕 Create New Skill
                                                </button>
                                            </div>
                                        ) : (
                                            (selectedClass ? classes[selectedClass] : skills).map(skill => (
                                                <div key={skill.filePath} className={styles.skillItem}>
                                                    <div className={styles.skillInfo}>
                                                        <h4 className={styles.skillTitle}>
                                                            {skill.icon && (
                                                                <span className={styles.skillIconBubble}>
                                                                    {skill.icon}
                                                                </span>
                                                            )}
                                                            <span className={styles.skillNameText}>{skill.name}</span>
                                                        </h4>
                                                        <p>Class: {skill.class}</p>
                                                        <p>Level: {skill.level || 1} | CP: {skill.cp || 0}</p>
                                                        {skill.description && (
                                                            <p className={styles.description}>{skill.description}</p>
                                                        )}
                                                    </div>
                                                    <div className={styles.skillActions}>
                                                        <button type="button" onClick={() => setCodexSkill(skill)}>
                                                            📖 Codex
                                                        </button>
                                                        {iconEditSkillPath === skill.filePath ? (
                                                            <div className={styles.skillIconEditor}>
                                                                <input
                                                                    type="text"
                                                                    className={styles.skillIconInput}
                                                                    value={iconEditValue}
                                                                    onChange={(e) => setIconEditValue(e.target.value)}
                                                                    placeholder="Emoji or short label"
                                                                />
                                                                <button onClick={() => saveSkillIcon(skill)}>
                                                                    Save
                                                                </button>
                                                                <button onClick={cancelSkillIconEditor}>
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => openSkillIconEditor(skill)}>
                                                                🖼️ Skill Icon
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleClassIconChangeForSkill(skill)}>
                                                            🏷️ Class Icon
                                                        </button>
                                                        <button onClick={() => handleSkillEdit(skill)}>
                                                            ✏️ Edit in file
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'create' && (
                                <div className={styles.createTab}>
                                    <h3 className={styles.sectionTitle}>🆕 Forge</h3>
                                    
                                    <div className={styles.createTypeSelector}>
                                        <label>Create Type:</label>
                                        <select 
                                            value={createType} 
                                            onChange={(e) => setCreateType(e.target.value as 'skill' | 'class')}
                                        >
                                            <option value="skill">New Skill</option>
                                            <option value="class">New Class</option>
                                        </select>
                                    </div>

                                    <div className={styles.createForm}>
                                        <div className={styles.formField}>
                                            <label>Name:</label>
                                            <input 
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                placeholder="Enter name..."
                                            />
                                        </div>
                                        
                                        <div className={styles.formField}>
                                            <label>{createType === 'class' ? 'Class Description:' : 'Description:'}</label>
                                            <textarea 
                                                value={formData.description}
                                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                                placeholder={createType === 'class' ? 'Enter class description...' : 'Enter description...'}
                                                rows={3}
                                            />
                                        </div>

                                        {createType === 'class' ? (
                                            <div className={styles.formField}>
                                                <label>Tagline (optional):</label>
                                                <input
                                                    type="text"
                                                    value={formData.tagline}
                                                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                                    placeholder="Short line shown in the codex (e.g. Iron path of discipline)"
                                                />
                                            </div>
                                        ) : (
                                            <div className={styles.formField}>
                                                <label>Epithet (optional):</label>
                                                <input
                                                    type="text"
                                                    value={formData.epithet}
                                                    onChange={(e) => setFormData({ ...formData, epithet: e.target.value })}
                                                    placeholder="One-line flavor for this skill in the codex"
                                                />
                                            </div>
                                        )}

                                        {createType === 'class' && (
                                            <>
                                                <div className={styles.formField}>
                                                    <p className={styles.helperText}>
                                                        New classes will appear on the Skill Tree canvas as standalone cards near the Jester node.
                                                        You can drag them wherever you like. If you also want them to show up as Jester properties/portals,
                                                        add the class note to the Jester note&apos;s <strong>classes</strong> property manually.
                                                    </p>
                                                </div>

                                                {/* Class icon configuration */}
                                                <div className={styles.formField}>
                                                    <label>Class Icon (optional):</label>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                        <div
                                                            style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 8,
                                                                border: '1px solid var(--background-modifier-border)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 20,
                                                                background: 'var(--background-secondary)'
                                                            }}
                                                        >
                                                            {formData.iconImage ? '🖼️' : (formData.icon || '⭐')}
                                                        </div>
                                                        <span style={{ fontSize: 12, opacity: 0.8 }}>
                                                            This icon represents the class and can be reused in UI.
                                                        </span>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        value={formData.icon}
                                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                                        placeholder="Emoji like 🛡️ or short label (optional)"
                                                    />

                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                                        {['🛡️','⚔️','🎭','🏋️','🧙','🧠','💼','🌟'].map(preset => (
                                                            <button
                                                                key={preset}
                                                                type="button"
                                                                className={styles.emojiPresetButton}
                                                                onClick={() => setFormData({ ...formData, icon: preset })}
                                                            >
                                                                {preset}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div style={{ marginTop: 8 }}>
                                                        <label style={{ fontSize: 12, opacity: 0.8, display: 'block', marginBottom: 4 }}>
                                                            Image / SVG path (optional, vault-relative)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.iconImage}
                                                            onChange={(e) => setFormData({ ...formData, iconImage: e.target.value })}
                                                            placeholder="e.g. icons/body-builder.png or icons/body-builder.svg"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {createType === 'skill' && (
                                            <>
                                                <div className={styles.formField}>
                                                    <label>Class (Required):</label>
                                                    <select 
                                                        value={formData.class}
                                                        onChange={(e) => setFormData({...formData, class: e.target.value})}
                                                    >
                                                        <option value="">Select Class (Required)</option>
                                                        {allClasses.map(classItem => (
                                                            <option key={classItem.name} value={classItem.name}>
                                                                {classItem.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className={styles.formField}>
                                                    <label>Associated Stats (Required):</label>
                                                    <div className={styles.multiSelectContainer}>
                                                        <div 
                                                            className={styles.multiSelectDropdown}
                                                            onClick={() => setFormData({...formData, showStatsDropdown: !formData.showStatsDropdown})}
                                                        >
                                                            {formData.stats.length === 0 ? (
                                                                <span className={styles.placeholder}>Select Stats (Required)</span>
                                                            ) : (
                                                                <div className={styles.selectedStats}>
                                                                    {formData.stats.map((stat, index) => (
                                                                        <span key={stat} className={styles.selectedStat}>
                                                                            {stat}
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setFormData({
                                                                                        ...formData, 
                                                                                        stats: formData.stats.filter((_, i) => i !== index)
                                                                                    });
                                                                                }}
                                                                                className={styles.removeStat}
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <span className={styles.dropdownArrow}>▼</span>
                                                        </div>
                                                        
                                                        {formData.showStatsDropdown && (
                                                            <div className={styles.dropdownOptions}>
                                                                {allStats.map(stat => (
                                                                    <div 
                                                                        key={stat.name}
                                                                        className={`${styles.dropdownOption} ${formData.stats.includes(stat.name) ? styles.selected : ''}`}
                                                                        onClick={() => {
                                                                            const newStats = formData.stats.includes(stat.name)
                                                                                ? formData.stats.filter(s => s !== stat.name)
                                                                                : [...formData.stats, stat.name];
                                                                            setFormData({...formData, stats: newStats});
                                                                        }}
                                                                    >
                                                                        {stat.name}
                                                                        {formData.stats.includes(stat.name) && <span className={styles.checkmark}>✓</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Icon configuration */}
                                                <div className={styles.formField}>
                                                    <label>Icon (optional):</label>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                        <div
                                                            style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 8,
                                                                border: '1px solid var(--background-modifier-border)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 20,
                                                                background: 'var(--background-secondary)'
                                                            }}
                                                        >
                                                            {formData.iconImage ? '🖼️' : (formData.icon || '⭐')}
                                                        </div>
                                                        <span style={{ fontSize: 12, opacity: 0.8 }}>
                                                            This icon will be reused on habits and skill views.
                                                        </span>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        value={formData.icon}
                                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                                        placeholder="Emoji like 💊 or short label (optional)"
                                                    />

                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                                        {['💊','💪','🧠','📚','🧘','🎨','🤝','⚙️'].map(preset => (
                                                            <button
                                                                key={preset}
                                                                type="button"
                                                                className={styles.emojiPresetButton}
                                                                onClick={() => setFormData({ ...formData, icon: preset })}
                                                            >
                                                                {preset}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div style={{ marginTop: 8 }}>
                                                        <label style={{ fontSize: 12, opacity: 0.8, display: 'block', marginBottom: 4 }}>
                                                            Image / SVG path (optional, vault-relative)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.iconImage}
                                                            onChange={(e) => setFormData({ ...formData, iconImage: e.target.value })}
                                                            placeholder="e.g. icons/pills.png or icons/pills.svg"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        
                                        <button 
                                            className={styles.createButton}
                                            onClick={handleCreateNew}
                                        >
                                            🆕 Create {createType.charAt(0).toUpperCase() + createType.slice(1)}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'mobile' && (
                                <div className={styles.mobileTab}>
                                    <SkillRealmMap
                                        masterClass={
                                            playerMasterClass
                                                ? {
                                                      name: playerMasterClass,
                                                      icon: masterClassIcon ?? undefined,
                                                      level: masterClassProgress?.level,
                                                      currentCP: masterClassProgress?.currentCP,
                                                      requiredCP: masterClassProgress?.requiredCP,
                                                  }
                                                : null
                                        }
                                        vaultClasses={allClasses.map((c) => ({
                                            name: c.name,
                                            filePath: c.filePath,
                                            tagline: c.tagline,
                                            icon: c.icon,
                                            level: c.level,
                                            currentCP: c.currentCP,
                                            requiredCP: c.requiredCP,
                                            totalCP: c.totalCP,
                                            masterClass: c.masterClass,
                                        }))}
                                        skills={skills.map(skill => skillToProgressView(skill))}
                                        onSkillSelect={(skill) => {
                                            const selectedSkill = skills.find(s => s.name === skill.name);
                                            if (selectedSkill) {
                                                setCodexSkill(selectedSkill);
                                            }
                                        }}
                                    />
                                </div>
                            )}

                        </>
                    )}
                </div>
                {codexSkill ? (
                    <SkillCodexDetail
                        skill={codexSkill}
                        classMeta={allClasses.find((c) => c.name === codexSkill.class)}
                        onClose={() => setCodexSkill(null)}
                        onOpenInVault={handleSkillEdit}
                    />
                ) : null}
            </div>
        </div>,
        document.body
    );
};

export default SkillTreeModal;
