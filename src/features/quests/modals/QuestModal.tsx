import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { TFile } from 'obsidian';
import type GamifiedObsidianPlugin from "../../../core/main";
import type { SkillMetadata } from "../../../shared/utils/skillDiscovery";
import { getAllSkills } from "../../../shared/utils/skillDiscovery";
import { QuestGiverAvatar } from "../../../features/quests/components/QuestGiverAvatar";
import { useTypewriter } from "../../../data/hooks/useTypewriter";
import styles from "./QuestModal.module.css";
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import {
    rollQuestRewardXp,
    rollQuestRewardCp,
    generateMarkdownTask,
} from "../../../features/quests/utils/questUtils";
import { getQuestEnergyCost } from "../../../shared/utils/questCompletionPipeline";
import {
	createQuestNote,
	getTaskNoteFolder,
	isPerNoteMode,
} from "../utils/questNoteService";
import { patchScheduleFrontmatter } from "../utils/taskNotesAdapter";
import {
    type ActivityProfileId,
    normalizeActivityProfileId,
} from "../../../shared/utils/questWellbeingProfiles";
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
import type { Quest, QuestTimelineTheme } from "../utils/taskParser";
import { getQuestSkillNames, getQuestCustomTags, normalizeQuestTimelineTheme } from "../utils/taskParser";
import { getAppliedVisualTheme } from "../../../shared/utils/visualThemeManager";

function questEditKey(quest: Quest): string {
    return `${quest.id}|${quest.filePath ?? ""}|${quest.lineNumber ?? ""}|${quest.title}`;
}

