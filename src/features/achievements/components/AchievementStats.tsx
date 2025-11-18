// Remove unused imports and add proper types
import React, { useState, useEffect } from 'react';
import { AchievementTracker, AchievementCategory, BadgeTier } from '../../../data/models/AchievementSystem';

// Define proper types
interface StatsData {
  categoryStats: Record<AchievementCategory, { total: number; completed: number; inProgress: number; locked: number }>;
  tierStats: Record<BadgeTier, { total: number; completed: number; inProgress: number; locked: number }>;
  progressTrends: { daily: number[]; weekly: number[]; monthly: number[] };
  totalAchievements: number;
  completedAchievements: number;
  completionRate: number;
  averageProgress: number;
}

interface AchievementData {
  achievement: { category: AchievementCategory; tier: BadgeTier };
  playerData: { status: string; progress: number };
}

interface AchievementStatsProps {
  tracker: AchievementTracker;
}

export const AchievementStats: React.FC<AchievementStatsProps> = ({ tracker }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [statsData, setStatsData] = useState<StatsData | null>(null);

  useEffect(() => {
    calculateStats();
  }, [tracker, selectedTimeframe]);

  const calculateStats = () => {
    const allAchievements = tracker.getAllAchievements();
    const completedAchievements = tracker.getCompletedAchievements();
    
    // Category breakdown
    const categoryStats = allAchievements.reduce((acc: Record<AchievementCategory, { total: number; completed: number; inProgress: number; locked: number }>, { achievement, playerData }) => {
      const category = achievement.category;
      if (!acc[category]) {
        acc[category] = { total: 0, completed: 0, inProgress: 0, locked: 0 };
      }
      acc[category].total++;
      
      if (playerData.status === 'completed') acc[category].completed++;
      else if (playerData.status === 'in_progress') acc[category].inProgress++;
      else acc[category].locked++;
      
      return acc;
    }, {} as Record<AchievementCategory, { total: number; completed: number; inProgress: number; locked: number }>);

    // Tier breakdown
    const tierStats = allAchievements.reduce((acc: Record<BadgeTier, { total: number; completed: number; inProgress: number; locked: number }>, { achievement, playerData }) => {
      const tier = achievement.tier;
      if (!acc[tier]) {
        acc[tier] = { total: 0, completed: 0, inProgress: 0, locked: 0 };
      }
      acc[tier].total++;
      
      if (playerData.status === 'completed') acc[tier].completed++;
      else if (playerData.status === 'in_progress') acc[tier].inProgress++;
      else acc[tier].locked++;
      
      return acc;
    }, {} as Record<BadgeTier, { total: number; completed: number; inProgress: number; locked: number }>);

    // Progress trends
    const progressTrends = calculateProgressTrends(allAchievements, selectedTimeframe);

    setStatsData({
      categoryStats,
      tierStats,
      progressTrends,
      totalAchievements: allAchievements.length,
      completedAchievements: completedAchievements.length,
      completionRate: (completedAchievements.length / allAchievements.length) * 100,
      averageProgress: allAchievements.reduce((sum: number, { playerData }) => sum + playerData.progress, 0) / allAchievements.length,
    });
  };

  const calculateProgressTrends = (achievements: AchievementData[], timeframe: string) => {
    // This would integrate with actual time-based data
    // For now, returning mock data
    return {
      daily: [65, 70, 75, 80, 85, 90, 95],
      weekly: [60, 65, 70, 75, 80, 85, 90, 95],
      monthly: [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 98, 100],
    };
  };

  if (!statsData) return <div>Loading statistics...</div>;

  return (
    <div style={{
      padding: '24px',
      background: 'linear-gradient(135deg, #0f0f23, #1a1a2e)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h2 style={{
          margin: '0 0 16px 0',
          fontSize: '28px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #4CAF50, #66BB6A)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          📊 Achievement Statistics
        </h2>
        
        {/* Timeframe Selector */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {(['week', 'month', 'year', 'all'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: selectedTimeframe === timeframe ? '#4CAF50' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize',
              }}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <StatCard
          title="Total Achievements"
          value={statsData.totalAchievements}
          icon="🏆"
          color="#2196F3"
        />
        <StatCard
          title="Completed"
          value={statsData.completedAchievements}
          icon="✅"
          color="#4CAF50"
        />
        <StatCard
          title="Completion Rate"
          value={`${Math.round(statsData.completionRate)}%`}
          icon="📈"
          color="#FF9800"
        />
        <StatCard
          title="Average Progress"
          value={`${Math.round(statsData.averageProgress)}%`}
          icon="🎯"
          color="#9C27B0"
        />
      </div>

      {/* Category Breakdown */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#fff',
        }}>
          �� Category Breakdown
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
        }}>
          {Object.entries(statsData.categoryStats).map(([category, stats]: [string, StatsData['categoryStats'][keyof StatsData['categoryStats']]]) => (
            <CategoryCard
              key={category}
              category={category}
              stats={stats}
            />
          ))}
        </div>
      </div>

      {/* Tier Breakdown */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#fff',
        }}>
          🏅 Tier Breakdown
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}>
          {Object.entries(statsData.tierStats).map(([tier, stats]: [string, StatsData['tierStats'][keyof StatsData['tierStats']]]) => (
            <TierCard
              key={tier}
              tier={tier}
              stats={stats}
            />
          ))}
        </div>
      </div>

      {/* Progress Trends Chart */}
      <div>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#fff',
        }}>
          📈 Progress Trends
        </h3>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <ProgressChart data={statsData.progressTrends} timeframe={selectedTimeframe} />
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({
  title,
  value,
  icon,
  color,
}) => (
  <div style={{
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center',
    transition: 'all 0.3s ease',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  }}
  >
    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
    <div style={{
      fontSize: '24px',
      fontWeight: '700',
      color: color,
      marginBottom: '8px',
    }}>
      {value}
    </div>
    <div style={{
      fontSize: '14px',
      color: '#ccc',
      fontWeight: '500',
    }}>
      {title}
    </div>
  </div>
);

