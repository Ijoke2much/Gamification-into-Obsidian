import { Vault, TFile } from 'obsidian';
import type { ClassMetadata, SkillMetadata } from '../../../shared/utils/skillDiscovery';
import {
    readYamlFrontmatter,
    writeYamlFrontmatter,
} from '../../../shared/utils/progressUpdater';

export interface CanvasNode {
    id: string;
    type?: string;
    file?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export interface CanvasEdge {
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
}

export const CANVAS_PATH = 'SkillTree/SkillTree.canvas';

const HIERARCHY_EDGE_COLOR = '#6b7280';

export function classFilePath(className: string): string {
    return `SkillTree/Master-Class/Class/${className.trim()}.md`;
}

export function skillFilePath(skillName: string): string {
    return `SkillTree/Master-Class/Skills/${skillName.trim()}.md`;
}

/** Strip emoji / punctuation so "Jester 🎭" matches "Jester". */
export function normalizeMasterKey(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .trim();
}

/** Master-class notes live directly under Master-Class/, not Class/Skills/Stats. */
export function isMasterClassFilePath(path: string | undefined): boolean {
    if (!path) return false;
    if (!path.startsWith('SkillTree/Master-Class/')) return false;
    if (!path.endsWith('.md')) return false;
    if (path.includes('/Class/')) return false;
    if (path.includes('/Skills/')) return false;
    if (path.includes('/Stats/')) return false;
    if (path.includes('/Stat/')) return false;
    return true;
}

function masterNodeBasename(filePath: string): string {
    const base = filePath.split('/').pop() || '';
    return base.replace(/\.md$/i, '');
}

function masterKeysMatch(a: string, b: string): boolean {
    const ka = normalizeMasterKey(a);
    const kb = normalizeMasterKey(b);
    if (!ka || !kb) return false;
    return ka === kb || ka.includes(kb) || kb.includes(ka);
}

/**
 * Find the master-class file node on the canvas.
 * Prefers a name match (player master / class.masterClass), then jester-master id, then first master node.
 */
export function findMasterNodeOnCanvas(
    nodes: CanvasNode[],
    preferredMasterName?: string
): CanvasNode | undefined {
    const masterNodes = nodes.filter((n) => isMasterClassFilePath(n.file));
    if (masterNodes.length === 0) return undefined;

    if (preferredMasterName?.trim()) {
        const match = masterNodes.find((n) =>
            masterKeysMatch(masterNodeBasename(n.file!), preferredMasterName)
        );
        if (match) return match;
    }

    const byId = masterNodes.find((n) => n.id === 'jester-master');
    if (byId) return byId;

    return masterNodes[0];
}

/** Resolve master node for a specific class's masterClass field. */
export function findMasterNodeForClass(
    nodes: CanvasNode[],
    classMasterName?: string,
    fallbackMasterName?: string
): CanvasNode | undefined {
    if (classMasterName?.trim()) {
        const match = findMasterNodeOnCanvas(nodes, classMasterName);
        if (match && masterKeysMatch(masterNodeBasename(match.file!), classMasterName)) {
            return match;
        }
    }
    return findMasterNodeOnCanvas(nodes, fallbackMasterName || classMasterName);
}

export function makeHierarchyEdge(
    fromNodeId: string,
    toNodeId: string,
    id: string
): CanvasEdge {
    return {
        id,
        fromNode: fromNodeId,
        toNode: toNodeId,
        fromSide: 'bottom',
        toSide: 'top',
        color: HIERARCHY_EDGE_COLOR,
        width: 2,
    };
}

function edgeKey(from: string, to: string): string {
    return `${from}→${to}`;
}

/**
 * Ensures each class file node has a directed edge from its master-class node.
 * Only adds missing master → class edges; never moves nodes or removes edges.
 */
export async function syncMasterClassEdgesOnCanvas(
    vault: Vault,
    classes: ClassMetadata[],
    isCanvasOpen: () => boolean,
    preferredMasterName?: string
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
    const existing = new Set(edges.map((e) => edgeKey(e.fromNode, e.toNode)));

    let added = 0;
    let nextEdgeId = 0;
    const idPrefix = 'edge-master-class-sync';

    for (const cls of classes) {
        const className = (cls.name || '').trim();
        if (!className) continue;

        const classNode =
            nodes.find((n) => n.file === (cls.filePath || classFilePath(className))) ||
            nodes.find((n) => n.file === classFilePath(className));
        if (!classNode) continue;

        const masterNode = findMasterNodeForClass(
            nodes,
            cls.masterClass,
            preferredMasterName
        );
        if (!masterNode) continue;

        if (existing.has(edgeKey(masterNode.id, classNode.id))) continue;

        edges.push(
            makeHierarchyEdge(
                masterNode.id,
                classNode.id,
                `${idPrefix}-${nextEdgeId++}`
            )
        );
        existing.add(edgeKey(masterNode.id, classNode.id));
        added++;
    }

    if (added > 0) {
        await vault.modify(canvasFile, JSON.stringify(canvasData, null, 2));
    }

    return { added };
}

/**
 * Ensures each skill file node has a directed edge from its parent class node.
 * Only adds class → skill edges; does not remove other edges or rewrite positions.
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

        edges.push(
            makeHierarchyEdge(
                classNode.id,
                skillNode.id,
                `${idPrefix}-${nextEdgeId++}`
            )
        );
        existing.add(edgeKey(classNode.id, skillNode.id));
        added++;
    }

    if (added > 0) {
        await vault.modify(canvasFile, JSON.stringify(canvasData, null, 2));
    }

    return { added };
}

/**
 * Resolve a master-class note path under SkillTree/Master-Class/ by display name.
 */
export function resolveMasterClassFilePath(
    vault: Vault,
    masterName: string
): string | undefined {
    const key = normalizeMasterKey(masterName);
    if (!key) return undefined;

    let fallback: string | undefined;
    for (const f of vault.getAllLoadedFiles()) {
        if (!(f instanceof TFile)) continue;
        if (!isMasterClassFilePath(f.path)) continue;
        const baseKey = normalizeMasterKey(f.basename);
        if (baseKey === key) return f.path;
        if (!fallback && (baseKey.includes(key) || key.includes(baseKey))) {
            fallback = f.path;
        }
    }
    return fallback;
}

/**
 * Append a class name to the master note's `classes:` frontmatter list if missing.
 */
export async function appendClassToMasterNote(
    vault: Vault,
    masterFilePath: string,
    className: string
): Promise<boolean> {
    const name = className.trim();
    if (!name || !masterFilePath) return false;

    try {
        const { frontmatter } = await readYamlFrontmatter(vault, masterFilePath);
        const raw = frontmatter.classes;
        const existing: string[] = Array.isArray(raw)
            ? raw.map((c) => String(c).trim()).filter(Boolean)
            : typeof raw === 'string' && raw.trim()
              ? [raw.trim()]
              : [];

        if (existing.some((c) => c.toLowerCase() === name.toLowerCase())) {
            return false;
        }

        frontmatter.classes = [...existing, name];
        await writeYamlFrontmatter(vault, masterFilePath, frontmatter);
        return true;
    } catch (error) {
        console.error('[Gamified] Failed to append class to master note:', error);
        return false;
    }
}
