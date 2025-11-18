import { Quest } from '../utils/taskParser';
import { AdvancedSearchFilters, SearchResult, SearchField, EnergyMatchType, SearchSuggestion } from '../types/SearchTypes';
import { EnergyCalculationService } from './energyCalculationService';

export class AdvancedSearchService {
    private static instance: AdvancedSearchService;
    private searchHistory: string[] = [];
    private suggestions: SearchSuggestion[] = [];

    static getInstance(): AdvancedSearchService {
        if (!AdvancedSearchService.instance) {
            AdvancedSearchService.instance = new AdvancedSearchService();
        }
        return AdvancedSearchService.instance;
    }

    /**
     * Perform advanced search on quests
     */
    searchQuests(quests: Quest[], filters: AdvancedSearchFilters): SearchResult[] {
        let results = [...quests];

        // Apply text search
        if (filters.search.trim()) {
            results = this.applyTextSearch(results, filters.search, filters.searchFields);
        }

        // Apply priority filter
        if (filters.priority.length > 0) {
            results = results.filter(quest =>
                quest.priority && filters.priority.includes(quest.priority.toLowerCase())
            );
        }

        // Apply difficulty filter
        if (filters.difficulty.length > 0) {
            results = results.filter(quest =>
                quest.difficulty && filters.difficulty.includes(quest.difficulty.toLowerCase())
            );
        }

        // Apply skills filter
        if (filters.skills.length > 0) {
            results = results.filter(quest =>
                quest.skills?.some(skill =>
                    filters.skills.some(filterSkill =>
                        skill.toLowerCase().includes(filterSkill.toLowerCase())
                    )
                )
            );
        }

        // Apply tags filter
        if (filters.tags.length > 0) {
            results = results.filter(quest =>
                quest.tags?.some(tag =>
                    filters.tags.some(filterTag =>
                        tag.toLowerCase().includes(filterTag.toLowerCase())
                    )
                )
            );
        }

        // Apply energy range filter
        results = results.filter(quest => {
            const energyCost = quest.energyCost || this.calculateEnergyCost(quest);
            return energyCost >= filters.energyRange.min && energyCost <= filters.energyRange.max;
        });

        // Apply duration range filter
        results = results.filter(quest => {
            if (!quest.estimatedTime) return true;
            const duration = this.parseTimeToMinutes(quest.estimatedTime);
            return duration >= filters.durationRange.min && duration <= filters.durationRange.max;
        });

        // Apply energy match filter
        if (filters.energyMatch.length > 0) {
            results = results.filter(quest => {
                const energyMatch = this.calculateEnergyMatch(quest, 70); // Default current energy
                return filters.energyMatch.includes(energyMatch);
            });
        }

        // Apply date range filters
        if (filters.dueDateRange.start || filters.dueDateRange.end) {
            results = results.filter(quest => {
                if (!quest.due) return false;
                const dueDate = new Date(quest.due);
                const start = filters.dueDateRange.start || new Date(0);
                const end = filters.dueDateRange.end || new Date(9999, 11, 31);
                return dueDate >= start && dueDate <= end;
            });
        }

        // Apply reward range filters
        if (filters.xpRange.min > 0 || filters.xpRange.max < 10000) {
            results = results.filter(quest =>
                quest.xp >= filters.xpRange.min && quest.xp <= filters.xpRange.max
            );
        }

        if (filters.cpRange.min > 0 || filters.cpRange.max < 10000) {
            results = results.filter(quest =>
                quest.cp >= filters.cpRange.min && quest.cp <= filters.cpRange.max
            );
        }

        // Apply recurring filter
        if (filters.isRecurring !== null) {
            results = results.filter(quest =>
                filters.isRecurring ? !!quest.recur : !quest.recur
            );
        }

        // Apply status filter
        if (filters.status.length > 0) {
            results = results.filter(quest => {
                if (filters.status.includes('active') && !quest.completed) return true;
                if (filters.status.includes('completed') && quest.completed) return true;
                if (filters.status.includes('overdue') && this.isOverdue(quest)) return true;
                return false;
            });
        }

        // Apply favorite filter
        if (filters.isFavorite !== null) {
            results = results.filter(quest =>
                filters.isFavorite ? !!quest.isFavorite : !quest.isFavorite
            );
        }

        // Apply subtask completion filter
        if (filters.subtaskCompletion !== 'all') {
            results = results.filter(quest => {
                if (!quest.subtasks || quest.subtasks.length === 0) return false;
                const completedCount = quest.subtasks.filter(st => st.completed).length;
                const totalCount = quest.subtasks.length;
                const completionRatio = completedCount / totalCount;

                switch (filters.subtaskCompletion) {
                    case 'incomplete':
                        return completionRatio === 0;
                    case 'partial':
                        return completionRatio > 0 && completionRatio < 1;
                    case 'complete':
                        return completionRatio === 1;
                    default:
                        return true;
                }
            });
        }

        // Convert to search results with match scoring
        return results.map(quest => this.createSearchResult(quest, filters));
    }

