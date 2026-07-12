import { Vault, TFile } from 'obsidian';
import type { SkillMetadata } from '../../../shared/utils/skillDiscovery';

interface CanvasNode {
    id: string;
    type?: string;
    file?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

interface CanvasEdge {
    id: string;
    fromNode: string;
    toNode: string;
    fromSide?: string;
    toSide?: string;
    color?: string;
    width?: number;
}

interface CanvasData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}

const CANVAS_PATH = 'SkillTree/SkillTree.canvas';

function classFilePath(className: string): string {
    return `SkillTree/Master-Class/Class/${className.trim()}.md`;
}

function skillFilePath(skillName: string): string {
    return `SkillTree/Master-Class/Skills/${skillName.trim()}.md`;
}

/**
 * Ensures each skill file node has a directed edge from its parent class node.
 * Only adds class → skill edges; does not remove other edges.
 * Skips when SkillTree canvas is open (avoids Obsidian overwriting changes).
 */
export async function syncClassSkillEdgesOnCanvas(
    vault: Vault,
    skills: SkillMetadata[],
    isCanvasOpen: () => boolean
): Promise<{ added: number; error?: string }> {
    if (isCanvasOpen()) {
        return { added: 0 };
    }

    const canvasFile = vault.getAbstractFileByPath(CANVAS_PATH);
    if (!canvasFile || !(canvasFile instanceof TFile)) {
        return { added: 0 };
    }

    let canvasData: CanvasData;
    try {
        canvasData = JSON.parse(await vault.read(canvasFile)) as CanvasData;
    } catch {
        return { added: 0, error: 'invalid canvas json' };
    }

    if (!canvasData.nodes || !Array.isArray(canvasData.edges)) {
        return { added: 0, error: 'invalid canvas shape' };
    }

    const nodes = canvasData.nodes;
    const edges = canvasData.edges;

    const nodeByFile = new Map<string, CanvasNode>();
    for (const n of nodes) {
        if (n.file) {
            nodeByFile.set(n.file, n);
        }
    }

    const edgeKey = (from: string, to: string) => `${from}→${to}`;
    const existing = new Set(edges.map((e) => edgeKey(e.fromNode, e.toNode)));

    let added = 0;
    let nextEdgeId = 0;
    const idPrefix = 'edge-class-skill-sync';

    for (const skill of skills) {
        const className = (skill.class || '').trim();
        const skillName = (skill.name || '').trim();
        if (!className || !skillName) continue;

        const cPath = classFilePath(className);
        const sPath = skillFilePath(skillName);

        const classNode = nodeByFile.get(cPath);
        const skillNode = nodeByFile.get(sPath);
        if (!classNode || !skillNode) continue;

        if (existing.has(edgeKey(classNode.id, skillNode.id))) continue;

        edges.push({
            id: `${idPrefix}-${nextEdgeId++}`,
            fromNode: classNode.id,
            toNode: skillNode.id,
            fromSide: 'bottom',
            toSide: 'top',
            color: '#6b7280',
            width: 2
        });
        existing.add(edgeKey(classNode.id, skillNode.id));
        added++;
    }

    if (added > 0) {
        await vault.modify(canvasFile, JSON.stringify(canvasData, null, 2));
    }

    return { added };
}
