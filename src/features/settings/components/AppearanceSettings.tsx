import React, { useState, useEffect } from 'react';
import { GamificationPluginSettings } from '../../../core/settings';
import { theming, getAvailablePalettes, getAccessibilityPalettes } from '../../../shared/utils/theming';
import { i18n, getAvailableLocales } from '../../../shared/utils/i18n';
import { applyVisualTheme, getVisualThemePresets } from '../../../shared/utils/visualThemeManager';
import { emitSettingsUpdated } from '../../../shared/utils/settingsEvents';
import type { VisualThemePresetId, VisualCeremonyLevel } from '../../../shared/themes/types';
import { DEFAULT_VISUAL_THEME_SETTINGS } from '../../../shared/themes/types';
import './AppearanceSettings.css';

interface AppearanceSettingsProps {
  settings: GamificationPluginSettings;
  onSettingsChange: (newSettings: Partial<GamificationPluginSettings>) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  settings,
  onSettingsChange
}) => {
  const [activeTab, setActiveTab] = useState<'theming' | 'i18n'>('theming');
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

  // Initialize theming and i18n with current settings
  useEffect(() => {
    if (settings.theming) {
      theming.setTheme(settings.theming);
    }
    if (settings.internationalization?.locale) {
      i18n.setLocale(settings.internationalization.locale);
    }
    applyVisualTheme(settings);
  }, [settings]);

  const handleThemingChange = (key: string, value: any) => {
    const newTheming = {
      ...settings.theming,
      [key]: value
    } as any;
    
    onSettingsChange({ theming: newTheming });
    theming.setTheme(newTheming);
  };

  const handleI18nChange = (key: string, value: any) => {
    const newI18n = {
      ...settings.internationalization,
      [key]: value
    } as any;
    
    onSettingsChange({ internationalization: newI18n });
    
    if (key === 'locale') {
      i18n.setLocale(value);
    }
  };

  const handleAccessibilityChange = (key: string, value: boolean) => {
    const newAccessibility = {
      ...settings.theming?.accessibility,
      [key]: value
    };
    
    handleThemingChange('accessibility', newAccessibility);
  };

  const availablePalettes = getAvailablePalettes();
  const accessibilityPalettes = getAccessibilityPalettes();
  const availableLocales = getAvailableLocales();
  const visualThemePresets = getVisualThemePresets();
  const activeVisualPreset = settings.visualTheme?.preset ?? DEFAULT_VISUAL_THEME_SETTINGS.preset;

  const handleVisualThemeChange = (presetId: VisualThemePresetId) => {
    const preset = visualThemePresets.find((p) => p.id === presetId);
    if (!preset?.available) return;

    const visualTheme = {
      ...DEFAULT_VISUAL_THEME_SETTINGS,
      ...(settings.visualTheme ?? {}),
      preset: presetId,
    };

    onSettingsChange({ visualTheme });
    applyVisualTheme({ ...settings, visualTheme });
    emitSettingsUpdated();
  };

  const handleCeremonyLevelChange = (ceremonyLevel: VisualCeremonyLevel) => {
    const visualTheme = {
      ...DEFAULT_VISUAL_THEME_SETTINGS,
      ...(settings.visualTheme ?? {}),
      ceremonyLevel,
    };
    onSettingsChange({ visualTheme });
  };

  return (
    <div className="appearance-settings">
      <div className="settings-header">
        <h2>🎨 Appearance & Localization</h2>
        <p>Customize the look and feel of your gamification experience</p>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'theming' ? 'active' : ''}`}
          onClick={() => setActiveTab('theming')}
        >
          🎨 Theming
        </button>
        <button
          className={`tab-button ${activeTab === 'i18n' ? 'active' : ''}`}
          onClick={() => setActiveTab('i18n')}
        >
          🌍 Internationalization
        </button>
      </div>

      {activeTab === 'theming' && (
        <div className="theming-settings">
          <div className="settings-section">
            <h3>Gameplay Visual Theme</h3>
            <p className="settings-section-hint">
              Classic keeps the original look. Solo Leveling styles Player, Quests, Journey, and notices (Dungeon stays pixel). Clay is a soft-card preview on the Player tab first — other tabs stay Classic-like until expanded.
            </p>
            <div className="palette-grid palette-grid-visual-themes">
              {visualThemePresets.map((preset) => {
                const selected = activeVisualPreset === preset.id;
                const disabled = !preset.available;
                return (
                  <div
                    key={preset.id}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    className={`palette-option palette-option-visual palette-option-${preset.id} ${selected ? 'selected' : ''} ${disabled ? 'palette-option-disabled' : ''}`}
                    onClick={() => !disabled && handleVisualThemeChange(preset.id)}
                    onKeyDown={(e) => {
                      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleVisualThemeChange(preset.id);
                      }
                    }}
                    aria-pressed={selected}
                    aria-disabled={disabled}
                  >
                    <div className="palette-option-top">
                      <div className="palette-preview">
                        <div
                          className="color-swatch"
                          style={{
                            backgroundColor: preset.tokens['--go-bg'] ?? preset.tokens['--pixel-bg'] ?? '#1b1d2f',
                          }}
                        />
                        <div
                          className="color-swatch"
                          style={{
                            backgroundColor: preset.tokens['--go-accent'] ?? preset.tokens['--pixel-accent'] ?? '#8ecae6',
                          }}
                        />
                        <div
                          className="color-swatch"
                          style={{ backgroundColor: preset.tokens['--go-gold'] ?? preset.tokens['--pixel-highlight'] ?? '#ffd166' }}
                        />
                        <div
                          className="color-swatch"
                          style={{ backgroundColor: preset.tokens['--go-panel'] ?? preset.tokens['--pixel-panel'] ?? '#252742' }}
                        />
                      </div>
                      {selected && <span className="palette-active-badge">✓ Active</span>}
                    </div>
                    <div className="palette-info">
                      <div className="palette-name">
                        {preset.name}
                        {disabled ? ' (coming soon)' : ''}
                      </div>
                      <div className="palette-description">{preset.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="visual-theme-preview" aria-label="Theme contract preview">
              <div className="visual-theme-preview-header">
                <span className="visual-theme-preview-kicker">Contract preview</span>
                <strong>{visualThemePresets.find((preset) => preset.id === activeVisualPreset)?.name ?? 'Current theme'}</strong>
              </div>
              <div className="visual-theme-preview-panel">
                <div className="visual-theme-preview-card">
                  <span className="visual-theme-preview-label">Panel</span>
                  <span className="visual-theme-preview-title">System Frame</span>
                  <p>Uses bg, panel, text, muted, border, accent, and gold tokens.</p>
                </div>
                <button type="button" className="visual-theme-preview-button">
                  Sample Button
                </button>
                <div className="visual-theme-preview-resource">
                  <div className="visual-theme-preview-resource-head">
                    <span>CP</span>
                    <span>942/2500</span>
                  </div>
                  <div className="visual-theme-preview-track visual-theme-preview-track-cp">
                    <span style={{ width: '38%' }} />
                  </div>
                </div>
                <div className="visual-theme-preview-resource">
                  <div className="visual-theme-preview-resource-head">
                    <span>EXP</span>
                    <span>14358/17000</span>
                  </div>
                  <div className="visual-theme-preview-track visual-theme-preview-track-exp">
                    <span style={{ width: '84%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Growth Ceremonies</h3>
            <p className="settings-section-hint">
              Level-up and rank-up feedback. Rank promotions always use a ceremony modal when not Off.
            </p>
            <div className="theme-mode-options">
              {(['off', 'minimal', 'full'] as VisualCeremonyLevel[]).map((level) => (
                <label key={level} className="radio-option">
                  <input
                    type="radio"
                    name="ceremonyLevel"
                    value={level}
                    checked={(settings.visualTheme?.ceremonyLevel ?? 'minimal') === level}
                    onChange={() => handleCeremonyLevelChange(level)}
                  />
                  <span>
                    {level === 'off' ? 'Off' : level === 'minimal' ? 'Minimal (recommended)' : 'Full modals'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h3>Theme Mode</h3>
            <div className="theme-mode-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="themeMode"
                  value="auto"
                  checked={settings.theming?.mode === 'auto'}
                  onChange={(e) => handleThemingChange('mode', e.target.value)}
                />
                <span>Auto (Follow Obsidian)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="themeMode"
                  value="light"
                  checked={settings.theming?.mode === 'light'}
                  onChange={(e) => handleThemingChange('mode', e.target.value)}
                />
                <span>Light Mode</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="themeMode"
                  value="dark"
                  checked={settings.theming?.mode === 'dark'}
                  onChange={(e) => handleThemingChange('mode', e.target.value)}
                />
                <span>Dark Mode</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Accent Color</h3>
            <div className="color-picker-container">
              <input
                type="color"
                value={settings.theming?.accentColor || '#667eea'}
                onChange={(e) => handleThemingChange('accentColor', e.target.value)}
                className="color-picker"
              />
              <span className="color-value">{settings.theming?.accentColor || '#667eea'}</span>
            </div>
          </div>

          <div className="settings-section">
            <h3>Color Palette</h3>
            <div className="palette-grid">
              {availablePalettes.map((palette) => (
                <div
                  key={palette.name}
                  className={`palette-option ${settings.theming?.colorPalette === palette.name.toLowerCase() ? 'selected' : ''}`}
                  onClick={() => handleThemingChange('colorPalette', palette.name.toLowerCase())}
                >
                  <div className="palette-preview">
                    <div className="color-swatch" style={{ backgroundColor: palette.colors.primary }}></div>
                    <div className="color-swatch" style={{ backgroundColor: palette.colors.secondary }}></div>
                    <div className="color-swatch" style={{ backgroundColor: palette.colors.success }}></div>
                    <div className="color-swatch" style={{ backgroundColor: palette.colors.warning }}></div>
                    <div className="color-swatch" style={{ backgroundColor: palette.colors.error }}></div>
                  </div>
                  <div className="palette-info">
                    <div className="palette-name">{palette.name}</div>
                    <div className="palette-description">{palette.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <h3>Accessibility</h3>
            <div className="accessibility-options">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={settings.theming?.accessibility?.colorBlindFriendly || false}
                  onChange={(e) => handleAccessibilityChange('colorBlindFriendly', e.target.checked)}
                />
                <span>Color-blind friendly palette</span>
              </label>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={settings.theming?.accessibility?.highContrast || false}
                  onChange={(e) => handleAccessibilityChange('highContrast', e.target.checked)}
                />
                <span>High contrast mode</span>
              </label>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={settings.theming?.accessibility?.reducedMotion || false}
                  onChange={(e) => handleAccessibilityChange('reducedMotion', e.target.checked)}
                />
                <span>Reduce motion (respects system preference)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'i18n' && (
        <div className="i18n-settings">
          <div className="settings-section">
            <h3>Language & Region</h3>
            <div className="locale-selector">
              <label htmlFor="locale-select">Language:</label>
              <select
                id="locale-select"
                value={settings.internationalization?.locale || 'en-US'}
                onChange={(e) => handleI18nChange('locale', e.target.value)}
              >
                {availableLocales.map((locale: string) => (
                  <option key={locale} value={locale}>
                    {i18n.getLocaleDisplayName(locale)} ({locale})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>Date & Time Formatting</h3>
            <div className="format-options">
              <div className="format-group">
                <label htmlFor="date-format">Date Format:</label>
                <select
                  id="date-format"
                  value={settings.internationalization?.dateFormat || 'short'}
                  onChange={(e) => handleI18nChange('dateFormat', e.target.value)}
                >
                  <option value="short">Short (12/25/2024)</option>
                  <option value="medium">Medium (Dec 25, 2024)</option>
                  <option value="long">Long (December 25, 2024)</option>
                  <option value="full">Full (Wednesday, December 25, 2024)</option>
                </select>
              </div>
              
              <div className="format-group">
                <label htmlFor="time-format">Time Format:</label>
                <select
                  id="time-format"
                  value={settings.internationalization?.timeFormat || 'short'}
                  onChange={(e) => handleI18nChange('timeFormat', e.target.value)}
                >
                  <option value="short">Short (3:30 PM)</option>
                  <option value="medium">Medium (3:30:45 PM)</option>
                  <option value="long">Long (3:30:45 PM EST)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Number Formatting</h3>
            <div className="format-options">
              <div className="format-group">
                <label htmlFor="number-format">Number Format:</label>
                <select
                  id="number-format"
                  value={settings.internationalization?.numberFormat || 'standard'}
                  onChange={(e) => handleI18nChange('numberFormat', e.target.value)}
                >
                  <option value="standard">Standard (1,234.56)</option>
                  <option value="scientific">Scientific (1.23E+3)</option>
                  <option value="engineering">Engineering (1.234E+3)</option>
                </select>
              </div>
              
              <div className="format-group">
                <label htmlFor="currency-format">Currency Format:</label>
                <select
                  id="currency-format"
                  value={settings.internationalization?.currencyFormat || 'standard'}
                  onChange={(e) => handleI18nChange('currencyFormat', e.target.value)}
                >
                  <option value="standard">Standard ($1,234)</option>
                  <option value="accounting">Accounting ($1,234.00)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Preview</h3>
            <div className="format-preview">
              <div className="preview-item">
                <strong>Date:</strong> {i18n.formatDate(new Date())}
              </div>
              <div className="preview-item">
                <strong>Time:</strong> {i18n.formatTime(new Date())}
              </div>
              <div className="preview-item">
                <strong>Number:</strong> {i18n.formatNumber(1234.56)}
              </div>
              <div className="preview-item">
                <strong>Currency:</strong> {i18n.formatCurrency(1234, 'USD')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