    /**
     * Apply text search across specified fields
     */
    private applyTextSearch(quests: Quest[], searchTerm: string, fields: SearchField[]): Quest[] {
        const searchLower = searchTerm.toLowerCase();

        return quests.filter(quest => {
            return fields.some(field => {
                switch (field) {
                    case 'title':
                        return quest.title.toLowerCase().includes(searchLower);
                    case 'description':
                        return quest.description?.toLowerCase().includes(searchLower) || false;
                    case 'skills':
                        return quest.skills?.some(skill =>
                            skill.toLowerCase().includes(searchLower)
                        ) || false;
                    case 'subtasks':
                        return quest.subtasks.some(st =>
                            st.text.toLowerCase().includes(searchLower)
                        );
                    case 'tags':
                        return quest.tags?.some(tag =>
                            tag.toLowerCase().includes(searchLower)
                        ) || false;
                    case 'notes':
                        return quest.notes?.toLowerCase().includes(searchLower) || false;
                    default:
                        return false;
                }
            });
        });
    }

    /**
     * Create search result with match scoring
     */
    private createSearchResult(quest: Quest, filters: AdvancedSearchFilters): SearchResult {
        const energyMatch = this.calculateEnergyMatch(quest, 70);
        const matchScore = this.calculateMatchScore(quest, filters);
        const matchedFields = this.getMatchedFields(quest, filters);
        const highlights = this.generateHighlights(quest, filters.search, matchedFields);

        return {
            quest,
            matchScore,
            matchedFields,
            energyMatch,
            highlights
        };
    }

    /**
     * Calculate match score for ranking
     */
    private calculateMatchScore(quest: Quest, filters: AdvancedSearchFilters): number {
        let score = 0;

        // Text search score
        if (filters.search.trim()) {
            const searchLower = filters.search.toLowerCase();
            if (quest.title.toLowerCase().includes(searchLower)) score += 10;
            if (quest.description?.toLowerCase().includes(searchLower)) score += 5;
            if (quest.skills?.some(skill => skill.toLowerCase().includes(searchLower))) score += 3;
            if (quest.subtasks.some(st => st.text.toLowerCase().includes(searchLower))) score += 2;
        }

        // Priority score
        if (filters.priority.includes(quest.priority?.toLowerCase() || '')) score += 5;

        // Difficulty score
        if (filters.difficulty.includes(quest.difficulty?.toLowerCase() || '')) score += 3;

        // Energy match score
        const energyMatch = this.calculateEnergyMatch(quest, 70);
        switch (energyMatch) {
            case 'perfect': score += 8; break;
            case 'good': score += 5; break;
            case 'challenging': score += 2; break;
            case 'insufficient': score += 0; break;
        }

        return score;
    }

    /**
     * Get fields that matched the search
     */
    private getMatchedFields(quest: Quest, filters: AdvancedSearchFilters): SearchField[] {
        const matched: SearchField[] = [];
        const searchLower = filters.search.toLowerCase();

        if (quest.title.toLowerCase().includes(searchLower)) matched.push('title');
        if (quest.description?.toLowerCase().includes(searchLower)) matched.push('description');
        if (quest.skills?.some(skill => skill.toLowerCase().includes(searchLower))) matched.push('skills');
        if (quest.subtasks.some(st => st.text.toLowerCase().includes(searchLower))) matched.push('subtasks');
        if (quest.tags?.some(tag => tag.toLowerCase().includes(searchLower))) matched.push('tags');
        if (quest.notes?.toLowerCase().includes(searchLower)) matched.push('notes');

        return matched;
    }

