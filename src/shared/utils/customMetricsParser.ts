import { Vault, TFile } from "obsidian";

export interface CustomMetric {
    id: string;
    name: string;
    description: string;
    type: 'counter' | 'gauge' | 'timer' | 'custom';
    value: number;
    target?: number;
    unit?: string;
    category?: string;
    tags?: string[];
    lastUpdated: number;
    metadata?: Record<string, any>;
}

export interface CustomMetricsData {
    metrics: CustomMetric[];
    categories: string[];
    totalMetrics: number;
    completedMetrics: number;
}

export class CustomMetricsParser {
    private static readonly METRICS_FILE = 'CustomMetrics.md';
    private static readonly DEFAULT_METRICS_FILE = 'SkillTree/CustomMetrics.md';

    /**
     * Load custom metrics from file
     */
    static async loadCustomMetrics(vault: Vault): Promise<CustomMetricsData> {
        try {
            // Try primary location first
            let file = vault.getAbstractFileByPath(this.METRICS_FILE);
            if (!file) {
                // Fallback to SkillTree folder
                file = vault.getAbstractFileByPath(this.DEFAULT_METRICS_FILE);
            }

            if (!file || !(file instanceof TFile)) {
                return {
                    metrics: [],
                    categories: [],
                    totalMetrics: 0,
                    completedMetrics: 0
                };
            }

            const content = await vault.read(file);
            const metrics = this.parseMetricsFromMarkdown(content);

            const categories = [...new Set(metrics.map(m => m.category).filter((cat): cat is string => Boolean(cat)))];
            const totalMetrics = metrics.length;
            const completedMetrics = metrics.filter(m => m.target && m.value >= m.target).length;

            return {
                metrics,
                categories,
                totalMetrics,
                completedMetrics
            };
        } catch (error) {
            console.error('[CustomMetricsParser] Failed to load custom metrics:', error);
            return {
                metrics: [],
                categories: [],
                totalMetrics: 0,
                completedMetrics: 0
            };
        }
    }

    /**
     * Parse metrics from markdown content
     */
    private static parseMetricsFromMarkdown(content: string): CustomMetric[] {
        const metrics: CustomMetric[] = [];
        const lines = content.split('\n');

        let currentMetric: Partial<CustomMetric> | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check for metric header (## Metric Name)
            if (line.startsWith('## ')) {
                if (currentMetric && this.isValidMetric(currentMetric)) {
                    metrics.push(currentMetric as CustomMetric);
                }

                const name = line.substring(3);
                currentMetric = {
                    id: this.generateMetricId(name),
                    name,
                    description: '',
                    type: 'counter',
                    value: 0,
                    lastUpdated: Date.now(),
                    tags: []
                };
                continue;
            }

            if (!currentMetric) continue;

            // Parse metric properties
            if (line.startsWith('- **Type:**')) {
                const type = line.match(/- \*\*Type:\*\* (.+)/)?.[1];
                if (type) currentMetric.type = this.parseMetricType(type);
            } else if (line.startsWith('- **Value:**')) {
                const value = line.match(/- \*\*Value:\*\* (.+)/)?.[1];
                if (value) currentMetric.value = this.parseNumericValue(value);
            } else if (line.startsWith('- **Target:**')) {
                const target = line.match(/- \*\*Target:\*\* (.+)/)?.[1];
                if (target) currentMetric.target = this.parseNumericValue(target);
            } else if (line.startsWith('- **Unit:**')) {
                const unit = line.match(/- \*\*Unit:\*\* (.+)/)?.[1];
                if (unit) currentMetric.unit = unit;
            } else if (line.startsWith('- **Category:**')) {
                const category = line.match(/- \*\*Category:\*\* (.+)/)?.[1];
                if (category) currentMetric.category = category;
            } else if (line.startsWith('- **Tags:**')) {
                const tags = line.match(/- \*\*Tags:\*\* (.+)/)?.[1];
                if (tags) currentMetric.tags = tags.split(',').map(t => t.trim());
            } else if (line.startsWith('- **Description:**')) {
                // Multi-line description
                let description = line.substring(16);
                let j = i + 1;
                while (j < lines.length && lines[j].startsWith('  ') && !lines[j].startsWith('  - **')) {
                    description += '\n' + lines[j].trim();
                    j++;
                }
                currentMetric.description = description;
                i = j - 1;
            } else if (line.startsWith('  ') && currentMetric.description) {
                // Continue description
                currentMetric.description += '\n' + line.trim();
            }
        }

        // Add the last metric
        if (currentMetric && this.isValidMetric(currentMetric)) {
            metrics.push(currentMetric as CustomMetric);
        }

        return metrics;
    }

