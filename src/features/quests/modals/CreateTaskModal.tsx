import React, { useState, useEffect } from "react";
import { App, TFile } from "obsidian";
import { getAllSkills, SkillMetadata as SkillDiscoveryMetadata } from "../../../shared/utils/skillDiscovery";
import { generateMarkdownTask, MetadataStyle, SkillMetadata } from "../../../features/quests/utils/taskParser";

const GAMIFIED_TASKS_PATH = "GamifiedTasks.md";

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    app?: App;
    onTaskCreated: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen,
    onClose,
    app,
    onTaskCreated,
}) => {
    const [skills, setSkills] = useState<SkillMetadata[]>([]);
    const [allSkillsData, setAllSkillsData] = useState<SkillDiscoveryMetadata[]>([]);
    const [selectedSkill, setSelectedSkill] = useState<SkillMetadata | null>(null);
    const [selectedSkillData, setSelectedSkillData] = useState<SkillDiscoveryMetadata | null>(null);
    const [title, setTitle] = useState("");
    const [xp, setXp] = useState(100);
    const [priority, setPriority] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [metadataStyle, setMetadataStyle] = useState<MetadataStyle>("tags");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load skills on mount
    useEffect(() => {
        const loadSkills = async () => {
            if (app?.vault) {
                try {
                    const allSkills = await getAllSkills(app.vault);
                    setAllSkillsData(allSkills);
                    const convertedSkills: SkillMetadata[] = allSkills.map(skill => ({
                        name: skill.name,
                        class: skill.class,
                        stats: skill.stats ? Object.fromEntries(
                            Object.entries(skill.stats).map(([key, value]) => [key, 0])
                        ) : undefined
                    }));
                    setSkills(convertedSkills);
                } catch (error) {
                    console.error("Failed to load skills:", error);
                }
            }
        };

        if (isOpen) {
            loadSkills();
        }
    }, [app, isOpen]);

    // Auto-select first skill
    useEffect(() => {
        if (skills.length && !selectedSkill && allSkillsData.length) {
            setSelectedSkill(skills[0]);
            setSelectedSkillData(allSkillsData[0]);
        }
    }, [skills, selectedSkill, allSkillsData]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTitle("");
            setPriority("");
            setDifficulty("");
            setXp(100);
            setSelectedSkill(null);
            setSelectedSkillData(null);
        }
    }, [isOpen]);

    // Auto-calculate coins
    const coins = Math.round(xp * 0.1);
    const currencyName: string = ((window as Window & { app?: { plugins?: { plugins?: Record<string, { settings?: { currencyName?: string } }> } } })?.app?.plugins?.plugins?.["Gamification-into-Obsidian"]
        || (window as Window & { app?: { plugins?: { plugins?: Record<string, { settings?: { currencyName?: string } }> } } })?.app?.plugins?.plugins?.["Gamification-into-Obsidian"])?.settings?.currencyName || "Coins";

    // Handle task creation
    const handleCreateTask = async () => {
        if (!title || !selectedSkill || !app?.vault) return;

        setIsSubmitting(true);
        try {
            const md = generateMarkdownTask({
                title,
                subtasks: [],
                skills: [selectedSkill],
                priority,
                difficulty,
                xp,
                cp: xp,
                metadataStyle,
            });

            // Ensure file exists
            let file = app.vault.getAbstractFileByPath(GAMIFIED_TASKS_PATH);
            if (!file) {
                file = await app.vault.create(GAMIFIED_TASKS_PATH, "");
            }
            
            if (file instanceof TFile) {
                const content = await app.vault.read(file);
                await app.vault.modify(
                    file,
                    content + (content ? "\n" : "") + md + "\n"
                );
                
                onTaskCreated();
                onClose();
            }
        } catch (error) {
            console.error("Failed to create task:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "var(--background-primary)",
                    padding: 24,
                    borderRadius: 12,
                    maxWidth: 500,
                    width: "90%",
                    maxHeight: "80vh",
                    overflow: "auto",
                    border: "1px solid var(--background-modifier-border)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 20,
                    }}
                >
                    <h2 style={{ margin: 0, color: "var(--text-normal)" }}>
                        Create New Task
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: 20,
                            cursor: "pointer",
                            color: "var(--text-muted)",
                        }}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleCreateTask(); }}>
                    {/* Metadata Style */}
                    <div style={{ marginBottom: 16 }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
                            }}
                        >
                            Metadata Style
                        </label>
                        <select
                            value={metadataStyle}
                            onChange={(e) => setMetadataStyle(e.target.value as MetadataStyle)}
                            style={{
                                width: "100%",
                                padding: 8,
                                borderRadius: 4,
                                border: "1px solid var(--background-modifier-border)",
                                backgroundColor: "var(--background-secondary)",
                                color: "var(--text-normal)",
                            }}
                        >
                            <option value="tags">Tags & Dataview</option>
                            <option value="emoji">Emoji Inline</option>
                        </select>
                    </div>

                    {/* Title */}
                    <div style={{ marginBottom: 16 }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
                            }}
                        >
                            Task Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task title..."
                            style={{
                                width: "100%",
                                padding: 8,
                                borderRadius: 4,
                                border: "1px solid var(--background-modifier-border)",
                                backgroundColor: "var(--background-secondary)",
                                color: "var(--text-normal)",
                            }}
                            required
                        />
                    </div>

                    {/* Skill Selection */}
                    <div style={{ marginBottom: 16 }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
                            }}
                        >
                            Skill *
                        </label>
                        <select
                            value={selectedSkill?.name || ""}
                            onChange={(e) => {
                                const skill = skills.find(s => s.name === e.target.value);
                                const skillData = allSkillsData.find(s => s.name === e.target.value);
                                setSelectedSkill(skill || null);
                                setSelectedSkillData(skillData || null);
                            }}
                            style={{
                                width: "100%",
                                padding: 8,
                                borderRadius: 4,
                                border: "1px solid var(--background-modifier-border)",
                                backgroundColor: "var(--background-secondary)",
                                color: "var(--text-normal)",
                            }}
                            required
                        >
                            <option value="">Select a skill...</option>
                            {skills.map((skill) => (
                                <option key={skill.name} value={skill.name}>
                                    {skill.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Class (readonly) */}
                    {selectedSkill && (
                        <div style={{ marginBottom: 16 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}
                            >
                                Class
                            </label>
                            <input
                                type="text"
                                value={selectedSkill.class || ""}
                                readOnly
                                style={{
                                    width: "100%",
                                    padding: 8,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-modifier-form-field-highlighted)",
                                    color: "var(--text-muted)",
                                }}
                            />
                        </div>
                    )}

                    {/* Master Class (readonly) */}
                    {selectedSkillData?.masterClass && (
                        <div style={{ marginBottom: 16 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}
                            >
                                Master Class
                            </label>
                            <input
                                type="text"
                                value={selectedSkillData.masterClass}
                                readOnly
                                style={{
                                    width: "100%",
                                    padding: 8,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-modifier-form-field-highlighted)",
                                    color: "var(--text-muted)",
                                }}
                            />
                        </div>
                    )}

                    {/* Stats (readonly) */}
                    {selectedSkill?.stats && (
                        <div style={{ marginBottom: 16 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}
                            >
                                Stats
                            </label>
                            <input
                                type="text"
                                value={Object.keys(selectedSkill.stats).join(", ")}
                                readOnly
                                style={{
                                    width: "100%",
                                    padding: 8,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-modifier-form-field-highlighted)",
                                    color: "var(--text-muted)",
                                }}
                            />
                        </div>
                    )}

                    {/* XP and Coins */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                        <div style={{ flex: 1 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}
                            >
                                XP Reward
                            </label>
                            <input
                                type="number"
                                value={xp}
                                min={1}
                                onChange={(e) => setXp(Number(e.target.value))}
                                style={{
                                    width: "100%",
                                    padding: 8,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}
                            >
                                {currencyName} (Auto)
                            </label>
                            <input
                                type="number"
                                value={coins}
                                readOnly
                                style={{
                                    width: "100%",
                                    padding: 8,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-modifier-form-field-highlighted)",
                                    color: "var(--text-muted)",
                                }}
                            />
                        </div>
                    </div>

                    {/* Priority and Difficulty */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                        <div style={{ flex: 1 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}
                            >
                                Priority (Optional)
                            </label>
                            <input
                                type="text"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                placeholder="e.g., High, Medium, Low"
                                style={{
                                    width: "100%",
                                    padding: 8,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}
                            >
                                Difficulty (Optional)
                            </label>
                            <input
                                type="text"
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                placeholder="e.g., Easy, Medium, Hard"
                                style={{
                                    width: "100%",
                                    padding: 8,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                }}
                            />
                        </div>
                    </div>

                    {/* Live Preview */}
                    {title && selectedSkill && (
                        <div style={{ marginBottom: 16 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}
                            >
                                Live Preview
                            </label>
                            <pre
                                style={{
                                    background: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                    padding: 12,
                                    borderRadius: 6,
                                    fontSize: 13,
                                    whiteSpace: "pre-wrap",
                                    border: "1px solid var(--background-modifier-border)",
                                    overflow: "auto",
                                }}
                            >
                                {generateMarkdownTask({
                                    title,
                                    subtasks: [],
                                    skills: [selectedSkill],
                                    priority,
                                    difficulty,
                                    xp,
                                    cp: xp,
                                    metadataStyle,
                                })}
                            </pre>
                        </div>
                    )}

                    {/* Submit buttons */}
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: "var(--background-secondary)",
                                border: "1px solid var(--background-modifier-border)",
                                borderRadius: 6,
                                color: "var(--text-normal)",
                                cursor: "pointer",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title || !selectedSkill || isSubmitting}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: (!title || !selectedSkill || isSubmitting) 
                                    ? "var(--background-modifier-border)" 
                                    : "var(--interactive-accent)",
                                border: "none",
                                borderRadius: 6,
                                color: "white",
                                cursor: (!title || !selectedSkill || isSubmitting) 
                                    ? "not-allowed" 
                                    : "pointer",
                                fontWeight: 600,
                                opacity: (!title || !selectedSkill || isSubmitting) ? 0.5 : 1,
                            }}
                        >
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 