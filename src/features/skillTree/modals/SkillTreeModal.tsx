import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { TFile, Notice } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import { getAllSkills, getAllClasses, getAllStats, SkillMetadata, ClassMetadata, StatMetadata } from '../../../shared/utils/skillDiscovery';
import { SkillProgressVisual } from '../components/SkillProgressVisual';
import { MobileSkillTree } from '../components/MobileSkillTree';
import styles from './SkillTreeModal.module.css';

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

interface SkillTreeModalProps {
    isOpen: boolean;
    onClose: () => void;
    plugin: GamifiedObsidianPlugin;
    initialTab?: 'overview' | 'progress' | 'mobile' | 'manage' | 'create';
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
    isOpen,
    onClose,
    plugin,
    initialTab = 'overview'
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'mobile' | 'manage' | 'create'>(initialTab);
    const [skills, setSkills] = useState<SkillMetadata[]>([]);
    const [classes, setClasses] = useState<Record<string, SkillMetadata[]>>({});
    const [allClasses, setAllClasses] = useState<ClassMetadata[]>([]);
    const [allStats, setAllStats] = useState<StatMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState<string>('');
    
    // Create form states
    const [createType, setCreateType] = useState<'skill' | 'class'>('skill');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        class: '',
        stats: [] as string[],
        category: '',
        showStatsDropdown: false
    });

    // Load skill data
    useEffect(() => {
        if (isOpen) {
            loadSkillData();
        }
    }, [isOpen]);

    const loadSkillData = async () => {
        try {
            setIsLoading(true);
            const allSkills = await getAllSkills(plugin.app.vault);
            const allClassesData = await getAllClasses(plugin.app.vault);
            const allStatsData = await getAllStats(plugin.app.vault);
            
            // Separate skills
            const skillItems = allSkills.filter(item => item.filePath.includes('/Skills/'));
            
            setSkills(skillItems);
            setAllClasses(allClassesData);
            setAllStats(allStatsData);
            
            // Group skills by class
            const classGroups = skillItems.reduce((acc, skill) => {
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
        } catch (error) {
            console.error('Failed to load skill data:', error);
            showNotice('❌ Failed to load skill data');
        } finally {
            setIsLoading(false);
        }
    };

    const showNotice = (message: string) => {
        new Notice(message);
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

    const refreshCanvas = async () => {
        try {
            const { CanvasEnhancer } = await import('../utils/canvasEnhancer');
            await CanvasEnhancer.refreshCanvas(plugin.app.vault);
            showNotice('✅ Canvas refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh canvas:', error);
            showNotice('❌ Failed to refresh canvas');
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
                class: '',
                stats: [],
                category: '',
                showStatsDropdown: false
            });
            
            // Reload data
            await loadSkillData();
        } catch (error) {
            console.error('Failed to create:', error);
            showNotice(`❌ Failed to create ${createType}: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const createNewSkill = async () => {
        const statsArray = formData.stats;
        const skillPath = `SkillTree/Master-Class/Skills/${formData.name}.md`;
        
        const content = `---
name: ${formData.name}
class: ${formData.class}
level: 1
currentCP: 0
requiredCP: 100
totalCP: 0
stats: [${statsArray.map(s => `"${s}"`).join(', ')}]
description: "${formData.description}"
---

# ${formData.name}

${formData.description}

## Class Assignment
This skill belongs to the **${formData.class}** class.

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
                showNotice(`✅ Created skill "${formData.name}" assigned to ${formData.class}`);
                
                // Add to canvas
                await addSkillToCanvas(formData.name, formData.class);
            };

            const createNewClass = async () => {
                const classPath = `SkillTree/Master-Class/Class/${formData.name}.md`;
                
                const content = `---
name: ${formData.name}
masterClass: Jester
level: 1
currentCP: 0
requiredCP: 100
totalCP: 0
description: ""
---

# ${formData.name}

## Class Overview
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
                showNotice(`✅ Created class "${formData.name}"`);
                
                // Add to canvas
                await addClassToCanvas(formData.name);
            };





    const addSkillToCanvas = async (skillName: string, className: string) => {
        try {
            const canvasFile = plugin.app.vault.getAbstractFileByPath('SkillTree/SkillTree.canvas');
            if (!canvasFile || !(canvasFile instanceof TFile)) {
                showNotice('❌ Canvas file not found. Please create it first.');
                return;
            }

            const content = await plugin.app.vault.read(canvasFile);
            const canvasData: CanvasData = JSON.parse(content);

            // Find the class node
            const classNode = canvasData.nodes.find((node: CanvasNode) => 
                node.file === `SkillTree/Master-Class/Class/${className}.md`
            );

            if (!classNode) {
                showNotice(`❌ Class node "${className}" not found in canvas`);
                return;
            }

            // Calculate position for new skill node (below the class)
            const skillX = classNode.x;
            const skillY = classNode.y + classNode.height + 50;

            // Create new skill node
            const newNode: CanvasNode = {
                "id": `skill-${skillName.toLowerCase().replace(/\s+/g, '-')}`,
                "type": "file",
                "file": `SkillTree/Master-Class/Skills/${skillName}.md`,
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
            const canvasFile = plugin.app.vault.getAbstractFileByPath('SkillTree/SkillTree.canvas');
            if (!canvasFile || !(canvasFile instanceof TFile)) {
                showNotice('❌ Canvas file not found. Please create it first.');
                return;
            }

            const content = await plugin.app.vault.read(canvasFile);
            const canvasData: CanvasData = JSON.parse(content);

            // Find the Jester master class node
            const masterNode = canvasData.nodes.find((node: CanvasNode) => 
                node.file === 'SkillTree/Master-Class/Jester 🎭.md'
            );

            if (!masterNode) {
                showNotice('❌ Jester master class node not found in canvas');
                return;
            }

            // Calculate position for new class node
            const existingClasses = canvasData.nodes.filter((node: CanvasNode) => 
                node.id !== masterNode.id && node.file && node.file.includes('SkillTree/Master-Class/Class/')
            );
            const classCount = existingClasses.length;
            
            // Position classes in a circle around the master node
            const angle = (classCount * 60) * (Math.PI / 180); // 60 degrees apart
            const radius = 200;
            const x = masterNode.x + Math.cos(angle) * radius;
            const y = masterNode.y + masterNode.height + 50 + Math.sin(angle) * radius;

            // Create new class node
            const newNode: CanvasNode = {
                "id": `class-${className.toLowerCase().replace(/\s+/g, '-')}`,
                "type": "file",
                "file": `SkillTree/Master-Class/Class/${className}.md`,
                "x": Math.round(x),
                "y": Math.round(y),
                "width": 200,
                "height": 80
            };

            // Create connection from master to class
            const newEdge = {
                "id": `edge-${masterNode.id}-${newNode.id}`,
                "fromNode": masterNode.id,
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
            console.error('Failed to add class to canvas:', error);
            showNotice('❌ Failed to add class to canvas');
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>🌳 Skill Tree Manager</h2>
                    <button className={styles.closeButton} onClick={onClose}>✕</button>
                </div>

                <div className={styles.tabNavigation}>
                    <button 
                        className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        📊 Canvas View
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'progress' ? styles.active : ''}`}
                        onClick={() => setActiveTab('progress')}
                    >
                        📈 Progress View
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'mobile' ? styles.active : ''}`}
                        onClick={() => setActiveTab('mobile')}
                    >
                        📱 Mobile View
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
                                    <h3>📊 Canvas Operations</h3>
                                    <div className={styles.canvasActions}>
                                        <button 
                                            className={styles.primaryButton}
                                            onClick={handleCanvasView}
                                        >
                                            👁️ View Canvas File
                                        </button>
                                        <button 
                                            className={styles.primaryButton}
                                            onClick={refreshCanvas}
                                            style={{ marginLeft: '10px' }}
                                        >
                                            🔄 Refresh Canvas
                                        </button>
                                    </div>
                                    
                                    <div className={styles.skillOverview}>
                                        <h4>📈 Skill Tree Overview</h4>
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
                                    <h3>⚙️ Manage Existing Skills</h3>
                                    
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
                                        {(selectedClass ? classes[selectedClass] : skills).map(skill => (
                                            <div key={skill.filePath} className={styles.skillItem}>
                                                <div className={styles.skillInfo}>
                                                    <h4>{skill.name}</h4>
                                                    <p>Class: {skill.class}</p>
                                                    <p>Level: {skill.level || 1} | CP: {skill.cp || 0}</p>
                                                    {skill.description && (
                                                        <p className={styles.description}>{skill.description}</p>
                                                    )}
                                                </div>
                                                <div className={styles.skillActions}>
                                                    <button onClick={() => handleSkillEdit(skill)}>
                                                        ✏️ Edit
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'create' && (
                                <div className={styles.createTab}>
                                    <h3>🆕 Create New</h3>
                                    
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
                                            <label>Description:</label>
                                            <textarea 
                                                value={formData.description}
                                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                                placeholder="Enter description..."
                                                rows={3}
                                            />
                                        </div>

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
                                            </>
                                        )}

                                        {createType === 'class' && (
                                            <div className={styles.formField}>
                                                <label>Class Description:</label>
                                                <textarea 
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                                    placeholder="Enter class description..."
                                                    rows={3}
                                                />
                                            </div>
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

                            {activeTab === 'progress' && (
                                <div className={styles.progressTab}>
                                    <h3>📈 Skill Progress Visualization</h3>
                                    <div className={styles.progressGrid}>
                                        {skills.map(skill => (
                                            <SkillProgressVisual
                                                key={skill.filePath}
                                                skill={{
                                                    name: skill.name,
                                                    currentLevel: skill.level || 1,
                                                    currentCP: skill.cp || 0,
                                                    requiredCP: (skill.level || 1) * 100,
                                                    totalCP: skill.cp || 0,
                                                    maxLevel: 10,
                                                    isUnlocked: true,
                                                    isMastered: (skill.level || 1) >= 10,
                                                    progressToNext: ((skill.cp || 0) % 100) / 100 * 100
                                                }}
                                                onSkillClick={(skillName) => {
                                                    const selectedSkill = skills.find(s => s.name === skillName);
                                                    if (selectedSkill) {
                                                        handleSkillEdit(selectedSkill);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'mobile' && (
                                <div className={styles.mobileTab}>
                                    <h3>📱 Mobile-Optimized Skill Tree</h3>
                                    <MobileSkillTree
                                        skills={skills.map(skill => ({
                                            name: skill.name,
                                            currentLevel: skill.level || 1,
                                            currentCP: skill.cp || 0,
                                            requiredCP: (skill.level || 1) * 100,
                                            totalCP: skill.cp || 0,
                                            maxLevel: 10,
                                            isUnlocked: true,
                                            isMastered: (skill.level || 1) >= 10,
                                            progressToNext: ((skill.cp || 0) % 100) / 100 * 100,
                                            class: skill.class,
                                            description: skill.description
                                        }))}
                                        onSkillSelect={(skill) => {
                                            const selectedSkill = skills.find(s => s.name === skill.name);
                                            if (selectedSkill) {
                                                handleSkillEdit(selectedSkill);
                                            }
                                        }}
                                        onBackToOverview={() => setActiveTab('overview')}
                                    />
                                </div>
                            )}


                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SkillTreeModal;
