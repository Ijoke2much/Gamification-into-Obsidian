import type { VisualThemePreset } from '../types';

/**
 * Clay — ChatGPT claymorphism design system.
 * Mint canvas, cream molded cards, inset + soft drop shadows (no emissive glow).
 * Player tab is the first surface; other tabs stay lightly tinted until expanded.
 */
export const CLAY_PRESET: VisualThemePreset = {
	id: 'clay',
	name: 'Clay (Player preview)',
	description:
		'Claymorphism cards with molded inset lighting and soft drop shadows. Preview on Player first.',
	available: true,
	shell: 'modern',
	typography: {
		ui: '"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
		notices: '"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
	},
	tokens: {
		// From clay design system
		'--go-bg': '#d7ece7',
		'--go-panel': '#f6f2ec',
		'--go-panel-strong': '#f7f4ef',
		'--go-card': '#f6f2ec',
		'--go-card-soft': '#efe8df',
		'--go-text': '#2e2e2e',
		'--go-text-bright': '#2e2e2e',
		'--go-muted': '#676767',
		'--go-border': 'rgba(255, 255, 255, 0.45)',
		'--go-border-strong': 'rgba(255, 255, 255, 0.45)',
		'--go-accent': '#59c9c6',
		'--go-accent-soft': 'rgba(89, 201, 198, 0.22)',
		'--go-gold': '#59c9c6',
		'--go-progress-fill': '#65d6d1',
		'--go-progress-fill-strong': '#2db0a9',
		'--go-progress-glow': 'transparent',
		'--go-progress-track': '#dddddd',
		'--go-cp-progress-fill': '#65d6d1',
		'--go-cp-progress-fill-strong': '#2db0a9',
		'--go-cp-progress-glow': 'transparent',
		'--go-exp-progress-fill': '#65d6d1',
		'--go-exp-progress-fill-strong': '#2db0a9',
		'--go-exp-progress-glow': 'transparent',
		'--go-exp-text': '#2e2e2e',
		'--go-success': '#53c6c2',
		'--go-danger': '#d4a5a5',
		'--go-warning': '#c4a574',
		'--go-shadow':
			'inset 3px 3px 5px rgba(255, 255, 255, 0.9), inset -4px -4px 8px rgba(0, 0, 0, 0.05), 0 3px 5px rgba(0, 0, 0, 0.08), 0 12px 22px rgba(0, 0, 0, 0.12)',
		'--go-shadow-soft':
			'inset 3px 3px 5px rgba(255, 255, 255, 0.85), inset -3px -3px 6px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.1)',
		'--go-radius': '22px',
		'--go-font-ui':
			'"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
		'--go-font-display':
			'"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
		'--go-font-body':
			'"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
		'--go-screen-bg': 'linear-gradient(180deg, #d7ece7, #c9e3de)',
		'--go-screen-overlay': 'none',
		'--go-static-opacity': '0',

		// Clay design-system tokens
		'--clay-bg': '#d7ece7',
		'--clay-surface': '#f6f2ec',
		'--clay-surface-2': '#efe8df',
		'--clay-surface-soft': '#efe8df',
		'--clay-surface-sage': '#c9e3de',
		'--clay-gradient': 'linear-gradient(145deg, #f6f2ec, #efe8df)',
		'--clay-button-gradient': 'linear-gradient(180deg, #f7f4ef, #ece3da)',
		'--clay-accent-gradient': 'linear-gradient(180deg, #6ad7d4, #53c6c2)',
		'--clay-progress-gradient': 'linear-gradient(90deg, #65d6d1, #2db0a9)',
		'--clay-highlight': 'rgba(255, 255, 255, 0.85)',
		'--clay-shadow-light': 'rgba(255, 255, 255, 0.7)',
		'--clay-shadow-dark': 'rgba(0, 0, 0, 0.13)',
		'--clay-radius-small': '12px',
		'--clay-radius': '22px',
		'--clay-radius-large': '34px',
		/* Universal .clay card shadow */
		'--clay-shadow':
			'inset 3px 3px 5px rgba(255, 255, 255, 0.9), inset -4px -4px 8px rgba(0, 0, 0, 0.05), 0 3px 5px rgba(0, 0, 0, 0.08), 0 12px 22px rgba(0, 0, 0, 0.12)',
		'--clay-shadow-hover':
			'inset 3px 3px 6px rgba(255, 255, 255, 0.95), inset -5px -5px 8px rgba(0, 0, 0, 0.06), 0 8px 18px rgba(0, 0, 0, 0.15)',
		'--clay-shadow-pressed':
			'inset 5px 5px 8px rgba(0, 0, 0, 0.08), inset -2px -2px 5px rgba(255, 255, 255, 0.5)',
		/* Aliases used by existing Player CSS */
		'--clay-raised':
			'inset 3px 3px 5px rgba(255, 255, 255, 0.9), inset -4px -4px 8px rgba(0, 0, 0, 0.05), 0 3px 5px rgba(0, 0, 0, 0.08), 0 12px 22px rgba(0, 0, 0, 0.12)',
		'--clay-raised-soft':
			'inset 3px 3px 5px rgba(255, 255, 255, 0.85), inset -3px -3px 6px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.1)',
		'--clay-raised-strong':
			'inset 3px 3px 5px rgba(255, 255, 255, 0.9), inset -4px -4px 8px rgba(0, 0, 0, 0.05), 0 3px 5px rgba(0, 0, 0, 0.08), 0 12px 22px rgba(0, 0, 0, 0.12)',
		'--clay-recessed':
			'inset 3px 3px 5px rgba(0, 0, 0, 0.08), inset -2px -2px 4px rgba(255, 255, 255, 0.7)',
		'--clay-recessed-soft':
			'inset 2px 2px 5px rgba(0, 0, 0, 0.12), inset -2px -2px 5px rgba(255, 255, 255, 0.7)',
		'--clay-pressed':
			'inset 5px 5px 8px rgba(0, 0, 0, 0.08), inset -2px -2px 5px rgba(255, 255, 255, 0.5)',
		'--clay-accent': '#59c9c6',
		'--clay-accent-deep': '#2ba8a3',
		'--clay-accent-shadow':
			'0 12px 24px rgba(0, 0, 0, 0.25), inset 2px 2px 4px rgba(255, 255, 255, 0.5)',
		'--clay-sage': '#53c6c2',
		'--clay-text': '#2e2e2e',
		'--clay-text-strong': '#2e2e2e',
		'--clay-text-light': '#676767',
		'--clay-muted': '#676767',
		'--clay-dark': 'rgba(0, 0, 0, 0.13)',
		'--clay-light': 'rgba(255, 255, 255, 0.85)',

		// Pixel aliases
		'--pixel-bg': '#d7ece7',
		'--pixel-panel': '#f6f2ec',
		'--pixel-panel-alt': '#efe8df',
		'--pixel-border-dark': 'rgba(255, 255, 255, 0.45)',
		'--pixel-border-light': 'rgba(255, 255, 255, 0.45)',
		'--pixel-accent': '#59c9c6',
		'--pixel-highlight': '#59c9c6',
		'--pixel-text': '#2e2e2e',
		'--pixel-muted': '#676767',
		'--pixel-shadow':
			'inset 3px 3px 5px rgba(255, 255, 255, 0.9), inset -4px -4px 8px rgba(0, 0, 0, 0.05), 0 3px 5px rgba(0, 0, 0, 0.08), 0 12px 22px rgba(0, 0, 0, 0.12)',
		'--pixel-shadow-pressed':
			'inset 5px 5px 8px rgba(0, 0, 0, 0.08), inset -2px -2px 5px rgba(255, 255, 255, 0.5)',
		'--pixel-card-radius': '22px',

		'--gamify-journey-gold': '#59c9c6',
		'--gamify-journey-border': 'transparent',
		'--gamify-journey-hub-bg': '#d7ece7',
		'--gamify-scene-border': 'transparent',

		'--gamify-guild-border': 'transparent',
		'--gamify-guild-frame': '#59c9c6',
		'--gamify-guild-bg': '#d7ece7',
		'--gamify-guild-panel': '#f6f2ec',

		'--gamify-boss-bg': '#d7ece7',
		'--gamify-boss-nav-bg': '#f6f2ec',
		'--gamify-boss-text': '#2e2e2e',
		'--gamify-boss-muted': '#676767',

		'--gamify-gate-border': 'transparent',
		'--gamify-gate-border-strong': 'transparent',
		'--gamify-gate-bg': 'linear-gradient(180deg, #d7ece7, #c9e3de)',
		'--gamify-gate-card-bg': '#f6f2ec',
		'--gamify-gate-card-border': 'rgba(255, 255, 255, 0.45)',
		'--gamify-gate-text': '#2e2e2e',
		'--gamify-gate-muted': '#676767',
		'--gamify-gate-accent': '#59c9c6',
		'--gamify-gate-highlight': '#59c9c6',
		'--gamify-gate-glow': '0 12px 22px rgba(0, 0, 0, 0.12)',
		'--gamify-gate-banner-bg': '#d7ece7',

		'--gamification-primary': '#59c9c6',
		'--gamification-secondary': '#2ba8a3',

		'--system-bg': '#d7ece7',
		'--system-panel-bg': '#f6f2ec',
		'--system-panel-bg-strong': '#f7f4ef',
		'--system-border': 'rgba(255, 255, 255, 0.45)',
		'--system-accent': '#59c9c6',
		'--system-gold': '#59c9c6',
		'--system-green': '#53c6c2',
		'--system-glow': 'transparent',
		'--system-text': '#2e2e2e',
		'--system-text-bright': '#2e2e2e',
		'--system-muted': '#676767',
		'--system-font-ui':
			'"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
	},
};
