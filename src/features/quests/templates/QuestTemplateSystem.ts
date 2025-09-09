// Advanced Quest Template System
// Smart templates, context-aware suggestions, and guided quest creation

import { Quest } from '../utils/taskParser';

export interface QuestTemplate {
  id: string;
  name: string;
  category: QuestCategory;
  description: string;
  icon: string;
  tags: string[];
  
  // Template configuration with smart defaults
  config: {
    defaultXP: number;
    defaultCP: number;
    difficulty: QuestDifficulty;
    estimatedTime: number; // minutes
    requiredSkills: string[];
    suggestedRewards: string[];
    priority: QuestPriority;
    recurrence?: RecurrencePattern;
  };
  
  // Dynamic content generation
  content: {
    titleTemplate: string;
    descriptionTemplate: string;
    subtasks: SubtaskTemplate[];
    metadata: Record<string, string>;
    completionCriteria: CompletionCriteria[];
  };
  
  // Personalization variables
  variables: {
    required: TemplateVariable[];
    optional: TemplateVariable[];
    defaults: Record<string, string>;
    suggestions: Record<string, string[]>;
  };
  
  // Context-aware behavior
  context: {
    triggers: ContextTrigger[];
    conditions: ContextCondition[];
    recommendations: RecommendationRule[];
  };
}

export type QuestCategory = 
  | 'daily-routine'      // Morning routines, daily habits
  | 'weekly-planning'    // Weekly goals, project milestones
  | 'skill-development'  // Learning, practice, mastery
  | 'project-management' // Complex tasks, deliverables
  | 'habit-building'     // Behavior change, consistency
  | 'boss-challenge'     // High-stakes, epic quests
  | 'social-quest'       // Collaboration, networking
  | 'creative-endeavor'  // Writing, art, innovation
  | 'health-wellness'    // Exercise, meditation, self-care
  | 'productivity-hack'; // Time management, optimization

