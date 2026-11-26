// Tree Visual Effects System
// Enhances PNG tree assets with animations, particles, and seasonal effects

export interface TreeVisualEffect {
    id: string;
    name: string;
    type: 'particle' | 'overlay' | 'animation' | 'glow' | 'seasonal';
    duration: number; // milliseconds
    triggerCondition: 'completion' | 'milestone' | 'stage_change' | 'seasonal' | 'hover' | 'click';
    cssClasses: string[];
    particleConfig?: ParticleEffectConfig;
    animationConfig?: AnimationConfig;
}

export interface ParticleEffectConfig {
    particleCount: number;
    particleSize: { min: number; max: number };
    colors: string[];
    duration: number;
    direction: 'up' | 'down' | 'radial' | 'spiral';
    speed: { min: number; max: number };
    opacity: { start: number; end: number };
}

export interface AnimationConfig {
    keyframes: { [key: string]: any }[];
    duration: number;
    easing: string;
    iterations: number | 'infinite';
    fillMode: 'forwards' | 'backwards' | 'both' | 'none';
}

export interface TreeStageTransition {
    fromStage: number;
    toStage: number;
    duration: number;
    effects: TreeVisualEffect[];
    celebrationIntensity: 'low' | 'medium' | 'high' | 'epic';
}

// Visual effects for different tree actions
export const TREE_VISUAL_EFFECTS: TreeVisualEffect[] = [
    // Completion Effects
    {
        id: 'completion_sparkles',
        name: 'Completion Sparkles',
        type: 'particle',
        duration: 2000,
        triggerCondition: 'completion',
        cssClasses: ['completion-sparkles'],
        particleConfig: {
            particleCount: 15,
            particleSize: { min: 4, max: 8 },
            colors: ['#ffd700', '#ffed4e', '#f59e0b'],
            duration: 2000,
            direction: 'radial',
            speed: { min: 50, max: 100 },
            opacity: { start: 1, end: 0 }
        }
    },
    {
        id: 'growth_pulse',
        name: 'Growth Pulse',
        type: 'animation',
        duration: 1000,
        triggerCondition: 'completion',
        cssClasses: ['growth-pulse'],
        animationConfig: {
            keyframes: [
                { transform: 'scale(1)', filter: 'brightness(1)' },
                { transform: 'scale(1.05)', filter: 'brightness(1.2)' },
                { transform: 'scale(1)', filter: 'brightness(1)' }
            ],
            duration: 1000,
            easing: 'ease-in-out',
            iterations: 1,
            fillMode: 'forwards'
        }
    },

    // Milestone Effects
    {
        id: 'milestone_celebration',
        name: 'Milestone Celebration',
        type: 'particle',
        duration: 4000,
        triggerCondition: 'milestone',
        cssClasses: ['milestone-celebration'],
        particleConfig: {
            particleCount: 30,
            particleSize: { min: 6, max: 12 },
            colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24'],
            duration: 4000,
            direction: 'up',
            speed: { min: 80, max: 150 },
            opacity: { start: 1, end: 0 }
        }
    },
    {
        id: 'milestone_glow',
        name: 'Milestone Glow',
        type: 'glow',
        duration: 3000,
        triggerCondition: 'milestone',
        cssClasses: ['milestone-glow']
    },

    // Stage Change Effects
    {
        id: 'stage_evolution',
        name: 'Stage Evolution',
        type: 'animation',
        duration: 2500,
        triggerCondition: 'stage_change',
        cssClasses: ['stage-evolution'],
        animationConfig: {
            keyframes: [
                {
                    transform: 'scale(1)',
                    filter: 'brightness(1) blur(0px)',
                    opacity: 1
                },
                {
                    transform: 'scale(1.1)',
                    filter: 'brightness(1.5) blur(1px)',
                    opacity: 0.8
                },
                {
                    transform: 'scale(1.05)',
                    filter: 'brightness(2) blur(2px)',
                    opacity: 0.6
                },
                {
                    transform: 'scale(1)',
                    filter: 'brightness(1.2) blur(0px)',
                    opacity: 1
                },
                {
                    transform: 'scale(1)',
                    filter: 'brightness(1) blur(0px)',
                    opacity: 1
                }
            ],
            duration: 2500,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            iterations: 1,
            fillMode: 'forwards'
        }
    },
    {
        id: 'evolution_burst',
        name: 'Evolution Burst',
        type: 'particle',
        duration: 3000,
        triggerCondition: 'stage_change',
        cssClasses: ['evolution-burst'],
        particleConfig: {
            particleCount: 50,
            particleSize: { min: 8, max: 16 },
            colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#fbbf24', '#f59e0b'],
            duration: 3000,
            direction: 'radial',
            speed: { min: 100, max: 200 },
            opacity: { start: 1, end: 0 }
        }
    },

    // Seasonal Effects
    {
        id: 'spring_blossoms',
        name: 'Spring Blossoms',
        type: 'seasonal',
        duration: -1, // Persistent during season
        triggerCondition: 'seasonal',
        cssClasses: ['spring-blossoms'],
        particleConfig: {
            particleCount: 8,
            particleSize: { min: 6, max: 10 },
            colors: ['#fce7f3', '#fbcfe8', '#f9a8d4'],
            duration: 4000,
            direction: 'down',
            speed: { min: 20, max: 40 },
            opacity: { start: 0.8, end: 0 }
        }
    },
    {
        id: 'autumn_leaves',
        name: 'Autumn Leaves',
        type: 'seasonal',
        duration: -1,
        triggerCondition: 'seasonal',
        cssClasses: ['autumn-leaves'],
        particleConfig: {
            particleCount: 6,
            particleSize: { min: 8, max: 14 },
            colors: ['#f59e0b', '#ea580c', '#dc2626', '#92400e'],
            duration: 6000,
            direction: 'down',
            speed: { min: 15, max: 35 },
            opacity: { start: 0.9, end: 0 }
        }
    },
    {
        id: 'winter_snow',
        name: 'Winter Snow',
        type: 'seasonal',
        duration: -1,
        triggerCondition: 'seasonal',
        cssClasses: ['winter-snow'],
        particleConfig: {
            particleCount: 12,
            particleSize: { min: 3, max: 6 },
            colors: ['#ffffff', '#f1f5f9', '#e2e8f0'],
            duration: 8000,
            direction: 'down',
            speed: { min: 10, max: 25 },
            opacity: { start: 0.7, end: 0 }
        }
    },

    // Interactive Effects
    {
        id: 'hover_shimmer',
        name: 'Hover Shimmer',
        type: 'glow',
        duration: 500,
        triggerCondition: 'hover',
        cssClasses: ['hover-shimmer']
    },
    {
        id: 'click_ripple',
        name: 'Click Ripple',
        type: 'animation',
        duration: 800,
        triggerCondition: 'click',
        cssClasses: ['click-ripple'],
        animationConfig: {
            keyframes: [
                {
                    transform: 'scale(1)',
                    opacity: 0.6,
                    boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.6)'
                },
                {
                    transform: 'scale(1.1)',
                    opacity: 0.3,
                    boxShadow: '0 0 0 20px rgba(139, 92, 246, 0)'
                },
                {
                    transform: 'scale(1)',
                    opacity: 0,
                    boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)'
                }
            ],
            duration: 800,
            easing: 'ease-out',
            iterations: 1,
            fillMode: 'forwards'
        }
    }
];

