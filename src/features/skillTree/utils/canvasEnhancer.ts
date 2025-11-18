// Skill Tree Canvas Enhancement System
// Real-time updates, visual improvements, and interactive functionality

import { Vault, TFile } from 'obsidian';
import { getAllSkills, SkillMetadata } from '../../../shared/utils/skillDiscovery';

export interface CanvasNode {
    id: string;
    type: 'text' | 'file' | 'group';
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    text?: string;
    file?: string;

    // Enhanced properties
    level?: number;
    cp?: number;
    maxCP?: number;
    nodeType?: 'master' | 'class' | 'skill' | 'stat';
    skillPath?: string;

    // Visual enhancements
    glow?: boolean;
    pulsing?: boolean;
    connections?: string[]; // Connected node IDs
    achievementBadges?: string[];

    // Real-time data
    lastUpdated?: Date;
    isActive?: boolean;
    progressPercent?: number;
}

export interface CanvasEdge {
    id: string;
    fromNode: string;
    toNode: string;
    fromSide: 'top' | 'right' | 'bottom' | 'left';
    toSide: 'top' | 'right' | 'bottom' | 'left';

    // Enhanced properties
    connectionType: 'prerequisite' | 'progression' | 'synergy' | 'mastery';
    strengthPercent: number; // 0-100
    isUnlocked: boolean;

    // Visual enhancements
    animated?: boolean;
    color?: string;
    thickness?: number;
}

export interface EnhancedCanvasData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];

    // Canvas metadata
    lastUpdate: Date;
    totalNodes: number;
    totalConnections: number;

    // Skill tree stats
    masterClassPosition: { x: number; y: number };
    skillHierarchy: {
        [masterClass: string]: {
            classes: {
                [className: string]: {
                    skills: {
                        [skillName: string]: {
                            stats: string[];
                            position: { x: number; y: number };
                        };
                    };
                    position: { x: number; y: number };
                };
            };
            position: { x: number; y: number };
        };
    };

    // Performance metrics
    totalCP: number;
    distributionStats: {
        masterClassCP: number;
        classCP: Record<string, number>;
        skillCP: Record<string, number>;
        statCP: Record<string, number>;
    };
}

export class CanvasEnhancer {
    private static readonly CANVAS_FILE = 'SkillTree/SkillTree.canvas';
    private static readonly ENHANCED_DATA_FILE = 'SkillTree/CanvasEnhancementData.json';

    // Visual constants
    private static readonly COLORS = {
        master: '#8b5cf6',     // Purple
        class: '#06b6d4',      // Cyan
        skill: '#10b981',      // Green
        stat: '#f59e0b',       // Orange
        connection: '#6b7280',  // Gray
        active: '#ef4444',     // Red
        maxed: '#fbbf24'       // Yellow
    };

    private static readonly NODE_SIZES = {
        master: { width: 300, height: 120 },
        class: { width: 200, height: 80 },
        skill: { width: 160, height: 60 },
        stat: { width: 120, height: 40 }
    };

    /**
     * Main method to enhance the skill tree canvas with real-time data
     */
    static async enhanceCanvas(vault: Vault): Promise<EnhancedCanvasData | null> {
        try {
            console.log('[CanvasEnhancer] Starting canvas enhancement...');

            // Load current canvas data
            const canvasData = await this.loadCanvasData(vault);
            if (!canvasData) {
                console.warn('[CanvasEnhancer] No canvas file found, creating new one...');
                await this.createInitialCanvas(vault);
                // Try again after creating initial canvas
                const newCanvasData = await this.loadCanvasData(vault);
                if (!newCanvasData) return null;
                const skillsData = await this.gatherSkillData(vault);
                const enhancedData = await this.enhanceNodesWithData(newCanvasData, skillsData);
                await this.saveEnhancedCanvas(vault, enhancedData);
                return enhancedData;
            }

            // Get current skill data
            const skillsData = await this.gatherSkillData(vault);

            // Enhance nodes with real-time data
            const enhancedData = await this.enhanceNodesWithData(canvasData, skillsData);

            // Update visual styling
            await this.updateVisualStyling(enhancedData);

            // Generate connections
            await this.updateConnections(enhancedData, skillsData);

            // Save enhanced canvas
            await this.saveEnhancedCanvas(vault, enhancedData);

            // Save enhancement metadata
            await this.saveEnhancementData(vault, enhancedData);

            console.log('[CanvasEnhancer] Canvas enhancement completed successfully');
            return enhancedData;
        } catch (error) {
            console.error('[CanvasEnhancer] Failed to enhance canvas:', error);
            return null;
        }
    }

