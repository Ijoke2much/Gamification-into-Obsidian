import React, { useEffect, useMemo, useState } from "react";
import type GamifiedObsidianPlugin from "src/core/main";
import { Card } from "src/shared/components/ui/Card";
import { CircularProgressBar } from "src/shared/components/ui/CircularProgressBar";
import styles from "./AnalyticsTab.module.css";

// Data utils
import { parseQuestsFromMarkdown } from "src/features/quests/utils/taskParser";
import { PomodoroStatsManager } from "src/features/pomodoro/utils/pomodoroStatsManager";
import { loadHabitsFromFile, HabitData } from "src/features/habits/utils/habitsUtils";
import { usePlayerData } from "src/data/hooks/usePlayerData";
import { CoinTransactionTracker, type CoinFlowData } from "src/shared/utils/coinTransactionTracker";
import { CustomMetricsParser, type CustomMetric } from "src/shared/utils/customMetricsParser";
import { AnalyticsExporter } from "src/shared/utils/analyticsExporter";

// Boss Analytics Integration
import { bossAnalyticsService } from "src/features/quests/utils/bossAnalyticsService";
import { bossManagementService } from "src/features/quests/utils/bossManagementService";
import type { BossAnalytics } from "src/features/quests/types/BossTypes";

// Enhanced Boss Analytics Integration
import { BossAnalyticsIntegration } from "src/features/analytics/components/BossAnalyticsIntegration";
import { enhancedBossAnalytics } from "src/features/quests/services/enhancedBossAnalytics";
import { bossAchievementSystem } from "src/features/quests/systems/bossAchievementSystem";

// Real-Time Analytics Integration
import { RealTimeAnalyticsDashboard } from "src/features/analytics/components/RealTimeAnalyticsDashboard";
import { realTimeAnalyticsService } from "src/features/analytics/services/realTimeAnalyticsService";

// Crafting Analytics Integration
import { craftingAnalyticsService } from "src/features/crafting/utils/craftingAnalyticsService";
import type { CraftingAnalytics, WeeklyCraftingData } from "src/features/crafting/utils/craftingAnalyticsService";

// Achievement Analytics Integration
import { achievementEventService } from "src/features/achievements/services/achievementEventService";
import type { AchievementAnalytics } from "src/features/achievements/utils/achievementProcessor";

// Energy Analytics Integration
import { energyAnalyticsService } from "src/features/energy/utils/energyAnalyticsService";
import type { EnergyAnalytics, WeeklyEnergyData } from "src/features/energy/utils/energyAnalyticsService";

// Shop Analytics Integration
import { shopAnalyticsService } from "src/features/shop/utils/shopAnalyticsService";
import type { ShopAnalytics, WeeklyShopData } from "src/features/shop/utils/shopAnalyticsService";

// Quest Progress Analytics
import { QuestProgressTracker } from "./QuestProgressTracker";

type Props = { plugin: GamifiedObsidianPlugin };

// Tab types for the analytics interface
type AnalyticsTabType = 'overview' | 'quests' | 'boss' | 'crafting' | 'achievements' | 'energy' | 'shop' | 'skills' | 'realtime';

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(x.setDate(diff));
}

function endOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? 0 : 7); // adjust when day is sunday
  return new Date(x.setDate(diff));
}

function dayIndex(date: Date) {
  const d = date.getDay();
  // 0 Sun..6 Sat
  return (d + 6) % 7;
}

