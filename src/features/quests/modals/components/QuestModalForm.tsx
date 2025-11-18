import React, { memo, useMemo, useCallback } from 'react';
import type { SkillMetadata } from '../../../../shared/utils/skillDiscovery';
import { PRIORITY_OPTIONS, DIFFICULTY_OPTIONS } from '../../utils/questUtils';
import styles from '../QuestModal.module.css';

interface QuestModalFormProps {
    // Form state
    title: string;
    setTitle: (title: string) => void;
    description: string;
    setDescription: (description: string) => void;
    skills: SkillMetadata[];
    allSkills: SkillMetadata[];
    skillsLoading: boolean;
    selectedSkill: string;
    setSelectedSkill: (skill: string) => void;
    priority: string;
    setPriority: (priority: string) => void;
    difficulty: string;
    setDifficulty: (difficulty: string) => void;
    xp: number;
    setXp: (xp: number) => void;
    cp: number;
    setCp: (cp: number) => void;
    due: string;
    setDue: (due: string) => void;
    time: string;
    setTime: (time: string) => void;
    estimatedMinutes: string;
    setEstimatedMinutes: (minutes: string) => void;
    recur: string;
    setRecur: (recur: string) => void;
    subtasks: Array<{ text: string; completed: boolean; description?: string }>;
    newSubtask: string;
    setNewSubtask: (subtask: string) => void;
    newSubtaskDescription: string;
    setNewSubtaskDescription: (description: string) => void;
    
    
    // Handlers
    handleSkillSelection: (skillName: string) => void;
    handleSkillRemoval: (skillName: string) => void;
    handleAddSubtask: () => void;
    handleRemoveSubtask: (index: number) => void;
    
    // Mobile
    isMobile: boolean;
}