function normalizeSkillKey(value: string): string {
    return value.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function stubSkillFromQuest(name: string, quest: Quest): SkillMetadata {
    return {
        name,
        class: quest.className || "",
        classPath: "",
        masterClass: "",
        masterClassPath: "",
        stats: {},
        filePath: "",
    };
}

function matchQuestSkills(quest: Quest, catalog: SkillMetadata[]): SkillMetadata[] {
    return getQuestSkillNames(quest).map((name) => {
        const key = normalizeSkillKey(name);
        const found = catalog.find((skill) => normalizeSkillKey(skill.name) === key);
        return found || stubSkillFromQuest(name, quest);
    });
}

export interface QuestModalProps {
    isOpen: boolean;
    onClose: () => void;
    plugin: GamifiedObsidianPlugin;
    mode: "create" | "edit";
    quest?: Quest | null;
    onSubmit: (createdQuest?: Quest, filePath?: string) => void;
    /** Open guild contract titles for optional linking on create. */
    openContracts?: string[];
    /** Pre-select active pinned contract when creating from the quest hub. */
    defaultContract?: string;
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
    openContracts = [],
    defaultContract,
    prefill,
}) => {
    // Store original quest title for editing mode to find the quest in the file
    const [originalQuestTitle] = useState(() =>
        mode === "edit" && quest ? quest.title : ""
    );
    
    // State initialization
    const [title, setTitle] = useState(mode === "edit" && quest ? quest.title : (prefill?.title || ""));
    const [description, setDescription] = useState(mode === "edit" && quest ? quest.description || "" : (prefill?.description || ""));
    const [skills, setSkills] = useState<SkillMetadata[]>(() =>
        mode === "edit" && quest ? matchQuestSkills(quest, []) : []
    );
    const [allSkills, setAllSkills] = useState<SkillMetadata[]>([]);
    const [skillsLoading, setSkillsLoading] = useState(true);
    const [selectedSkill, setSelectedSkill] = useState<string>("");
    const [priority, setPriority] = useState(mode === "edit" && quest ? quest.priority || "Medium" : "Medium");
    const [difficulty, setDifficulty] = useState(mode === "edit" && quest ? quest.difficulty || "Medium" : "Medium");
    const [xp, setXp] = useState(mode === "edit" && quest ? quest.xp || 0 : rollQuestRewardXp("Medium"));
    const [cp, setCp] = useState(mode === "edit" && quest ? quest.cp || 0 : rollQuestRewardCp("Medium"));
    const [banner, setBanner] = useState(mode === "edit" && quest ? quest.banner || "" : "");
    const [bannerAlign, setBannerAlign] = useState<string>(
        mode === "edit" && quest && quest.bannerAlign ? quest.bannerAlign : "center"
    );

    const [timelineTheme, setTimelineTheme] = useState<
        QuestTimelineTheme | undefined
    >(() =>
        mode === "edit" && quest
            ? normalizeQuestTimelineTheme(quest.timelineTheme)
            : undefined
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
    const [startDate, setStartDate] = useState(() => {
        if (mode === "edit" && quest?.start) {
            return quest.start.includes('T') ? quest.start.split('T')[0] : quest.start;
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
        if (mode === "edit" && quest) {
            const stamp = quest.due?.includes("T") ? quest.due : quest.scheduled;
            if (stamp?.includes("T")) {
                return stamp.split("T")[1]?.substring(0, 5) || "";
            }
        }
        if (mode === "create" && prefill?.dueISO?.includes("T")) {
            const timePart = prefill.dueISO.split("T")[1];
            return timePart ? timePart.substring(0, 5) : "";
        }
        return "";
    });
    
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subtasks, setSubtasks] = useState<{ text: string; completed: boolean; description?: string }[]>(mode === "edit" && quest ? quest.subtasks || [] : []);
    const [newSubtask, setNewSubtask] = useState("");
    const [newSubtaskDescription, setNewSubtaskDescription] = useState("");

    /** Parsed from quest when editing; undefined means “use default stamina cost” (see getQuestEnergyCost). */
    const [energyCost, setEnergyCost] = useState<number | undefined>(() =>
        mode === "edit" && typeof quest?.energyCost === "number" && quest.energyCost > 0
            ? quest.energyCost
            : undefined
    );
    const [activityProfile, setActivityProfile] = useState<ActivityProfileId>(() =>
        mode === "edit" && quest?.activityProfile
            ? normalizeActivityProfileId(quest.activityProfile)
            : "generic"
    );
    const [attachedContract, setAttachedContract] = useState(
        mode === "edit" && quest?.project ? quest.project : defaultContract || ""
    );
    const [customTags, setCustomTags] = useState<string[]>(() =>
        mode === "edit" && quest ? getQuestCustomTags(quest) : []
    );

    useEffect(() => {
        if (!isOpen) return;
        if (mode === "edit" && quest?.project) {
            setAttachedContract(quest.project);
            return;
        }
        if (mode === "create") {
            setAttachedContract(defaultContract || "");
        }
    }, [isOpen, mode, quest?.project, defaultContract]);

    /**
     * When priority or difficulty actually changes, roll XP / CP in the matching ranges
     * (getXPRange by priority, getCPRange by difficulty). Skip the first "sync" per modal open
     * so we keep the initial useState (edit: saved values, create: first random roll).
     */
    const lastRewardTierRef = useRef<{ priority: string; difficulty: string } | null>(null);
    const skipNextRewardRollRef = useRef(false);
    const hydratedQuestKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            lastRewardTierRef.current = null;
            hydratedQuestKeyRef.current = null;
            return;
        }
        if (skipNextRewardRollRef.current) {
            lastRewardTierRef.current = { priority, difficulty };
            skipNextRewardRollRef.current = false;
            return;
        }
        if (lastRewardTierRef.current === null) {
            lastRewardTierRef.current = { priority, difficulty };
            return;
        }
        const prev = lastRewardTierRef.current;
        if (prev.priority === priority && prev.difficulty === difficulty) return;
        if (prev.priority !== priority) {
            setXp(rollQuestRewardXp(priority));
        }
        if (prev.difficulty !== difficulty) {
            setCp(rollQuestRewardCp(difficulty));
        }
        lastRewardTierRef.current = { priority, difficulty };
    }, [isOpen, priority, difficulty]);
    
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
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(
        mode === "edit" && Boolean(
            quest?.due ||
            quest?.recur ||
            quest?.estimatedTime ||
            quest?.description ||
            quest?.banner ||
            (quest?.subtasks && quest.subtasks.length > 0)
        )
    );
    const [activeAdvancedTab, setActiveAdvancedTab] = useState<'details' | 'customization' | 'features'>('details');
    const [questGiverImagePath, setQuestGiverImagePath] = useState(plugin.settings.questGiverImagePath || "assets/questgiver.jpg");

    useEffect(() => {
        if (!isOpen) return;
        if (mode !== "edit" || !quest) return;

        const key = questEditKey(quest);
        if (hydratedQuestKeyRef.current === key) return;
        hydratedQuestKeyRef.current = key;
        skipNextRewardRollRef.current = true;

        setTitle(quest.title || "");
        setDescription(quest.description || "");
        setPriority(quest.priority || "Medium");
        setDifficulty(quest.difficulty || "Medium");
        setXp(quest.xp || 0);
        setCp(quest.cp || 0);
        setBanner(quest.banner || "");
        setBannerAlign(quest.bannerAlign || "center");
        setTimelineTheme(normalizeQuestTimelineTheme(quest.timelineTheme));
        setDue(quest.due ? (quest.due.includes("T") ? quest.due.split("T")[0] : quest.due) : "");
        setStartDate(quest.start ? (quest.start.includes("T") ? quest.start.split("T")[0] : quest.start) : "");
        setRecur(quest.recur || "");
        setEstimatedMinutes(normalizeEstimatedMinutes(quest.estimatedTime || ""));
        setScheduleTime(
            quest.due?.includes("T")
                ? quest.due.split("T")[1]?.substring(0, 5) || ""
                : quest.scheduled?.includes("T")
                    ? quest.scheduled.split("T")[1]?.substring(0, 5) || ""
                    : ""
        );
        setSubtasks(quest.subtasks || []);
        setAttachedContract(quest.project || "");
        if (typeof quest.energyCost === "number" && quest.energyCost > 0) {
            setEnergyCost(quest.energyCost);
        } else {
            setEnergyCost(undefined);
        }
        setActivityProfile(
            quest.activityProfile
                ? normalizeActivityProfileId(quest.activityProfile)
                : "generic"
        );
        setSkills(matchQuestSkills(quest, allSkills));
        setCustomTags(getQuestCustomTags(quest));
        lastRewardTierRef.current = {
            priority: quest.priority || "Medium",
            difficulty: quest.difficulty || "Medium",
        };

        const hasAdvanced = Boolean(
            quest.due ||
            quest.recur ||
            quest.estimatedTime ||
            quest.description ||
            quest.banner ||
            (quest.subtasks && quest.subtasks.length > 0)
        );
        if (hasAdvanced) setShowAdvancedOptions(true);
    }, [isOpen, mode, quest]);

    // Quest save location state (where the quest markdown will be written)
    const defaultQuestFilePath = plugin.settings.defaultQuestFilePath || "GamifiedTasks.md";
    const questSaveLocations = plugin.settings.questSaveLocations ?? [];
    const perNoteMode = isPerNoteMode(plugin.settings);
    const taskNoteFolder = getTaskNoteFolder(plugin.settings);
    const [saveLocationId, setSaveLocationId] = useState<string>("default");
    const [customFilePath, setCustomFilePath] = useState<string>("");

    // Handle quest giver image change
    const handleQuestGiverImageChange = (newPath: string) => {
        setQuestGiverImagePath(newPath);
        plugin.settings.questGiverImagePath = newPath;
        plugin.saveSettings();
    };

    // Load skills on component mount (safety timer so mobile never sticks on "Loading skills...")
    useEffect(() => {
        let cancelled = false;
        const safetyTimer = window.setTimeout(() => {
            if (!cancelled) setSkillsLoading(false);
        }, 10000);

        const loadSkills = async () => {
            try {
                setSkillsLoading(true);
                let discoveredSkills = await getAllSkills(plugin.app.vault);
                // Phone vault index can lag — one short retry if empty
                if (!cancelled && discoveredSkills.length === 0) {
                    await new Promise((r) => window.setTimeout(r, 400));
                    if (!cancelled) {
                        discoveredSkills = await getAllSkills(plugin.app.vault);
                    }
                }
                if (cancelled) return;

                setAllSkills(discoveredSkills);

                // If editing, populate skills from quest
                if (mode === "edit" && quest) {
                    setSkills(matchQuestSkills(quest, discoveredSkills));
                }
            } catch (error) {
                console.error("Error loading skills:", error);
                if (!cancelled) setAllSkills([]);
            } finally {
                window.clearTimeout(safetyTimer);
                if (!cancelled) setSkillsLoading(false);
            }
        };

        void loadSkills();
        return () => {
            cancelled = true;
            window.clearTimeout(safetyTimer);
        };
    }, [mode, quest, plugin.app.vault]);

    // Handle skill selection from dropdown
    const handleSkillSelection = (skillName: string) => {
        if (!skillName) {
            setSelectedSkill("");
            return;
        }

        const skill = allSkills.find(s => s.name === skillName);
        if (!skill) return;

        const key = normalizeSkillKey(skillName);
        if (skills.some(s => normalizeSkillKey(s.name) === key)) {
            setSkills(skills.map(s => (normalizeSkillKey(s.name) === key ? skill : s)));
            setSelectedSkill("");
            return;
        }
        setSkills([...skills, skill]);
        setSelectedSkill("");
    };

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
            pixelNotice(`Could not save quest banner: ${msg}. Quest will be saved without it.`, 6000);
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

            const getScheduledRange = () => {
                let start = startDate.trim();
                let dueDay = due.trim();
                if (start && dueDay && start > dueDay) {
                    const swap = start;
                    start = dueDay;
                    dueDay = swap;
                }
                if (!dueDay && start) dueDay = start;
                if (start && dueDay && start === dueDay) start = "";
                const dueISO = dueDay
                    ? scheduleTime
                        ? `${dueDay}T${scheduleTime}`
                        : dueDay
                    : "";
                return {
                    start: start || undefined,
                    due: dueISO || undefined,
                };
            };

            if (mode === "create") {
                // Create new quest
                const bannerPath = await ensureBannerPath(banner || undefined);
                const resolvedStamina = getQuestEnergyCost({ energyCost });
                const usePerNoteCreate =
                    isPerNoteMode(plugin.settings) && saveLocationId === "default";

                if (usePerNoteCreate) {
                    const file = await createQuestNote(
                        plugin.app,
                        getTaskNoteFolder(plugin.settings),
                        {
                            title: title.trim(),
                            description: description.trim() || undefined,
                            subtasks,
                            skills,
                            priority,
                            difficulty,
                            xp,
                            cp,
                            due: getScheduledRange().due,
                            start: getScheduledRange().start,
                            recur: recur || undefined,
                            estimatedTime: estimatedMinutes || undefined,
                            energyCost: resolvedStamina,
                            activityProfile:
                                activityProfile === "generic" ? undefined : activityProfile,
                            banner: bannerPath || undefined,
                            bannerAlign,
                            timelineTheme,
                            project: attachedContract.trim() || undefined,
                            customTags,
                        }
                    );

                    const questForState: Quest = {
                        id: file.path,
                        title: title.trim(),
                        description: description.trim() || undefined,
                        skills: skills.map((s) => s.name),
                        priority,
                        difficulty,
                        xp,
                        cp,
                        coins: Math.round(xp * 0.2),
                        banner: bannerPath || undefined,
                        bannerAlign,
                        ...(timelineTheme ? { timelineTheme } : {}),
                        due: getScheduledRange().due,
                        start: getScheduledRange().start,
                        recur: recur || undefined,
                        estimatedTime: estimatedMinutes || undefined,
                        subtasks,
                        completed: false,
                        className: skills[0]?.class || "",
                        stats: skills[0]?.stats ? Object.keys(skills[0].stats) : [],
                        energyCost: resolvedStamina,
                        filePath: file.path,
                        ...(activityProfile !== "generic" ? { activityProfile } : {}),
                        ...(attachedContract.trim() ? { project: attachedContract.trim() } : {}),
                    };
                    onSubmit(questForState, file.path);
                    return;
                }

                const newQuest = {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    skills: skills.map((s) => s.name),
                    priority,
                    difficulty,
                    xp,
                    cp,
                    banner: bannerPath || undefined,
                    bannerAlign,
                    timelineTheme,
                    due: getScheduledRange().due,
                    start: getScheduledRange().start,
                    recur: recur || undefined,
                    estimatedTime: estimatedMinutes || undefined,
                    subtasks,
                    customRewards: undefined,
                    enhancedCustomRewards:
                        enhancedCustomRewards.length > 0 ? enhancedCustomRewards : undefined,
                    energyCost: resolvedStamina,
                    activityProfile: activityProfile === "generic" ? undefined : activityProfile,
                    project: attachedContract.trim() || undefined,
                    customTags,
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
                    ...(timelineTheme ? { timelineTheme } : {}),
                    due: getScheduledRange().due,
                    start: getScheduledRange().start,
                    recur: recur || undefined,
                    estimatedTime: estimatedMinutes || undefined,
                    subtasks,
                    completed: false,
                    className: skills[0]?.class || '',
                    stats: skills[0]?.stats ? Object.keys(skills[0].stats) : [],
                    energyCost: resolvedStamina,
                    ...(activityProfile !== "generic" ? { activityProfile } : {}),
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
                const resolvedStamina = getQuestEnergyCost({ energyCost });
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
                    timelineTheme,
                    due: getScheduledRange().due,
                    start: getScheduledRange().start,
                    recur: recur || undefined,
                    estimatedTime: estimatedMinutes || undefined,
                    subtasks: subtasks,
                    customRewards: undefined,
                    enhancedCustomRewards: enhancedCustomRewards.length > 0 ? enhancedCustomRewards : undefined,
                    energyCost: resolvedStamina,
                    activityProfile: activityProfile === "generic" ? undefined : activityProfile,
                    project: attachedContract.trim() || undefined,
                    customTags,
                };

                const markdownTask = generateMarkdownTask(updatedQuest);
                
                // Replace the quest block
                const newLines = [
                    ...lines.slice(0, questIndex),
                    markdownTask,
                    ...lines.slice(endIndex)
                ];
                
                const range = getScheduledRange();
                const newContent = patchScheduleFrontmatter(
                    newLines.join('\n'),
                    range.due,
                    range.start
                );
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

    const isClayTheme = getAppliedVisualTheme().preset === "clay";

    if (!isOpen) return null;

    // Quest Modal UI
    const questModalPortal = ReactDOM.createPortal(
        <div
            className={`${styles.modalOverlay} ${isClayTheme ? styles.clayQuestModalOverlay : styles.pixelQuestModalOverlay}${isMobile ? ` ${styles.mobileOverlay}` : ''}`}
            data-pixel-modal={isClayTheme ? undefined : "quest-form"}
            onClick={onClose}
        >
            <div
                className={`${styles.modal} ${isClayTheme ? styles.clayQuestModalPanel : styles.pixelQuestModalPanel}${isMobile ? ` ${styles.mobileShell}` : ''}`}
                data-pixel-shell={isClayTheme ? undefined : "quest-form"}
                data-clay-shell={isClayTheme ? "quest-form" : undefined}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={isMobile ? styles.mobileHeader : undefined}>
                    <QuestModalHeader
                        mode={mode}
                        isMobile={isMobile}
                        onClose={onClose}
                    />
                </div>

                <form
                    onSubmit={handleSubmit}
                    className={isMobile ? styles.mobileForm : undefined}
                >
                    <div className={isMobile ? styles.mobileBody : undefined}>
                        {/* Quest Giver */}
                        {!questGiverCollapsed && (
                            <div className={styles.questGiverSection}>
                                <QuestGiverAvatar
                                    plugin={plugin}
                                    imagePath={questGiverImagePath}
                                    onImageChange={handleQuestGiverImageChange}
                                    collapsed={false}
                                />

                                <div className={styles.questGiverDialogue}>
                                    <p className={styles.questGiverDialogueText}>
                                        {animatedDialogue}
                                        {isAnimating && <span className={styles.blinkingCursor}>|</span>}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Save Location Selector (create only — edits stay in the quest's file) */}
                        {mode === "create" ? (
                        <div className={styles.saveLocationSection}>
                            <div className={styles.saveLocationHeader}>
                                <span className={styles.saveLocationTitle}>
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
                                    {perNoteMode
                                        ? `New task note in ${taskNoteFolder}/`
                                        : `Default list file (${defaultQuestFilePath})`}
                                </option>
                                {questSaveLocations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.label} — {loc.filePath} (list file)
                                    </option>
                                ))}
                                <option value="custom">Custom list file path…</option>
                            </select>
                            {saveLocationId === "custom" && (
                                <input
                                    type="text"
                                    value={customFilePath}
                                    onChange={(e) => setCustomFilePath(e.target.value)}
                                    placeholder="e.g. Daily/2025-11-24.md"
                                    className={styles.customPathInput}
                                />
                            )}
                            <div className={styles.saveLocationHint}>
                                {perNoteMode && saveLocationId === "default"
                                    ? `Creates one markdown note per quest in ${taskNoteFolder} (TaskNotes / TaskForge). Other locations still append a line to a list file.`
                                    : perNoteMode
                                      ? "This location appends a checkbox line to a list file. Choose “New task note” above for a single TaskNotes page."
                                      : "Choose a saved location or type a custom note path. New quests will be appended as a line in that file. Switch Settings → Quest storage mode to “One task per note” to create a separate note per quest."}
                            </div>
                        </div>
                        ) : (
                        <div className={styles.saveLocationSection}>
                            <div className={styles.saveLocationHeader}>
                                <span className={styles.saveLocationTitle}>
                                    <span>📁 Editing quest file</span>
                                </span>
                            </div>
                            <div className={styles.saveLocationHint}>
                                {quest?.filePath || defaultQuestFilePath}
                            </div>
                        </div>
                        )}

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
                            energyOnComplete={getQuestEnergyCost({ energyCost })}
                            activityProfile={activityProfile}
                            setActivityProfile={setActivityProfile}
                            due={due}
                            setDue={setDue}
                            startDate={startDate}
                            setStartDate={setStartDate}
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
                            showContractPicker={mode === "create" && openContracts.length > 0}
                            openContracts={openContracts}
                            attachedContract={attachedContract}
                            setAttachedContract={setAttachedContract}
                            customTags={customTags}
                            setCustomTags={setCustomTags}
                        />

                        <QuestModalAdvancedOptions
                            showAdvancedOptions={showAdvancedOptions}
                            setShowAdvancedOptions={setShowAdvancedOptions}
                            activeAdvancedTab={activeAdvancedTab}
                            setActiveAdvancedTab={setActiveAdvancedTab}
                            description={description}
                            setDescription={setDescription}
                            recur={recur}
                            setRecur={setRecur}
                            estimatedMinutes={estimatedMinutes}
                            setEstimatedMinutes={setEstimatedMinutes}
                            questGiverImagePath={questGiverImagePath}
                            setQuestGiverImagePath={setQuestGiverImagePath}
                            questBanner={banner}
                            setQuestBanner={setBanner}
                            bannerAlign={bannerAlign}
                            setBannerAlign={setBannerAlign}
                            timelineTheme={timelineTheme}
                            setTimelineTheme={setTimelineTheme}
                            subtasks={subtasks}
                            newSubtask={newSubtask}
                            setNewSubtask={setNewSubtask}
                            newSubtaskDescription={newSubtaskDescription}
                            setNewSubtaskDescription={setNewSubtaskDescription}
                            handleAddSubtask={handleAddSubtask}
                            handleRemoveSubtask={handleRemoveSubtask}
                            isMobile={isMobile}
                        />

                        {error && <div className={styles.error}>{error}</div>}
                    </div>

                    <div className={isMobile ? styles.mobileFooter : undefined}>
                        <QuestModalActions
                            mode={mode}
                            onClose={onClose}
                            onSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                            isMobile={isMobile}
                            canSubmit={Boolean(title.trim()) && skills.length > 0}
                        />
                    </div>
                </form>
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