    /**
     * Parse metric type from string
     */
    private static parseMetricType(typeStr: string): CustomMetric['type'] {
        const type = typeStr.toLowerCase().trim();
        if (type.includes('counter') || type.includes('count')) return 'counter';
        if (type.includes('gauge') || type.includes('progress')) return 'gauge';
        if (type.includes('timer') || type.includes('time')) return 'timer';
        return 'custom';
    }

    /**
     * Parse numeric value from string
     */
    private static parseNumericValue(valueStr: string): number {
        const value = valueStr.trim();
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Generate unique metric ID
     */
    private static generateMetricId(name: string): string {
        return `metric_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    }

    /**
     * Validate metric data
     */
    private static isValidMetric(metric: Partial<CustomMetric>): metric is CustomMetric {
        return Boolean(
            metric.id &&
            metric.name &&
            metric.type &&
            typeof metric.value === 'number' &&
            typeof metric.lastUpdated === 'number'
        );
    }

    /**
     * Get metrics by category
     */
    static async getMetricsByCategory(vault: Vault, category?: string): Promise<CustomMetric[]> {
        const data = await this.loadCustomMetrics(vault);
        if (!category) return data.metrics;
        return data.metrics.filter(m => m.category === category);
    }

    /**
     * Get metrics summary for analytics
     */
    static async getMetricsSummary(vault: Vault): Promise<{
        total: number;
        byType: Record<string, number>;
        byCategory: Record<string, number>;
        completionRate: number;
    }> {
        const data = await this.loadCustomMetrics(vault);

        const byType: Record<string, number> = {};
        const byCategory: Record<string, number> = {};

        data.metrics.forEach(metric => {
            byType[metric.type] = (byType[metric.type] || 0) + 1;
            if (metric.category) {
                byCategory[metric.category] = (byCategory[metric.category] || 0) + 1;
            }
        });

        const completionRate = data.totalMetrics > 0
            ? (data.completedMetrics / data.totalMetrics) * 100
            : 0;

        return {
            total: data.totalMetrics,
            byType,
            byCategory,
            completionRate
        };
    }

    /**
     * Create example custom metrics file
     */
    static async createExampleMetricsFile(vault: Vault): Promise<void> {
        const exampleContent = `# Custom Metrics

Track your personal goals and custom metrics here. Use this format:

## Daily Reading Goal
- **Type:** Counter
- **Value:** 0
- **Target:** 30
- **Unit:** pages
- **Category:** Learning
- **Tags:** reading, daily, goal
- **Description:** Read 30 pages per day

## Exercise Streak
- **Type:** Counter
- **Value:** 0
- **Target:** 7
- **Unit:** days
- **Category:** Health
- **Tags:** exercise, streak, weekly
- **Description:** Exercise for 7 consecutive days

## Project Progress
- **Type:** Gauge
- **Value:** 25
- **Target:** 100
- **Unit:** %
- **Category:** Work
- **Tags:** project, progress
- **Description:** Complete the main project milestone

## Study Time
- **Type:** Timer
- **Value:** 0
- **Target:** 120
- **Unit:** minutes
- **Category:** Learning
- **Tags:** study, time, daily
- **Description:** Study for 2 hours per day
`;

        try {
            await vault.create(this.METRICS_FILE, exampleContent);
        } catch (error) {
            console.error('[CustomMetricsParser] Failed to create example file:', error);
        }
    }
}
