import React, { useEffect, useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { Quest } from '../../../features/quests/utils/taskParser';
import TacticalBattleUI from '../../../features/quests/components/TacticalBattleUI';
import { playerStore } from '../../../shared/state/playerStore';
import { PlayerData } from '../../../data/models/PlayerData';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import {
    readBoss,
    type BossFileData,
} from '../../../features/quests/utils/bossFile';
import {
    clearBossFileRaid,
    clearBossRaidPendingVictory,
    describeBossRaidAffinity,
    getActiveBossFileRaid,
} from '../../../features/quests/utils/bossRaidService';
import {
    completeFileBackedDungeonRaid,
    getDungeonBossSource,
    loadJourneyState,
} from '../../../features/quests/utils/journeyRunService';
import {
    buildDungeonRaidNotice,
    computeBossFileRaidLoot,
} from '../../../features/quests/utils/journeyLootService';
import { notifyJourneyVictory } from '../../../shared/services/ceremonyService';
import { getAppliedVisualTheme } from '../../../shared/utils/visualThemeManager';
import hubStyles from './BossHubPixel.module.css';
import { GateBattleIdlePanel } from './components/GateBattleIdlePanel';

interface BossBattleUIProps {
    plugin: GamifiedObsidianPlugin;
}

/**
 * Gate lobby. Fights run in TacticalBattleUI from a boss note.
 * The old selection, creation, and demo-boss screens lived in this file and never rendered.
 */
export const BossBattleUI: React.FC<BossBattleUIProps> = ({ plugin }) => {
    const [playerData, setPlayerData] = useState<PlayerData | null>(() => playerStore.getSync());
    const [bossRaidFile, setBossRaidFile] = useState<BossFileData | null>(null);
    const [bossRaidLockDungeon, setBossRaidLockDungeon] = useState(false);
    const [bossRaidPendingVictory, setBossRaidPendingVictory] = useState(false);
    const [bossVictoryPreview, setBossVictoryPreview] = useState(false);
    const [inBattle, setInBattle] = useState(false);

    useEffect(() => {
        if (playerData) return;
        void playerStore.get().then((data) => {
            if (data) setPlayerData(data);
        });
    }, [playerData]);

    useEffect(() => {
        const handler = () => void plugin.openCreateBossModal();
        window.addEventListener('openBossCreation', handler);
        return () => window.removeEventListener('openBossCreation', handler);
    }, [plugin]);

    // Consume a file-backed boss raid intent (from the Dungeon "Enter raid").
    useEffect(() => {
        const consume = async (path: string, lockDungeon: boolean) => {
            const raid = getActiveBossFileRaid();
            const pendingVictory =
                !!raid?.pendingVictoryClaim && raid.bossFilePath === path;
            const boss = await readBoss(plugin.app, path);
            if (!boss) {
                pixelNotice('Could not load that boss note.', 3000);
                return;
            }
            setBossRaidFile(boss);
            setBossVictoryPreview(false);
            setBossRaidLockDungeon(lockDungeon);
            setBossRaidPendingVictory(pendingVictory);
            setCurrentScreen('battle');
        };

        // Intent set before this view mounted.
        const pending = plugin.pendingBossRaid;
        if (pending) {
            plugin.pendingBossRaid = null;
            void consume(pending.path, pending.lockDungeon);
        }

        // Intent dispatched while already mounted.
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ path: string; lockDungeon: boolean }>).detail;
            plugin.pendingBossRaid = null;
            if (detail?.path) void consume(detail.path, detail.lockDungeon);
        };
        window.addEventListener('openBossRaid', handler as EventListener);
        return () => window.removeEventListener('openBossRaid', handler as EventListener);
    }, [plugin]);

    // Debug: open boss workspace directly on the victory screen.
    useEffect(() => {
        const consume = async (path: string) => {
            const boss = await readBoss(plugin.app, path);
            if (!boss) {
                pixelNotice('Could not load that boss note.', 3000);
                return;
            }
            setBossRaidFile(boss);
            setBossVictoryPreview(true);
            setBossRaidLockDungeon(false);
            setCurrentScreen('battle');
        };

        const pending = plugin.pendingBossVictoryPreview;
        if (pending) {
            plugin.pendingBossVictoryPreview = null;
            void consume(pending.path);
        }

        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ path: string }>).detail;
            plugin.pendingBossVictoryPreview = null;
            if (detail?.path) void consume(detail.path);
        };
        window.addEventListener('openBossVictoryPreview', handler as EventListener);
        return () => window.removeEventListener('openBossVictoryPreview', handler as EventListener);
    }, [plugin]);

    useEffect(() => {
        const consume = async (path: string, lockDungeon: boolean) => {
            const raid = getActiveBossFileRaid();
            const pendingVictory =
                !!raid?.pendingVictoryClaim && raid.bossFilePath === path;
            const boss = await readBoss(plugin.app, path);
            if (!boss) {
                pixelNotice('Could not load that boss note.', 3000);
                return;
            }
            setBossRaidFile(boss);
            setBossVictoryPreview(false);
            setBossRaidLockDungeon(lockDungeon);
            setBossRaidPendingVictory(pendingVictory);
            setInBattle(true);
        };

        const pending = plugin.pendingBossRaid;
        if (pending) {
            plugin.pendingBossRaid = null;
            void consume(pending.path, pending.lockDungeon);
        }

        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ path: string; lockDungeon: boolean }>).detail;
            plugin.pendingBossRaid = null;
            if (detail?.path) void consume(detail.path, detail.lockDungeon);
        };
        window.addEventListener('openBossRaid', handler as EventListener);
        return () => window.removeEventListener('openBossRaid', handler as EventListener);
    }, [plugin]);

    useEffect(() => {
        const consume = async (path: string) => {
            const boss = await readBoss(plugin.app, path);
            if (!boss) {
                pixelNotice('Could not load that boss note.', 3000);
                return;
            }
            setBossRaidFile(boss);
            setBossVictoryPreview(true);
            setBossRaidLockDungeon(false);
            setInBattle(true);
        };

        const pending = plugin.pendingBossVictoryPreview;
        if (pending) {
            plugin.pendingBossVictoryPreview = null;
            void consume(pending.path);
        }

        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ path: string }>).detail;
            plugin.pendingBossVictoryPreview = null;
            if (detail?.path) void consume(detail.path);
        };
        window.addEventListener('openBossVictoryPreview', handler as EventListener);
        return () => window.removeEventListener('openBossVictoryPreview', handler as EventListener);
    }, [plugin]);

    if (inBattle && bossRaidFile) {
        const previewTasks = bossVictoryPreview
            ? bossRaidFile.tasks.map((t) => ({ text: t.text, completed: true }))
            : bossRaidFile.tasks.map((t) => ({ text: t.text, completed: t.completed }));

        const raidQuest: Quest = {
            id: `boss-file-${bossRaidFile.bossId}`,
            title: bossRaidFile.name,
            className: 'boss',
            stats: [],
            xp: bossRaidFile.maxHp,
            cp: 0,
            coins: 0,
            priority: 'high',
            difficulty: bossRaidFile.difficulty,
            due: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            skills: [],
            description: bossRaidFile.description || 'A boss that only real work can fell.',
            subtasks: previewTasks,
            completed: false,
            tags: ['boss'],
            estimatedTime: '60',
            energyCost: 0,
        };

        const raidPlayerData: PlayerData = {
            name: playerData?.name || 'Player',
            avatar: playerData?.avatar || '🧙',
            rank: playerData?.rank || 'Adventurer',
            masterClass: playerData?.masterClass || 'Warrior',
            description: playerData?.description || 'A skilled fighter',
            level: playerData?.level || 5,
            xp: playerData?.xp || 0,
            xpRequired: playerData?.xpRequired || 1000,
            total_exp: playerData?.total_exp || 0,
            coins: playerData?.coins || 0,
            cp: playerData?.cp || 0,
            inventory: playerData?.inventory || [],
            stats: {
                energy: playerData?.stats?.energy || 70,
                focus: playerData?.stats?.focus || 80,
                motivation: playerData?.stats?.motivation || 75,
                strength: playerData?.stats?.strength || 60,
                intelligence: playerData?.stats?.intelligence || 60,
                creativity: playerData?.stats?.creativity || 60,
                communication: playerData?.stats?.communication || 60,
                speed: playerData?.stats?.speed || 60,
                wisdom: playerData?.stats?.wisdom || 60,
            },
            lastDailyReset: playerData?.lastDailyReset || new Date().toISOString(),
        };

        const exitRaid = () => {
            setBossRaidFile(null);
            setBossRaidLockDungeon(false);
            setBossRaidPendingVictory(false);
            setBossVictoryPreview(false);
            setInBattle(false);
        };

        const activeRaid = getActiveBossFileRaid();
        const dungeonRaidLootPreview =
            bossRaidLockDungeon && !bossVictoryPreview
                ? computeBossFileRaidLoot(bossRaidFile, getDungeonBossSource(loadJourneyState()))
                : null;

        const currencySymbol = plugin.settings.currencySymbol ?? '🪙';
        const appliedVisualTheme = getAppliedVisualTheme();

        return (
            <div
                data-gamification-theme-root
                data-gamification-visual-theme={appliedVisualTheme.preset}
            >
                <TacticalBattleUI
                    quest={raidQuest}
                    playerData={raidPlayerData}
                    plugin={plugin}
                    bossFile={bossVictoryPreview ? undefined : bossRaidFile}
                    victoryPreview={bossVictoryPreview}
                    bossRaidPendingVictory={bossRaidPendingVictory}
                    bossRaidAffinityLabel={
                        activeRaid ? describeBossRaidAffinity(activeRaid) : undefined
                    }
                    bossRaidProgress={
                        activeRaid
                            ? {
                                  applied: activeRaid.questsApplied,
                                  required: bossRaidFile.requiredTasks,
                              }
                            : undefined
                    }
                    dungeonRaidLootPreview={dungeonRaidLootPreview}
                    onBossFileVictory={async (boss) => {
                        if (bossVictoryPreview) return;
                        if (bossRaidLockDungeon) {
                            const loot = await completeFileBackedDungeonRaid(plugin.app, boss);
                            if (loot) {
                                notifyJourneyVictory(buildDungeonRaidNotice(boss.name, loot, currencySymbol));
                            } else {
                                pixelNotice(
                                    `${boss.name} defeated! Raid spoils were already claimed this cycle.`,
                                    4500
                                );
                            }
                        }
                        clearBossFileRaid();
                        clearBossRaidPendingVictory();
                    }}
                    onQuestComplete={() => {}}
                    onClose={exitRaid}
                />
            </div>
        );
    }

    const appliedVisualTheme = getAppliedVisualTheme();
    const shellProps = {
        className: hubStyles.root,
        'data-gamification-theme-root': true,
        'data-gamification-visual-theme': appliedVisualTheme.preset,
        'data-gamification-shell': 'pixel',
        'data-gamification-pixel-enclave': true,
    } as const;

    return (
        <div {...shellProps}>
            <header className={hubStyles.nav} role="navigation" aria-label="Gate battle">
                <p className={hubStyles.navTitle}>GATE BATTLE</p>
                <p className={hubStyles.navSubtitle}>
                    Gate raids only — start from the Quest sidebar Dungeon tab. Resume an active raid below.
                </p>
            </header>
            <div className={hubStyles.content}>
                <GateBattleIdlePanel plugin={plugin} />
            </div>
        </div>
    );
};
