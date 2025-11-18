import { useState, useEffect } from 'react';
import type { Quest, SkillMetadata } from '../utils/taskParser';
import { getRandomInRange, getXPRange, getCPRange } from '../utils/questUtils';

interface UseQuestModalProps {
    mode: 'create' | 'edit';
    quest?: Quest;
    prefill?: {
        title?: string;
        description?: string;
    };
}

export const useQuestModal = ({ mode, quest, prefill }: UseQuestModalProps) => {
    // Store original quest title for editing mode to find the quest in the file
    const [originalQuestTitle] = useState(() => {
        window.console.log("Initializing originalQuestTitle - mode:", mode, "quest:", quest);
        if (mode === "edit" && quest) {
            window.console.log("Quest object:", quest);
            window.console.log("Quest title:", quest.title);
            window.console.log("Quest id:", quest.id);
        }
        const title = mode === "edit" && quest ? quest.title : "";
        window.console.log("Original quest title set to:", title);
        return title;
    });

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

    // Separate date and time properly when editing
    const [due, setDue] = useState(() => {
        if (mode === "edit" && quest?.due) {
            // If it's a datetime, extract just the date part
            if (quest.due.includes('T')) {
                return quest.due.split('T')[0];
            }
            return quest.due;
        }
        return "";
    });

    const [recur, setRecur] = useState(mode === "edit" && quest ? quest.recur || "" : "");
    const [estimatedTime, setEstimatedTime] = useState(mode === "edit" && quest ? quest.estimatedTime || "" : "");
    const [scheduleTime, setScheduleTime] = useState(() => {
        if (mode === "edit" && quest?.due && quest.due.includes('T')) {
            // Extract time part from datetime
            const timePart = quest.due.split('T')[1];
            return timePart.substring(0, 5); // HH:MM format
        }
        return "";
    });

    const [subtasks, setSubtasks] = useState<{ text: string; completed: boolean; description?: string }[]>(() => {
        if (mode === "edit" && quest?.subtasks) {
            return quest.subtasks.map(subtask => ({
                text: subtask.text,
                completed: subtask.completed || false,
                description: subtask.description || ""
            }));
        }
        return [];
    });

    const [newSubtask, setNewSubtask] = useState("");
    const [newSubtaskDescription, setNewSubtaskDescription] = useState("");

    // Advanced options state
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [activeAdvancedTab, setActiveAdvancedTab] = useState<'details' | 'customization' | 'features'>('details');

    // Quest banner and customization
    const [questBanner, setQuestBanner] = useState(mode === "edit" && quest ? quest.banner || "" : "");
    const [showBannerUpload, setShowBannerUpload] = useState(false);
    const [questGiverName, setQuestGiverName] = useState("");

    // Load skills when component mounts
    useEffect(() => {
        const loadSkills = async () => {
            try {
                setSkillsLoading(true);
                // Access the skill discovery service through the plugin
                const plugin = (window as any).app?.plugins?.plugins?.['gamification-into-obsidian'];
                if (plugin?.skillDiscoveryService) {
                    const allSkillsData = await plugin.skillDiscoveryService.getAllSkills();
                    setAllSkills(allSkillsData);

                    // If editing and quest has skills, set them
                    if (mode === "edit" && quest?.skills) {
                        const questSkills = allSkillsData.filter((skill: SkillMetadata) =>
                            quest.skills?.includes(skill.name)
                        );
                        setSkills(questSkills);
                    }
                }
            } catch (error) {
                console.error('Error loading skills:', error);
            } finally {
                setSkillsLoading(false);
            }
        };

        loadSkills();
    }, [mode, quest]);

    const handleAddSubtask = () => {
        if (newSubtask.trim()) {
            const newSubtaskObj = {
                text: newSubtask.trim(),
                completed: false,
                description: newSubtaskDescription.trim() || undefined
            };
            setSubtasks([...subtasks, newSubtaskObj]);
            setNewSubtask("");
            setNewSubtaskDescription("");
        }
    };

    const handleRemoveSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                setQuestBanner(base64);
                setShowBannerUpload(false);
            } catch (error) {
                console.error('Error uploading banner:', error);
            }
        }
    };

    return {
        // Form state
        title,
        setTitle,
        description,
        setDescription,
        skills,
        setSkills,
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
        recur,
        setRecur,
        estimatedTime,
        setEstimatedTime,
        scheduleTime,
        setScheduleTime,
        subtasks,
        setSubtasks,
        newSubtask,
        setNewSubtask,
        newSubtaskDescription,
        setNewSubtaskDescription,

        // Advanced options
        showAdvancedOptions,
        setShowAdvancedOptions,
        activeAdvancedTab,
        setActiveAdvancedTab,

        // Customization
        questBanner,
        setQuestBanner,
        showBannerUpload,
        setShowBannerUpload,
        questGiverName,
        setQuestGiverName,

        // Handlers
        handleAddSubtask,
        handleRemoveSubtask,
        handleBannerUpload,

        // Computed values
        originalQuestTitle
    };
};
