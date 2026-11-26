import { Vault, TFile } from "obsidian";

export interface CoinTransaction {
    id: string;
    timestamp: number;
    amount: number; // positive for earned, negative for spent
    type: 'earned' | 'spent';
    source: string; // 'quest', 'shop', 'item_use', 'achievement', 'manual', etc.
    description: string;
    metadata?: Record<string, any>;
}

export interface CoinFlowData {
    transactions: CoinTransaction[];
    totalEarned: number;
    totalSpent: number;
    netChange: number;
    dailyFlow: Record<string, { earned: number; spent: number; net: number }>;
    weeklyFlow: Record<string, { earned: number; spent: number; net: number }>;
}

export class CoinTransactionTracker {
    private static readonly TRANSACTIONS_FILE = 'SkillTree/CoinTransactions.md';
    private static readonly MAX_TRANSACTIONS = 1000; // Keep last 1000 transactions

    /**
     * Record a new coin transaction
     */
    static async recordTransaction(
        vault: Vault,
        amount: number,
        source: string,
        description: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        try {
            const transaction: CoinTransaction = {
                id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                amount,
                type: amount > 0 ? 'earned' : 'spent',
                source,
                description,
                metadata
            };

            const transactions = await this.loadTransactions(vault);
            transactions.unshift(transaction);

            // Keep only the last MAX_TRANSACTIONS
            if (transactions.length > this.MAX_TRANSACTIONS) {
                transactions.splice(this.MAX_TRANSACTIONS);
            }

            await this.saveTransactions(vault, transactions);
        } catch (error) {
            console.error('[CoinTransactionTracker] Failed to record transaction:', error);
        }
    }

    /**
     * Load all coin transactions
     */
    static async loadTransactions(vault: Vault): Promise<CoinTransaction[]> {
        try {
            const file = vault.getAbstractFileByPath(this.TRANSACTIONS_FILE);
            if (!file || !(file instanceof TFile)) {
                return [];
            }

            const content = await vault.read(file);
            const lines = content.split('\n').filter(line => line.trim());

            const transactions: CoinTransaction[] = [];

            for (const line of lines) {
                if (line.startsWith('- ')) {
                    try {
                        const transactionData = line.substring(2);
                        const transaction = JSON.parse(transactionData);
                        if (this.isValidTransaction(transaction)) {
                            transactions.push(transaction);
                        }
                    } catch (e) {
                        console.warn('[CoinTransactionTracker] Failed to parse transaction line:', line);
                    }
                }
            }

            return transactions.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('[CoinTransactionTracker] Failed to load transactions:', error);
            return [];
        }
    }

    /**
     * Save transactions to file
     */
    private static async saveTransactions(vault: Vault, transactions: CoinTransaction[]): Promise<void> {
        try {
            const content = `# Coin Transactions

This file tracks all coin transactions for analytics purposes.

${transactions.map(tx => `- ${JSON.stringify(tx)}`).join('\n')}
`;

            const file = vault.getAbstractFileByPath(this.TRANSACTIONS_FILE);
            if (file && file instanceof TFile) {
                await vault.modify(file, content);
            } else {
                await vault.create(this.TRANSACTIONS_FILE, content);
            }
        } catch (error) {
            console.error('[CoinTransactionTracker] Failed to save transactions:', error);
        }
    }

    /**
     * Get coin flow data for analytics
     */
    static async getCoinFlowData(vault: Vault, startDate?: Date, endDate?: Date): Promise<CoinFlowData> {
        const transactions = await this.loadTransactions(vault);

        let filteredTransactions = transactions;
        if (startDate || endDate) {
            filteredTransactions = transactions.filter(tx => {
                const txDate = new Date(tx.timestamp);
                if (startDate && txDate < startDate) return false;
                if (endDate && txDate > endDate) return false;
                return true;
            });
        }

        const totalEarned = filteredTransactions
            .filter(tx => tx.type === 'earned')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalSpent = Math.abs(filteredTransactions
            .filter(tx => tx.type === 'spent')
            .reduce((sum, tx) => sum + tx.amount, 0));

        const netChange = totalEarned - totalSpent;

        // Group by day
        const dailyFlow: Record<string, { earned: number; spent: number; net: number }> = {};
        filteredTransactions.forEach(tx => {
            const dateKey = new Date(tx.timestamp).toISOString().split('T')[0];
            if (!dailyFlow[dateKey]) {
                dailyFlow[dateKey] = { earned: 0, spent: 0, net: 0 };
            }

            if (tx.type === 'earned') {
                dailyFlow[dateKey].earned += tx.amount;
            } else {
                dailyFlow[dateKey].spent += Math.abs(tx.amount);
            }
            dailyFlow[dateKey].net = dailyFlow[dateKey].earned - dailyFlow[dateKey].spent;
        });

        // Group by week (Monday start)
        const weeklyFlow: Record<string, { earned: number; spent: number; net: number }> = {};
        filteredTransactions.forEach(tx => {
            const date = new Date(tx.timestamp);
            const weekStart = this.getStartOfWeek(date);
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weeklyFlow[weekKey]) {
                weeklyFlow[weekKey] = { earned: 0, spent: 0, net: 0 };
            }

            if (tx.type === 'earned') {
                weeklyFlow[weekKey].earned += tx.amount;
            } else {
                weeklyFlow[weekKey].spent += Math.abs(tx.amount);
            }
            weeklyFlow[weekKey].net = weeklyFlow[weekKey].earned - weeklyFlow[weekKey].spent;
        });

        return {
            transactions: filteredTransactions,
            totalEarned,
            totalSpent,
            netChange,
            dailyFlow,
            weeklyFlow
        };
    }

    /**
     * Get start of week (Monday)
     */
    private static getStartOfWeek(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Validate transaction data
     */
    private static isValidTransaction(tx: any): tx is CoinTransaction {
        return (
            tx &&
            typeof tx.id === 'string' &&
            typeof tx.timestamp === 'number' &&
            typeof tx.amount === 'number' &&
            typeof tx.type === 'string' &&
            typeof tx.source === 'string' &&
            typeof tx.description === 'string'
        );
    }

    /**
     * Get transaction summary for a specific time period
     */
    static async getTransactionSummary(
        vault: Vault,
        period: 'day' | 'week' | 'month' | 'year' | 'all'
    ): Promise<{ earned: number; spent: number; net: number; count: number }> {
        const now = new Date();
        let startDate: Date | undefined;

        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = this.getStartOfWeek(now);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'all':
                startDate = undefined;
                break;
        }

        const flowData = await this.getCoinFlowData(vault, startDate, now);

        return {
            earned: flowData.totalEarned,
            spent: flowData.totalSpent,
            net: flowData.netChange,
            count: flowData.transactions.length
        };
    }
}
