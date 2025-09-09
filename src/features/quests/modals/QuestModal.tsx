import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { TFile } from "obsidian";
import type GamifiedObsidianPlugin from "../../../core/main";
import type { SkillMetadata } from "../../../shared/utils/skillDiscovery";
import { QuestGiverAvatar } from "../../../features/quests/components/QuestGiverAvatar";
import { useTypewriter } from "../../../data/hooks/useTypewriter";
import styles from "./QuestModal.module.css";
import {
    PRIORITY_OPTIONS,
    DIFFICULTY_OPTIONS,
    getXPRange,
    getCPRange,
    getRandomInRange,
    generateMarkdownTask,
} from "../../../features/quests/utils/questUtils";
import {
    QuestRewardItem,
    getRarityColor,
    getRarityDisplayName,
    QUEST_REWARD_ITEMS,
} from "../../../features/quests/utils/questRewardsSystem";
import type { Quest } from "../utils/taskParser";

export interface QuestModalProps {
    isOpen: boolean;
    onClose: () => void;
    plugin: GamifiedObsidianPlugin;
    mode: "create" | "edit";
    quest?: Quest | null;
    onSubmit: () => void;
}

export const QuestModal: React.FC<QuestModalProps> = ({
    isOpen,
    onClose,
    plugin,
    mode,
    quest,
    onSubmit,
}) => {
    // Store original quest title for editing mode to find the quest in the file
    const [originalQuestTitle] = useState(() => {
        console.log("Initializing originalQuestTitle - mode:", mode, "quest:", quest);
        if (mode === "edit" && quest) {
            console.log("Quest object:", quest);
            console.log("Quest title:", quest.title);
            console.log("Quest id:", quest.id);
        }
        const title = mode === "edit" && quest ? quest.title : "";
        console.log("Original quest title set to:", title);
        return title;
    });
    
    // State initialization
    const [title, setTitle] = useState(mode === "edit" && quest ? quest.title : "");
    const [description, setDescription] = useState(mode === "edit" && quest ? quest.description || "" : "");
    const [skills, setSkills] = useState<SkillMetadata[]>([]);
    const [allSkills, setAllSkills] = useState<SkillMetadata[]>([]);
    const [skillsLoading, setSkillsLoading] = useState(true);
    const [selectedSkill, setSelectedSkill] = useState<string>("");
    const [priority, setPriority] = useState(mode === "edit" && quest ? quest.priority || "Medium" : "Medium");
    const [difficulty, setDifficulty] = useState(mode === "edit" && quest ? quest.difficulty || "Medium" : "Medium");
    const [xp, setXp] = useState(mode === "edit" && quest ? quest.xp || 0 : getRandomInRange(...getXPRange("Medium")));
    const [cp, setCp] = useState(mode === "edit" && quest ? quest.cp || 0 : getRandomInRange(...getCPRange("Medium")));
    const [due, setDue] = useState(mode === "edit" && quest ? quest.due || "" : "");
    const [recur, setRecur] = useState(mode === "edit" && quest ? quest.recur || "" : "");
    const [error, setError] = useState<string | null>(null);
    const [subtasks, setSubtasks] = useState<{ text: string; completed: boolean; description?: string }[]>(mode === "edit" && quest ? quest.subtasks || [] : []);
    const [newSubtask, setNewSubtask] = useState("");
    const [newSubtaskDescription, setNewSubtaskDescription] = useState("");
    const [showTaskPreview, setShowTaskPreview] = useState(false);
    
    // Reward customization
    const [customRewards, setCustomRewards] = useState<Array<{ name: string; quantity: number; item?: QuestRewardItem }>>([]);
    const [newRewardName, setNewRewardName] = useState("");
    const [newRewardQuantity, setNewRewardQuantity] = useState(1);
    
    // Boss system
    const [enableBossBattle, setEnableBossBattle] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState(mode === "edit" && quest ? quest.estimatedTime || "" : "");
    const [bossRecommendation, setBossRecommendation] = useState({
        shouldCreate: false,
        bossType: 'mini-boss',
        reason: 'Enable boss battle to see recommendations'
    });
    
    // Quest Giver dialogue with proper typewriter effect
    const [dialogue] = useState<string>(mode === "edit"
        ? `Ah, you wish to modify your quest "${quest?.title || "Unknown Quest"}"? Very well, let us review the details and make the necessary adjustments to ensure your success!`
        : "Greetings, brave adventurer! I sense great potential within you. Let us forge a new quest together - one that will test your skills and reward your dedication. What challenge shall we create today?");
    const [questGiverCollapsed] = useState(false);
    const [questGiverImagePath, setQuestGiverImagePath] = useState(plugin.settings.questGiverImagePath || "assets/questgiver.jpg");

    // Handle quest giver image change
    const handleQuestGiverImageChange = (newPath: string) => {
        setQuestGiverImagePath(newPath);
        plugin.settings.questGiverImagePath = newPath;
        plugin.saveSettings();
    };

    // Typewriter effect for dialogue
    const { displayed: animatedDialogue, isAnimating } = useTypewriter(dialogue, 30);

    // Load all skills from skillDiscovery
    useEffect(() => {
        (async () => {
            const mod = await import("../../../shared/utils/skillDiscovery");
            if (mod.getAllSkills && plugin?.app?.vault) {
                setSkillsLoading(true);
                const skillsData = await mod.getAllSkills(plugin.app.vault);
                setAllSkills(skillsData);
                
                // If editing a quest, populate the skills from quest.skills array
                if (mode === "edit" && quest && quest.skills && skillsData.length > 0) {
                    const questSkills = quest.skills
                        .map((skillName) => skillsData.find((s) => s.name === skillName))
                        .filter((skill) => skill !== undefined) as SkillMetadata[];
                    setSkills(questSkills);
                }
                setSkillsLoading(false);
            }
        })();
    }, [plugin, quest, mode]);

    // Initialize edit mode data when quest changes
    useEffect(() => {
        if (mode === "edit" && quest) {
            setTitle(quest.title || "");
            setDescription(quest.description || "");
            setPriority(quest.priority || "Medium");
            setDifficulty(quest.difficulty || "Medium");
            setXp(quest.xp || 0);
            setCp(quest.cp || 0);
            setDue(quest.due || "");
            setRecur(quest.recur || "");
            setSubtasks(quest.subtasks || []);
            setEstimatedTime(quest.estimatedTime || "");
            
            // Custom rewards from quest.rewards
            if (quest.rewards && quest.rewards.length > 0) {
                const rewards = quest.rewards.map(reward => ({
                    name: reward,
                    quantity: 1,
                    item: QUEST_REWARD_ITEMS.find(item => 
                        item.name.toLowerCase() === reward.toLowerCase()
                    )
                }));
                setCustomRewards(rewards);
            }
        }
    }, [quest, mode]);

    // Auto-update XP when priority changes (only in create mode)
    useEffect(() => {
        if (mode === "create" && priority) {
            const [min, max] = getXPRange(priority);
            setXp(getRandomInRange(min, max));
        }
    }, [priority, mode]);

    // Auto-update CP when difficulty changes (only in create mode)
    useEffect(() => {
        if (mode === "create" && difficulty) {
            const [min, max] = getCPRange(difficulty);
            setCp(getRandomInRange(min, max));
        }
    }, [difficulty, mode]);
    
    // Update boss recommendation when quest parameters change
    useEffect(() => {
        if (mode === "create" && enableBossBattle) {
            // Import and use BossQuestIntegration to get recommendations
            import("../utils/bossQuestIntegration").then(({ BossQuestIntegration }) => {
                const mockQuest: Partial<Quest> = {
                    title,
                    difficulty,
                    priority,
                    estimatedTime,
                    subtasks,
                    id: "temp"
                };
                
                const recommendation = BossQuestIntegration.getBossRecommendation(mockQuest as Quest);
                setBossRecommendation(recommendation);
            });
        }
    }, [title, difficulty, priority, estimatedTime, subtasks, enableBossBattle, mode]);

    // Generate task preview
    const generateTaskPreview = () => {
        const taskData = {
            title,
            description,
            skills: skills, // Keep as SkillMetadata[]
            priority,
            difficulty,
            xp,
            cp,
            due,
            recur,
            subtasks,
            customRewards: customRewards.map(r => r.quantity > 1 ? `${r.name} x${r.quantity}` : r.name), // Convert to string[]
        };
        return generateMarkdownTask({
            title: taskData.title,
            description: taskData.description,
            skills: taskData.skills.map(s => s.name), // Convert SkillMetadata to string
            priority: taskData.priority,
            difficulty: taskData.difficulty,
            xp: taskData.xp,
            cp: taskData.cp,
            due: taskData.due,
            recur: taskData.recur,
            subtasks: taskData.subtasks,
            customRewards: taskData.customRewards
        });
    };

    // Handle skill selection from dropdown
    const handleSkillSelection = (skillName: string) => {
        if (!skillName) return;
        
        const skill = allSkills.find(s => s.name === skillName);
        if (skill && !skills.some(s => s.name === skillName)) {
            setSkills([...skills, skill]);
        }
        setSelectedSkill("");
    };

    // Handle skill removal
    const handleSkillRemoval = (skillName: string) => {
        setSkills(skills.filter(s => s.name !== skillName));
    };

    // Handle adding subtask
    const handleAddSubtask = () => {
        if (newSubtask.trim()) {
            setSubtasks([...subtasks, { 
                text: newSubtask.trim(), 
                completed: false,
                description: newSubtaskDescription.trim() || undefined
            }]);
            setNewSubtask("");
            setNewSubtaskDescription("");
        }
    };

    // Handle removing subtask
    const handleRemoveSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    // Handle adding custom reward
    const handleAddCustomReward = () => {
        if (newRewardName.trim()) {
            const existingItem = QUEST_REWARD_ITEMS.find(item => 
                item.name.toLowerCase() === newRewardName.toLowerCase()
            );
            setCustomRewards([...customRewards, {
                name: newRewardName.trim(),
                quantity: newRewardQuantity,
                item: existingItem
            }]);
            setNewRewardName("");
            setNewRewardQuantity(1);
        }
    };

    // Handle removing custom reward
    const handleRemoveCustomReward = (index: number) => {
        setCustomRewards(customRewards.filter((_, i) => i !== index));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("Quest title is required");
            return;
        }

        if (skills.length === 0) {
            setError("At least one skill is required for the quest.");
            return;
        }

        try {
            const questsFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
            if (!(questsFile instanceof TFile)) {
                setError("GamifiedTasks.md file not found");
                return;
            }

            const content = await plugin.app.vault.read(questsFile);
            const taskData = {
                title: title.trim(),
                description: description.trim(),
                skills: skills, // Keep as SkillMetadata[]
                priority,
                difficulty,
                xp,
                cp,
                due,
                recur,
                subtasks,
                customRewards: customRewards.map(r => r.quantity > 1 ? `${r.name} x${r.quantity}` : r.name), // Convert to string[]
            };

            const newTask = generateMarkdownTask({
                title: taskData.title,
                description: taskData.description,
                skills: taskData.skills.map(s => s.name), // Convert SkillMetadata to string
                priority: taskData.priority,
                difficulty: taskData.difficulty,
                xp: taskData.xp,
                cp: taskData.cp,
                due: taskData.due,
                recur: taskData.recur,
                subtasks: taskData.subtasks,
                customRewards: taskData.customRewards
            });

            let newContent: string;
            if (mode === "create") {
                // Add new quest
                newContent = content + "\n" + newTask;
            } else {
                // Update existing quest
                const lines = content.split("\n");
                
                // Find the quest line by looking for the quest in the file
                // Instead of relying on title matching, let's use the quest ID or better identification
                let questIndex = -1;
                
                // First, try to find by quest ID if available
                if (mode === "edit" && quest && quest.id) {
                    console.log("Looking for quest with ID:", quest.id);
                    questIndex = lines.findIndex(line => {
                        if (!line.includes("#gamified-task")) return false;
                        // Extract title from line and generate ID to compare
                        const titleMatch = line.match(/^- \[([ x])\]\s*(?:⏫|🔼|⏩|\s)*(.+?)\s+#gamified-task/u);
                        if (titleMatch) {
                            const extractedTitle = titleMatch[2].trim().replace(/[⏫🔼⏩]/gu, '').trim();
                            const lineId = extractedTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                            console.log("Comparing quest IDs:", lineId, "vs", quest.id);
                            return lineId === quest.id;
                        }
                        return false;
                    });
                }
                
                // If ID matching failed, try to find by the original quest content
                if (questIndex === -1) {
                    console.log("ID matching failed, trying content matching");
                    console.log("Original quest object:", quest);
                    
                    // Try to match by multiple quest properties (XP, CP, skills, etc.)
                    questIndex = lines.findIndex(line => {
                        if (!line.includes("#gamified-task")) return false;
                        console.log("Checking line:", line);
                        
                        // Check if this line contains the quest's XP and CP values
                        if (quest && quest.xp && quest.cp) {
                            const hasXP = line.includes(`✨${quest.xp}`);
                            const hasCP = line.includes(`⭐${quest.cp}`);
                            console.log("XP match:", hasXP, "CP match:", hasCP);
                            
                            if (hasXP && hasCP) {
                                console.log("Found quest by XP/CP match");
                                return true;
                            }
                        }
                        
                        return false;
                    });
                }
                
                // Final fallback: try to find by skills
                if (questIndex === -1 && quest && quest.skills && Array.isArray(quest.skills) && quest.skills.length > 0) {
                    console.log("Trying to find by skills:", quest.skills);
                    questIndex = lines.findIndex(line => {
                        if (!line.includes("#gamified-task")) return false;
                        // Check if the line contains the quest's skills
                        return quest.skills!.some(skill => line.includes(skill));
                    });
                }
                
                if (questIndex !== -1) {
                    // Preserve the completion status from the original quest
                    const originalLine = lines[questIndex];
                    const isCompleted = originalLine.includes("- [x]");
                    let newTaskLine = newTask;
                    
                    if (isCompleted) {
                        newTaskLine = newTask.replace("- [ ]", "- [x]");
                    }
                    
                    lines[questIndex] = newTaskLine;
                    newContent = lines.join("\n");
                } else {
                    console.error("Could not find quest to update. Available lines with #gamified-task:");
                    lines.forEach((line, idx) => {
                        if (line.includes("#gamified-task")) {
                            console.log(`Line ${idx}: ${line}`);
                        }
                    });
                    console.error("Search title was:", originalQuestTitle || title.trim());
                    setError("Could not find quest to update");
                    return;
                }
            }

            await plugin.app.vault.modify(questsFile, newContent);
            onSubmit();
            onClose();
        } catch (error) {
            console.error("Error saving quest:", error);
            setError("Failed to save quest. Please try again.");
        }
    };

    if (!isOpen) return null;

    const selectedSkillData = allSkills.find(s => s.name === selectedSkill);

    // Quest Modal UI
    return ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 style={{
                    margin: "0 0 20px 0",
                    color: "var(--text-normal)",
                    fontSize: "24px",
                    fontWeight: 700,
                }}>
                    {mode === "create" ? "Create New Quest" : "Edit Quest"}
                </h2>

                {/* Quest Giver */}
                {!questGiverCollapsed && (
                    <div style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 20,
                        border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}>
                        <QuestGiverAvatar
                            plugin={plugin}
                            imagePath={questGiverImagePath}
                            onImageChange={handleQuestGiverImageChange}
                            collapsed={false}
                        />
                        
                        <div style={{
                            marginTop: 12,
                            padding: 12,
                            background: "rgba(0, 0, 0, 0.3)",
                            borderRadius: 8,
                            border: "1px solid rgba(255, 255, 255, 0.2)"
                        }}>
                            <p style={{
                                margin: 0,
                                color: "#e2e8f0",
                                fontSize: 14,
                                lineHeight: 1.5,
                                fontStyle: "italic"
                            }}>
                                {animatedDialogue}
                                {isAnimating && <span className={styles.blinkingCursor}>|</span>}
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Quest Title */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: "block",
                            marginBottom: 8,
                            fontWeight: 600,
                            color: "var(--text-normal)",
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
                                padding: 12,
                                borderRadius: 4,
                                border: "1px solid var(--background-modifier-border)",
                                backgroundColor: "var(--background-secondary)",
                                color: "var(--text-normal)",
                                fontSize: 14,
                            }}
                        />
                    </div>

                    {/* Quest Description */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: "block",
                            marginBottom: 8,
                            fontWeight: 600,
                            color: "var(--text-normal)",
                        }}>
                            Quest Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter quest description..."
                            rows={3}
                            style={{
                                width: "100%",
                                padding: 12,
                                borderRadius: 4,
                                border: "1px solid var(--background-modifier-border)",
                                backgroundColor: "var(--background-secondary)",
                                color: "var(--text-normal)",
                                fontSize: 14,
                                resize: "vertical",
                                minHeight: 80
                            }}
                        />
                    </div>

                    {/* Skills Selection */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: "block",
                            marginBottom: 8,
                            fontWeight: 600,
                            color: "var(--text-normal)",
                        }}>
                            Skills (Required)
                        </label>
                        
                        {/* Skills Dropdown */}
                        <select
                            value={selectedSkill}
                            onChange={(e) => handleSkillSelection(e.target.value)}
                            disabled={skillsLoading}
                            style={{
                                width: "100%",
                                padding: 5,
                                borderRadius: 4,
                                border: "1px solid var(--background-modifier-border)",
                                backgroundColor: "var(--background-secondary)",
                                color: "var(--text-normal)",
                                fontSize: 14,
                                marginBottom: 8,
                            }}
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

                        {/* Selected Skills Display */}
                        {skills.length > 0 && (
                            <div style={{
                                border: "1px solid var(--background-modifier-border)",
                                borderRadius: 4,
                                padding: 12,
                                backgroundColor: "var(--background-primary)",
                                marginBottom: 8,
                            }}>
                                <div style={{ marginBottom: 8, fontWeight: 600, color: "var(--text-normal)" }}>
                                    Selected Skills:
                                </div>
                                {skills.map((skill) => (
                                    <div key={skill.name} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: 8,
                                        marginBottom: 4,
                                        backgroundColor: "var(--background-secondary)",
                                        borderRadius: 4,
                                        border: "1px solid var(--background-modifier-border)",
                                    }}>
                                        <div>
                                            <div style={{ 
                                                color: "var(--text-normal)", 
                                                fontWeight: 600,
                                                marginBottom: 2 
                                            }}>
                                                {skill.name}
                                            </div>
                                            <div style={{ 
                                                color: "var(--text-muted)", 
                                                fontSize: 12 
                                            }}>
                                                Class: {skill.class} | Master: {skill.masterClass}
                                            </div>
                                            {Object.keys(skill.stats).length > 0 && (
                                                <div style={{ 
                                                    color: "var(--text-muted)", 
                                                    fontSize: 11,
                                                    marginTop: 2 
                                                }}>
                                                    Stats: {Object.keys(skill.stats).join(", ")}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleSkillRemoval(skill.name)}
                                            style={{
                                                background: "var(--interactive-accent)",
                                                border: "none",
                                                borderRadius: 4,
                                                color: "white",
                                                cursor: "pointer",
                                                padding: "4px 8px",
                                                fontSize: 12,
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Show skill details when one is selected in dropdown */}
                        {selectedSkillData && (
                            <div style={{
                                padding: 8,
                                backgroundColor: "var(--background-primary)",
                                border: "1px solid var(--background-modifier-border)",
                                borderRadius: 4,
                                fontSize: 12,
                                color: "var(--text-muted)",
                            }}>
                                <strong>{selectedSkillData.name}</strong> - Class: {selectedSkillData.class} | Master: {selectedSkillData.masterClass}
                                {Object.keys(selectedSkillData.stats).length > 0 && (
                                    <div>Stats: {Object.keys(selectedSkillData.stats).join(", ")}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Priority and Difficulty */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
                            }}>
                                Priority
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: 12,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                    fontSize: 14,
                                    minHeight: 44,
                                }}
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
                            }}>
                                Difficulty
                            </label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: 12,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                    fontSize: 14,
                                    minHeight: 44,
                                }}
                            >
                                {DIFFICULTY_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* XP and CP with symbols */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
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
                                    padding: 12,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                    fontSize: 14,
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
                            }}>
                                ⭐️ CP Reward
                            </label>
                            <input
                                type="number"
                                value={cp}
                                min={0}
                                onChange={(e) => setCp(Number(e.target.value))}
                                style={{
                                    width: "100%",
                                    padding: 12,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                    fontSize: 14,
                                }}
                            />
                        </div>
                    </div>

                    {/* Due Date and Recurrence */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
                            }}>
                                Due Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={due}
                                onChange={(e) => setDue(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "12px 30px",
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                    fontSize: 14,
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
                            }}>
                                Recurrence (Optional)
                            </label>
                            <select
                                value={recur}
                                onChange={(e) => setRecur(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: 12,
                                    borderRadius: 4,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-secondary)",
                                    color: "var(--text-normal)",
                                    fontSize: 14,
                                    minHeight: 44,
                                }}
                            >
                                <option value="">No recurrence</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="bi-weekly">Bi-weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="yearly">Yearly</option>
                                <option value="weekdays">Weekdays only</option>
                                <option value="weekends">Weekends only</option>
                            </select>
                        </div>
                    </div>

                    {/* Estimated Time */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: "block",
                            marginBottom: 8,
                            fontWeight: 600,
                            color: "var(--text-normal)",
                        }}>
                            ⏱️ Estimated Time (Optional)
                        </label>
                        <input
                            type="text"
                            value={estimatedTime}
                            onChange={(e) => setEstimatedTime(e.target.value)}
                            placeholder="e.g., 2 weeks, 1 month, 3 days..."
                            style={{
                                width: "100%",
                                padding: 12,
                                borderRadius: 4,
                                border: "1px solid var(--background-modifier-border)",
                                backgroundColor: "var(--background-secondary)",
                                color: "var(--text-normal)",
                                fontSize: 14,
                            }}
                        />
                        <div style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "var(--text-muted)",
                            fontStyle: "italic"
                        }}>
                            This helps determine boss difficulty and rewards
                        </div>
                    </div>

                    {/* Subtasks */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: "block",
                            marginBottom: 8,
                            fontWeight: 600,
                            color: "var(--text-normal)",
                        }}>
                            Subtasks (Optional)
                        </label>
                        <div style={{
                            border: "1px solid var(--background-modifier-border)",
                            borderRadius: 4,
                            padding: 12,
                            backgroundColor: "var(--background-secondary)",
                            minHeight: 60,
                        }}>
                            {subtasks.map((subtask, index) => (
                                <div key={index} style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    marginBottom: 8,
                                    padding: 8,
                                    backgroundColor: "var(--background-primary)",
                                    borderRadius: 4,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: subtask.description ? 4 : 0 }}>
                                        <span style={{ 
                                            flex: 1, 
                                            color: "var(--text-normal)",
                                            fontSize: 14,
                                            fontWeight: 500
                                        }}>
                                            {subtask.text}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSubtask(index)}
                                            style={{
                                                background: "var(--interactive-accent)",
                                                border: "none",
                                                borderRadius: 4,
                                                color: "white",
                                                cursor: "pointer",
                                                padding: "4px 8px",
                                                fontSize: 12,
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    {subtask.description && (
                                        <div style={{
                                            fontSize: 12,
                                            color: "var(--text-muted)",
                                            fontStyle: "italic",
                                            marginLeft: 8
                                        }}>
                                            {subtask.description}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <input
                                        type="text"
                                        value={newSubtask}
                                        onChange={(e) => setNewSubtask(e.target.value)}
                                        placeholder="Add a subtask..."
                                        onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleAddSubtask()}
                                        style={{
                                            flex: 1,
                                            padding: 8,
                                            borderRadius: 4,
                                            border: "1px solid var(--background-modifier-border)",
                                            backgroundColor: "var(--background-primary)",
                                            color: "var(--text-normal)",
                                            fontSize: 14,
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSubtask}
                                        style={{
                                            padding: "8px 12px",
                                            backgroundColor: "var(--interactive-accent)",
                                            border: "none",
                                            borderRadius: 4,
                                            color: "white",
                                            cursor: "pointer",
                                            fontSize: 14,
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={newSubtaskDescription}
                                    onChange={(e) => setNewSubtaskDescription(e.target.value)}
                                    placeholder="Optional subtask description..."
                                    style={{
                                        width: "100%",
                                        padding: 8,
                                        borderRadius: 4,
                                        border: "1px solid var(--background-modifier-border)",
                                        backgroundColor: "var(--background-primary)",
                                        color: "var(--text-normal)",
                                        fontSize: 12,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Boss System */}
                    {mode === "create" && (
                        <div style={{ marginBottom: 16 }}>
                            <label style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
                            }}>
                                🐉 Boss Battle System
                            </label>
                            <div style={{
                                border: "1px solid var(--background-modifier-border)",
                                borderRadius: 4,
                                padding: 12,
                                backgroundColor: "var(--background-secondary)",
                            }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 12,
                                }}>
                                    <span style={{
                                        color: "var(--text-normal)",
                                        fontSize: 14,
                                        fontWeight: 500
                                    }}>
                                        Enable boss battle for this quest?
                                    </span>
                                    <label style={{
                                        display: "flex",
                                        alignItems: "center",
                                        cursor: "pointer",
                                        gap: 8
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={enableBossBattle}
                                            onChange={(e) => setEnableBossBattle(e.target.checked)}
                                            style={{
                                                width: 16,
                                                height: 16,
                                                cursor: "pointer"
                                            }}
                                        />
                                        <span style={{
                                            color: "var(--text-normal)",
                                            fontSize: 14
                                        }}>
                                            Yes, make this epic!
                                        </span>
                                    </label>
                                </div>
                                
                                {enableBossBattle && (
                                    <div style={{
                                        padding: 12,
                                        backgroundColor: "var(--background-primary)",
                                        borderRadius: 4,
                                        border: "1px solid var(--background-modifier-border-hover)",
                                    }}>
                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            marginBottom: 8
                                        }}>
                                            <span style={{ fontSize: 20 }}>⚔️</span>
                                            <span style={{
                                                color: "var(--text-normal)",
                                                fontSize: 14,
                                                fontWeight: 600
                                            }}>
                                                Boss Recommendation: {bossRecommendation.bossType}
                                            </span>
                                        </div>
                                        <p style={{
                                            color: "var(--text-muted)",
                                            fontSize: 12,
                                            margin: "4px 0 8px 0",
                                            lineHeight: 1.4
                                        }}>
                                            {bossRecommendation.reason}
                                        </p>
                                        <div style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 8,
                                            fontSize: 12,
                                            color: "var(--text-muted)"
                                        }}>
                                            <span>🎯 Difficulty: {difficulty}</span>
                                            <span>⏰ Priority: {priority}</span>
                                            <span>📋 Subtasks: {subtasks.length}</span>
                                            {estimatedTime && <span>⏱️ Time: {estimatedTime}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Boss System Demo - Show in edit mode when boss exists */}
                    {mode === "edit" && quest?.bossId && (
                        <div style={{ marginBottom: 16 }}>
                            <label style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 600,
                                color: "var(--text-normal)",
                            }}>
                                🐉 Boss Battle Status
                            </label>
                            <div style={{
                                border: "1px solid var(--background-modifier-border)",
                                borderRadius: 4,
                                padding: 12,
                                backgroundColor: "var(--background-secondary)",
                                color: "var(--text-muted)",
                                fontSize: 14,
                            }}>
                                Boss ID: {quest.bossId}
                                {quest.bossProgress && (
                                    <div style={{ marginTop: 8 }}>
                                        <div>HP: {quest.bossProgress.currentHP}/{quest.bossProgress.maxHP}</div>
                                        <div>Phase: {quest.bossProgress.phase + 1}</div>
                                        <div>Status: {quest.bossProgress.isActive ? 'Active' : 'Defeated'}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Custom Rewards */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: "block",
                            marginBottom: 8,
                            fontWeight: 600,
                            color: "var(--text-normal)",
                        }}>
                            Custom Rewards (Optional)
                        </label>
                        <div style={{
                            border: "1px solid var(--background-modifier-border)",
                            borderRadius: 4,
                            padding: 12,
                            backgroundColor: "var(--background-secondary)",
                        }}>
                            {customRewards.map((reward, index) => (
                                <div key={index} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: 8,
                                    padding: 8,
                                    backgroundColor: "var(--background-primary)",
                                    borderRadius: 4,
                                }}>
                                    <span style={{ 
                                        flex: 1, 
                                        color: "var(--text-normal)",
                                        fontSize: 14 
                                    }}>
                                        {reward.name} x{reward.quantity}
                                        {reward.item && (
                                            <span style={{
                                                marginLeft: 8,
                                                color: getRarityColor(reward.item.rarity),
                                                fontSize: 12,
                                            }}>
                                                ({getRarityDisplayName(reward.item.rarity)})
                                            </span>
                                        )}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCustomReward(index)}
                                        style={{
                                            background: "var(--interactive-accent)",
                                            border: "none",
                                            borderRadius: 4,
                                            color: "white",
                                            cursor: "pointer",
                                            padding: "4px 8px",
                                            fontSize: 12,
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <input
                                    type="text"
                                    value={newRewardName}
                                    onChange={(e) => setNewRewardName(e.target.value)}
                                    placeholder="Reward name..."
                                    style={{
                                        flex: 1,
                                        padding: 8,
                                        borderRadius: 4,
                                        border: "1px solid var(--background-modifier-border)",
                                        backgroundColor: "var(--background-primary)",
                                        color: "var(--text-normal)",
                                        fontSize: 14,
                                    }}
                                />
                                <input
                                    type="number"
                                    value={newRewardQuantity}
                                    onChange={(e) => setNewRewardQuantity(Number(e.target.value))}
                                    min={1}
                                    style={{
                                        width: 80,
                                        padding: 8,
                                        borderRadius: 4,
                                        border: "1px solid var(--background-modifier-border)",
                                        backgroundColor: "var(--background-primary)",
                                        color: "var(--text-normal)",
                                        fontSize: 14,
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCustomReward}
                                    style={{
                                        padding: "8px 12px",
                                        backgroundColor: "var(--interactive-accent)",
                                        border: "none",
                                        borderRadius: 4,
                                        color: "white",
                                        cursor: "pointer",
                                        fontSize: 14,
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Task Preview */}
                    <div style={{ marginBottom: 20 }}>
                        <button
                            type="button"
                            onClick={() => setShowTaskPreview(!showTaskPreview)}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: "var(--background-secondary)",
                                border: "1px solid var(--background-modifier-border)",
                                borderRadius: 4,
                                color: "var(--text-normal)",
                                cursor: "pointer",
                                fontSize: 14,
                                marginBottom: 8,
                            }}
                        >
                            {showTaskPreview ? "Hide" : "Show"} Task Preview
                        </button>
                        
                        {showTaskPreview && (
                            <div style={{
                                border: "1px solid var(--background-modifier-border)",
                                borderRadius: 4,
                                padding: 12,
                                backgroundColor: "var(--background-primary)",
                                fontFamily: "monospace",
                                fontSize: 12,
                                color: "var(--text-muted)",
                                whiteSpace: "pre-wrap",
                                maxHeight: 200,
                                overflow: "auto",
                            }}>
                                {generateTaskPreview()}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: "12px 24px",
                                backgroundColor: "var(--background-secondary)",
                                border: "1px solid var(--background-modifier-border)",
                                borderRadius: 6,
                                color: "var(--text-normal)",
                                cursor: "pointer",
                                fontSize: 14,
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: "12px 24px",
                                backgroundColor: "var(--interactive-accent)",
                                border: "none",
                                borderRadius: 6,
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: 14,
                            }}
                        >
                            {mode === "create" ? "Create Quest" : "Update Quest"}
                        </button>
                    </div>
                </form>

                {error && <div className={styles.error}>{error}</div>}
            </div>
        </div>,
        document.body
    );
};

export default QuestModal; 