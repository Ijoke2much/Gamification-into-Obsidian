import type { GamificationPluginSettings } from '../../core/settings';
import {
	DEFAULT_VISUAL_THEME_SETTINGS,
	type ResolvedVisualTheme,
	type VisualThemePresetId,
	type VisualThemeSettings,
	type VisualThemeTokens,
} from '../themes/types';
import { CLASSIC_PRESET, getVisualThemePreset, VISUAL_THEME_PRESET_LIST } from '../themes/presets';

const STYLE_ELEMENT_ID = 'gamification-visual-theme-vars';

const TOKEN_SCOPES = [
	':root',
	'[data-gamification-plugin]',
	'[data-gamification-theme-root]',
	'.gamification-plugin',
].join(',\n');

class VisualThemeManager {
	private resolved: ResolvedVisualTheme = this.buildResolved(DEFAULT_VISUAL_THEME_SETTINGS);

	resolve(settings?: Partial<GamificationPluginSettings> | null): ResolvedVisualTheme {
		return this.buildResolved(settings?.visualTheme);
	}

	getResolved(): ResolvedVisualTheme {
		return this.resolved;
	}

	getPresetList() {
		return VISUAL_THEME_PRESET_LIST;
	}

	apply(settings?: Partial<GamificationPluginSettings> | null): ResolvedVisualTheme {
		this.resolved = this.buildResolved(settings?.visualTheme);
		this.injectStyles(this.resolved);
		this.applyDocumentAttributes(this.resolved);
		return this.resolved;
	}

	private buildResolved(raw?: Partial<VisualThemeSettings> | null): ResolvedVisualTheme {
		const merged: VisualThemeSettings = {
			...DEFAULT_VISUAL_THEME_SETTINGS,
			...(raw ?? {}),
		};

		let presetId: VisualThemePresetId = merged.preset ?? 'classic';
		let preset = getVisualThemePreset(presetId);

		if (!preset.available) {
			presetId = 'classic';
			preset = CLASSIC_PRESET;
		}

		const tokens: VisualThemeTokens = {
			...preset.tokens,
		};

		if (merged.overrides) {
			for (const [key, value] of Object.entries(merged.overrides)) {
				if (value !== undefined) {
					tokens[key] = value;
				}
			}
		}

		this.ensureThemeContract(tokens, preset.typography);

		return {
			preset: presetId,
			shell: preset.shell,
			ceremonyLevel: merged.ceremonyLevel ?? DEFAULT_VISUAL_THEME_SETTINGS.ceremonyLevel ?? 'minimal',
			tokens,
			typography: { ...preset.typography },
		};
	}

	private ensureThemeContract(
		tokens: VisualThemeTokens,
		typography: { ui: string; notices: string }
	): void {
		const ensure = (key: string, value: string): void => {
			if (tokens[key] === undefined) tokens[key] = value;
		};

		ensure('--go-bg', tokens['--system-bg'] ?? tokens['--pixel-bg'] ?? '#1b1d2f');
		ensure('--go-panel', tokens['--system-panel-bg'] ?? tokens['--pixel-panel'] ?? '#252742');
		ensure(
			'--go-panel-strong',
			tokens['--system-panel-bg-strong'] ?? tokens['--pixel-panel-alt'] ?? tokens['--go-panel']
		);
		ensure('--go-card', tokens['--go-panel']);
		ensure('--go-card-soft', tokens['--go-panel-strong']);
		ensure('--go-text', tokens['--system-text'] ?? tokens['--pixel-text'] ?? '#ecefff');
		ensure(
			'--go-text-bright',
			tokens['--system-text-bright'] ?? tokens['--go-text'] ?? '#ffffff'
		);
		ensure('--go-muted', tokens['--system-muted'] ?? tokens['--pixel-muted'] ?? '#bac2e3');
		ensure('--go-border', tokens['--system-border'] ?? tokens['--pixel-border-light'] ?? '#5b61a2');
		ensure('--go-border-strong', tokens['--pixel-accent'] ?? tokens['--go-border']);
		ensure('--go-accent', tokens['--system-accent'] ?? tokens['--pixel-accent'] ?? '#8ecae6');
		ensure('--go-accent-soft', `color-mix(in srgb, ${tokens['--go-accent']} 20%, transparent)`);
		ensure('--go-gold', tokens['--system-gold'] ?? tokens['--pixel-highlight'] ?? '#ffd166');
		ensure('--go-progress-fill', tokens['--go-accent']);
		ensure('--go-progress-fill-strong', tokens['--go-gold']);
		ensure('--go-progress-glow', `color-mix(in srgb, ${tokens['--go-progress-fill']} 45%, transparent)`);
		ensure('--go-progress-track', tokens['--go-panel-strong']);
		ensure('--go-cp-progress-fill', tokens['--go-progress-fill']);
		ensure('--go-cp-progress-fill-strong', tokens['--go-progress-fill-strong']);
		ensure('--go-cp-progress-glow', tokens['--go-progress-glow']);
		ensure('--go-exp-progress-fill', tokens['--go-text-bright']);
		ensure('--go-exp-progress-fill-strong', tokens['--go-text']);
		ensure('--go-exp-progress-glow', `color-mix(in srgb, ${tokens['--go-text-bright']} 42%, transparent)`);
		ensure('--go-exp-text', tokens['--go-text-bright']);
		ensure('--go-success', tokens['--system-green'] ?? '#66d28b');
		ensure('--go-danger', '#ff6b6b');
		ensure('--go-warning', tokens['--go-gold']);
		ensure('--go-shadow', tokens['--system-glow'] ?? tokens['--pixel-shadow'] ?? 'none');
		ensure('--go-shadow-soft', tokens['--pixel-shadow-pressed'] ?? tokens['--go-shadow']);
		ensure('--go-radius', tokens['--pixel-card-radius'] ?? '0');
		ensure('--go-font-ui', typography.ui);
		ensure('--go-font-display', typography.ui);
		ensure('--go-font-body', typography.notices);
		ensure('--go-screen-bg', `linear-gradient(180deg, ${tokens['--go-panel']}, ${tokens['--go-bg']})`);
		ensure('--go-screen-overlay', 'none');
		ensure('--go-static-opacity', '0');

		// Legacy aliases for surfaces not migrated to the semantic contract yet.
		ensure('--pixel-bg', 'var(--go-bg)');
		ensure('--pixel-panel', 'var(--go-panel)');
		ensure('--pixel-panel-alt', 'var(--go-panel-strong)');
		ensure('--pixel-border-dark', tokens['--go-bg'] ?? '#0f1120');
		ensure('--pixel-border-light', 'var(--go-border)');
		ensure('--pixel-accent', 'var(--go-accent)');
		ensure('--pixel-highlight', 'var(--go-gold)');
		ensure('--pixel-text', 'var(--go-text)');
		ensure('--pixel-muted', 'var(--go-muted)');
		ensure('--pixel-shadow', 'var(--go-shadow)');
		ensure('--pixel-shadow-pressed', 'var(--go-shadow-soft)');
		ensure('--pixel-card-radius', 'var(--go-radius)');

		ensure('--system-bg', 'var(--go-bg)');
		ensure('--system-panel-bg', 'var(--go-panel)');
		ensure('--system-panel-bg-strong', 'var(--go-panel-strong)');
		ensure('--system-border', 'var(--go-border)');
		ensure('--system-accent', 'var(--go-accent)');
		ensure('--system-gold', 'var(--go-gold)');
		ensure('--system-green', 'var(--go-success)');
		ensure('--system-glow', 'var(--go-shadow)');
		ensure('--system-text', 'var(--go-text)');
		ensure('--system-text-bright', 'var(--go-text-bright)');
		ensure('--system-muted', 'var(--go-muted)');
		ensure('--system-font-ui', 'var(--go-font-ui)');
	}

