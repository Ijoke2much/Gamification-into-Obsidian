import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Notice, TFile } from "obsidian";
import type GamifiedObsidianPlugin from "../../../core/main";
import type { SkillMetadata } from "../../../shared/utils/skillDiscovery";
import { getAllSkills } from "../../../shared/utils/skillDiscovery";
import { QuestGiverAvatar } from "../../../features/quests/components/QuestGiverAvatar";
import { useTypewriter } from "../../../data/hooks/useTypewriter";
import styles from "./QuestModal.module.css";
import {
    getXPRange,
    getCPRange,
    getRandomInRange,
    generateMarkdownTask,
} from "../../../features/quests/utils/questUtils";
// import {
//     QuestRewardItem,
// } from "../../../features/quests/utils/questRewardsSystem";
import { CustomRewardBuilder, EnhancedCustomReward } from "../components/CustomRewardBuilder";
import { 
    QuestModalHeader, 
    QuestModalForm, 
    QuestModalActions, 
    QuestModalAdvancedOptions 
} from "./components";
import type { Quest } from "../utils/taskParser";

export interface QuestModalProps {
    isOpen: boolean;
    onClose: () => void;
    plugin: GamifiedObsidianPlugin;
    mode: "create" | "edit";
    quest?: Quest | null;
    onSubmit: (createdQuest?: Quest, filePath?: string) => void;
    // Optional prefill for quick-add flows
    prefill?: {
        dueISO?: string; // YYYY-MM-DDTHH:MM
        estimatedMinutes?: number;
        title?: string;
        description?: string;
    };
}