// Category Card Component
const CategoryCard: React.FC<{ category: string; stats: StatsData['categoryStats'][keyof StatsData['categoryStats']] }> = ({ category, stats }) => {
  const categoryInfo = {
    quest: { name: 'Quest Milestones', icon: '��', color: '#4CAF50' },
    progress: { name: 'Progress', icon: '��', color: '#2196F3' },
    collection: { name: 'Collection', icon: '��', color: '#FF9800' },
    special: { name: 'Special', icon: '⭐', color: '#9C27B0' },
    pomodoro: { name: 'Focus Master', icon: '��', color: '#FF5722' },
  };

  const info = categoryInfo[category as keyof typeof categoryInfo] || { name: category, icon: '📁', color: '#666' };
  const completionRate = (stats.completed / stats.total) * 100;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px', marginRight: '12px' }}>{info.icon}</span>
        <div>
          <h4 style={{
            margin: '0 0 4px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#fff',
          }}>
            {info.name}
          </h4>
          <div style={{
            fontSize: '14px',
            color: '#ccc',
          }}>
            {stats.completed}/{stats.total} completed
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        height: '8px',
        overflow: 'hidden',
        marginBottom: '12px',
      }}>
        <div
          style={{
            background: `linear-gradient(90deg, ${info.color}, ${info.color}80)`,
            height: '100%',
            width: `${completionRate}%`,
            borderRadius: '8px',
            transition: 'width 0.8s ease',
          }}
        />
      </div>

      <div style={{
        fontSize: '12px',
        color: '#888',
        textAlign: 'center',
      }}>
        {Math.round(completionRate)}% complete
      </div>
    </div>
  );
};

// Tier Card Component
const TierCard: React.FC<{ tier: string; stats: StatsData['tierStats'][keyof StatsData['tierStats']] }> = ({ tier, stats }) => {
  const tierInfo = {
    bronze: { color: '#CD7F32', icon: '🥉' },
    silver: { color: '#C0C0C0', icon: '🥈' },
    gold: { color: '#FFD700', icon: '��' },
    legendary: { color: '#9F7AEA', icon: '💎' },
  };

  const info = tierInfo[tier as keyof typeof tierInfo] || { color: '#666', icon: '🏅' };
  const completionRate = (stats.completed / stats.total) * 100;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${info.color}40`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>{info.icon}</div>
      <h4 style={{
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '700',
        color: info.color,
        textTransform: 'capitalize',
      }}>
        {tier}
      </h4>

      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '8px',
      }}>
        {stats.completed}/{stats.total}
      </div>

      {/* Progress Bar */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        height: '6px',
        overflow: 'hidden',
        marginBottom: '12px',
      }}>
        <div
          style={{
            background: `linear-gradient(90deg, ${info.color}, ${info.color}80)`,
            height: '100%',
            width: `${completionRate}%`,
            borderRadius: '8px',
            transition: 'width 0.8s ease',
          }}
        />
      </div>

      <div style={{
        fontSize: '12px',
        color: '#888',
      }}>
        {Math.round(completionRate)}% complete
      </div>
    </div>
  );
};

// Progress Chart Component
const ProgressChart: React.FC<{ data: StatsData['progressTrends']; timeframe: string }> = ({ data, timeframe }) => {
  const chartData = data[timeframe === 'week' ? 'daily' : timeframe === 'month' ? 'weekly' : 'monthly'] || [];
  const maxValue = Math.max(...chartData);

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        height: '120px',
        padding: '20px 0',
      }}>
        {chartData.map((value: number, index: number) => (
          <div
            key={index}
            style={{
              flex: 1,
              background: `linear-gradient(to top, #4CAF50, #66BB6A)`,
              height: `${(value / maxValue) * 100}%`,
              borderRadius: '4px 4px 0 0',
              minHeight: '4px',
              position: 'relative',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scaleY(1.1)';
              e.currentTarget.style.background = 'linear-gradient(to top, #66BB6A, #81C784)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scaleY(1)';
              e.currentTarget.style.background = 'linear-gradient(to top, #4CAF50, #66BB6A)';
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-25px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            >
              {value}%
            </div>
          </div>
        ))}
      </div>
      
      {/* X-axis labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '12px',
        fontSize: '12px',
        color: '#888',
      }}>
        {chartData.map((_: number, index: number) => (
          <span key={index}>
            {timeframe === 'week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] :
             timeframe === 'month' ? `W${index + 1}` :
             timeframe === 'year' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index] :
             `${index + 1}`}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AchievementStats;