	private injectStyles(resolved: ResolvedVisualTheme): void {
		if (typeof document === 'undefined') return;

		let styleElement = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
		if (!styleElement) {
			styleElement = document.createElement('style');
			styleElement.id = STYLE_ELEMENT_ID;
			document.head.appendChild(styleElement);
		}

		const tokenLines = Object.entries(resolved.tokens)
			.map(([key, value]) => `  ${key}: ${value};`)
			.join('\n');

		const typographyLines = `
  --gamify-font-ui: ${resolved.typography.ui};
  --gamify-font-notices: ${resolved.typography.notices};
  font-family: ${resolved.typography.ui};`;

		styleElement.textContent = `
${TOKEN_SCOPES} {
${tokenLines}
${typographyLines}
}

.notice-container .notice .gamification-pixel-notice,
.notice-container .notice .gamification-mc-notice {
${tokenLines}
  font-family: ${resolved.typography.notices} !important;
}
`;
	}

	private applyDocumentAttributes(resolved: ResolvedVisualTheme): void {
		if (typeof document === 'undefined') return;

		document.documentElement.setAttribute('data-gamification-visual-theme', resolved.preset);
		document.documentElement.setAttribute('data-gamification-shell', resolved.shell);

		document.querySelectorAll<HTMLElement>('[data-gamification-plugin], [data-gamification-theme-root]').forEach((el) => {
			el.setAttribute('data-gamification-visual-theme', resolved.preset);
			if (el.hasAttribute('data-gamification-pixel-enclave')) {
				el.setAttribute('data-gamification-shell', 'pixel');
			} else {
				el.setAttribute('data-gamification-shell', resolved.shell);
			}
		});
	}
}

export const visualThemeManager = new VisualThemeManager();

export function applyVisualTheme(settings?: Partial<GamificationPluginSettings> | null): ResolvedVisualTheme {
	return visualThemeManager.apply(settings);
}

export function resolveVisualTheme(settings?: Partial<GamificationPluginSettings> | null): ResolvedVisualTheme {
	return visualThemeManager.resolve(settings);
}

export function getAppliedVisualTheme(): ResolvedVisualTheme {
	return visualThemeManager.getResolved();
}

export function getVisualThemePresets() {
	return visualThemeManager.getPresetList();
}

/** Normalize settings on load — existing installs without visualTheme get Classic. */
export function migrateVisualThemeSettings(
	loaded: Partial<GamificationPluginSettings> | null | undefined
): VisualThemeSettings {
	if (!loaded?.visualTheme?.preset) {
		return { ...DEFAULT_VISUAL_THEME_SETTINGS };
	}

	return {
		...DEFAULT_VISUAL_THEME_SETTINGS,
		...loaded.visualTheme,
	};
}