function fmtRangeLabel(start: Date, end: Date) {
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

export const AnalyticsTab: React.FC<Props> = ({ plugin }) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTabType>('overview');
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());
  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const weekEnd = useMemo(() => endOfWeek(weekAnchor), [weekAnchor]);

  // Core analytics data
  const [tasksCompleted, setTasksCompleted] = useState<number>(0);
  const [tasksDaily, setTasksDaily] = useState<number[]>([0,0,0,0,0,0,0]);
  const [bestDay, setBestDay] = useState<string>("—");
  
  // Quest analytics data
  const [allQuests, setAllQuests] = useState<any[]>([]);

  const [, setHabits] = useState<HabitData[]>([]);
  const [habitsDaily, setHabitsDaily] = useState<number[]>([0,0,0,0,0,0,0]);
  const [habitSuccess, setHabitSuccess] = useState<number>(0);
  const [habitStreaks, setHabitStreaks] = useState<number>(0);

  const [pomoWeek, setPomoWeek] = useState<number>(0);

  // New features
  const [coinFlowData, setCoinFlowData] = useState<CoinFlowData | null>(null);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [metricsSummary, setMetricsSummary] = useState<{
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    completionRate: number;
  } | null>(null);

  // Boss Analytics Data
  const [bossAnalytics, setBossAnalytics] = useState<BossAnalytics[]>([]);
  const [bossManagementStats, setBossManagementStats] = useState<{
    totalBosses: number;
    activeBosses: number;
    defeatedBosses: number;
    averageBossHP: number;
    mostCommonTheme: string;
    totalRewards: { xp: number; cp: number; coins: number };
  } | null>(null);
  const [weeklyBossData, setWeeklyBossData] = useState<{
    battlesFought: number;
    bossesDefeated: number;
    totalDamageDealt: number;
    rewardsEarned: { xp: number; cp: number; coins: number };
  } | null>(null);

  // Crafting Analytics Data
  const [craftingAnalytics, setCraftingAnalytics] = useState<CraftingAnalytics[]>([]);
  const [weeklyCraftingData, setWeeklyCraftingData] = useState<WeeklyCraftingData | null>(null);

  // Achievement Analytics Data
  const [achievementAnalytics, setAchievementAnalytics] = useState<AchievementAnalytics[]>([]);
  const [achievementStats, setAchievementStats] = useState<{
    totalAchievements: number;
    completedAchievements: number;
    averageCompletionTime: number;
    mostCommonCategory: string;
  } | null>(null);
  const [weeklyAchievementData, setWeeklyAchievementData] = useState<{
    achievementsCompleted: number;
    achievementsEarned: { xp: number; cp: number; coins: number };
  } | null>(null);

  // Energy Analytics Data
  const [energyAnalytics, setEnergyAnalytics] = useState<EnergyAnalytics[]>([]);
  const [weeklyEnergyData, setWeeklyEnergyData] = useState<WeeklyEnergyData | null>(null);

  // Shop Analytics Data
  const [shopAnalytics, setShopAnalytics] = useState<ShopAnalytics | null>(null);
  const [weeklyShopData, setWeeklyShopData] = useState<WeeklyShopData | null>(null);

  // Skill Tree Analytics Data
  const [skillAnalytics, setSkillAnalytics] = useState<{
    mostUsedSkills: Array<{
      skillName: string;
      usageCount: number;
      lastUsed: Date;
      efficiency: number;
      progressionRate: number;
      timeSpent: number;
      questsCompleted: number;
      rewardsEarned: number;
    }>;
    mostEfficientSkills: Array<{
      skillName: string;
      efficiency: number;
      progressionRate: number;
      timeSpent: number;
      questsCompleted: number;
    }>;
    fastestProgressingSkills: Array<{
      skillName: string;
      progressionRate: number;
      currentLevel: number;
      maxLevel: number;
      progressToNext: number;
    }>;
    neglectedSkills: Array<{
      skillName: string;
      daysSinceLastUse: number;
      currentLevel: number;
      maxLevel: number;
    }>;
    overallStats: {
      totalSkills: number;
      activeSkills: number;
      masteredSkills: number;
      totalCP: number;
      averageEfficiency: number;
      totalTimeSpent: number;
      averageProgressionRate: number;
    };
    weeklyProgress: {
      skillsUsed: number;
      cpGained: number;
      levelsGained: number;
      timeSpent: number;
      questsCompleted: number;
    };
  } | null>(null);

  const { state } = usePlayerData(plugin);
  const playerName = state.playerData?.name || "Player";

  // Load quest data for analytics
  const loadQuestData = async () => {
    try {
      const questFile = plugin.app.vault.getAbstractFileByPath("GamifiedTasks.md");
      if (questFile && 'read' in plugin.app.vault && typeof plugin.app.vault.read === 'function') {
        const content = await plugin.app.vault.read(questFile as any);
        const quests = await parseQuestsFromMarkdown(content);
        setAllQuests(quests);
      } else {
        setAllQuests([]);
      }
    } catch (error) {
      console.error('Failed to load quest data for analytics:', error);
      setAllQuests([]);
    }
  };

  useEffect(() => {
    loadQuestData();
  }, [plugin, weekStart, weekEnd]);

  // Load weekly tasks
  useEffect(() => {
    (async () => {
      try {
        const files = plugin.app.vault.getMarkdownFiles();
        let totalCompleted = 0;
        const dailyCounts = [0,0,0,0,0,0,0];
        let bestDayCount = 0;
        let bestDayName = "—";

        for (const file of files) {
          const content = await plugin.app.vault.read(file);
          const quests = parseQuestsFromMarkdown(content);
          
          for (const quest of quests) {
            if (quest.completed && quest.lastModified) {
              const completedDate = new Date(quest.lastModified);
              if (completedDate >= weekStart && completedDate <= weekEnd) {
                totalCompleted++;
                const dayIdx = dayIndex(completedDate);
                dailyCounts[dayIdx]++;
                
                if (dailyCounts[dayIdx] > bestDayCount) {
                  bestDayCount = dailyCounts[dayIdx];
                  bestDayName = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][dayIdx];
                }
              }
            }
          }
        }

        setTasksCompleted(totalCompleted);
        setTasksDaily(dailyCounts);
        setBestDay(bestDayName);
      } catch (error) {
        console.error('Failed to load weekly tasks:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Load habits data
  useEffect(() => {
    (async () => {
      try {
        const habits = await loadHabitsFromFile(plugin.app.vault);
        setHabits(habits);
        
        // Calculate weekly habit success
        const dailyHabits = [0,0,0,0,0,0,0];
        let totalSuccess = 0;
        let totalStreaks = 0;
        
        for (const habit of habits) {
          if (habit.weeklyProgress) {
            for (let i = 0; i < 7; i++) {
              if (habit.weeklyProgress[i]) {
                dailyHabits[i]++;
                totalSuccess++;
              }
            }
          }
          if (habit.streak > 0) {
            totalStreaks++;
          }
        }
        
        setHabitsDaily(dailyHabits);
        setHabitSuccess(habits.length > 0 ? Math.round((totalSuccess / (habits.length * 7)) * 100) : 0);
        setHabitStreaks(totalStreaks);
      } catch (error) {
        console.error('Failed to load habits:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Load pomodoro data
  useEffect(() => {
    (async () => {
      try {
        const pomodoroStats = PomodoroStatsManager.loadStats();
        setPomoWeek(pomodoroStats.thisWeekSessions || 0);
      } catch (error) {
        console.error('Failed to load pomodoro stats:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Load coin flow data
  useEffect(() => {
    (async () => {
      try {
        const coinData = await CoinTransactionTracker.getCoinFlowData(plugin.app.vault, weekStart, weekEnd);
        setCoinFlowData(coinData);
      } catch (error) {
        console.error('Failed to load coin flow data:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Load custom metrics
  useEffect(() => {
    (async () => {
      try {
        const metrics = await CustomMetricsParser.loadCustomMetrics(plugin.app.vault);
        setCustomMetrics(metrics.metrics);
        setMetricsSummary({
          total: metrics.totalMetrics,
          byType: {},
          byCategory: {},
          completionRate: metrics.totalMetrics > 0 ? (metrics.completedMetrics / metrics.totalMetrics) * 100 : 0
        });
      } catch (error) {
        console.error('Failed to load custom metrics:', error);
        setCustomMetrics([]);
        setMetricsSummary(null);
      }
    })();
  }, [plugin]);

  // Load Boss Analytics Data
  useEffect(() => {
    (async () => {
      try {
        // Get all boss analytics
        const allBossAnalytics = bossAnalyticsService.getAllBossAnalytics();
        setBossAnalytics(allBossAnalytics);
        
        // Get boss management stats
        const managementStats = bossManagementService.getBossAnalytics();
        setBossManagementStats(managementStats);
        
        // Calculate weekly boss data
        const weeklyBattles = allBossAnalytics.flatMap(boss => 
          boss.battleHistory.filter(battle => {
            const battleDate = new Date(battle.battleDate);
            return battleDate >= weekStart && battleDate <= weekEnd;
          })
        );
        
        const weeklyStats = {
          battlesFought: weeklyBattles.length,
          bossesDefeated: weeklyBattles.filter(b => b.result === 'victory').length,
          totalDamageDealt: weeklyBattles.reduce((sum, b) => sum + b.damageDealt, 0),
          rewardsEarned: weeklyBattles.reduce((sum, b) => ({
            xp: sum.xp + b.rewards.xp,
            cp: sum.cp + b.rewards.cp,
            coins: sum.coins + b.rewards.coins
          }), { xp: 0, cp: 0, coins: 0 })
        };
        
        setWeeklyBossData(weeklyStats);
      } catch (error) {
        console.error('Failed to load boss analytics:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Load Crafting Analytics Data
  useEffect(() => {
    (async () => {
      try {
        // Get overall crafting analytics
        const overallAnalytics = craftingAnalyticsService.getCraftingAnalytics();
        setCraftingAnalytics([overallAnalytics]); // Wrap in array for consistency
        
        // Get weekly crafting data
        const weeklyData = craftingAnalyticsService.getWeeklyCraftingData(weekStart, weekEnd);
        setWeeklyCraftingData(weeklyData);
      } catch (error) {
        console.error('Failed to load crafting analytics:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Load Achievement Analytics Data
  useEffect(() => {
    (async () => {
      try {
        // Get achievement stats
        const stats = achievementEventService.getAchievementStats();
        const analytics = stats.processor.getAnalytics();
        
        setAchievementAnalytics([analytics]); // Wrap in array for consistency
        
        // Set achievement stats
        setAchievementStats({
          totalAchievements: stats.totalAvailable,
          completedAchievements: stats.totalUnlocked,
          averageCompletionTime: 0, // Placeholder - would need to calculate from actual data
          mostCommonCategory: Object.keys(analytics.categoryBreakdown)[0] || 'General'
        });
        
        // Calculate weekly achievement data from recent events
        const weeklyEvents = stats.recentEvents.filter(event => {
          const eventDate = new Date(event.timestamp);
          return eventDate >= weekStart && eventDate <= weekEnd;
        });
        
        const weeklyData = {
          achievementsCompleted: weeklyEvents.length,
          achievementsEarned: { xp: 0, cp: 0, coins: 0 } // Placeholder - would need to calculate from actual rewards
        };
        
        setWeeklyAchievementData(weeklyData);
      } catch (error) {
        console.error('Failed to load achievement analytics:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Load Energy Analytics Data
  useEffect(() => {
    (async () => {
      try {
        // Get energy analytics
        const analytics = await energyAnalyticsService.getEnergyAnalytics();
        setEnergyAnalytics([analytics]);
        
        // Get weekly energy data
        const weeklyData = energyAnalyticsService.getWeeklyEnergyData(weekStart, weekEnd);
        setWeeklyEnergyData(weeklyData);
      } catch (error) {
        console.error('Failed to load energy analytics:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Load Shop Analytics Data
  useEffect(() => {
    (async () => {
      try {
        // Get shop analytics
        const analytics = await shopAnalyticsService.getShopAnalytics(plugin);
        setShopAnalytics(analytics);
        
        // Get weekly shop data
        const weeklyData = shopAnalyticsService.getWeeklyShopData(weekStart, weekEnd);
        setWeeklyShopData(weeklyData);
      } catch (error) {
        console.error('Failed to load shop analytics:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Load Skill Analytics Data
  useEffect(() => {
    (async () => {
      try {
        // Mock skill analytics data for now - this would be replaced with actual skill data loading
        const mockSkillAnalytics = {
          mostUsedSkills: [
            {
              skillName: "Programming",
              usageCount: 25,
              lastUsed: new Date(),
              efficiency: 85,
              progressionRate: 12.5,
              timeSpent: 180,
              questsCompleted: 8,
              rewardsEarned: 1250
            },
            {
              skillName: "Writing",
              usageCount: 18,
              lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
              efficiency: 72,
              progressionRate: 8.3,
              timeSpent: 120,
              questsCompleted: 6,
              rewardsEarned: 830
            }
          ],
          mostEfficientSkills: [
            {
              skillName: "Programming",
              efficiency: 85,
              progressionRate: 12.5,
              timeSpent: 180,
              questsCompleted: 8
            }
          ],
          fastestProgressingSkills: [
            {
              skillName: "Programming",
              progressionRate: 12.5,
              currentLevel: 7,
              maxLevel: 10,
              progressToNext: 75
            }
          ],
          neglectedSkills: [
            {
              skillName: "Design",
              daysSinceLastUse: 14,
              currentLevel: 3,
              maxLevel: 10
            }
          ],
          overallStats: {
            totalSkills: 12,
            activeSkills: 8,
            masteredSkills: 2,
            totalCP: 8500,
            averageEfficiency: 78,
            totalTimeSpent: 1440,
            averageProgressionRate: 9.2
          },
          weeklyProgress: {
            skillsUsed: 5,
            cpGained: 450,
            levelsGained: 2,
            timeSpent: 300,
            questsCompleted: 12
          }
        };
        
        setSkillAnalytics(mockSkillAnalytics);
      } catch (error) {
        console.error('Failed to load skill analytics:', error);
      }
    })();
  }, [plugin, weekStart, weekEnd]);

  // Score gauge: enhanced composite index
  const weeklyScore = useMemo(() => {
    const baseScore = tasksCompleted * 3 + habitsDaily.reduce((a,b)=>a+b,0) * 2 + pomoWeek;
    
    // Bonus for coin earning
    let coinBonus = 0;
    if (coinFlowData) {
      coinBonus = Math.min(20, coinFlowData.totalEarned / 10); // Max 20 bonus for 200+ coins earned
    }
    
    // Bonus for custom metrics completion
    let metricsBonus = 0;
    if (metricsSummary) {
      metricsBonus = Math.min(15, metricsSummary.completionRate / 6.67); // Max 15 bonus for 100% completion
    }
    
    // Bonus for boss battles
    let bossBonus = 0;
    if (weeklyBossData) {
      bossBonus = Math.min(25, weeklyBossData.bossesDefeated * 5 + weeklyBossData.battlesFought * 2);
    }
    
    return Math.max(0, Math.min(100, baseScore + coinBonus + metricsBonus + bossBonus));
  }, [tasksCompleted, habitsDaily, pomoWeek, coinFlowData, metricsSummary, weeklyBossData]);

  const rangeLabel = fmtRangeLabel(weekStart, weekEnd);

  // Create example custom metrics file
  const createExampleMetrics = async () => {
    try {
      await CustomMetricsParser.createExampleMetricsFile(plugin.app.vault);
      // Reload metrics
      const metrics = await CustomMetricsParser.loadCustomMetrics(plugin.app.vault);
      setCustomMetrics(metrics.metrics);
    } catch (error) {
      console.error('Failed to create example metrics:', error);
    }
  };

  // Export analytics data
  const exportAnalytics = async (format: 'json' | 'csv') => {
    try {
      const tasksData = { completed: tasksCompleted, daily: tasksDaily, bestDay };
      const habitsData = { success: habitSuccess, streaks: habitStreaks, daily: habitsDaily };
      const pomodoroData = { sessions: pomoWeek };
      
      let content: string;
      let filename: string;
      let mimeType: string;
      
      if (format === 'json') {
        content = await AnalyticsExporter.exportAsJSON(
          plugin.app.vault, weekStart, weekEnd, tasksData, habitsData, pomodoroData
        );
        filename = `analytics-${weekStart.toISOString().split('T')[0]}-${weekEnd.toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        content = await AnalyticsExporter.exportAsCSV(
          plugin.app.vault, weekStart, weekEnd, tasksData, habitsData, pomodoroData
        );
        filename = `analytics-${weekStart.toISOString().split('T')[0]}-${weekEnd.toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }
      
      AnalyticsExporter.downloadAsFile(content, filename, mimeType);
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'quests':
        return renderQuestTab();
      case 'boss':
        return renderBossTab();
      case 'crafting':
        return renderCraftingTab();
      case 'achievements':
        return renderAchievementsTab();
      case 'energy':
        return renderEnergyTab();
      case 'shop':
        return renderShopTab();
      case 'skills':
        return renderSkillsTab();
      case 'realtime':
        return renderRealTimeTab();
      default:
        return renderOverviewTab();
    }
  };

  // Quest Analytics Tab Content
  const renderQuestTab = () => (
    <div className={styles.questAnalyticsContainer}>
      <QuestProgressTracker 
        quests={allQuests}
        onQuestSelect={(quest) => {
          // Could add quest detail modal here
          console.log('Quest selected:', quest.title);
        }}
      />
    </div>
  );

  // Overview Tab Content
  const renderOverviewTab = () => (
    <>
      <div className={styles.cardsRow}>
        <Card className={styles.card}>
          <div className={styles.cardHeader}>Tasks</div>
          <div className={styles.bigNumber}>{tasksCompleted}</div>
          <div className={styles.subtle}>completed</div>
          <div className={styles.note}>Best day: {bestDay}</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>Habits</div>
          <div className={styles.bigNumber}>{habitSuccess}%</div>
          <div className={styles.subtle}>success rate</div>
          <div className={styles.note}>{habitStreaks} active streaks</div>
        </Card>
      </div>

      <Card className={styles.gaugeRow}>
        <div className={styles.gaugeCol}>
          <div className={styles.cardHeader}>Weekly Score</div>
          <div className={styles.gaugeWrap}>
            <CircularProgressBar percent={weeklyScore} radius={36} stroke={8} />
          </div>
        </div>
        <div className={styles.metricsCol}>
          <div className={styles.metricRow}>
            <span>Tasks</span>
            <span className={styles.metricVal}>{tasksCompleted}</span>
          </div>
          <div className={styles.metricRow}>
            <span>Habits</span>
            <span className={styles.metricVal}>{habitsDaily.reduce((a,b)=>a+b,0)}</span>
          </div>
          <div className={styles.metricRow}>
            <span>Focus</span>
            <span className={styles.metricVal}>{pomoWeek}</span>
          </div>
          {coinFlowData && (
            <div className={styles.metricRow}>
              <span>Coins</span>
              <span className={styles.metricVal}>+{coinFlowData.totalEarned}</span>
            </div>
          )}
          {weeklyBossData && (
            <div className={styles.metricRow}>
              <span>Bosses</span>
              <span className={styles.metricVal}>{weeklyBossData.bossesDefeated}</span>
            </div>
          )}
          {weeklyShopData && weeklyShopData.totalPurchases > 0 && (
            <div className={styles.metricRow}>
              <span>Purchases</span>
              <span className={styles.metricVal}>{weeklyShopData.totalPurchases}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Coin Flow Section */}
      {coinFlowData && (
        <>
          <div className={styles.sectionHeader}>Coin Flow</div>
          <div className={styles.cardsRow}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Earned</div>
              <div className={styles.bigNumber} style={{ color: 'var(--interactive-success)' }}>
                +{coinFlowData.totalEarned}
              </div>
              <div className={styles.subtle}>this week</div>
            </Card>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Spent</div>
              <div className={styles.bigNumber} style={{ color: 'var(--interactive-accent-hover)' }}>
                -{coinFlowData.totalSpent}
              </div>
              <div className={styles.subtle}>this week</div>
            </Card>
          </div>
          <Card>
            <div className={styles.coinFlowChart}>
              {[0,1,2,3,4,5,6].map((i) => {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + i);
                const dateKey = date.toISOString().split('T')[0];
                const dayData = coinFlowData.dailyFlow[dateKey] || { earned: 0, spent: 0, net: 0 };
                
                const maxHeight = 80;
                const scale = 4;
                const earnedHeight = Math.min(maxHeight, dayData.earned * scale);
                const spentHeight = Math.min(maxHeight - earnedHeight, dayData.spent * scale);
                
                return (
                  <div key={i} className={styles.barCol}>
                    <div className={styles.barStack}>
                      <div className={styles.barEarned} style={{ height: `${earnedHeight}px` }} />
                      <div className={styles.barSpent} style={{ height: `${spentHeight}px` }} />
                    </div>
                    <div className={styles.barLabel}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                    <div className={styles.barTotal}>{dayData.net > 0 ? `+${dayData.net}` : dayData.net}</div>
                  </div>
                );
              })}
            </div>
            <div className={styles.legend}>
              <span className={styles.legendItem}><i className={styles.legendEarned} /> Earned</span>
              <span className={styles.legendItem}><i className={styles.legendSpent} /> Spent</span>
            </div>
          </Card>
        </>
      )}

      {/* Custom Metrics Section */}
      {customMetrics.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Custom Metrics</div>
          <Card>
            <div className={styles.metricsGrid}>
              {customMetrics.slice(0, 6).map((metric) => (
                <div key={metric.id} className={styles.metricCard}>
                  <div className={styles.metricName}>{metric.name}</div>
                  <div className={styles.metricValue}>
                    {metric.value}{metric.unit && <span className={styles.metricUnit}>{metric.unit}</span>}
                  </div>
                  {metric.target && (
                    <div className={styles.metricProgress}>
                      <div 
                        className={styles.metricProgressBar} 
                        style={{ width: `${Math.min(100, (metric.value / metric.target) * 100)}%` }}
                      />
                    </div>
                  )}
                  <div className={styles.metricType}>{metric.type}</div>
                </div>
              ))}
            </div>
            {metricsSummary && (
              <div className={styles.metricsSummary}>
                <span>Total: {metricsSummary.total}</span>
                <span>Completion: {Math.round(metricsSummary.completionRate)}%</span>
              </div>
            )}
          </Card>
        </>
      )}

      <div className={styles.sectionHeader}>Daily Activity</div>
      <Card>
        <div className={styles.activityChart}>
          {[0,1,2,3,4,5,6].map((i) => {
            const t = tasksDaily[i] || 0;
            const h = habitsDaily[i] || 0;
            const total = t + h;
            const maxHeight = 120; // px
            const scale = 8; // px per unit
            const tH = Math.min(maxHeight, t * scale);
            const hH = Math.min(maxHeight - tH, h * scale);
            return (
              <div key={i} className={styles.barCol}>
                <div className={styles.barStack}>
                  <div className={styles.barTasks} style={{ height: `${tH}px` }} />
                  <div className={styles.barHabits} style={{ height: `${hH}px` }} />
                </div>
                <div className={styles.barLabel}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                <div className={styles.barTotal}>{total || ""}</div>
              </div>
            );
          })}
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}><i className={styles.legendTasks} /> Tasks</span>
          <span className={styles.legendItem}><i className={styles.legendHabits} /> Habits</span>
        </div>
      </Card>
    </>
  );

  // Boss Tab Content
  const renderBossTab = () => (
    <>
      {/* Enhanced Boss Analytics Integration */}
      <BossAnalyticsIntegration className={styles.enhancedBossAnalytics} />

      {/* Weekly Boss Stats */}
      <div className={styles.cardsRow}>
        <Card className={styles.card}>
          <div className={styles.cardHeader}>Battles</div>
          <div className={styles.bigNumber}>{weeklyBossData?.battlesFought || 0}</div>
          <div className={styles.subtle}>fought this week</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>Victories</div>
          <div className={styles.bigNumber} style={{ color: 'var(--interactive-success)' }}>
            {weeklyBossData?.bossesDefeated || 0}
          </div>
          <div className={styles.subtle}>bosses defeated</div>
        </Card>
      </div>

      {/* Overall Boss Stats */}
      {bossManagementStats && (
        <>
          <div className={styles.sectionHeader}>Overall Boss Progress</div>
          <div className={styles.cardsRow}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Total Bosses</div>
              <div className={styles.bigNumber}>{bossManagementStats.totalBosses}</div>
              <div className={styles.subtle}>encountered</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Active</div>
              <div className={styles.bigNumber} style={{ color: 'var(--interactive-accent)' }}>
                {bossManagementStats.activeBosses}
              </div>
              <div className={styles.subtle}>current battles</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Defeated</div>
              <div className={styles.bigNumber} style={{ color: 'var(--interactive-success)' }}>
                {bossManagementStats.defeatedBosses}
              </div>
              <div className={styles.subtle}>victories</div>
            </Card>
          </div>
        </>
      )}

      {/* Boss Rewards */}
      {weeklyBossData && weeklyBossData.rewardsEarned.xp > 0 && (
        <>
          <div className={styles.sectionHeader}>Boss Rewards (This Week)</div>
          <Card>
            <div className={styles.rewardsGrid}>
              <div className={styles.rewardItem}>
                <div className={styles.rewardIcon}>⭐</div>
                <div className={styles.rewardValue}>+{weeklyBossData.rewardsEarned.xp}</div>
                <div className={styles.rewardLabel}>XP</div>
              </div>
              <div className={styles.rewardItem}>
                <div className={styles.rewardIcon}>🎯</div>
                <div className={styles.rewardValue}>+{weeklyBossData.rewardsEarned.cp}</div>
                <div className={styles.rewardLabel}>CP</div>
              </div>
              <div className={styles.rewardItem}>
                <div className={styles.rewardIcon}>🪙</div>
                <div className={styles.rewardValue}>+{weeklyBossData.rewardsEarned.coins}</div>
                <div className={styles.rewardLabel}>Coins</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Boss Analytics Chart */}
      {bossAnalytics.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Boss Performance</div>
          <Card>
            <div className={styles.bossAnalyticsGrid}>
              {bossAnalytics.slice(0, 4).map((boss) => (
                <div key={boss.bossId} className={styles.bossCard}>
                  <div className={styles.bossName}>{boss.bossName}</div>
                  <div className={styles.bossStats}>
                    <div className={styles.bossStat}>
                      <span>Win Rate:</span>
                      <span className={styles.bossStatValue}>{Math.round(boss.winRate * 100)}%</span>
                    </div>
                    <div className={styles.bossStat}>
                      <span>Battles:</span>
                      <span className={styles.bossStatValue}>{boss.totalBattles}</span>
                    </div>
                    <div className={styles.bossStat}>
                      <span>Avg Time:</span>
                      <span className={styles.bossStatValue}>{Math.round(boss.averageBattleTime)}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {bossAnalytics.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🐉</div>
          <div className={styles.emptyTitle}>No Boss Battles Yet</div>
          <div className={styles.emptyDescription}>
            Start fighting bosses in the Quest tab to see your battle analytics here!
          </div>
        </div>
      )}
    </>
  );

  // Crafting Tab Content
  const renderCraftingTab = () => (
    <>
      {/* Weekly Crafting Stats */}
      <div className={styles.cardsRow}>
        <Card className={styles.card}>
          <div className={styles.cardHeader}>Crafts</div>
          <div className={styles.bigNumber}>{weeklyCraftingData?.craftsCompleted || 0}</div>
          <div className={styles.subtle}>completed this week</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>Success Rate</div>
          <div className={styles.bigNumber}>
            {weeklyCraftingData && weeklyCraftingData.craftsCompleted > 0 
              ? Math.round((weeklyCraftingData.successfulCrafts / weeklyCraftingData.craftsCompleted) * 100)
              : 0}%
          </div>
          <div className={styles.subtle}>success rate</div>
        </Card>
      </div>

      {/* Overall Crafting Stats */}
      {craftingAnalytics.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Overall Crafting Progress</div>
          <div className={styles.cardsRow}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Total Crafts</div>
              <div className={styles.bigNumber}>{craftingAnalytics[0].totalCrafts}</div>
              <div className={styles.subtle}>completed</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Success Rate</div>
              <div className={styles.bigNumber}>{Math.round(craftingAnalytics[0].successRate)}%</div>
              <div className={styles.subtle}>overall</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Skill Level</div>
              <div className={styles.bigNumber}>{craftingAnalytics[0].skillLevel}</div>
              <div className={styles.subtle}>crafting level</div>
            </Card>
          </div>
        </>
      )}

      {/* Crafting Rewards */}
      {weeklyCraftingData && weeklyCraftingData.xpEarned > 0 && (
        <>
          <div className={styles.sectionHeader}>Crafting Rewards (This Week)</div>
          <Card>
            <div className={styles.rewardsGrid}>
              <div className={styles.rewardItem}>
                <div className={styles.rewardIcon}>⭐</div>
                <div className={styles.rewardValue}>+{weeklyCraftingData.xpEarned}</div>
                <div className={styles.rewardLabel}>XP</div>
              </div>
              <div className={styles.rewardItem}>
                <div className={styles.rewardIcon}>🎯</div>
                <div className={styles.rewardValue}>+{weeklyCraftingData.boogersEarned}</div>
                <div className={styles.rewardLabel}>Boogers</div>
              </div>
              <div className={styles.rewardItem}>
                <div className={styles.rewardIcon}>🔨</div>
                <div className={styles.rewardValue}>+{weeklyCraftingData.skillGained}</div>
                <div className={styles.rewardLabel}>Skill XP</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Most Crafted Recipes */}
      {craftingAnalytics.length > 0 && craftingAnalytics[0].mostCraftedRecipes.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Most Crafted Recipes</div>
          <Card>
            <div className={styles.craftingAnalyticsGrid}>
              {craftingAnalytics[0].mostCraftedRecipes.slice(0, 4).map((recipe) => (
                <div key={recipe.recipeId} className={styles.craftingCard}>
                  <div className={styles.craftingName}>{recipe.name}</div>
                  <div className={styles.craftingStats}>
                    <div className={styles.craftingStat}>
                      <span>Crafted:</span>
                      <span className={styles.craftingStatValue}>{recipe.count}</span>
                    </div>
                    <div className={styles.craftingStat}>
                      <span>Avg Time:</span>
                      <span className={styles.craftingStatValue}>{Math.round(craftingAnalytics[0].averageCraftingTime)}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {craftingAnalytics.length === 0 || craftingAnalytics[0].totalCrafts === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔨</div>
          <div className={styles.emptyTitle}>No Crafting Yet</div>
          <div className={styles.emptyDescription}>
            Start crafting items in the Crafting tab to see your crafting analytics here!
          </div>
        </div>
      ) : null}
    </>
  );

  // Achievements Tab Content
  const renderAchievementsTab = () => (
    <>
      {/* Weekly Achievement Stats */}
      <div className={styles.cardsRow}>
        <Card className={styles.card}>
          <div className={styles.cardHeader}>Achievements</div>
          <div className={styles.bigNumber}>{weeklyAchievementData?.achievementsCompleted || 0}</div>
          <div className={styles.subtle}>completed this week</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>Earned Rewards</div>
          <div className={styles.bigNumber}>
            {weeklyAchievementData && (
              <>
                XP: +{weeklyAchievementData.achievementsEarned.xp}
                <br />
                CP: +{weeklyAchievementData.achievementsEarned.cp}
                <br />
                Coins: +{weeklyAchievementData.achievementsEarned.coins}
              </>
            )}
          </div>
          <div className={styles.subtle}>rewards earned</div>
        </Card>
      </div>

      {/* Overall Achievement Stats */}
      {achievementStats && (
        <>
          <div className={styles.sectionHeader}>Overall Achievement Progress</div>
          <div className={styles.cardsRow}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Total Achievements</div>
              <div className={styles.bigNumber}>{achievementStats.totalAchievements}</div>
              <div className={styles.subtle}>unlocked</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Completed</div>
              <div className={styles.bigNumber} style={{ color: 'var(--interactive-success)' }}>
                {achievementStats.completedAchievements}
              </div>
              <div className={styles.subtle}>completed</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Average Completion Time</div>
              <div className={styles.bigNumber}>{Math.round(achievementStats.averageCompletionTime)}m</div>
              <div className={styles.subtle}>average time</div>
            </Card>
          </div>
        </>
      )}

      {/* Achievement Rewards */}
      {weeklyAchievementData && weeklyAchievementData.achievementsEarned.xp > 0 && (
        <>
          <div className={styles.sectionHeader}>Achievement Rewards (This Week)</div>
          <Card>
            <div className={styles.rewardsGrid}>
              <div className={styles.rewardItem}>
                <div className={styles.rewardIcon}>⭐</div>
                <div className={styles.rewardValue}>+{weeklyAchievementData.achievementsEarned.xp}</div>
                <div className={styles.rewardLabel}>XP</div>
              </div>
              <div className={styles.rewardItem}>
                <div className={styles.rewardIcon}>🎯</div>
                <div className={styles.rewardValue}>+{weeklyAchievementData.achievementsEarned.cp}</div>
                <div className={styles.rewardLabel}>CP</div>
              </div>
              <div className={styles.rewardItem}>
                <div className={styles.rewardIcon}>🪙</div>
                <div className={styles.rewardValue}>+{weeklyAchievementData.achievementsEarned.coins}</div>
                <div className={styles.rewardLabel}>Coins</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Achievement Analytics Chart */}
      {achievementAnalytics.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Achievement Performance</div>
          <Card>
            <div className={styles.achievementAnalyticsGrid}>
              {/* Category Breakdown */}
              {Object.entries(achievementAnalytics[0].categoryBreakdown).slice(0, 4).map(([category, stats]) => (
                <div key={category} className={styles.achievementCard}>
                  <div className={styles.achievementName}>{category}</div>
                  <div className={styles.achievementStats}>
                    <div className={styles.achievementStat}>
                      <span>Total:</span>
                      <span className={styles.achievementStatValue}>{stats.total}</span>
                    </div>
                    <div className={styles.achievementStat}>
                      <span>Completed:</span>
                      <span className={styles.achievementStatValue}>{stats.completed}</span>
                    </div>
                    <div className={styles.achievementStat}>
                      <span>Progress:</span>
                      <span className={styles.achievementStatValue}>{stats.inProgress}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {achievementAnalytics.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏆</div>
          <div className={styles.emptyTitle}>No Achievements Yet</div>
          <div className={styles.emptyDescription}>
            Complete achievements in the Quest tab to see your achievement analytics here!
          </div>
        </div>
      )}
    </>
  );

  // Energy Tab Content
  const renderEnergyTab = () => (
    <>
      {/* Current Energy Stats */}
      {energyAnalytics.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Current Energy Status</div>
          <div className={styles.cardsRow}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Energy</div>
              <div className={styles.bigNumber}>{energyAnalytics[0].currentEnergy}</div>
              <div className={styles.subtle}>current level</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Focus</div>
              <div className={styles.bigNumber}>{energyAnalytics[0].currentFocus}</div>
              <div className={styles.subtle}>current level</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Motivation</div>
              <div className={styles.bigNumber}>{energyAnalytics[0].currentMotivation}</div>
              <div className={styles.subtle}>current level</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Stress</div>
              <div className={styles.bigNumber} style={{ color: energyAnalytics[0].currentStress > 70 ? 'var(--text-error)' : 'var(--text-normal)' }}>
                {energyAnalytics[0].currentStress}
              </div>
              <div className={styles.subtle}>current level</div>
            </Card>
          </div>
        </>
      )}

      {/* Weekly Energy Stats */}
      {weeklyEnergyData && (
        <>
          <div className={styles.sectionHeader}>Weekly Energy Performance</div>
          <div className={styles.cardsRow}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Activities</div>
              <div className={styles.bigNumber}>{weeklyEnergyData.activitiesCompleted}</div>
              <div className={styles.subtle}>completed this week</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Energy Spent</div>
              <div className={styles.bigNumber}>{weeklyEnergyData.totalEnergySpent}</div>
              <div className={styles.subtle}>total spent</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Energy Gained</div>
              <div className={styles.bigNumber} style={{ color: 'var(--interactive-success)' }}>
                +{weeklyEnergyData.totalEnergyGained}
              </div>
              <div className={styles.subtle}>total gained</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Rest Periods</div>
              <div className={styles.bigNumber}>{weeklyEnergyData.restPeriods}</div>
              <div className={styles.subtle}>this week</div>
            </Card>
          </div>
        </>
      )}

      {/* Performance Metrics */}
      {energyAnalytics.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Performance Metrics</div>
          <div className={styles.cardsRow}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Efficiency</div>
              <div className={styles.bigNumber}>{Math.round(energyAnalytics[0].efficiency)}%</div>
              <div className={styles.subtle}>energy efficiency</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Consistency</div>
              <div className={styles.bigNumber}>{Math.round(energyAnalytics[0].consistency)}%</div>
              <div className={styles.subtle}>energy consistency</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Recovery Rate</div>
              <div className={styles.bigNumber}>{Math.round(energyAnalytics[0].recoveryRate)}%</div>
              <div className={styles.subtle}>recovery speed</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Stress Management</div>
              <div className={styles.bigNumber}>{Math.round(energyAnalytics[0].stressManagement)}%</div>
              <div className={styles.subtle}>stress control</div>
            </Card>
          </div>
        </>
      )}

      {/* Energy Trends */}
      {energyAnalytics.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Energy Trends</div>
          <Card>
            <div className={styles.energyTrendsGrid}>
              <div className={styles.trendItem}>
                <div className={styles.trendLabel}>Current Trend</div>
                <div className={styles.trendValue}>
                  {energyAnalytics[0].energyTrend === 'rising' && '📈 Rising'}
                  {energyAnalytics[0].energyTrend === 'stable' && '➡️ Stable'}
                  {energyAnalytics[0].energyTrend === 'declining' && '📉 Declining'}
                  {energyAnalytics[0].energyTrend === 'critical' && '🔴 Critical'}
                </div>
              </div>
              <div className={styles.trendItem}>
                <div className={styles.trendLabel}>Weekly Trend</div>
                <div className={styles.trendValue}>
                  {energyAnalytics[0].weeklyTrend === 'improving' && '📈 Improving'}
                  {energyAnalytics[0].weeklyTrend === 'stable' && '➡️ Stable'}
                  {energyAnalytics[0].weeklyTrend === 'declining' && '📉 Declining'}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Recommendations */}
      {energyAnalytics.length > 0 && energyAnalytics[0].recommendations.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Recommendations</div>
          <Card>
            <div className={styles.recommendationsList}>
              {energyAnalytics[0].recommendations.map((recommendation, index) => (
                <div key={index} className={styles.recommendationItem}>
                  <div className={styles.recommendationIcon}>💡</div>
                  <div className={styles.recommendationText}>{recommendation}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {energyAnalytics.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚡</div>
          <div className={styles.emptyTitle}>No Energy Data Yet</div>
          <div className={styles.emptyDescription}>
            Start using energy activities to see your energy analytics here!
          </div>
        </div>
      )}
    </>
  );

  // Shop Tab Content
  const renderShopTab = () => (
    <>
      {/* Weekly Shop Stats */}
      <div className={styles.cardsRow}>
        <Card className={styles.card}>
          <div className={styles.cardHeader}>Purchases</div>
          <div className={styles.bigNumber}>{weeklyShopData?.totalPurchases || 0}</div>
          <div className={styles.subtle}>made this week</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>Total Spent</div>
          <div className={styles.bigNumber} style={{ color: 'var(--interactive-accent-hover)' }}>
            {weeklyShopData?.totalSpent || 0}
          </div>
          <div className={styles.subtle}>coins spent</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>Items Bought</div>
          <div className={styles.bigNumber}>{weeklyShopData?.itemsBought || 0}</div>
          <div className={styles.subtle}>total items</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>Avg Purchase</div>
          <div className={styles.bigNumber}>{Math.round(weeklyShopData?.averagePurchaseValue || 0)}</div>
          <div className={styles.subtle}>coins per purchase</div>
        </Card>
      </div>

      {/* Overall Shop Stats */}
      {shopAnalytics && (
        <>
          <div className={styles.sectionHeader}>Overall Shopping Stats</div>
          <div className={styles.cardsRow}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Total Purchases</div>
              <div className={styles.bigNumber}>{shopAnalytics.totalPurchases}</div>
              <div className={styles.subtle}>all time</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Total Spent</div>
              <div className={styles.bigNumber}>{shopAnalytics.totalSpent}</div>
              <div className={styles.subtle}>coins spent</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Unique Items</div>
              <div className={styles.bigNumber}>{shopAnalytics.uniqueItemsBought}</div>
              <div className={styles.subtle}>different items</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Price Efficiency</div>
              <div className={styles.bigNumber}>{Math.round(shopAnalytics.priceEfficiency)}%</div>
              <div className={styles.subtle}>deal finding</div>
            </Card>
          </div>
        </>
      )}

      {/* Biggest Purchase This Week */}
      {weeklyShopData && weeklyShopData.biggestPurchase.amount > 0 && (
        <>
          <div className={styles.sectionHeader}>This Week's Highlights</div>
          <Card>
            <div className={styles.bigPurchase}>
              <div className={styles.bigPurchaseIcon}>🛒</div>
              <div className={styles.bigPurchaseInfo}>
                <div className={styles.bigPurchaseTitle}>Biggest Purchase</div>
                <div className={styles.bigPurchaseName}>{weeklyShopData.biggestPurchase.item}</div>
                <div className={styles.bigPurchaseAmount}>{weeklyShopData.biggestPurchase.amount} coins</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Top Categories */}
      {weeklyShopData && weeklyShopData.topCategories.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Top Categories (This Week)</div>
          <Card>
            <div className={styles.categoriesGrid}>
              {weeklyShopData.topCategories.map((category) => (
                <div key={category.category} className={styles.categoryCard}>
                  <div className={styles.categoryName}>{category.category}</div>
                  <div className={styles.categoryStats}>
                    <div className={styles.categoryStat}>
                      <span>Spent:</span>
                      <span className={styles.categoryStatValue}>{category.spent} coins</span>
                    </div>
                    <div className={styles.categoryStat}>
                      <span>Purchases:</span>
                      <span className={styles.categoryStatValue}>{category.purchases}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Most Purchased Items */}
      {shopAnalytics && shopAnalytics.mostPurchasedItems.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Most Purchased Items</div>
          <Card>
            <div className={styles.itemsGrid}>
              {shopAnalytics.mostPurchasedItems.slice(0, 6).map((item) => (
                <div key={item.itemName} className={styles.itemCard}>
                  <div className={styles.itemName}>{item.itemName}</div>
                  <div className={styles.itemStats}>
                    <div className={styles.itemStat}>
                      <span>Bought:</span>
                      <span className={styles.itemStatValue}>{item.count}x</span>
                    </div>
                    <div className={styles.itemStat}>
                      <span>Total Spent:</span>
                      <span className={styles.itemStatValue}>{item.totalSpent} coins</span>
                    </div>
                  </div>
                  <div className={styles.itemCategory}>{item.category}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Spending Patterns */}
      {shopAnalytics && shopAnalytics.spendingTrend !== 'stable' && (
        <>
          <div className={styles.sectionHeader}>Spending Analysis</div>
          <Card>
            <div className={styles.spendingAnalysis}>
              <div className={styles.trendIndicator}>
                <div className={styles.trendLabel}>Spending Trend:</div>
                <div className={`${styles.trendValue} ${
                  shopAnalytics.spendingTrend === 'increasing' ? styles.increasing : styles.decreasing
                }`}>
                  {shopAnalytics.spendingTrend === 'increasing' && '📈 Increasing'}
                  {shopAnalytics.spendingTrend === 'decreasing' && '📉 Decreasing'}
                </div>
              </div>
              
              <div className={styles.financialHealth}>
                <div className={styles.healthMetric}>
                  <span>Spending Ratio:</span>
                  <span className={styles.healthValue}>{Math.round(shopAnalytics.spendingToEarningRatio)}%</span>
                </div>
                <div className={styles.healthMetric}>
                  <span>Savings Rate:</span>
                  <span className={styles.healthValue}>{Math.round(shopAnalytics.savingsRate)}%</span>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Peak Shopping Times */}
      {shopAnalytics && shopAnalytics.peakSpendingTimes.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Shopping Patterns</div>
          <Card>
            <div className={styles.peakTimes}>
              <div className={styles.peakTimesLabel}>Peak Shopping Times:</div>
              <div className={styles.peakTimesList}>
                {shopAnalytics.peakSpendingTimes.map((time, index) => (
                  <span key={index} className={styles.peakTime}>{time}</span>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Recommendations */}
      {shopAnalytics && shopAnalytics.recommendations.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Shopping Recommendations</div>
          <Card>
            <div className={styles.recommendationsList}>
              {shopAnalytics.recommendations.map((recommendation, index) => (
                <div key={index} className={styles.recommendationItem}>
                  <div className={styles.recommendationIcon}>💰</div>
                  <div className={styles.recommendationText}>{recommendation}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Empty State */}
      {(!shopAnalytics || shopAnalytics.totalPurchases === 0) && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🛍️</div>
          <div className={styles.emptyTitle}>No Purchases Yet</div>
          <div className={styles.emptyDescription}>
            Start shopping in the Shop tab to see your shopping analytics here!
          </div>
        </div>
      )}
    </>
  );

  // Skills Tab Content
  const renderSkillsTab = () => (
    <>
      {/* Weekly Skills Stats */}
      <div className={styles.cardsRow}>
        <Card className={styles.card}>
          <div className={styles.cardHeader}>Skills Used</div>
          <div className={styles.bigNumber}>{skillAnalytics?.weeklyProgress.skillsUsed || 0}</div>
          <div className={styles.subtle}>this week</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>CP Gained</div>
          <div className={styles.bigNumber} style={{ color: 'var(--interactive-success)' }}>
            +{skillAnalytics?.weeklyProgress.cpGained || 0}
          </div>
          <div className={styles.subtle}>skill points</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>Levels Gained</div>
          <div className={styles.bigNumber} style={{ color: 'var(--interactive-accent)' }}>
            +{skillAnalytics?.weeklyProgress.levelsGained || 0}
          </div>
          <div className={styles.subtle}>skill levels</div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>Time Spent</div>
          <div className={styles.bigNumber}>{Math.round((skillAnalytics?.weeklyProgress.timeSpent || 0) / 60)}</div>
          <div className={styles.subtle}>minutes</div>
        </Card>
      </div>

      {/* Overall Skills Stats */}
      {skillAnalytics && (
        <>
          <div className={styles.sectionHeader}>Overall Skills Stats</div>
          <div className={styles.cardsRow}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>Total Skills</div>
              <div className={styles.bigNumber}>{skillAnalytics.overallStats.totalSkills}</div>
              <div className={styles.subtle}>discovered</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Active Skills</div>
              <div className={styles.bigNumber}>{skillAnalytics.overallStats.activeSkills}</div>
              <div className={styles.subtle}>in use</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Mastered Skills</div>
              <div className={styles.bigNumber}>{skillAnalytics.overallStats.masteredSkills}</div>
              <div className={styles.subtle}>max level</div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.cardHeader}>Avg Efficiency</div>
              <div className={styles.bigNumber}>{Math.round(skillAnalytics.overallStats.averageEfficiency)}%</div>
              <div className={styles.subtle}>skill usage</div>
            </Card>
          </div>
        </>
      )}

      {/* Most Used Skills */}
      {skillAnalytics && skillAnalytics.mostUsedSkills.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Most Used Skills</div>
          <Card>
            <div className={styles.skillsGrid}>
              {skillAnalytics.mostUsedSkills.slice(0, 5).map((skill) => (
                <div key={skill.skillName} className={styles.skillCard}>
                  <div className={styles.skillHeader}>
                    <div className={styles.skillName}>{skill.skillName}</div>
                    <div className={styles.skillUsage}>{skill.usageCount} uses</div>
                  </div>
                  <div className={styles.skillStats}>
                    <div className={styles.skillStat}>
                      <span>Efficiency:</span>
                      <span className={styles.skillStatValue}>{Math.round(skill.efficiency)}%</span>
                    </div>
                    <div className={styles.skillStat}>
                      <span>CP Gained:</span>
                      <span className={styles.skillStatValue}>+{skill.rewardsEarned}</span>
                    </div>
                    <div className={styles.skillStat}>
                      <span>Time:</span>
                      <span className={styles.skillStatValue}>{Math.round(skill.timeSpent / 60)}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Fastest Progressing Skills */}
      {skillAnalytics && skillAnalytics.fastestProgressingSkills.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Fastest Progressing Skills</div>
          <Card>
            <div className={styles.skillsGrid}>
              {skillAnalytics.fastestProgressingSkills.slice(0, 5).map((skill) => (
                <div key={skill.skillName} className={styles.skillCard}>
                  <div className={styles.skillHeader}>
                    <div className={styles.skillName}>{skill.skillName}</div>
                    <div className={styles.skillProgress}>
                      Level {skill.currentLevel}/{skill.maxLevel}
                    </div>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${skill.progressToNext}%` }}
                    />
                  </div>
                  <div className={styles.skillStats}>
                    <div className={styles.skillStat}>
                      <span>Progress Rate:</span>
                      <span className={styles.skillStatValue}>+{skill.progressionRate.toFixed(1)} CP/day</span>
                    </div>
                    <div className={styles.skillStat}>
                      <span>To Next Level:</span>
                      <span className={styles.skillStatValue}>{Math.round(100 - skill.progressToNext)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Neglected Skills */}
      {skillAnalytics && skillAnalytics.neglectedSkills.length > 0 && (
        <>
          <div className={styles.sectionHeader}>Skills Needing Attention</div>
          <Card>
            <div className={styles.skillsGrid}>
              {skillAnalytics.neglectedSkills.slice(0, 5).map((skill) => (
                <div key={skill.skillName} className={styles.skillCard}>
                  <div className={styles.skillHeader}>
                    <div className={styles.skillName}>{skill.skillName}</div>
                    <div className={styles.skillWarning}>
                      {skill.daysSinceLastUse} days ago
                    </div>
                  </div>
                  <div className={styles.skillStats}>
                    <div className={styles.skillStat}>
                      <span>Current Level:</span>
                      <span className={styles.skillStatValue}>{skill.currentLevel}/{skill.maxLevel}</span>
                    </div>
                    <div className={styles.skillStat}>
                      <span>Potential:</span>
                      <span className={styles.skillStatValue}>{skill.maxLevel - skill.currentLevel} levels</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!skillAnalytics && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🌳</div>
          <div className={styles.emptyTitle}>No Skills Data Yet</div>
          <div className={styles.emptyDescription}>
            Start using skills in the Skill Tree to see your skill analytics here!
          </div>
        </div>
      )}
    </>
  );

  // Real-Time Analytics Tab Content
  const renderRealTimeTab = () => (
    <div className={styles.realTimeAnalyticsContainer}>
      <RealTimeAnalyticsDashboard className={styles.realTimeDashboard} />
    </div>
  );

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>Analytics Dashboard</div>
        <div className={styles.headerControls}>
          <div className={styles.exportButtons}>
            <button className={styles.exportBtn} onClick={() => exportAnalytics('csv')}>
              Export CSV
            </button>
            <button className={styles.exportBtn} onClick={() => exportAnalytics('json')}>
              Export JSON
            </button>
          </div>
          <div className={styles.range}>
            <button className={styles.navBtn} onClick={() => setWeekAnchor(new Date(weekStart.getTime() - 24*3600*1000))}>‹</button>
            <span>{rangeLabel}</span>
            <button className={styles.navBtn} onClick={() => setWeekAnchor(new Date(weekEnd.getTime() + 24*3600*1000))}>›</button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'quests' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('quests')}
        >
          🗡️ Quests
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'boss' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('boss')}
        >
          🐉 Boss
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'crafting' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('crafting')}
        >
          🔨 Craft
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'achievements' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏆 Achieve
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'energy' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('energy')}
        >
          ⚡ Energy
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'shop' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          🛍️ Shop
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'skills' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          🌳 Skills
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'realtime' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('realtime')}
        >
          📈 Live
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {renderTabContent()}
      </div>

      <div className={styles.footerNote}>
        Hi {playerName}! 
        {customMetrics.length === 0 && activeTab === 'overview' && (
          <button onClick={createExampleMetrics} className={styles.createMetricsBtn}>
            Create Custom Metrics
          </button>
        )}
        {customMetrics.length > 0 && activeTab === 'overview' && " Your custom metrics are being tracked!"}
      </div>
    </div>
  );
};

export default AnalyticsTab;