    /**
     * Create initial canvas structure if none exists
     */
    private static async createInitialCanvas(vault: Vault): Promise<void> {
        const skillsData = await this.gatherSkillData(vault);

        const initialCanvas: { nodes: CanvasNode[]; edges: CanvasEdge[] } = {
            nodes: [],
            edges: []
        };

        let nodeId = 1;
        let currentY = 50;

        // Create Master Class node (always at top)
        const masterNode: CanvasNode = {
            id: `node-${nodeId++}`,
            type: 'file',
            file: 'SkillTree/Master-Class/Jester 🎭.md',
            x: 400,
            y: currentY,
            width: this.NODE_SIZES.master.width,
            height: this.NODE_SIZES.master.height,
            nodeType: 'master',
            level: 1,
            cp: 0,
            maxCP: 1000
        };

        initialCanvas.nodes.push(masterNode);
        currentY += 200;

        // Create class nodes
        let currentX = 50;
        const classSpacing = 250;

        for (const [className, classData] of Object.entries(skillsData.classes)) {
            const typedClassData = classData as { level?: number; cp?: number; skills?: Record<string, SkillMetadata> };
            const classNode: CanvasNode = {
                id: `node-${nodeId++}`,
                type: 'file',
                file: `SkillTree/Master-Class/Class/${className}.md`,
                x: currentX,
                y: currentY,
                width: this.NODE_SIZES.class.width,
                height: this.NODE_SIZES.class.height,
                nodeType: 'class',
                level: typedClassData.level || 1,
                cp: typedClassData.cp || 0,
                maxCP: 500
            };

            initialCanvas.nodes.push(classNode);

            // Connect to master class (disabled to prevent portal issues)
            // initialCanvas.edges.push({
            //     id: `edge-${masterNode.id}-${classNode.id}`,
            //     fromNode: masterNode.id,
            //     toNode: classNode.id,
            //     fromSide: 'bottom',
            //     toSide: 'top',
            //     connectionType: 'progression',
            //     strengthPercent: 75,
            //     isUnlocked: true
            // });

            currentX += classSpacing;
        }

        const canvasWithMetadata = {
            ...initialCanvas,
            metadata: {
                version: "1.0-1.0",
                frontmatter: {
                    type: "canvas",
                    title: "Skill Tree",
                    description: "Visual representation of skills and progression"
                }
            }
        };
        await vault.create(this.CANVAS_FILE, JSON.stringify(canvasWithMetadata, null, 2));
    }