export const QuestModal: React.FC<QuestModalProps> = ({
    isOpen,
    onClose,
    plugin,
    mode,
    quest,
    onSubmit,
    prefill,
}) => {
    // Store original quest title for editing mode to find the quest in the file
    const [originalQuestTitle] = useState(() =>
        mode === "edit" && quest ? quest.title : ""
    );
    
    // State initialization
    const [title, setTitle] = useState(mode === "edit" && quest ? quest.title : (prefill?.title || ""));
    const [description, setDescription] = useState(mode === "edit" && quest ? quest.description || "" : (prefill?.description || ""));
    const [skills, setSkills] = useState<SkillMetadata[]>([]);
    const [allSkills, setAllSkills] = useState<SkillMetadata[]>([]);
    const [skillsLoading, setSkillsLoading] = useState(true);
    const [selectedSkill, setSelectedSkill] = useState<string>("");
    const [priority, setPriority] = useState(mode === "edit" && quest ? quest.priority || "Medium" : "Medium");
    const [difficulty, setDifficulty] = useState(mode === "edit" && quest ? quest.difficulty || "Medium" : "Medium");
    const [xp, setXp] = useState(mode === "edit" && quest ? quest.xp || 0 : getRandomInRange(...getXPRange("Medium")));
    const [cp, setCp] = useState(mode === "edit" && quest ? quest.cp || 0 : getRandomInRange(...getCPRange("Medium")));
    const [banner, setBanner] = useState(mode === "edit" && quest ? quest.banner || "" : "");
    const [bannerAlign, setBannerAlign] = useState<string>(
        mode === "edit" && quest && quest.bannerAlign ? quest.bannerAlign : "center"
    );
    
    // Separate date and time properly when editing
    const [due, setDue] = useState(() => {
        if (mode === "edit" && quest && quest.due) {
            // Extract date part only (YYYY-MM-DD)
            return quest.due.includes('T') ? quest.due.split('T')[0] : quest.due;
        }
        if (mode === "create" && prefill?.dueISO) {
            return prefill.dueISO.split('T')[0];
        }
        return "";
    });
    
    const [recur, setRecur] = useState(mode === "edit" && quest ? quest.recur || "" : "");
    
    // Normalize mixed inputs like "1h30m", "60m", "45" into minute string (digits only)
    const normalizeEstimatedMinutes = (value: string): string => {
        if (!value) return "";
        const str = String(value).trim().toLowerCase();
        if (!str) return "";
        // 1h30m, 2h, 90m
        const combo = str.match(/^(\d+)\s*h\s*(\d+)?\s*m?$/i);
        if (combo) {
            const h = parseInt(combo[1], 10);
            const m = combo[2] ? parseInt(combo[2], 10) : 0;
            return String(h * 60 + m);
        }
        const single = str.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?$/i);
        if (single) {
            const val = parseInt(single[1], 10);
            const unit = (single[2] || 'm').toLowerCase();
            return unit.startsWith('h') ? String(val * 60) : String(val);
        }
        // Fallback: strip non-digits
        const digits = str.replace(/[^0-9]/g, '');
        return digits;
    };

    const [estimatedMinutes, setEstimatedMinutes] = useState(
        mode === "edit" && quest ? normalizeEstimatedMinutes(quest.estimatedTime || "") : (prefill?.estimatedMinutes !== undefined ? String(prefill.estimatedMinutes) : "")
    );

    const [scheduleTime, setScheduleTime] = useState(() => {
        if (mode === "edit" && quest && quest.due?.includes('T')) {
            const timePart = quest.due.split('T')[1];
            return timePart ? timePart.substring(0, 5) : "";
        }
        if (mode === "create" && prefill?.dueISO?.includes('T')) {
            const timePart = prefill.dueISO.split('T')[1];
            return timePart ? timePart.substring(0,5) : "";
        }
        return "";
    });
    
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subtasks, setSubtasks] = useState<{ text: string; completed: boolean; description?: string }[]>(mode === "edit" && quest ? quest.subtasks || [] : []);
    const [newSubtask, setNewSubtask] = useState("");
    const [newSubtaskDescription, setNewSubtaskDescription] = useState("");
    
    // Reward customization (for future use)
    // const [customRewards, setCustomRewards] = useState<Array<{ name: string; quantity: number; item?: QuestRewardItem }>>([]);
    // const [newRewardName, setNewRewardName] = useState("");
    // const [newRewardQuantity, setNewRewardQuantity] = useState(1);
    
    // Enhanced reward customization
    const [enhancedCustomRewards, setEnhancedCustomRewards] = useState<EnhancedCustomReward[]>([]);
    const [showCustomRewardBuilder, setShowCustomRewardBuilder] = useState(false);
    
    // Random reward generation (for future use)
    // const [randomRewardRarity, setRandomRewardRarity] = useState<"common" | "uncommon" | "rare" | "epic" | "legendary">("common");
    // const [randomRewardCount, setRandomRewardCount] = useState(1);
    
    // Quest Giver dialogue with proper typewriter effect
    const [dialogue] = useState<string>(mode === "edit"
        ? `Ah, you wish to modify your quest "${quest?.title || "Unknown Quest"}"? Very well, let us review the details and make the necessary adjustments to ensure your success!`
        : "Greetings, brave adventurer! I sense great potential within you. Let us forge a new quest together - one that will test your skills and reward your dedication. What challenge shall we create today?");
    const [questGiverCollapsed] = useState(true);
    
    // Advanced options state
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [activeAdvancedTab, setActiveAdvancedTab] = useState<'details' | 'customization' | 'features'>('details');
    const [questGiverImagePath, setQuestGiverImagePath] = useState(plugin.settings.questGiverImagePath || "assets/questgiver.jpg");

    // Quest save location state (where the quest markdown will be written)
    const defaultQuestFilePath = plugin.settings.defaultQuestFilePath || "GamifiedTasks.md";
    const questSaveLocations = plugin.settings.questSaveLocations ?? [];
    const [saveLocationId, setSaveLocationId] = useState<string>("default");
    const [customFilePath, setCustomFilePath] = useState<string>("");

    // Handle quest giver image change
    const handleQuestGiverImageChange = (newPath: string) => {
        setQuestGiverImagePath(newPath);
        plugin.settings.questGiverImagePath = newPath;
        plugin.saveSettings();
    };

    // Load skills on component mount
    useEffect(() => {
        const loadSkills = async () => {
            try {
                setSkillsLoading(true);
                const discoveredSkills = await getAllSkills(plugin.app.vault);
                setAllSkills(discoveredSkills);
                
                // If editing, populate skills from quest
                if (mode === "edit" && quest && quest.skills) {
                    const questSkills = discoveredSkills.filter((skill: SkillMetadata) => 
                        quest.skills!.includes(skill.name)
                    );
                    setSkills(questSkills);
                }
            } catch (error) {
                console.error("Error loading skills:", error);
            } finally {
                setSkillsLoading(false);
            }
        };
        
        loadSkills();
    }, [mode, quest, plugin.app.vault]);

    // Handle skill selection from dropdown
    const handleSkillSelection = (skillName: string) => {
        if (!skillName) {
            setSelectedSkill("");
            return;
        }
        
        const skill = allSkills.find(s => s.name === skillName);
        if (skill && !skills.some(s => s.name === skillName)) {
            setSkills([...skills, skill]);
            setSelectedSkill(""); // Only reset after successful addition
        }
        // Don't reset if skill already exists - let user see their selection
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

    // Handle adding enhanced custom reward
    const handleAddEnhancedReward = (reward: EnhancedCustomReward) => {
        setEnhancedCustomRewards([...enhancedCustomRewards, reward]);
    };

    // Unused handlers for future reward features
    // const handleAddCustomReward = () => { ... };
    // const handleAddRandomRewards = () => { ... };
    // const handleRemoveCustomReward = (index: number) => { ... };
    // const handleRemoveEnhancedReward = (index: number) => { ... };

    // Helper to ensure banner is stored as a file path (not a large data URL)
    const ensureBannerPath = async (rawBanner: string | undefined): Promise<string | undefined> => {
        if (!rawBanner) return undefined;
        // If it's already a path or external URL, just return it
        if (!rawBanner.startsWith("data:")) {
            return rawBanner;
        }

        try {
            const match = rawBanner.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            if (!match) return undefined;

            const mime = match[1];
            const base64Data = match[2].replace(/\s/g, ""); // Strip whitespace/newlines
            const ext = mime.includes("png") ? "png" : mime.includes("gif") ? "gif" : "jpg";

            const safeTitle = (title || "quest")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "") || "quest";

            const folder = "Gamification/QuestBanners";
            const fileName = `${safeTitle}-${Date.now()}.${ext}`;
            const fullPath = `${folder}/${fileName}`;

            // Ensure parent folder exists (createBinary can fail if folder doesn't exist)
            try {
                await plugin.app.vault.createFolder("Gamification");
            } catch { /* ignore */ }
            try {
                await plugin.app.vault.createFolder(folder);
            } catch { /* ignore - folder may already exist */ }

            const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const arrayBuffer = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);

            const existing = plugin.app.vault.getAbstractFileByPath(fullPath);
            if (existing && existing instanceof TFile) {
                await plugin.app.vault.modifyBinary(existing, arrayBuffer);
                return existing.path;
            }

            const created = await plugin.app.vault.createBinary(fullPath, arrayBuffer);
            return created.path;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Failed to persist quest banner:", error);
            new Notice(`Could not save quest banner: ${msg}. Quest will be saved without it.`, 6000);
            return undefined;
        }
    };

    // Handle form submission
    const resolveTargetFilePath = () => {
        // Determine which markdown file to use when saving a quest
        const basePath = plugin.settings.defaultQuestFilePath || "GamifiedTasks.md";

        if (saveLocationId === "custom") {
            const trimmed = customFilePath.trim();
            return trimmed || basePath;
        }

        if (saveLocationId !== "default") {
            const match = questSaveLocations.find(loc => loc.id === saveLocationId);
            if (match?.filePath) {
                return match.filePath;
            }
        }

        return basePath;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        // Yield to let "Saving..." paint before blocking on file I/O
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

        try {
            // Validate required fields
            if (!title.trim()) {
                setError("Quest title is required");
                return;
            }
            
            if (skills.length === 0) {
                setError("At least one skill is required");
                return;
            }

            // Helper to combine date and time into ISO format
            const getScheduledDateTime = () => {
                if (!due) return "";
                if (!scheduleTime) return due; // Just date, no time
                
                // Combine date and time: YYYY-MM-DDTHH:MM
                return `${due}T${scheduleTime}`;
            };

            if (mode === "create") {
                // Create new quest
                const bannerPath = await ensureBannerPath(banner || undefined);
                const newQuest = {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    skills: skills.map(s => s.name),
                    priority,
                    difficulty,
                    xp,
                    cp,
                    banner: bannerPath || undefined,
                    bannerAlign,
                    due: getScheduledDateTime() || undefined,
                    recur: recur || undefined,
                    estimatedTime: estimatedMinutes || undefined,
                    subtasks: subtasks,
                    customRewards: undefined,
                    enhancedCustomRewards: enhancedCustomRewards.length > 0 ? enhancedCustomRewards : undefined,
                };

                const markdownTask = generateMarkdownTask(newQuest);

                // Resolve which file to use based on the save-location selector
                const targetPath = resolveTargetFilePath();
                let targetFile = plugin.app.vault.getAbstractFileByPath(targetPath) as TFile | null;

                // If the file does not exist yet, create it with a simple header
                if (!targetFile) {
                    const initialContent = '# Gamified Tasks\n\n<!-- Add your quests here -->\n';
                    const created = await plugin.app.vault.create(targetPath, initialContent);
                    targetFile = created instanceof TFile ? created : null;
                }

                if (!targetFile) {
                    setError(`Could not create or open quest file at: ${targetPath}`);
                    return;
                }

                const currentContent = await plugin.app.vault.read(targetFile);
                const newContent = currentContent.trimEnd() + "\n\n" + markdownTask + "\n";
                
                await plugin.app.vault.modify(targetFile, newContent);

                // Pass new quest to parent for optimistic update (no full reload)
                const questForState: Quest = {
                    id: `${targetPath}-${title.trim()}`,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    skills: skills.map(s => s.name),
                    priority,
                    difficulty,
                    xp,
                    cp,
                    coins: Math.round(xp * 0.2),
                    banner: bannerPath || undefined,
                    bannerAlign,
                    due: getScheduledDateTime() || undefined,
                    recur: recur || undefined,
                    estimatedTime: estimatedMinutes || undefined,
                    subtasks,
                    completed: false,
                    className: skills[0]?.class || '',
                    stats: skills[0]?.stats ? Object.keys(skills[0].stats) : [],
                };
                onSubmit(questForState, targetPath);
            } else if (mode === "edit" && quest) {
                // Edit existing quest – always operate on the quest's current file
                const questPath = quest.filePath || defaultQuestFilePath;
                const questFile = plugin.app.vault.getAbstractFileByPath(questPath) as TFile | null;
                if (!questFile) {
                    setError(`Quest file not found: ${questPath}`);
                    return;
                }

                const currentContent = await plugin.app.vault.read(questFile);
                const lines = currentContent.split('\n');
                
                // Find the quest to edit
                let questIndex = -1;
                
                // Try to find by quest ID first
                if (quest.id) {
                    questIndex = lines.findIndex(line => line.includes(`#gamified-task-${quest.id}`));
                }
                
                // If ID matching failed, try to find by the original quest content
                if (questIndex === -1) {
                    // Try to match by multiple quest properties (XP, CP, skills, etc.)
                    questIndex = lines.findIndex(line => {
                        if (!line.includes("#gamified-task")) return false;
                        if (quest && quest.xp && quest.cp) {
                            const hasXP = line.includes(`✨${quest.xp}`);
                            const hasCP = line.includes(`⭐${quest.cp}`);
                            if (hasXP && hasCP) return true;
                        }
                        return false;
                    });
                }
                
                // Final fallback: try to find by skills
                if (questIndex === -1 && quest && quest.skills && Array.isArray(quest.skills) && quest.skills.length > 0) {
                    questIndex = lines.findIndex(line => {
                        if (!line.includes("#gamified-task")) return false;
                        // Check if the line contains the quest's skills
                        return quest.skills!.some(skill => line.includes(skill));
                    });
                }

                // Extra fallback: match by original or current title text
                if (questIndex === -1) {
                    const candidates = [originalQuestTitle, title.trim()].filter(Boolean) as string[];
                    if (candidates.length > 0) {
                        questIndex = lines.findIndex(line => {
                            if (!line.includes('#gamified-task')) return false;
                            return candidates.some(t => line.includes(t));
                        });
                    }
                }
                
                if (questIndex === -1) {
                    setError("Could not find the quest to edit. Please try creating a new quest instead.");
                    return;
                }
                
                // Find the end of the quest block
                let endIndex = questIndex;
                while (endIndex < lines.length && lines[endIndex].trim() !== "") {
                    endIndex++;
                }
                
                // Generate the updated quest
                const bannerPath = await ensureBannerPath(banner || undefined);
                const updatedQuest = {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    skills: skills.map(s => s.name),
                    priority,
                    difficulty,
                    xp,
                    cp,
                    banner: bannerPath || undefined,
                    bannerAlign,
                    due: getScheduledDateTime() || undefined,
                    recur: recur || undefined,
                    estimatedTime: estimatedMinutes || undefined,
                    subtasks: subtasks,
                    customRewards: undefined,
                    enhancedCustomRewards: enhancedCustomRewards.length > 0 ? enhancedCustomRewards : undefined,
                };

                const markdownTask = generateMarkdownTask(updatedQuest);
                
                // Replace the quest block
                const newLines = [
                    ...lines.slice(0, questIndex),
                    markdownTask,
                    ...lines.slice(endIndex)
                ];
                
                const newContent = newLines.join('\n');
                await plugin.app.vault.modify(questFile, newContent);
                onSubmit();
            }
        } catch (error) {
            console.error("Error saving quest:", error);
            setError(error instanceof Error ? error.message : "An error occurred while saving the quest");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Mobile detection
    const isMobile = window.innerWidth <= 768 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());

    // Quest Giver dialogue with typewriter effect
    const { displayed: animatedDialogue, isAnimating } = useTypewriter(dialogue, 30);

    if (!isOpen) return null;

    // Quest Modal UI
    const questModalPortal = ReactDOM.createPortal(
        <div className={`${styles.modalOverlay} ${isMobile ? 'mobile-quest-modal' : ''}`} onClick={onClose}>
            <div className={`${styles.modal} ${isMobile ? 'mobile-quest-modal-content' : ''}`} onClick={(e) => e.stopPropagation()}>
                <QuestModalHeader 
                    mode={mode}
                    isMobile={isMobile}
                    onClose={onClose}
                />

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
                    {/* Save Location Selector (where to write the quest in your vault) */}
                    <div
                        style={{
                            marginBottom: 16,
                            padding: 12,
                            borderRadius: 10,
                            border: "1px solid var(--background-modifier-border)",
                            background: "rgba(255, 255, 255, 0.02)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 8,
                                gap: 8,
                            }}
                        >
                            <span
                                style={{
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                    fontSize: 14,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <span>📁 Save Quest To</span>
                            </span>
                        </div>
                        <select
                            value={saveLocationId}
                            onChange={(e) => setSaveLocationId(e.target.value)}
                            className={styles.select}
                            style={{ marginBottom: 8 }}
                        >
                            <option value="default">
                                Default quest note ({defaultQuestFilePath})
                            </option>
                            {questSaveLocations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.label} — {loc.filePath}
                                </option>
                            ))}
                            <option value="custom">Custom file path…</option>
                        </select>
                        {saveLocationId === "custom" && (
                            <input
                                type="text"
                                value={customFilePath}
                                onChange={(e) => setCustomFilePath(e.target.value)}
                                placeholder="e.g. Daily/2025-11-24.md"
                                style={{
                                    width: "100%",
                                    padding: 10,
                                    borderRadius: 6,
                                    border: "1px solid var(--background-modifier-border)",
                                    backgroundColor: "var(--background-primary)",
                                    color: "var(--text-normal)",
                                    fontSize: 13,
                                }}
                            />
                        )}
                        <div
                            style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: "var(--text-muted)",
                            }}
                        >
                            Choose a saved location or type a custom note path. New quests
                            will be appended to that file.
                        </div>
                    </div>

                    <QuestModalForm
                        title={title}
                        setTitle={setTitle}
                        description={description}
                        setDescription={setDescription}
                        skills={skills}
                        allSkills={allSkills}
                        skillsLoading={skillsLoading}
                        selectedSkill={selectedSkill}
                        setSelectedSkill={setSelectedSkill}
                        priority={priority}
                        setPriority={setPriority}
                        difficulty={difficulty}
                        setDifficulty={setDifficulty}
                        xp={xp}
                        setXp={setXp}
                        cp={cp}
                        setCp={setCp}
                        due={due}
                        setDue={setDue}
                        time={scheduleTime}
                        setTime={setScheduleTime}
                        estimatedMinutes={estimatedMinutes}
                        setEstimatedMinutes={setEstimatedMinutes}
                        recur={recur}
                        setRecur={setRecur}
                        subtasks={subtasks}
                        newSubtask={newSubtask}
                        setNewSubtask={setNewSubtask}
                    newSubtaskDescription={newSubtaskDescription}
                    setNewSubtaskDescription={setNewSubtaskDescription}
                    handleSkillSelection={handleSkillSelection}
                        handleSkillRemoval={handleSkillRemoval}
                        handleAddSubtask={handleAddSubtask}
                        handleRemoveSubtask={handleRemoveSubtask}
                        isMobile={isMobile}
                    />

                    <QuestModalAdvancedOptions
                        showAdvancedOptions={showAdvancedOptions}
                        setShowAdvancedOptions={setShowAdvancedOptions}
                        activeAdvancedTab={activeAdvancedTab}
                        setActiveAdvancedTab={setActiveAdvancedTab}
                        description={description}
                        setDescription={setDescription}
                        due={due}
                        setDue={setDue}
                        recur={recur}
                        setRecur={setRecur}
                        scheduleTime={scheduleTime}
                        setScheduleTime={setScheduleTime}
                        estimatedMinutes={estimatedMinutes}
                        setEstimatedMinutes={setEstimatedMinutes}
                        questGiverImagePath={questGiverImagePath}
                        setQuestGiverImagePath={setQuestGiverImagePath}
                    questBanner={banner}
                    setQuestBanner={setBanner}
                    bannerAlign={bannerAlign}
                    setBannerAlign={setBannerAlign}
                        subtasks={subtasks}
                        newSubtask={newSubtask}
                        setNewSubtask={setNewSubtask}
                        newSubtaskDescription={newSubtaskDescription}
                        setNewSubtaskDescription={setNewSubtaskDescription}
                        handleAddSubtask={handleAddSubtask}
                        handleRemoveSubtask={handleRemoveSubtask}
                        isMobile={isMobile}
                    />

                    <QuestModalActions
                        mode={mode}
                        onClose={onClose}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                </form>

                {error && <div className={styles.error}>{error}</div>}
            </div>
        </div>,
        document.body
    );

    // Return both modals if custom reward builder is open
    if (showCustomRewardBuilder) {
        return (
            <>
                {questModalPortal}
                {ReactDOM.createPortal(
                    <CustomRewardBuilder
                        isOpen={showCustomRewardBuilder}
                        onClose={() => setShowCustomRewardBuilder(false)}
                        onAddReward={handleAddEnhancedReward}
                        isMobile={isMobile}
                    />,
                    document.body
                )}
            </>
        );
    }

    return questModalPortal;
};