// Stage transition configurations
export const TREE_STAGE_TRANSITIONS: TreeStageTransition[] = [
    {
        fromStage: 0,
        toStage: 1,
        duration: 2000,
        celebrationIntensity: 'medium',
        effects: [
            TREE_VISUAL_EFFECTS.find(e => e.id === 'stage_evolution')!,
            TREE_VISUAL_EFFECTS.find(e => e.id === 'evolution_burst')!,
            TREE_VISUAL_EFFECTS.find(e => e.id === 'milestone_glow')!
        ]
    },
    {
        fromStage: 1,
        toStage: 2,
        duration: 2200,
        celebrationIntensity: 'medium',
        effects: [
            TREE_VISUAL_EFFECTS.find(e => e.id === 'stage_evolution')!,
            TREE_VISUAL_EFFECTS.find(e => e.id === 'evolution_burst')!
        ]
    },
    {
        fromStage: 2,
        toStage: 3,
        duration: 2400,
        celebrationIntensity: 'high',
        effects: [
            TREE_VISUAL_EFFECTS.find(e => e.id === 'stage_evolution')!,
            TREE_VISUAL_EFFECTS.find(e => e.id === 'evolution_burst')!,
            TREE_VISUAL_EFFECTS.find(e => e.id === 'milestone_glow')!
        ]
    },
    {
        fromStage: 3,
        toStage: 4,
        duration: 2600,
        celebrationIntensity: 'high',
        effects: [
            TREE_VISUAL_EFFECTS.find(e => e.id === 'stage_evolution')!,
            TREE_VISUAL_EFFECTS.find(e => e.id === 'evolution_burst')!
        ]
    },
    {
        fromStage: 4,
        toStage: 5,
        duration: 3000,
        celebrationIntensity: 'epic',
        effects: [
            TREE_VISUAL_EFFECTS.find(e => e.id === 'stage_evolution')!,
            TREE_VISUAL_EFFECTS.find(e => e.id === 'evolution_burst')!,
            TREE_VISUAL_EFFECTS.find(e => e.id === 'milestone_glow')!,
            TREE_VISUAL_EFFECTS.find(e => e.id === 'milestone_celebration')!
        ]
    }
];

