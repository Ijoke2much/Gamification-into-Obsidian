import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TFile, MarkdownView } from 'obsidian';
import { PomodoroTimer } from '../../../features/pomodoro/components/PomodoroTimer';
import { PomodoroRewardDisplay } from '../../../features/pomodoro/components/PomodoroRewardDisplay';
import { EnhancedPomodoroNotification, EnhancedNotificationManager } from '../../../features/pomodoro/components/EnhancedPomodoroNotification';
import { MaterialInventoryManager } from '../../../shared/services/materialInventoryManager';
import { updatePlayerData } from '../../../shared/utils/progressUpdater';
import GamifiedObsidianPlugin from '../../../core/main';
import { PlayerData } from '../../../data/models/PlayerData';

import { PomodoroStatsManager, SESSION_TYPES } from "../../../features/pomodoro/utils/pomodoroStatsManager";
import { handleCompleteQuestFromPomodoro } from "../../../features/quests/utils/questUtils";
import styles from '../../../features/pomodoro/components/PomodoroTimer.module.css';
import { AttachTaskModal } from '../../../features/pomodoro/modals/AttachTaskModal';
import { CustomInputModal } from '../../../features/pomodoro/modals/CustomInputModal';
import QuestSuggestionModal from '../../../features/pomodoro/modals/QuestSuggestionModal';
import { QuestSuggestion } from '../../../features/pomodoro/types/EnhancedTaskLinking';
import { QuestProgressTracker } from '../../../features/pomodoro/services/questProgressTracker';
import { QuestRewardSystem, QuestPerformanceMetrics } from '../../../features/pomodoro/services/questRewardSystem';
import { EnergyCalculationService, TaskEnergyProfile } from '../../../features/energy/services/energyCalculationService';
import { EnergyManagementSystem } from '../../../features/energy/utils/energyManagementSystem';
import { notificationService } from '../../../shared/services/notificationService';
import { currencyDisplay } from '../../../shared/services/currencyDisplayService';

// Enhanced notification type
interface EnhancedNotification {
    id: string;
    type: 'subtask_complete' | 'quest_progress' | 'session_complete' | 'achievement' | 'material_reward';
    title: string;
    message: string;
    icon: string;
    progress?: number;
    rewards?: {
        xp?: number;
        cp?: number;
        currency?: number;
        materials?: Array<{
            name: string;
            icon: string;
            quality: string;
        }>;
    };
    duration?: number;
    timestamp: number;
}

// Use the correct type from PomodoroStatsManager
type PomodoroStats = ReturnType<typeof PomodoroStatsManager.loadStats>;

// Interface for the Pomodoro Tab
interface PomodoroTabProps {
  plugin: GamifiedObsidianPlugin;
  playerData: PlayerData;
  reloadPlayerData: () => void;
}

