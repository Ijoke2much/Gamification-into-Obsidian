import React, { useMemo } from 'react';
import { Quest } from '../utils/taskParser';

interface QuestAnalyticsProps {
  quests: Quest[];
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
}

interface QuestStats {
  total: number;
  completed: number;
  active: number;
  overdue: number;
  completionRate: number;
  averageXP: number;
  averageCP: number;
  totalXP: number;
  totalCP: number;
  byDifficulty: Record<string, number>;
  byPriority: Record<string, number>;
  bySkill: Record<string, number>;
  recentActivity: {
    completedToday: number;
    completedThisWeek: number;
    createdToday: number;
    createdThisWeek: number;
  };
}

export const QuestAnalytics: React.FC<QuestAnalyticsProps> = ({ 
  quests, 
  timeframe = 'week' 
}) => {
  const stats = useMemo((): QuestStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const completedQuests = quests.filter(q => q.completed);
    const activeQuests = quests.filter(q => !q.completed);
    const overdueQuests = activeQuests.filter(q => {
      if (!q.due) return false;
      return new Date(q.due) < today;
    });

    // Calculate difficulty distribution
    const byDifficulty = quests.reduce((acc, quest) => {
      const diff = quest.difficulty?.toLowerCase() || 'unknown';
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate priority distribution
    const byPriority = quests.reduce((acc, quest) => {
      const priority = quest.priority?.toLowerCase() || 'unknown';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate skill distribution
    const bySkill = quests.reduce((acc, quest) => {
      quest.skills?.forEach(skill => {
        acc[skill] = (acc[skill] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Recent activity
    const completedToday = completedQuests.filter(q => {
      if (!q.completedAt) return false;
      const completedDate = new Date(q.completedAt);
      return completedDate >= today;
    }).length;

    const completedThisWeek = completedQuests.filter(q => {
      if (!q.completedAt) return false;
      const completedDate = new Date(q.completedAt);
      return completedDate >= weekStart;
    }).length;

    const createdToday = quests.filter(q => {
      if (!q.createdDate) return false;
      const createdDate = new Date(q.createdDate);
      return createdDate >= today;
    }).length;

    const createdThisWeek = quests.filter(q => {
      if (!q.createdDate) return false;
      const createdDate = new Date(q.createdDate);
      return createdDate >= weekStart;
    }).length;

    const totalXP = completedQuests.reduce((sum, q) => sum + (q.xp || 0), 0);
    const totalCP = completedQuests.reduce((sum, q) => sum + (q.cp || 0), 0);

    return {
      total: quests.length,
      completed: completedQuests.length,
      active: activeQuests.length,
      overdue: overdueQuests.length,
      completionRate: quests.length > 0 ? (completedQuests.length / quests.length) * 100 : 0,
      averageXP: completedQuests.length > 0 ? totalXP / completedQuests.length : 0,
      averageCP: completedQuests.length > 0 ? totalCP / completedQuests.length : 0,
      totalXP,
      totalCP,
      byDifficulty,
      byPriority,
      bySkill,
      recentActivity: {
        completedToday,
        completedThisWeek,
        createdToday,
        createdThisWeek
      }
    };
  }, [quests]);

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return '#4CAF50';
    if (rate >= 60) return '#FF9800';
    return '#F44336';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      border: '1px solid #333'
    }}>
      <h3 style={{ 
        margin: '0 0 20px 0', 
        color: '#8ecae6',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        📊 Quest Analytics
      </h3>

      {/* Overview Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #333'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8ecae6' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '12px', color: '#ccc' }}>Total Quests</div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #333'
        }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: getProgressColor(stats.completionRate)
          }}>
            {stats.completionRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: '#ccc' }}>Completion Rate</div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #333'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
            {stats.completed}
          </div>
          <div style={{ fontSize: '12px', color: '#ccc' }}>Completed</div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #333'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
            {stats.active}
          </div>
          <div style={{ fontSize: '12px', color: '#ccc' }}>Active</div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #333'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#F44336' }}>
            {stats.overdue}
          </div>
          <div style={{ fontSize: '12px', color: '#ccc' }}>Overdue</div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #333'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#45b7d1' }}>
            {stats.totalXP}
          </div>
          <div style={{ fontSize: '12px', color: '#ccc' }}>Total XP Earned</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          color: '#fff',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          📈 Recent Activity
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px'
        }}>
          <div style={{
            padding: '12px',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            textAlign: 'center',
            border: '1px solid #333'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
              {stats.recentActivity.completedToday}
            </div>
            <div style={{ fontSize: '11px', color: '#ccc' }}>Completed Today</div>
          </div>

          <div style={{
            padding: '12px',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            textAlign: 'center',
            border: '1px solid #333'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
              {stats.recentActivity.completedThisWeek}
            </div>
            <div style={{ fontSize: '11px', color: '#ccc' }}>Completed This Week</div>
          </div>

          <div style={{
            padding: '12px',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            textAlign: 'center',
            border: '1px solid #333'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8ecae6' }}>
              {stats.recentActivity.createdToday}
            </div>
            <div style={{ fontSize: '11px', color: '#ccc' }}>Created Today</div>
          </div>

          <div style={{
            padding: '12px',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            textAlign: 'center',
            border: '1px solid #333'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8ecae6' }}>
              {stats.recentActivity.createdThisWeek}
            </div>
            <div style={{ fontSize: '11px', color: '#ccc' }}>Created This Week</div>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        {/* Difficulty Distribution */}
        <div>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            🎯 Difficulty Distribution
          </h4>
          <div style={{ backgroundColor: '#2a2a2a', borderRadius: '6px', padding: '12px' }}>
            {Object.entries(stats.byDifficulty).map(([difficulty, count]) => (
              <div key={difficulty} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  color: '#ccc', 
                  fontSize: '12px',
                  textTransform: 'capitalize'
                }}>
                  {difficulty}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '60px',
                    height: '8px',
                    backgroundColor: '#333',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(count / stats.total) * 100}%`,
                      height: '100%',
                      backgroundColor: getDifficultyColor(difficulty)
                    }} />
                  </div>
                  <span style={{ 
                    color: '#fff', 
                    fontSize: '12px',
                    fontWeight: 'bold',
                    minWidth: '20px',
                    textAlign: 'right'
                  }}>
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ⚡ Priority Distribution
          </h4>
          <div style={{ backgroundColor: '#2a2a2a', borderRadius: '6px', padding: '12px' }}>
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  color: '#ccc', 
                  fontSize: '12px',
                  textTransform: 'capitalize'
                }}>
                  {priority}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '60px',
                    height: '8px',
                    backgroundColor: '#333',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(count / stats.total) * 100}%`,
                      height: '100%',
                      backgroundColor: getPriorityColor(priority)
                    }} />
                  </div>
                  <span style={{ 
                    color: '#fff', 
                    fontSize: '12px',
                    fontWeight: 'bold',
                    minWidth: '20px',
                    textAlign: 'right'
                  }}>
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Skills */}
        <div>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            🛠️ Top Skills
          </h4>
          <div style={{ backgroundColor: '#2a2a2a', borderRadius: '6px', padding: '12px' }}>
            {Object.entries(stats.bySkill)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([skill, count]) => (
                <div key={skill} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ 
                    color: '#ccc', 
                    fontSize: '12px',
                    textTransform: 'capitalize'
                  }}>
                    {skill}
                  </span>
                  <span style={{ 
                    color: '#45b7d1', 
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#2a2a2a', borderRadius: '6px' }}>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          color: '#8ecae6',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          💡 Insights
        </h4>
        <div style={{ fontSize: '12px', color: '#ccc', lineHeight: '1.4' }}>
          {stats.completionRate >= 80 && (
            <div style={{ marginBottom: '8px' }}>
              🎉 Excellent completion rate! You're maintaining great momentum.
            </div>
          )}
          {stats.overdue > 0 && (
            <div style={{ marginBottom: '8px' }}>
              ⚠️ You have {stats.overdue} overdue quest(s). Consider adjusting priorities or deadlines.
            </div>
          )}
          {stats.recentActivity.completedToday === 0 && (
            <div style={{ marginBottom: '8px' }}>
              📝 No quests completed today. Time to tackle some tasks!
            </div>
          )}
          {stats.averageXP > 200 && (
            <div style={{ marginBottom: '8px' }}>
              ⭐ You're taking on high-value quests with an average of {Math.round(stats.averageXP)} XP per quest.
            </div>
          )}
          {Object.keys(stats.bySkill).length > 5 && (
            <div style={{ marginBottom: '8px' }}>
              🎯 You're developing a diverse skill set across {Object.keys(stats.bySkill).length} different areas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