    /**
     * Load existing canvas data
     */
    private static async loadCanvasData(vault: Vault): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] } | null> {
        try {
            const file = vault.getAbstractFileByPath(this.CANVAS_FILE);
            if (!file || !(file instanceof TFile)) {
                return null;
            }

            const content = await vault.read(file);
            return JSON.parse(content);
        } catch (error) {
            console.error('[CanvasEnhancer] Failed to load canvas data:', error);
            return null;
        }
    }

    /**
     * Gather current skill data from MD files
     */
    private static async gatherSkillData(vault: Vault): Promise<{
        master: { level: number; cp: number };
        classes: Record<string, { level?: number; cp?: number; skills?: Record<string, SkillMetadata> }>;
        skills: Record<string, SkillMetadata>;
        stats: Record<string, SkillMetadata>;
        totalCP: number;
    }> {
        try {
            const allSkills = await getAllSkills(vault);

            const skillsData = {
                master: { level: 1, cp: 0 },
                classes: {} as Record<string, { level?: number; cp?: number; skills?: Record<string, SkillMetadata> }>,
                skills: {} as Record<string, SkillMetadata>,
                stats: {} as Record<string, SkillMetadata>,
                totalCP: 0
            };

            // Process each skill to get current data
            for (const skill of allSkills) {
                // allSkills now returns SkillMetadata[], not string paths
                const metadata = skill;
                if (!metadata) continue;

                const pathParts = metadata.filePath.split('/');
                const fileName = pathParts[pathParts.length - 1].replace('.md', '');

                if (pathParts.includes('Master-Class')) {
                    skillsData.master = {
                        level: metadata.level || 1,
                        cp: metadata.cp || 0
                    };
                } else if (pathParts.includes('Class')) {
                    skillsData.classes[fileName] = {
                        level: metadata.level || 1,
                        cp: metadata.cp || 0,
                        skills: {}
                    };
                } else if (pathParts.includes('Skills')) {
                    skillsData.skills[fileName] = metadata;
                } else if (pathParts.includes('Stats')) {
                    skillsData.stats[fileName] = metadata;
                }

                skillsData.totalCP += metadata.cp || 0;
            }

            return skillsData;
        } catch (error) {
            console.error('[CanvasEnhancer] Failed to gather skill data:', error);
            return {
                master: { level: 1, cp: 0 },
                classes: {},
                skills: {},
                stats: {},
                totalCP: 0
            };
        }
    }

    /**
     * Enhance nodes with real-time data
     */
    private static async enhanceNodesWithData(
        canvasData: { nodes: CanvasNode[]; edges: CanvasEdge[] },
        skillsData: {
            master: { level: number; cp: number };
            classes: Record<string, { level?: number; cp?: number; skills?: Record<string, SkillMetadata> }>;
            skills: Record<string, SkillMetadata>;
            stats: Record<string, SkillMetadata>;
            totalCP: number;
        }
    ): Promise<EnhancedCanvasData> {
        const enhancedNodes: CanvasNode[] = [];

        for (const node of canvasData.nodes) {
            const enhancedNode: CanvasNode = {
                ...node,
                lastUpdated: new Date(),
                isActive: false,
                progressPercent: 0,
                achievementBadges: []
            };

            // Determine node type and update with real data
            if (node.nodeType === 'master' || this.isMasterClassNode(node)) {
                enhancedNode.nodeType = 'master';
                enhancedNode.level = skillsData.master.level || 1;
                enhancedNode.cp = skillsData.master.cp || 0;
                enhancedNode.maxCP = 1000;
                enhancedNode.progressPercent = ((enhancedNode.cp || 0) / (enhancedNode.maxCP || 1)) * 100;
                enhancedNode.color = this.COLORS.master;

                // Add glow if high level
                if ((enhancedNode.level || 0) >= 10) {
                    enhancedNode.glow = true;
                }
            }

            // Update visual properties based on progress
            if ((enhancedNode.progressPercent || 0) >= 100) {
                enhancedNode.color = this.COLORS.maxed;
                enhancedNode.achievementBadges?.push('⭐');
            } else if ((enhancedNode.progressPercent || 0) >= 75) {
                enhancedNode.glow = true;
            }

            // Add recent activity indicator
            if (this.wasRecentlyUpdated(enhancedNode.lastUpdated)) {
                enhancedNode.pulsing = true;
                enhancedNode.isActive = true;
            }

            enhancedNodes.push(enhancedNode);
        }

        return {
            nodes: enhancedNodes,
            edges: canvasData.edges || [],
            lastUpdate: new Date(),
            totalNodes: enhancedNodes.length,
            totalConnections: (canvasData.edges || []).length,
            masterClassPosition: { x: 400, y: 50 },
            skillHierarchy: {},
            totalCP: skillsData.totalCP,
            distributionStats: {
                masterClassCP: skillsData.master.cp || 0,
                classCP: Object.fromEntries(
                    Object.entries(skillsData.classes).map(([name, data]) => [name, data.cp || 0])
                ),
                skillCP: Object.fromEntries(
                    Object.entries(skillsData.skills).map(([name, data]) => [name, data.cp || 0])
                ),
                statCP: Object.fromEntries(
                    Object.entries(skillsData.stats).map(([name, data]) => [name, data.cp || 0])
                )
            }
        };
    }

    /**
     * Update visual styling based on data
     */
    private static async updateVisualStyling(enhancedData: EnhancedCanvasData): Promise<void> {
        for (const node of enhancedData.nodes) {
            // Update size based on importance
            if (node.nodeType === 'master') {
                node.width = this.NODE_SIZES.master.width;
                node.height = this.NODE_SIZES.master.height;
            } else if (node.nodeType === 'class') {
                node.width = this.NODE_SIZES.class.width;
                node.height = this.NODE_SIZES.class.height;
            } else if (node.nodeType === 'skill') {
                node.width = this.NODE_SIZES.skill.width;
                node.height = this.NODE_SIZES.skill.height;
            } else if (node.nodeType === 'stat') {
                node.width = this.NODE_SIZES.stat.width;
                node.height = this.NODE_SIZES.stat.height;
            }

            // Apply dynamic coloring
            if ((node.progressPercent || 0) >= 100) {
                node.color = this.COLORS.maxed;
            } else if (node.isActive) {
                node.color = this.COLORS.active;
            } else {
                node.color = this.COLORS[node.nodeType as keyof typeof this.COLORS] || this.COLORS.connection;
            }
        }
    }

    /**
     * Update connections between nodes
     */
    private static async updateConnections(enhancedData: EnhancedCanvasData, skillsData: {
        master: { level: number; cp: number };
        classes: Record<string, { level?: number; cp?: number; skills?: Record<string, SkillMetadata> }>;
        skills: Record<string, SkillMetadata>;
        stats: Record<string, SkillMetadata>;
        totalCP: number;
    }): Promise<void> {
        // Generate enhanced edges with dynamic properties
        for (const edge of enhancedData.edges) {
            const fromNode = enhancedData.nodes.find(n => n.id === edge.fromNode);
            const toNode = enhancedData.nodes.find(n => n.id === edge.toNode);

            if (!fromNode || !toNode) continue;

            // Update connection strength based on CP flow
            if (fromNode.nodeType === 'master' && toNode.nodeType === 'class') {
                edge.strengthPercent = Math.min(100, (toNode.cp || 0) / 50 * 100);
            }

            // Add animation for active connections
            if (fromNode.isActive || toNode.isActive) {
                edge.animated = true;
                edge.color = this.COLORS.active;
                edge.thickness = 3;
            } else {
                edge.animated = false;
                edge.color = this.COLORS.connection;
                edge.thickness = 1;
            }

            // Update unlock status
            edge.isUnlocked = (fromNode.cp || 0) > 0 && (toNode.cp || 0) > 0;
        }
    }

    /**
     * Save enhanced canvas back to file
     */
    private static async saveEnhancedCanvas(vault: Vault, enhancedData: EnhancedCanvasData): Promise<void> {
        try {
            const canvasContent = {
                nodes: enhancedData.nodes.map(node => ({
                    id: node.id,
                    type: node.type,
                    x: node.x,
                    y: node.y,
                    width: node.width,
                    height: node.height,
                    color: node.color,
                    // Add custom canvas properties for Obsidian
                    text: this.generateNodeText(node)
                })),
                edges: enhancedData.edges.map(edge => ({
                    id: edge.id,
                    fromNode: edge.fromNode,
                    toNode: edge.toNode,
                    fromSide: edge.fromSide,
                    toSide: edge.toSide,
                    color: edge.color,
                    width: edge.thickness
                }))
            };

            const file = vault.getAbstractFileByPath(this.CANVAS_FILE);
            if (file && file instanceof TFile) {
                await vault.modify(file, JSON.stringify(canvasContent, null, 2));
            }
        } catch (error) {
            console.error('[CanvasEnhancer] Failed to save enhanced canvas:', error);
        }
    }

    /**
     * Generate text content for canvas nodes
     */
    private static generateNodeText(node: CanvasNode): string {
        const badges = node.achievementBadges?.join(' ') || '';
        const progress = node.progressPercent ? ` (${Math.round(node.progressPercent)}%)` : '';
        const cpInfo = node.cp !== undefined ? `\\nCP: ${node.cp}/${node.maxCP}` : '';
        const levelInfo = node.level ? `\\nLevel: ${node.level}` : '';

        return `${badges} ${node.nodeType?.toUpperCase() || 'NODE'}${progress}${cpInfo}${levelInfo}`;
    }

    /**
     * Save enhancement metadata for analytics
     */
    private static async saveEnhancementData(vault: Vault, enhancedData: EnhancedCanvasData): Promise<void> {
        try {
            const enhancementMetadata = {
                lastUpdate: enhancedData.lastUpdate.toISOString(),
                totalNodes: enhancedData.totalNodes,
                totalConnections: enhancedData.totalConnections,
                totalCP: enhancedData.totalCP,
                distributionStats: enhancedData.distributionStats,
                performanceMetrics: {
                    enhancementTime: Date.now(),
                    nodeTypes: enhancedData.nodes.reduce((acc, node) => {
                        acc[node.nodeType || 'unknown'] = (acc[node.nodeType || 'unknown'] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>)
                }
            };

            const existingFile = vault.getAbstractFileByPath(this.ENHANCED_DATA_FILE);
            if (existingFile && existingFile instanceof TFile) {
                await vault.modify(existingFile, JSON.stringify(enhancementMetadata, null, 2));
            } else {
                await vault.create(this.ENHANCED_DATA_FILE, JSON.stringify(enhancementMetadata, null, 2));
            }
        } catch (error) {
            console.error('[CanvasEnhancer] Failed to save enhancement data:', error);
        }
    }

    /**
     * Enhanced method: Add new skill node to canvas
     */
    static async addNewSkillNode(
        vault: Vault,
        skillName: string,
        skillType: 'class' | 'skill' | 'stat',
        parentNodeId?: string,
        position?: { x: number; y: number }
    ): Promise<boolean> {
        try {
            const canvasData = await this.loadCanvasData(vault);
            if (!canvasData) return false;

            // Construct the file path based on skill type
            let filePath: string;
            switch (skillType) {
                case 'class':
                    filePath = `SkillTree/Master-Class/Class/${skillName}.md`;
                    break;
                case 'skill':
                    filePath = `SkillTree/Master-Class/Skills/${skillName}.md`;
                    break;
                case 'stat':
                    filePath = `SkillTree/Master-Class/Stats/${skillName}.md`;
                    break;
                default:
                    filePath = `SkillTree/Master-Class/${skillName}.md`;
            }

            const newNode: CanvasNode = {
                id: `node-${Date.now()}`,
                type: 'file',
                file: filePath,
                x: position?.x || 100,
                y: position?.y || 100,
                width: this.NODE_SIZES[skillType].width,
                height: this.NODE_SIZES[skillType].height,
                nodeType: skillType,
                level: 1,
                cp: 0,
                maxCP: skillType === 'class' ? 500 : skillType === 'skill' ? 300 : 100,
                lastUpdated: new Date(),
                isActive: true,
                progressPercent: 0
            };

            canvasData.nodes.push(newNode);

            // Add connection to parent if specified (disabled to prevent portal issues)
            // if (parentNodeId) {
            //     const newEdge: CanvasEdge = {
            //         id: `edge-${parentNodeId}-${newNode.id}`,
            //         fromNode: parentNodeId,
            //         toNode: newNode.id,
            //         fromSide: 'bottom',
            //         toSide: 'top',
            //         connectionType: 'progression',
            //         strengthPercent: 0,
            //         isUnlocked: false,
            //         animated: true,
            //         color: this.COLORS.active,
            //         thickness: 2
            //     };

            //     canvasData.edges.push(newEdge);
            // }

            await vault.modify(
                vault.getAbstractFileByPath(this.CANVAS_FILE) as TFile,
                JSON.stringify(canvasData, null, 2)
            );

            return true;
        } catch (error) {
            console.error('[CanvasEnhancer] Failed to add new skill node:', error);
            return false;
        }
    }

    // Utility methods
    private static isMasterClassNode(node: CanvasNode): boolean {
        return node.text?.includes('MASTER') ||
            node.y < 100 ||
            node.width > 250;
    }

    private static wasRecentlyUpdated(lastUpdated?: Date): boolean {
        if (!lastUpdated) return false;
        const now = new Date();
        const diff = now.getTime() - lastUpdated.getTime();
        return diff < 24 * 60 * 60 * 1000; // Last 24 hours
    }

    /**
     * Clear enhancement cache and force refresh
     */
    static async refreshCanvas(vault: Vault): Promise<void> {
        console.log('[CanvasEnhancer] Forcing canvas refresh...');
        await this.enhanceCanvas(vault);
    }

    /**
     * Get canvas enhancement statistics
     */
    static async getEnhancementStats(vault: Vault): Promise<EnhancedCanvasData | null> {
        try {
            const file = vault.getAbstractFileByPath(this.ENHANCED_DATA_FILE);
            if (!file || !(file instanceof TFile)) return null;

            const content = await vault.read(file);
            return JSON.parse(content);
        } catch (error) {
            console.error('[CanvasEnhancer] Failed to get enhancement stats:', error);
            return null;
        }
    }

    /**
     * Main enhancement method called by the modal
     */
    static async enhanceSkillTreeCanvas(vault: Vault): Promise<EnhancedCanvasData | null> {
        return await this.enhanceCanvas(vault);
    }


}
