import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TFile } from 'obsidian';
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
import { notificationService } from '../../../shared/services/notificationService';

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
  const currencyName = plugin.settings.currencyName || "Coins";
  const currencySymbol = plugin.settings.currencySymbol || "🪙";
  
  // Use refs for stable references that don't trigger re-renders
  const pluginRef = useRef(plugin);
  const playerDataRef = useRef(playerData);
  const reloadPlayerDataRef = useRef(reloadPlayerData);
  
  // Enhanced state management
  const [duration] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<'classic' | 'extended' | 'short' | 'custom' | 'deepWork' | 'quickFocus'>('classic');
  
  // Statistics and achievements
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats>(() => PomodoroStatsManager.loadStats());
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);

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



  // Existing state
  const [customDuration, setCustomDuration] = useState<number>(25);
  
  // Stable quest state to prevent resetting during re-renders
  const [attachedQuest, setAttachedQuest] = useState<{
    title: string;
    progress: number;
    subtasks?: Array<{ completed: boolean; text: string }>;
    difficulty?: string;
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

  // Update refs when props change (but don't trigger re-renders)
  useEffect(() => {
    pluginRef.current = plugin;
    playerDataRef.current = playerData;
    reloadPlayerDataRef.current = reloadPlayerData;
  }, [plugin, playerData, reloadPlayerData]);

  // Stable quest setter to prevent unnecessary re-renders
  const stableSetAttachedQuest = useCallback((quest: typeof attachedQuest | ((prev: typeof attachedQuest) => typeof attachedQuest)) => {
    setAttachedQuest(quest);
  }, []);

  // Load stats on mount only
  useEffect(() => {
    const savedStats = PomodoroStatsManager.loadStats();
    setPomodoroStats(savedStats);
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
          globalType = 'quest';
          break;
        case 'session_complete':
          globalType = 'pomodoro';
          break;
        case 'material_reward':
          globalType = 'success';
          break;
      }

      // Send to global notification service
      switch (globalType) {
        case 'achievement':
          notificationService.achievement(notification.title, notification.message, notification.duration || 4000);
          break;
        case 'quest':
          notificationService.quest(notification.title, notification.message, notification.duration || 4000);
          break;
        case 'pomodoro':
          notificationService.pomodoro(notification.title, notification.message, notification.duration || 4000);
          break;
        case 'success':
          notificationService.success(notification.title, notification.message, notification.duration || 4000);
          break;
        default:
          notificationService.info(notification.title, notification.message, notification.duration || 4000);
          break;
      }
    } catch (error) {
      console.warn('Failed to send global notification, using local only:', error);
    }
  }, []);

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
    
    const newProgress = calculateQuestProgress(updatedSubtasks);
    
    stableSetAttachedQuest(prev => prev ? {
      ...prev,
      subtasks: updatedSubtasks,
      progress: newProgress
    } : null);

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

  // Get current session duration in minutes
  const getCurrentSessionDuration = useCallback(() => {
    if (timerMode === 'classic') return 25;
    if (timerMode === 'extended') return 45;
    if (timerMode === 'short') return 15;
    if (timerMode === 'deepWork') return 60;
    if (timerMode === 'quickFocus') return 10;
    return duration; // custom mode
  }, [timerMode, duration]);

  // Handle pomodoro session completion
  const handlePomodoroComplete = useCallback(async () => {
    if (!playerDataRef.current) return;

    try {
      // Calculate XP and coins based on session duration and type
      const sessionDuration = getCurrentSessionDuration();
      const sessionXP = Math.floor(sessionDuration * 0.5); // 0.5 XP per minute
      const sessionCoins = Math.floor(sessionDuration * 0.2); // 0.2 coins per minute
      
      // Calculate CP based on focus quality and session type
      let sessionCP = 0;
      if (timerMode === 'deepWork') {
        sessionCP = Math.floor(sessionDuration * 0.3); // Deep work gives more CP
      } else if (timerMode === 'extended') {
        sessionCP = Math.floor(sessionDuration * 0.2); // Extended sessions give moderate CP
      } else {
        sessionCP = Math.floor(sessionDuration * 0.1); // Standard sessions give basic CP
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
      setCurrentRewards({
        xp: sessionXP,
        cp: sessionCP,
        currency: sessionCoins,
        materials: materialReward.materials
      });

      // Show enhanced reward display
      setShowRewardDisplay(true);

      // Add enhanced notification for session completion
      addNotification({
        type: 'session_complete',
        title: 'Session Complete!',
        message: `Great work! You've completed a ${timerMode} session.`,
        icon: '🎯',
        progress: 100,
        rewards: {
          xp: sessionXP,
          cp: sessionCP,
          currency: sessionCoins,
          materials: materialReward.materials.map(m => ({
            name: m.name,
            icon: m.icon,
            quality: m.quality
          }))
        },
        duration: 6000
      });

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
            <span>Today: {pomodoroStats.todayXP}</span>
            <span>Week: {pomodoroStats.weekXP}</span>
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
      <div className={styles.timerSection}>
        <PomodoroTimer
          duration={duration}
          onComplete={handlePomodoroComplete}
          onStart={() => console.log('Timer started')}
          onAbort={() => console.log('Timer aborted')}
          mode={timerMode}
        />
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
            const modal = new CustomInputModal(plugin.app, (seconds: number) => {
              const duration = Math.floor(seconds / 60);
              if (duration > 0) {
                setTimerMode('custom');
                setCustomDuration(duration);
              }
              modal.close();
            });
            modal.open();
          }}
        >
          <div className={styles.sessionTypeIcon}>⚙️</div>
          <div className={styles.sessionTypeTitle}>Custom</div>
          <div className={styles.sessionTypeDuration}>Set Time</div>
          <div className={styles.sessionTypeXP}>+{Math.floor((customDuration || 25) / 60 * 0.5)} XP</div>
        </div>
      </div>
    </div>

    {/* Quest Attachment Section */}
    {!attachedQuest ? (
      <div className={styles.questAttachmentSection}>
        <h3>Attach a Quest</h3>
        <div className={styles.attachmentOptions}>
          <button 
            className={styles.attachBtn}
            onClick={() => {
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
              modal.open();
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
              xp={attachedQuest.rewards.xp}
              cp={attachedQuest.rewards.cp || 0}
              currency={attachedQuest.rewards.coins}
              currencySymbol={currencySymbol}
              currencyName={currencyName}
              materials={attachedQuest.rewards.materials ? attachedQuest.rewards.materials.map(material => ({
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