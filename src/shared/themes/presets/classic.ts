import type { VisualThemePreset } from '../types';

/**
 * Classic (Vault Default) — snapshot of the original plugin pixel/RPG look.
 * Default for all existing and new installs until another preset is chosen.
 */
export const CLASSIC_PRESET: VisualThemePreset = {
	id: 'classic',
	name: 'Classic (current default)',
	description:
		'The original pixel vault look: navy panels, cyan accents, gold highlights, and Press Start 2P typography.',
	available: true,
	shell: 'pixel',
	typography: {
		ui: '"Press Start 2P", "VT323", "Courier New", monospace',
		notices: '"VT323", "Courier New", monospace',
	},
	tokens: {
		// Semantic theme contract (new surfaces should prefer --go-*).
		'--go-bg': '#1b1d2f',
		'--go-panel': '#252742',
		'--go-panel-strong': '#2e3152',
		'--go-card': '#252742',
		'--go-card-soft': '#2e3152',
		'--go-text': '#ecefff',
		'--go-text-bright': '#ffffff',
		'--go-muted': '#bac2e3',
		'--go-border': '#5b61a2',
		'--go-border-strong': '#8ecae6',
		'--go-accent': '#8ecae6',
		'--go-accent-soft': 'rgba(142, 202, 230, 0.18)',
		'--go-gold': '#ffd166',
		'--go-progress-fill': '#8ecae6',
		'--go-progress-fill-strong': '#ffd166',
		'--go-progress-glow': 'rgba(142, 202, 230, 0.35)',
		'--go-progress-track': '#2e3152',
		'--go-cp-progress-fill': '#8ecae6',
		'--go-cp-progress-fill-strong': '#ffd166',
		'--go-cp-progress-glow': 'rgba(142, 202, 230, 0.35)',
		'--go-exp-progress-fill': '#ffffff',
		'--go-exp-progress-fill-strong': '#dce7ff',
		'--go-exp-progress-glow': 'rgba(255, 255, 255, 0.36)',
		'--go-exp-text': '#ffffff',
		'--go-success': '#66d28b',
		'--go-danger': '#ff6b6b',
		'--go-warning': '#ffd45a',
		'--go-shadow': '3px 3px 0 #0f1120',
		'--go-shadow-soft': '1px 1px 0 #0f1120',
		'--go-radius': '0',
		'--go-font-ui': '"Press Start 2P", "VT323", "Courier New", monospace',
		'--go-font-display': '"Press Start 2P", "VT323", "Courier New", monospace',
		'--go-font-body': '"VT323", "Courier New", monospace',
		'--go-screen-bg': 'linear-gradient(180deg, #252742, #1b1d2f)',
		'--go-screen-overlay': 'none',
		'--go-static-opacity': '0',

		// Core pixel RPG tokens (Player tab, quests, habits, notices)
		'--pixel-bg': '#1b1d2f',
		'--pixel-panel': '#252742',
		'--pixel-panel-alt': '#2e3152',
		'--pixel-border-dark': '#0f1120',
		'--pixel-border-light': '#5b61a2',
		'--pixel-accent': '#8ecae6',
		'--pixel-highlight': '#ffd166',
		'--pixel-text': '#ecefff',
		'--pixel-muted': '#bac2e3',
		'--pixel-shadow': '3px 3px 0 #0f1120',
		'--pixel-shadow-pressed': '1px 1px 0 #0f1120',
		'--pixel-card-radius': '0',

		// Journey / rank / guild accents
		'--gamify-journey-gold': '#ffd700',
		'--gamify-journey-border': '#333333',
		'--gamify-journey-hub-bg': '#1a1f35',
		'--gamify-scene-border': '#c6c6c6',

		// Projects guild board
		'--gamify-guild-border': '#8a6d3b',
		'--gamify-guild-frame': '#c9a45c',
		'--gamify-guild-bg': '#0e1226',
		'--gamify-guild-panel': '#141a33',

		// Boss hub shell
		'--gamify-boss-bg': '#0d1020',
		'--gamify-boss-nav-bg': '#1a1f35',
		'--gamify-boss-text': '#e8e8f0',
		'--gamify-boss-muted': '#8892b0',

		'--gamify-gate-border': '#5b61a2',
		'--gamify-gate-border-strong': '#8ecae6',
		'--gamify-gate-bg': 'linear-gradient(180deg, #252742, #1b1d2f)',
		'--gamify-gate-card-bg': '#2e3152',
		'--gamify-gate-card-border': '#5b61a2',
		'--gamify-gate-text': '#ecefff',
		'--gamify-gate-muted': '#bac2e3',
		'--gamify-gate-accent': '#8ecae6',
		'--gamify-gate-highlight': '#ffd166',
		'--gamify-gate-glow': '3px 3px 0 #0f1120',
		'--gamify-gate-banner-bg': 'linear-gradient(180deg, #2e3152, #252742)',

		// Generic gamification palette (non-pixel surfaces)
		'--gamification-primary': '#667eea',
		'--gamification-secondary': '#764ba2',
	},
};
