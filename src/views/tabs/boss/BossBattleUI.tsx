import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { Boss, BossProgress, BossCategory, LinkedTask, SkillBasedBoss, StatBasedMove, SkillTreeStats, PlayerStats, SkillBasedBattleState } from '../../../features/quests/types/BossTypes';
import { BossManagementState } from '../../../features/quests/utils/bossManagementService';
import { Quest } from '../../../features/quests/utils/taskParser';
import { bossManagementService } from '../../../features/quests/utils/bossManagementService';
import { TaskIntegrationService } from '../../../features/quests/utils/taskIntegrationService';
import { RealTimeQuestTracker } from '../../../features/quests/services/realTimeQuestTracker';
import { EnhancedBattleUI } from './components/EnhancedBattleUI';
import { EnhancedBattleInfoPanel } from './components/EnhancedBattleInfoPanel';
import TacticalBattleUI from '../../../features/quests/components/TacticalBattleUI';
import { PokemonBattleConverter, SubtaskBossBattle } from '../../../features/quests/utils/pokemonBattleConverter';

import { playerStore } from '../../../shared/state/playerStore';
import { PlayerData } from '../../../data/models/PlayerData';
import { SkillBasedBattleEngine } from '../../../features/quests/utils/skillBasedBattleEngine';
import { ProjectBossFactory } from '../../../features/quests/utils/projectBossFactory';
import { BossAnalyticsUI } from './BossAnalyticsUI';
import { Notice, TFile } from 'obsidian';
import { createSampleBosses } from './sampleBosses';
import { saveAndActivateBoss } from './enhancedBossCreation';
import { getAllSkills, SkillMetadata } from '../../../shared/utils/skillDiscovery';
import { currencyDisplay } from '../../../shared/services/currencyDisplayService';
import { useQuestManagement } from '../../../data/hooks/useQuestManagement';

// Enhanced Productivity Systems
import { productivityEquipmentSystem, ProductivityEquipment } from '../../../features/quests/systems/productivityEquipmentSystem';
import { dynamicBossEvents } from '../../../features/quests/systems/dynamicBossEvents';
import { createEnhancedBattleIntegration } from '../../../features/quests/systems/enhancedBattleIntegration';
import styles from './BossBattleStyles.module.css';
import BossCreatorTab from './BossCreatorTab';

interface BossBattleUIProps {
    plugin: GamifiedObsidianPlugin;
}

interface BossData {
    boss: Boss;
    quest: Quest;
    progress: BossProgress;
}

type TabType = 'tutorial' | 'selection' | 'creation' | 'battle' | 'analytics';

// Loading states for progressive loading
interface LoadingStates {
    playerData: boolean;
    bosses: boolean;
    quests: boolean;
    skills: boolean;
    templates: boolean;
    taskIntegration: boolean;
}