export class TreeVisualEffectsManager {
    private static activeEffects: Map<string, HTMLElement[]> = new Map();
    private static seasonalEffects: Set<string> = new Set();

    // Trigger a visual effect on a tree element
    static triggerEffect(
        treeElement: HTMLElement,
        effectId: string,
        options?: {
            intensity?: number;
            duration?: number;
            delay?: number;
        }
    ): void {
        const effect = TREE_VISUAL_EFFECTS.find(e => e.id === effectId);
        if (!effect) return;

        const effectElement = this.createEffectElement(treeElement, effect, options);

        // Track active effects
        if (!this.activeEffects.has(effectId)) {
            this.activeEffects.set(effectId, []);
        }
        this.activeEffects.get(effectId)!.push(effectElement);

        // Auto-cleanup after effect duration
        if (effect.duration > 0) {
            setTimeout(() => {
                this.removeEffect(effectId, effectElement);
            }, options?.duration || effect.duration);
        }
    }

    // Trigger stage transition effect
    static triggerStageTransition(
        treeElement: HTMLElement,
        fromStage: number,
        toStage: number,
        onComplete?: () => void
    ): void {
        const transition = TREE_STAGE_TRANSITIONS.find(
            t => t.fromStage === fromStage && t.toStage === toStage
        );

        if (!transition) {
            onComplete?.();
            return;
        }

        // Add transition class for CSS animations
        treeElement.classList.add('stage-transitioning');

        // Trigger all transition effects
        transition.effects.forEach((effect, index) => {
            setTimeout(() => {
                this.triggerEffect(treeElement, effect.id, {
                    intensity: this.getIntensityMultiplier(transition.celebrationIntensity)
                });
            }, index * 200); // Stagger effects
        });

        // Complete transition
        setTimeout(() => {
            treeElement.classList.remove('stage-transitioning');
            onComplete?.();
        }, transition.duration);
    }

    // Apply seasonal effects based on active events
    static applySeasonalEffects(
        treeElement: HTMLElement,
        seasonalEvents: any[]
    ): void {
        // Clear existing seasonal effects
        this.clearSeasonalEffects(treeElement);

        // Apply new seasonal effects
        seasonalEvents.forEach(event => {
            const effects = event.effects?.visualEffects || [];
            effects.forEach((effectName: string) => {
                const effect = TREE_VISUAL_EFFECTS.find(e =>
                    e.type === 'seasonal' && e.name.toLowerCase().includes(effectName.toLowerCase())
                );

                if (effect) {
                    this.triggerEffect(treeElement, effect.id);
                    this.seasonalEffects.add(effect.id);
                }
            });
        });
    }

    // Create particle effects
    private static createParticleEffect(
        container: HTMLElement,
        config: ParticleEffectConfig
    ): HTMLElement {
        const particleContainer = document.createElement('div');
        particleContainer.className = 'particle-container';
        particleContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    `;

        // Create particles
        for (let i = 0; i < config.particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            const size = Math.random() * (config.particleSize.max - config.particleSize.min) + config.particleSize.min;
            const color = config.colors[Math.floor(Math.random() * config.colors.length)];
            const speed = Math.random() * (config.speed.max - config.speed.min) + config.speed.min;

            particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        opacity: ${config.opacity.start};
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: particle-${config.direction}-${i} ${config.duration}ms ease-out forwards;
      `;

            particleContainer.appendChild(particle);

            // Create animation for this particle
            this.createParticleAnimation(particle, config, speed, i);
        }