export const QuestModalForm: React.FC<QuestModalFormProps> = memo(({
    title,
    setTitle,
    description,
    setDescription,
    skills,
    allSkills,
    skillsLoading,
    selectedSkill,
    setSelectedSkill,
    priority,
    setPriority,
    difficulty,
    setDifficulty,
    xp,
    setXp,
    cp,
    setCp,
    due,
    setDue,
    time,
    setTime,
    estimatedMinutes,
    setEstimatedMinutes,
    recur,
    setRecur,
    subtasks,
    newSubtask,
    setNewSubtask,
    newSubtaskDescription,
    setNewSubtaskDescription,
    handleSkillSelection,
    handleSkillRemoval,
    handleAddSubtask,
    handleRemoveSubtask,
    isMobile
}) => {
    return (
        <>
            {/* Quest Title */}
            <div style={{ marginBottom: 16 }}>
                <label style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 600,
                    color: "var(--text-normal)",
                    fontSize: 16,
                }}>
                    Quest Title *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter quest title..."
                    required
                    style={{
                        width: "100%",
                        padding: 14,
                        borderRadius: 8,
                        border: "2px solid var(--interactive-accent)",
                        backgroundColor: "var(--background-primary)",
                        color: "var(--text-normal)",
                        fontSize: 16,
                        fontWeight: 500,
                        transition: "all 0.2s ease",
                    }}
                />
            </div>

            {/* Skills Selection - Core */}
            <div style={{ marginBottom: 20 }}>
                <label style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 600,
                    color: "var(--text-normal)",
                    fontSize: 16,
                }}>
                    ⚔️ Skills *
                </label>
                
                {/* Skills Dropdown */}
                <select
                    value={selectedSkill}
                    onChange={(e) => handleSkillSelection(e.target.value)}
                    disabled={skillsLoading}
                    className={styles.select}
                    style={{ marginBottom: 12 }}
                >
                    <option value="">
                        {skillsLoading ? "Loading skills..." : "Select a skill to add..."}
                    </option>
                    {!skillsLoading && allSkills
                        .filter(skill => !skills.some(s => s.name === skill.name))
                        .map((skill) => (
                            <option key={skill.name} value={skill.name}>
                                {skill.name} ({skill.class})
                            </option>
                        ))
                    }
                </select>

                {/* Selected Skills Display - Enhanced */}
                {skills.length > 0 && (
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginBottom: 8,
                    }}>
                        {skills.map((skill) => (
                            <div key={skill.name} style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                padding: "12px 16px",
                                backgroundColor: "var(--background-secondary)",
                                border: "1px solid var(--background-modifier-border)",
                                borderRadius: 8,
                                fontSize: 13,
                            }}>
                                {/* Skill Header */}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}>
                                        <span style={{
                                            fontWeight: 600,
                                            color: "var(--text-normal)",
                                            fontSize: 14,
                                        }}>
                                            {skill.name}
                                        </span>
                                        <span style={{
                                            color: "var(--text-muted)",
                                            fontSize: 12,
                                        }}>
                                            •
                                        </span>
                                        <span style={{
                                            color: "var(--interactive-accent)",
                                            fontSize: 12,
                                            fontWeight: 500,
                                        }}>
                                            {skill.class}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleSkillRemoval(skill.name)}
                                        style={{
                                            background: "#f44336",
                                            border: "1px solid #f44336",
                                            borderRadius: "4px",
                                            color: "#ffffff",
                                            cursor: "pointer",
                                            width: 20,
                                            height: 20,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 12,
                                            fontWeight: "bold",
                                            position: "relative",
                                        }}
                                        title="Remove skill"
                                    >
                                        <span style={{
                                            position: "relative",
                                            width: "10px",
                                            height: "10px",
                                        }}>
                                            <span style={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "0",
                                                width: "100%",
                                                height: "1.5px",
                                                backgroundColor: "#ffffff",
                                                transform: "translateY(-50%) rotate(45deg)",
                                            }}></span>
                                            <span style={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "0",
                                                width: "100%",
                                                height: "1.5px",
                                                backgroundColor: "#ffffff",
                                                transform: "translateY(-50%) rotate(-45deg)",
                                            }}></span>
                                        </span>
                                    </button>
                                </div>
                                
                                {/* Master Class and Stats */}
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                    marginLeft: 4,
                                }}>
                                    {skill.masterClass && (
                                        <div style={{
                                            fontSize: 11,
                                            color: "var(--text-muted)",
                                        }}>
                                            <span style={{ fontWeight: 500 }}>Master Class:</span> {skill.masterClass}
                                        </div>
                                    )}
                                    {skill.stats && Object.keys(skill.stats).length > 0 && (
                                        <div style={{
                                            fontSize: 11,
                                            color: "var(--text-muted)",
                                        }}>
                                            <span style={{ fontWeight: 500 }}>Stats:</span> {Object.keys(skill.stats).map(statCode => {
                                                const statNames: Record<string, string> = {
                                                    'CHA': 'Charisma',
                                                    'CRE': 'Creativity', 
                                                    'DEX': 'Dexterity',
                                                    'END': 'Endurance',
                                                    'FAI': 'Faith',
                                                    'ING': 'Ingenuity',
                                                    'INT': 'Intelligence',
                                                    'MIN': 'Mindfulness',
                                                    'STR': 'Strength',
                                                    'WIL': 'Willpower',
                                                    'WIS': 'Wisdom'
                                                };
                                                return statNames[statCode] || statCode;
                                            }).join(", ")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Priority and Difficulty - Core */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                    <label style={{
                        display: "block",
                        marginBottom: 8,
                        fontWeight: 600,
                        color: "var(--text-normal)",
                        fontSize: 16,
                    }}>
                        📋 Priority
                    </label>
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className={styles.select}
                    >
                        {PRIORITY_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{
                        display: "block",
                        marginBottom: 8,
                        fontWeight: 600,
                        color: "var(--text-normal)",
                        fontSize: 16,
                    }}>
                        ⚡ Difficulty
                    </label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className={styles.select}
                    >
                        {DIFFICULTY_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* XP and CP Rewards - Core */}
            <div style={{ 
                display: "flex", 
                gap: 16, 
                marginBottom: 32,
                padding: 16,
                backgroundColor: "rgba(var(--interactive-accent-rgb), 0.1)",
                borderRadius: 12,
                border: "1px solid var(--interactive-accent)",
            }}>
                <div style={{ flex: 1 }}>
                    <label style={{
                        display: "block",
                        marginBottom: 8,
                        fontWeight: 600,
                        color: "var(--interactive-accent)",
                        fontSize: 16,
                    }}>
                        ✨ XP Reward
                    </label>
                    <input
                        type="number"
                        value={xp}
                        min={1}
                        onChange={(e) => setXp(Number(e.target.value))}
                        style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 8,
                            border: "2px solid var(--interactive-accent)",
                            backgroundColor: "var(--background-primary)",
                            color: "var(--text-normal)",
                            fontSize: 16,
                            fontWeight: 600,
                            textAlign: "center",
                        }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{
                        display: "block",
                        marginBottom: 8,
                        fontWeight: 600,
                        color: "var(--interactive-accent)",
                        fontSize: 16,
                    }}>
                        ⭐ CP Reward
                    </label>
                    <input
                        type="number"
                        value={cp}
                        min={0}
                        onChange={(e) => setCp(Number(e.target.value))}
                        style={{
                            width: "100%",
                            padding: 14,
                            borderRadius: 8,
                            border: "2px solid var(--interactive-accent)",
                            backgroundColor: "var(--background-primary)",
                            color: "var(--text-normal)",
                            fontSize: 16,
                            fontWeight: 600,
                            textAlign: "center",
                        }}
                    />
                </div>
            </div>

        </>
    );
});