export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'epic';
export type QuestPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SubtaskTemplate {
  text: string;
  estimatedTime: number;
  difficulty: QuestDifficulty;
  required?: boolean;
  variables?: string[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'time' | 'date' | 'select' | 'multiselect';
  label: string;
  description?: string;
  validation?: (value: string) => boolean;
  suggestions?: string[];
}

export interface ContextTrigger {
  type: 'time' | 'skill' | 'project' | 'habit' | 'mood' | 'energy';
  condition: string;
  weight: number; // 0-1, how strongly this triggers the template
}

export interface ContextCondition {
  type: 'skill_level' | 'quest_count' | 'time_of_day' | 'day_of_week' | 'energy_level';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;
}

export interface RecommendationRule {
  condition: ContextCondition;
  action: 'suggest' | 'auto_fill' | 'warn' | 'hide';
  message?: string;
}

export interface CompletionCriteria {
  type: 'all_subtasks' | 'time_spent' | 'skill_level' | 'custom';
  value: any;
  description: string;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number;
  endDate?: string;
}

export interface QuestContext {
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  playerSkills: Record<string, number>;
  recentQuests: Quest[];
  activeProjects: string[];
  energyLevel: number; // 1-10
  mood: string;
  currentLocation?: string;
}

export interface TemplateSuggestion {
  template: QuestTemplate;
  confidence: number;
  reason: string; // Why this template was suggested
  description: string; // Template description
  variables: Record<string, string>; // Suggested variable values
  estimatedTime: number; // Estimated time to complete
  difficulty: string; // Suggested difficulty
  priority: string; // Suggested priority
  tags: string[]; // Suggested tags
}

export class QuestTemplateSystem {
  private static instance: QuestTemplateSystem;
  private templates: Map<string, QuestTemplate> = new Map();
  private builtinTemplates: QuestTemplate[] = [];

  static getInstance(): QuestTemplateSystem {
    if (!this.instance) {
      this.instance = new QuestTemplateSystem();
    }
    return this.instance;
  }

  constructor() {
    this.initializeBuiltinTemplates();
  }

  /**
   * Initialize built-in template library
   */
  private initializeBuiltinTemplates(): void {
    this.builtinTemplates = [
      // Daily Routine Templates
      {
        id: 'morning-routine',
        name: 'Morning Routine',
        category: 'daily-routine',
        description: 'Start your day with purpose and energy',
        icon: '🌅',
        tags: ['routine', 'morning', 'productivity'],
        config: {
          defaultXP: 30,
          defaultCP: 5,
          difficulty: 'easy',
          estimatedTime: 30,
          requiredSkills: [],
          suggestedRewards: ['morning-bonus', 'energy-boost'],
          priority: 'high',
          recurrence: { type: 'daily', interval: 1 }
        },
        content: {
          titleTemplate: 'Morning Routine: {{routineName}}',
          descriptionTemplate: 'Complete your morning routine to start the day energized and focused.',
          subtasks: [
            { text: 'Wake up at {{wakeTime}}', estimatedTime: 1, difficulty: 'easy', required: true },
            { text: 'Drink water and hydrate', estimatedTime: 2, difficulty: 'easy' },
            { text: 'Complete {{exerciseType}} for {{duration}} minutes', estimatedTime: 15, difficulty: 'medium' },
            { text: 'Review today\'s goals', estimatedTime: 5, difficulty: 'easy' },
            { text: 'Eat a healthy breakfast', estimatedTime: 10, difficulty: 'easy' }
          ],
          metadata: {
            type: 'routine',
            category: 'daily'
          },
          completionCriteria: [
            { type: 'all_subtasks', value: true, description: 'Complete all morning routine tasks' }
          ]
        },
        variables: {
          required: [
            { name: 'routineName', type: 'string', label: 'Routine Name', suggestions: ['Power Morning', 'Zen Start', 'Productive Dawn'] },
            { name: 'wakeTime', type: 'time', label: 'Wake Up Time' },
            { name: 'exerciseType', type: 'select', label: 'Exercise Type', suggestions: ['Yoga', 'Running', 'Gym', 'Walking', 'Meditation'] },
            { name: 'duration', type: 'number', label: 'Exercise Duration (minutes)' }
          ],
          optional: [
            { name: 'breakfastType', type: 'string', label: 'Breakfast Type', suggestions: ['Protein smoothie', 'Oatmeal', 'Eggs', 'Fruit bowl'] }
          ],
          defaults: {
            routineName: 'Power Morning',
            wakeTime: '07:00',
            exerciseType: 'Yoga',
            duration: '15'
          },
          suggestions: {
            exerciseType: ['Yoga', 'Running', 'Gym', 'Walking', 'Meditation', 'Stretching'],
            breakfastType: ['Protein smoothie', 'Oatmeal', 'Eggs', 'Fruit bowl', 'Toast', 'Cereal']
          }
        },
        context: {
          triggers: [
            { type: 'time', condition: 'hour >= 6 && hour <= 9', weight: 0.9 },
            { type: 'energy', condition: 'energy_level >= 7', weight: 0.7 }
          ],
          conditions: [
            { type: 'time_of_day', operator: 'greater_than', value: 6 },
            { type: 'time_of_day', operator: 'less_than', value: 10 }
          ],
          recommendations: [
            {
              condition: { type: 'time_of_day', operator: 'equals', value: 7 },
              action: 'suggest',
              message: 'Perfect time for your morning routine!'
            }
          ]
        }
      },

      // Skill Development Templates
      {
        id: 'skill-practice',
        name: 'Skill Practice Session',
        category: 'skill-development',
        description: 'Dedicated practice time for skill improvement',
        icon: '🎯',
        tags: ['skill', 'practice', 'learning'],
        config: {
          defaultXP: 75,
          defaultCP: 15,
          difficulty: 'medium',
          estimatedTime: 60,
          requiredSkills: ['{{skillName}}'],
          suggestedRewards: ['skill-progress', 'mastery-points'],
          priority: 'medium'
        },
        content: {
          titleTemplate: 'Practice {{skillName}} - Level {{currentLevel}} to {{targetLevel}}',
          descriptionTemplate: 'Focus on improving {{skillName}} through deliberate practice.',
          subtasks: [
            { text: 'Review current {{skillName}} level', estimatedTime: 5, difficulty: 'easy' },
            { text: 'Identify specific areas for improvement', estimatedTime: 10, difficulty: 'medium' },
            { text: 'Complete focused practice session', estimatedTime: 30, difficulty: 'hard' },
            { text: 'Record progress and insights', estimatedTime: 10, difficulty: 'medium' },
            { text: 'Plan next practice session', estimatedTime: 5, difficulty: 'easy' }
          ],
          metadata: {
            type: 'skill-practice',
            category: 'development'
          },
          completionCriteria: [
            { type: 'time_spent', value: 30, description: 'Spend at least 30 minutes practicing' }
          ]
        },
        variables: {
          required: [
            { name: 'skillName', type: 'string', label: 'Skill Name' },
            { name: 'currentLevel', type: 'number', label: 'Current Level' },
            { name: 'targetLevel', type: 'number', label: 'Target Level' }
          ],
          optional: [
            { name: 'practiceMethod', type: 'select', label: 'Practice Method', suggestions: ['Deliberate practice', 'Spaced repetition', 'Project-based', 'Tutorial follow-along'] }
          ],
          defaults: {},
          suggestions: {
            skillName: ['JavaScript', 'Python', 'Design', 'Writing', 'Public Speaking', 'Cooking', 'Music', 'Photography']
          }
        },
        context: {
          triggers: [
            { type: 'skill', condition: 'skill_level < 5', weight: 0.8 },
            { type: 'time', condition: 'hour >= 9 && hour <= 17', weight: 0.6 }
          ],
          conditions: [
            { type: 'skill_level', operator: 'less_than', value: 10 }
          ],
          recommendations: [
            {
              condition: { type: 'skill_level', operator: 'less_than', value: 3 },
              action: 'suggest',
              message: 'Great time to build foundational skills!'
            }
          ]
        }
      },

      // Project Management Templates
      {
        id: 'project-milestone',
        name: 'Project Milestone',
        category: 'project-management',
        description: 'Complete a major project milestone',
        icon: '🏗️',
        tags: ['project', 'milestone', 'deliverable'],
        config: {
          defaultXP: 150,
          defaultCP: 25,
          difficulty: 'hard',
          estimatedTime: 240,
          requiredSkills: [],
          suggestedRewards: ['project-progress', 'milestone-bonus'],
          priority: 'high'
        },
        content: {
          titleTemplate: '{{projectName}} - {{milestoneName}}',
          descriptionTemplate: 'Complete the {{milestoneName}} milestone for {{projectName}} project.',
          subtasks: [
            { text: 'Review milestone requirements', estimatedTime: 15, difficulty: 'medium' },
            { text: 'Break down milestone into tasks', estimatedTime: 20, difficulty: 'medium' },
            { text: 'Execute milestone tasks', estimatedTime: 180, difficulty: 'hard' },
            { text: 'Test and validate deliverables', estimatedTime: 15, difficulty: 'medium' },
            { text: 'Document milestone completion', estimatedTime: 10, difficulty: 'easy' }
          ],
          metadata: {
            type: 'project-milestone',
            category: 'management'
          },
          completionCriteria: [
            { type: 'all_subtasks', value: true, description: 'Complete all milestone tasks' }
          ]
        },
        variables: {
          required: [
            { name: 'projectName', type: 'string', label: 'Project Name' },
            { name: 'milestoneName', type: 'string', label: 'Milestone Name' }
          ],
          optional: [
            { name: 'dueDate', type: 'date', label: 'Due Date' },
            { name: 'stakeholders', type: 'string', label: 'Stakeholders' }
          ],
          defaults: {},
          suggestions: {}
        },
        context: {
          triggers: [
            { type: 'project', condition: 'active_projects > 0', weight: 0.9 },
            { type: 'time', condition: 'hour >= 9 && hour <= 17', weight: 0.7 }
          ],
          conditions: [],
          recommendations: []
        }
      }
    ];

    // Register built-in templates
    this.builtinTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get context-aware template suggestions
   */
  async getTemplateSuggestions(context: QuestContext): Promise<TemplateSuggestion[]> {
    const suggestions: TemplateSuggestion[] = [];

    // Time-based suggestions
    const timeSuggestions = this.getTimeBasedSuggestions(context);
    suggestions.push(...timeSuggestions);

    // Skill-based suggestions
    const skillSuggestions = this.getSkillBasedSuggestions(context);
    suggestions.push(...skillSuggestions);

    // Project-based suggestions
    const projectSuggestions = this.getProjectBasedSuggestions(context);
    suggestions.push(...projectSuggestions);

    // Habit-based suggestions
    const habitSuggestions = this.getHabitBasedSuggestions(context);
    suggestions.push(...habitSuggestions);

    return this.rankSuggestions(suggestions, context);
  }

  /**
   * Generate quest from template with smart defaults
   */
  async generateQuestFromTemplate(
    template: QuestTemplate,
    variables: Record<string, string>
  ): Promise<Quest> {
    // Apply smart defaults
    const finalVariables = { ...template.variables.defaults, ...variables };

    // Generate title and description
    const title = this.substituteVariables(template.content.titleTemplate, finalVariables);
    const description = this.substituteVariables(template.content.descriptionTemplate, finalVariables);

    // Generate subtasks
    const subtasks = await this.generateSubtasks(template.content.subtasks, finalVariables);

    // Apply smart defaults to config
    const config = await this.applySmartDefaults(template.config, finalVariables, template);

    // Create quest object
    const quest: Quest = {
        id: this.generateQuestId(),
        title: this.substituteVariables(template.content.titleTemplate, variables),
        description: this.substituteVariables(template.content.descriptionTemplate, variables),
        subtasks: template.content.subtasks.map(subtask => ({
            text: this.substituteVariables(subtask.text, variables),
            completed: false,
            description: subtask.text.includes('{{') ? this.substituteVariables(subtask.text, variables) : undefined
        })),
        completed: false,
        templateId: template.id,
        createdDate: new Date().toISOString(),
        // Required Quest properties
        className: template.category,
        stats: [],
        xp: template.config.defaultXP,
        cp: template.config.defaultCP,
        coins: Math.round(template.config.defaultXP * 0.1),
        priority: template.config.priority,
        difficulty: template.config.difficulty,
        skills: template.config.requiredSkills,
        tags: template.tags,
        type: template.category,
        estimatedTime: template.config.estimatedTime.toString()
    };

    return quest;
  }

  /**
   * Get all templates by category
   */
  getTemplatesByCategory(category: QuestCategory): QuestTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): QuestTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Add custom template
   */
  addCustomTemplate(template: QuestTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Private helper methods
   */
  private getTimeBasedSuggestions(context: QuestContext): TemplateSuggestion[] {
    const suggestions: TemplateSuggestion[] = [];
    const hour = context.timeOfDay;

    if (hour >= 6 && hour <= 9) {
      const morningTemplate = this.getTemplate('morning-routine');
      if (morningTemplate) {
        suggestions.push({
          template: morningTemplate,
          confidence: 0.9,
          reason: 'Perfect time for morning routine quests',
          description: 'Start your day with purpose and energy',
          variables: {},
          estimatedTime: 30,
          difficulty: 'easy',
          priority: 'high',
          tags: ['routine', 'morning', 'productivity']
        });
      }
    }

    if (hour >= 9 && hour <= 12) {
      const skillTemplate = this.getTemplate('skill-practice');
      if (skillTemplate) {
        suggestions.push({
          template: skillTemplate,
          confidence: 0.85,
          reason: 'Peak productivity hours for skill development',
          description: 'Dedicated practice time for skill improvement',
          variables: {},
          estimatedTime: 60,
          difficulty: 'medium',
          priority: 'medium',
          tags: ['skill', 'practice', 'learning']
        });
      }
    }

    return suggestions;
  }

  private getSkillBasedSuggestions(context: QuestContext): TemplateSuggestion[] {
    const suggestions: TemplateSuggestion[] = [];
    const weakSkills = this.identifyWeakSkills(context.playerSkills);

    weakSkills.forEach(skill => {
      const skillTemplate = this.getTemplate('skill-practice');
      if (skillTemplate) {
        suggestions.push({
          template: skillTemplate,
          confidence: 0.7,
          reason: `Focus on improving ${skill.name}`,
          description: 'Dedicated practice time for skill improvement',
          variables: {
            skillName: skill.name,
            currentLevel: skill.level.toString(),
            targetLevel: (skill.level + 1).toString()
          },
          estimatedTime: 60,
          difficulty: 'medium',
          priority: 'medium',
          tags: ['skill', 'practice', 'learning']
        });
      }
    });

    return suggestions;
  }

  private getProjectBasedSuggestions(context: QuestContext): TemplateSuggestion[] {
    const suggestions: TemplateSuggestion[] = [];

    if (context.activeProjects.length > 0) {
      const projectTemplate = this.getTemplate('project-milestone');
      if (projectTemplate) {
        suggestions.push({
          template: projectTemplate,
          confidence: 0.8,
          reason: `You have ${context.activeProjects.length} active project(s)`,
          description: 'Complete a major project milestone',
          variables: {
            projectName: context.activeProjects[0]
          },
          estimatedTime: 240,
          difficulty: 'hard',
          priority: 'high',
          tags: ['project', 'milestone', 'deliverable']
        });
      }
    }

    return suggestions;
  }

  private getHabitBasedSuggestions(context: QuestContext): TemplateSuggestion[] {
    // Analyze recent quests to suggest habit-building templates
    const suggestions: TemplateSuggestion[] = [];
    
    // This would analyze quest completion patterns and suggest habit templates
    // Implementation depends on your habit tracking system
    
    return suggestions;
  }

  private rankSuggestions(suggestions: TemplateSuggestion[], context: QuestContext): TemplateSuggestion[] {
    return suggestions
      .map(suggestion => ({
        ...suggestion,
        confidence: this.calculateConfidence(suggestion, context)
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Return top 10 suggestions
  }

  private calculateConfidence(suggestion: TemplateSuggestion, context: QuestContext): number {
    let confidence = suggestion.confidence;

    // Adjust based on context
    if (context.energyLevel >= 8) {
      confidence *= 1.2; // Boost for high energy
    } else if (context.energyLevel <= 3) {
      confidence *= 0.7; // Reduce for low energy
    }

    // Adjust based on time of day
    const hour = context.timeOfDay;
    if (hour >= 9 && hour <= 17) {
      confidence *= 1.1; // Boost during work hours
    }

    return Math.min(confidence, 1.0);
  }

  private identifyWeakSkills(playerSkills: Record<string, number>): Array<{ name: string; level: number }> {
    return Object.entries(playerSkills)
      .filter(([_, level]) => level < 5) // Skills below level 5
      .map(([name, level]) => ({ name, level }))
      .sort((a, b) => a.level - b.level) // Sort by lowest level first
      .slice(0, 3); // Return top 3 weakest skills
  }

  private substituteVariables(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return variables[variable] || match;
    });
  }

  private async generateSubtasks(
    subtaskTemplates: SubtaskTemplate[],
    variables: Record<string, string>
  ): Promise<SubtaskTemplate[]> {
    return subtaskTemplates.map(template => ({
      ...template,
      text: this.substituteVariables(template.text, variables)
    }));
  }

  private async applySmartDefaults(
    config: QuestTemplate['config'],
    variables: Record<string, string>,
    template: QuestTemplate
  ): Promise<QuestTemplate['config']> {
    const smartConfig = { ...config };

    // Auto-calculate XP based on difficulty and time
    if (!smartConfig.defaultXP) {
      smartConfig.defaultXP = this.calculateDefaultXP(smartConfig.difficulty, smartConfig.estimatedTime);
    }

    // Auto-calculate CP based on skills involved
    if (!smartConfig.defaultCP) {
      smartConfig.defaultCP = this.calculateDefaultCP(smartConfig.requiredSkills);
    }

    // Auto-set priority based on due date and importance
    if (!smartConfig.priority) {
      smartConfig.priority = this.calculateDefaultPriority(variables, smartConfig.difficulty);
    }

    return smartConfig;
  }

  private calculateDefaultXP(difficulty: QuestDifficulty, timeMinutes: number): number {
    const baseXP = {
      'easy': 25,
      'medium': 50,
      'hard': 100,
      'epic': 200
    }[difficulty] || 50;

    const timeMultiplier = Math.max(0.5, Math.min(2.0, timeMinutes / 60));
    return Math.round(baseXP * timeMultiplier);
  }

  private calculateDefaultCP(skills: string[]): number {
    return Math.max(5, skills.length * 5);
  }

  private calculateDefaultPriority(variables: Record<string, string>, difficulty: QuestDifficulty): QuestPriority {
    // Check for due date
    if (variables.dueDate) {
      const dueDate = new Date(variables.dueDate);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 1) return 'urgent';
      if (daysUntilDue <= 3) return 'high';
    }

    // Check difficulty
    if (difficulty === 'epic') return 'high';
    if (difficulty === 'hard') return 'medium';

    return 'medium';
  }

  private generateQuestId(): string {
    return `quest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