        container.appendChild(particleContainer);
        return particleContainer;
    }

    // Create CSS animation for particle
    private static createParticleAnimation(
        particle: HTMLElement,
        config: ParticleEffectConfig,
        speed: number,
        index: number
    ): void {
        const animationName = `particle-${config.direction}-${index}`;

        let keyframes = '';
        switch (config.direction) {
            case 'up':
                keyframes = `
          @keyframes ${animationName} {
            0% { transform: translateY(0px); opacity: ${config.opacity.start}; }
            100% { transform: translateY(-${speed}px); opacity: ${config.opacity.end}; }
          }
        `;
                break;
            case 'down':
                keyframes = `
          @keyframes ${animationName} {
            0% { transform: translateY(0px); opacity: ${config.opacity.start}; }
            100% { transform: translateY(${speed}px); opacity: ${config.opacity.end}; }
          }
        `;
                break;
            case 'radial':
                const angle = Math.random() * 360;
                const distance = speed;
                keyframes = `
          @keyframes ${animationName} {
            0% { 
              transform: translate(0px, 0px) scale(0.5); 
              opacity: ${config.opacity.start}; 
            }
            100% { 
              transform: translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(1); 
              opacity: ${config.opacity.end}; 
            }
          }
        `;
                break;
            case 'spiral':
                keyframes = `
          @keyframes ${animationName} {
            0% { 
              transform: rotate(0deg) translateX(0px) rotate(0deg); 
              opacity: ${config.opacity.start}; 
            }
            100% { 
              transform: rotate(720deg) translateX(${speed}px) rotate(-720deg); 
              opacity: ${config.opacity.end}; 
            }
          }
        `;
                break;
        }

        // Add the keyframes to the document
        const style = document.createElement('style');
        style.textContent = keyframes;
        document.head.appendChild(style);

        // Clean up the style after animation
        setTimeout(() => {
            document.head.removeChild(style);
        }, config.duration + 1000);
    }

    // Create effect element
    private static createEffectElement(
        treeElement: HTMLElement,
        effect: TreeVisualEffect,
        options?: any
    ): HTMLElement {
        const effectElement = document.createElement('div');
        effectElement.className = `tree-effect ${effect.cssClasses.join(' ')}`;

        // Position relative to tree
        const treeRect = treeElement.getBoundingClientRect();
        effectElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;

        if (effect.type === 'particle' && effect.particleConfig) {
            return this.createParticleEffect(treeElement, effect.particleConfig);
        }

        if (effect.type === 'animation' && effect.animationConfig) {
            this.applyAnimation(effectElement, effect.animationConfig);
        }

        treeElement.appendChild(effectElement);
        return effectElement;
    }

    // Apply CSS animation
    private static applyAnimation(
        element: HTMLElement,
        config: AnimationConfig
    ): void {
        const animationName = `tree-effect-${Date.now()}`;

        // Create keyframes string
        const keyframesString = config.keyframes.map((frame, index) => {
            const percentage = (index / (config.keyframes.length - 1)) * 100;
            const properties = Object.entries(frame)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; ');
            return `${percentage}% { ${properties} }`;
        }).join(' ');

        const keyframes = `@keyframes ${animationName} { ${keyframesString} }`;

        // Add animation style
        const style = document.createElement('style');
        style.textContent = keyframes;
        document.head.appendChild(style);

        // Apply animation
        element.style.animation = `${animationName} ${config.duration}ms ${config.easing} ${config.iterations === 'infinite' ? 'infinite' : config.iterations} ${config.fillMode}`;

        // Cleanup
        setTimeout(() => {
            document.head.removeChild(style);
        }, config.duration + 1000);
    }

    // Remove effect
    private static removeEffect(effectId: string, effectElement: HTMLElement): void {
        if (effectElement.parentNode) {
            effectElement.parentNode.removeChild(effectElement);
        }

        const effects = this.activeEffects.get(effectId);
        if (effects) {
            const index = effects.indexOf(effectElement);
            if (index > -1) {
                effects.splice(index, 1);
            }
        }
    }

    // Clear seasonal effects
    private static clearSeasonalEffects(treeElement: HTMLElement): void {
        this.seasonalEffects.forEach(effectId => {
            const effects = this.activeEffects.get(effectId) || [];
            effects.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            this.activeEffects.delete(effectId);
        });
        this.seasonalEffects.clear();
    }

    // Get intensity multiplier
    private static getIntensityMultiplier(intensity: string): number {
        switch (intensity) {
            case 'low': return 0.7;
            case 'medium': return 1.0;
            case 'high': return 1.3;
            case 'epic': return 1.8;
            default: return 1.0;
        }
    }

    // Add interactive handlers
    static addInteractiveEffects(treeElement: HTMLElement): void {
        // Hover effects
        treeElement.addEventListener('mouseenter', () => {
            this.triggerEffect(treeElement, 'hover_shimmer');
        });

        // Click effects
        treeElement.addEventListener('click', () => {
            this.triggerEffect(treeElement, 'click_ripple');
        });
    }

    // Trigger completion effect
    static triggerCompletionEffect(treeElement: HTMLElement): void {
        this.triggerEffect(treeElement, 'completion_sparkles');
        this.triggerEffect(treeElement, 'growth_pulse', { delay: 300 });
    }

    // Trigger milestone effect
    static triggerMilestoneEffect(treeElement: HTMLElement): void {
        this.triggerEffect(treeElement, 'milestone_celebration');
        this.triggerEffect(treeElement, 'milestone_glow', { delay: 500 });
    }
}
