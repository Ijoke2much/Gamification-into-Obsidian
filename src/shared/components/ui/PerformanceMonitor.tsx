import React, { useState, useEffect, useCallback } from 'react';
import { PerformanceOptimizer } from '../../utils/performanceOptimizer';

interface PerformanceMonitorProps {
    plugin: any;
    isVisible?: boolean;
    onClose?: () => void;
}

interface PerformanceStats {
    cache: {
        size: number;
        maxSize: number;
        hitRate: number;
    };
    memory: {
        eventListeners: number;
        intervals: number;
        timeouts: number;
        observers: number;
    };
    performance: {
        totalMeasurements: number;
        averageTimes: Record<string, number>;
    };
    lazyLoaded: string[];
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
    plugin, 
    isVisible = false, 
    onClose 
}) => {
    const [stats, setStats] = useState<PerformanceStats | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

    const updateStats = useCallback(() => {
        if (plugin?.performanceOptimizer) {
            const currentStats = plugin.performanceOptimizer.getStats();
            setStats(currentStats);
        }
    }, [plugin]);

    useEffect(() => {
        if (isVisible) {
            updateStats();
            const interval = setInterval(updateStats, 2000); // Update every 2 seconds
            setRefreshInterval(interval);

            return () => {
                if (interval) {
                    clearInterval(interval);
                }
            };
        }
    }, [isVisible, updateStats]);

    useEffect(() => {
        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [refreshInterval]);

    if (!isVisible) return null;

    const getPerformanceColor = (value: number, threshold: number) => {
        if (value < threshold * 0.7) return 'var(--text-success)';
        if (value < threshold) return 'var(--text-warning)';
        return 'var(--text-error)';
    };

    const getMemoryUsageColor = (current: number, max: number) => {
        const percentage = (current / max) * 100;
        if (percentage < 70) return 'var(--text-success)';
        if (percentage < 90) return 'var(--text-warning)';
        return 'var(--text-error)';
    };

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: isExpanded ? '400px' : '300px',
            maxHeight: '80vh',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            fontFamily: 'var(--font-text)',
            fontSize: '12px',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid var(--background-modifier-border)',
                backgroundColor: 'var(--background-secondary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: stats ? 'var(--text-success)' : 'var(--text-muted)',
                        animation: stats ? 'pulse 2s infinite' : 'none'
                    }} />
                    <span style={{ fontWeight: '600', color: 'var(--text-normal)' }}>
                        Performance Monitor
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            color: 'var(--text-muted)',
                            fontSize: '14px'
                        }}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {isExpanded ? '−' : '+'}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                color: 'var(--text-muted)',
                                fontSize: '14px'
                            }}
                            title="Close"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div style={{
                padding: '16px',
                maxHeight: 'calc(80vh - 60px)',
                overflowY: 'auto'
            }}>
                {!stats ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        Loading performance data...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Cache Stats */}
                        <div>
                            <h4 style={{ 
                                margin: '0 0 8px 0', 
                                fontSize: '13px', 
                                fontWeight: '600',
                                color: 'var(--text-normal)'
                            }}>
                                Cache Performance
                            </h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Usage:</span>
                                <span style={{ 
                                    color: getMemoryUsageColor(stats.cache.size, stats.cache.maxSize),
                                    fontWeight: '500'
                                }}>
                                    {stats.cache.size} / {stats.cache.maxSize}
                                </span>
                            </div>
                            <div style={{ 
                                width: '100%', 
                                height: '4px', 
                                backgroundColor: 'var(--background-modifier-border)',
                                borderRadius: '2px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${(stats.cache.size / stats.cache.maxSize) * 100}%`,
                                    height: '100%',
                                    backgroundColor: getMemoryUsageColor(stats.cache.size, stats.cache.maxSize),
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>

                        {/* Memory Stats */}
                        <div>
                            <h4 style={{ 
                                margin: '0 0 8px 0', 
                                fontSize: '13px', 
                                fontWeight: '600',
                                color: 'var(--text-normal)'
                            }}>
                                Memory Management
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Event Listeners:</span>
                                    <span style={{ 
                                        float: 'right',
                                        color: getPerformanceColor(stats.memory.eventListeners, 50),
                                        fontWeight: '500'
                                    }}>
                                        {stats.memory.eventListeners}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Intervals:</span>
                                    <span style={{ 
                                        float: 'right',
                                        color: getPerformanceColor(stats.memory.intervals, 10),
                                        fontWeight: '500'
                                    }}>
                                        {stats.memory.intervals}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Timeouts:</span>
                                    <span style={{ 
                                        float: 'right',
                                        color: getPerformanceColor(stats.memory.timeouts, 20),
                                        fontWeight: '500'
                                    }}>
                                        {stats.memory.timeouts}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Observers:</span>
                                    <span style={{ 
                                        float: 'right',
                                        color: getPerformanceColor(stats.memory.observers, 5),
                                        fontWeight: '500'
                                    }}>
                                        {stats.memory.observers}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        {isExpanded && (
                            <div>
                                <h4 style={{ 
                                    margin: '0 0 8px 0', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    color: 'var(--text-normal)'
                                }}>
                                    Performance Metrics
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div>
                                        <span style={{ color: 'var(--text-muted)' }}>Total Measurements:</span>
                                        <span style={{ float: 'right', fontWeight: '500' }}>
                                            {stats.performance.totalMeasurements}
                                        </span>
                                    </div>
                                    {Object.entries(stats.performance.averageTimes).map(([name, time]) => (
                                        <div key={name}>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                {name.replace(/([A-Z])/g, ' $1').trim()}:
                                            </span>
                                            <span style={{ 
                                                float: 'right',
                                                color: time > 100 ? 'var(--text-error)' : 'var(--text-success)',
                                                fontWeight: '500'
                                            }}>
                                                {time.toFixed(1)}ms
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Lazy Loaded Modules */}
                        {isExpanded && (
                            <div>
                                <h4 style={{ 
                                    margin: '0 0 8px 0', 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    color: 'var(--text-normal)'
                                }}>
                                    Lazy Loaded Modules ({stats.lazyLoaded.length})
                                </h4>
                                <div style={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: '4px',
                                    maxHeight: '100px',
                                    overflowY: 'auto'
                                }}>
                                    {stats.lazyLoaded.map((module) => (
                                        <span key={module} style={{
                                            backgroundColor: 'var(--background-modifier-border)',
                                            color: 'var(--text-muted)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '11px'
                                        }}>
                                            {module}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '8px', 
                            paddingTop: '8px',
                            borderTop: '1px solid var(--background-modifier-border)'
                        }}>
                            <button
                                onClick={updateStats}
                                style={{
                                    flex: 1,
                                    padding: '6px 12px',
                                    backgroundColor: 'var(--interactive-normal)',
                                    border: '1px solid var(--background-modifier-border)',
                                    borderRadius: '4px',
                                    color: 'var(--text-normal)',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                }}
                            >
                                Refresh
                            </button>
                            <button
                                onClick={() => {
                                    if (plugin?.performanceOptimizer) {
                                        plugin.performanceOptimizer.cleanup();
                                        updateStats();
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '6px 12px',
                                    backgroundColor: 'var(--interactive-accent)',
                                    border: '1px solid var(--background-modifier-border)',
                                    borderRadius: '4px',
                                    color: 'var(--text-on-accent)',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                }}
                            >
                                Cleanup
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};
