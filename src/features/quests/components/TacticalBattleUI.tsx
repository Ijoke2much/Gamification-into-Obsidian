import React, { useState, useEffect, useRef } from 'react';
import type { Quest } from '../utils/taskParser';
import type { PlayerData } from '../../../data/models/PlayerData';
import type GamifiedObsidianPlugin from '../../../core/main';
import styles from './TacticalBattleUI.module.css';

interface TacticalBattleUIProps {
  quest: Quest;
  playerData: PlayerData;
  plugin?: GamifiedObsidianPlugin;
  onQuestComplete: (questTitle: string) => void;
  onQuestFail?: (questTitle: string) => void;
  onClose: () => void;
  onSubtaskToggle?: (questTitle: string, subtaskIndex: number) => void;
}

const TacticalBattleUI: React.FC<TacticalBattleUIProps> = ({
  quest,
  playerData,
  plugin,
  onQuestComplete,
  onQuestFail,
  onClose,
  onSubtaskToggle
}) => {
  // Check if this is a tutorial/training boss FIRST (needed for initial state)
  const isTutorialBoss = quest.title.includes('Training Dummy') || 
                         quest.title.includes('Practice Beast') ||
                         quest.title.includes('Tutorial') ||
                         quest.tags?.includes('training') || 
                         quest.tags?.includes('tutorial') ||
                         quest.tags?.includes('practice') ||
                         quest.className === 'training';

  const [battleState, setBattleState] = useState({
    isActive: true,
    currentTurn: 1,
    playerTurn: true,
    battlePhase: 'battle' as 'preparation' | 'battle' | 'victory' | 'defeat',
    // NEW: Time pressure system
    timeRemaining: isTutorialBoss 
      ? 3 * 60 * 60 * 1000  // Tutorial bosses: 3 hours in ms
      : (quest.due ? Math.max(0, new Date(quest.due).getTime() - Date.now()) : 3 * 24 * 60 * 60 * 1000), // Real quests: use due date or 3 days default
    timePressureLevel: 'normal' as 'low' | 'normal' | 'high' | 'critical',
    // NEW: Turn blocking (for meeting/interruption attacks)
    turnsBlocked: 0,
    blockReason: '' as string
  });

  const [bossData, setBossData] = useState({
    name: quest.title,
    emoji: '🐉',
    currentHp: quest.xp || 400,
    maxHp: quest.xp || 400,
    phase: 1,
    mood: 'Confident' as 'Confident' | 'FOCUSED' | 'ENRAGED' | 'DESPERATE',
    hit: 75,
    dmg: 120,
    crt: 15,
    weapon: 'Quest Shadow',
    // NEW: Boss AI Personality
    personality: 'aggressive' as 'aggressive' | 'defensive' | 'tactical' | 'chaotic' | 'counter' | 'endurance',
    // NEW: Boss moves (different attack types)
    moves: [
      { id: 1, name: 'Email Flood', type: 'distraction', energyCost: 10, timeCost: 0, effect: 'Next task +5 energy', icon: '📧' },
      { id: 2, name: 'Notification Barrage', type: 'distraction', energyCost: 5, timeCost: 0, effect: 'Remove buffs', icon: '📱' },
      { id: 3, name: 'Emergency Meeting', type: 'blockage', energyCost: 20, timeCost: 4, effect: 'Block 2 turns', icon: '📅' },
      { id: 4, name: 'Stress Wave', type: 'debuff', energyCost: 0, timeCost: 0, effect: 'Tasks slower (3 turns)', icon: '😰' },
      { id: 5, name: 'Deadline Shift', type: 'time-pressure', energyCost: 0, timeCost: 6, effect: 'Deadline -6 hours', icon: '⏰' },
      { id: 6, name: 'Scope Creep', type: 'blockage', energyCost: 0, timeCost: 2, effect: 'Add subtask', icon: '📋' }
    ],
    // NEW: Active effects on boss
    activeEffects: [] as Array<{ name: string; duration: number; type: string }>
  });

  // Convert real player data to battle format
  const [playerBattleData, setPlayerBattleData] = useState(() => {
    // Use energy as HP (0-100 scale)
    const currentHp = Math.max(1, playerData.stats?.energy || 70);
    const maxHp = 100;
    
    // Calculate battle stats from player level and basic stats
    const level = playerData.level || 1;
    const baseHit = 50 + (level * 5);
    const baseDmg = 40 + (level * 3);
    const baseCrt = 10 + (level * 2);
    
    return {
      name: playerData.name || 'You',
      emoji: playerData.avatar || '🧙',
      currentHp,
      maxHp,
      level,
      hit: baseHit,
      dmg: baseDmg,
      crt: baseCrt,
      weapon: 'Skill Blade'
    };
  });

  // ==========================
  // Resizable bottom controls splitter
  // ==========================
  const containerRef = useRef<HTMLDivElement>(null);
  const [controlsHeight, setControlsHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tactical-controls-height');
      return saved ? Number(saved) : Math.round(window.innerHeight * 0.38);
    } catch {
      return Math.round(window.innerHeight * 0.38);
    }
  });
  const [draggingSplit, setDraggingSplit] = useState(false);

  useEffect(() => {
    const applyMove = (clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newHeight = rect.bottom - clientY;
      const minH = 160;
      const maxH = rect.height * 0.8; // keep at least 20% for arena
      const clamped = Math.max(minH, Math.min(maxH, newHeight));
      setControlsHeight(clamped);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingSplit) return;
      applyMove(e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingSplit || e.touches.length === 0) return;
      applyMove(e.touches[0].clientY);
    };
    const stopDrag = () => {
      if (!draggingSplit) return;
      setDraggingSplit(false);
      try {
        localStorage.setItem('tactical-controls-height', String(controlsHeight));
      } catch (error) {
        // Persist preference best-effort; log and continue if storage fails
        if (typeof window !== 'undefined' && window.console) {
          window.console.warn('Failed to persist tactical-controls-height', error);
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('mouseleave', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
      window.removeEventListener('mouseleave', stopDrag);
    };
  }, [draggingSplit, controlsHeight]);

  const [battleLog, setBattleLog] = useState([
    { turn: 1, event: 'Battle started against Training Dummy Dragon!', type: 'system' },
    { turn: 2, event: 'Subtask completed! Deals 22 damage!', type: 'player' },
    { turn: 3, event: 'Subtask completed! 15 damage dealt!', type: 'player' },
    { turn: 4, event: 'Strategic Analysis: Increase all stat effectiveness by 25% for 5 turns', type: 'system' }
  ]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [moveCooldowns, setMoveCooldowns] = useState<{ [key: number]: number }>({});
  
  // NEW: Player status effects (buffs/debuffs)
  const [playerEffects, setPlayerEffects] = useState<Array<{
    name: string;
    duration: number;
    type: 'buff' | 'debuff';
    effect: string;
    energyModifier?: number;
    taskCostModifier?: number;
  }>>([]);
  
  // Final blow cinematic gating
  const [finalBlowReady, setFinalBlowReady] = useState(false);
  const [finalBlowAnimating, setFinalBlowAnimating] = useState(false);

  // Next boss action telegraph
  const [nextBossAction, setNextBossAction] = useState<{ name: string; icon: string; etaTurns: number } | null>(null);

  // Exit confirmation modal and resume timestamp
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Victory XP animation state
  const [showLevelUpFlash, setShowLevelUpFlash] = useState(false);
  const [xpAnimProgress, setXpAnimProgress] = useState<number>(0);
  const [levelUpOccurred, setLevelUpOccurred] = useState<boolean>(false);
  
  // Subquest addition state
  const [showAddSubquestInput, setShowAddSubquestInput] = useState(false);
  const [newSubquestText, setNewSubquestText] = useState('');
  const [isAddingSubquest, setIsAddingSubquest] = useState(false);
  
  // Full-screen damage display
  const [damageDisplay, setDamageDisplay] = useState<{
    amount: number;
    type: 'damage' | 'heal' | 'boss-damage';
    moveName?: string;
  } | null>(null);
  
  // Animation states
  const [bossShaking, setBossShaking] = useState(false);
  const [showCriticalFlash, setShowCriticalFlash] = useState(false);
  const [attackFlashing, setAttackFlashing] = useState(false);

  // Battle state persistence key
  const battleStateKey = `tactical-battle-${quest.id}`;

  // Load quest tasks from actual quest data - use state to make it reactive
  const [questTasks, setQuestTasks] = useState(() => 
    quest.subtasks?.map((subtask, index) => ({
      id: index + 1,
      description: subtask.text,
      damage: Math.floor((quest.xp || 100) / (quest.subtasks?.length || 1)),
      completed: subtask.completed,
      energyCost: Math.floor((quest.energyCost || 10) / (quest.subtasks?.length || 1))
    })) || []
  );

  // Update questTasks when quest.subtasks changes
  useEffect(() => {
    setQuestTasks(
      quest.subtasks?.map((subtask, index) => ({
        id: index + 1,
        description: subtask.text,
        damage: Math.floor((quest.xp || 100) / (quest.subtasks?.length || 1)),
        completed: subtask.completed,
        energyCost: Math.floor((quest.energyCost || 10) / (quest.subtasks?.length || 1))
      })) || []
    );
  }, [quest.subtasks, quest.xp, quest.energyCost]);

  // Load saved battle state on mount
  useEffect(() => {
    // Tutorial bosses ALWAYS start fresh - never restore saved state
    if (isTutorialBoss) {
      console.log('🔄 Tutorial boss detected - starting fresh battle (no saved state)');
      localStorage.removeItem(battleStateKey);
      return;
    }
    
    const savedState = localStorage.getItem(battleStateKey);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        console.log('📦 Restoring battle state:', parsed);
        
        // Restore all battle state
        if (parsed.bossData) setBossData(parsed.bossData);
        if (parsed.playerBattleData) setPlayerBattleData(parsed.playerBattleData);
        if (parsed.battleState) setBattleState(parsed.battleState);
        if (parsed.battleLog) setBattleLog(parsed.battleLog);
        if (parsed.moveCooldowns) setMoveCooldowns(parsed.moveCooldowns);
        if (parsed.timestamp) setLastSavedAt(parsed.timestamp);
        if (parsed.questTasks) {
          // Note: questTasks is derived from props, handled by parent component
          // Battle state restoration focuses on battle-specific state
        }
      } catch (error) {
        console.error('Failed to restore battle state:', error);
      }
    }
  }, []);

  // Save battle state whenever it changes (but not victory state for tutorial bosses)
  useEffect(() => {
    // Don't save victory state for tutorial bosses
    if (isTutorialBoss && battleState.battlePhase === 'victory') {
      return;
    }
    
    const stateToSave = {
      bossData,
      playerBattleData,
      battleState,
      battleLog,
      moveCooldowns,
      questTasks,
      timestamp: Date.now()
    };
    
    localStorage.setItem(battleStateKey, JSON.stringify(stateToSave));
    setLastSavedAt(stateToSave.timestamp);
  }, [bossData, playerBattleData, battleState, battleLog, moveCooldowns, questTasks, isTutorialBoss]);

  // Calculate battle moves based on real player stats
  // All moves are unlocked - damage scales with stat values
  const battleMoves = [
    { 
      id: 1, 
      name: 'Deep Work', 
      icon: '🧠', 
      stat: 'focus',  // Uses actual player stat
      dmg: 120,  // Base damage
      type: 'magic', 
      cooldown: 3, // 3 turn cooldown
      locked: false  // Always available
    },
    { 
      id: 2, 
      name: 'Power Surge', 
      icon: '💪', 
      stat: 'energy',  // Uses actual player stat
      dmg: 100, 
      type: 'physical', 
      cooldown: 2, // 2 turn cooldown
      locked: false  // Always available
    },
    { 
      id: 3, 
      name: 'Calm Strike', 
      icon: '🧘', 
      stat: 'calm',  // Uses actual player stat
      dmg: 90, 
      type: 'magic', 
      cooldown: 2, // 2 turn cooldown
      locked: false  // Always available
    },
    { 
      id: 4, 
      name: 'Motivated Rush', 
      icon: '🔥', 
      stat: 'motivation',  // Uses actual player stat
      dmg: 110, 
      type: 'physical', 
      cooldown: 4, // 4 turn cooldown
      locked: false  // Always available
    }
  ];

  const bossHpPercent = (bossData.currentHp / bossData.maxHp) * 100;
  const playerHpPercent = (playerBattleData.currentHp / playerBattleData.maxHp) * 100;
  
  // Update player HP when energy changes
  useEffect(() => {
    const currentHp = Math.max(1, playerData.stats?.energy || 70);
    setPlayerBattleData(prev => ({ ...prev, currentHp }));
  }, [playerData.stats?.energy]);
  
  // Check for time-based defeat
  useEffect(() => {
    // Update time pressure level based on remaining time
    const hoursRemaining = battleState.timeRemaining / (60 * 60 * 1000);
    let pressureLevel: 'low' | 'normal' | 'high' | 'critical' = 'normal';
    
    if (hoursRemaining > 48) {
      pressureLevel = 'low';
    } else if (hoursRemaining > 24) {
      pressureLevel = 'normal';
    } else if (hoursRemaining > 6) {
      pressureLevel = 'high';
    } else {
      pressureLevel = 'critical';
    }
    
    if (pressureLevel !== battleState.timePressureLevel) {
      setBattleState(prev => ({ ...prev, timePressureLevel: pressureLevel }));
      
      if (pressureLevel === 'critical') {
        addBattleLog('⏰ TIME CRITICAL! Less than 6 hours remaining!', 'system');
      } else if (pressureLevel === 'high') {
        addBattleLog('⚠️ Time pressure high! Less than 24 hours left!', 'system');
      }
    }
    
    // Check for time-out defeat
    if (battleState.timeRemaining <= 0 && battleState.battlePhase === 'battle') {
      setTimeout(() => {
        setBattleState(prev => ({ ...prev, battlePhase: 'defeat' }));
        addBattleLog('⏰ TIME\'S UP! Deadline has passed!', 'system');
        addBattleLog('💀 The project was not completed in time...', 'system');
        if (onQuestFail) {
          onQuestFail(quest.title);
        }
      }, 500);
    }
  }, [battleState.timeRemaining, battleState.timePressureLevel, battleState.battlePhase]);

  // Timer interval to update countdown every second
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setBattleState(prev => {
        const newTimeRemaining = Math.max(0, prev.timeRemaining - 1000); // Subtract 1 second
        return { ...prev, timeRemaining: newTimeRemaining };
      });
    }, 1000); // Update every 1 second

    return () => clearInterval(timerInterval);
  }, []);

  const executeTask = async (task: typeof questTasks[0]) => {
    if (task.completed || isAnimating || battleState.turnsBlocked > 0) {
      if (battleState.turnsBlocked > 0) {
        addBattleLog(`⛔ ${battleState.blockReason} Can't take actions right now.`, 'system');
      }
      return;
    }

    setIsAnimating(true);

    // Calculate energy cost with status effect modifiers
    const baseEnergyCost = task.energyCost || 10;
    const modifiers = playerEffects.reduce((sum, effect) => sum + (effect.taskCostModifier || 0), 0);
    const actualEnergyCost = Math.max(1, baseEnergyCost + modifiers);
    
    // Check if player has enough energy
    if (playerBattleData.currentHp < actualEnergyCost) {
      addBattleLog(`⚠️ Not enough energy! Need ${actualEnergyCost}, have ${playerBattleData.currentHp}.`, 'system');
      setIsAnimating(false);
      return;
    }
    
    // Deduct energy cost
    setPlayerBattleData(prev => ({ ...prev, currentHp: Math.max(0, prev.currentHp - actualEnergyCost) }));
    
    // Mark task as completed in local state FIRST
    setQuestTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, completed: true } : t
    ));
    
    // Complete the actual quest subtask
    if (onSubtaskToggle) {
      onSubtaskToggle(quest.title, task.id - 1);
    }

    // Calculate damage (guaranteed damage from completing real work)
    const taskDamage = task.damage;
    const newBossHp = Math.max(0, bossData.currentHp - taskDamage);
    
    // Apply damage to boss
    setBossData(prev => ({ ...prev, currentHp: newBossHp }));
    
    // Show energy modifier feedback
    if (modifiers !== 0) {
      const modText = modifiers > 0 ? `+${modifiers}` : `${modifiers}`;
      addBattleLog(`⚡ Task cost: ${baseEnergyCost} ${modText} = ${actualEnergyCost} energy`, 'system');
    }

    // Increment turn counter
    setBattleState(prev => ({ ...prev, currentTurn: prev.currentTurn + 1 }));

    // Add battle log entry
    addBattleLog(`✓ Task completed: "${task.description}" - ${taskDamage} damage dealt!`, 'player');

    // Check for boss phase transition
    const newPhase = calculateBossPhase(newBossHp, bossData.maxHp);
    if (newPhase !== bossData.phase) {
      const phaseNames: { [key: number]: 'Confident' | 'FOCUSED' | 'ENRAGED' | 'DESPERATE' } = { 1: 'Confident', 2: 'FOCUSED', 3: 'ENRAGED' };
      const newMood = phaseNames[newPhase] || 'Confident';
      addBattleLog(`⚠️ ${bossData.name} enters Phase ${newPhase} - ${newMood}!`, 'system');
      setBossData(prev => ({ ...prev, phase: newPhase, mood: newMood }));
    }

    // Check for victory - Check including the task we just completed
    const hasTasks = (questTasks?.length || 0) > 0;
    const updatedTasks = questTasks.map(t => t.id === task.id ? { ...t, completed: true } : t);
    const allTasksCompleted = hasTasks ? updatedTasks.every(t => t.completed) : false;
    
    if (allTasksCompleted) {
      // Immediate victory when all tasks are completed via quest actions
      setBossData(prev => ({ ...prev, currentHp: 0 }));
      setBattleState(prev => ({ ...prev, battlePhase: 'victory' }));
      addBattleLog(`🎉 VICTORY! ${bossData.name} was defeated!`, 'system');
      if (!isTutorialBoss) {
        clearBattleState();
        setTimeout(() => {
          onQuestComplete(quest.title);
        }, 1500);
      }
    } else if (newBossHp <= 0) {
      // Boss "defeated" but not finished - survives at 1 HP
      if (hasTasks) {
        setBossData(prev => ({ ...prev, currentHp: 1, phase: 3, mood: 'DESPERATE' }));
        addBattleLog(`💀 The boss is on its last legs!`, 'boss');
        addBattleLog(`📋 Complete all remaining tasks to deliver the final blow!`, 'system');
      } else {
        // No tasks exist; allow standard HP=0 victory
        setFinalBlowReady(true);
        addBattleLog(`⚔️ Finish it! Deliver the FINAL BLOW!`, 'system');
      }
    } else {
      // Boss counter-attacks after player action
      setTimeout(() => {
        executeBossCounterAttack('task');
      }, 800);
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, 1500);
  };

  const addBattleLog = (event: string, type: string = 'system') => {
    const newEntry = {
      turn: battleState.currentTurn,
      event,
      type
    };
    setBattleLog(prev => [...prev, newEntry]);
  };

  const clearBattleState = () => {
    localStorage.removeItem(battleStateKey);
    console.log('🗑️ Cleared battle state for:', quest.id);
  };

  const handleAddNewSubquest = async () => {
    if (!newSubquestText.trim() || isAddingSubquest) return;
    
    setIsAddingSubquest(true);
    
    try {
      // For tutorial bosses, just update locally (no persistence)
      if (isTutorialBoss) {
        // Create new subtasks array with the new task
        const newSubtask = { text: newSubquestText.trim(), completed: false };
        
        // Update quest object directly for demo
        if (quest.subtasks) {
          quest.subtasks.push(newSubtask);
        } else {
          quest.subtasks = [newSubtask];
        }
        
        // Calculate HP boost for boss
        const taskDamage = Math.floor((quest.xp || 100) / (quest.subtasks?.length || 1));
        const hpBoost = taskDamage;
        
        // Boss gets stronger!
        setBossData(prev => ({ 
          ...prev, 
          currentHp: Math.min(prev.maxHp + hpBoost, prev.currentHp + hpBoost),
          maxHp: prev.maxHp + hpBoost
        }));
        
        // Add dramatic battle log entries
        addBattleLog(`📋 New challenge discovered: "${newSubquestText.trim()}"`, 'system');
        addBattleLog(`💪 ${bossData.name} grows stronger! (+${hpBoost} HP)`, 'boss');
        addBattleLog(`⚠️ The scope has expanded! Victory requires more effort!`, 'system');
        
        // Reset input
        setNewSubquestText('');
        setShowAddSubquestInput(false);
        
      } else {
        // For real quests, use QuestSystemIntegration
        const { QuestSystemIntegration } = await import('../index');
        
        // Create new subtasks array with the new task
        const newSubtasks = [
          ...(quest.subtasks || []),
          { text: newSubquestText.trim(), completed: false }
        ];
        
        // Update quest in the system
        await QuestSystemIntegration.updateQuest(quest.id, { 
          subtasks: newSubtasks 
        });
        
        // Calculate HP boost for boss (proportional to task difficulty)
        const taskDamage = Math.floor((quest.xp || 100) / newSubtasks.length);
        const hpBoost = taskDamage;
        
        // Boss gets stronger!
        setBossData(prev => ({ 
          ...prev, 
          currentHp: Math.min(prev.maxHp + hpBoost, prev.currentHp + hpBoost),
          maxHp: prev.maxHp + hpBoost
        }));
        
        // Add dramatic battle log entries
        addBattleLog(`📋 New challenge discovered: "${newSubquestText.trim()}"`, 'system');
        addBattleLog(`💪 ${bossData.name} grows stronger! (+${hpBoost} HP)`, 'boss');
        addBattleLog(`⚠️ The scope has expanded! Victory requires more effort!`, 'system');
        
        // Trigger refresh
        const refreshFn = (window as Window & { refreshQuests?: () => void }).refreshQuests;
        if (typeof refreshFn === 'function') refreshFn();
        
        // Reset input
        setNewSubquestText('');
        setShowAddSubquestInput(false);
      }
      
    } catch (error) {
      console.error('Failed to add subquest during battle:', error);
      addBattleLog(`❌ Failed to add new subquest. Try again!`, 'system');
    } finally {
      setIsAddingSubquest(false);
    }
  };

  const calculateBossPhase = (currentHp: number, maxHp: number): number => {
    const hpPercent = (currentHp / maxHp) * 100;
    if (hpPercent > 70) return 1; // Phase 1: Confident
    if (hpPercent > 30) return 2; // Phase 2: Focused
    return 3; // Phase 3: Enraged
  };

  // NEW: Boss counter-attack system
  const executeBossCounterAttack = (playerAction: string) => {
    const healthPercent = (bossData.currentHp / bossData.maxHp) * 100;
    
    // Select boss move based on personality and phase
    let selectedMove;
    let dialogue = '';
    
    // Personality-based move selection
    switch (bossData.personality) {
      case 'aggressive':
        // Aggressive: Prefers energy drain and time pressure attacks
        if (healthPercent < 30) {
          selectedMove = bossData.moves[2]; // Emergency Meeting (desperate)
          dialogue = "💀 \"I'LL DRAG YOU DOWN WITH ME!\"";
        } else if (healthPercent < 60) {
          selectedMove = bossData.moves[4]; // Deadline Shift
          dialogue = "💢 \"Running out of time, aren't you?\"";
        } else {
          selectedMove = bossData.moves[0]; // Email Flood
          dialogue = "😈 \"Let me distract you with some busy work!\"";
        }
        break;
        
      case 'defensive':
        // Defensive: Prefers debuffs and blocking
        selectedMove = bossData.moves[3]; // Stress Wave
        dialogue = "🛡️ \"Your efforts will be slowed...\"";
        break;
        
      case 'tactical':
        // Tactical: Analyzes and counters player patterns
        if (playerAction === 'task') {
          selectedMove = bossData.moves[5]; // Scope Creep (add more work)
          dialogue = "🧠 \"Completing tasks? Here's MORE work!\"";
        } else {
          selectedMove = bossData.moves[1]; // Notification Barrage
          dialogue = "🧠 \"Using moves? Let me interrupt your focus.\"";
        }
        break;
        
      case 'chaotic':
        // Chaotic: Completely random
        selectedMove = bossData.moves[Math.floor(Math.random() * bossData.moves.length)];
        dialogue = "🌪️ \"Let CHAOS decide your fate!\"";
        break;
        
      case 'counter':
        // Counter: Mirrors player actions
        if (playerAction === 'task') {
          selectedMove = bossData.moves[1]; // Remove buffs
          dialogue = "↩️ \"For every action, a reaction...\"";
        } else {
          selectedMove = bossData.moves[3]; // Stress Wave
          dialogue = "↩️ \"Your moves are predictable!\"";
        }
        break;
        
      case 'endurance': {
        // Endurance: Gets stronger over time
        const turnsElapsed = battleState.currentTurn;
        if (turnsElapsed > 5) {
          selectedMove = bossData.moves[4]; // Deadline Shift (time pressure)
          dialogue = "⏳ \"Time makes me STRONGER!\"";
        } else {
          selectedMove = bossData.moves[0]; // Email Flood
          dialogue = "⏳ \"The longer this takes, the worse for you...\"";
        }
        break;
      }
        
      default:
        selectedMove = bossData.moves[0];
        dialogue = "💬 \"Take this!\"";
    }
    
    if (!selectedMove) return;
    
    // Add dialogue to battle log
    addBattleLog(dialogue, 'boss');
    addBattleLog(`${selectedMove.icon} ${bossData.name} uses ${selectedMove.name}!`, 'boss');
    
    // Apply move effects based on type
    switch (selectedMove.type) {
      case 'distraction': {
        // Energy drain attacks
        const energyDrain = selectedMove.energyCost || 10;
        const newEnergy = Math.max(0, playerBattleData.currentHp - energyDrain);
        setPlayerBattleData(prev => ({ ...prev, currentHp: newEnergy }));
        addBattleLog(`⚡ You lose ${energyDrain} energy! (${playerBattleData.currentHp} → ${newEnergy})`, 'system');
        
        // Show damage display
        setDamageDisplay({ amount: energyDrain, type: 'damage', moveName: selectedMove.name });
        setTimeout(() => setDamageDisplay(null), 2000);
        
        // Add status effect if specified
        if (selectedMove.name === 'Email Flood') {
          setPlayerEffects(prev => [...prev, {
            name: 'Distracted',
            duration: 1,
            type: 'debuff',
            effect: 'Next task +5 energy',
            taskCostModifier: 5
          }]);
          addBattleLog(`📧 Distracted! Next task will cost +5 extra energy.`, 'system');
        } else if (selectedMove.name === 'Notification Barrage') {
          // Remove all player buffs
          const removedBuffs = playerEffects.filter(e => e.type === 'buff');
          if (removedBuffs.length > 0) {
            setPlayerEffects(prev => prev.filter(e => e.type !== 'buff'));
            addBattleLog(`📱 All buffs removed!`, 'system');
          } else {
            addBattleLog(`📱 No buffs to remove.`, 'system');
          }
        }
        break;
      }
        
      case 'blockage': {
        // Turn blocking attacks
        if (selectedMove.name === 'Emergency Meeting') {
          setBattleState(prev => ({ ...prev, turnsBlocked: 2, blockReason: 'Emergency Meeting in progress...' }));
          const energyLoss = selectedMove.energyCost || 20;
          setPlayerBattleData(prev => ({ ...prev, currentHp: Math.max(0, prev.currentHp - energyLoss) }));
          addBattleLog(`📅 Blocked for 2 turns! Forced to attend meeting. (-${energyLoss} energy)`, 'system');
        } else if (selectedMove.name === 'Scope Creep') {
          // This would add a new subtask, but we'll just add a debuff for now
          setPlayerEffects(prev => [...prev, {
            name: 'Scope Creep',
            duration: 999,
            type: 'debuff',
            effect: 'Project expanded',
            taskCostModifier: 3
          }]);
          addBattleLog(`📋 Project scope expanded! All tasks slightly harder.`, 'system');
        }
        break;
      }
        
      case 'debuff': {
        // Status effect attacks
        if (selectedMove.name === 'Stress Wave') {
          setPlayerEffects(prev => [...prev, {
            name: 'Stressed',
            duration: 3,
            type: 'debuff',
            effect: 'Tasks 20% slower',
            taskCostModifier: 3
          }]);
          addBattleLog(`😰 Stressed! Tasks cost +3 energy for 3 turns.`, 'system');
        }
        break;
      }
        
      case 'time-pressure': {
        // Time manipulation attacks
        if (selectedMove.name === 'Deadline Shift') {
          const hoursLost = (selectedMove.timeCost || 6) * 60 * 60 * 1000; // Convert hours to ms
          setBattleState(prev => ({ ...prev, timeRemaining: Math.max(0, prev.timeRemaining - hoursLost) }));
          addBattleLog(`⏰ Deadline moved EARLIER by ${selectedMove.timeCost} hours!`, 'system');
          addBattleLog(`⚠️ Time pressure increasing...`, 'system');
        }
        break;
      }
    }
    
    // Check if player energy depleted (burnout)
    if (playerBattleData.currentHp <= 0) {
      setTimeout(() => {
        setBattleState(prev => ({ ...prev, battlePhase: 'defeat' }));
        addBattleLog('💀 BURNOUT! You have exhausted all your energy...', 'system');
        if (onQuestFail) {
          onQuestFail(quest.title);
        }
      }, 1000);
    }
  };

  // Predict next boss action (telegraph) based on current boss state
  const predictNextBossMove = (): { name: string; icon: string } => {
    const healthPercent = (bossData.currentHp / bossData.maxHp) * 100;
    let predicted = bossData.moves[0];
    switch (bossData.personality) {
      case 'aggressive':
        if (healthPercent < 30) predicted = bossData.moves[2];
        else if (healthPercent < 60) predicted = bossData.moves[4];
        else predicted = bossData.moves[0];
        break;
      case 'defensive':
        predicted = bossData.moves[3];
        break;
      case 'tactical':
        predicted = bossData.moves[1];
        break;
      case 'chaotic':
        predicted = bossData.moves[Math.floor(Math.random() * bossData.moves.length)];
        break;
      case 'counter':
        predicted = bossData.moves[3];
        break;
      case 'endurance':
        predicted = (battleState.currentTurn > 5) ? bossData.moves[4] : bossData.moves[0];
        break;
      default:
        predicted = bossData.moves[0];
    }
    return { name: predicted.name, icon: predicted.icon };
  };

  // Update telegraph at the start of player's turn
  useEffect(() => {
    if (battleState.playerTurn && battleState.battlePhase === 'battle') {
      const pred = predictNextBossMove();
      setNextBossAction({ name: pred.name, icon: pred.icon, etaTurns: 1 });
    }
  }, [battleState.playerTurn, battleState.currentTurn, bossData.personality, bossData.currentHp, bossData.maxHp, battleState.battlePhase]);

  // Decrease effect durations each turn
  useEffect(() => {
    if (battleState.currentTurn > 1) {
      // Decrease player effect durations
      setPlayerEffects(prev => prev
        .map(effect => ({ ...effect, duration: effect.duration - 1 }))
        .filter(effect => effect.duration > 0 || effect.duration === 999) // 999 = permanent
      );
      
      // Decrease turn block
      if (battleState.turnsBlocked > 0) {
        setBattleState(prev => ({ ...prev, turnsBlocked: Math.max(0, prev.turnsBlocked - 1) }));
        if (battleState.turnsBlocked === 1) {
          addBattleLog('✅ Meeting ended. You can take actions again!', 'system');
        }
      }
    }
  }, [battleState.currentTurn]);

  // Decrease cooldowns each turn
  useEffect(() => {
    const newCooldowns: { [key: number]: number } = {};
    Object.keys(moveCooldowns).forEach(key => {
      const moveId = parseInt(key);
      const remaining = moveCooldowns[moveId] - 1;
      if (remaining > 0) {
        newCooldowns[moveId] = remaining;
      }
    });
    setMoveCooldowns(newCooldowns);
  }, [battleState.currentTurn]);

  // Normalize boss HP when all tasks are complete (quests can bring HP to 0)
  useEffect(() => {
    const hasTasks = (questTasks?.length || 0) > 0;
    if (!hasTasks) return;
    const allDone = questTasks.every(t => t.completed);
    if (allDone) {
      // Force HP to 0
      setBossData(prev => (prev.currentHp !== 0 ? { ...prev, currentHp: 0 } : prev));
      // Auto-transition to victory for an immediate payoff
      setFinalBlowReady(false);
      setBattleState(prev => ({ ...prev, battlePhase: 'victory' }));
      if (!isTutorialBoss) {
        clearBattleState();
        setTimeout(() => {
          onQuestComplete(quest.title);
        }, 1500);
      }
    }
  }, [questTasks, isTutorialBoss, onQuestComplete, quest.title]);

  // Also watch quest.subtasks from props (external completion)
  useEffect(() => {
    const sub = quest.subtasks;
    if (!sub || sub.length === 0) return;
    const allDone = sub.every(s => s.completed);
    if (allDone && battleState.battlePhase === 'battle') {
      setBossData(prev => (prev.currentHp !== 0 ? { ...prev, currentHp: 0 } : prev));
      setBattleState(prev => ({ ...prev, battlePhase: 'victory' }));
      if (!isTutorialBoss) {
        clearBattleState();
        setTimeout(() => {
          onQuestComplete(quest.title);
        }, 1500);
      }
    }
  }, [quest.subtasks, battleState.battlePhase, isTutorialBoss, onQuestComplete, quest.title]);

  // Trigger XP animation when victory occurs
  useEffect(() => {
    if (battleState.battlePhase === 'victory') {
      const baseXp = quest.xp || 100;
      const completionBonus = (questTasks.every(t => t.completed) ? (quest.xp || 0) * 0.2 : 0);
      const gained = Math.round(baseXp + completionBonus);
      const before = playerData.xp || 0;
      const required = playerData.xpRequired || 100;
      const after = before + gained;

      // Animate bar from before% to min(100, after%)
      const startPercent = Math.min(100, (before / required) * 100);
      const endPercent = Math.min(100, (after / required) * 100);
      let start = startPercent;
      setXpAnimProgress(start);
      const step = (endPercent - startPercent) / 30; // ~500ms
      const timer = setInterval(() => {
        start += step;
        if ((step >= 0 && start >= endPercent) || (step < 0 && start <= endPercent)) {
          setXpAnimProgress(endPercent);
          clearInterval(timer);
          // Level up flash if we crossed 100%
          if (after >= required) {
            setLevelUpOccurred(true);
            setShowLevelUpFlash(true);
            setTimeout(() => setShowLevelUpFlash(false), 1000);
          }
        } else {
          setXpAnimProgress(start);
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [battleState.battlePhase]);

  // Periodic task sync - detect externally added tasks every 5 turns
  useEffect(() => {
    if (battleState.currentTurn > 0 && battleState.currentTurn % 5 === 0) {
      const checkForNewTasks = async () => {
        try {
          const { QuestSystemIntegration } = await import('../index');
          const allQuests = QuestSystemIntegration.getQuests();
          const updatedQuest = allQuests.find((q: Quest) => q.id === quest.id);
          
          if (updatedQuest && updatedQuest.subtasks) {
            const currentTaskCount = questTasks.length;
            const newTaskCount = updatedQuest.subtasks.length;
            
            if (newTaskCount > currentTaskCount) {
              const addedTasks = newTaskCount - currentTaskCount;
              const hpBoost = addedTasks * Math.floor((quest.xp || 100) / newTaskCount);
              
              setBossData(prev => ({ 
                ...prev, 
                currentHp: Math.min(prev.maxHp + hpBoost, prev.currentHp + hpBoost),
                maxHp: prev.maxHp + hpBoost
              }));
              
              addBattleLog(`🔄 ${addedTasks} new subquest(s) detected from external source!`, 'system');
              addBattleLog(`💪 Boss adapts to increased workload! (+${hpBoost} HP)`, 'boss');
            }
          }
        } catch (error) {
          console.error('Failed to check for new tasks:', error);
        }
      };
      
      checkForNewTasks();
    }
  }, [battleState.currentTurn, quest.id, questTasks.length, quest.xp]);

  const executeBattleMove = (move: typeof battleMoves[0]) => {
    if (isAnimating) return;  // Remove locked check - all moves available
    
    // Check if move is on cooldown
    if (moveCooldowns[move.id]) {
      addBattleLog(`⏳ ${move.name} is on cooldown! (${moveCooldowns[move.id]} turns remaining)`, 'system');
      return;
    }
    
    // Check if player has enough energy
    const energyCost = 15; // Base energy cost for moves
    if (playerBattleData.currentHp < energyCost) {
      addBattleLog("⚠️ Not enough energy! Complete tasks to defeat the boss.", 'system');
      return;
    }

    setIsAnimating(true);

    // Calculate damage based on player's actual stat values (0-100)
    const statKey = move.stat as keyof typeof playerData.stats;
    const statValue = (playerData.stats?.[statKey] as number) || 1;
    
    // Proper scaling: 
    // - Stat 1 = 10% of base damage (minimum viable)
    // - Stat 50 = 50% of base damage
    // - Stat 100 = 100% of base damage
    const statMultiplier = Math.max(0.1, statValue / 100);
    const moveDamage = Math.round(move.dmg * statMultiplier);
    
    // Critical hit chance: 10% base + 0.5% per stat point
    const critChance = 10 + (statValue * 0.5);
    const isCritical = Math.random() * 100 < critChance;
    const finalDamage = Math.round(moveDamage * (isCritical ? 2.0 : 1.0));

    // Apply damage to boss
    const newBossHp = Math.max(0, bossData.currentHp - finalDamage);
    setBossData(prev => ({ ...prev, currentHp: newBossHp }));

    // Trigger animations
    setBossShaking(true);
    setAttackFlashing(true);
    setTimeout(() => setBossShaking(false), 500);
    setTimeout(() => setAttackFlashing(false), 400);
    
    // Show critical flash for crits
    if (isCritical) {
      setShowCriticalFlash(true);
      setTimeout(() => setShowCriticalFlash(false), 300);
    }

    // Show full-screen damage display
    setDamageDisplay({ 
      amount: finalDamage, 
      type: 'boss-damage', 
      moveName: move.name 
    });
    
    // Auto-clear damage display after animation
    setTimeout(() => setDamageDisplay(null), 1500);
    
    // Deduct energy cost
    setPlayerBattleData(prev => ({ ...prev, currentHp: Math.max(0, prev.currentHp - energyCost) }));

    // Increment turn counter
    setBattleState(prev => ({ ...prev, currentTurn: prev.currentTurn + 1 }));

    // Set move on cooldown
    setMoveCooldowns(prev => ({ ...prev, [move.id]: move.cooldown }));

    // Add battle log entry
    const critText = isCritical ? " CRITICAL HIT!" : "";
    addBattleLog(`⚔️ Used ${move.name}${critText} - ${finalDamage} damage! (-${energyCost} energy)`, 'player');
    
    // Check if move grants a buff
    if (move.name === 'Deep Work') {
      setPlayerEffects(prev => [...prev, {
        name: 'Flow State',
        duration: 3,
        type: 'buff',
        effect: '+20% effectiveness',
        taskCostModifier: -2
      }]);
      addBattleLog(`🧠 Flow State activated! Tasks cost -2 energy for 3 turns.`, 'system');
    } else if (move.name === 'Power Surge') {
      setPlayerEffects(prev => [...prev, {
        name: 'Powered Up',
        duration: 2,
        type: 'buff',
        effect: '+30% damage',
        energyModifier: 10
      }]);
      addBattleLog(`💪 Powered Up! Extra energy for 2 turns.`, 'system');
    } else if (move.name === 'Calm Strike') {
      setPlayerEffects(prev => [...prev, {
        name: 'Inner Peace',
        duration: 2,
        type: 'buff',
        effect: '+15% focus',
        taskCostModifier: -1
      }]);
      addBattleLog(`🧘 Inner Peace! Reduced task energy cost for 2 turns.`, 'system');
    } else if (move.name === 'Motivated Rush') {
      setPlayerEffects(prev => [...prev, {
        name: 'Momentum',
        duration: 3,
        type: 'buff',
        effect: '+25% effectiveness',
        taskCostModifier: -3
      }]);
      addBattleLog(`🔥 Momentum! Tasks cost -3 energy for 3 turns!`, 'system');
    }

    // Check for boss phase transition
    const newPhase = calculateBossPhase(newBossHp, bossData.maxHp);
    if (newPhase !== bossData.phase) {
      const phaseNames: { [key: number]: 'Confident' | 'FOCUSED' | 'ENRAGED' | 'DESPERATE' } = { 1: 'Confident', 2: 'FOCUSED', 3: 'ENRAGED' };
      const newMood = phaseNames[newPhase] || 'Confident';
      addBattleLog(`⚠️ ${bossData.name} enters Phase ${newPhase} - ${newMood}!`, 'system');
      setBossData(prev => ({ ...prev, phase: newPhase, mood: newMood }));
    }

    // Check for victory - ONLY if all tasks are completed (and tasks exist)
    const hasTasksMove = (questTasks?.length || 0) > 0;
    const allTasksCompletedMove = hasTasksMove ? questTasks.every(t => t.completed) : false;
    // Check for victory - ONLY if all tasks are completed
    if (allTasksCompletedMove) {
      // Set HP to 0 to reflect true defeat; still show Final Blow cinematic for payoff
      setBossData(prev => ({ ...prev, currentHp: 0 }));
      setFinalBlowReady(true);
      addBattleLog(`⚔️ All tasks complete! Deliver the FINAL BLOW!`, 'system');
    } else if (newBossHp <= 0) {
      // If all tasks are already complete, allow this move to finish the fight
      const allDoneNow = hasTasksMove && questTasks.every(t => t.completed);
      if (allDoneNow) {
        setBossData(prev => ({ ...prev, currentHp: 0 }));
        setBattleState(prev => ({ ...prev, battlePhase: 'victory' }));
        if (!isTutorialBoss) {
          clearBattleState();
          setTimeout(() => {
            onQuestComplete(quest.title);
          }, 1500);
        }
      } else {
        // Otherwise, moves can never reduce below 1 HP; tasks must finish it
        setBossData(prev => ({ ...prev, currentHp: 1, phase: 3, mood: 'DESPERATE' }));
        addBattleLog(`💀 The boss is barely clinging to life!`, 'boss');
        if (hasTasksMove) {
          addBattleLog(`📋 Complete your tasks to finish the fight!`, 'system');
        } else {
          addBattleLog(`📋 No tasks remain—perform your final action to finish.`, 'system');
        }
      }
    } else {
      // Boss counter-attacks after player battle move
      setTimeout(() => {
        executeBossCounterAttack('move');
      }, 2100); // After damage display clears
    }

    setTimeout(() => {
      setIsAnimating(false);
      setDamageDisplay(null); // Ensure damage display is cleared
    }, 2000); // Match damage display duration
  };

  const deliverFinalBlow = () => {
    if (!finalBlowReady || finalBlowAnimating) return;
    setFinalBlowAnimating(true);
    setBossShaking(true);
    setShowCriticalFlash(true);
    addBattleLog('💥 FINAL BLOW unleashed!', 'player');
    setTimeout(() => setShowCriticalFlash(false), 500);
    setTimeout(() => setBossShaking(false), 700);
    // Crumble and finish
    setTimeout(() => {
      setBossData(prev => ({ ...prev, currentHp: 0 }));
      setBattleState(prev => ({ ...prev, battlePhase: 'victory' }));
      // Clear saved state and notify completion after a short delay
      if (!isTutorialBoss) {
        clearBattleState();
        setTimeout(() => {
          onQuestComplete(quest.title);
        }, 2000);
      }
    }, 900);
  };

  // Defeat Screen
  if (battleState.battlePhase === 'defeat') {
    return (
      <div className={styles.defeatScreen}>
        <div className={styles.defeatContent}>
          <div className={styles.defeatHeader}>
            <h1 className={styles.defeatTitle}>💀 DEFEAT 💀</h1>
            <p className={styles.defeatSubtitle}>The project could not be completed...</p>
          </div>

          <div className={styles.defeatStats}>
            <div className={styles.defeatStat}>
              <span className={styles.defeatLabel}>Turns Survived:</span>
              <span className={styles.defeatValue}>{battleState.currentTurn}</span>
            </div>
            <div className={styles.defeatStat}>
              <span className={styles.defeatLabel}>Tasks Completed:</span>
              <span className={styles.defeatValue}>{questTasks.filter(t => t.completed).length}/{questTasks.length}</span>
            </div>
            <div className={styles.defeatStat}>
              <span className={styles.defeatLabel}>Boss HP Remaining:</span>
              <span className={styles.defeatValue}>{bossData.currentHp}/{bossData.maxHp}</span>
            </div>
          </div>

          <div className={styles.defeatMessage}>
            <p>💡 Learn from this setback and try again with better time management!</p>
          </div>

          {isTutorialBoss ? (
            <div className={styles.defeatButtons}>
              <button 
                className={styles.defeatButton} 
                onClick={() => {
                  // Reset battle for tutorial boss
                  setBattleState({
                    isActive: true,
                    currentTurn: 1,
                    playerTurn: true,
                    battlePhase: 'battle',
                    timeRemaining: quest.due ? Math.max(0, new Date(quest.due).getTime() - Date.now()) : 3 * 24 * 60 * 60 * 1000,
                    timePressureLevel: 'normal',
                    turnsBlocked: 0,
                    blockReason: ''
                  });
                  setBossData(prev => ({ ...prev, currentHp: prev.maxHp, phase: 1, mood: 'Confident' as 'Confident' | 'FOCUSED' | 'ENRAGED' | 'DESPERATE' }));
                  setPlayerBattleData(prev => ({ ...prev, currentHp: Math.max(1, playerData.stats?.energy || 70) }));
                  setMoveCooldowns({});
                  setPlayerEffects([]);
                  setBattleLog([{ turn: 1, event: `Battle restarted against ${quest.title}!`, type: 'system' }]);
                  addBattleLog('🔄 Training mode: Battle reset!', 'system');
                }}
              >
                🔄 Try Again
              </button>
              <button className={styles.defeatButtonSecondary} onClick={onClose}>
                Exit Training
              </button>
            </div>
          ) : (
            <button className={styles.defeatButton} onClick={onClose}>
              Return
            </button>
          )}
        </div>
      </div>
    );
  }

  // Victory Screen
  if (battleState.battlePhase === 'victory') {
    const rewards = {
      xp: quest.xp || 100,
      coins: (quest.xp || 100) * 2,
      completionBonus: questTasks.every(t => t.completed) ? quest.xp * 0.2 : 0
    };

    return (
      <div className={styles.victoryScreen}>
        {/* Confetti celebration effect */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className={styles.confetti}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
        
        <div className={styles.victoryContent}>
          <div className={styles.victoryHeader}>
            <h1 className={styles.victoryTitle}>🎉 VICTORY! 🎉</h1>
            <p className={styles.victorySubtitle}>{bossData.name} has been defeated!</p>
          </div>

          {/* XP BAR ANIMATION */}
          <div className={styles.xpSection}>
            <div className={styles.xpHeader}>Experience</div>
            <div className={styles.xpBar}>
              <div className={styles.xpFill} style={{ width: `${xpAnimProgress}%` }} />
              <div className={styles.xpLabel}>
                {Math.min(100, Math.round(xpAnimProgress))}% to Level {(playerData.level || 1)}
              </div>
            </div>
            <div className={styles.xpGain}>+{Math.round((rewards.xp || 0) + (rewards.completionBonus || 0))} XP</div>
          </div>

          <div className={styles.victoryStats}>
            <div className={styles.victoryStat}>
              <span className={styles.victoryLabel}>Turns Taken:</span>
              <span className={styles.victoryValue}>{battleState.currentTurn}</span>
            </div>
            <div className={styles.victoryStat}>
              <span className={styles.victoryLabel}>Tasks Completed:</span>
              <span className={styles.victoryValue}>{questTasks.filter(t => t.completed).length}/{questTasks.length}</span>
            </div>
            <div className={styles.victoryStat}>
              <span className={styles.victoryLabel}>Final Energy:</span>
              <span className={styles.victoryValue}>{playerBattleData.currentHp}/{playerBattleData.maxHp}</span>
            </div>
          </div>

          <div className={styles.victoryRewards}>
            <h2 className={styles.rewardsTitle}>Rewards Earned</h2>
            <div className={styles.rewardsList}>
              <div className={styles.rewardItem}>
                <span className={styles.rewardIcon}>⭐</span>
                <span className={styles.rewardText}>{rewards.xp} XP</span>
              </div>
              <div className={styles.rewardItem}>
                <span className={styles.rewardIcon}>💰</span>
                <span className={styles.rewardText}>{rewards.coins} Coins</span>
              </div>
              {rewards.completionBonus > 0 && (
                <div className={styles.rewardItem}>
                  <span className={styles.rewardIcon}>🏆</span>
                  <span className={styles.rewardText}>+{Math.round(rewards.completionBonus)} XP Bonus (All Tasks!)</span>
                </div>
              )}
            </div>
          </div>

          {isTutorialBoss ? (
            <div className={styles.victoryButtons}>
              <button 
                className={styles.victoryButton} 
                onClick={() => {
                  // Reset battle for tutorial boss
                  setBattleState({
                    isActive: true,
                    currentTurn: 1,
                    playerTurn: true,
                    battlePhase: 'battle',
                    timeRemaining: quest.due ? Math.max(0, new Date(quest.due).getTime() - Date.now()) : 3 * 24 * 60 * 60 * 1000,
                    timePressureLevel: 'normal',
                    turnsBlocked: 0,
                    blockReason: ''
                  });
                  setBossData(prev => ({ ...prev, currentHp: prev.maxHp, phase: 1, mood: 'Confident' as 'Confident' | 'FOCUSED' | 'ENRAGED' | 'DESPERATE' }));
                  setPlayerBattleData(prev => ({ ...prev, currentHp: Math.max(1, playerData.stats?.energy || 70) }));
                  setMoveCooldowns({});
                  setPlayerEffects([]);
                  setBattleLog([{ turn: 1, event: `Battle restarted against ${quest.title}!`, type: 'system' }]);
                  addBattleLog('🔄 Training mode: Battle reset!', 'system');
                }}
              >
                🔄 Fight Again
              </button>
              <button className={styles.victoryButtonSecondary} onClick={onClose}>
                Exit Training
              </button>
            </div>
          ) : (
            <button className={styles.victoryButton} onClick={onClose}>
              Continue
            </button>
          )}
        </div>
        {showLevelUpFlash && <div className={styles.levelUpFlash} />}
        {levelUpOccurred && (
          <div className={styles.levelUpCard}>
            <div className={styles.levelUpTitle}>LEVEL UP!</div>
            <div className={styles.levelUpBody}>Stats increased and new power surges within you.</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.tacticalBattle} ref={containerRef}>
      
      {/* FULL-SCREEN DAMAGE DISPLAY */}
      {damageDisplay && (
        <div className={styles.fullScreenDamage}>
          <div className={`${styles.damageNumber} ${styles[damageDisplay.type]}`}>
            {damageDisplay.type === 'damage' ? '-' : ''}{damageDisplay.amount}
            {damageDisplay.type === 'boss-damage' && <span className={styles.critBang}>!</span>}
          </div>
          {damageDisplay.moveName && (
            <div className={styles.damageMoveName}>{damageDisplay.moveName}</div>
          )}
        </div>
      )}
      
      {/* BATTLE STATUS BAR: Turn Counter + Countdown Timer */}
      <div className={styles.battleStatusBar}>
        {/* TURN COUNTER */}
        <div className={styles.turnCounter}>
          <div className={styles.turnLabel}>TURN</div>
          <div className={styles.turnNumber}>{battleState.currentTurn}</div>
        </div>
        {/* NEXT BOSS ACTION TELEGRAPH */}
        {nextBossAction && (
          <div className={styles.nextActionBox} title={`Likely next move`}>
            <div className={styles.nextActionIcon}>{nextBossAction.icon}</div>
            <div className={styles.nextActionInfo}>
              <div className={styles.nextActionLabel}>Next Boss Action</div>
              <div className={styles.nextActionName}>{nextBossAction.name}</div>
            </div>
            <div className={styles.nextActionEta}>~{nextBossAction.etaTurns} turn</div>
          </div>
        )}
        {/* AUTOSAVE BADGE */}
        {lastSavedAt && (
          <div className={styles.autosaveBadge} title={`Saved at ${new Date(lastSavedAt).toLocaleTimeString()}`}>
            Saved · {new Date(Date.now() - lastSavedAt).getMinutes()}m ago
          </div>
        )}
        
        {/* COUNTDOWN TIMER */}
        <div className={`${styles.countdownTimer} ${styles[battleState.timePressureLevel]}`}>
          <div className={styles.countdownBoxes}>
          {(() => {
            const totalMs = battleState.timeRemaining;
            const days = Math.floor(totalMs / (24 * 60 * 60 * 1000));
            const hours = Math.floor((totalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const minutes = Math.floor((totalMs % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((totalMs % (60 * 1000)) / 1000);
            
            // Debug log to verify calculations
            console.log('⏰ Countdown Timer:', { totalMs, days, hours, minutes, seconds });
            
            return (
              <>
                <div className={styles.countdownBox}>
                  <div className={styles.countdownNumber}>{days}</div>
                  <div className={styles.countdownLabel}>{days === 1 ? 'Day' : 'Days'}</div>
                </div>
                <div className={styles.countdownBox}>
                  <div className={styles.countdownNumber}>{hours}</div>
                  <div className={styles.countdownLabel}>{hours === 1 ? 'Hour' : 'Hours'}</div>
                </div>
                <div className={styles.countdownBox}>
                  <div className={styles.countdownNumber}>{minutes}</div>
                  <div className={styles.countdownLabel}>{minutes === 1 ? 'Minute' : 'Minutes'}</div>
                </div>
                <div className={styles.countdownBox}>
                  <div className={styles.countdownNumber}>{seconds}</div>
                  <div className={styles.countdownLabel}>{seconds === 1 ? 'Second' : 'Seconds'}</div>
                </div>
              </>
            );
          })()}
        </div>
        </div>
      </div>
      
      {/* TOP: TACTICAL ARENA (60% of screen) */}
      <div className={styles.arenaSection}>
        
        {/* BOSS COMBATANT */}
        <div className={`${styles.combatantBoss} ${bossShaking ? styles.bossShake : ''}`}>
          <div className={styles.characterSprite}>
            <div className={`${styles.spriteContainer} ${attackFlashing ? styles.attackFlash : ''}`}>
              <div className={styles.bossEmoji}>{bossData.emoji}</div>
            </div>
          </div>
          
          <div className={styles.tacticalStatsBox}>
            <div className={styles.combatStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>HIT</span>
                <span className={styles.statValue}>{bossData.hit}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>DMG</span>
                <span className={styles.statValue}>{bossData.dmg}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>CRT</span>
                <span className={styles.statValue}>{bossData.crt}</span>
              </div>
            </div>
            
            <div className={styles.weaponInfo}>
              <span className={styles.weaponIcon}>⚔️</span>
              <span className={styles.weaponName}>{bossData.weapon}</span>
            </div>
            
            <div className={styles.hpBarContainer}>
              <div className={styles.hpBarSegmented}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`${styles.hpSegment} ${i < Math.ceil(bossHpPercent / 10) ? styles.filled : ''}`}
                  />
                ))}
                {/* PHASE MARKERS - show at 75%, 50%, 25% HP */}
                <div className={styles.phaseMarker} style={{ left: '25%' }} title="Phase 2 at 75% HP">
                  <div className={styles.phaseMarkerLine}></div>
                  <div className={styles.phaseMarkerLabel}>P2</div>
                </div>
                <div className={styles.phaseMarker} style={{ left: '50%' }} title="Phase 3 at 50% HP">
                  <div className={styles.phaseMarkerLine}></div>
                  <div className={styles.phaseMarkerLabel}>P3</div>
                </div>
                <div className={styles.phaseMarker} style={{ left: '75%' }} title="Phase 4 at 25% HP">
                  <div className={styles.phaseMarkerLine}></div>
                  <div className={styles.phaseMarkerLabel}>P4</div>
                </div>
              </div>
              <div className={styles.hpText}>{bossData.currentHp} / {bossData.maxHp}</div>
            </div>
            
            <div className={styles.characterName}>{bossData.name}</div>
            <div className={styles.characterPhase}>Phase {bossData.phase} - {bossData.mood}</div>
            
            {/* BOSS STATUS EFFECTS */}
            {bossData.activeEffects && bossData.activeEffects.length > 0 && (
              <div className={styles.statusEffectsContainer}>
                <div className={styles.statusEffectsTitle}>Active Effects:</div>
                <div className={styles.statusEffectsList}>
                  {bossData.activeEffects.map((effect, index) => (
                    <div 
                      key={index} 
                      className={`${styles.statusEffect} ${effect.type === 'buff' ? styles.buff : styles.debuff}`}
                      title={effect.name}
                    >
                      <span className={styles.effectIcon}>{effect.type === 'buff' ? '✨' : '💢'}</span>
                      <span className={styles.effectName}>{effect.name}</span>
                      {effect.duration !== 999 && (
                        <span className={styles.effectBadge} title={`${effect.duration} turns remaining`}>{effect.duration}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* PLAYER COMBATANT */}
        <div className={styles.combatantPlayer}>
          <div className={styles.characterSprite}>
            <div className={styles.spriteContainer}>
              {(() => {
                // Check if avatar is a valid emoji
                const isEmoji = !playerData.avatar || 
                               playerData.avatar.length <= 4 || 
                               /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(playerData.avatar);
                
                // Check if it's a file path (contains /, \, or .)
                const isFilePath = playerData.avatar && 
                                  !isEmoji &&
                                  (playerData.avatar.includes('/') || 
                                   playerData.avatar.includes('\\') ||
                                   playerData.avatar.includes('.'));
                
                // Check if it's already a valid URL
                const isUrl = playerData.avatar && 
                             (playerData.avatar.startsWith('http') ||
                              playerData.avatar.startsWith('data:'));
                
                console.log('🎭 Avatar debug:', {
                  avatar: playerData.avatar,
                  emoji: playerBattleData.emoji,
                  isEmoji,
                  isFilePath,
                  isUrl
                });
                
                if ((isFilePath || isUrl) && plugin) {
                  // Use vault adapter to get the proper resource path
                  const avatarSrc = isUrl 
                    ? playerData.avatar 
                    : plugin.app.vault.adapter.getResourcePath(playerData.avatar);
                  
                  console.log('🎭 Loading avatar:', { original: playerData.avatar, resolved: avatarSrc });
                  
                  return (
                    <img 
                      src={avatarSrc} 
                      alt={playerData.name || 'Player'} 
                      className={styles.playerAvatar}
                      onError={(e) => {
                        // Fallback to emoji if image fails to load
                        console.log('❌ Avatar image failed to load, using emoji:', playerBattleData.emoji);
                        (e.target as HTMLImageElement).style.display = 'none';
                        const emojiDiv = document.createElement('div');
                        emojiDiv.className = styles.playerEmoji;
                        emojiDiv.textContent = playerBattleData.emoji;
                        (e.target as HTMLImageElement).parentElement?.appendChild(emojiDiv);
                      }}
                    />
                  );
                } else {
                  // Use emoji by default (or if plugin not available)
                  return <div className={styles.playerEmoji}>{playerBattleData.emoji}</div>;
                }
              })()}
            </div>
          </div>
          
          <div className={styles.tacticalStatsBox}>
            {/* PLAYER COMBAT STATS - Mirror boss display */}
            <div className={styles.combatStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>HIT</span>
                <span className={styles.statValue}>{playerBattleData.hit}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>DMG</span>
                <span className={styles.statValue}>{playerBattleData.dmg}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>CRT</span>
                <span className={styles.statValue}>{playerBattleData.crt}</span>
              </div>
            </div>
            
            <div className={styles.weaponInfo}>
              <span className={styles.weaponIcon}>⚔️</span>
              <span className={styles.weaponName}>{playerBattleData.weapon}</span>
            </div>
            
            <div className={styles.hpBarContainer}>
              <div className={styles.hpBarSegmented}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`${styles.hpSegment} ${i < Math.ceil(playerHpPercent / 10) ? styles.filled : ''}`}
                  />
                ))}
              </div>
              <div className={styles.hpText}>{playerBattleData.currentHp} / {playerBattleData.maxHp} ENERGY</div>
            </div>
            
            <div className={styles.characterName}>{playerData.name || playerBattleData.name}</div>
            <div className={styles.characterLevel}>
              {playerData.masterClass && `Class: ${playerData.masterClass} • `}
              Level {playerData.level || playerBattleData.level}
            </div>
            
            {/* STATUS EFFECTS */}
            {playerEffects.length > 0 && (
              <div className={styles.statusEffectsContainer}>
                <div className={styles.statusEffectsTitle}>Active Effects:</div>
                <div className={styles.statusEffectsList}>
                  {playerEffects.map((effect, index) => (
                    <div 
                      key={index} 
                      className={`${styles.statusEffect} ${effect.type === 'buff' ? styles.buff : styles.debuff}`}
                      title={effect.effect}
                    >
                      <span className={styles.effectIcon}>{effect.type === 'buff' ? '✨' : '💢'}</span>
                      <span className={styles.effectName}>{effect.name}</span>
                      {effect.duration !== 999 && (
                        <span className={styles.effectBadge} title={`${effect.duration} turns remaining`}>{effect.duration}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* TURN BLOCK WARNING */}
            {battleState.turnsBlocked > 0 && (
              <div className={styles.blockWarning}>
                ⛔ {battleState.blockReason}
                <br />
                <small>({battleState.turnsBlocked} turns remaining)</small>
              </div>
            )}
          </div>
        </div>
        
      </div>
      
      {/* FINAL BLOW OVERLAY */}
      {finalBlowReady && battleState.battlePhase === 'battle' && (
        <div className={styles.finalBlowOverlay}>
          <div className={styles.finalBlowContent}>
            <div className={styles.finalBlowTitle}>Deliver the Final Blow</div>
            <button className={styles.finalBlowButton} onClick={deliverFinalBlow} disabled={finalBlowAnimating}>
              💥 FINISH IT
            </button>
            <div className={styles.finalBlowHint}>All tasks are complete. End the fight in style.</div>
          </div>
        </div>
      )}
      
      {/* SPLITTER HANDLE - drag to resize bottom controls */}
      <div
        className={`${styles.splitter} ${draggingSplit ? styles.dragging : ''}`}
        onMouseDown={() => setDraggingSplit(true)}
        onTouchStart={() => setDraggingSplit(true)}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize battle panels"
      />

      {/* BOTTOM: BATTLE CONTROLS (Resizable) */}
      <div className={styles.controlsSection} style={{ height: controlsHeight, maxHeight: '80vh' }}>
        
        {/* BATTLE MOVES PANEL */}
        <div className={styles.movesPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>⚔️</span>
            <span className={styles.panelTitle}>Battle Moves</span>
          </div>
          
          <div className={styles.movesGrid}>
              {battleMoves.map(move => {
                const onCooldown = moveCooldowns[move.id] > 0;
                const cooldownRemaining = moveCooldowns[move.id] || 0;
                
                // Calculate current effectiveness based on stat
                const statKey = move.stat as keyof typeof playerData.stats;
                const statValue = (playerData.stats?.[statKey] as number) || 1;
                const effectiveness = Math.round((statValue / 100) * 100); // Show as percentage
                const estimatedDamage = Math.round(move.dmg * Math.max(0.1, statValue / 100));
                
                return (
                  <button 
                    key={move.id}
                    className={`${styles.moveButton} ${onCooldown ? styles.onCooldown : ''}`}
                    disabled={isAnimating || playerBattleData.currentHp < 15 || onCooldown}
                    onClick={() => executeBattleMove(move)}
                    title={onCooldown ? `Cooldown: ${cooldownRemaining} turns` : `${effectiveness}% effective (${statValue} ${move.stat})\nEstimated: ${estimatedDamage} damage\nCosts 15 energy`}
                  >
                    <div className={styles.moveIcon}>{move.icon}</div>
                    <div className={styles.moveName}>{move.name}</div>
                    {onCooldown ? (
                      <div 
                        className={styles.cooldownRing}
                        title={`${cooldownRemaining} turns remaining`}
                        style={{
                          background: `conic-gradient(#FFD700 ${(1 - (cooldownRemaining / (move.cooldown || 1))) * 360}deg, rgba(255,255,255,0.1) 0)`
                        }}
                      >
                        <div className={styles.cooldownInner}>{cooldownRemaining}</div>
                      </div>
                    ) : (
                      <>
                        <div className={styles.moveDamage}>~{estimatedDamage} DMG</div>
                        <div className={styles.moveStat}>
                          {effectiveness}% ({move.stat.toUpperCase()} {statValue})
                        </div>
                        <div className={styles.moveCost}>⚡ 15 Energy</div>
                      </>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
        
        {/* BATTLE LOG PANEL */}
        <div className={styles.logPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>📜</span>
            <span className={styles.panelTitle}>Battle Log</span>
          </div>
          
          <div className={styles.logContent}>
            {battleLog.map((entry, idx) => (
              <div key={idx} className={`${styles.logEntry} ${styles[entry.type]}`}>
                <div className={styles.logTurn}>Turn {entry.turn}</div>
                <div className={styles.logEvent}>{entry.event}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* PLAYER STATS PANEL */}
        <div className={styles.statsPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>⚔️</span>
            <span className={styles.panelTitle}>Battle Stats</span>
          </div>
          
          <div className={styles.allStatsGrid}>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>STR</span>
              <span className={styles.statMiniValue}>{playerData.stats?.strength || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>INT</span>
              <span className={styles.statMiniValue}>{playerData.stats?.intelligence || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>CRE</span>
              <span className={styles.statMiniValue}>{playerData.stats?.creativity || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>DEX</span>
              <span className={styles.statMiniValue}>{playerData.stats?.dexterity || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>END</span>
              <span className={styles.statMiniValue}>{playerData.stats?.endurance || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>CHA</span>
              <span className={styles.statMiniValue}>{playerData.stats?.charisma || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>FAI</span>
              <span className={styles.statMiniValue}>{playerData.stats?.faith || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>ING</span>
              <span className={styles.statMiniValue}>{playerData.stats?.ingenuity || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>MIN</span>
              <span className={styles.statMiniValue}>{playerData.stats?.mindfulness || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>WIL</span>
              <span className={styles.statMiniValue}>{playerData.stats?.willpower || 1}</span>
            </div>
            <div className={styles.statMiniItem}>
              <span className={styles.statMiniLabel}>WIS</span>
              <span className={styles.statMiniValue}>{playerData.stats?.wisdom || 1}</span>
            </div>
          </div>
        </div>
        
        {/* QUEST TASKS PANEL */}
        <div className={styles.tasksPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>📋</span>
            <span className={styles.panelTitle}>Quest Tasks</span>
            <button 
              className={styles.addSubquestButton}
              onClick={() => setShowAddSubquestInput(!showAddSubquestInput)}
              title="Add new subquest (Boss will grow stronger!)"
            >
              + Subquest
            </button>
          </div>
          
          {/* ADD SUBQUEST INPUT */}
          {showAddSubquestInput && (
            <div className={styles.addSubquestContainer}>
              <input
                type="text"
                value={newSubquestText}
                onChange={(e) => setNewSubquestText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNewSubquest();
                  }
                }}
                placeholder="Describe the new subquest..."
                className={styles.addSubquestInput}
                disabled={isAddingSubquest}
                autoFocus
              />
              <div className={styles.addSubquestActions}>
                <button 
                  onClick={handleAddNewSubquest}
                  disabled={!newSubquestText.trim() || isAddingSubquest}
                  className={styles.addSubquestConfirm}
                >
                  {isAddingSubquest ? '⏳' : '✓'} Add
                </button>
                <button 
                  onClick={() => {
                    setShowAddSubquestInput(false);
                    setNewSubquestText('');
                  }}
                  className={styles.addSubquestCancel}
                >
                  ✕ Cancel
                </button>
              </div>
              <div className={styles.addSubquestWarning}>
                ⚠️ Boss will gain HP equal to this subquest's value!
              </div>
            </div>
          )}
          
          <div className={styles.tasksList}>
            {questTasks.map(task => (
              <button 
                key={task.id}
                className={`${styles.taskButton} ${task.completed ? styles.completed : ''}`}
                disabled={task.completed || isAnimating}
                onClick={() => executeTask(task)}
              >
                <div className={styles.taskHeader}>
                  <span className={styles.taskNumber}>#{task.id}</span>
                  {task.completed && <span className={styles.taskComplete}>✓</span>}
                </div>
                <div className={styles.taskDescription}>{task.description}</div>
                {!task.completed && task.damage && (
                  <div className={styles.taskDamage}>{task.damage} DMG</div>
                )}
              </button>
            ))}
          </div>
        </div>
        
      </div>
      
      {/* CLOSE BUTTON */}
      <button className={styles.closeButton} onClick={() => setShowExitConfirm(true)}>
        ✕ EXIT BATTLE
      </button>
      
      {/* CRITICAL HIT FLASH OVERLAY */}
      {showCriticalFlash && <div className={styles.criticalFlash} />}
      
      {/* DAMAGE DISPLAY OVERLAY */}
      {damageDisplay && (
        <div 
          className={styles.damageOverlay}
          onClick={() => setDamageDisplay(null)}
        >
          <div className={styles.damagePopup}>
            <div className={`${styles.damageNumber} ${styles[damageDisplay.type]}`}>
              {damageDisplay.amount}
              {damageDisplay.amount > 100 && <span className={styles.critBang}>💥</span>}
            </div>
            {damageDisplay.moveName && (
              <div className={styles.damageMoveName}>{damageDisplay.moveName}</div>
            )}
          </div>
        </div>
      )}
      
      {/* EXIT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div className={styles.exitOverlay}>
          <div className={styles.exitModal}>
            <div className={styles.exitTitle}>Confirm Exit</div>
            <div className={styles.exitSubtitle}>Your progress is saved. You can resume later.</div>
            {lastSavedAt && (
              <div className={styles.exitSaved}>Saved at {new Date(lastSavedAt).toLocaleTimeString()}</div>
            )}
            <div className={styles.exitActions}>
              <button className={styles.exitConfirm} onClick={onClose}>Exit</button>
              <button className={styles.exitCancel} onClick={() => setShowExitConfirm(false)}>Stay</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default TacticalBattleUI;
