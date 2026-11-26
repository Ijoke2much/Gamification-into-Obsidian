import { Vault } from "obsidian";
import { CoinTransactionTracker, type CoinFlowData } from "./coinTransactionTracker";
import { CustomMetricsParser, type CustomMetric } from "./customMetricsParser";

export interface AnalyticsExportData {
    exportDate: string;
    period: {
        start: string;
        end: string;
    };
    tasks: {
        completed: number;
        dailyBreakdown: number[];
        bestDay: string;
    };
    habits: {
        successRate: number;
        activeStreaks: number;
        dailyBreakdown: number[];
    };
    pomodoro: {
        sessions: number;
    };
    coins: {
        earned: number;
        spent: number;
        netChange: number;
        transactions: any[];
    };
    customMetrics: {
        total: number;
        completionRate: number;
        metrics: any[];
    };
    weeklyScore: number;
}

export class AnalyticsExporter {
    /**
     * Export analytics data as JSON
     */
    static async exportAsJSON(
        vault: Vault,
        startDate: Date,
        endDate: Date,
        tasksData: any,
        habitsData: any,
        pomodoroData: any
    ): Promise<string> {
        try {
            // Gather all data
            const coinFlowData = await CoinTransactionTracker.getCoinFlowData(vault, startDate, endDate);
            const customMetrics = await CustomMetricsParser.loadCustomMetrics(vault);

            const exportData: AnalyticsExportData = {
                exportDate: new Date().toISOString(),
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                },
                tasks: {
                    completed: tasksData.completed || 0,
                    dailyBreakdown: tasksData.daily || [0, 0, 0, 0, 0, 0, 0],
                    bestDay: tasksData.bestDay || "—"
                },
                habits: {
                    successRate: habitsData.success || 0,
                    activeStreaks: habitsData.streaks || 0,
                    dailyBreakdown: habitsData.daily || [0, 0, 0, 0, 0, 0, 0]
                },
                pomodoro: {
                    sessions: pomodoroData.sessions || 0
                },
                coins: {
                    earned: coinFlowData.totalEarned,
                    spent: coinFlowData.totalSpent,
                    netChange: coinFlowData.netChange,
                    transactions: coinFlowData.transactions.slice(0, 50) // Limit to last 50 for export
                },
                customMetrics: {
                    total: customMetrics.totalMetrics,
                    completionRate: customMetrics.totalMetrics > 0
                        ? (customMetrics.completedMetrics / customMetrics.totalMetrics) * 100
                        : 0,
                    metrics: customMetrics.metrics
                },
                weeklyScore: 0 // Calculate this based on the data
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('[AnalyticsExporter] Failed to export JSON:', error);
            throw new Error('Failed to export analytics data');
        }
    }

    /**
     * Export analytics data as CSV
     */
    static async exportAsCSV(
        vault: Vault,
        startDate: Date,
        endDate: Date,
        tasksData: any,
        habitsData: any,
        pomodoroData: any
    ): Promise<string> {
        try {
            const coinFlowData = await CoinTransactionTracker.getCoinFlowData(vault, startDate, endDate);
            const customMetrics = await CustomMetricsParser.loadCustomMetrics(vault);

            let csv = 'Metric,Value,Unit\n';
            csv += `Export Date,${new Date().toISOString()},\n`;
            csv += `Period Start,${startDate.toISOString()},\n`;
            csv += `Period End,${endDate.toISOString()},\n`;
            csv += `,,\n`;

            // Tasks
            csv += `Tasks Completed,${tasksData.completed || 0},\n`;
            csv += `Best Day,${tasksData.bestDay || "—"},\n`;
            csv += `,,\n`;

            // Daily breakdown
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            days.forEach((day, i) => {
                csv += `Tasks ${day},${tasksData.daily?.[i] || 0},\n`;
                csv += `Habits ${day},${habitsData.daily?.[i] || 0},\n`;
            });
            csv += `,,\n`;

            // Habits
            csv += `Habit Success Rate,${habitsData.success || 0},%\n`;
            csv += `Active Streaks,${habitsData.streaks || 0},\n`;
            csv += `,,\n`;

            // Pomodoro
            csv += `Pomodoro Sessions,${pomodoroData.sessions || 0},\n`;
            csv += `,,\n`;

            // Coins
            csv += `Coins Earned,${coinFlowData.totalEarned},\n`;
            csv += `Coins Spent,${coinFlowData.totalSpent},\n`;
            csv += `Net Change,${coinFlowData.netChange},\n`;
            csv += `,,\n`;

            // Custom Metrics
            csv += `Custom Metrics Total,${customMetrics.totalMetrics},\n`;
            csv += `Completion Rate,${customMetrics.totalMetrics > 0
                ? (customMetrics.completedMetrics / customMetrics.totalMetrics) * 100
                : 0},%\n`;

            // Custom metrics details
            customMetrics.metrics.forEach(metric => {
                csv += `${metric.name},${metric.value},${metric.unit || ''}\n`;
            });

            return csv;
        } catch (error) {
            console.error('[AnalyticsExporter] Failed to export CSV:', error);
            throw new Error('Failed to export analytics data');
        }
    }

    /**
     * Export coin transactions as CSV
     */
    static async exportCoinTransactionsAsCSV(
        vault: Vault,
        startDate?: Date,
        endDate?: Date
    ): Promise<string> {
        try {
            const coinFlowData = await CoinTransactionTracker.getCoinFlowData(vault, startDate, endDate);

            let csv = 'Date,Type,Amount,Source,Description\n';

            coinFlowData.transactions.forEach(tx => {
                const date = new Date(tx.timestamp).toISOString().split('T')[0];
                const type = tx.type === 'earned' ? 'Earned' : 'Spent';
                const amount = tx.type === 'earned' ? tx.amount : Math.abs(tx.amount);

                csv += `${date},${type},${amount},${tx.source},"${tx.description}"\n`;
            });

            return csv;
        } catch (error) {
            console.error('[AnalyticsExporter] Failed to export coin transactions:', error);
            throw new Error('Failed to export coin transactions');
        }
    }

    /**
     * Download data as file
     */
    static downloadAsFile(content: string, filename: string, mimeType: string): void {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
