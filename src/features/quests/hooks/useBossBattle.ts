import { useState, useEffect } from 'react';
import { Boss, BossBattleState } from '../types/BossTypes';
import { BossBattleEngine } from '../utils/bossBattleEngine';
import { BossRewardService, BossVictoryContext, EnhancedBossRewards } from '../services/bossRewardService';
import { playerStore } from '../../../shared/state/playerStore';

interface UseBossBattleProps {
    isOpen: boolean;
    boss: Boss;
    questContext?: {
        timeTaken?: number;
        questCompletionRate?: number;
        perfectCompletion?: boolean;
    };
    onVictory: (boss: Boss, rewards?: EnhancedBossRewards) => void;
    onDefeat: () => void;
}

export const useBossBattle = ({
    isOpen,
    boss,
    questContext,
    onVictory,
    onDefeat
}: UseBossBattleProps) => {
    const [battleState, setBattleState] = useState<BossBattleState | null>(null);
    const [selectedMove, setSelectedMove] = useState<string>('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [showRewards, setShowRewards] = useState(false);
    const [enhancedRewards, setEnhancedRewards] = useState<EnhancedBossRewards | null>(null);
    const [battleStartTime, setBattleStartTime] = useState<number>(Date.now());
    const [rewardService] = useState(() => BossRewardService.getInstance());

    useEffect(() => {
        if (isOpen && boss) {
            initializeBattle();
        }
    }, [isOpen, boss]);

    const initializeBattle = () => {
        const initialState: BossBattleState = {
            boss: { ...boss },
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

            // Enhanced battle state properties
            timeRemaining: undefined,
            phaseTransition: false,
            specialEffects: [],
            comboCount: 0,
            bossMood: 'confident'
        };

        setBattleState(initialState);
        setBattleStartTime(Date.now());
    };

    const handleMoveSelection = (moveName: string) => {
        if (!battleState || isAnimating) return;

        setSelectedMove(moveName);
        setIsAnimating(true);

        // Process the turn
        const newState = BossBattleEngine.processTurn(battleState, moveName);
        setBattleState(newState);

        // Check for game over
        if (newState.gameOver) {
            if (newState.victory) {
                setTimeout(async () => {
                    await processVictory();
                    setShowRewards(true);
                    setTimeout(() => onVictory(boss, enhancedRewards || undefined), 3000);
                }, 2000);
            } else {
                setTimeout(() => onDefeat(), 2000);
            }
        }

        setTimeout(() => setIsAnimating(false), 1000);
    };

    const processVictory = async () => {
        try {
            const player = await playerStore.get();
            if (!player) return;

            const timeTaken = (Date.now() - battleStartTime) / (1000 * 60); // Convert to minutes

            // Check for boss battle time penalties
            const timeLimit = boss.timer?.duration ? boss.timer.duration / 60 : 30; // Convert seconds to minutes, default 30 minutes
            const { BossPenaltyIntegration } = await import('../utils/bossPenaltyIntegration');

            const victoryContext: BossVictoryContext = {
                boss,
                timeTaken,
                playerLevel: player.level || 1,
                questCompletionRate: questContext?.questCompletionRate || 1.0,
                isFirstVictory: true, // TODO: Track defeats separately in boss analytics
                consecutiveWins: 0, // TODO: Track wins separately in boss analytics
                perfectCompletion: questContext?.perfectCompletion || false
            };

            // Get base rewards first
            const baseRewards = await rewardService.processBossVictory(victoryContext);

            // Apply boss time penalties if necessary
            const penaltyResult = await BossPenaltyIntegration.completeBossWithTimeCheck(
                boss,
                battleStartTime,
                timeLimit,
                {
                    xp: baseRewards.xp,
                    coins: baseRewards.coins,
                    cp: baseRewards.cp
                }
            );

            // Update rewards with penalty results
            const finalRewards = {
                ...baseRewards,
                xp: penaltyResult.finalRewards.xp,
                coins: penaltyResult.finalRewards.coins,
                cp: penaltyResult.finalRewards.cp
            };

            setEnhancedRewards(finalRewards);

            // Show penalty messages if any
            if (penaltyResult.messages.length > 0) {
                // You could show these in the UI or as notifications
                console.log('Boss battle penalties:', penaltyResult.messages);
            }

            // Boss victory tracking moved to boss analytics system
            // TODO: Implement separate boss tracking system for analytics

        } catch (error) {
            console.error('Error processing boss victory:', error);
        }
    };

    return {
        battleState,
        selectedMove,
        isAnimating,
        showRewards,
        enhancedRewards,
        handleMoveSelection
    };
};