    /**
     * Generate text highlights for search results
     */
    private generateHighlights(quest: Quest, searchTerm: string, fields: SearchField[]): SearchResult['highlights'] {
        const highlights: SearchResult['highlights'] = [];
        const searchLower = searchTerm.toLowerCase();

        fields.forEach(field => {
            let text = '';
            switch (field) {
                case 'title':
                    text = quest.title;
                    break;
                case 'description':
                    text = quest.description || '';
                    break;
                case 'skills':
                    text = quest.skills?.join(', ') || '';
                    break;
                case 'subtasks':
                    text = quest.subtasks.map(st => st.text).join(', ');
                    break;
                case 'tags':
                    text = quest.tags?.join(', ') || '';
                    break;
                case 'notes':
                    text = quest.notes || '';
                    break;
            }

            const index = text.toLowerCase().indexOf(searchLower);
            if (index !== -1) {
                highlights.push({
                    field,
                    text,
                    startIndex: index,
                    endIndex: index + searchTerm.length
                });
            }
        });

        return highlights;
    }

    /**
     * Calculate energy match for a quest
     */
    private calculateEnergyMatch(quest: Quest, currentEnergy: number): EnergyMatchType {
        const energyCost = quest.energyCost || this.calculateEnergyCost(quest);
        const ratio = energyCost / currentEnergy;

        if (ratio <= 0.3) return 'perfect';
        if (ratio <= 0.5) return 'good';
        if (ratio <= 0.8) return 'challenging';
        return 'insufficient';
    }

    /**
     * Calculate energy cost for a quest
     */
    private calculateEnergyCost(quest: Quest): number {
        let baseCost = 10;

        // Adjust based on difficulty
        switch (quest.difficulty) {
            case 'easy': baseCost = 8; break;
            case 'medium': baseCost = 12; break;
            case 'hard': baseCost = 18; break;
            case 'epic': baseCost = 25; break;
        }

        // Adjust based on estimated time
        if (quest.estimatedTime) {
            const duration = this.parseTimeToMinutes(quest.estimatedTime);
            baseCost = Math.round(baseCost * (duration / 25));
        }

        // Adjust based on subtask count
        const subtaskCount = quest.subtasks?.length || 0;
        baseCost += subtaskCount * 2;

        return Math.min(50, Math.max(5, baseCost));
    }

    /**
     * Parse time string to minutes
     */
    private parseTimeToMinutes(timeStr: string): number {
        const match = timeStr.match(/(\d+)([hm])?/);
        if (!match) return 25;

        const value = parseInt(match[1]);
        const unit = match[2];

        if (unit === 'h') return value * 60;
        return value;
    }

    /**
     * Check if quest is overdue
     */
    private isOverdue(quest: Quest): boolean {
        if (!quest.due) return false;
        const dueDate = new Date(quest.due);
        const now = new Date();
        return dueDate < now && !quest.completed;
    }

    /**
     * Get search suggestions
     */
    getSearchSuggestions(quests: Quest[], query: string): SearchSuggestion[] {
        if (query.length < 2) return [];

        const suggestions: SearchSuggestion[] = [];
        const queryLower = query.toLowerCase();

        // Get unique skills
        const skills = new Set<string>();
        quests.forEach(quest => {
            quest.skills?.forEach(skill => {
                if (skill.toLowerCase().includes(queryLower)) {
                    skills.add(skill);
                }
            });
        });

        // Get unique tags
        const tags = new Set<string>();
        quests.forEach(quest => {
            quest.tags?.forEach(tag => {
                if (tag.toLowerCase().includes(queryLower)) {
                    tags.add(tag);
                }
            });
        });

        // Convert to suggestions
        skills.forEach(skill => {
            suggestions.push({
                text: skill,
                type: 'skill',
                count: quests.filter(q => q.skills?.includes(skill)).length,
                icon: '🛠️'
            });
        });

        tags.forEach(tag => {
            suggestions.push({
                text: tag,
                type: 'tag',
                count: quests.filter(q => q.tags?.includes(tag)).length,
                icon: '🏷️'
            });
        });

        return suggestions.slice(0, 10); // Limit to 10 suggestions
    }

    /**
     * Add to search history
     */
    addToHistory(searchTerm: string): void {
        if (searchTerm.trim() && !this.searchHistory.includes(searchTerm)) {
            this.searchHistory.unshift(searchTerm);
            this.searchHistory = this.searchHistory.slice(0, 20); // Keep last 20 searches
        }
    }

    /**
     * Get search history
     */
    getSearchHistory(): string[] {
        return [...this.searchHistory];
    }

    /**
     * Clear search history
     */
    clearSearchHistory(): void {
        this.searchHistory = [];
    }
}
