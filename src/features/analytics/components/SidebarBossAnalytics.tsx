import React, { useState, useEffect } from 'react';
import styles from './SidebarBossAnalytics.module.css';

interface SidebarBossAnalyticsProps {
    className?: string;
}

export const SidebarBossAnalytics: React.FC<SidebarBossAnalyticsProps> = ({
    className
}) => {
    const [collapsed, setCollapsed] = useState(false);

    // Mock data for now - replace with actual analytics service calls when available
    const mockData = {
        totalBosses: 0,
        winRate: 0,
        avgDamage: 0,
        topPersonalities: [
            { name: 'Aggressive', victories: 0, icon: '⚡' },
            { name: 'Defensive', victories: 0, icon: '🛡️' },
            { name: 'Tactical', victories: 0, icon: '🧠' }
        ]
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <div className={`${styles.sidebarBossAnalytics} ${className}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    <span className={styles.titleIcon}>📊</span>
                    Boss Stats
                </h3>
                <button 
                    className={styles.collapseButton}
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Expand" : "Collapse"}
                >
                    {collapsed ? '▼' : '▲'}
                </button>
            </div>

            {!collapsed && (
                <div className={styles.content}>
                    {/* Ultra Compact Stats */}
                    <div className={styles.compactStats}>
                        <div className={styles.statRow}>
                            <span className={styles.statLabel}>⚔️ Defeated:</span>
                            <span className={styles.statValue}>{mockData.totalBosses}</span>
                        </div>
                        <div className={styles.statRow}>
                            <span className={styles.statLabel}>🎯 Win Rate:</span>
                            <span className={styles.statValue}>{mockData.winRate}%</span>
                        </div>
                        <div className={styles.statRow}>
                            <span className={styles.statLabel}>💥 Avg DMG:</span>
                            <span className={styles.statValue}>{formatNumber(mockData.avgDamage)}</span>
                        </div>
                    </div>

                    {/* Compact Personalities */}
                    <div className={styles.personalitySection}>
                        <div className={styles.sectionTitle}>🧠 Personalities</div>
                        {mockData.topPersonalities.map((personality, index) => (
                            <div key={index} className={styles.personalityRow}>
                                <span className={styles.personalityIcon}>{personality.icon}</span>
                                <span className={styles.personalityName}>{personality.name}</span>
                                <span className={styles.personalityVictories}>{personality.victories}</span>
                            </div>
                        ))}
                    </div>
                    
                    <div className={styles.footer}>
                        <button 
                            className={styles.fullViewButton}
                            onClick={() => {
                                // This will open the full Boss Analytics tab
                                const event = new CustomEvent('openBossAnalytics', {
                                    detail: { tab: 'analytics' }
                                });
                                window.dispatchEvent(event);
                            }}
                        >
                            Full Analytics →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