// Pomodoro Tab Component
export const PomodoroTab: React.FC<PomodoroTabProps> = React.memo(({
  plugin,
  playerData,
  reloadPlayerData,
}) => {
  // Ensure currency display service is initialized
  currencyDisplay.initialize(plugin.settings);
  
  const currencyName = currencyDisplay.getCurrencyName();
  const currencySymbol = currencyDisplay.getCurrencySymbol();
  
  // Use refs for stable references that don't trigger re-renders
  const pluginRef = useRef(plugin);
  const playerDataRef = useRef(playerData);
  const reloadPlayerDataRef = useRef(reloadPlayerData);
  
  // Enhanced state management
  const [duration, setDuration] = useState(25 * 60); // seconds
  const [timerMode, setTimerMode] = useState<'classic' | 'extended' | 'short' | 'custom' | 'deepWork' | 'quickFocus'>('classic');
  const [shouldAutoStart, setShouldAutoStart] = useState(false);
  
  // Statistics and achievements
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats>(() => PomodoroStatsManager.loadStats());
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const timerSectionRef = useRef<HTMLDivElement>(null);

  // Enhanced reward display state
  const [showRewardDisplay, setShowRewardDisplay] = useState(false);
  const [currentRewards, setCurrentRewards] = useState({
    xp: 0,
    cp: 0,
    currency: 0,
    materials: [] as Array<{
      name: string;
      icon: string;
      quality: string;
      rarity: string;
    }>
  });

  // Quest suggestion modal state
  const [showQuestSuggestions, setShowQuestSuggestions] = useState(false);

  // Quest progress tracking
  const [questProgressTracker] = useState(() => new QuestProgressTracker(plugin.app));
  const [activeQuestSessionId, setActiveQuestSessionId] = useState<string | null>(null);


  // Energy and hyperfocus management
  const [energyService] = useState(() => new EnergyCalculationService());
  const [isHyperfocusMode, setIsHyperfocusMode] = useState(false);
  const [hyperfocusSessionId, setHyperfocusSessionId] = useState<string | null>(null);
  const [energyState, setEnergyState] = useState(() => energyService.getEnergyState());



  // Custom session duration (in seconds) for the "Custom" card
  const [customDuration, setCustomDuration] = useState<number>(0);
  
  // Stable quest state to prevent resetting during re-renders
  const [attachedQuest, setAttachedQuest] = useState<{
    title: string;
    progress: number;
    subtasks?: Array<{ completed: boolean; text: string }>;
    difficulty?: string;
    priority?: string;
    rewards?: { xp: number; coins: number; cp?: number; materials?: string[] };
    description?: string;
    dueDate?: string;
    tags?: string[];
    skills?: string[];
    filePath?: string;
    lineNumber?: number;
    isTimedQuest?: boolean;
  } | null>(null);

  // Test: Show reward display on component mount for testing
  useEffect(() => {
    // Only show test reward display if no quest is attached
    if (!attachedQuest) {
      setTimeout(() => {
        setCurrentRewards({
          xp: 125,
          cp: 60,
          currency: 40,
          materials: [
            { name: 'Focus Crystal', icon: '💎', quality: 'masterwork', rarity: 'rare' },
            { name: 'Time Essence', icon: '🔮', quality: 'refined', rarity: 'uncommon' },
            { name: 'Energy Shard', icon: '⚡', quality: 'normal', rarity: 'common' }
          ]
        });
        setShowRewardDisplay(true);
      }, 2000); // Show after 2 seconds
    }
  }, [attachedQuest]);

  // Update energy state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newEnergyState = energyService.getEnergyState();
      setEnergyState(newEnergyState);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [energyService]);

  // Stable quest setter to prevent unnecessary re-renders
  const stableSetAttachedQuest = useCallback((quest: typeof attachedQuest | ((prev: typeof attachedQuest) => typeof attachedQuest)) => {
    if (typeof quest === 'function') {
      setAttachedQuest(quest);
    } else {
      setAttachedQuest(quest);
    }
  }, []);

  // Enhanced notification system - uses both global and local notifications
  const addNotification = useCallback((notification: Omit<EnhancedNotification, 'id' | 'timestamp'>) => {
    const newNotification: EnhancedNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setNotifications(prev => [...prev, newNotification]);

    // Also send to global notification system for better visibility
    try {
      // Map our enhanced types to global notification types
      let globalType = 'info';
      switch (notification.type) {
        case 'achievement':
          globalType = 'achievement';
          break;
        case 'quest_progress':
        case 'subtask_complete':
          globalType = 'success';
          break;
        case 'session_complete':
          globalType = 'success';
          break;
        case 'material_reward':
          globalType = 'info';
          break;
        default:
          globalType = 'info';
      }

      notificationService.info(
        notification.title,
        notification.message,
        3000
      );
    } catch (error) {
      console.warn('Failed to send global notification:', error);
    }
  }, []);

  // Handle quest suggestion selection
  const handleQuestSuggestionSelect = useCallback((suggestion: QuestSuggestion) => {
    const quest = suggestion.quest;
    const attachedQuest = {
      title: quest.title,
      progress: 0,
      difficulty: quest.difficulty,
      rewards: { 
        xp: quest.rewards.baseXP,
        coins: quest.rewards.baseCoins,
        cp: quest.rewards.cp,
        materials: quest.rewards.materials || []
      },
      description: quest.description || 'Complete this quest to earn rewards!',
      dueDate: quest.dueDate,
      subtasks: quest.subtasks.map(subtask => ({
        completed: subtask.completed,
        text: subtask.text
      })),
      tags: quest.tags,
      skills: quest.skills,
      filePath: quest.filePath,
      lineNumber: quest.lineNumber,
      isTimedQuest: quest.isTimedQuest
    };

    stableSetAttachedQuest(attachedQuest);

    // Create energy profile for the quest
    const energyProfile = energyService.createTaskEnergyProfile(quest);
    const energyRecommendation = energyService.getEnergyRecommendation(energyProfile);

    // Start quest progress tracking
    const sessionId = questProgressTracker.startQuestTracking(quest, timerMode);
    setActiveQuestSessionId(sessionId);

    // Show energy-based notification
    const energyMessage = energyRecommendation.warningLevel === 'high' ? 
      `⚠️ Low energy! Consider resting first.` :
      energyRecommendation.hyperfocusRecommended ?
      `🧠 Perfect for hyperfocus! ${energyRecommendation.suggestions[0]}` :
      `✅ Energy levels good for this quest.`;

    addNotification({
      type: 'quest_progress',
      title: 'Quest Attached!',
      message: `${quest.title} - ${energyMessage}`,
      icon: '🎯',
      duration: 4000,
    });
  }, [stableSetAttachedQuest, addNotification, questProgressTracker, timerMode, energyService]);

  // Helper to check if quest is eligible for hyperfocus
  const isHyperfocusEligible = useCallback((q: { priority?: string; difficulty?: string } | null) => {
    if (!q) return false;
    const p = (q.priority || '').toLowerCase();
    const d = (q.difficulty || '').toLowerCase();
    return p === 'high' || p === 'highest' || d === 'hard' || d === 'epic';
  }, []);

  // Handle hyperfocus mode toggle
  const handleHyperfocusToggle = useCallback(() => {
    if (!attachedQuest) {
      addNotification({
        type: 'quest_progress',
        title: 'No Quest Attached',
        message: 'Attach a quest first to enable hyperfocus mode',
        icon: '⚠️',
        duration: 3000,
      });
      return;
    }

    if (!isHyperfocusEligible(attachedQuest)) {
      addNotification({
        type: 'quest_progress',
        title: 'Hyperfocus Not Available',
        message: 'Only available for high-priority or high-difficulty quests',
        icon: '🧠',
        duration: 3000,
      });
      return;
    }

    if (!energyService.canEnterHyperfocus()) {
      addNotification({
        type: 'quest_progress',
        title: 'Hyperfocus Unavailable',
        message: 'Not enough energy or hyperfocus is on cooldown',
        icon: '🔋',
        duration: 3000,
      });
      return;
    }

    if (!isHyperfocusMode) {
      // Start hyperfocus mode
      const energyProfile = energyService.createTaskEnergyProfile(attachedQuest);
      const session = energyService.startHyperfocusSession(energyProfile);
      setHyperfocusSessionId(session.sessionId);
      setIsHyperfocusMode(true);

      addNotification({
        type: 'achievement',
        title: '🧠 Hyperfocus Activated!',
        message: 'Entering deep focus mode for maximum productivity',
        icon: '🧠',
        duration: 4000,
      });
    } else {
      // End hyperfocus mode
      if (hyperfocusSessionId) {
        const completedTasks = attachedQuest.subtasks?.filter(s => s.completed).map(s => s.text) || [];
        energyService.endHyperfocusSession(hyperfocusSessionId, 15, completedTasks); // Assume 15 energy consumed
        setHyperfocusSessionId(null);
      }
      setIsHyperfocusMode(false);

      addNotification({
        type: 'session_complete',
        title: 'Hyperfocus Session Complete',
        message: 'Great focus! Your energy will regenerate over time',
        icon: '💤',
        duration: 3000,
      });
    }
  }, [attachedQuest, energyService, isHyperfocusMode, hyperfocusSessionId, addNotification, isHyperfocusEligible]);

  // Update refs when props change (but don't trigger re-renders)
  useEffect(() => {
    pluginRef.current = plugin;
    playerDataRef.current = playerData;
    reloadPlayerDataRef.current = reloadPlayerData;
  }, [plugin, playerData, reloadPlayerData]);

  // Load stats on mount only
  useEffect(() => {
    const savedStats = PomodoroStatsManager.loadStats();
    setPomodoroStats(savedStats);
  }, []);

  // Listen for quest tab switching to Pomodoro with attached quest
  useEffect(() => {
    window.console.log('🎧 PomodoroTab: Setting up event listener for switchToPomodoroTab');
    
    const handleSwitchToPomodoroTab = (event: CustomEvent) => {
      window.console.log('🎧 PomodoroTab: Received switchToPomodoroTab event:', event);
      const { attachedQuest, enableHyperfocus } = event.detail;
      if (attachedQuest) {
        window.console.log('🎯 Received quest from Quest tab:', attachedQuest.title);
        
        // Parse quest estimated time (minutes) or quickSeconds override and set duration
        const quickSeconds = (attachedQuest as any).quickSeconds as number | undefined;
        const estimatedMinutes = attachedQuest.estimatedTime || 25; // Default to 25 minutes
        const durationInSeconds = typeof quickSeconds === 'number' ? quickSeconds : (estimatedMinutes * 60);
        window.console.log(`⏱️ Setting timer duration to ${estimatedMinutes} minutes (${durationInSeconds} seconds)`);
        
        setDuration(durationInSeconds);
        setCustomDuration(durationInSeconds);
        setTimerMode('custom'); // Use custom mode to respect the quest's duration
        
        // Set the attached quest
        stableSetAttachedQuest(attachedQuest);
        
        // Start quest progress tracking
        const sessionId = questProgressTracker.startQuestTracking(attachedQuest as any, 'custom');
        setActiveQuestSessionId(sessionId);
        
        // Set flag to auto-start the timer
        setShouldAutoStart(true);
        window.console.log('🎬 Auto-start flag set to true');
        // Center the timer in view shortly after state updates
        setTimeout(() => {
          try {
            timerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch {}
        }, 50);
        
        // If hyperfocus was requested, enable it after a short delay
        if (enableHyperfocus) {
          window.console.log('🧠 Hyperfocus requested - will enable after quest attachment');
          setTimeout(() => {
            if (isHyperfocusEligible(attachedQuest) && energyService.canEnterHyperfocus()) {
              const energyProfile = energyService.createTaskEnergyProfile(attachedQuest);
              const session = energyService.startHyperfocusSession(energyProfile);
              setHyperfocusSessionId(session.sessionId);
              setIsHyperfocusMode(true);
              window.console.log('🧠 Hyperfocus mode activated');
              
              addNotification({
                type: 'achievement',
                title: '🧠 Hyperfocus Activated!',
                message: 'Entering deep focus mode for maximum productivity',
                icon: '🧠',
                duration: 4000,
              });
            } else {
              window.console.log('⚠️ Hyperfocus not available - quest ineligible or insufficient energy');
            }
          }, 100);
        }
        
        // Show notification
        addNotification({
          type: 'quest_progress',
          title: 'Quest Attached!',
          message: `${attachedQuest.title} - ${estimatedMinutes} min timer${enableHyperfocus ? ' with hyperfocus' : ''} starting`,
          icon: enableHyperfocus ? '🧠' : '🚀',
          duration: 3000,
        });
      } else {
        window.console.log('⚠️ No attached quest in event detail');
      }
    };

    window.addEventListener('switchToPomodoroTab', handleSwitchToPomodoroTab as EventListener);
    window.console.log('🎧 PomodoroTab: Event listener registered');
    
    return () => {
      window.removeEventListener('switchToPomodoroTab', handleSwitchToPomodoroTab as EventListener);
      window.console.log('🎧 PomodoroTab: Event listener removed');
    };
  }, [stableSetAttachedQuest, questProgressTracker, timerMode, addNotification, isHyperfocusEligible, energyService]);

  // On mount: if a payload was stashed globally (in case event fired early), process it once
  useEffect(() => {
    const stash: any = (window as any).__nextPomodoroAttachedQuest;
    if (stash && stash.title) {
      try {
        window.console.log('📦 Found stashed Pomodoro payload; applying now:', stash.title);
        const quickSeconds = stash.quickSeconds as number | undefined;
        const estimatedMinutes = stash.estimatedTime || 25;
        const durationInSeconds = typeof quickSeconds === 'number' ? quickSeconds : (estimatedMinutes * 60);
        setDuration(durationInSeconds);
        setCustomDuration(durationInSeconds);
        setTimerMode('custom');
        stableSetAttachedQuest(stash);
        const sessionId = questProgressTracker.startQuestTracking(stash as any, 'custom');
        setActiveQuestSessionId(sessionId);
        setShouldAutoStart(true);
        setTimeout(() => {
          try {
            timerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch {}
        }, 50);
      } finally {
        (window as any).__nextPomodoroAttachedQuest = undefined;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enhanced save stats with better error handling and immediate saves for critical data
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        // For critical data changes (like session completion), save immediately
        if (pomodoroStats.totalSessions > 0 || pomodoroStats.currentStreak > 0) {
          await PomodoroStatsManager.saveStatsImmediately(pomodoroStats);
        } else {
          // For less critical changes, use debounced save
          PomodoroStatsManager.saveStats(pomodoroStats);
        }
      } catch (error) {
        console.error('Failed to save Pomodoro stats:', error);
        // Try to create a backup
        try {
          const backupKey = PomodoroStatsManager.createBackup();
          console.log('Created backup with key:', backupKey);
        } catch (backupError) {
          console.error('Failed to create backup:', backupError);
        }
      }
    }, 500); // 500ms delay to batch saves
    
    return () => clearTimeout(timeoutId);
  }, [pomodoroStats]);

  // Enhanced reload function with better error handling and retry logic
  const reloadPlayerDataSimple = useCallback(async () => {
    try {
      // Use playerStore refresh instead of the problematic reloadPlayerData callback
      const { playerStore } = await import('../../../shared/state/playerStore');
      await playerStore.refreshPlayerData();
    } catch (error) {
      console.error('Failed to reload player data:', error);
      // Retry once after a short delay
      setTimeout(async () => {
        try {
          const { playerStore } = await import('../../../shared/state/playerStore');
          await playerStore.refreshPlayerData();
        } catch (retryError) {
          console.error('Retry failed to reload player data:', retryError);
        }
      }, 1000);
    }
  }, []);

  // Calculate CP for quests based on difficulty and other factors
  const calculateQuestCP = useCallback((task: any) => {
    let baseCP = 5; // Base CP for any quest
    
    // Add CP based on difficulty
    const difficulty = task.tags?.find((tag: string) => tag.includes('difficulty'))?.replace('#difficulty-', '') || 'Normal';
    switch (difficulty.toLowerCase()) {
      case 'easy':
        baseCP += 2;
        break;
      case 'normal':
        baseCP += 5;
        break;
      case 'hard':
        baseCP += 10;
        break;
      case 'epic':
        baseCP += 15;
        break;
      case 'legendary':
        baseCP += 25;
        break;
    }
    
    // Add CP for timed quests
    if (task.tags?.some((tag: string) => tag === '#timed-quest')) {
      baseCP += 8;
    }
    
    // Add CP for quests with subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      baseCP += task.subtasks.length * 2;
    }
    
    // Add CP for quests with skills
    if (task.skills && task.skills.length > 0) {
      baseCP += task.skills.length * 3;
    }
    
    return baseCP;
  }, []);

  // Enhanced immediate save function for critical data
  const saveStatsImmediately = useCallback(async (stats: PomodoroStats) => {
    try {
      await PomodoroStatsManager.saveStatsImmediately(stats);
    } catch (error) {
      console.error('Immediate save failed:', error);
      // Fallback to regular save
      try {
        PomodoroStatsManager.saveStats(stats);
      } catch (fallbackError) {
        console.error('Fallback save also failed:', fallbackError);
      }
    }
  }, []);

  // Stable references for plugin methods to prevent unnecessary re-renders
  const stablePluginApp = useMemo(() => pluginRef.current.app, []);
  const stablePluginVault = useMemo(() => pluginRef.current.app.vault, []);

  // Enhanced file update function with better error handling
  const updateFileSafely = useCallback(async (filePath: string, lineNumber: number, updatedSubtasks: Array<{ completed: boolean; text: string }>) => {
    let originalLines: string[] = []; // Declare at function level
    
    try {
      const file = stablePluginVault.getAbstractFileByPath(filePath);
      if (!file || !(file instanceof TFile)) {
        throw new Error('File not found');
      }

      const content = await stablePluginVault.read(file);
      const lines = content.split('\n');
      originalLines = [...lines]; // Store original content for potential rollback

      // Find the main task line and update its subtasks
      let subtaskCounter = 0;
      for (let i = lineNumber; i < lines.length; i++) {
        const line = lines[i];
        if (subtaskCounter < updatedSubtasks.length) {
          const subtask = updatedSubtasks[subtaskCounter];
          const checkbox = subtask.completed ? '[x]' : '[ ]';
          lines[i] = line.replace(/^(\s*[-*]\s*)\[[ x]\](.*)/, `$1${checkbox}$2`);
          subtaskCounter++;
        } else if (line.match(/^[-*]\s*\[/) || line.trim() === '') {
          // Stop if we hit another main task or empty line
          break;
        }
      }
      
      await stablePluginVault.modify(file, lines.join('\n'));
    } catch (error) {
      console.error('Error updating subtask in file:', error);
      // Try to rollback if we have the original content
      if (originalLines.length > 0) {
        try {
          const file = stablePluginVault.getAbstractFileByPath(filePath);
          if (file && file instanceof TFile) {
            await stablePluginVault.modify(file, originalLines.join('\n'));
            console.log('Successfully rolled back file changes');
          }
        } catch (rollbackError) {
          console.error('Failed to rollback file changes:', rollbackError);
        }
      }
      throw error; // Re-throw to let caller handle it
    }
  }, [stablePluginVault]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Enhanced error notification with global system
  const addErrorNotification = useCallback((title: string, message: string) => {
    addNotification({
      type: 'achievement', // Use achievement type for errors to show them prominently
      title,
      message,
      icon: '❌',
      duration: 5000,
    });
  }, [addNotification]);

  // Enhanced success notification with global system
  const addSuccessNotification = useCallback((title: string, message: string) => {
    addNotification({
      type: 'session_complete', // Use session_complete type for success messages
      title,
      message,
      icon: '✅',
      duration: 3000,
    });
  }, [addNotification]);

  // Calculate quest progress based on subtasks
  const calculateQuestProgress = useCallback((subtasks?: Array<{ completed: boolean; text: string }>) => {
    if (!subtasks || subtasks.length === 0) return 0;
    const completedCount = subtasks.filter(task => task.completed).length;
    return Math.round((completedCount / subtasks.length) * 100);
  }, []);

  // Handle subtask toggle
  const handleSubtaskToggle = useCallback(async (subtaskIndex: number) => {
    if (!attachedQuest || !attachedQuest.subtasks) return;

    const updatedSubtasks = [...attachedQuest.subtasks];
    updatedSubtasks[subtaskIndex].completed = !updatedSubtasks[subtaskIndex].completed;
    
    const oldProgress = attachedQuest.progress;
    const newProgress = calculateQuestProgress(updatedSubtasks);
    const progressDelta = newProgress - oldProgress;
    
    stableSetAttachedQuest(prev => prev ? {
      ...prev,
      subtasks: updatedSubtasks,
      progress: newProgress
    } : null);

    // Track quest progress if session is active
    if (activeQuestSessionId) {
      try {
        await questProgressTracker.updateQuestProgress(
          activeQuestSessionId,
          {
            id: `${attachedQuest.filePath}:${attachedQuest.lineNumber}`,
            title: attachedQuest.title,
            filePath: attachedQuest.filePath || '',
            lineNumber: attachedQuest.lineNumber || 0,
            progress: newProgress,
            estimatedDuration: 25, // Default
            actualTimeSpent: 0,
            difficulty: attachedQuest.difficulty as any || 'medium',
            priority: 'medium',
            description: attachedQuest.description,
            dueDate: attachedQuest.dueDate,
            tags: attachedQuest.tags || [],
            skills: attachedQuest.skills || [],
            rewards: {
              baseXP: attachedQuest.rewards?.xp || 0,
              baseCoins: attachedQuest.rewards?.coins || 0,
              cp: attachedQuest.rewards?.cp || 0,
              materials: attachedQuest.rewards?.materials || []
            },
            subtasks: attachedQuest.subtasks.map(subtask => ({
              id: `${attachedQuest.filePath}:${attachedQuest.lineNumber}:${subtask.text}`,
              text: subtask.text,
              completed: subtask.completed,
              estimatedMinutes: 5
            })),
            pomodoroSessions: [],
            analytics: {
              totalSessions: 0,
              totalTimeSpent: 0,
              averageFocusScore: 0,
              completionRate: 0,
              estimatedVsActual: 1
            },
            status: 'active',
            attachedAt: new Date(),
            isTimedQuest: attachedQuest.isTimedQuest || false,
            isCriticalPath: false
          },
          progressDelta,
          subtaskIndex
        );
      } catch (error) {
        console.error('Error tracking quest progress:', error);
      }
    }

    // Update the actual markdown file if we have file info
    if (attachedQuest.filePath && attachedQuest.lineNumber) {
      try {
        await updateFileSafely(attachedQuest.filePath, attachedQuest.lineNumber, updatedSubtasks);
      } catch (error) {
        console.error('Error updating subtask in file:', error);
        addErrorNotification(
          'File Update Failed',
          'Could not update the quest file. Your progress has been saved locally.'
        );
      }
    }

    // Show feedback
    const subtask = updatedSubtasks[subtaskIndex];
    addNotification({
      type: subtask.completed ? 'subtask_complete' : 'quest_progress',
      title: subtask.completed ? 'Subtask Completed!' : 'Subtask Unchecked',
      message: `${subtask.text}`,
      icon: subtask.completed ? '✅' : '⬜',
      duration: 2000,
    });

    // Check if quest is fully completed
    if (newProgress === 100) {
      addNotification({
        type: 'achievement',
        title: 'Quest Ready!',
        message: 'All subtasks completed! Complete a Pomodoro session to claim rewards.',
        icon: '🎯',
        progress: 100,
        duration: 4000,
      });
    }
  }, [attachedQuest, stableSetAttachedQuest, calculateQuestProgress, addNotification, updateFileSafely, addErrorNotification]);

  // Handle quest completion (for quests without subtasks)
  const handleCompleteQuest = useCallback(async () => {
    if (!attachedQuest) return;

    // Mark the quest as completed in the file
    if (attachedQuest.filePath && attachedQuest.lineNumber) {
      try {
        await updateFileSafely(attachedQuest.filePath, attachedQuest.lineNumber, []); // Mark as completed
      } catch (error) {
        console.error('Error completing quest in file:', error);
        addErrorNotification(
          'File Update Failed',
          'Could not update the quest file. Your progress has been saved locally.'
        );
      }
    }

    // Give rewards
    handleCompleteQuestFromPomodoro(
      stablePluginApp,
      attachedQuest.title,
      stablePluginVault,
      (rewards) => {
        addNotification({
          type: 'achievement',
          title: 'Quest Completed!',
          message: `+${rewards.xp} XP, ${currencySymbol} +${rewards.coins} ${currencyName.toLowerCase()} earned!`,
          icon: '🏆',
          duration: 4000,
        });
        reloadPlayerDataSimple();
      }
    );

    // Clear the attached quest
    stableSetAttachedQuest(null);
  }, [attachedQuest, stablePluginApp, stablePluginVault, addNotification, reloadPlayerDataSimple, currencySymbol, currencyName, stableSetAttachedQuest, updateFileSafely, addErrorNotification]);

  // Check for achievement unlocks
  const checkAchievements = useCallback((stats: PomodoroStats) => {
    // Check for session milestones
    if (stats.totalSessions === 1) {
      addNotification({
        type: 'achievement',
        title: 'First Session!',
        message: 'You\'ve completed your first Pomodoro session!',
        icon: '🌱',
        duration: 4000,
      });
    }
    
    if (stats.totalSessions === 10) {
      addNotification({
        type: 'achievement',
        title: 'Focused Mind!',
        message: '10 sessions completed! You\'re building great habits!',
        icon: '🧘',
        duration: 4000,
      });
    }

    // Check for streak achievements
    if (stats.currentStreak === 3) {
      addNotification({
        type: 'achievement',
        title: 'Building Habits!',
        message: '3-day streak! You\'re on fire! 🔥',
        icon: '🔥',
        duration: 4000,
      });
    }

    if (stats.currentStreak === 7) {
      addNotification({
        type: 'achievement',
        title: 'Week Warrior!',
        message: '7-day streak! Incredible consistency!',
        icon: '🥉',
        duration: 4000,
      });
    }

    // Check for XP milestones
    if (stats.totalPomodoroXP >= 500) {
      addNotification({
        type: 'achievement',
        title: 'Experience Gained!',
        message: '500+ XP earned from Pomodoro sessions!',
        icon: '⭐',
        duration: 4000,
      });
    }
  }, [addNotification]);

  // Open the attached quest file in the current workspace leaf
  const handleOpenAttachedQuest = useCallback(async () => {
    try {
      if (!attachedQuest?.filePath) return;
      const file = plugin.app.vault.getAbstractFileByPath(attachedQuest.filePath);
      if (file && file instanceof TFile) {
        const leaf = plugin.app.workspace.getLeaf();
        await leaf.openFile(file);
      }
    } catch (e) {
      console.error('Failed to open attached quest file', e);
    }
  }, [attachedQuest, plugin]);

  // Open quest file and jump to the quest line
  const handleJumpToAttachedLine = useCallback(async () => {
    try {
      if (!attachedQuest?.filePath) return;
      const file = plugin.app.vault.getAbstractFileByPath(attachedQuest.filePath);
      if (file && file instanceof TFile) {
        const leaf = plugin.app.workspace.getLeaf();
        await leaf.openFile(file);
        const mdView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (mdView && attachedQuest.lineNumber) {
          const line = Math.max(0, attachedQuest.lineNumber - 1);
          // Position cursor and try to reveal line
          mdView.editor.setCursor({ line, ch: 0 });
          (mdView as any).revealLine?.(line);
          (mdView.editor as any).scrollIntoView?.({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
        }
      }
    } catch (e) {
      console.error('Failed to jump to attached quest line', e);
    }
  }, [attachedQuest, plugin]);

  // Get current session duration in minutes
  const getCurrentSessionDuration = useCallback(() => {
    if (timerMode === 'classic') return 25;
    if (timerMode === 'extended') return 45;
    if (timerMode === 'short') return 15;
    if (timerMode === 'deepWork') return 60;
    if (timerMode === 'quickFocus') return 10;
  // For custom mode, convert the stored seconds to minutes
  return Math.max(1, Math.floor(duration / 60));
  }, [timerMode, duration]);

  // Handle pomodoro session completion
  const handlePomodoroComplete = useCallback(async () => {
    if (!playerDataRef.current) return;

    try {
      // Calculate XP and coins based on session duration and type
      const sessionDuration = getCurrentSessionDuration();
      let sessionXP = Math.floor(sessionDuration * 0.5); // 0.5 XP per minute
      let sessionCoins = Math.floor(sessionDuration * 0.2); // 0.2 coins per minute
      let sessionCP = 0;
      
      // Calculate CP based on focus quality and session type
      if (timerMode === 'deepWork') {
        sessionCP = Math.floor(sessionDuration * 0.3); // Deep work gives more CP
      } else if (timerMode === 'extended') {
        sessionCP = Math.floor(sessionDuration * 0.2); // Extended sessions give moderate CP
      } else {
        sessionCP = Math.floor(sessionDuration * 0.1); // Standard sessions give basic CP
      }

      // Calculate enhanced rewards if quest is attached
      let questRewards = null;
      if (attachedQuest) {
        const performanceMetrics: QuestPerformanceMetrics = {
          quest: {
            id: `${attachedQuest.filePath}:${attachedQuest.lineNumber}`,
            title: attachedQuest.title,
            filePath: attachedQuest.filePath || '',
            lineNumber: attachedQuest.lineNumber || 0,
            progress: attachedQuest.progress,
            estimatedDuration: 25, // Default
            actualTimeSpent: sessionDuration / 60,
            difficulty: attachedQuest.difficulty as any || 'medium',
            priority: 'medium',
            description: attachedQuest.description,
            dueDate: attachedQuest.dueDate,
            tags: attachedQuest.tags || [],
            skills: attachedQuest.skills || [],
            rewards: {
              baseXP: attachedQuest.rewards?.xp || 0,
              baseCoins: attachedQuest.rewards?.coins || 0,
              cp: attachedQuest.rewards?.cp || 0,
              materials: attachedQuest.rewards?.materials || []
            },
            subtasks: attachedQuest.subtasks?.map(subtask => ({
              id: `${attachedQuest.filePath}:${attachedQuest.lineNumber}:${subtask.text}`,
              text: subtask.text,
              completed: subtask.completed,
              estimatedMinutes: 5
            })) || [],
            pomodoroSessions: [],
            analytics: {
              totalSessions: 0,
              totalTimeSpent: 0,
              averageFocusScore: 0,
              completionRate: 0,
              estimatedVsActual: 1
            },
            status: 'active',
            attachedAt: new Date(),
            isTimedQuest: attachedQuest.isTimedQuest || false,
            isCriticalPath: false
          },
          sessionDuration: sessionDuration / 60,
          focusScore: 85, // Default focus score
          interruptions: 0,
          progressGained: attachedQuest.progress,
          estimatedTime: 25, // Default
          actualTime: sessionDuration / 60,
          subtasksCompleted: attachedQuest.subtasks?.filter(s => s.completed).length || 0,
          totalSubtasks: attachedQuest.subtasks?.length || 0,
          isFirstCompletion: false,
          consecutiveSessions: 1,
          timeOfDay: new Date().getHours(),
          isWeekend: [0, 6].includes(new Date().getDay())
        };

        questRewards = QuestRewardSystem.calculateQuestRewards(performanceMetrics);
        
        // Use enhanced rewards
        sessionXP += questRewards.finalRewards.xp;
        sessionCoins += questRewards.finalRewards.coins;
        sessionCP += questRewards.finalRewards.cp;
      }

      // Energy handling: if this is a rest session, restore energy; otherwise consume it
      const restActivityId = attachedQuest && (attachedQuest as any).restActivityId;
      const restDuration = attachedQuest && (attachedQuest as any).restDuration;

      if (restActivityId && restDuration) {
        try {
          await EnergyManagementSystem.updateEnergyAfterActivity(restActivityId as string, restDuration as number);
          addNotification({
            type: 'quest_progress',
            title: 'Rest Complete',
            message: `Recovered energy with ${String(restActivityId).replace('_', ' ')} (${restDuration} min)`,
            icon: '💤',
            duration: 3000,
          });
        } catch (e) {
          console.error('Failed to apply rest energy restoration:', e);
        }
      } else {
        // Consume energy for work/focus sessions
        const energyCost = attachedQuest ? 
          energyService.calculateTaskEnergyCost(energyService.createTaskEnergyProfile(attachedQuest), isHyperfocusMode) :
          Math.round(sessionDuration / 60 * 5); // Base energy cost: 5 per minute

        const energyConsumed = energyService.consumeEnergy(energyCost, `Pomodoro ${timerMode} session`);
        
        if (!energyConsumed) {
          addNotification({
            type: 'quest_progress',
            title: 'Energy Depleted!',
            message: 'Consider taking a break to restore your energy',
            icon: '🔋',
            duration: 4000,
          });
        }
      }

      // Update player data
      await updatePlayerData(stablePluginVault, sessionXP, sessionCoins, 0);
      
      // Update Pomodoro stats
      const updatedStats = PomodoroStatsManager.updateSessionCount(pomodoroStats, timerMode);
      const finalStats = PomodoroStatsManager.addXP(updatedStats, sessionXP);
      setPomodoroStats(finalStats);
      await saveStatsImmediately(finalStats); // Save immediately after session completion
      
      // Add material rewards
      const materialReward = await MaterialInventoryManager.addPomodoroMaterials(
        stablePluginApp,
        timerMode,
        sessionDuration
      );

      // Set up enhanced reward display
      const displayMaterials = questRewards ? 
        [...materialReward.materials, ...questRewards.finalRewards.materials.map(material => ({
          name: material,
          icon: material.includes('💎') ? '💎' : 
                material.includes('🔮') ? '🔮' : 
                material.includes('⚔️') ? '⚔️' : 
                material.includes('🛡️') ? '🛡️' : 
                material.includes('🏆') ? '🏆' : 
                material.includes('🔥') ? '🔥' : 
                material.includes('⚡') ? '⚡' : 
                material.includes('🌟') ? '🌟' : '🎁',
          quality: 'rare',
          rarity: 'special'
        }))] : materialReward.materials;

      setCurrentRewards({
        xp: sessionXP,
        cp: sessionCP,
        currency: sessionCoins,
        materials: displayMaterials
      });

      // Show enhanced reward display
      setShowRewardDisplay(true);

      // Complete quest tracking session if active
      if (activeQuestSessionId && attachedQuest) {
        try {
          await questProgressTracker.completeQuestSession(
            activeQuestSessionId,
            {
              id: `${attachedQuest.filePath}:${attachedQuest.lineNumber}`,
              title: attachedQuest.title,
              filePath: attachedQuest.filePath || '',
              lineNumber: attachedQuest.lineNumber || 0,
              progress: attachedQuest.progress,
              estimatedDuration: 25, // Default
              actualTimeSpent: 0,
              difficulty: attachedQuest.difficulty as any || 'medium',
              priority: 'medium',
              description: attachedQuest.description,
              dueDate: attachedQuest.dueDate,
              tags: attachedQuest.tags || [],
              skills: attachedQuest.skills || [],
              rewards: {
                baseXP: attachedQuest.rewards?.xp || 0,
                baseCoins: attachedQuest.rewards?.coins || 0,
                cp: attachedQuest.rewards?.cp || 0,
                materials: attachedQuest.rewards?.materials || []
              },
              subtasks: attachedQuest.subtasks?.map(subtask => ({
                id: `${attachedQuest.filePath}:${attachedQuest.lineNumber}:${subtask.text}`,
                text: subtask.text,
                completed: subtask.completed,
                estimatedMinutes: 5
              })) || [],
              pomodoroSessions: [],
              analytics: {
                totalSessions: 0,
                totalTimeSpent: 0,
                averageFocusScore: 0,
                completionRate: 0,
                estimatedVsActual: 1
              },
              status: 'active',
              attachedAt: new Date(),
              isTimedQuest: attachedQuest.isTimedQuest || false,
              isCriticalPath: false
            },
            attachedQuest.progress,
            85 // Default focus score
          );
          setActiveQuestSessionId(null);

        } catch (error) {
          console.error('Error completing quest session:', error);
        }
      }

      // Add enhanced notification for session completion
      const notificationMessage = questRewards ? 
        QuestRewardSystem.getMotivationalMessage(questRewards) :
        `Great work! You've completed a ${timerMode} session.`;

      addNotification({
        type: 'session_complete',
        title: 'Session Complete!',
        message: notificationMessage,
        icon: '🎯',
        progress: 100,
        rewards: {
          xp: sessionXP,
          cp: sessionCP,
          currency: sessionCoins,
          materials: displayMaterials.map(m => ({
            name: m.name,
            icon: m.icon,
            quality: m.quality
          }))
        },
        duration: 6000
      });

      // Show quest reward breakdown if applicable
      if (questRewards && questRewards.bonusBreakdown.length > 0) {
        setTimeout(() => {
          const bonusText = questRewards.bonusBreakdown
            .map(bonus => `${bonus.description}: +${bonus.amount} ${bonus.type.toUpperCase()}`)
            .join(', ');
          
          addNotification({
            type: 'achievement',
            title: 'Quest Bonuses Earned!',
            message: bonusText,
            icon: '🏆',
            duration: 4000
          });
        }, 1000);
      }

      // Check for achievements
      checkAchievements(finalStats);

      // Trigger global achievement events
      try {
        const { achievementEventService } = await import('../../../features/achievements/services/achievementEventService');
        await achievementEventService.processGameEvent({
          type: 'pomodoro_completed',
          data: { 
            sessionType: timerMode, 
            duration: sessionDuration, 
            xp: sessionXP,
            totalSessions: finalStats.totalSessions,
            currentStreak: finalStats.currentStreak,
            totalPomodoroXP: finalStats.totalPomodoroXP
          },
          timestamp: new Date()
        });
      } catch (error) {
        console.warn('Failed to process pomodoro achievement event:', error);
      }

      // Update quest progress if there's an attached quest
      if (attachedQuest && attachedQuest.subtasks) {
        // Mark the "Complete the session" subtask as completed
        const updatedSubtasks = attachedQuest.subtasks.map(subtask => {
          if (subtask.text.includes('Complete the session')) {
            return { ...subtask, completed: true };
          }
          return subtask;
        });
        
        const newProgress = calculateQuestProgress(updatedSubtasks);
        
        stableSetAttachedQuest(prev => prev ? {
          ...prev,
          subtasks: updatedSubtasks,
          progress: newProgress
        } : null);
        
        // Check if quest is ready to complete
        if (newProgress === 100) {
          addNotification({
            type: 'achievement',
            title: 'Quest Ready!',
            message: 'All subtasks completed! Complete a Pomodoro session to claim rewards.',
            icon: '🎯',
            progress: 100,
            duration: 4000,
          });
        } else {
          // Show progress update
          addNotification({
            type: 'quest_progress',
            title: 'Quest Progress Updated',
            message: `Quest progress: ${newProgress}%`,
            icon: '📈',
            progress: newProgress,
            duration: 3000,
          });
        }
      }

      // Reload player data  
      reloadPlayerDataSimple();
      
      // Show completion notice
      addSuccessNotification(
        'Session Complete!',
        `Great work! +${sessionXP} XP, +${sessionCoins} coins earned`
      );
      
    } catch (error) {
      console.error('Error handling pomodoro completion:', error);
      addErrorNotification(
        'Session Error',
        'Failed to complete pomodoro session. Your progress has been saved locally.'
      );
    }
  }, [timerMode, pomodoroStats, reloadPlayerDataSimple, checkAchievements, attachedQuest, calculateQuestProgress, addNotification, getCurrentSessionDuration, stablePluginApp, stablePluginVault, stableSetAttachedQuest, saveStatsImmediately, addSuccessNotification, addErrorNotification]);

  // Memoize expensive calculations
  const currentSessionXP = useMemo(() => Math.floor(getCurrentSessionDuration() * 0.5), [getCurrentSessionDuration]);
  const streakStatus = useMemo(() => PomodoroStatsManager.getStreakStatus(pomodoroStats.currentStreak), [pomodoroStats.currentStreak]);

  // Cleanup effect to prevent memory leaks (simplified)
  useEffect(() => {
    return () => {
      // Cleanup on unmount - no complex debouncing needed
      console.log('PomodoroTab unmounting');
    };
  }, []);

  // Memoize the entire JSX to prevent unnecessary re-renders
  const memoizedJSX = useMemo(() => (
    <div className={styles.pomodoroContainer}>
      {/* Statistics Panel */}
      <div className={styles.statsPanel}>
        {/* XP Display */}
        <div className={styles.xpDisplay}>
          <div className={styles.currentSessionXP}>Current Session: +{currentSessionXP} XP</div>
          <div className={styles.totalXP}>{pomodoroStats.totalPomodoroXP}</div>
          <div className={styles.dailyProgress}>
            <div className={styles.progressItem}>
              <div className={styles.progressLabel}>Today</div>
              <div className={styles.progressValue}>{pomodoroStats.todayXP}</div>
            </div>
            <div className={styles.progressItem}>
              <div className={styles.progressLabel}>Week</div>
              <div className={styles.progressValue}>{pomodoroStats.weekXP}</div>
            </div>
          </div>
        </div>

        {/* Session Counters */}
        <div className={styles.sessionCounters}>
          <div className={styles.counterItem}>
            <span className={styles.counterNumber}>{pomodoroStats.totalSessions}</span>
            <span className={styles.counterLabel}>Total</span>
          </div>
          <div className={styles.counterItem}>
            <span className={styles.counterNumber}>{pomodoroStats.todaySessions}</span>
            <span className={styles.counterLabel}>Today</span>
          </div>
          <div className={styles.counterItem}>
            <span className={styles.counterNumber}>{pomodoroStats.thisWeekSessions}</span>
            <span className={styles.counterLabel}>This Week</span>
          </div>
        </div>

        {/* Streak Display */}
        <div className={styles.streakDisplay}>
          <div className={styles.streakIcon}>{streakStatus.icon}</div>
          <div className={styles.streakNumber}>{pomodoroStats.currentStreak}</div>
          <div className={styles.streakLabel}>Day Streak</div>
          <div className={styles.longestStreak}>Best: {pomodoroStats.longestStreak}</div>
        </div>
      </div>

      {/* Main Pomodoro Timer */}
      <div className={styles.timerSection} ref={timerSectionRef}>
        <PomodoroTimer
          duration={duration}
          onComplete={handlePomodoroComplete}
          onStart={() => {
            window.console.log('Timer started');
            setShouldAutoStart(false); // Reset auto-start flag after starting
          }}
          onAbort={() => {
            window.console.log('Timer aborted');
            setShouldAutoStart(false); // Reset auto-start flag on abort
          }}
          mode={timerMode}
          autoStart={shouldAutoStart}
        />
      </div>

      {/* Energy Display */}
      <div className={styles.energySection}>
        <div className={styles.energyDisplay}>
          <div className={styles.energyBattery}>
            <div className={styles.energyLevel} style={{ width: `${energyState.currentEnergy}%` }}></div>
            <span className={styles.energyText}>{Math.round(energyState.currentEnergy)}%</span>
          </div>
          <div className={styles.energyInfo}>
            <span className={styles.energyType}>{energyState.energyType}</span>
            <span className={styles.hyperfocusLevel}>🧠 {Math.round(energyState.hyperfocusLevel)}</span>
          </div>
        </div>
        
        {/* Hyperfocus Toggle */}
        <button
          className={`${styles.hyperfocusBtn} ${isHyperfocusMode ? styles.hyperfocusActive : ''}`}
          onClick={handleHyperfocusToggle}
          disabled={!attachedQuest || !isHyperfocusEligible(attachedQuest) || !energyService.canEnterHyperfocus()}
        >
          {isHyperfocusMode ? '🧠 Exit Hyperfocus' : '🧠 Enter Hyperfocus'}
        </button>
      </div>

      {/* Session Types Grid */}
      <div className={styles.sessionTypesSection}>
        <h3>Session Types</h3>
        <div className={styles.sessionTypesGrid}>
        {SESSION_TYPES.map((sessionType) => (
          <div
            key={sessionType.id}
            className={`${styles.sessionTypeCard} ${timerMode === sessionType.id ? styles.active : ''}`}
            onClick={() => setTimerMode(sessionType.id as 'classic' | 'extended' | 'short' | 'custom' | 'deepWork' | 'quickFocus')}
          >
            <div className={styles.sessionTypeIcon}>{sessionType.icon}</div>
            <div className={styles.sessionTypeTitle}>{sessionType.name}</div>
            <div className={styles.sessionTypeDuration}>{Math.floor(sessionType.duration / 60)}min</div>
            <div className={styles.sessionTypeXP}>+{Math.floor(sessionType.duration / 60 * 0.5)} XP</div>
          </div>
        ))}
        <div
          className={styles.sessionTypeCard}
          onClick={() => {
            try {
              const modal = new CustomInputModal(plugin.app, (seconds: number) => {
                const totalSeconds = Math.max(1, Math.floor(seconds)); // always at least 1 second
                if (totalSeconds > 0) {
                  setTimerMode('custom');
                  setDuration(totalSeconds);
                  setCustomDuration(totalSeconds);
                }
                modal.close();
              });
              if (modal && typeof modal.open === 'function') {
                modal.open();
              } else {
                console.error('📱 Custom input modal not available on mobile');
              }
            } catch (error) {
              console.error('📱 Mobile custom input modal error:', error);
            }
          }}
        >
          <div className={styles.sessionTypeIcon}>⚙️</div>
          <div className={styles.sessionTypeTitle}>Custom</div>
          <div className={styles.sessionTypeDuration}>
            {customDuration > 0 ? `${Math.floor(customDuration / 60)} min` : 'Set Time'}
          </div>
          <div className={styles.sessionTypeXP}>
            +{Math.floor(((customDuration || 25 * 60) / 60) * 0.5)} XP
          </div>
        </div>
      </div>
    </div>

    {/* Quest Attachment Section */}
    {!attachedQuest ? (
      <div className={styles.questAttachmentSection}>
        <h3>Attach a Quest</h3>
        <div className={styles.attachmentOptions}>
          <button 
            className={`${styles.attachBtn} ${styles.smartSuggestionBtn}`}
            onClick={() => setShowQuestSuggestions(true)}
          >
            🧠 Smart Suggestions
          </button>
          
          <button 
            className={styles.attachBtn}
            onClick={() => {
              try {
                const modal = new AttachTaskModal(plugin.app, (task) => {
                // Convert the task to our quest format
                const quest = {
                  title: (() => {
                    // Extract just the title (before the first emoji/reward)
                    let title = task.text;
                    // Find the first emoji/reward symbol and cut the title there
                    const emojis = ['⭐', '✨', '🪙', '🛠️', '🔼', '🔄', '🕐', '⏰'];
                    let firstIndex = -1;
                    
                    for (const emoji of emojis) {
                      const index = title.indexOf(emoji);
                      if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
                        firstIndex = index;
                      }
                    }
                    
                    if (firstIndex !== -1) {
                      title = title.substring(0, firstIndex);
                    }
                    
                    // Remove #gamified-task tag from the title
                    title = title.replace(/#gamified-task\s*/g, '').trim();
                    return title;
                  })(),
                  progress: 0,
                  difficulty: task.tags?.find(tag => tag.includes('difficulty'))?.replace('#difficulty-', '') || 'Normal',
                  rewards: { 
                    xp: task.rewards?.xp || 25,
                    coins: task.rewards?.coins || 10,
                    cp: task.rewards?.cp || calculateQuestCP(task),
                    materials: task.rewards?.materials || []
                  },
                  description: task.description || 'Complete this task to earn rewards!',
                  dueDate: task.dueDate || undefined,
                  subtasks: task.subtasks || [],
                  tags: task.tags || [],
                  skills: task.skills || [],
                  filePath: task.path,
                  lineNumber: task.line,
                  isTimedQuest: task.tags?.some(tag => tag === '#timed-quest') || false
                };
                stableSetAttachedQuest(quest);
              });
              if (modal && typeof modal.open === 'function') {
                modal.open();
              } else {
                console.error('📱 Attach task modal not available on mobile');
              }
            } catch (error) {
              console.error('📱 Mobile attach task modal error:', error);
            }
          }}
          >
            🎯 Attach Quest from Vault
          </button>
          
          <p className={styles.attachmentHint}>
            Attach a quest from your vault to earn rewards and track progress!
          </p>
        </div>
      </div>
    ) : null}

    {/* Attached Quest Section */}
    {attachedQuest && (
      <div className={styles.enhancedQuestCard}>
        <div className={styles.questHeaderEnhanced}>
          <div className={styles.questMainInfo}>
            <div className={styles.questIconEnhanced}>🎯</div>
            <div className={styles.questTitleSection}>
              <div className={styles.questTitleEnhanced}>{attachedQuest.title}</div>
              <div className={styles.questMeta}>
                {attachedQuest.difficulty && (
                  <span className={styles.difficultyBadge}>{attachedQuest.difficulty}</span>
                )}
                <span className={styles.questType}>Pomodoro Quest</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Skills Display */}
        {attachedQuest.skills && attachedQuest.skills.length > 0 && (
          <div className={styles.questSkills}>
            <div className={styles.skillsLabel}>Skills</div>
            <div className={styles.skillsList}>
              {attachedQuest.skills.map((skill, index) => (
                <span key={index} className={styles.skillTag}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Timed Quest Indicator */}
        {attachedQuest.isTimedQuest && (
          <div className={styles.timedQuestIndicator}>
            <span className={styles.timedIcon}>⏰</span>
            <span className={styles.timedText}>Timed Quest - Bonus Rewards!</span>
          </div>
        )}
        
        {attachedQuest.description && (
          <div className={styles.questDescription}>
            <div className={styles.descriptionLabel}>Description</div>
            <div className={styles.descriptionText}>{attachedQuest.description}</div>
          </div>
        )}
        
        {attachedQuest.dueDate && (
          <div className={styles.questDueDate}>
            <div className={styles.dueDateLabel}>Due Date</div>
            <div className={styles.dueDateText}>{attachedQuest.dueDate}</div>
          </div>
        )}
        
        {/* Enhanced Quest Rewards Display */}
        {attachedQuest.rewards && (
          <div className={styles.questRewards}>
            <div className={styles.rewardsLabel}>
              Rewards
              {attachedQuest.isTimedQuest && (
                <span className={styles.timedBonusLabel}> ⏰ +20% XP, +15% Coins</span>
              )}
            </div>
            <PomodoroRewardDisplay
              xp={attachedQuest.rewards?.xp || 0}
              cp={attachedQuest.rewards?.cp || 0}
              currency={attachedQuest.rewards?.coins || 0}
              currencySymbol={currencySymbol}
              currencyName={currencyName}
              materials={attachedQuest.rewards?.materials ? attachedQuest.rewards.materials.map(material => ({
                name: material,
                icon: material.includes('💎') ? '💎' : 
                      material.includes('🔮') ? '🔮' : 
                      material.includes('⚔️') ? '⚔️' : 
                      material.includes('🛡️') ? '🛡️' : '🎁',
                quality: 'normal',
                rarity: 'common'
              })) : []}
              isVisible={true}
              animate={false} // Show quest rewards immediately without animation
            />
          </div>
        )}
        
        <div className={styles.questProgressSection}>
          <div className={styles.progressTextEnhanced}>{attachedQuest.progress}% Complete</div>
          <div className={styles.circularProgressContainer}>
            <div className={styles.circularProgress}>
              <div className={styles.circularProgressFill} style={{ transform: `rotate(${attachedQuest.progress * 3.6}deg)` }}></div>
              <div className={styles.circularProgressText}>{attachedQuest.progress}%</div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className={styles.questActions}>
          <button onClick={handleOpenAttachedQuest} className={styles.attachBtn}>Open quest</button>
          {attachedQuest.lineNumber ? (
            <button onClick={handleJumpToAttachedLine} className={styles.attachBtn}>Jump to line</button>
          ) : null}
        </div>
        
        {attachedQuest.subtasks && attachedQuest.subtasks.length > 0 ? (
          <div className={styles.subtasksContainerEnhanced}>
            <div className={styles.subtasksHeader}>
              <div className={styles.subtasksLabel}>Subtasks</div>
              <div className={styles.subtasksProgress}>
                {attachedQuest.subtasks.filter(s => s.completed).length}/{attachedQuest.subtasks.length}
              </div>
            </div>
            <div className={styles.subtasksListEnhanced}>
              {attachedQuest.subtasks.map((subtask, index) => (
                <div 
                  key={index} 
                  className={`${styles.subtaskItemEnhanced} ${subtask.completed ? styles.subtaskCompleted : ''}`}
                  onClick={() => handleSubtaskToggle(index)}
                >
                  <span className={styles.subtaskCheckboxEnhanced}>
                    {subtask.completed ? '✅' : '⬜'}
                  </span>
                  <span className={styles.subtaskTextEnhanced}>{subtask.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.questActions}>
            <button onClick={handleCompleteQuest} className={styles.completeQuestBtn}>
              Complete Quest
            </button>
          </div>
        )}
        
        <button 
          onClick={() => stableSetAttachedQuest(null)} 
          className={styles.detachBtnEnhanced}
        >
          Detach Quest
        </button>
      </div>
    )}

    {/* Enhanced Reward Display */}
    {showRewardDisplay && (
      <PomodoroRewardDisplay
        xp={currentRewards.xp}
        cp={currentRewards.cp}
        currency={currentRewards.currency}
        currencySymbol={currencySymbol}
        currencyName={currencyName}
        materials={currentRewards.materials}
        isVisible={showRewardDisplay}
        onAnimationComplete={() => {
          setTimeout(() => setShowRewardDisplay(false), 3000);
        }}
      />
    )}


    {/* Test Button for Reward Display */}
    <button 
      onClick={() => {
        setCurrentRewards({
          xp: 150,
          cp: 75,
          currency: 50,
          materials: [
            { name: 'Test Material', icon: '💎', quality: 'masterwork', rarity: 'rare' },
            { name: 'Another Material', icon: '🔮', quality: 'refined', rarity: 'uncommon' }
          ]
        });
        setShowRewardDisplay(true);
      }}
      style={{
        margin: '10px',
        padding: '10px 20px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      Test Reward Display
    </button>

    {/* Quest Suggestion Modal */}
    <QuestSuggestionModal
      app={plugin.app}
      isOpen={showQuestSuggestions}
      onClose={() => setShowQuestSuggestions(false)}
      onSelectQuest={handleQuestSuggestionSelect}
      sessionType={timerMode}
      availableTime={getCurrentSessionDuration() / 60}
    />

    {/* Enhanced Notifications */}
    <EnhancedNotificationManager
      notifications={notifications}
      onRemoveNotification={removeNotification}
    />
  </div>
  ), [
    currentSessionXP,
    pomodoroStats.totalSessions,
    pomodoroStats.todaySessions,
    pomodoroStats.currentStreak,
    pomodoroStats.totalPomodoroXP,
    timerMode,
    customDuration,
    attachedQuest,
    notifications.length, // Only depend on notification count to reduce re-renders
    plugin // Add plugin to dependencies since we use it in the JSX
  ]);

  return memoizedJSX;
}); // Removed React.memo comparison to fix flickering issues