export const BossBattleUI: React.FC<BossBattleUIProps> = ({ plugin }) => {
    console.log("BossBattleUI: Component rendering...");
    const [activeTab, setActiveTab] = useState<TabType>('tutorial');
    const [availableBosses, setAvailableBosses] = useState<BossData[]>([]);
    const [selectedBoss, setSelectedBoss] = useState<BossData | null>(null);
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [currentScreen, setCurrentScreen] = useState<'main' | 'battle'>('main');
    
    // Load quests to get real subtasks
    const { quests } = useQuestManagement(plugin);
    const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
    const [taskIntegrationService, setTaskIntegrationService] = useState<TaskIntegrationService | null>(null);
    
    // Skill-based battle system state
    const [skillStats, setSkillStats] = useState<SkillTreeStats>({});
    const [skillBasedBoss, setSkillBasedBoss] = useState<SkillBasedBoss | null>(null);
    const [playerBattleStats, setPlayerBattleStats] = useState<PlayerStats>({ 
        charisma: 1, 
        creativity: 1, 
        dexterity: 1, 
        endurance: 1, 
        faith: 1, 
        ingenuity: 1, 
        intelligence: 1, 
        mindfulness: 1, 
        strength: 1, 
        willpower: 1, 
        wisdom: 1 
    });
    const [questTracker] = useState(() => new RealTimeQuestTracker(plugin.app, plugin));
    const [isQuestTrackingActive, setIsQuestTrackingActive] = useState(false);
    
    // Enhanced Productivity Systems State
    const [enhancedBattleIntegration] = useState(() => createEnhancedBattleIntegration(plugin.app.vault));
    const [activeEvents, setActiveEvents] = useState<Map<string, unknown>>(new Map());
    const [equippedGear, setEquippedGear] = useState<Map<string, ProductivityEquipment>>(new Map());
    const [battlePreparation, setBattlePreparation] = useState<unknown>(null);
    
    // Combo System State
    const [comboChain, setComboChain] = useState<string[]>([]);
    const [comboMultiplier, setComboMultiplier] = useState<number>(1);
    const [lastTaskCompletionTime, setLastTaskCompletionTime] = useState<number>(0);
    const [comboTimer, setComboTimer] = useState<number>(0);
    
    // Unified battle state
    const [unifiedBattle, setUnifiedBattle] = useState<SubtaskBossBattle | null>(null);
    const [showUnifiedBattle, setShowUnifiedBattle] = useState(false);
    
    // Loading states for progressive loading
    const [loadingStates, setLoadingStates] = useState<LoadingStates>({
        playerData: true,
        bosses: true,
        quests: false, // Start false, load when needed
        skills: false, // Start false, load when needed
        templates: true,
        taskIntegration: true
    });

    // Cache for expensive operations
    const [questCache, setQuestCache] = useState<Array<{
        questId: string;
        text: string;
        filePath: string;
        completed: boolean;
        damageValue: number;
        xp: number;
        cp: number;
        coins: number;
        tags: string[];
    }>>([]);
    const [skillsCache, setSkillsCache] = useState<SkillMetadata[]>([]);
    const [lastQuestScan, setLastQuestScan] = useState<number>(0);
    const [lastSkillsScan, setLastSkillsScan] = useState<number>(0);

    // Debounce timers
    const [debounceTimers, setDebounceTimers] = useState<{[key: string]: NodeJS.Timeout}>({});

    // Debounce utility function
    const debounce = useCallback((func: () => void, delay: number, key: string) => {
        if (debounceTimers[key]) {
            clearTimeout(debounceTimers[key]);
        }
        const timer = setTimeout(func, delay);
        setDebounceTimers(prev => ({ ...prev, [key]: timer }));
    }, [debounceTimers]);

    // Clear debounce timers on unmount
    useEffect(() => {
        return () => {
            Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
        };
    }, [debounceTimers]);

    // Progressive loading: Load critical data first, then non-critical
    useEffect(() => {
        const loadCriticalData = async () => {
            console.log("BossBattleUI: Loading critical data...");
            
            // Initialize enhanced productivity systems
            try {
                await enhancedBattleIntegration.initialize();
                console.log("Enhanced productivity systems initialized");
            } catch (error) {
                console.error("Failed to initialize enhanced systems:", error);
            }
            
            // Load player data and bosses in parallel (critical)
            await Promise.all([
                loadPlayerData(),
                loadAvailableBosses(),
                loadSavedBossTemplates(),
                initializeTaskIntegration()
            ]);
            
            console.log("BossBattleUI: Critical data loaded, starting non-critical data...");
            
            // Load non-critical data after a short delay
            setTimeout(() => {
                if (activeTab === 'creation') {
                    loadSkillStats();
                    loadAvailableSkills();
                }
                if (activeTab === 'creation' || activeTab === 'selection') {
                    loadAvailableQuests();
                }
            }, 100);
        };

        loadCriticalData();
    }, []);

    // Monitor equipment and events for battle integration
    useEffect(() => {
        const updateEquipmentAndEvents = () => {
            // Update equipped gear state
            const currentGear = productivityEquipmentSystem.getEquippedGear();
            setEquippedGear(currentGear);
            
            // Update active events for current boss
            if (selectedBoss) {
                const events = dynamicBossEvents.getAllActiveEvents();
                setActiveEvents(events);
            }
        };
        
        // Initial load
        updateEquipmentAndEvents();
        
        // Update every 30 seconds or when boss changes
        const interval = setInterval(updateEquipmentAndEvents, 30000);
        
        return () => clearInterval(interval);
    }, [selectedBoss]);

    // Real-time quest tracking for boss battles
    useEffect(() => {
        const handleBossDamage = (event: CustomEvent) => {
            const { bossName, damage, newHP } = event.detail;
            setBattleLog(prev => [...prev.slice(-9), `⚔️ ${damage} damage dealt to ${bossName}! (HP: ${newHP})`]);
        };

        const handleBossDefeat = (event: CustomEvent) => {
            const { boss } = event.detail;
            setBattleLog(prev => [...prev.slice(-9), `🎉 ${boss.name} defeated! Check Boss-Rewards.md for your rewards!`]);
            // Refresh boss list
            loadAvailableBosses();
        };

        // Add event listeners
        window.addEventListener('boss-quest-damage', handleBossDamage as EventListener);
        window.addEventListener('boss-defeated', handleBossDefeat as EventListener);

        return () => {
            window.removeEventListener('boss-quest-damage', handleBossDamage as EventListener);
            window.removeEventListener('boss-defeated', handleBossDefeat as EventListener);
        };
    }, []);

    // Open create tab when requested by sidebar or other triggers
    useEffect(() => {
        const handler = () => setActiveTab('creation');
        window.addEventListener('openBossCreation', handler);
        return () => window.removeEventListener('openBossCreation', handler);
    }, []);

    // Load skills and quests when tab changes to creation
    useEffect(() => {
        if (activeTab === 'creation') {
            debounce(() => {
                if (!loadingStates.skills) {
                    loadSkillStats();
                    loadAvailableSkills();
                }
                if (!loadingStates.quests) {
                    loadAvailableQuests();
                }
            }, 300, 'tab-change');
        }
    }, [activeTab, loadingStates.skills, loadingStates.quests]);

    // Load skill stats from skill tree markdown files (with caching)
    const loadSkillStats = useCallback(async () => {
        if (Object.keys(skillStats).length > 0) {
            console.log('Skill stats already loaded, skipping...');
            return;
        }

        setLoadingStates(prev => ({ ...prev, skills: true }));
        try {
            const stats = await SkillBasedBattleEngine.readSkillTreeStats(plugin.app.vault);
            setSkillStats(stats);
            const battleStats = SkillBasedBattleEngine.convertToPlayerStats(stats);
            setPlayerBattleStats(battleStats);
            console.log('Loaded skill stats:', stats);
        } catch (error) {
            console.error('Failed to load skill stats:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, skills: false }));
        }
    }, [skillStats, plugin.app.vault]);

    // Load available skills from skill tree (with caching)
    const loadAvailableSkills = useCallback(async () => {
        const now = Date.now();
        const cacheValid = now - lastSkillsScan < 5 * 60 * 1000; // 5 minutes cache

        if (skillsCache.length > 0 && cacheValid) {
            console.log('Using cached skills data');
            setAvailableSkills(skillsCache);
            return;
        }

        setLoadingStates(prev => ({ ...prev, skills: true }));
        try {
            const skills = await getAllSkills(plugin.app.vault);
            setAvailableSkills(skills);
            setSkillsCache(skills);
            setLastSkillsScan(now);
            console.log('Loaded available skills:', skills.length);
        } catch (error) {
            console.error('Failed to load available skills:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, skills: false }));
        }
    }, [skillsCache, lastSkillsScan, plugin.app.vault]);

    // Load available quests with caching and optimization
    const loadAvailableQuests = useCallback(async () => {
        const now = Date.now();
        const cacheValid = now - lastQuestScan < 2 * 60 * 1000; // 2 minutes cache

        if (questCache.length > 0 && cacheValid) {
            console.log('Using cached quests data');
            setAvailableQuests(questCache);
            return;
        }

        setLoadingStates(prev => ({ ...prev, quests: true }));
        try {
            // Use metadata cache for faster scanning
            const markdownFiles = plugin.app.vault.getMarkdownFiles();
            const quests: Array<{
                questId: string;
                text: string;
                filePath: string;
                completed: boolean;
                damageValue: number;
                xp: number;
                cp: number;
                coins: number;
                tags: string[];
            }> = [];

            // Process files in batches to avoid blocking
            const batchSize = 10;
            for (let i = 0; i < markdownFiles.length; i += batchSize) {
                const batch = markdownFiles.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (file) => {
                    try {
                        const content = await plugin.app.vault.read(file);
                        const lines = content.split('\n');

                        lines.forEach((line, index) => {
                            const trimmedLine = line.trim();
                            
                            // Match checkbox tasks: - [ ] or - [x]
                            const taskMatch = trimmedLine.match(/^- \[([ x])\] (.+)$/);
                            if (taskMatch) {
                                const taskText = taskMatch[2];
                                const isCompleted = taskMatch[1] === 'x';

                                // MUST have both #gamified-task AND #gamified-boss tags
                                if (taskText.includes('#gamified-task') && taskText.includes('#gamified-boss')) {
                                    // Extract tags
                                    const tags = taskText.match(/#[\w-]+/g) || [];
                                    
                                    // Extract XP, CP, coins from emojis or text
                                    const xpMatch = taskText.match(/⭐(\d+)/);
                                    const cpMatch = taskText.match(/🪙(\d+)/);
                                    const coinsMatch = taskText.match(/✨(\d+)/);
                                    
                                    const xp = xpMatch ? parseInt(xpMatch[1]) : 10;
                                    const cp = cpMatch ? parseInt(cpMatch[1]) : 5;
                                    const coins = coinsMatch ? parseInt(coinsMatch[1]) : Math.round(xp * 0.1);
                                    
                                    // Calculate damage value based on XP
                                    const damageValue = Math.max(5, Math.round(xp * 0.5));

                                    quests.push({
                                        questId: `${file.path}:${index}:${Date.now()}`,
                                        text: taskText,
                                        filePath: file.path,
                                        completed: isCompleted,
                                        damageValue,
                                        xp,
                                        cp,
                                        coins,
                                        tags: tags.map(tag => tag.substring(1)) // Remove # prefix
                                    });
                                }
                            }
                        });
                    } catch (error) {
                        console.error(`Error scanning file ${file.path}:`, error);
                    }
                }));

                // Small delay between batches to prevent blocking
                if (i + batchSize < markdownFiles.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            setAvailableQuests(quests);
            setQuestCache(quests);
            setLastQuestScan(now);
            console.log(`Found ${quests.length} eligible quests with both required tags`);
        } catch (error) {
            console.error('Failed to load available quests:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, quests: false }));
        }
    }, [questCache, lastQuestScan, plugin.app.vault]);

    // Initialize task integration service (optimized)
    const initializeTaskIntegration = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, taskIntegration: true }));
        try {
            const taskService = TaskIntegrationService.getInstance(
                plugin.app.vault,
                plugin.app.metadataCache
            );
            setTaskIntegrationService(taskService);
            
            // Scan for tasks in background
            setTimeout(async () => {
                try {
                    const allTasks = await taskService.scanVaultForTasks();
                    console.log(`Found ${allTasks.length} tasks in vault`);
                } catch (error) {
                    console.error('Background task scan failed:', error);
                }
            }, 500);
        } catch (error) {
            console.error('Failed to initialize task integration:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, taskIntegration: false }));
        }
    }, [plugin.app.vault, plugin.app.metadataCache]);

    // Load saved boss templates (optimized)
    const loadSavedBossTemplates = useCallback(() => {
        setLoadingStates(prev => ({ ...prev, templates: true }));
        try {
            const saved = localStorage.getItem('gamified-boss-templates');
            if (saved) {
                setSavedBossTemplates(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Failed to load boss templates:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, templates: false }));
        }
    }, []);

    // Load player data (optimized)
    const loadPlayerData = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, playerData: true }));
        try {
            const data = await playerStore.get();
            setPlayerData(data);
        } catch (error) {
            console.error('Failed to load player data:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, playerData: false }));
        }
    }, []);

    // Load available bosses (optimized)
    // Quest tracking functions
    const startQuestTracking = useCallback(() => {
        if (!isQuestTrackingActive) {
            questTracker.startMonitoring();
            setIsQuestTrackingActive(true);
            setBattleLog(prev => [...prev.slice(-9), "🎯 Real-time quest tracking activated!"]);
        }
    }, [questTracker, isQuestTrackingActive]);

    const stopQuestTracking = useCallback(() => {
        if (isQuestTrackingActive) {
            questTracker.stopMonitoring();
            setIsQuestTrackingActive(false);
            setBattleLog(prev => [...prev.slice(-9), "⏸️ Quest tracking paused."]);
        }
    }, [questTracker, isQuestTrackingActive]);


    const loadAvailableBosses = useCallback(async () => {
        setLoadingStates(prev => ({ ...prev, bosses: true }));
        try {
            // Get active bosses from the boss management service
            const activeBosses = bossManagementService.getActiveBosses();
            const bosses: BossData[] = activeBosses.map(({ boss, quest, progress }) => ({
                boss,
                quest,
                progress
            }));
            
            // Always add the demo boss for testing at the beginning
            const demoBoss = createDemoBoss();
            bosses.unshift(demoBoss);
            
            // Add skill-based demo boss if skill stats are loaded
            if (Object.keys(skillStats).length > 0) {
                const skillBasedDemo = await createSkillBasedDemoBoss();
                bosses.unshift(skillBasedDemo);
            }
            
            // Always add sample bosses for testing
            const sampleBosses = createSampleBosses();
            bosses.push(...sampleBosses);

            setAvailableBosses(bosses);
        } catch (error) {
            console.error('Failed to load bosses:', error);
        } finally {
            setLoadingStates(prev => ({ ...prev, bosses: false }));
        }
    }, [skillStats]);

    // Memoized loading indicator
    const isLoading = useMemo(() => {
        return Object.values(loadingStates).some(loading => loading);
    }, [loadingStates]);

    // Loading indicator component
    const LoadingIndicator = () => {
        if (!isLoading) return null;
        
        const loadingItems = Object.entries(loadingStates)
            .filter(([_, loading]) => loading)
            .map(([key, _]) => key.replace(/([A-Z])/g, ' $1').toLowerCase());

        return (
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '20px',
                borderRadius: '10px',
                zIndex: 1000,
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚡</div>
                <div>Loading Boss Battle System...</div>
                {loadingItems.length > 0 && (
                    <div style={{ fontSize: '0.9rem', marginTop: '10px', opacity: 0.8 }}>
                        Loading: {loadingItems.join(', ')}
                    </div>
                )}
            </div>
        );
    };

    // Boss avatar rendering component
    const renderBossAvatar = (boss: Boss, size: string = '3rem') => {
        // Check if boss has custom image
        if (boss.visuals?.customImage && boss.visuals.customImage.trim()) {
            return (
                <img
                    src={boss.visuals.customImage}
                    alt={boss.name}
                    style={{
                        width: size,
                        height: size,
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '10px'
                    }}
                    onError={(e) => {
                        // Fallback to emoji if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallbackDiv = document.createElement('div');
                        fallbackDiv.style.fontSize = size;
                        fallbackDiv.style.marginBottom = '10px';
                        fallbackDiv.textContent = boss.visuals?.avatar || '👹';
                        target.parentNode?.appendChild(fallbackDiv);
                    }}
                />
            );
        }
        
        // Otherwise render emoji
        return (
            <div style={{ fontSize: size, marginBottom: '10px' }}>
                {boss.visuals?.avatar || '👹'}
            </div>
        );
    };

    // Handle boss deletion
    const handleDeleteBoss = (bossData: BossData, event: React.MouseEvent) => {
        event.stopPropagation();
        if (confirm(`Delete "${bossData.boss.name}"? This cannot be undone.`)) {
            try {
                // Remove from boss management service
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const serviceState = (bossManagementService as any).state as BossManagementState;
                if (serviceState && serviceState.activeBosses) {
                    serviceState.activeBosses.delete(bossData.boss.id);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (bossManagementService as any).saveToStorage();
                }
                
                // Remove from localStorage boss data
                const data = localStorage.getItem('gamified-boss-data');
                if (data) {
                    const parsed = JSON.parse(data);
                    if (parsed.activeBosses) {
                        parsed.activeBosses = parsed.activeBosses.filter(
                            ([id]: [string, unknown]) => id !== bossData.boss.id
                        );
                        localStorage.setItem('gamified-boss-data', JSON.stringify(parsed));
                    }
                }
                
                // Also remove from boss templates if it exists there
                const templates = localStorage.getItem('gamified-boss-templates');
                if (templates) {
                    const parsedTemplates = JSON.parse(templates);
                    const filteredTemplates = parsedTemplates.filter((template: { id: string }) => template.id !== bossData.boss.id);
                    localStorage.setItem('gamified-boss-templates', JSON.stringify(filteredTemplates));
                }
                
                // Refresh the boss list
                loadAvailableBosses();
                
                new Notice(`Boss "${bossData.boss.name}" deleted successfully`);
            } catch (error) {
                console.error('Failed to delete boss:', error);
                new Notice('Failed to delete boss');
            }
        }
    };

    // Function to clear all test bosses at once
    const clearAllTestBosses = () => {
        if (confirm('Clear all test bosses (Josh, tester, etc.)? This cannot be undone.')) {
            try {
                // Get current boss list and filter out test bosses
                const activeBosses = bossManagementService.getActiveBosses();
                let deletedCount = 0;
                
                activeBosses.forEach(({ boss }) => {
                    const isTestBoss = boss.name.toLowerCase().includes('josh') ||
                                     boss.name.toLowerCase().includes('test') ||
                                     boss.description.toLowerCase().includes('test') ||
                                     (boss.id.includes('custom-') && boss.name.length < 10);
                    
                    if (isTestBoss) {
                        // Remove from boss management service
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const serviceState = (bossManagementService as any).state as BossManagementState;
                        if (serviceState && serviceState.activeBosses) {
                            serviceState.activeBosses.delete(boss.id);
                            deletedCount++;
                        }
                    }
                });
                
                // Save changes and refresh
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (bossManagementService as any).saveToStorage();
                loadAvailableBosses();
                
                new Notice(`Cleared ${deletedCount} test bosses`);
            } catch (error) {
                console.error('Failed to clear test bosses:', error);
                new Notice('Failed to clear test bosses');
            }
        }
    };

    // Unified battle functions
    const startUnifiedBattle = useCallback((bossData: BossData) => {
        window.console.log('Starting unified battle with:', bossData);
        
        if (!playerData) {
            new Notice('Player data not loaded. Please try again.');
            return;
        }

        if (!bossData.quest) {
            new Notice('No quest data found for this boss. Please try again.');
            return;
        }

        if (!bossData.quest.subtasks || bossData.quest.subtasks.length === 0) {
            new Notice('This quest has no subtasks to battle with. Please add subtasks first.');
            return;
        }

        try {
            window.console.log('Creating battle with quest:', bossData.quest);
            window.console.log('Player stats:', playerBattleStats);
            
            const battle = PokemonBattleConverter.createBattleFromQuest(
                bossData.quest,
                bossData.boss,
                playerBattleStats
            );
            
            window.console.log('Created battle:', battle);
            
            setUnifiedBattle(battle);
            setSelectedBoss(bossData);
            setShowUnifiedBattle(true);
            setActiveTab('battle');
            
            new Notice(`Starting unified battle with ${bossData.boss.name}!`);
        } catch (error) {
            window.console.error('Failed to start unified battle:', error);
            new Notice(`Failed to start battle: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [playerData, playerBattleStats]);

    const handleSubtaskComplete = useCallback((subtaskId: string) => {
        if (!unifiedBattle || !playerData) return;

        try {
            // Update the battle state
            const updatedBattle = PokemonBattleConverter.updateBattleOnSubtaskComplete(
                unifiedBattle,
                subtaskId,
                playerBattleStats
            );
            
            setUnifiedBattle(updatedBattle);
            
            // Update the quest in the quest tracker
            if (questTracker) {
                // questTracker.updateQuestProgress(updatedBattle.questId, subtaskId);
                // Note: updateQuestProgress method may not exist, skipping for now
            }
            
            // Show completion notification
            const subtask = (unifiedBattle.quest.subtasks as Array<{ id?: string; text: string }> | undefined)?.find(s => (s.id || '') === subtaskId);
            if (subtask) {
                new Notice(`Subtask completed: ${subtask.text}`);
            }
            
            // Check if battle is won
            if (updatedBattle.isDefeated) {
                new Notice(`🎉 Victory! ${updatedBattle.bossName} defeated!`);
                // Award rewards
                if (playerData) {
                    playerData.xp += updatedBattle.rewards.xp;
                    playerData.coins += updatedBattle.rewards.coins;
                    // Save player data
                    // playerStore.setPlayerData(playerData);
                    // Note: setPlayerData method may not exist, skipping for now
                }
            }
        } catch (error) {
            window.console.error('Failed to complete subtask:', error);
            new Notice('Failed to complete subtask. Please try again.');
        }
    }, [unifiedBattle, playerData, playerBattleStats, questTracker]);

    const closeUnifiedBattle = useCallback(() => {
        setShowUnifiedBattle(false);
        setUnifiedBattle(null);
        setActiveTab('selection');
    }, []);

    const [availableMoves, setAvailableMoves] = useState<StatBasedMove[]>([]);
    const [moveCalculations, setMoveCalculations] = useState<{[moveId: string]: { basePower: number; statBonus: number; totalPower: number; cpCost?: number }}>({});
    const [skillGains, setSkillGains] = useState<{[skillName: string]: number}>({});
    
    // Pokemon-style battle interface state
    const [isMinimized, setIsMinimized] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(7200); // 2 hours
    const [currentPhase, setCurrentPhase] = useState(1);
    const [lastActivity, setLastActivity] = useState(Date.now());
    
    // Real-time tracking state
    const [currentTime, setCurrentTime] = useState(new Date());
    const [battleStartTime] = useState(new Date());
    const [battleDuration, setBattleDuration] = useState(0);
    
    // Boss creation state
    const [creationStep, setCreationStep] = useState<'templates' | 'basic' | 'quests' | 'advanced' | 'preview'>('templates');

    // Custom boss creation state  
    const [customBoss, setCustomBoss] = useState({
        name: '',
        title: '',
        description: '',
        icon: '👹',
        customImage: '',
        imageType: 'emoji' as 'emoji' | 'image',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        difficulty: 1,
        category: 'single-session' as BossCategory,
        theme: '',
        questId: '',
        
        // Real-time tracking fields
        createdAt: new Date(),
        estimatedDuration: '30 minutes',
        deadline: null as Date | null,
        enableTimer: false,
        timeLimit: 7200, // 2 hours in seconds
        
        // Skill integration
        linkedSkill: '',
        skillRequirements: [] as string[],
        
        // Quest integration
        linkedQuests: [] as Array<{
            questId: string;
            text: string;
            filePath: string;
            completed: boolean;
            damageValue: number;
            xp: number;
            cp: number;
            coins: number;
        }>,
        questTags: [] as string[], // Custom tags for this boss
        
        customSubtasks: [
            { text: 'Complete main objective', completed: false },
            { text: 'Review and finalize', completed: false }
        ],
        stats: {
            maxHP: 100,
            attack: 10,
            defense: 5,
            speed: 8,
            specialAttack: 12,
            specialDefense: 8
        },
        phases: [
            {
                name: 'Initial Phase',
                description: 'The boss awakens',
                hpThreshold: 100,
                appearance: '👹'
            }
        ],
        rewards: {
            xp: 50,
            cp: 10,
            coins: 25
        },
        lore: '',
        weaknesses: [''],
        resistances: [''],
        specialAbilities: ['']
    });
    
    // Image upload state
    const [imagePreview, setImagePreview] = useState<string>('');
    const [savedBossTemplates, setSavedBossTemplates] = useState<Boss[]>([]);

    // Enhanced boss creation state
    const [availableSkills, setAvailableSkills] = useState<SkillMetadata[]>([]);
    const [availableQuests, setAvailableQuests] = useState<Array<{
        questId: string;
        text: string;
        filePath: string;
        completed: boolean;
        damageValue: number;
        xp: number;
        cp: number;
        coins: number;
        tags: string[];
    }>>([]);
    const [questSearchFilter, setQuestSearchFilter] = useState('');
    const [selectedSkill, setSelectedSkill] = useState<SkillMetadata | null>(null);
    
    // Quest creation state
    const [showQuestCreation, setShowQuestCreation] = useState(false);
    const [newQuestData, setNewQuestData] = useState({
        title: '',
        xp: 10,
        cp: 5,
        coins: 1,
        damageValue: 5,
        description: ''
    });

    // Removed old useEffect and duplicate function declarations - now using optimized versions above

    // Enhanced boss ID generation for better quest linking
    const generateBossId = (name: string, projectType?: string): string => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);
        const projectPrefix = projectType ? `${projectType.toLowerCase()}-` : '';
        
        return `boss-${projectPrefix}${sanitizedName}-${timestamp}-${randomId}`;
    };
    
    // Generate boss-specific tag (legacy support)
    const generateBossTag = (bossName: string, projectType?: string): string => {
        return generateBossId(bossName, projectType);
    };

    // Create new quest in Gamified-Boss-Quests.md
    const createNewQuest = async () => {
        try {
            if (!newQuestData.title.trim()) {
                new Notice('Please enter a quest title');
                return;
            }

            const bossTag = generateBossTag(customBoss.name || 'untitled');
            const questFilePath = 'Gamified-Boss-Quests.md';
            
            // Create quest text with proper formatting
            const questText = `- [ ] ${newQuestData.title} ⭐${newQuestData.xp} 🪙${newQuestData.cp} ${currencyDisplay.getCurrencySymbol()}${newQuestData.coins} #gamified-task #gamified-boss #${bossTag}`;
            
            // Check if file exists
            let existingContent = '';
            try {
                const file = plugin.app.vault.getAbstractFileByPath(questFilePath);
                if (file && file instanceof TFile) {
                    existingContent = await plugin.app.vault.read(file);
                }
        } catch (error) {
                // File doesn't exist, will create new
            }

            // Add header if file is new or empty
            let newContent = existingContent;
            if (!existingContent.trim()) {
                newContent = `# Gamified Boss Quests\n\nThis file contains quests created for boss battles.\n\n`;
            }

            // Add the new quest
            if (!newContent.endsWith('\n')) {
                newContent += '\n';
            }
            newContent += questText + '\n';

            // Write to file
            await plugin.app.vault.adapter.write(questFilePath, newContent);

            // Add to available quests
            const newQuest = {
                questId: `${questFilePath}:new:${Date.now()}`,
                text: questText,
                filePath: questFilePath,
                completed: false,
                damageValue: newQuestData.damageValue,
                xp: newQuestData.xp,
                cp: newQuestData.cp,
                coins: newQuestData.coins,
                tags: ['gamified-task', 'gamified-boss', bossTag]
            };

            setAvailableQuests(prev => [...prev, newQuest]);

            // Update boss quest tags
            setCustomBoss(prev => ({
                ...prev,
                questTags: [...prev.questTags, bossTag]
            }));

            // Reset form and close creation modal
            setNewQuestData({
                title: '',
                xp: 10,
                cp: 5,
                coins: 1,
                damageValue: 5,
                description: ''
            });
            setShowQuestCreation(false);

            new Notice(`Quest "${newQuestData.title}" created successfully with tag #${bossTag}`);
            
            // Reload quests to get the latest from file
            loadAvailableQuests();
            
        } catch (error) {
            console.error('Failed to create quest:', error);
            new Notice('Failed to create quest');
        }
    };

    // Auto-linking: Add boss-specific tags to selected quests
    const applyBossTagsToQuests = async () => {
        if (customBoss.linkedQuests.length === 0 || !customBoss.name.trim()) {
            return;
        }

        try {
            const bossTag = generateBossTag(customBoss.name);
            
            // Group quests by file
            const questsByFile = customBoss.linkedQuests.reduce((acc, quest) => {
                if (!acc[quest.filePath]) {
                    acc[quest.filePath] = [];
                }
                acc[quest.filePath].push(quest);
                return acc;
            }, {} as Record<string, typeof customBoss.linkedQuests>);

            // Process each file
            for (const [filePath, quests] of Object.entries(questsByFile)) {
                try {
                    const file = plugin.app.vault.getAbstractFileByPath(filePath);
                    if (file && file instanceof TFile) {
                        let content = await plugin.app.vault.read(file);
                        
                        // Add boss tag to each quest in this file
                        for (const quest of quests) {
                            const existingTags = quest.text.match(/#[\w-]+/g) || [];
                            
                            // Check if boss tag already exists
                            if (!existingTags.some(tag => tag.includes('boss-'))) {
                                const newQuestText = quest.text + ` #${bossTag}`;
                                content = content.replace(quest.text, newQuestText);
                            }
                        }
                        
                        // Write updated content back to file
                        await plugin.app.vault.adapter.write(filePath, content);
                    }
                } catch (error) {
                    console.error(`Failed to update file ${filePath}:`, error);
                }
            }

            // Update boss quest tags
            setCustomBoss(prev => ({
                ...prev,
                questTags: [...prev.questTags, bossTag]
            }));

            new Notice(`Boss tag #${bossTag} applied to ${customBoss.linkedQuests.length} quests`);
            
            // Reload quests to get updated tags
            loadAvailableQuests();
            
        } catch (error) {
            console.error('Failed to apply boss tags:', error);
            new Notice('Failed to apply boss tags to quests');
        }
    };

    // Removed duplicate initializeTaskIntegration - using optimized version above

    // Load linked tasks for current boss
    const loadLinkedTasksForBoss = (bossId: string) => {
        if (taskIntegrationService) {
            const tasks = taskIntegrationService.getLinkedTasks(bossId);
            setLinkedTasks(tasks);
        }
    };

    // Handle task completion and deal damage to boss
    // Enhanced refresh function for gamified-boss-quest files
    // Enhanced refresh function for boss-specific quest files
    const refreshBossQuests = async () => {
        if (!selectedBoss) return;
        
        try {
            const bossId = selectedBoss.boss.id;
            const currentTime = new Date().toISOString();
            setBattleLog(prev => [...prev.slice(-2), `🔄 [${currentTime.slice(11, 19)}] Scanning for ${bossId} quests...`]);
            
            // Look for files with boss-specific patterns
            const questFiles = plugin.app.vault.getMarkdownFiles().filter(file =>
                file.name.toLowerCase().includes('gamified-boss-quest') ||
                file.name.toLowerCase().includes('boss-quest') ||
                file.name.toLowerCase().includes(bossId.toLowerCase()) ||
                (file.name.toLowerCase().includes('gamified') && file.name.toLowerCase().includes('boss'))
            );

            let newQuestsFound = 0;
            let bossSpecificTasks = 0;
            
            // Clear existing tasks for this boss
            setLinkedTasks(prev => prev.filter(task => !task.tags?.includes(bossId)));
            
            for (const file of questFiles) {
                try {
                    const content = await plugin.app.vault.read(file);
                    const lines = content.split('\n');
                    
                    lines.forEach((line, index) => {
                        const taskMatch = line.match(/^[\s]*[-*+]\s+\[([\sx])\]\s+(.+)/);
                        if (taskMatch) {
                            const taskText = taskMatch[2];
                            const isCompleted = taskMatch[1] === 'x';
                            
                            // Check for boss-specific tags - prioritize boss ID over generic tags
                            const isBossSpecific = taskText.includes(`#${bossId}`) || 
                                                 taskText.includes(`#boss-${bossId}`) ||
                                                 taskText.includes(`#${bossId.replace('boss_', '')}`);
                            
                            const isGenericBossTask = taskText.includes('#gamified-task') && 
                                                    taskText.includes('#gamified-boss');
                            
                            if (isBossSpecific || isGenericBossTask) {
                                // Extract rewards
                                const xpMatch = taskText.match(/⭐(\d+)/);
                                const cpMatch = taskText.match(/🪙(\d+)/);
                                const coinsMatch = taskText.match(/✨(\d+)/);
                                
                                const xp = xpMatch ? parseInt(xpMatch[1]) : 10;
                                const cp = cpMatch ? parseInt(cpMatch[1]) : 5;
                                const coins = coinsMatch ? parseInt(coinsMatch[1]) : Math.round(xp * 0.1);
                                const damageValue = Math.max(5, Math.round(xp * 0.5));

                                // Create task ID with timestamp
                                const taskId = `${file.path}:${index}:${Date.now()}`;
                                const existingTask = linkedTasks.find(t => t.text === taskText && t.filePath === file.path);
                                
                                if (!existingTask) {
                                    const extractedTags = (taskText.match(/#[\w-]+/g) || []).map(tag => tag.substring(1));
                                    
                                    const newTask = {
                                        id: taskId,
                                        text: taskText,
                                        filePath: file.path,
                                        completed: isCompleted,
                                        damageValue,
                                        xp,
                                        cp,
                                        coins,
                                        tags: [...extractedTags, bossId], // Always include current boss ID
                                        taskType: 'boss-quest' as const,
                                        priority: isBossSpecific ? 'high' as const : 'medium' as const,
                                        createdAt: new Date(),
                                        lineNumber: index + 1
                                    };
                                    
                                    setLinkedTasks(prev => [...prev, newTask]);
                                    newQuestsFound++;
                                    
                                    if (isBossSpecific) {
                                        bossSpecificTasks++;
                                    }
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error(`Error reading ${file.path}:`, error);
                }
            }
            
            // Add hardcoded training quests for demo boss
            if (bossId === 'demo-boss-test-001') {
                const trainingQuests = getDemoTrainingQuests();
                trainingQuests.forEach(quest => {
                    const existingTask = linkedTasks.find(t => t.id === quest.id);
                    if (!existingTask) {
                        setLinkedTasks(prev => [...prev, quest]);
                        newQuestsFound++;
                        bossSpecificTasks++;
                    }
                });
            }
            
            const endTime = new Date().toISOString();
                    setBattleLog(prev => [...prev.slice(-2), 
                `✨ [${endTime.slice(11, 19)}] Found ${newQuestsFound} quests (${bossSpecificTasks} boss-specific) for ${selectedBoss.boss.name}`
            ]);
        } catch (error) {
            console.error('Failed to refresh boss quests:', error);
            const errorTime = new Date().toISOString();
            setBattleLog(prev => [...prev.slice(-2), `❌ [${errorTime.slice(11, 19)}] Failed to refresh boss quests`]);
        }
    };

    // Combo system functions
    const updateComboChain = (taskType: string) => {
        const now = Date.now();
        const timeSinceLastTask = now - lastTaskCompletionTime;
        
        // Reset combo if too much time has passed (30 seconds)
        if (timeSinceLastTask > 30000) {
            setComboChain([taskType]);
            setComboMultiplier(1);
        } else {
            // Add to combo chain
            setComboChain(prev => [...prev.slice(-4), taskType]); // Keep last 5 tasks
            
            // Calculate combo multiplier
            const uniqueTypes = new Set([...comboChain, taskType]).size;
            const comboLength = Math.min(comboChain.length + 1, 5);
            
            // Bonus for variety and length
            const varietyBonus = uniqueTypes >= 3 ? 1.5 : 1;
            const lengthBonus = 1 + (comboLength * 0.2);
            
            setComboMultiplier(varietyBonus * lengthBonus);
        }
        
        setLastTaskCompletionTime(now);
        setComboTimer(30); // 30 second combo timer
    };

    // Combo timer countdown
    React.useEffect(() => {
        if (comboTimer > 0) {
            const interval = setInterval(() => {
                setComboTimer(prev => {
                    if (prev <= 1) {
                        setComboChain([]);
                        setComboMultiplier(1);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            
            return () => clearInterval(interval);
        }
    }, [comboTimer]);

    // Enhanced task completion with combo system
    const handleTaskCompletion = async (taskId: string) => {
        if (!selectedBoss) return;

        const task = linkedTasks.find(t => t.id === taskId);
        if (!task || task.completed) return;

        try {
            // Mark task as completed in the file
            const file = plugin.app.vault.getAbstractFileByPath(task.filePath);
            if (file instanceof TFile) {
                const content = await plugin.app.vault.read(file);
                const lines = content.split('\n');
                
                // Find and update the task line
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes(task.text)) {
                        lines[i] = lines[i].replace(/\[[\s]\]/, '[x]');
                        break;
                    }
                }
                
                await plugin.app.vault.modify(file, lines.join('\n'));
            }

            // Update combo chain
            updateComboChain(task.taskType || 'general');

            // Calculate damage with combo multiplier
            const baseDamage = task.damageValue || 10;
            const comboBonus = Math.floor(baseDamage * (comboMultiplier - 1));
            const totalDamage = baseDamage + comboBonus;

            // Update local state
            setLinkedTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, completed: true } : t
            ));

            // Deal damage to boss with quest completion logic
            // Check if this will be the last quest completed
            const remainingTasks = linkedTasks.filter(t => 
                t.tags?.includes(selectedBoss.boss.id) && !t.completed && t.id !== taskId
            );
            const isLastQuest = remainingTasks.length === 0;
            
            // All bosses (including training dummy): only the LAST quest can deliver the killing blow
            if (isLastQuest && selectedBoss.progress.currentHP === 1) {
                // Final blow - boss defeated!
                selectedBoss.progress.currentHP = 0;
            } else {
                // Regular quest damage - cannot go below 1 HP
                selectedBoss.progress.currentHP = Math.max(1, selectedBoss.progress.currentHP - totalDamage);
            }
            
            // Update battle log with combo info and special messages
            let logMessage = `⚔️ Task completed: "${task.text.substring(0, 30)}..." dealt ${totalDamage} damage!`;
            if (comboMultiplier > 1) {
                logMessage += ` 🔥 COMBO x${comboMultiplier.toFixed(1)} (+${comboBonus} bonus damage!)`;
            }
            
            // Add special messages for boss state (applies to all bosses)
            if (isLastQuest && selectedBoss.progress.currentHP === 0) {
                logMessage += ` 💀 FINAL BLOW DELIVERED! Boss defeated!`;
            } else if (selectedBoss.progress.currentHP === 1) {
                const remaining = remainingTasks.length + (isLastQuest ? 0 : 1);
                logMessage += ` ⚡ Boss critically weakened! ${remaining} quest(s) remaining for victory!`;
            }
            
            setBattleLog(prev => [...prev.slice(-2), logMessage]);

            // Award rewards with combo bonus (only for real bosses, not training)
            const isTrainingBoss = selectedBoss.boss.id === 'demo-boss-test-001' || selectedBoss.boss.id === 'skill-demo-boss-001';
            
            if (!isTrainingBoss && playerData?.stats) {
                const comboXPBonus = Math.floor((task.xp || 10) * (comboMultiplier - 1));
                const comboCPBonus = Math.floor((task.cp || 5) * (comboMultiplier - 1));
                
                playerData.stats.xp = (playerData.stats.xp || 0) + (task.xp || 10) + comboXPBonus;
                playerData.stats.cp = (playerData.stats.cp || 0) + (task.cp || 5) + comboCPBonus;
                playerData.stats.coins = (playerData.stats.coins || 0) + (task.coins || 1);
                setPlayerData({...playerData});
            } else if (isTrainingBoss) {
                setBattleLog(prev => [...prev.slice(-3), "📚 Training task completed - no rewards from practice!"]);
            }

            // Check for boss defeat
            if (selectedBoss.progress.currentHP <= 0) {
                
                if (isTrainingBoss) {
                    setBattleLog(prev => [...prev, "🎉 TRAINING COMPLETED! No rewards from dummy - ready for real battles!"]);
                } else {
                    setBattleLog(prev => [...prev, "🎉 BOSS DEFEATED! All tasks completed!"]);
                    
                    // Award victory rewards (only for real bosses)
                    if (selectedBoss.boss.rewards && playerData?.stats) {
                        playerData.stats.xp = (playerData.stats.xp || 0) + selectedBoss.boss.rewards.xp;
                        playerData.stats.coins = (playerData.stats.coins || 0) + selectedBoss.boss.rewards.coins;
                        setPlayerData({...playerData});
                        
                        if (bossManagementService) {
                            bossManagementService.handleBossDefeat(selectedBoss.boss.id);
                            await loadAvailableBosses();
                        }
                    }
                }
                
                setLastActivity(Date.now());
            }

        } catch (error) {
            console.error('Failed to complete task:', error);
            setBattleLog(prev => [...prev.slice(-2), "❌ Failed to complete task"]);
        }
    };

    // Handle image upload
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                new Notice('Image file must be less than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target?.result as string;
                setCustomBoss(prev => ({ 
                    ...prev, 
                    customImage: imageData,
                    imageType: 'image'
                }));
                setImagePreview(imageData);
            };
            reader.readAsDataURL(file);
        }
    };

    // Add subtask to custom boss
    const addCustomSubtask = () => {
        setCustomBoss(prev => ({
            ...prev,
            customSubtasks: [...prev.customSubtasks, { text: '', completed: false }]
        }));
    };

    // Remove subtask from custom boss
    const removeCustomSubtask = (index: number) => {
        setCustomBoss(prev => ({
            ...prev,
            customSubtasks: prev.customSubtasks.filter((_, i) => i !== index)
        }));
    };

    // Update subtask text
    const updateSubtaskText = (index: number, text: string) => {
        setCustomBoss(prev => ({
            ...prev,
            customSubtasks: prev.customSubtasks.map((task, i) => 
                i === index ? { ...task, text } : task
            )
        }));
    };

    // Save boss template
    const saveBossTemplate = () => {
        if (!customBoss.name.trim()) {
            new Notice('Please enter a boss name');
            return;
        }
        
        const newTemplate: Boss = {
            id: `custom-${Date.now()}`,
            name: customBoss.name,
            title: customBoss.title || 'Custom Boss',
            description: customBoss.description,
            category: customBoss.category,
            type: 'boss',
            visuals: {
                avatar: customBoss.imageType === 'image' ? '' : customBoss.icon,
                customImage: customBoss.imageType === 'image' ? customBoss.customImage : undefined,
                background: customBoss.background,
                phaseAvatars: [customBoss.icon, customBoss.icon, customBoss.icon],
                attackAnimations: ['✨', '💥', '⚡'],
                defeatAnimation: '💀',
                victoryAnimation: '🎉'
            },
            dialogue: {
                intro: ['A custom boss appears!'],
                taunts: ['You cannot defeat me!'],
                phaseTransitions: ['Entering next phase...'],
                lowHP: ['I am weakened...'],
                victory: ['You have proven worthy...'],
                defeat: ['Try again, challenger.'],
                counterAttack: ['Take this!'],
                specialMove: ['Behold my power!']
            },
            stats: {
                ...customBoss.stats,
                currentHP: customBoss.stats.maxHP
            },
            questId: customBoss.questId || 'custom-quest',
            questTitle: customBoss.name + ' Challenge',
            estimatedDuration: '30 minutes',
            currentPhase: 1,
            isDefeated: false,
            createdAt: new Date(),
            difficulty: customBoss.difficulty <= 3 ? 'easy' : customBoss.difficulty <= 6 ? 'medium' : customBoss.difficulty <= 8 ? 'hard' : 'legendary',
            theme: customBoss.theme || 'custom',
            lore: customBoss.lore,
            moves: [
                {
                    name: 'Custom Attack',
                    description: 'A powerful attack',
                    power: 10,
                    accuracy: 90,
                    type: 'attack'
                }
            ],
            phases: customBoss.phases.map((phase, index) => ({
                phaseNumber: index + 1,
                phaseColor: '#667eea',
                phaseTransition: phase.description,
                bossDialogue: [`Phase ${index + 1} begins!`],
                name: phase.name,
                description: phase.description,
                hpThreshold: phase.hpThreshold,
                moves: ['custom-attack'],
                appearance: phase.appearance
            })),
            weaknesses: customBoss.weaknesses.filter(w => w.trim()),
            resistances: customBoss.resistances.filter(r => r.trim()),
            specialAbilities: customBoss.specialAbilities.filter(a => a.trim()),
            rewards: {
                xp: customBoss.rewards.xp,
                cp: customBoss.rewards.cp,
                coins: customBoss.rewards.coins,
                materials: [],
                lifeItems: [],
                achievements: [],
                titles: [],
                bossMaterials: [],
                unlockables: []
            }
        };

        const updatedTemplates = [...savedBossTemplates, newTemplate];
        setSavedBossTemplates(updatedTemplates);
        
        // Save to local storage
        try {
            localStorage.setItem('gamified-boss-templates', JSON.stringify(updatedTemplates));
            // Also create an active boss that appears in boss selection
            const activeBossCreated = saveAndActivateBoss(customBoss);
            if (activeBossCreated) {
                new Notice(`Boss template "${customBoss.name}" saved and activated successfully!`);
                // Refresh the available bosses list
                loadAvailableBosses();
            } else {
                new Notice(`Boss template "${customBoss.name}" saved as template only`);
            }
        } catch (error) {
            console.error('Failed to save boss template:', error);
            new Notice('Failed to save boss template');
        }
    };

    // Load boss template
    const loadBossTemplate = (template: Boss) => {
        setCustomBoss({
            name: template.name,
            title: template.title || '',
            description: template.description,
            icon: template.visuals?.avatar || '👹',
            customImage: template.visuals?.customImage || '',
            imageType: template.visuals?.customImage ? 'image' : 'emoji',
            background: template.visuals?.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            difficulty: template.difficulty === 'easy' ? 3 : template.difficulty === 'medium' ? 6 : template.difficulty === 'hard' ? 8 : 10,
            category: template.category || 'single-session',
            theme: template.theme || '',
            questId: template.questId || '',
            
            // Real-time tracking fields
            createdAt: new Date(),
            estimatedDuration: '30 minutes',
            deadline: null as Date | null,
            enableTimer: false,
            timeLimit: 7200, // 2 hours in seconds
            
            // Skill integration
            linkedSkill: '',
            skillRequirements: [] as string[],
            
            // Quest integration
            linkedQuests: [] as Array<{
                questId: string;
                text: string;
                filePath: string;
                completed: boolean;
                damageValue: number;
                xp: number;
                cp: number;
                coins: number;
            }>,
            questTags: [] as string[], // Custom tags for this boss
            
            customSubtasks: [
                { text: 'Complete main objective', completed: false },
                { text: 'Review and finalize', completed: false }
            ],
            stats: template.stats,
            phases: template.phases?.map(phase => ({
                name: phase.name,
                description: phase.description,
                hpThreshold: phase.hpThreshold,
                appearance: phase.appearance
            })) || [{ name: 'Initial Phase', description: 'The boss awakens', hpThreshold: 100, appearance: '👹' }],
            rewards: {
                xp: template.rewards?.xp || 50,
                cp: template.rewards?.cp || 10,
                coins: template.rewards?.coins || 25
            },
            lore: template.lore || '',
            weaknesses: template.weaknesses || [''],
            resistances: template.resistances || [''],
            specialAbilities: template.specialAbilities || ['']
        });
        
        if (template.visuals?.customImage) {
            setImagePreview(template.visuals.customImage);
        }
        
        new Notice(`Boss template "${template.name}" loaded!`);
    };

    // Removed duplicate loadPlayerData - using optimized version above

    const createDemoBoss = (): BossData => {
        const demoBoss: Boss = {
            id: 'demo-boss-test-001',
            name: 'Training Dummy Dragon',
            title: 'The Practice Beast',
            description: 'A friendly training dragon perfect for practicing boss battles. No penalties, just pure learning!',
            category: 'single-session',
            type: 'mini-boss',
            visuals: {
                avatar: '🐲',
                background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
                phaseAvatars: ['🐲', '🐉', '🔥'],
                attackAnimations: ['✨', '💥', '⚡'],
                defeatAnimation: '💀',
                victoryAnimation: '🎉'
            },
            dialogue: {
                intro: ['Welcome to the training grounds!', 'Let us practice together.'],
                taunts: ['You can do better than that!', 'Try again, young one.'],
                phaseTransitions: ['Well done!', 'Moving to the next phase.'],
                lowHP: ['Almost finished!', 'One more push!'],
                victory: ['Excellent work!', 'You are ready for real challenges.'],
                defeat: ['Don\'t worry, try again!', 'Practice makes perfect.'],
                counterAttack: ['Good attempt!', 'Nice try!'],
                specialMove: ['Watch this technique!', 'Here\'s something special!']
            },
            stats: {
                maxHP: 100,
                currentHP: 100,
                attack: 10,
                defense: 5,
                speed: 8,
                specialAttack: 12,
                specialDefense: 8
            },
            questId: 'demo-quest-001',
            questTitle: 'Training Ground Practice',
            estimatedDuration: '5 minutes',
            currentPhase: 1,
            isDefeated: false,
            createdAt: new Date(),
            difficulty: 'easy',
            theme: 'training',
            lore: 'A retired dragon that helps train new adventurers. Practice all you want - this friendly beast never gets tired!',
            moves: [
                {
                    name: 'Gentle Bite',
                    description: 'A soft nibble that barely tickles',
                    power: 5,
                    accuracy: 100,
                    type: 'attack'
                },
                {
                    name: 'Encouraging Roar',
                    description: 'A motivational roar that boosts confidence',
                    power: 0,
                    accuracy: 100,
                    type: 'status'
                }
            ],
            phases: [
                {
                    phaseNumber: 1,
                    phaseColor: '#4ade80',
                    phaseTransition: 'The dragon stretches and awakens',
                    bossDialogue: ['Ah, a new student arrives...', 'Let us begin with the basics.'],
                    name: 'Warm-up Phase',
                    description: 'The dragon stretches and yawns',
                    hpThreshold: 100,
                    moves: ['gentle-bite'],
                    appearance: '🐲'
                },
                {
                    phaseNumber: 2,
                    phaseColor: '#3b82f6',
                    phaseTransition: 'The dragon sits up attentively',
                    bossDialogue: ['You show promise!', 'Now we practice more seriously.'],
                    name: 'Getting Serious',
                    description: 'The dragon sits up and pays attention',
                    hpThreshold: 50,
                    moves: ['gentle-bite', 'encouraging-roar'],
                    appearance: '🐉'
                },
                {
                    phaseNumber: 3,
                    phaseColor: '#ef4444',
                    phaseTransition: 'The dragon nods encouragingly',
                    bossDialogue: ['Excellent work!', 'You are ready for real challenges.'],
                    name: 'Final Practice',
                    description: 'The dragon gives an encouraging nod',
                    hpThreshold: 20,
                    moves: ['encouraging-roar'],
                    appearance: '🔥'
                }
            ],
            weaknesses: ['productivity', 'practice', 'determination'],
            resistances: ['procrastination', 'fear'],
            specialAbilities: ['Training Mode', 'Infinite Respawn', 'No Rewards'],
            rewards: { 
                xp: 0, 
                cp: 0, 
                coins: 0, 
                materials: [], 
                lifeItems: [],
                achievements: [], 
                titles: [],
                bossMaterials: [], 
                unlockables: [] 
            }
        };

        const demoQuest: Quest = {
            id: 'demo-quest-001',
            title: 'Training Ground Practice',
            className: 'demo-training',
            stats: ['mindfulness', 'intelligence', 'creativity', 'strength'],
            xp: 0,
            cp: 0,
            coins: 0,
            description: 'Practice boss battles safely with no consequences',
            subtasks: [
                { text: 'Try using Focus ability (⚡)', completed: false },
                { text: 'Test Analyze ability (🧠)', completed: false },
                { text: 'Practice Create ability (❤️)', completed: false },
                { text: 'Use Push ability (💪)', completed: false }
            ],
            completed: false,
            status: 'active',
            tags: ['demo', 'training']
        };

        const progress: BossProgress = {
            bossId: demoBoss.id,
            questId: demoQuest.id,
            currentHP: demoBoss.stats.maxHP,
            maxHP: demoBoss.stats.maxHP,
            phase: 1,
            lastUpdated: new Date(),
            isActive: true,
            timeSpent: 0,
            attempts: 0,
            bestDamage: 0,
            phaseProgress: [100, 0, 0],
            lastPhaseChange: new Date()
        };

        return { boss: demoBoss, quest: demoQuest, progress };
    };

    // Function to create 5 specific training quests for demo boss
    const getDemoTrainingQuests = (): LinkedTask[] => {
        return [
            {
                id: 'demo-quest-001',
                text: '🎯 Master the Interface - Learn boss battle basics #boss-demo-boss-test-001 #training',
                filePath: 'internal://demo-training',
                completed: false,
                damageValue: 15,
                xp: 0,
                cp: 0,
                coins: 0,
                tags: ['boss-demo-boss-test-001', 'training', 'interface'],
                taskType: 'boss-quest' as const,
                priority: 'high' as const,
                createdAt: new Date(),
                lineNumber: 1
            },
            {
                id: 'demo-quest-002',
                text: '⚔️ Combat Basics - Practice using different abilities #boss-demo-boss-test-001 #training',
                filePath: 'internal://demo-training',
                completed: false,
                damageValue: 20,
                xp: 0,
                cp: 0,
                coins: 0,
                tags: ['boss-demo-boss-test-001', 'training', 'combat'],
                taskType: 'boss-quest' as const,
                priority: 'high' as const,
                createdAt: new Date(),
                lineNumber: 2
            },
            {
                id: 'demo-quest-003',
                text: '🧠 Strategy & Analysis - Learn tactical thinking #boss-demo-boss-test-001 #training',
                filePath: 'internal://demo-training',
                completed: false,
                damageValue: 18,
                xp: 0,
                cp: 0,
                coins: 0,
                tags: ['boss-demo-boss-test-001', 'training', 'strategy'],
                taskType: 'boss-quest' as const,
                priority: 'high' as const,
                createdAt: new Date(),
                lineNumber: 3
            },
            {
                id: 'demo-quest-004',
                text: '🔄 Battle Rhythm - Develop consistent combat flow #boss-demo-boss-test-001 #training',
                filePath: 'internal://demo-training',
                completed: false,
                damageValue: 22,
                xp: 0,
                cp: 0,
                coins: 0,
                tags: ['boss-demo-boss-test-001', 'training', 'rhythm'],
                taskType: 'boss-quest' as const,
                priority: 'high' as const,
                createdAt: new Date(),
                lineNumber: 4
            },
            {
                id: 'demo-quest-005',
                text: '🏆 Training Graduation - Complete training and prepare for real battles #boss-demo-boss-test-001 #training',
                filePath: 'internal://demo-training',
                completed: false,
                damageValue: 25,
                xp: 0,
                cp: 0,
                coins: 0,
                tags: ['boss-demo-boss-test-001', 'training', 'graduation'],
                taskType: 'boss-quest' as const,
                priority: 'high' as const,
                createdAt: new Date(),
                lineNumber: 5
            }
        ];
    };

    // Create demo quest for testing
    const createDemoQuest = (): Quest => {
        return {
            id: 'demo-quest-001',
            title: 'Training Ground Practice',
            className: 'demo-training',
            stats: ['mindfulness', 'intelligence', 'creativity', 'strength'],
            xp: 0,
            cp: 0,
            coins: 0,
            description: 'Practice boss battles safely with no consequences',
            subtasks: [
                { text: 'Try using Focus ability (⚡)', completed: false },
                { text: 'Test Analyze ability (🧠)', completed: false },
                { text: 'Practice Create ability (❤️)', completed: false },
                { text: 'Use Push ability (💪)', completed: false }
            ],
            completed: false,
            status: 'active',
            tags: ['demo', 'training']
        };
    };

    // Create a skill-based demo boss for testing the new system
    const createSkillBasedDemoBoss = async (): Promise<BossData> => {
        try {
            const skillBasedBoss = await ProjectBossFactory.createProjectBoss(
                plugin.app.vault,
                'fitness', // Project type
                'Demo Training', // Skill name
                7, // Duration (7 days)
                skillStats // Player stats
            );
            
            // Override for demo purposes
            skillBasedBoss.id = 'skill-demo-boss-001';
            skillBasedBoss.name = 'Skill Training Master';
            skillBasedBoss.title = '(SKILL DEMO)';
            skillBasedBoss.description = 'Test your skill-based moves and see them scale with your stats!';
            skillBasedBoss.stats.maxHP = 150;
            skillBasedBoss.stats.currentHP = 150;
            
            // Set as current skill-based boss
            setSkillBasedBoss(skillBasedBoss);
            
            // Initialize available moves
            const moves = SkillBasedBattleEngine.getAvailableMoves(skillBasedBoss, playerBattleStats);
            setAvailableMoves(moves);
            
            // Calculate move power
            const calculations: {[moveId: string]: { basePower: number; statBonus: number; totalPower: number; cpCost?: number }} = {};
            moves.forEach(move => {
                const calculation = SkillBasedBattleEngine.calculateStatBasedDamage(move, playerBattleStats, skillBasedBoss.stats);
                calculations[move.name] = calculation;
            });
            setMoveCalculations(calculations);
            
            const demoBoss: Boss = skillBasedBoss as Boss;
            
            return {
                boss: demoBoss,
                quest: createDemoQuest(),
                progress: {
                    bossId: demoBoss.id,
                    questId: demoBoss.questId,
                    currentHP: demoBoss.stats.maxHP,
                    maxHP: demoBoss.stats.maxHP,
                    phase: 1,
                    lastUpdated: new Date(),
                    isActive: true,
                    timeSpent: 0,
                    attempts: 1,
                    bestDamage: 0,
                    phaseProgress: [0],
                    lastPhaseChange: new Date()
                }
            };
        } catch (error) {
            console.error('Failed to create skill-based demo boss:', error);
            return createDemoBoss(); // Fallback to regular demo boss
        }
    };

    // Removed duplicate loadAvailableBosses - using optimized version above

    const handleBossSelect = async (bossData: BossData) => {
        setSelectedBoss(bossData);
        setCurrentScreen('battle');
        
        // Load linked tasks for this boss
        loadLinkedTasksForBoss(bossData.boss.id);
        
        // Auto-link tasks if no linked tasks exist yet
        if (taskIntegrationService) {
            const existingTasks = taskIntegrationService.getLinkedTasks(bossData.boss.id);
            if (existingTasks.length === 0) {
                taskIntegrationService.autoLinkTasksToBoss(bossData.boss)
                    .then(linkedTaskIds => {
                        if (linkedTaskIds.length > 0) {
                            console.log(`Auto-linked ${linkedTaskIds.length} tasks to boss ${bossData.boss.name}`);
                            loadLinkedTasksForBoss(bossData.boss.id);
                        }
                    })
                    .catch(error => {
                        console.error('Failed to auto-link tasks:', error);
                    });
            }
        }

        // 🎯 Enhanced Battle Preparation
        try {
            console.log("🎮 Preparing enhanced boss battle...");
            const preparation = await enhancedBattleIntegration.prepareBossBattle(
                bossData.boss, 
                playerBattleStats
            );
            setBattlePreparation(preparation);
            
            // Log enhanced battle info
            if (preparation.triggeredEvents.length > 0) {
                setBattleLog(prev => [...prev.slice(-8), 
                    `🎲 ${preparation.triggeredEvents.length} dynamic event(s) detected!`
                ]);
            }
            
            if (preparation.taskDiscoveryResult.newTasks.length > 0) {
                setBattleLog(prev => [...prev.slice(-8), 
                    `📋 ${preparation.taskDiscoveryResult.newTasks.length} new task(s) discovered!`
                ]);
            }

            // Show equipment effects
            const equippedCount = Array.from(equippedGear.keys()).length;
            if (equippedCount > 0) {
                setBattleLog(prev => [...prev.slice(-8), 
                    `⚔️ ${equippedCount} productivity tool(s) equipped!`
                ]);
            }
        } catch (error) {
            console.error("Failed to prepare enhanced battle:", error);
            // Continue with standard battle if enhanced preparation fails
        }
        
        // Reset battle state for new boss
        const isDemoBoss = bossData.boss.id === 'demo-boss-test-001' || bossData.boss.id === 'skill-demo-boss-001';
        setBattleLog([
            `🐲 ${bossData.boss.name} awakens...`,
            isDemoBoss ? 
                '📚 Welcome to the training grounds! Practice your abilities safely.' :
                '⚔️ Complete your linked tasks to weaken the beast!',
            isDemoBoss ? 
                '💡 Try using the battle moves below to practice combat!' :
                '🎯 Use battle moves and complete quests to deal damage!',
            `📊 Boss Health: ${bossData.progress.currentHP}/${bossData.progress.maxHP}`
        ]);
        setCurrentPhase(1);
        setTimeRemaining(7200);
        setLastActivity(Date.now());
    };

    // Helper functions for Pokemon-style interface
    const getHPColor = (percentage: number): string => {
        if (percentage > 60) return '#ef4444'; // red
        if (percentage > 30) return '#f97316'; // orange  
        return '#eab308'; // yellow
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Timer effect for battle countdown
    useEffect(() => {
        if (currentScreen === 'battle' && selectedBoss && !isMinimized) {
            const interval = setInterval(() => {
                const timeSinceActivity = Date.now() - lastActivity;
                
                // Boss gets stronger when idle (simulates procrastination) - but not for demo boss
                if (timeSinceActivity > 300000 && selectedBoss.progress.currentHP < selectedBoss.boss.stats.maxHP && selectedBoss.boss.id !== 'demo-boss-test-001') {
                    selectedBoss.progress.currentHP = Math.min(selectedBoss.boss.stats.maxHP, selectedBoss.progress.currentHP + 2);
                    setBattleLog(prev => [...prev.slice(-2), "The boss grows stronger from your inactivity..."]);
                }
                
                setTimeRemaining(prev => Math.max(0, prev - 1));
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [currentScreen, selectedBoss, isMinimized, lastActivity]);

    // Real-time tracking useEffect
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            setBattleDuration(Math.floor((now.getTime() - battleStartTime.getTime()) / 1000));
        }, 1000);
        
        return () => clearInterval(interval);
    }, [battleStartTime]);

    // Handle stat ability usage
    const handleAbilityUse = async (abilityName: string, playerStat: number) => {
        if (!selectedBoss || !playerData) return;
        
        const isDemoBoss = selectedBoss.boss.id === 'demo-boss-test-001';
        const isSkillDemoBoss = selectedBoss.boss.id === 'skill-demo-boss-001';
        
        if (selectedBoss.progress.currentHP <= 1 && !isDemoBoss && !isSkillDemoBoss) {
            setBattleLog(prev => [...prev.slice(-2), "Boss is too weak for abilities - complete your main quests!"]);
            return;
        }
        
        // Check if this is a skill-based move
        const skillBasedMove = availableMoves.find(move => move.name === abilityName);
        
        let damage: number;
        let skillGain = 0;
        let effects: string[] = [];
        
        if (skillBasedMove && skillBasedBoss && isSkillDemoBoss) {
            // Use skill-based battle engine
            try {
                const result = await SkillBasedBattleEngine.executeStatMove(
                    plugin.app.vault,
                    skillBasedMove,
                    skillBasedBoss,
                    {
                        boss: skillBasedBoss,
                        playerStats: {
                            currentHP: 100,
                            maxHP: 100,
                            attack: 50,
                            defense: 30,
                            speed: 40,
                            specialAttack: 45,
                            specialDefense: 35,
                            buffs: [],
                            debuffs: []
                        },
                        battleLog: [],
                        currentTurn: 0,
                        isPlayerTurn: true,
                        gameOver: false,
                        victory: false,
                        phaseTransition: false,
                        specialEffects: [],
                        comboCount: 0,
                        bossMood: 'confident' as const,
                        playerSkillStats: skillStats,
                        playerBattleStats: playerBattleStats,
                        availableMoves: availableMoves,
                        moveCalculations: moveCalculations,
                        skillGains: skillGains,
                        activeStatBoosts: {}
                    } as SkillBasedBattleState
                );
                damage = result.damage;
                skillGain = result.skillGain;
                effects = result.effects;
                
                // Update skill gains tracking
                if (skillGain > 0) {
                    setSkillGains(prev => ({
                        ...prev,
                        [skillBasedBoss.associatedSkill]: (prev[skillBasedBoss.associatedSkill] || 0) + skillGain
                    }));
                }
            } catch (error) {
                console.error('Failed to execute skill-based move:', error);
                // Fallback to regular damage calculation
                damage = Math.floor(Math.random() * 8) + 3 + Math.floor(playerStat / 5);
            }
        } else {
            // Enhanced ability calculation with stat-based damage
            const baseDamage = Math.floor(Math.random() * 8) + 3;
            let statBonus = Math.floor(playerStat / 5);
            
            // Apply stat bonuses based on ability type
            if (abilityName === 'Task Strike' && playerData?.stats?.strength) {
                statBonus = Math.floor(playerData.stats.strength / 3);
            } else if (abilityName === 'Focus Beam' && playerData?.stats?.intelligence) {
                statBonus = Math.floor(playerData.stats.intelligence / 3);
            } else if (abilityName === 'Deadline Rush' && playerData?.stats?.dexterity) {
                statBonus = Math.floor(playerData.stats.dexterity / 3);
            } else if (abilityName === 'Motivation Surge' && playerData?.stats?.charisma) {
                statBonus = Math.floor(playerData.stats.charisma / 4); // Buff move, lower damage
            }
            
            damage = baseDamage + statBonus;
        }
        
        // Battle moves can only reduce boss to 1 HP, never kill (all bosses follow same rule)
        // All bosses (including training dummy): battle moves can only reduce to 1 HP minimum
        // Only quest completion can deliver the final blow (1 HP → 0 HP)
        const newHP = Math.max(1, selectedBoss.progress.currentHP - damage);
        
        selectedBoss.progress.currentHP = newHP;
        
        // Update phase based on HP
        const hpPercentage = (newHP / selectedBoss.boss.stats.maxHP) * 100;
        if (hpPercentage <= 20) {
            setCurrentPhase(3);
        } else if (hpPercentage <= 50) {
            setCurrentPhase(2);
        }
        
        // Build battle log messages
        const messages: string[] = [];
        if (effects.length > 0) { // TODO: This is a hack to get the effects to work
            messages.push(...effects);
        } else {
            messages.push(
            newHP === 0 ? 
                `${abilityName} delivers the final blow! Boss defeated!` :
                newHP === 1 ? 
                    `${abilityName} deals ${damage} damage! Boss is critically weakened - complete all quests to deliver the final blow!` :
                    `${abilityName} deals ${damage} damage!`
            );
        }
        
        setBattleLog(prev => [...prev.slice(-2), ...messages]);
        setLastActivity(Date.now());
        
        // Check for victory
        if (newHP === 0) {
            setTimeout(() => {
                new Notice(isDemoBoss || isSkillDemoBoss ? '🎉 Training completed successfully!' : '🏆 Boss defeated!');
                if (isDemoBoss || isSkillDemoBoss) {
                    // Add training completion message and exit options
                    setBattleLog(prev => [...prev.slice(-2), 
                        '🎓 Training complete! You\'ve mastered the basics.',
                        '✅ No rewards from training dummy (as expected)',
                        '🚪 Click the red "Exit Battle" button above to return to boss selection',
                        '🔄 Or continue practicing - training dummy is always available!'
                    ]);
                    // Don't auto-reset for training bosses - let user choose
                }
            }, 1000);
        }
    };


    // Tab Styles
    const tabButtonStyle = (isActive: boolean) => ({
        padding: '12px 24px',
        backgroundColor: isActive ? '#4a90e2' : '#2a2a2a',
        color: isActive ? '#ffffff' : '#cccccc',
        border: 'none',
        borderRadius: '8px 8px 0 0',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        marginRight: '4px',
        transform: isActive ? 'translateY(-2px)' : 'none',
        boxShadow: isActive ? '0 4px 8px rgba(74, 144, 226, 0.3)' : 'none'
    });

    const renderTutorialTab = () => {
        console.log("BossBattleUI: Rendering tutorial tab");
        return (
        <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2.5rem', color: '#ffd700', marginBottom: '15px' }}>
                    ⚔️ Boss Battle Tutorial
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#ccc', lineHeight: '1.6' }}>
                    Master the art of boss battles and claim victory over your greatest challenges!
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
                {/* What are Boss Battles */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #1e3c72, #2a5298)', 
                    padding: '25px', 
                    borderRadius: '15px',
                    border: '2px solid #4a90e2',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                }}>
                    <h3 style={{ color: '#ffd700', marginBottom: '15px', fontSize: '1.3rem' }}>
                        🎮 What are Boss Battles?
                    </h3>
                    <p style={{ color: '#e0e0e0', lineHeight: '1.6', marginBottom: '15px' }}>
                        Boss battles are epic confrontations with powerful enemies that represent your most challenging quests and projects.
                    </p>
                    <ul style={{ color: '#ccc', paddingLeft: '20px' }}>
                        <li>Each boss represents a major quest or project</li>
                        <li>Defeat bosses by completing quest subtasks</li>
                        <li>Gain experience, rewards, and achievements</li>
                    </ul>
                </div>

                {/* How to Fight */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #8B0000, #CD5C5C)', 
                    padding: '25px', 
                    borderRadius: '15px',
                    border: '2px solid #ff6b6b',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                }}>
                    <h3 style={{ color: '#ffd700', marginBottom: '15px', fontSize: '1.3rem' }}>
                        ⚔️ How to Battle
                    </h3>
                    <p style={{ color: '#e0e0e0', lineHeight: '1.6', marginBottom: '15px' }}>
                        Your weapon is productivity! Complete subtasks to deal damage and weaken the boss.
                    </p>
                    <ul style={{ color: '#ccc', paddingLeft: '20px' }}>
                        <li>Complete subtasks to deal damage</li>
                        <li>More subtasks = more damage</li>
                        <li>Finish all subtasks to defeat the boss</li>
                    </ul>
                </div>

                {/* Boss Types */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #4B0082, #8A2BE2)', 
                    padding: '25px', 
                    borderRadius: '15px',
                    border: '2px solid #9370DB',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                }}>
                    <h3 style={{ color: '#ffd700', marginBottom: '15px', fontSize: '1.3rem' }}>
                        👹 Boss Types
                    </h3>
                    <p style={{ color: '#e0e0e0', lineHeight: '1.6', marginBottom: '15px' }}>
                        Different bosses have different requirements and rewards.
                    </p>
                    <ul style={{ color: '#ccc', paddingLeft: '20px' }}>
                        <li>🔥 Fire Boss: Quick, urgent tasks</li>
                        <li>🌊 Water Boss: Long-term projects</li>
                        <li>🌍 Earth Boss: Steady, methodical work</li>
                        <li>💨 Air Boss: Creative challenges</li>
                    </ul>
                </div>

                {/* Rewards */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #DAA520, #FFD700)', 
                    padding: '25px', 
                    borderRadius: '15px',
                    border: '2px solid #ffd700',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                    color: '#1a1a1a'
                }}>
                    <h3 style={{ color: '#8B0000', marginBottom: '15px', fontSize: '1.3rem' }}>
                        🏆 Rewards & Benefits
                    </h3>
                    <p style={{ color: '#2a2a2a', lineHeight: '1.6', marginBottom: '15px' }}>
                        Victory brings great rewards and helps you level up your productivity!
                    </p>
                    <ul style={{ color: '#3a3a3a', paddingLeft: '20px' }}>
                        <li>💰 Gold and experience points</li>
                        <li>🎖️ Achievements and titles</li>
                        <li>📈 Skill improvements</li>
                        <li>🔓 Unlock new content</li>
                    </ul>
                </div>
            </div>

            <div style={{ 
                marginTop: '40px', 
                padding: '25px', 
                background: 'linear-gradient(135deg, #2c5aa0, #3d7bb8)',
                borderRadius: '15px',
                textAlign: 'center',
                border: '2px solid #4a90e2'
            }}>
                <h3 style={{ color: '#ffd700', marginBottom: '15px' }}>🌟 Pro Tips</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
                    <div style={{ color: '#e0e0e0' }}>📝 Break large tasks into smaller subtasks</div>
                    <div style={{ color: '#e0e0e0' }}>⏰ Set realistic deadlines</div>
                    <div style={{ color: '#e0e0e0' }}>🎯 Focus on one boss at a time</div>
                    <div style={{ color: '#e0e0e0' }}>🔄 Check progress regularly</div>
                </div>
            </div>

        </div>
        );
    };

    const renderBossSelectionTab = () => (
        <div style={{ padding: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '2rem', color: '#ffd700', marginBottom: '10px' }}>
                    🏟️ Choose Your Battle
                </h2>
                <p style={{ color: '#ccc', fontSize: '1.1rem' }}>
                    Select a boss to challenge. Complete quest subtasks to deal damage!
                </p>
                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                    <button
                        onClick={clearAllTestBosses}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                        }}>
                        🧹 Clear Test Bosses
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {availableBosses.map((bossData, index) => (
                    <div
                        key={bossData.boss.id}
                        style={{
                            background: 'linear-gradient(135deg, #2a2a3a, #3a3a4a)',
                            border: '2px solid #4a4a5a',
                            borderRadius: '15px',
                            padding: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            transform: 'scale(1)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.border = '2px solid #ffd700';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(255,215,0,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.border = '2px solid #4a4a5a';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                        }}
                        onClick={() => handleBossSelect(bossData)}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            {renderBossAvatar(bossData.boss, '3rem')}
                            <h3 style={{ color: '#ffd700', marginBottom: '5px' }}>
                                {bossData.boss.name}
                            </h3>
                            <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                                {bossData.boss.type.toUpperCase()}
                            </p>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                {bossData.boss.description}
                            </p>
                        </div>

                        {/* REWARDS DISPLAY */}
                        {bossData.quest && (bossData.quest.xp || bossData.quest.coins || bossData.quest.cp) && (
                            <div style={{ 
                                display: 'flex', 
                                gap: '12px', 
                                justifyContent: 'center',
                                marginBottom: '15px',
                                padding: '12px',
                                background: 'rgba(255, 215, 0, 0.05)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 215, 0, 0.2)'
                            }}>
                                {bossData.quest.xp && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>⭐</span>
                                        <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                            {bossData.quest.xp}
                                        </span>
                                    </div>
                                )}
                                {bossData.quest.coins && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>💰</span>
                                        <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                            {bossData.quest.coins}
                                        </span>
                                    </div>
                                )}
                                {bossData.quest.cp && bossData.quest.cp > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>⚡</span>
                                        <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                            {bossData.quest.cp}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid #4a4a5a', paddingTop: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#ccc' }}>Progress:</span>
                                <span style={{ color: '#4a90e2' }}>
                                    {bossData.boss.stats.maxHP - bossData.progress.currentHP}/{bossData.boss.stats.maxHP}
                                </span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: '#2a2a2a',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${((bossData.boss.stats.maxHP - bossData.progress.currentHP) / bossData.boss.stats.maxHP) * 100}%`,
                                    height: '100%',
                                    backgroundColor: '#4a90e2',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>

                        <div style={{ marginTop: '15px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startUnifiedBattle(bossData);
                                }}
                                style={{
                            padding: '10px 20px',
                            backgroundColor: '#4a90e2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            fontSize: '14px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#357abd';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#4a90e2';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                            🎮 Battle
                        </button>
                                {!bossData.boss.id.includes('demo-') && !bossData.boss.id.includes('sample-') && (
                                    <button
                                        onClick={(e) => handleDeleteBoss(bossData, e)}
                                        style={{
                                            padding: '10px 15px',
                                            backgroundColor: '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontWeight: 'bold',
                                            transition: 'all 0.3s ease'
                                        }}>
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {availableBosses.length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '40px',
                        background: 'linear-gradient(135deg, #2a2a3a, #3a3a4a)',
                        borderRadius: '15px',
                        border: '2px dashed #4a4a5a'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏰</div>
                        <h3 style={{ color: '#ffd700', marginBottom: '10px' }}>No Bosses Available</h3>
                        <p style={{ color: '#ccc' }}>
                            Create some quests first, then bosses will appear here to challenge!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _renderBossCreationTab = () => {
        const renderCreationStep = () => {
            switch (creationStep) {
                case 'templates':
                    return (
                        <div style={{ padding: '20px' }}>
                            <h3 style={{ color: '#ffd700', marginBottom: '20px', textAlign: 'center' }}>
                                📚 Boss Templates
                            </h3>
                            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                                <button
                                    onClick={() => setCreationStep('basic')}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        marginRight: '10px'
                                    }}
                                >
                                    ➕ Create New Boss
                                </button>
                            </div>
                            
                            {savedBossTemplates.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                    {savedBossTemplates.map((template, index) => (
                                        <div
                                            key={template.id}
                                            style={{
                                                background: 'linear-gradient(135deg, #2a2a3a, #3a3a4a)',
                                                padding: '15px',
                                                borderRadius: '10px',
                                                border: '1px solid #4a4a5a',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.border = '1px solid #ffd700';
                                                e.currentTarget.style.transform = 'scale(1.02)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.border = '1px solid #4a4a5a';
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                        >
                                            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                                {template.visuals?.customImage ? (
                                                    <img 
                                                        src={template.visuals.customImage} 
                                                        alt={template.name}
                                                        style={{ 
                                                            width: '50px', 
                                                            height: '50px', 
                                                            borderRadius: '50%',
                                                            objectFit: 'cover',
                                                            border: '2px solid #4a4a5a'
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{ fontSize: '2.5rem' }}>{template.visuals?.avatar || '👹'}</div>
                                                )}
                                            </div>
                                            <h4 style={{ color: '#ffd700', textAlign: 'center', margin: '0 0 10px 0' }}>
                                                {template.name}
                                            </h4>
                                            <p style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', marginBottom: '10px' }}>
                                                {template.difficulty} • {template.category}
                                            </p>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button
                                                    onClick={() => loadBossTemplate(template)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px',
                                                        backgroundColor: '#4a90e2',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Load
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const updated = savedBossTemplates.filter(t => t.id !== template.id);
                                                        setSavedBossTemplates(updated);
                                                        localStorage.setItem('gamified-boss-templates', JSON.stringify(updated));
                                                        new Notice('Template deleted');
                                                    }}
                                                    style={{
                                                        padding: '6px',
                                                        backgroundColor: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px',
                                    background: 'rgba(74, 144, 226, 0.1)',
                                    borderRadius: '10px',
                                    border: '2px dashed #4a90e2'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏗️</div>
                                    <h3 style={{ color: '#ffd700', marginBottom: '10px' }}>No Templates Yet</h3>
                                    <p style={{ color: '#ccc' }}>Create your first custom boss to get started!</p>
                                </div>
                            )}
                        </div>
                    );

                case 'basic':
                    return (
                        <div style={{ padding: '20px' }}>
                            <h3 style={{ color: '#ffd700', marginBottom: '20px', textAlign: 'center' }}>
                                🎨 Basic Information & Skill Integration
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    {/* Boss Name */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                            Boss Name:
                                        </label>
                                        <input
                                            type="text"
                                            value={customBoss.name}
                                            onChange={(e) => setCustomBoss({...customBoss, name: e.target.value})}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                backgroundColor: '#1a1a2a',
                                                border: '2px solid #4a4a5a',
                                                borderRadius: '8px',
                                                color: '#ffffff',
                                                fontSize: '14px'
                                            }}
                                            placeholder="Enter boss name..."
                                        />
                                    </div>

                                    {/* Boss Title */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                            Boss Title:
                                        </label>
                                        <input
                                            type="text"
                                            value={customBoss.title}
                                            onChange={(e) => setCustomBoss({...customBoss, title: e.target.value})}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                backgroundColor: '#1a1a2a',
                                                border: '2px solid #4a4a5a',
                                                borderRadius: '8px',
                                                color: '#ffffff',
                                                fontSize: '14px'
                                            }}
                                            placeholder="The Mighty, The Destroyer, etc..."
                                        />
                                    </div>

                                    {/* Avatar Type Selection */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                            Avatar Type:
                                        </label>
                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                            <button
                                                onClick={() => setCustomBoss({...customBoss, imageType: 'emoji', customImage: ''})}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: customBoss.imageType === 'emoji' ? '#4a90e2' : '#2a2a2a',
                                                    color: 'white',
                                                    border: '2px solid ' + (customBoss.imageType === 'emoji' ? '#ffd700' : '#4a4a5a'),
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                🎭 Icon/Emoji
                                            </button>
                                            <button
                                                onClick={() => setCustomBoss({...customBoss, imageType: 'image'})}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: customBoss.imageType === 'image' ? '#4a90e2' : '#2a2a2a',
                                                    color: 'white',
                                                    border: '2px solid ' + (customBoss.imageType === 'image' ? '#ffd700' : '#4a4a5a'),
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                🖼️ Custom Image
                                            </button>
                                        </div>
                                    </div>

                                    {/* Icon Selection */}
                                    {customBoss.imageType === 'emoji' && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                                Choose Icon:
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                                {['👹', '🐉', '👺', '🦹', '🤖', '💀', '👻', '🦾', '⚡', '🔥', '❄️', '🌪️', '🦁', '🐺', '🦅', '🐙', '🦈', '🐊', '🕷️', '🦂'].map(icon => (
                                                    <button
                                                        key={icon}
                                                        onClick={() => setCustomBoss({...customBoss, icon})}
                                                        style={{
                                                            padding: '8px',
                                                            fontSize: '1.5rem',
                                                            backgroundColor: customBoss.icon === icon ? '#4a90e2' : '#2a2a2a',
                                                            border: '2px solid ' + (customBoss.icon === icon ? '#ffd700' : '#4a4a5a'),
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    >
                                                        {icon}
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                value={customBoss.icon}
                                                onChange={(e) => setCustomBoss({...customBoss, icon: e.target.value})}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    backgroundColor: '#1a1a2a',
                                                    border: '1px solid #4a4a5a',
                                                    borderRadius: '6px',
                                                    color: '#ffffff',
                                                    fontSize: '12px'
                                                }}
                                                placeholder="Or enter custom emoji..."
                                            />
                                        </div>
                                    )}

                                    {/* Image Upload */}
                                    {customBoss.imageType === 'image' && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                                Upload Boss Image:
                                            </label>
                                            <div style={{
                                                border: '2px dashed #4a90e2',
                                                borderRadius: '8px',
                                                padding: '20px',
                                                textAlign: 'center',
                                                backgroundColor: '#1a1a2a',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onClick={() => document.getElementById('boss-image-input')?.click()}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a3a'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a2a'}
                                            >
                                                <input
                                                    id="boss-image-input"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    style={{ display: 'none' }}
                                                />
                                                {imagePreview ? (
                                                    <div>
                                                        <img 
                                                            src={imagePreview} 
                                                            alt="Boss preview"
                                                            style={{ 
                                                                maxWidth: '100px', 
                                                                maxHeight: '100px', 
                                                                borderRadius: '8px',
                                                                marginBottom: '10px'
                                                            }}
                                                        />
                                                        <p style={{ color: '#10b981', fontSize: '14px' }}>✅ Image uploaded! Click to change</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📷</div>
                                                        <p style={{ color: '#ccc', fontSize: '14px' }}>Click to upload boss image</p>
                                                        <p style={{ color: '#999', fontSize: '12px' }}>JPG, PNG, GIF up to 5MB</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {/* Description */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                            Description:
                                        </label>
                                        <textarea
                                            value={customBoss.description}
                                            onChange={(e) => setCustomBoss({...customBoss, description: e.target.value})}
                                            style={{
                                                width: '100%',
                                                height: '120px',
                                                padding: '10px',
                                                backgroundColor: '#1a1a2a',
                                                border: '2px solid #4a4a5a',
                                                borderRadius: '8px',
                                                color: '#ffffff',
                                                fontSize: '14px',
                                                resize: 'vertical'
                                            }}
                                            placeholder="Describe your boss..."
                                        />
                                    </div>

                                    {/* Category */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                            Category:
                                        </label>
                                        <select
                                            value={customBoss.category}
                                            onChange={(e) => setCustomBoss({...customBoss, category: e.target.value as BossCategory})}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                backgroundColor: '#1a1a2a',
                                                border: '2px solid #4a4a5a',
                                                borderRadius: '8px',
                                                color: '#ffffff',
                                                fontSize: '14px'
                                            }}
                                        >
                                            <option value="single-session">Single Session</option>
                                            <option value="multi-session">Multi Session</option>
                                            <option value="persistent">Persistent</option>
                                            <option value="event">Event</option>
                                        </select>
                                    </div>

                                    {/* Difficulty */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                            Difficulty Level: {customBoss.difficulty}
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={customBoss.difficulty}
                                            onChange={(e) => setCustomBoss({...customBoss, difficulty: parseInt(e.target.value)})}
                                            style={{ width: '100%', marginBottom: '10px' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: '12px' }}>
                                            <span>Easy (1-3)</span>
                                            <span>Medium (4-6)</span>
                                            <span>Hard (7-8)</span>
                                            <span>Legendary (9-10)</span>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div style={{
                                        background: 'rgba(74, 144, 226, 0.1)',
                                        border: '1px solid #4a90e2',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        textAlign: 'center'
                                    }}>
                                        <h4 style={{ color: '#ffd700', margin: '0 0 10px 0' }}>Preview</h4>
                                        {customBoss.imageType === 'image' && imagePreview ? (
                                            <img 
                                                src={imagePreview} 
                                                alt="Boss preview"
                                                style={{ 
                                                    width: '60px', 
                                                    height: '60px', 
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    marginBottom: '8px'
                                                }}
                                            />
                                        ) : (
                                            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{customBoss.icon}</div>
                                        )}
                                        <div style={{ color: '#fff', fontWeight: 'bold' }}>{customBoss.name || 'Boss Name'}</div>
                                        <div style={{ color: '#ccc', fontSize: '12px' }}>{customBoss.title || 'Boss Title'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Skill Selection */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                    🎯 Select Primary Skill:
                                </label>
                                <select
                                    value={customBoss.linkedSkill}
                                    onChange={(e) => {
                                        const skillName = e.target.value;
                                        const skill = availableSkills.find(s => s.name === skillName);
                                        setCustomBoss({...customBoss, linkedSkill: skillName});
                                        setSelectedSkill(skill || null);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        backgroundColor: '#1a1a2a',
                                        border: '2px solid #4a4a5a',
                                        borderRadius: '8px',
                                        color: '#ffffff',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select a skill...</option>
                                    {availableSkills.map((skill, index) => (
                                        <option key={index} value={skill.name}>
                                            {skill.name} ({skill.class})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Estimated Duration */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                    Estimated Duration:
                                </label>
                                <select
                                    value={customBoss.estimatedDuration}
                                    onChange={(e) => setCustomBoss({...customBoss, estimatedDuration: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        backgroundColor: '#1a1a2a',
                                        border: '2px solid #4a4a5a',
                                        borderRadius: '8px',
                                        color: '#ffffff',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="30 minutes">30 minutes</option>
                                    <option value="1 hour">1 hour</option>
                                    <option value="2 hours">2 hours</option>
                                    <option value="4 hours">4 hours</option>
                                    <option value="1 day">1 day</option>
                                    <option value="1 week">1 week</option>
                                    <option value="1 month">1 month</option>
                                </select>
                            </div>

                            {/* Timer Enable */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', color: '#ffd700', fontWeight: 'bold', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={customBoss.enableTimer}
                                        onChange={(e) => setCustomBoss({...customBoss, enableTimer: e.target.checked})}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Enable Time Limit
                                </label>
                                {customBoss.enableTimer && (
                                    <input
                                        type="number"
                                        min="300"
                                        max="86400"
                                        step="300"
                                        value={customBoss.timeLimit}
                                        onChange={(e) => setCustomBoss({...customBoss, timeLimit: parseInt(e.target.value) || 7200})}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            backgroundColor: '#1a1a2a',
                                            border: '1px solid #4a4a5a',
                                            borderRadius: '6px',
                                            color: '#ffffff',
                                            fontSize: '12px',
                                            marginTop: '8px'
                                        }}
                                        placeholder="Time limit in seconds..."
                                    />
                                )}
                            </div>

                            <div>
                                {/* Selected Skill Info */}
                                {selectedSkill && (
                                    <div style={{
                                        backgroundColor: '#2a2a3a',
                                        padding: '20px',
                                        borderRadius: '10px',
                                        border: '1px solid #4a4a5a',
                                        marginBottom: '20px'
                                    }}>
                                        <h4 style={{ color: '#ffd700', marginBottom: '10px' }}>Selected Skill</h4>
                                        <p style={{ color: '#ccc', marginBottom: '8px' }}>
                                            <strong>Name:</strong> {selectedSkill.name}
                                        </p>
                                        <p style={{ color: '#ccc', marginBottom: '8px' }}>
                                            <strong>Class:</strong> {selectedSkill.class}
                                        </p>
                                        <p style={{ color: '#ccc', marginBottom: '8px' }}>
                                            <strong>Description:</strong> {selectedSkill.description || 'No description available'}
                                        </p>
                                        {selectedSkill.stats && (
                                            <div>
                                                <strong style={{ color: '#ffd700' }}>Related Stats:</strong>
                                                <div style={{ marginTop: '8px' }}>
                                                    {Object.keys(selectedSkill.stats).map((stat, index) => (
                                                        <span key={index} style={{
                                                            display: 'inline-block',
                                                            backgroundColor: '#4a90e2',
                                                            color: 'white',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            marginRight: '6px',
                                                            marginBottom: '4px'
                                                        }}>
                                                            {stat}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Creation Info */}
                                <div style={{
                                    backgroundColor: '#2a2a3a',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    border: '1px solid #4a4a5a'
                                }}>
                                    <h4 style={{ color: '#ffd700', marginBottom: '10px' }}>Creation Info</h4>
                                    <p style={{ color: '#ccc', marginBottom: '8px' }}>
                                        <strong>Created:</strong> {customBoss.createdAt.toLocaleString()}
                                    </p>
                                    <p style={{ color: '#ccc', marginBottom: '8px' }}>
                                        <strong>Duration:</strong> {customBoss.estimatedDuration}
                                    </p>
                                    {customBoss.enableTimer && (
                                        <p style={{ color: '#ccc', marginBottom: '8px' }}>
                                            <strong>Time Limit:</strong> {Math.round(customBoss.timeLimit / 60)} minutes
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Navigation */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                                <button
                                    onClick={() => setCreationStep('templates')}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⬅️ Back
                                </button>
                                <button
                                    onClick={() => setCreationStep('quests')}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#4a90e2',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Next: Quests ➡️
                                </button>
                            </div>
                        </div>
                    );



                case 'quests':
                    return (
                        <div style={{ padding: '20px' }}>
                            <h3 style={{ color: '#ffd700', marginBottom: '20px', textAlign: 'center' }}>
                                🎮 Quest Discovery & Custom Subtasks
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    {/* Quest Search and Create Button */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                            Search Quests:
                                        </label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input
                                                type="text"
                                                value={questSearchFilter}
                                                onChange={(e) => setQuestSearchFilter(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    backgroundColor: '#1a1a2a',
                                                    border: '2px solid #4a4a5a',
                                                    borderRadius: '8px',
                                                    color: '#ffffff',
                                                    fontSize: '14px'
                                                }}
                                                placeholder="Search for quests..."
                                            />
                                            <button
                                                onClick={() => setShowQuestCreation(true)}
                                                style={{
                                                    padding: '10px 16px',
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                ➕ Create Quest
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quest List */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                            Available Quests (with #gamified-task & #gamified-boss):
                                        </label>
                                        <div style={{
                                            maxHeight: '400px',
                                            overflowY: 'auto',
                                            backgroundColor: '#1a1a2a',
                                            border: '2px solid #4a4a5a',
                                            borderRadius: '8px',
                                            padding: '10px'
                                        }}>
                                            {availableQuests
                                                .filter(quest => 
                                                    questSearchFilter === '' || 
                                                    quest.text.toLowerCase().includes(questSearchFilter.toLowerCase()) ||
                                                    quest.filePath.toLowerCase().includes(questSearchFilter.toLowerCase())
                                                )
                                                .map((quest, index) => (
                                                <div key={index} style={{
                                                    backgroundColor: '#2a2a3a',
                                                    padding: '12px',
                                                    borderRadius: '6px',
                                                    marginBottom: '8px',
                                                    border: customBoss.linkedQuests.some(lq => lq.questId === quest.questId) ? '2px solid #10b981' : '1px solid #4a4a5a',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => {
                                                    const isSelected = customBoss.linkedQuests.some(lq => lq.questId === quest.questId);
                                                    if (isSelected) {
                                                        // Remove quest
                                                        setCustomBoss({
                                                            ...customBoss,
                                                            linkedQuests: customBoss.linkedQuests.filter(lq => lq.questId !== quest.questId)
                                                        });
                                                    } else {
                                                        // Add quest
                                                        setCustomBoss({
                                                            ...customBoss,
                                                            linkedQuests: [...customBoss.linkedQuests, quest]
                                                        });
                                                    }
                                                }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                                                        <span style={{ 
                                                            color: customBoss.linkedQuests.some(lq => lq.questId === quest.questId) ? '#10b981' : '#ffd700',
                                                            marginRight: '8px' 
                                                        }}>
                                                            {customBoss.linkedQuests.some(lq => lq.questId === quest.questId) ? '✅' : '⭕'}
                                                        </span>
                                                        <span style={{ 
                                                            color: quest.completed ? '#10b981' : '#ffffff',
                                                            textDecoration: quest.completed ? 'line-through' : 'none',
                                                            flex: 1,
                                                            fontSize: '14px'
                                                        }}>
                                                            {quest.text.replace(/#[\w-]+/g, '').trim()}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
                                                        <span>⭐{quest.xp} XP | 🪙{quest.cp} CP | {currencyDisplay.getCurrencySymbol()}{quest.coins} {currencyDisplay.getCurrencyName()}</span>
                                                        <span>💥{quest.damageValue} damage</span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                        {quest.filePath}
                                                    </div>
                                                </div>
                                            ))}
                                            {availableQuests.filter(quest => 
                                                questSearchFilter === '' || 
                                                quest.text.toLowerCase().includes(questSearchFilter.toLowerCase()) ||
                                                quest.filePath.toLowerCase().includes(questSearchFilter.toLowerCase())
                                            ).length === 0 && (
                                                <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                                                    {availableQuests.length === 0 ? 
                                                        'No quests found with both #gamified-task and #gamified-boss tags' :
                                                        'No quests match your search'
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Custom Subtasks Section */}
                                    <div style={{ 
                                        marginTop: '30px',
                                        backgroundColor: '#2a2a3a',
                                        padding: '20px',
                                        borderRadius: '10px',
                                        border: '1px solid #4a4a5a'
                                    }}>
                                        <h4 style={{ color: '#ffd700', marginBottom: '15px', textAlign: 'center' }}>
                                            📝 Custom Subtasks
                                        </h4>
                                        <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>
                                            Create custom tasks that need to be completed to defeat this boss.
                                        </p>

                                        <div style={{ marginBottom: '20px' }}>
                                            {customBoss.customSubtasks.map((subtask, index) => (
                                                <div key={index} style={{
                                                    display: 'flex',
                                                    gap: '10px',
                                                    marginBottom: '10px',
                                                    alignItems: 'center'
                                                }}>
                                                    <span style={{ color: '#4a90e2', fontSize: '18px', minWidth: '20px' }}>
                                                        {index + 1}.
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={subtask.text}
                                                        onChange={(e) => updateSubtaskText(index, e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px',
                                                            backgroundColor: '#1a1a2a',
                                                            border: '2px solid #4a4a5a',
                                                            borderRadius: '8px',
                                                            color: '#ffffff',
                                                            fontSize: '14px'
                                                        }}
                                                        placeholder={`Enter subtask ${index + 1}...`}
                                                    />
                                                    <button
                                                        onClick={() => removeCustomSubtask(index)}
                                                        style={{
                                                            padding: '8px',
                                                            backgroundColor: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={addCustomSubtask}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            ➕ Add Subtask
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    {/* Selected Quests */}
                                    <div style={{
                                        backgroundColor: '#2a2a3a',
                                        padding: '20px',
                                        borderRadius: '10px',
                                        border: '1px solid #4a4a5a',
                                        marginBottom: '20px'
                                    }}>
                                        <h4 style={{ color: '#ffd700', marginBottom: '10px' }}>
                                            Selected Quests ({customBoss.linkedQuests.length})
                                        </h4>
                                        {customBoss.linkedQuests.length > 0 ? (
                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {customBoss.linkedQuests.map((quest, index) => (
                                                    <div key={index} style={{
                                                        backgroundColor: '#3a3a4a',
                                                        padding: '8px',
                                                        borderRadius: '4px',
                                                        marginBottom: '6px',
                                                        fontSize: '12px'
                                                    }}>
                                                        <div style={{ color: '#ffffff', marginBottom: '4px' }}>
                                                            {quest.text.replace(/#[\w-]+/g, '').trim()}
                                                        </div>
                                                        <div style={{ color: '#999' }}>
                                                            ⭐{quest.xp} XP | 🪙{quest.cp} CP | {currencyDisplay.getCurrencySymbol()}{quest.coins} {currencyDisplay.getCurrencyName()} | 💥{quest.damageValue} damage
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#666', textAlign: 'center' }}>
                                                No quests selected yet
                                            </p>
                                        )}
                                    </div>

                                    {/* Quest Stats Summary */}
                                    <div style={{
                                        backgroundColor: '#2a2a3a',
                                        padding: '20px',
                                        borderRadius: '10px',
                                        border: '1px solid #4a4a5a'
                                    }}>
                                        <h4 style={{ color: '#ffd700', marginBottom: '10px' }}>Quest Stats Summary</h4>
                                        <div style={{ color: '#ccc' }}>
                                            <p style={{ marginBottom: '6px' }}>
                                                <strong>Total Quests:</strong> {customBoss.linkedQuests.length}
                                            </p>
                                            <p style={{ marginBottom: '6px' }}>
                                                <strong>Total XP:</strong> {customBoss.linkedQuests.reduce((sum, q) => sum + q.xp, 0)}
                                            </p>
                                            <p style={{ marginBottom: '6px' }}>
                                                <strong>Total CP:</strong> {customBoss.linkedQuests.reduce((sum, q) => sum + q.cp, 0)}
                                            </p>
                                            <p style={{ marginBottom: '6px' }}>
                                                <strong>Total {currencyDisplay.getCurrencyName()}:</strong> {customBoss.linkedQuests.reduce((sum, q) => sum + q.coins, 0)}
                                            </p>
                                            <p style={{ marginBottom: '6px' }}>
                                                <strong>Total Damage:</strong> {customBoss.linkedQuests.reduce((sum, q) => sum + q.damageValue, 0)}
                                            </p>
                                        </div>
                                        
                                        {/* Auto-linking Button */}
                                        {customBoss.linkedQuests.length > 0 && customBoss.name.trim() && (
                                            <button
                                                onClick={applyBossTagsToQuests}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    backgroundColor: '#8b5cf6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    marginTop: '15px'
                                                }}
                                            >
                                                🔗 Apply Boss Tags to Selected Quests
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quest Creation Modal */}
                            {showQuestCreation && (
                                <div style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1000
                                }}>
                                    <div style={{
                                        backgroundColor: '#1a1a2a',
                                        padding: '30px',
                                        borderRadius: '12px',
                                        border: '2px solid #4a90e2',
                                        maxWidth: '500px',
                                        width: '90%',
                                        maxHeight: '80vh',
                                        overflowY: 'auto'
                                    }}>
                                        <h3 style={{ color: '#ffd700', marginBottom: '20px', textAlign: 'center' }}>
                                            ➕ Create New Quest
                                        </h3>
                                        
                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                                Quest Title:
                                            </label>
                                            <input
                                                type="text"
                                                value={newQuestData.title}
                                                onChange={(e) => setNewQuestData({...newQuestData, title: e.target.value})}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    backgroundColor: '#2a2a3a',
                                                    border: '2px solid #4a4a5a',
                                                    borderRadius: '8px',
                                                    color: '#ffffff',
                                                    fontSize: '14px'
                                                }}
                                                placeholder="Enter quest title..."
                                            />
                                        </div>

                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                                Description (optional):
                                            </label>
                                            <textarea
                                                value={newQuestData.description}
                                                onChange={(e) => setNewQuestData({...newQuestData, description: e.target.value})}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    backgroundColor: '#2a2a3a',
                                                    border: '2px solid #4a4a5a',
                                                    borderRadius: '8px',
                                                    color: '#ffffff',
                                                    fontSize: '14px',
                                                    minHeight: '80px',
                                                    resize: 'vertical'
                                                }}
                                                placeholder="Enter quest description..."
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                            <div>
                                                <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                                    XP Reward:
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="1000"
                                                    value={newQuestData.xp}
                                                    onChange={(e) => setNewQuestData({...newQuestData, xp: parseInt(e.target.value) || 10})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        backgroundColor: '#2a2a3a',
                                                        border: '2px solid #4a4a5a',
                                                        borderRadius: '8px',
                                                        color: '#ffffff',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                                    CP Reward:
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={newQuestData.cp}
                                                    onChange={(e) => setNewQuestData({...newQuestData, cp: parseInt(e.target.value) || 5})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        backgroundColor: '#2a2a3a',
                                                        border: '2px solid #4a4a5a',
                                                        borderRadius: '8px',
                                                        color: '#ffffff',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                            <div>
                                                <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                                    {currencyDisplay.getCurrencyName()} Reward:
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={newQuestData.coins}
                                                    onChange={(e) => setNewQuestData({...newQuestData, coins: parseInt(e.target.value) || 1})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        backgroundColor: '#2a2a3a',
                                                        border: '2px solid #4a4a5a',
                                                        borderRadius: '8px',
                                                        color: '#ffffff',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: '#ffd700', marginBottom: '8px', fontWeight: 'bold' }}>
                                                    Damage Value:
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={newQuestData.damageValue}
                                                    onChange={(e) => setNewQuestData({...newQuestData, damageValue: parseInt(e.target.value) || 5})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        backgroundColor: '#2a2a3a',
                                                        border: '2px solid #4a4a5a',
                                                        borderRadius: '8px',
                                                        color: '#ffffff',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{
                                            backgroundColor: '#2a2a3a',
                                            padding: '15px',
                                            borderRadius: '8px',
                                            marginBottom: '20px',
                                            border: '1px solid #4a4a5a'
                                        }}>
                                            <h4 style={{ color: '#ffd700', marginBottom: '10px', fontSize: '14px' }}>Quest Preview:</h4>
                                            <p style={{ color: '#ccc', fontSize: '12px', fontFamily: 'monospace' }}>
                                                - [ ] {newQuestData.title || 'Quest Title'} ⭐{newQuestData.xp} 🪙{newQuestData.cp} {currencyDisplay.getCurrencySymbol()}{newQuestData.coins} #gamified-task #gamified-boss #{generateBossTag(customBoss.name || 'untitled')}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => setShowQuestCreation(false)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    backgroundColor: '#6b7280',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={createNewQuest}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                Create Quest
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                                <button
                                    onClick={() => setCreationStep('basic')}
                                        style={{
                                            padding: '12px 24px',
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ⬅️ Back
                                    </button>
                                    <button
                                        onClick={() => setCreationStep('advanced')}
                                        style={{
                                            padding: '12px 24px',
                                            backgroundColor: '#4a90e2',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Next: Advanced ➡️
                                    </button>
                            </div>
                        </div>
                    );

                case 'advanced':
                    return (
                        <div style={{ padding: '20px' }}>
                            <h3 style={{ color: '#ffd700', marginBottom: '20px', textAlign: 'center' }}>
                                ⚙️ Advanced Settings
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', maxWidth: '800px', margin: '0 auto' }}>
                                <div>
                                    {/* Stats */}
                                    <h4 style={{ color: '#4a90e2', marginBottom: '15px' }}>Boss Stats</h4>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Max HP: {customBoss.stats.maxHP}</label>
                                        <input
                                            type="range"
                                            min="50"
                                            max="500"
                                            step="25"
                                            value={customBoss.stats.maxHP}
                                            onChange={(e) => setCustomBoss({
                                                ...customBoss, 
                                                stats: { ...customBoss.stats, maxHP: parseInt(e.target.value) }
                                            })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Attack: {customBoss.stats.attack}</label>
                                        <input
                                            type="range"
                                            min="5"
                                            max="30"
                                            value={customBoss.stats.attack}
                                            onChange={(e) => setCustomBoss({
                                                ...customBoss, 
                                                stats: { ...customBoss.stats, attack: parseInt(e.target.value) }
                                            })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    {/* Rewards */}
                                    <h4 style={{ color: '#4a90e2', marginBottom: '15px' }}>Rewards</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#ccc', fontSize: '12px' }}>XP</label>
                                            <input
                                                type="number"
                                                value={customBoss.rewards.xp}
                                                onChange={(e) => setCustomBoss({
                                                    ...customBoss,
                                                    rewards: { ...customBoss.rewards, xp: parseInt(e.target.value) || 0 }
                                                })}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px',
                                                    backgroundColor: '#1a1a2a',
                                                    border: '1px solid #4a4a5a',
                                                    borderRadius: '4px',
                                                    color: '#ffffff',
                                                    fontSize: '12px'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#ccc', fontSize: '12px' }}>CP</label>
                                            <input
                                                type="number"
                                                value={customBoss.rewards.cp}
                                                onChange={(e) => setCustomBoss({
                                                    ...customBoss,
                                                    rewards: { ...customBoss.rewards, cp: parseInt(e.target.value) || 0 }
                                                })}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px',
                                                    backgroundColor: '#1a1a2a',
                                                    border: '1px solid #4a4a5a',
                                                    borderRadius: '4px',
                                                    color: '#ffffff',
                                                    fontSize: '12px'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#ccc', fontSize: '12px' }}>Coins</label>
                                            <input
                                                type="number"
                                                value={customBoss.rewards.coins}
                                                onChange={(e) => setCustomBoss({
                                                    ...customBoss,
                                                    rewards: { ...customBoss.rewards, coins: parseInt(e.target.value) || 0 }
                                                })}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px',
                                                    backgroundColor: '#1a1a2a',
                                                    border: '1px solid #4a4a5a',
                                                    borderRadius: '4px',
                                                    color: '#ffffff',
                                                    fontSize: '12px'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {/* Lore */}
                                    <h4 style={{ color: '#4a90e2', marginBottom: '15px' }}>Boss Lore</h4>
                                    <textarea
                                        value={customBoss.lore}
                                        onChange={(e) => setCustomBoss({...customBoss, lore: e.target.value})}
                                        style={{
                                            width: '100%',
                                            height: '80px',
                                            padding: '10px',
                                            backgroundColor: '#1a1a2a',
                                            border: '2px solid #4a4a5a',
                                            borderRadius: '8px',
                                            color: '#ffffff',
                                            fontSize: '14px',
                                            resize: 'vertical',
                                            marginBottom: '15px'
                                        }}
                                        placeholder="Add backstory and lore..."
                                    />

                                    {/* Theme */}
                                    <h4 style={{ color: '#4a90e2', marginBottom: '15px' }}>Theme</h4>
                                    <input
                                        type="text"
                                        value={customBoss.theme}
                                        onChange={(e) => setCustomBoss({...customBoss, theme: e.target.value})}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            backgroundColor: '#1a1a2a',
                                            border: '2px solid #4a4a5a',
                                            borderRadius: '8px',
                                            color: '#ffffff',
                                            fontSize: '14px',
                                            marginBottom: '15px'
                                        }}
                                        placeholder="fire, water, shadow, etc..."
                                    />

                                    {/* Quick Presets */}
                                    <h4 style={{ color: '#4a90e2', marginBottom: '15px' }}>Quick Presets</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <button
                                            onClick={() => setCustomBoss({
                                                ...customBoss,
                                                stats: { maxHP: 100, attack: 10, defense: 8, speed: 6, specialAttack: 12, specialDefense: 8 },
                                                difficulty: 3,
                                                theme: 'balanced'
                                            })}
                                            style={{
                                                padding: '8px',
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🟢 Balanced
                                        </button>
                                        <button
                                            onClick={() => setCustomBoss({
                                                ...customBoss,
                                                stats: { maxHP: 200, attack: 18, defense: 15, speed: 4, specialAttack: 20, specialDefense: 12 },
                                                difficulty: 7,
                                                theme: 'tank'
                                            })}
                                            style={{
                                                padding: '8px',
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🔴 Tank
                                        </button>
                                        <button
                                            onClick={() => setCustomBoss({
                                                ...customBoss,
                                                stats: { maxHP: 80, attack: 25, defense: 5, speed: 20, specialAttack: 15, specialDefense: 6 },
                                                difficulty: 6,
                                                theme: 'speed'
                                            })}
                                            style={{
                                                padding: '8px',
                                                backgroundColor: '#f59e0b',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🟡 Speed
                                        </button>
                                        <button
                                            onClick={() => setCustomBoss({
                                                ...customBoss,
                                                stats: { maxHP: 400, attack: 30, defense: 20, speed: 8, specialAttack: 35, specialDefense: 25 },
                                                difficulty: 10,
                                                theme: 'legendary'
                                            })}
                                            style={{
                                                padding: '8px',
                                                backgroundColor: '#8b5cf6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🟣 Legendary
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
                                <button
                                    onClick={() => setCreationStep('quests')}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⬅️ Back
                                </button>
                                <button
                                    onClick={() => setCreationStep('preview')}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: '#4a90e2',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Preview & Save ➡️
                                </button>
                            </div>
                        </div>
                    );

                case 'preview':
                    return (
                        <div style={{ padding: '20px' }}>
                            <h3 style={{ color: '#ffd700', marginBottom: '20px', textAlign: 'center' }}>
                                👁️ Preview & Save
                            </h3>
                            
                            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                                {/* Boss Preview Card */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #2a2a3a, #3a3a4a)',
                                    borderRadius: '15px',
                                    border: '2px solid #4a90e2',
                                    padding: '25px',
                                    textAlign: 'center',
                                    marginBottom: '30px'
                                }}>
                                    <div style={{ marginBottom: '20px' }}>
                                        {customBoss.imageType === 'image' && imagePreview ? (
                                            <img 
                                                src={imagePreview} 
                                                alt="Boss preview"
                                                style={{ 
                                                    width: '100px', 
                                                    height: '100px', 
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    border: '3px solid #ffd700'
                                                }}
                                            />
                                        ) : (
                                            <div style={{ fontSize: '4rem' }}>{customBoss.icon}</div>
                                        )}
                                    </div>
                                    <h2 style={{ color: '#ffd700', margin: '0 0 5px 0' }}>{customBoss.name}</h2>
                                    <p style={{ color: '#ff6b6b', fontWeight: 'bold', margin: '0 0 15px 0' }}>{customBoss.title}</p>
                                    <p style={{ color: '#ccc', lineHeight: '1.5', marginBottom: '20px' }}>{customBoss.description}</p>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                        <div style={{
                                            background: 'rgba(74, 144, 226, 0.2)',
                                            padding: '10px',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ color: '#4a90e2', fontSize: '14px', fontWeight: 'bold' }}>HP</div>
                                            <div style={{ color: '#fff', fontSize: '18px' }}>{customBoss.stats.maxHP}</div>
                                        </div>
                                        <div style={{
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            padding: '10px',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>ATK</div>
                                            <div style={{ color: '#fff', fontSize: '18px' }}>{customBoss.stats.attack}</div>
                                        </div>
                                        <div style={{
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            padding: '10px',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ color: '#10b981', fontSize: '14px', fontWeight: 'bold' }}>DIFF</div>
                                            <div style={{ color: '#fff', fontSize: '18px' }}>{customBoss.difficulty}/10</div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ textAlign: 'left' }}>
                                        <h4 style={{ color: '#4a90e2', margin: '0 0 10px 0' }}>Required Tasks:</h4>
                                        {customBoss.customSubtasks.filter(t => t.text.trim()).map((task, index) => (
                                            <div key={index} style={{
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                border: '1px solid #3b82f6',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                marginBottom: '5px',
                                                fontSize: '14px'
                                            }}>
                                                {index + 1}. {task.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => setCreationStep('advanced')}
                                        style={{
                                            padding: '12px 24px',
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ⬅️ Edit More
                                    </button>
                                    <button
                                        onClick={() => {
                                            saveBossTemplate();
                                            setCreationStep('templates');
                                        }}
                                        style={{
                                            padding: '12px 30px',
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        💾 Save Boss Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    );

                default:
                    return <div>Loading...</div>;
            }
        };

        return (
            <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '2rem', color: '#ffd700', marginBottom: '10px' }}>
                        🔨 Enhanced Boss Creation
                    </h2>
                    <p style={{ color: '#ccc', fontSize: '1.1rem' }}>
                        Create, customize, and save your own epic boss battles!
                    </p>
                </div>

                {/* Step Navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '30px'
                }}>
                    {[
                        { key: 'templates', label: '📚 Templates', icon: '📚' },
                        { key: 'basic', label: '🎨 Basic', icon: '🎨' },
                        { key: 'quests', label: '📝 Quests', icon: '📝' },
                        { key: 'advanced', label: '⚙️ Advanced', icon: '⚙️' },
                        { key: 'preview', label: '👁️ Preview', icon: '👁️' }
                    ].map(step => (
                        <div
                            key={step.key}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: creationStep === step.key ? '#4a90e2' : '#2a2a3a',
                                color: creationStep === step.key ? '#ffffff' : '#888',
                                borderRadius: '20px',
                                fontSize: '14px',
                                border: '1px solid ' + (creationStep === step.key ? '#ffd700' : '#4a4a5a'),
                                cursor: step.key === 'templates' ? 'pointer' : 'default'
                            }}
                            onClick={() => step.key === 'templates' && setCreationStep('templates')}
                        >
                            {step.label}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div style={{
                    background: 'linear-gradient(135deg, #2a2a3a, #3a3a4a)',
                    borderRadius: '15px',
                    border: '2px solid #4a4a5a',
                    minHeight: '500px'
                }}>
                    {renderCreationStep()}
                </div>
            </div>
        );
    };
    // Enhanced Battle Screen with improved UI
    if (currentScreen === 'battle' && selectedBoss) {
        const isDemoBoss = selectedBoss.boss.id === 'demo-boss-test-001';
        const isSkillDemoBoss = selectedBoss.boss.id === 'skill-demo-boss-001';
        
        // For skill-based bosses, use enhanced UI
        if (skillBasedBoss && (isSkillDemoBoss || isDemoBoss)) {
            return (
                <div style={{ display: 'flex', gap: '16px', minHeight: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
                    {/* Enhanced Battle Info Panel */}
                    <div style={{ width: '300px', flexShrink: 0, overflowY: 'auto' }}>
                        <EnhancedBattleInfoPanel
                            equippedGear={equippedGear}
                            activeEvents={activeEvents}
                            battlePreparation={battlePreparation}
                            playerStats={playerBattleStats}
                            onEquipmentClick={() => {
                                // This would open the inventory modal
                                console.log("Opening inventory for equipment management...");
                                new Notice("💡 Tip: Use the inventory tab to manage productivity equipment!", 3000);
                            }}
                        />
                    </div>
                    
                    {/* Main Battle UI */}
                    <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                        <EnhancedBattleUI
                    boss={skillBasedBoss}
                    playerStats={playerBattleStats}
                    skillStats={skillStats}
                    availableMoves={availableMoves}
                    moveCalculations={moveCalculations}
                    battleLog={battleLog}
                    isQuestTrackingActive={isQuestTrackingActive}
                    onMoveUse={async (move) => {
                        try {
                            const result = await SkillBasedBattleEngine.executeStatMove(
                                plugin.app.vault,
                                move,
                                skillBasedBoss,
                                {
                                    boss: skillBasedBoss,
                                    playerStats: {
                                        currentHP: 100,
                                        maxHP: 100,
                                        attack: playerBattleStats.strength || 10,
                                        defense: playerBattleStats.endurance || 10,
                                        speed: playerBattleStats.dexterity || 10,
                                        specialAttack: playerBattleStats.intelligence || 10,
                                        specialDefense: playerBattleStats.intelligence || 10,
                                        buffs: [],
                                        debuffs: []
                                    },
                                    battleLog: [],
                                    currentTurn: 1,
                                    isPlayerTurn: true,
                                    gameOver: false,
                                    victory: false,
                                    timeRemaining: 7200,
                                    phaseTransition: false,
                                    specialEffects: [],
                                    comboCount: 0,
                                    bossMood: 'confident' as const,
                                    playerSkillStats: skillStats,
                                    playerBattleStats: playerBattleStats,
                                    availableMoves: availableMoves,
                                    moveCalculations: moveCalculations,
                                    skillGains: skillGains,
                                    activeStatBoosts: {}
                                }
                            );
                            
                            // Update boss HP
                            skillBasedBoss.stats.currentHP = Math.max(0, skillBasedBoss.stats.currentHP - result.damage);
                            
                            // Add to battle log
                            setBattleLog(prev => [...prev.slice(-9), ...result.effects]);
                            
                            // Check if boss is defeated
                            if (skillBasedBoss.stats.currentHP <= 0) {
                                setBattleLog(prev => [...prev.slice(-9), `🎉 ${skillBasedBoss.name} defeated! You are victorious!`]);
                            }
                        } catch (error) {
                            console.error('Failed to use move:', error);
                            setBattleLog(prev => [...prev.slice(-9), `❌ Move failed: ${error}`]);
                        }
                    }}
                    onQuestTrackingToggle={() => {
                        if (isQuestTrackingActive) {
                            stopQuestTracking();
                        } else {
                            startQuestTracking();
                        }
                    }}
                    onBattleAction={(action) => {
                        if (action === 'retreat') {
                            setCurrentScreen('main');
                            setBattleLog(prev => [...prev.slice(-9), '📍 Retreated from battle. Boss remains active.']);
                        } else if (action === 'focus') {
                            setBattleLog(prev => [...prev.slice(-9), '🧘 Focused mind! Next move will deal +10% damage.']);
                        }
                    }}
                        />
                    </div>
                </div>
            );
        }
    }


    if (currentScreen === 'battle' && selectedBoss) {
        // Check if this is a tutorial/practice boss - USE TACTICAL BATTLE UI
        const isTutorialBoss = selectedBoss.boss.name === 'Training Dummy Dragon' || 
                               selectedBoss.boss.name === 'Practice Beast' ||
                               selectedBoss.boss.type === 'mini-boss';
        
        if (isTutorialBoss && playerData) {
            console.log('🎮 Rendering TacticalBattleUI for tutorial boss:', selectedBoss.boss.name);
            return (
                <TacticalBattleUI
                    quest={selectedBoss.quest}
                    playerData={playerData}
                    plugin={plugin}
                    onQuestComplete={(questTitle) => {
                        console.log('Quest completed:', questTitle);
                        setCurrentScreen('main');
                    }}
                    onQuestFail={(questTitle) => {
                        console.log('Quest failed:', questTitle);
                        setCurrentScreen('main');
                    }}
                    onClose={() => {
                        setCurrentScreen('main');
                    }}
                    onSubtaskToggle={(questTitle, subtaskIndex) => {
                        console.log('Subtask toggled:', questTitle, subtaskIndex);
                        // Handle subtask completion
                        if (selectedBoss) {
                            const updatedSubtasks = [...selectedBoss.quest.subtasks];
                            if (updatedSubtasks[subtaskIndex]) {
                                updatedSubtasks[subtaskIndex] = {
                                    ...updatedSubtasks[subtaskIndex],
                                    completed: !updatedSubtasks[subtaskIndex].completed
                                };
                                setSelectedBoss({
                                    ...selectedBoss,
                                    quest: {
                                        ...selectedBoss.quest,
                                        subtasks: updatedSubtasks
                                    }
                                });
                            }
                        }
                    }}
                />
            );
        }
        
        // Check if this is the demo boss
        const isDemoBoss = selectedBoss.boss.id === 'demo-boss-test-001';
        
        // Calculate battle stats
        const completedMainQuests = selectedBoss.quest.subtasks.filter(st => st.completed).length;
        const totalMainQuests = selectedBoss.quest.subtasks.length;
        const canDefeatBoss = completedMainQuests === totalMainQuests;
        const bossHPPercentage = (selectedBoss.progress.currentHP / selectedBoss.boss.stats.maxHP) * 100;

        // Minimized widget
        if (isMinimized) {
            return (
                <div className={styles.minimizedView}>
                    <div className={styles.minimizedContent}>
                        <div style={{ fontSize: '2rem' }}>{selectedBoss.boss.visuals?.phaseAvatars?.[currentPhase - 1] || selectedBoss.boss.visuals?.avatar || '👹'}</div>
                        <div className={styles.minimizedBossInfo}>
                            <div className={styles.minimizedBossName}>
                                {selectedBoss.boss.name}
                                {isDemoBoss && <span className={styles.demoLabel}>(DEMO)</span>}
                            </div>
                            <div className={styles.minimizedHealthBar}>
                                <div 
                                    className={styles.minimizedHealthFill}
                                    style={{
                                        backgroundColor: getHPColor(bossHPPercentage),
                                        width: `${bossHPPercentage}%`
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                {selectedBoss.progress.currentHP}/{selectedBoss.boss.stats.maxHP} HP • {formatTime(timeRemaining)}
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsMinimized(false)}
                            className={styles.restoreButton}
                        >
                            ⬆️
                        </button>
                    </div>
                </div>
            );
        }

        // Enhanced Pokemon-style battle interface with combo system
        return (
            <div className={styles.battleOverlay}>
                <div className={styles.battleContainer}>
                    {/* Header */}
                    <div className={styles.battleHeader}>
                        <h1 className={styles.battleTitle}>
                            🎮 Boss Battle: {selectedBoss.boss.name}
                            {isDemoBoss && <span className={styles.demoLabel}>(DEMO)</span>}
                        </h1>
                        <div className={styles.headerButtons}>
                            <button 
                                onClick={() => setIsMinimized(true)}
                                className={styles.minimizeButton}
                            >
                                ⬇️ Minimize
                            </button>
                            <button 
                                onClick={() => setCurrentScreen('main')}
                                className={styles.exitButton}
                            >
                                ✕ Exit Battle
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className={styles.battleContent}>

                {/* Left Panel - Player Stats & Equipment */}
                    <div className={styles.playerStatsPanel}>
                        <h3 className={styles.playerStatsTitle}>
                            🛡️ Player Stats
                        </h3>
                    
                    {/* Player Stats Display */}
                    <div className={styles.playerStatsContainer}>
                        {Object.entries(playerBattleStats).map(([stat, value]) => (
                            <div key={stat} className={styles.statItem}>
                                <span className={styles.statLabel}>
                                    {stat}:
                                </span>
                                <span className={styles.statValue}>
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Combo System Display */}
                    {comboChain.length > 0 && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '2px solid #ef4444',
                            borderRadius: '12px',
                            padding: '12px',
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ color: '#ef4444', marginBottom: '8px', textAlign: 'center' }}>
                                🔥 COMBO ACTIVE!
                            </h4>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fbbf24' }}>
                                    x{comboMultiplier.toFixed(1)} Multiplier
                                </div>
                                <div style={{ fontSize: '14px', color: '#f87171' }}>
                                    {comboTimer}s remaining
                                </div>
                                <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '4px' }}>
                                    Chain: {comboChain.join(' → ')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Real-Time Battle Tracker */}
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '12px'
                    }}>
                        <h4 style={{ color: '#60a5fa', marginBottom: '8px', fontSize: '14px' }}>
                            ⏰ Real-Time Tracking
                        </h4>
                        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                            <div style={{ marginBottom: '4px' }}>
                                <strong>Current Time:</strong> {currentTime.toLocaleTimeString()}
                            </div>
                            <div style={{ marginBottom: '4px' }}>
                                <strong>Battle Session:</strong> {(() => {
                                    if (battleDuration < 60) return `${battleDuration}s`;
                                    if (battleDuration < 3600) return `${Math.floor(battleDuration / 60)}m ${battleDuration % 60}s`;
                                    if (battleDuration < 86400) return `${Math.floor(battleDuration / 3600)}h ${Math.floor((battleDuration % 3600) / 60)}m`;
                                    return `${Math.floor(battleDuration / 86400)}d ${Math.floor((battleDuration % 86400) / 3600)}h`;
                                })()}
                            </div>
                            <div style={{ marginBottom: '4px' }}>
                                <strong>Project Duration:</strong> {(() => {
                                    if (!selectedBoss?.boss.createdAt) return 'Unknown';
                                    const created = new Date(selectedBoss.boss.createdAt);
                                    const total = Math.floor((currentTime.getTime() - created.getTime()) / 1000);
                                    if (total < 60) return `${total}s`;
                                    if (total < 3600) return `${Math.floor(total / 60)}m`;
                                    if (total < 86400) return `${Math.floor(total / 3600)}h`;
                                    const days = Math.floor(total / 86400);
                                    const months = Math.floor(days / 30);
                                    return months > 0 ? `${months}m ${days % 30}d` : `${days}d`;
                                })()}
                            </div>
                            <div style={{ marginBottom: '4px' }}>
                                <strong>Estimated Total:</strong> {selectedBoss?.boss.estimatedDuration || 'Unknown'}
                            </div>
                            <div style={{
                                marginTop: '8px',
                                padding: '4px 8px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                borderRadius: '4px',
                                color: '#10b981',
                                fontSize: '11px'
                            }}>
                                📊 Battle Active Since: {battleStartTime.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Battle Info */}
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid #22c55e',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '16px'
                    }}>
                        <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>Battle Status</h4>
                        <div style={{ fontSize: '14px', color: '#86efac' }}>
                            <div>⏱️ Time: {formatTime(timeRemaining)}</div>
                            <div>🎯 Phase: {currentPhase}/3</div>
                            <div>✅ Tasks: {completedMainQuests}/{totalMainQuests}</div>
                        </div>
                    </div>

                    {/* Equipment & Events */}
                    <EnhancedBattleInfoPanel
                        equippedGear={equippedGear}
                        activeEvents={activeEvents}
                        battlePreparation={battlePreparation}
                        playerStats={playerBattleStats}
                        onEquipmentClick={() => {
                            new Notice("💡 Tip: Use the inventory tab to manage productivity equipment!", 3000);
                        }}
                    />
                </div>

                {/* Center Panel - Pokemon-style Battle Arena */}
                <div style={{
                        flex: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        borderRadius: '16px',
                        border: '3px solid #475569',
                        padding: '12px',
                        paddingTop: '20px',
                        position: 'relative',
                        overflow: 'hidden',
                        height: '100%',
                        minHeight: 0
                }}>
                    {/* Battle Background Effects */}
                            <div style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />

                    {/* Boss Sprite - Much Larger and Centered */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px'
                    }}>
                        <div style={{ 
                            fontSize: '8rem', 
                            marginBottom: '16px',
                            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                            animation: 'battleIdle 2s ease-in-out infinite alternate'
                        }}>
                            {selectedBoss.boss.visuals?.phaseAvatars?.[currentPhase - 1] || 
                             selectedBoss.boss.visuals?.avatar || '👹'}
                            </div>
                        
                        <h2 style={{ 
                            fontSize: '2.5rem', 
                                fontWeight: 'bold', 
                            marginBottom: '8px',
                                color: '#ef4444',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                            textAlign: 'center'
                            }}>
                                {selectedBoss.boss.name}
                        </h2>
                        
                            <div style={{ 
                                color: '#94a3b8', 
                                fontStyle: 'italic', 
                            marginBottom: '20px',
                            fontSize: '1.2rem',
                            textAlign: 'center',
                            maxWidth: '400px'
                            }}>
                                {canDefeatBoss ? "The beast wavers... deliver the final blow!" : 
                                 selectedBoss.progress.currentHP <= 1 ? "Weakened but not defeated. Complete your main quests!" :
                                 isDemoBoss ? "Ready for training! Practice your abilities..." : "Your procrastination feeds my power..."}
                            </div>
                            
                        {/* Enhanced Boss HP Bar */}
                        <div style={{ width: '500px', margin: '0 auto' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                fontSize: '16px',
                                marginBottom: '8px',
                                fontWeight: 'bold'
                            }}>
                                <span style={{ color: '#ef4444' }}>BOSS HP</span>
                                <span style={{ color: '#fbbf24' }}>
                                    {selectedBoss.progress.currentHP}/{selectedBoss.boss.stats.maxHP}
                                </span>
                                </div>
                                <div style={{
                                    width: '100%',
                                height: '30px',
                                    backgroundColor: '#374151',
                                borderRadius: '15px',
                                border: '3px solid #4b5563',
                                overflow: 'hidden',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        backgroundColor: getHPColor(bossHPPercentage),
                                        width: `${bossHPPercentage}%`,
                                    transition: 'all 0.8s ease',
                                    borderRadius: '12px',
                                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                                    background: `linear-gradient(90deg, ${getHPColor(bossHPPercentage)} 0%, ${getHPColor(bossHPPercentage)}CC 100%)`
                                    }} />
                                </div>
                                {selectedBoss.progress.currentHP <= 1 && !isDemoBoss && (
                                    <div style={{
                                        textAlign: 'center',
                                    color: '#fbbf24',
                                    fontSize: '16px',
                                    marginTop: '8px',
                                    fontWeight: 'bold'
                                    }}>
                                        ⚠️ Boss immune to attacks - complete main quests to win!
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                {/* Right Panel - Tasks & Moves */}
                    <div className={styles.bossQuestsPanel}>
                    {/* Tasks Section */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            <h3 className={styles.bossQuestsTitle}>
                                📋 Boss Quests ({linkedTasks.length})
                                </h3>
                            <button
                                onClick={refreshBossQuests}
                                className={styles.refreshButton}
                            >
                                🔄 Refresh
                            </button>
                        </div>
                        
                                <div style={{ 
                                    overflowY: 'auto',
                                    marginBottom: '12px'
                                }}>
                            {linkedTasks.length > 0 ? linkedTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => !task.completed && handleTaskCompletion(task.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                        padding: '12px',
                                        margin: '6px 0',
                                                backgroundColor: task.completed ? '#22c55e20' : '#334155',
                                        border: `2px solid ${task.completed ? '#22c55e' : '#475569'}`,
                                        borderRadius: '10px',
                                                color: task.completed ? '#22c55e' : '#e2e8f0',
                                        fontSize: '14px',
                                                cursor: task.completed ? 'default' : 'pointer',
                                                opacity: task.completed ? 0.7 : 1,
                                        transition: 'all 0.3s ease',
                                        boxShadow: task.completed ? '0 2px 8px rgba(34, 197, 94, 0.3)' : '0 2px 8px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            <span style={{
                                        fontSize: '1.5rem',
                                        marginRight: '12px',
                                                opacity: task.completed ? 1 : 0.6
                                            }}>
                                                {task.completed ? '✅' : '☐'}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ 
                                                    fontWeight: task.completed ? 'normal' : 'bold',
                                            textDecoration: task.completed ? 'line-through' : 'none',
                                            marginBottom: '4px'
                                                }}>
                                                    {task.text}
                                                </div>
                                                <div style={{ 
                                            fontSize: '12px', 
                                                    opacity: 0.7,
                                                display: 'flex',
                                            gap: '8px'
                                        }}>
                                            <span>💥{task.damageValue} dmg</span>
                                            <span>⭐{task.xp} XP</span>
                                            <span>🪙{task.cp} CP</span>
                                                        </div>
                                                        </div>
                                                    </div>
                            )) : (
                                                    <div style={{
                                    padding: '20px',
                                    textAlign: 'center',
                                    color: '#94a3af',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid #3b82f6',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📝</div>
                                    <div>No boss quests found</div>
                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                        Click "Refresh" to scan for quests
                                    </div>
                                </div>
                            )}
                                </div>
                            </div>

                    {/* Battle moves removed from here - now in separate card below */}
                        </div>
                    </div>

                {/* Dedicated Battle Moves Card */}
                <div style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    borderRadius: '16px',
                    border: '3px solid #a855f7',
                    padding: '16px',
                    marginBottom: '12px',
                    minHeight: '200px',
                    overflow: 'visible'
                }}>
                    <h2 style={{ 
                        color: '#a855f7', 
                        marginBottom: '20px', 
                        fontSize: '1.5rem',
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}>
                        ⚡ Battle Moves
                    </h2>
                    
                    {/* Responsive grid for better visibility */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        gap: '24px',
                        maxWidth: '1200px',
                        margin: '0 auto'
                    }}>
                        {selectedBoss.boss.id === 'skill-demo-boss-001' && availableMoves.length > 0 ? 
                            availableMoves.slice(0, 4).map(move => {
                                const calculation = moveCalculations[move.name];
                                const statCP = skillStats[move.statScaling.primaryStat]?.totalCP || 0;
                                const disabled = selectedBoss.progress.currentHP <= 1;
                                
                                // Get stat icon
                                const getStatIcon = (stat: string) => {
                                    const icons = {
                                        'strength': '💪', 'endurance': '🏃', 'mindfulness': '🧠',
                                        'intelligence': '🧬', 'creativity': '🎨', 'willpower': '🔥',
                                        'patience': '⏳', 'dexterity': '⚡', 'charisma': '💫'
                                    };
                                    return icons[stat as keyof typeof icons] || '⭐';
                                };
                                
                                return (
                                    <button
                                        key={move.name}
                                        onClick={() => {
                                            if (!disabled) {
                                                handleAbilityUse(move.name, statCP);
                                            }
                                        }}
                                        disabled={disabled}
                                        style={{
                                            padding: '20px',
                                            borderRadius: '16px',
                                            border: '3px solid',
                                            borderColor: disabled ? '#4b5563' : '#22c55e',
                                            backgroundColor: disabled ? '#374151' : 'rgba(34, 197, 94, 0.15)',
                                            color: disabled ? '#9ca3af' : '#ffffff',
                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s ease',
                                            fontSize: '16px',
                                            textAlign: 'center',
                                            minHeight: '140px',
                                            maxHeight: '140px',
                                            height: '140px',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '12px',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            margin: 0,
                                            outline: 'none'
                                        }}
                                    >
                                        {/* Move Header */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            width: '100%',
                                            position: 'relative',
                                            zIndex: 1,
                                            flex: '0 0 auto'
                                        }}>
                                            <span style={{ fontSize: '28px' }}>
                                                {getStatIcon(move.statScaling.primaryStat)}
                                            </span>
                                            <span style={{ 
                                                fontWeight: 'bold', 
                                                fontSize: '16px',
                                                lineHeight: '1.2',
                                                textAlign: 'center'
                                            }}>
                                                {move.name}
                                            </span>
                                        </div>
                                        
                                        {/* Stat Info */}
                                        <div style={{ 
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            width: '100%',
                                            textAlign: 'center',
                                            position: 'relative',
                                            zIndex: 1,
                                            boxSizing: 'border-box',
                                            flex: '0 0 auto'
                                        }}>
                                            <div style={{ 
                                                fontSize: '13px', 
                                                color: '#86efac', 
                                                marginBottom: '4px',
                                                textTransform: 'capitalize'
                                            }}>
                                                {move.statScaling.primaryStat}
                                            </div>
                                            <div style={{ 
                                                fontSize: '15px', 
                                                color: '#ffffff', 
                                                fontWeight: 'bold'
                                            }}>
                                                {statCP} CP
                                            </div>
                                        </div>
                                        
                                        {/* Damage Display */}
                                        <div style={{ 
                                            fontSize: '18px', 
                                            color: '#22c55e', 
                                            fontWeight: 'bold',
                                            background: 'rgba(34, 197, 94, 0.2)',
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                            position: 'relative',
                                            zIndex: 1,
                                            boxSizing: 'border-box',
                                            flex: '0 0 auto'
                                        }}>
                                            {calculation ? `${calculation.totalPower} DMG` : `${move.power} base DMG`}
                                        </div>
                                    </button>
                                );
                            }) : (
                                // Enhanced default moves with stat associations
                                [
                                    { name: 'Task Strike', icon: '⚔️', damage: 50, color: '#ef4444', stat: 'strength', statIcon: '💪' },
                                    { name: 'Focus Beam', icon: '🧠', damage: 60, color: '#3b82f6', stat: 'intelligence', statIcon: '🧠' },
                                    { name: 'Motivation Surge', icon: '🔥', damage: 0, color: '#f59e0b', stat: 'charisma', statIcon: '✨' },
                                    { name: 'Deadline Rush', icon: '⚡', damage: 70, color: '#84cc16', stat: 'dexterity', statIcon: '🏃' }
                                ].map((move, index) => (
                                    <button
                                        key={move.name}
                                        onClick={() => handleAbilityUse(move.name, 0)}
                                        style={{
                                            padding: '20px',
                                            borderRadius: '16px',
                                            border: `3px solid ${move.color}`,
                                            backgroundColor: `${move.color}25`,
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            fontSize: '16px',
                                            textAlign: 'center',
                                            minHeight: '140px',
                                            maxHeight: '140px',
                                            height: '140px',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '12px',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            margin: 0,
                                            outline: 'none'
                                        }}
                                    >
                                        {/* Move Header */}
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '10px',
                                            width: '100%',
                                            position: 'relative',
                                            zIndex: 1,
                                            flex: '0 0 auto'
                                        }}>
                                            <span style={{ fontSize: '28px' }}>{move.icon}</span>
                                            <span style={{ 
                                                fontWeight: 'bold', 
                                                fontSize: '16px',
                                                lineHeight: '1.2',
                                                textAlign: 'center'
                                            }}>
                                                {move.name}
                                            </span>
                                        </div>
                                        
                                        {/* Stat Association */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '6px',
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            textTransform: 'capitalize',
                                            border: '1px solid rgba(255, 255, 255, 0.2)'
                                        }}>
                                            <span>{move.statIcon}</span>
                                            <span>{move.stat}</span>
                                            <span style={{ 
                                                background: move.color, 
                                                color: 'white', 
                                                borderRadius: '4px', 
                                                padding: '2px 6px',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            }}>
                                                {playerData?.stats?.[move.stat] || 1}
                                            </span>
                                        </div>
                                        
                                        {/* Spacer for consistent layout */}
                                        <div style={{ flex: 1 }}></div>
                                        
                                        {/* Damage Display */}
                                        <div style={{ 
                                            fontSize: '18px', 
                                            color: move.color, 
                                            fontWeight: 'bold',
                                            background: `${move.color}30`,
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            border: `1px solid ${move.color}50`,
                                            position: 'relative',
                                            zIndex: 1,
                                            boxSizing: 'border-box',
                                            flex: '0 0 auto'
                                        }}>
                                            {move.damage > 0 ? `${move.damage} DMG` : 'BUFF'}
                                        </div>
                                    </button>
                                ))
                            )}
                    </div>
                </div>

                {/* Battle Log */}
                <div style={{
                    background: 'rgba(30, 41, 59, 0.9)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginTop: '16px',
                    border: '2px solid #475569',
                    minHeight: '200px',
                    maxHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        marginBottom: '12px',
                        color: '#fbbf24',
                        textAlign: 'center'
                    }}>
                        📜 BATTLE LOG
                    </h3>
                    <div 
                        ref={(el) => {
                            if (el && battleLog.length > 0) {
                                el.scrollTop = el.scrollHeight;
                            }
                        }}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                        {battleLog.length > 0 ? battleLog.slice(-10).map((log, index) => (
                            <div key={index} style={{ 
                                fontSize: '14px', 
                                color: '#cbd5e1', 
                                marginBottom: '8px',
                                padding: '6px 10px',
                                background: log.includes('damage') || log.includes('DMG') ? 'rgba(239, 68, 68, 0.15)' :
                                            log.includes('defeated') || log.includes('victory') ? 'rgba(255, 215, 0, 0.15)' :
                                            log.includes('Training') || log.includes('completed') ? 'rgba(16, 185, 129, 0.15)' :
                                            'rgba(59, 130, 246, 0.15)',
                                borderRadius: '6px',
                                borderLeft: `3px solid ${
                                    log.includes('damage') || log.includes('DMG') ? '#ef4444' :
                                    log.includes('defeated') || log.includes('victory') ? '#ffd700' :
                                    log.includes('Training') || log.includes('completed') ? '#10b981' :
                                    '#3b82f6'
                                }`,
                                lineHeight: '1.4'
                            }}>
                                {log}
                            </div>
                        )) : (
                            <div style={{
                                fontSize: '14px',
                                color: '#9ca3af',
                                textAlign: 'center',
                                fontStyle: 'italic',
                                padding: '20px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                lineHeight: '1.6'
                            }}>
                                🎯 Battle ready! Use moves to attack or complete quests to deal damage.
                                <br/><br/>
                                💪 Your attacks will appear here along with battle progress updates.
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Panel - Battle Actions */}
                        <div style={{
                    background: 'rgba(30, 41, 59, 0.9)',
                    borderRadius: '12px',
                    border: '2px solid #475569',
                    padding: '20px',
                    marginTop: '16px',
                            display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    minHeight: '80px'
                        }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                            onClick={async () => {
                                if (taskIntegrationService && selectedBoss) {
                                    try {
                                        const tasks = await taskIntegrationService.scanVaultForTasks();
                                        loadLinkedTasksForBoss(selectedBoss.boss.id);
                                        setBattleLog(prev => [...prev.slice(-2), `🔄 Scanned vault - Found ${tasks.length} total tasks`]);
                                    } catch (error) {
                                        console.error('Failed to scan vault:', error);
                                    }
                                }
                            }}
                                    style={{
                                padding: '10px 16px',
                                backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                borderRadius: '8px',
                                    cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                                }}
                            >
                            🔍 Scan Vault
                            </button>
                        
                                <button 
                            onClick={async () => {
                                if (taskIntegrationService && selectedBoss) {
                                    try {
                                        const linkedTaskIds = await taskIntegrationService.autoLinkTasksToBoss(selectedBoss.boss);
                                        loadLinkedTasksForBoss(selectedBoss.boss.id);
                                        setBattleLog(prev => [...prev.slice(-2), `🔗 Auto-linked ${linkedTaskIds.length} tasks to ${selectedBoss.boss.name}`]);
                                    } catch (error) {
                                        console.error('Failed to auto-link tasks:', error);
                                    }
                                }
                                    }}
                                    style={{
                                padding: '10px 16px',
                                backgroundColor: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                borderRadius: '8px',
                                        cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                                    }}
                                >
                            🔗 Auto-link Tasks
                                </button>
                        </div>

                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        padding: '12px',
                        maxWidth: '400px'
                    }}>
                        <div style={{ fontSize: '14px', color: '#60a5fa', textAlign: 'center' }}>
                            <strong>How it works:</strong> {isDemoBoss ? 
                                'Practice using abilities and watch your progress. This is a safe training environment!' :
                                'Complete tasks in Obsidian to damage the boss. Click vault tasks to mark as complete and deal damage!'}
                        </div>
                    </div>
                </div>

                {/* Add CSS animations */}
                <style>{`
                    @keyframes battleIdle {
                        0% { transform: translateY(0px) scale(1); }
                        100% { transform: translateY(-5px) scale(1.02); }
                    }
                `}</style>
                </div>
            </div>
        );
    }

    // Show unified battle if active
    window.console.log('Checking unified battle conditions:', {
        showUnifiedBattle,
        hasUnifiedBattle: !!unifiedBattle,
        hasSelectedBoss: !!selectedBoss,
        activeTab
    });
    
    if (showUnifiedBattle && unifiedBattle && selectedBoss) {
        window.console.log('Rendering tactical battle component with stats:', playerBattleStats);
        
        // Find the source quest to get real subtasks
        const sourceQuest = quests.find((q: Quest) =>
            q.id === selectedBoss.boss.questId ||
            q.title === selectedBoss.boss.questTitle ||
            q.title === selectedBoss.boss.title
        );
        
        console.log('🔍 Looking for source quest:', {
            bossQuestId: selectedBoss.boss.questId,
            bossQuestTitle: selectedBoss.boss.questTitle,
            bossTitle: selectedBoss.boss.title,
            foundQuest: !!sourceQuest,
            questSubtasks: sourceQuest?.subtasks?.length || 0
        });
        
        // Convert boss to quest format for TacticalBattleUI
        const questFromBoss: Quest = {
            id: selectedBoss.boss.id,
            title: selectedBoss.boss.title,
            className: 'boss',
            stats: [],
            xp: selectedBoss.boss.rewards?.xp || 100,
            cp: selectedBoss.boss.rewards?.cp || 50,
            coins: selectedBoss.boss.rewards?.coins || 25,
            priority: 'medium',
            difficulty: 'medium',
            due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            skills: [],
            description: selectedBoss.boss.description || 'A challenging boss battle',
            subtasks: sourceQuest?.subtasks || [
                { text: 'Complete practice task 1', completed: false },
                { text: 'Complete practice task 2', completed: false },
                { text: 'Complete practice task 3', completed: false }
            ], // Use real subtasks if found, or default training tasks
            completed: false,
            tags: ['boss', 'battle', 'practice'],
            estimatedTime: '60',
            energyCost: 20
        };

        // Convert player stats to PlayerData format (use real player data if available)
        const battlePlayerData: PlayerData = {
            name: playerData?.name || 'Player',
            avatar: playerData?.avatar || '🧙',
            rank: playerData?.rank || 'Adventurer',
            masterClass: playerData?.masterClass || 'Warrior',
            description: playerData?.description || 'A skilled fighter',
            level: playerData?.level || 5,
            xp: playerData?.xp || 2500,
            xpRequired: playerData?.xpRequired || 3000,
            total_exp: playerData?.total_exp || 8500,
            coins: playerData?.coins || 1250,
            cp: playerData?.cp || 500,
            inventory: playerData?.inventory || [],
            stats: {
                energy: playerData?.stats?.energy || 70,
                focus: playerData?.stats?.focus || 80,
                motivation: playerData?.stats?.motivation || 75,
                strength: playerBattleStats.strength || playerData?.stats?.strength || 75,
                intelligence: playerBattleStats.intelligence || playerData?.stats?.intelligence || 82,
                creativity: playerBattleStats.creativity || playerData?.stats?.creativity || 68,
                communication: playerBattleStats.charisma || playerData?.stats?.communication || 71,
                speed: playerBattleStats.dexterity || playerData?.stats?.speed || 79,
                wisdom: playerBattleStats.faith || playerData?.stats?.wisdom || 65
            },
            lastDailyReset: playerData?.lastDailyReset || new Date().toISOString()
        };

        return (
            <TacticalBattleUI
                quest={questFromBoss}
                playerData={battlePlayerData}
                plugin={plugin}
                onQuestComplete={(questTitle) => {
                    console.log('Quest completed:', questTitle);
                    closeUnifiedBattle();
                }}
                onQuestFail={(questTitle) => {
                    console.log('Quest failed:', questTitle);
                    closeUnifiedBattle();
                }}
                onSubtaskToggle={(questTitle, subtaskIndex) => {
                    handleSubtaskComplete(subtaskIndex.toString());
                }}
                onClose={closeUnifiedBattle}
            />
        );
    }


    return (
        <div style={{
            width: '100%',
            height: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            color: '#ffffff',
            overflowY: 'auto',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}>
            {/* Loading Indicator */}
            <LoadingIndicator />
            
            {/* Tab Navigation */}
            <div style={{
                padding: '20px 20px 0',
                borderBottom: '2px solid #4a4a5a',
                background: 'rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                    <button
                        onClick={() => setActiveTab('tutorial')}
                        style={tabButtonStyle(activeTab === 'tutorial')}
                    >
                        📚 Tutorial
                    </button>
                    <button
                        onClick={() => setActiveTab('selection')}
                        style={tabButtonStyle(activeTab === 'selection')}
                    >
                        ⚔️ Boss Selection
                    </button>
                    <button
                        onClick={() => setActiveTab('creation')}
                        style={tabButtonStyle(activeTab === 'creation')}
                    >
                        🔨 Create Boss
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        style={tabButtonStyle(activeTab === 'analytics')}
                    >
                        📊 Analytics
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div style={{ minHeight: 'calc(100vh - 100px)' }}>
                {activeTab === 'tutorial' && renderTutorialTab()}
                {activeTab === 'selection' && renderBossSelectionTab()}
                {activeTab === 'creation' && (
                    <BossCreatorTab
                        vault={plugin.app.vault}
                        onCreate={async (_boss) => {
                            await loadAvailableBosses();
                            setActiveTab('selection');
                        }}
                    />
                )}
                {activeTab === 'analytics' && <BossAnalyticsUI playerData={playerData} />}
            </div>
        </div>
    );
};
