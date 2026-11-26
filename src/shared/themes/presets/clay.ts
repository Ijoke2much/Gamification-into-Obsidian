import type { VisualThemePreset } from '../types';

/**
 * Clay — warm cream claymorphism (raised cards, recessed wells, matte teal).
 * Full skin for Player, Quests hub, and Pomodoro — not a tint over Solo HUD.
 */
export const CLAY_PRESET: VisualThemePreset = {
	id: 'clay',
	name: 'Clay',
	description:
		'Warm cream claymorphism: molded cards, recessed tracks, matte teal accents. No navy HUD.',
	available: true,
	shell: 'modern',
	typography: {
		ui: '"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
		notices: '"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
	},
	tokens: {
		// From clay design system
		'--go-bg': '#efe8dc',
		'--go-panel': '#f7f3ec',
		'--go-panel-strong': '#f4efe6',
		'--go-card': '#f7f3ec',
		'--go-card-soft': '#efe6d8',
		'--go-text': '#3a342c',
		'--go-text-bright': '#2c2722',
		'--go-muted': '#8a8278',
		'--go-border': 'rgba(255, 255, 255, 0.55)',
		'--go-border-strong': 'rgba(255, 255, 255, 0.7)',
		'--go-accent': '#5bb8b0',
		'--go-accent-soft': 'rgba(91, 184, 176, 0.22)',
		'--go-gold': '#5bb8b0',
		'--go-progress-fill': '#6ac9c1',
		'--go-progress-fill-strong': '#3fa39a',
		'--go-progress-glow': 'transparent',
		'--go-progress-track': '#e4ddd4',
		'--go-cp-progress-fill': '#6ac9c1',
		'--go-cp-progress-fill-strong': '#3fa39a',
		'--go-cp-progress-glow': 'transparent',
		'--go-exp-progress-fill': '#6ac9c1',
		'--go-exp-progress-fill-strong': '#3fa39a',
		'--go-exp-progress-glow': 'transparent',
		'--go-exp-text': '#3a342c',
		'--go-success': '#5bb8b0',
		'--go-danger': '#d4a5a5',
		'--go-warning': '#c4a574',
		'--go-shadow':
			'inset 4px 4px 8px rgba(255, 255, 255, 0.92), inset -5px -6px 12px rgba(166, 154, 138, 0.22), 0 10px 20px rgba(140, 128, 110, 0.22), 0 2px 4px rgba(0, 0, 0, 0.06)',
		'--go-shadow-soft':
			'inset 3px 3px 6px rgba(255, 255, 255, 0.88), inset -3px -4px 8px rgba(166, 154, 138, 0.16), 0 6px 14px rgba(140, 128, 110, 0.16)',
		'--go-radius': '24px',
		'--go-font-ui':
			'"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
		'--go-font-display':
			'"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
		'--go-font-body':
			'"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
		'--go-screen-bg': 'linear-gradient(180deg, #f4efe6, #e8dfd2)',
		'--go-screen-overlay': 'none',
		'--go-static-opacity': '0',

		// Clay design-system tokens
		'--clay-bg': '#efe8dc',
		'--clay-surface': '#f7f3ec',
		'--clay-surface-2': '#efe6d8',
		'--clay-surface-soft': '#f4efe6',
		'--clay-surface-sage': '#dce8e4',
		'--clay-gradient': 'linear-gradient(145deg, #fbf8f2, #efe6d8)',
		'--clay-button-gradient': 'linear-gradient(180deg, #fbf8f2, #ece3d6)',
		'--clay-accent-gradient': 'linear-gradient(180deg, #6ac9c1, #4aa8a0)',
		'--clay-progress-gradient': 'linear-gradient(90deg, #7ad4cc, #3fa39a)',
		'--clay-highlight': 'rgba(255, 255, 255, 0.92)',
		'--clay-shadow-light': 'rgba(255, 255, 255, 0.85)',
		'--clay-shadow-dark': 'rgba(140, 128, 110, 0.28)',
		'--clay-radius-small': '14px',
		'--clay-radius': '24px',
		'--clay-radius-large': '36px',
		'--clay-shadow':
			'inset 4px 4px 8px rgba(255, 255, 255, 0.92), inset -5px -6px 12px rgba(166, 154, 138, 0.22), 0 10px 20px rgba(140, 128, 110, 0.22), 0 2px 4px rgba(0, 0, 0, 0.06)',
		'--clay-shadow-hover':
			'inset 4px 4px 8px rgba(255, 255, 255, 0.95), inset -5px -6px 12px rgba(166, 154, 138, 0.18), 0 14px 26px rgba(140, 128, 110, 0.26)',
		'--clay-shadow-pressed':
			'inset 6px 7px 12px rgba(166, 154, 138, 0.28), inset -2px -2px 6px rgba(255, 255, 255, 0.7)',
		'--clay-raised':
			'inset 4px 4px 8px rgba(255, 255, 255, 0.92), inset -5px -6px 12px rgba(166, 154, 138, 0.22), 0 10px 20px rgba(140, 128, 110, 0.22), 0 2px 4px rgba(0, 0, 0, 0.06)',
		'--clay-raised-soft':
			'inset 3px 3px 6px rgba(255, 255, 255, 0.88), inset -3px -4px 8px rgba(166, 154, 138, 0.16), 0 6px 14px rgba(140, 128, 110, 0.16)',
		'--clay-raised-strong':
			'inset 4px 4px 8px rgba(255, 255, 255, 0.92), inset -5px -6px 12px rgba(166, 154, 138, 0.22), 0 14px 28px rgba(140, 128, 110, 0.26)',
		'--clay-recessed':
			'inset 5px 6px 12px rgba(166, 154, 138, 0.28), inset -3px -3px 8px rgba(255, 255, 255, 0.75)',
		'--clay-recessed-soft':
			'inset 3px 4px 8px rgba(166, 154, 138, 0.2), inset -2px -2px 6px rgba(255, 255, 255, 0.7)',
		'--clay-pressed':
			'inset 6px 7px 12px rgba(166, 154, 138, 0.28), inset -2px -2px 6px rgba(255, 255, 255, 0.7)',
		'--clay-accent': '#5bb8b0',
		'--clay-accent-deep': '#3fa39a',
		'--clay-accent-shadow':
			'0 10px 18px rgba(74, 168, 160, 0.32), inset 2px 2px 4px rgba(255, 255, 255, 0.45), inset -2px -3px 5px rgba(0, 80, 70, 0.12)',
		'--clay-sage': '#5bb8b0',
		'--clay-text': '#3a342c',
		'--clay-text-strong': '#2c2722',
		'--clay-text-light': '#8a8278',
		'--clay-muted': '#8a8278',
		'--clay-dark': 'rgba(140, 128, 110, 0.28)',
		'--clay-light': 'rgba(255, 255, 255, 0.92)',

		'--pixel-bg': '#efe8dc',
		'--pixel-panel': '#f7f3ec',
		'--pixel-panel-alt': '#efe6d8',
		'--pixel-border-dark': 'rgba(255, 255, 255, 0.55)',
		'--pixel-border-light': 'rgba(255, 255, 255, 0.55)',
		'--pixel-accent': '#5bb8b0',
		'--pixel-highlight': '#5bb8b0',
		'--pixel-text': '#3a342c',
		'--pixel-muted': '#8a8278',
		'--pixel-shadow':
			'inset 4px 4px 8px rgba(255, 255, 255, 0.92), inset -5px -6px 12px rgba(166, 154, 138, 0.22), 0 10px 20px rgba(140, 128, 110, 0.22)',
		'--pixel-shadow-pressed':
			'inset 6px 7px 12px rgba(166, 154, 138, 0.28), inset -2px -2px 6px rgba(255, 255, 255, 0.7)',
		'--pixel-card-radius': '24px',

		'--gamify-journey-gold': '#5bb8b0',
		'--gamify-journey-border': 'transparent',
		'--gamify-journey-hub-bg': '#efe8dc',
		'--gamify-scene-border': 'transparent',

		'--gamify-guild-border': 'transparent',
		'--gamify-guild-frame': '#5bb8b0',
		'--gamify-guild-bg': '#efe8dc',
		'--gamify-guild-panel': '#f7f3ec',

		'--gamify-boss-bg': '#efe8dc',
		'--gamify-boss-nav-bg': '#f7f3ec',
		'--gamify-boss-text': '#3a342c',
		'--gamify-boss-muted': '#8a8278',

		'--gamify-gate-border': 'transparent',
		'--gamify-gate-border-strong': 'transparent',
		'--gamify-gate-bg': 'linear-gradient(180deg, #f4efe6, #e8dfd2)',
		'--gamify-gate-card-bg': '#f7f3ec',
		'--gamify-gate-card-border': 'rgba(255, 255, 255, 0.55)',
		'--gamify-gate-text': '#3a342c',
		'--gamify-gate-muted': '#8a8278',
		'--gamify-gate-accent': '#5bb8b0',
		'--gamify-gate-highlight': '#5bb8b0',
		'--gamify-gate-glow': '0 10px 20px rgba(140, 128, 110, 0.22)',
		'--gamify-gate-banner-bg': '#efe8dc',

		'--gamification-primary': '#5bb8b0',
		'--gamification-secondary': '#3fa39a',

		'--system-bg': '#efe8dc',
		'--system-panel-bg': '#f7f3ec',
		'--system-panel-bg-strong': '#f4efe6',
		'--system-border': 'rgba(255, 255, 255, 0.55)',
		'--system-accent': '#5bb8b0',
		'--system-gold': '#5bb8b0',
		'--system-green': '#5bb8b0',
		'--system-glow': 'transparent',
		'--system-text': '#3a342c',
		'--system-text-bright': '#2c2722',
		'--system-muted': '#8a8278',
		'--system-font-ui':
			'"Nunito", "Segoe UI", "Avenir Next", system-ui, -apple-system, sans-serif',
	},
};
