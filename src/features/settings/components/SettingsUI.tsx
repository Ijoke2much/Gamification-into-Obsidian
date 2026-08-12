import React, { useState, useEffect, useMemo } from 'react';
import { 
  GamificationPluginSettings, 
  validateSettings, 
  SETTINGS_PRESETS, 
  SettingsPreset,
  SETTINGS_GROUPS,
  DEFAULT_SETTINGS,
  BALANCED_GAMEPLAY_MODULES,
  DEFAULT_GAMEPLAY_MODULES,
  HARDCORE_GAMEPLAY_MODULES,
  LITE_GAMEPLAY_MODULES,
  type GamificationModules,
  type NotificationLevel,
  type EnergyHudMode,
} from '../../../core/settings';
import { Card } from '../../../shared/components/ui/Card';
import { TutorialSettingsPanel } from '../../tutorial/components/TutorialSettingsPanel';
import { AppearanceSettings } from './AppearanceSettings';
import { updatePlayerData } from '../../player/utils/playerDataUtils';
import { listPlayerDataBackups, restorePlayerDataBackup } from '../../player/utils/playerDataUtils';
import { DEFAULT_PLAYER } from '../../../data/models/PlayerData';
import type { App } from 'obsidian';
import { TFile, TFolder } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import styles from './SettingsUI.module.css';
import { GameDataHubPanel } from './GameDataHubPanel';
import { GameplayOnboardingModal } from './GameplayOnboardingModal';
import { areSettingsEqual } from '../../../shared/utils/settingsSnapshot';
import type { GameplayProfile } from '../../../core/settings';

interface SettingsUIProps {
  settings: GamificationPluginSettings;
  onSettingsChange: (settings: GamificationPluginSettings) => void;
  onSave: () => Promise<void>;
  app?: App; // Obsidian App instance for file operations
  plugin?: GamifiedObsidianPlugin;
}

type ViewMode = 'groups' | 'category';

export const SettingsUI: React.FC<SettingsUIProps> = ({
  settings: settingsFromPlugin,
  onSettingsChange,
  onSave,
  app,
  plugin,
}) => {
  // Local state so controls re-render when toggled (parent only mutates plugin.settings).
  const [settings, setSettings] = useState(settingsFromPlugin);
  const [savedSettings, setSavedSettings] = useState(settingsFromPlugin);

  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [validation, setValidation] = useState(validateSettings(settingsFromPlugin));
  const [isSaving, setIsSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showPreviews, setShowPreviews] = useState(true);

  useEffect(() => {
    setSettings(settingsFromPlugin);
    setSavedSettings(settingsFromPlugin);
  }, [settingsFromPlugin]);

  const isDirty = useMemo(
    () => !areSettingsEqual(settings, savedSettings),
    [settings, savedSettings]
  );

  const showOnboarding = settings.gameplayOnboardingComplete !== true;

  // Update validation when settings change
  useEffect(() => {
    setValidation(validateSettings(settings));
  }, [settings]);

  // Handle setting changes
  const updateSetting = (path: string, value: unknown) => {
    const newSettings = { ...settings } as unknown as Record<string, unknown>;
    const keys = path.split('.');
    let current: Record<string, unknown> = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const next = current[keys[i]];
      if (typeof next !== 'object' || next === null) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }
    
    current[keys[keys.length - 1]] = value;
    const next = newSettings as unknown as GamificationPluginSettings;
    setSettings(next);
    onSettingsChange(next);
  };

  const patchSettings = (patch: Partial<GamificationPluginSettings>) => {
    const merged = { ...settings, ...patch };
    if (patch.modules) {
      merged.modules = {
        ...BALANCED_GAMEPLAY_MODULES,
        ...settings.modules,
        ...patch.modules,
      };
    }
    setSettings(merged);
    onSettingsChange(merged);
  };

  // Apply preset
  const applyPreset = (preset: SettingsPreset) => {
    if (preset.name === "Safe Defaults") {
      const next = { ...DEFAULT_SETTINGS };
      setSettings(next);
      onSettingsChange(next);
    } else {
      const newSettings = { ...settings, ...preset.settings };
      if (preset.settings.modules) {
        newSettings.modules = {
          ...BALANCED_GAMEPLAY_MODULES,
          ...settings.modules,
          ...preset.settings.modules,
        };
      }
      setSettings(newSettings);
      onSettingsChange(newSettings);
    }
    setShowPresets(false);
  };

  const getProfileModules = (profile: GameplayProfile): GamificationModules => {
    if (profile === 'hardcore') return { ...HARDCORE_GAMEPLAY_MODULES };
    if (profile === 'lite') return { ...LITE_GAMEPLAY_MODULES };
    return { ...BALANCED_GAMEPLAY_MODULES };
  };

  const openGameModulesCategory = () => {
    setSelectedGroup('gameplay');
    setSelectedCategory('game-modules');
    setViewMode('category');
  };

  const applyOnboardingProfile = (profile: GameplayProfile): GamificationPluginSettings => {
    const merged: GamificationPluginSettings = {
      ...settings,
      gameplayProfile: profile,
      modules: getProfileModules(profile),
      gameplayOnboardingComplete: true,
      notificationLevel: profile === 'lite' ? 'quiet' : 'normal',
      preferQuickComplete: profile !== 'hardcore',
      energyHudMode: profile === 'hardcore' ? 'full' : 'simple',
    };
    setSettings(merged);
    onSettingsChange(merged);
    return merged;
  };

  const saveSettingsSnapshot = async (nextSettings: GamificationPluginSettings) => {
    const result = validateSettings(nextSettings);
    if (!result.isValid) {
      alert('Please fix validation errors before saving');
      return;
    }

    setSettings(nextSettings);
    onSettingsChange(nextSettings);
    setIsSaving(true);
    try {
      await onSave();
      setSavedSettings(nextSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOnboardingProfileSelect = async (profile: GameplayProfile) => {
    await saveSettingsSnapshot(applyOnboardingProfile(profile));
  };

  const handleOnboardingDismissBalanced = async () => {
    await saveSettingsSnapshot(applyOnboardingProfile('balanced'));
  };

  const handleOnboardingCustomize = () => {
    const merged: GamificationPluginSettings = {
      ...settings,
      gameplayOnboardingComplete: true,
    };
    setSettings(merged);
    onSettingsChange(merged);
    openGameModulesCategory();
  };

  // Save settings
  const handleSave = async () => {
    await saveSettingsSnapshot(settings);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const categoryMatchesSearch = (cat: { name: string; description: string; settings: string[] }) => {
    if (!normalizedSearch) return true;
    if (cat.name.toLowerCase().includes(normalizedSearch)) return true;
    if (cat.description.toLowerCase().includes(normalizedSearch)) return true;
    return cat.settings.some((key) => key.toLowerCase().includes(normalizedSearch));
  };

  // Filter groups based on search (name, description, categories, setting keys)
  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) return SETTINGS_GROUPS;
    return SETTINGS_GROUPS.filter(
      (group) =>
        group.name.toLowerCase().includes(normalizedSearch) ||
        group.description.toLowerCase().includes(normalizedSearch) ||
        group.categories.some(categoryMatchesSearch)
    );
  }, [normalizedSearch]);

  // Get current group and category
  const currentGroup = selectedGroup 
    ? SETTINGS_GROUPS.find(group => group.id === selectedGroup)
    : null;
  
  const currentCategory = selectedCategory 
    ? currentGroup?.categories.find(cat => cat.id === selectedCategory)
    : null;

  // Handle group selection (skip the category grid when there is only one)
  const handleGroupClick = (groupId: string) => {
    const group = SETTINGS_GROUPS.find((g) => g.id === groupId);
    setSelectedGroup(groupId);
    if (group && group.categories.length === 1) {
      setSelectedCategory(group.categories[0].id);
    } else {
      setSelectedCategory(null);
    }
    setViewMode('category');
  };

  // Handle category selection
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setViewMode('category');
  };

  // Go back to groups view
  const goBackToGroups = () => {
    setSelectedCategory(null);
    setSelectedGroup(null);
    setViewMode('groups');
  };

  // Go back to group categories view (or groups when the group has only one category)
  const goBackToGroupCategories = () => {
    if (currentGroup && currentGroup.categories.length === 1) {
      goBackToGroups();
      return;
    }
    setSelectedCategory(null);
    setViewMode('category');
  };

  // Render group cards
  const renderGroupCards = () => (
    <div className={styles.cardsContainer}>
      <div className={styles.cardsGrid}>
        {filteredGroups.map((group) => (
          <Card 
            key={group.id} 
            className={styles.categoryCard}
            onClick={() => handleGroupClick(group.id)}
          >
            <div 
              className={styles.cardHeader}
              style={{ borderLeftColor: group.color }}
            >
              <div className={styles.cardIcon}>{group.icon}</div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{group.name}</h3>
                <p className={styles.cardDescription}>{group.description}</p>
                <div className={styles.categoryCount}>
                  {group.categories.length} categories
                </div>
              </div>
              <div className={styles.cardArrow}>→</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // Render group categories
  const renderGroupCategories = () => {
    if (!currentGroup) return null;

    return (
      <div className={styles.groupCategories}>
        <div className={styles.groupHeader}>
          <button className={styles.backButton} onClick={goBackToGroups}>
            ← Back to Groups
          </button>
          <h2 className={styles.groupTitle}>
            {currentGroup.icon} {currentGroup.name}
          </h2>
          <p className={styles.groupDescription}>{currentGroup.description}</p>
        </div>

        <div className={styles.categoriesGrid}>
          {(normalizedSearch
            ? currentGroup.categories.filter(categoryMatchesSearch)
            : currentGroup.categories
          ).map((category) => (
            <Card 
              key={category.id} 
              className={styles.categoryCard}
              onClick={() => handleCategoryClick(category.id)}
            >
              <div 
                className={styles.cardHeader}
                style={{ borderLeftColor: category.color }}
              >
                <div className={styles.cardIcon}>{category.icon}</div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{category.name}</h3>
                  <p className={styles.cardDescription}>{category.description}</p>
                </div>
                <div className={styles.cardArrow}>→</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Render category settings
  const renderCategorySettings = () => {
    if (!currentCategory || !currentGroup) return null;

    const previewItems = showPreviews ? getSettingsPreview(currentCategory.id) : [];

    return (
      <div className={styles.categorySettings}>
        <div className={styles.categoryHeader}>
          <button className={styles.backButton} onClick={goBackToGroupCategories}>
            ← Back to {currentGroup.categories.length === 1 ? 'Groups' : currentGroup.name}
          </button>
          <h2 className={styles.categoryTitle}>
            {currentCategory.icon} {currentCategory.name}
          </h2>
          <p className={styles.categoryDescription}>{currentCategory.description}</p>
          
          {/* Settings Preview */}
          {previewItems.length > 0 && (
            <div className={styles.settingsPreview}>
              <h4>Current Settings Preview</h4>
              <div className={styles.previewGrid}>
                {previewItems}
              </div>
            </div>
          )}
        </div>

        <div className={styles.settingsContent}>
          {currentCategory.id === 'currency' && (
            <CurrencySettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'quest-system' && (
            <QuestSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'timeline' && (
            <TimelineSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'energy' && (
            <EnergySettingsSection settings={settings} onSettingChange={updateSetting} onPatchSettings={patchSettings} />
          )}
          {currentCategory.id === 'game-modules' && (
            <ModulesSettingsSection settings={settings} onSettingChange={updateSetting} onPatchSettings={patchSettings} />
          )}
          {currentCategory.id === 'experience-feel' && (
            <ExperienceFeelSettingsSection settings={settings} onPatchSettings={patchSettings} />
          )}
          {currentCategory.id === 'penalties' && (
            <PenaltySettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'shop' && (
            <ShopSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'game-data-hub' && (
            plugin ? (
              <GameDataHubPanel plugin={plugin} />
            ) : (
              <div className={styles.settingsSection}>
                <Card className={styles.settingsCard}>
                  <p>Reload this settings panel from the Gamification plugin to use the Game data hub.</p>
                </Card>
              </div>
            )
          )}
          {currentCategory.id === 'tree' && (
            <TreeSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'performance' && (
            <PerformanceSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'appearance' && (
            <AppearanceSettings
              settings={settings}
              onSettingsChange={patchSettings}
            />
          )}
          {currentCategory.id === 'tutorials' && (
            <TutorialSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'files' && (
            <FileSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'reset' && (
            <ResetSettingsSection settings={settings} onSettingChange={updateSetting} app={app} />
          )}
        </div>
      </div>
    );
  };

  // Get settings preview for a category
  const getSettingsPreview = (categoryId: string) => {
    const previews: JSX.Element[] = [];
    
    switch (categoryId) {
      case 'currency':
        previews.push(
          <div key="xp" className={styles.previewItem}>
            <span className={styles.previewLabel}>XP per Task:</span>
            <span className={styles.previewValue}>{settings.xpPerTask}</span>
          </div>,
          <div key="coins" className={styles.previewItem}>
            <span className={styles.previewLabel}>Coins per Task:</span>
            <span className={styles.previewValue}>{settings.coinPerTask}</span>
          </div>
        );
        break;
      case 'quest-system':
        previews.push(
          <div key="quest-board" className={styles.previewItem}>
            <span className={styles.previewLabel}>Quest Board:</span>
            <span className={styles.previewValue}>{settings.enableSidebarQuestBoard ? 'Enabled' : 'Disabled'}</span>
          </div>,
          <div key="auto-refresh" className={styles.previewItem}>
            <span className={styles.previewLabel}>Auto Refresh:</span>
            <span className={styles.previewValue}>{settings.autoRefreshTasks ? 'On' : 'Off'}</span>
          </div>
        );
        break;
      case 'timeline':
        previews.push(
          <div key="timeline-view" className={styles.previewItem}>
            <span className={styles.previewLabel}>Timeline View:</span>
            <span className={styles.previewValue}>{settings.timelineViewSettings?.enableTimelineView ? 'Enabled' : 'Disabled'}</span>
          </div>,
          <div key="default-view" className={styles.previewItem}>
            <span className={styles.previewLabel}>Default View:</span>
            <span className={styles.previewValue}>{settings.timelineViewSettings?.defaultTimelineView || 'day'}</span>
          </div>
        );
        break;
      case 'energy':
        previews.push(
          <div key="energy-hud" className={styles.previewItem}>
            <span className={styles.previewLabel}>HUD mode:</span>
            <span className={styles.previewValue}>{settings.energyHudMode ?? 'simple'}</span>
          </div>,
          <div key="energy-hud-visible" className={styles.previewItem}>
            <span className={styles.previewLabel}>Energy HUD:</span>
            <span className={styles.previewValue}>{settings.enableEnergyHUD !== false && settings.energyHudMode !== 'off' ? 'Enabled' : 'Disabled'}</span>
          </div>,
          <div key="reset-hour" className={styles.previewItem}>
            <span className={styles.previewLabel}>Reset Hour:</span>
            <span className={styles.previewValue}>{settings.dailyResetHour || 6}:00</span>
          </div>
        );
        break;
      case 'performance':
        previews.push(
          <div key="cache" className={styles.previewItem}>
            <span className={styles.previewLabel}>Caching:</span>
            <span className={styles.previewValue}>{settings.performanceSettings?.enableCache ? 'Enabled' : 'Disabled'}</span>
          </div>,
          <div key="workers" className={styles.previewItem}>
            <span className={styles.previewLabel}>Workers:</span>
            <span className={styles.previewValue}>{settings.performanceSettings?.maxWorkers || 2}</span>
          </div>
        );
        break;
    }
    
    return previews;
  };

  return (
    <div className={styles.settingsContainer}>
      {showOnboarding && (
        <GameplayOnboardingModal
          onSelectProfile={handleOnboardingProfileSelect}
          onCustomize={handleOnboardingCustomize}
          onDismissBalanced={handleOnboardingDismissBalanced}
        />
      )}

      {isDirty && (
        <div className={styles.unsavedBanner} role="status">
          <span>You have unsaved changes.</span>
          <button
            type="button"
            className={styles.unsavedBannerButton}
            onClick={handleSave}
            disabled={!validation.isValid || isSaving}
          >
            {isSaving ? 'Saving…' : 'Save now'}
          </button>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>🎮 Gamification Settings</h1>
          {viewMode === 'category' && currentGroup && (
            <div className={styles.breadcrumb}>
              <span onClick={goBackToGroups} className={styles.breadcrumbLink}>
                Groups
              </span>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span onClick={goBackToGroupCategories} className={styles.breadcrumbLink}>
                {currentGroup.icon} {currentGroup.name}
              </span>
              {currentCategory && (
                <>
                  <span className={styles.breadcrumbSeparator}>/</span>
                  <span className={styles.breadcrumbCurrent}>
                    {currentCategory.icon} {currentCategory.name}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.togglePreviewsButton}
            onClick={() => setShowPreviews(!showPreviews)}
          >
            {showPreviews ? '👁️ Hide Previews' : '👁️ Show Previews'}
          </button>
          <button
            className={styles.presetButton}
            onClick={() => setShowPresets(!showPresets)}
          >
            📋 Presets
          </button>
          <button
            className={`${styles.saveButton} ${isSaving ? styles.saving : ''} ${isDirty ? styles.saveButtonDirty : ''}`}
            onClick={handleSave}
            disabled={!validation.isValid || isSaving}
          >
            {isSaving ? '💾 Saving...' : isDirty ? '💾 Save Settings *' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {viewMode === 'groups' && (
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Search settings, categories, or keys…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      )}

      {/* Validation Messages */}
      {validation.errors.length > 0 && (
        <div className={styles.validationErrors}>
          <h3>❌ Validation Errors</h3>
          <ul>
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className={styles.validationWarnings}>
          <h3>⚠️ Warnings</h3>
          <ul>
            {validation.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Presets Modal */}
      {showPresets && (
        <div className={styles.presetsModal}>
          <div className={styles.presetsContent}>
            <h3>🎯 Settings Presets</h3>
            <p>Choose a preset to quickly configure your settings:</p>
            <div className={styles.presetsList}>
              {SETTINGS_PRESETS.map((preset, index) => (
                <Card key={index} className={styles.presetCard}>
                  <div className={styles.presetHeader}>
                    <span className={styles.presetIcon}>{preset.icon}</span>
                    <h4>{preset.name}</h4>
                  </div>
                  <p>{preset.description}</p>
                  <button
                    className={styles.applyPresetButton}
                    onClick={() => applyPreset(preset)}
                  >
                    Apply Preset
                  </button>
                </Card>
              ))}
            </div>
            <div className={styles.presetModalActions}>
              <button
                className={styles.closePresetsButton}
                onClick={() => setShowPresets(false)}
              >
                Close
              </button>
              <button
                className={styles.exitPresetsButton}
                onClick={() => setShowPresets(false)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.mainContent}>
        {viewMode === 'groups' ? renderGroupCards() : 
         selectedGroup && !selectedCategory ? renderGroupCategories() : 
         renderCategorySettings()}
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS SECTIONS
// ============================================================================

const CurrencySettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>🪙 Currency Configuration</h3>
      <div className={styles.settingGroup}>
        <label>
          XP per Task:
          <input
            type="number"
            min="0"
            value={settings.xpPerTask}
            onChange={(e) => onSettingChange('xpPerTask', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Coins per Task:
          <input
            type="number"
            min="0"
            value={settings.coinPerTask}
            onChange={(e) => onSettingChange('coinPerTask', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Currency Name:
          <input
            type="text"
            value={settings.currencyName || ''}
            onChange={(e) => onSettingChange('currencyName', e.target.value)}
            placeholder="Coins"
          />
        </label>
        <label>
          Currency Symbol:
          <input
            type="text"
            value={settings.currencySymbol || ''}
            onChange={(e) => onSettingChange('currencySymbol', e.target.value)}
            placeholder="🪙"
          />
        </label>
        <label>
          Leveling Formula:
          <select
            value={settings.levelingFormula}
            onChange={(e) => onSettingChange('levelingFormula', e.target.value)}
          >
            <option value="linear">Linear</option>
            <option value="exponential">Exponential</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>
    </Card>
  </div>
);

const QuestSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>📋 Quest Board Settings</h3>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.enableSidebarQuestBoard}
            onChange={(e) => onSettingChange('enableSidebarQuestBoard', e.target.checked)}
          />
          Enable Sidebar Quest Board
        </label>
        <label>
          Quest Board Position:
          <select
            value={settings.questBoardPosition}
            onChange={(e) => onSettingChange('questBoardPosition', e.target.value)}
          >
            <option value="left">Left Sidebar</option>
            <option value="right">Right Sidebar</option>
          </select>
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.autoRefreshTasks}
            onChange={(e) => onSettingChange('autoRefreshTasks', e.target.checked)}
          />
          Auto-refresh Tasks
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.hideCompletedQuests}
            onChange={(e) => onSettingChange('hideCompletedQuests', e.target.checked)}
          />
          Hide Completed Quests
        </label>
        <label>
          Quest Refresh Interval (seconds):
          <input
            type="number"
            min="0"
            value={settings.questRefreshInterval}
            onChange={(e) => onSettingChange('questRefreshInterval', parseInt(e.target.value) || 0)}
          />
        </label>
      </div>
    </Card>
  </div>
);

const EnergySettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
  onPatchSettings: (patch: Partial<GamificationPluginSettings>) => void;
}> = ({ settings, onSettingChange, onPatchSettings }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>⚡ Energy display</h3>
      <p className={styles.helperText} style={{ marginTop: 0, marginBottom: '16px' }}>
        Choose how many wellbeing bars appear on the Player tab. Hidden stats are not updated by quests or daily reset.
      </p>
      <div className={styles.settingGroup}>
        <label>
          HUD mode:
          <select
            value={settings.energyHudMode ?? 'simple'}
            onChange={(e) => {
              const mode = e.target.value as EnergyHudMode;
              onPatchSettings({
                energyHudMode: mode,
                enableEnergyHUD: mode !== 'off',
              });
            }}
          >
            <option value="off">Off — hide energy tracking</option>
            <option value="simple">Simple — Energy + Stress (recommended)</option>
            <option value="focus">Focus pair — Focus + Motivation</option>
            <option value="full">Full — all five stats + smart tips</option>
          </select>
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.enableEnergyHUD !== false && (settings.energyHudMode ?? 'simple') !== 'off'}
            onChange={(e) => {
              if (e.target.checked) {
                onPatchSettings({
                  enableEnergyHUD: true,
                  energyHudMode: settings.energyHudMode === 'off' ? 'simple' : (settings.energyHudMode ?? 'simple'),
                });
              } else {
                onPatchSettings({ enableEnergyHUD: false, energyHudMode: 'off' });
              }
            }}
          />
          Show energy card on Player tab
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>🔄 Daily reset</h3>
      <div className={styles.settingGroup}>
        <label>
          Daily Reset Hour (0-23):
          <input
            type="number"
            min="0"
            max="23"
            value={settings.dailyResetHour ?? 6}
            onChange={(e) => onSettingChange('dailyResetHour', parseInt(e.target.value) || 6)}
          />
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>🔄 Daily restore values</h3>
      <p className={styles.helperText} style={{ marginTop: 0, marginBottom: '12px' }}>
        Only applied for stats visible in your HUD mode.
      </p>
      <div className={styles.settingGroup}>
        <label>
          Energy:
          <input
            type="number"
            min="0"
            value={settings.dailyRestoreEnergy ?? 30}
            onChange={(e) => onSettingChange('dailyRestoreEnergy', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Focus:
          <input
            type="number"
            min="0"
            value={settings.dailyRestoreFocus ?? 20}
            onChange={(e) => onSettingChange('dailyRestoreFocus', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Motivation:
          <input
            type="number"
            min="0"
            value={settings.dailyRestoreMotivation ?? 25}
            onChange={(e) => onSettingChange('dailyRestoreMotivation', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Calm:
          <input
            type="number"
            min="0"
            value={settings.dailyRestoreCalm ?? 15}
            onChange={(e) => onSettingChange('dailyRestoreCalm', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Stress Reduce:
          <input
            type="number"
            min="0"
            value={settings.dailyRestoreStressReduce ?? 10}
            onChange={(e) => onSettingChange('dailyRestoreStressReduce', parseInt(e.target.value) || 0)}
          />
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>🔧 Quest energy costs</h3>
      <p className={styles.advancedNote}>
        Fine-tune how much energy quests spend. Only change these if you want to rebalance difficulty.
      </p>

      <h4>Easy Quests</h4>
      <div className={styles.settingGroup}>
        <label>
          Mental Cost:
          <input
            type="number"
            min="0"
            value={settings.questCostEasyMental ?? 5}
            onChange={(e) => onSettingChange('questCostEasyMental', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Physical Cost:
          <input
            type="number"
            min="0"
            value={settings.questCostEasyPhysical ?? 2}
            onChange={(e) => onSettingChange('questCostEasyPhysical', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Emotional Cost:
          <input
            type="number"
            min="0"
            value={settings.questCostEasyEmotional ?? 2}
            onChange={(e) => onSettingChange('questCostEasyEmotional', parseInt(e.target.value) || 0)}
          />
        </label>
      </div>

      <h4>Medium Quests</h4>
      <div className={styles.settingGroup}>
        <label>
          Mental Cost:
          <input
            type="number"
            min="0"
            value={settings.questCostMediumMental ?? 10}
            onChange={(e) => onSettingChange('questCostMediumMental', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Physical Cost:
          <input
            type="number"
            min="0"
            value={settings.questCostMediumPhysical ?? 5}
            onChange={(e) => onSettingChange('questCostMediumPhysical', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Emotional Cost:
          <input
            type="number"
            min="0"
            value={settings.questCostMediumEmotional ?? 5}
            onChange={(e) => onSettingChange('questCostMediumEmotional', parseInt(e.target.value) || 0)}
          />
        </label>
      </div>

      <h4>Hard Quests</h4>
      <div className={styles.settingGroup}>
        <label>
          Mental Cost:
          <input
            type="number"
            min="0"
            value={settings.questCostHardMental ?? 15}
            onChange={(e) => onSettingChange('questCostHardMental', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Physical Cost:
          <input
            type="number"
            min="0"
            value={settings.questCostHardPhysical ?? 10}
            onChange={(e) => onSettingChange('questCostHardPhysical', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Emotional Cost:
          <input
            type="number"
            min="0"
            value={settings.questCostHardEmotional ?? 8}
            onChange={(e) => onSettingChange('questCostHardEmotional', parseInt(e.target.value) || 0)}
          />
        </label>
      </div>
    </Card>
  </div>
);

const ExperienceFeelSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onPatchSettings: (patch: Partial<GamificationPluginSettings>) => void;
}> = ({ settings, onPatchSettings }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>🔔 Notifications</h3>
      <p className={styles.helperText} style={{ marginTop: 0, marginBottom: '16px' }}>
        Control how chatty reward and status toasts are during play.
      </p>
      <div className={styles.settingGroup}>
        <label>
          Notification level:
          <select
            value={settings.notificationLevel ?? 'normal'}
            onChange={(e) =>
              onPatchSettings({ notificationLevel: e.target.value as NotificationLevel })
            }
          >
            <option value="normal">Normal — full messages</option>
            <option value="quiet">Quiet — shorter toasts, dedupe repeats</option>
            <option value="minimal">Minimal — errors and important alerts only</option>
          </select>
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>⚔️ Boss battles</h3>
      <p className={styles.helperText} style={{ marginTop: 0, marginBottom: '16px' }}>
        When enabled, you can finish quests from the quest board or exit battle without the final-blow step.
        Hardcore profile turns this off by default.
      </p>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.preferQuickComplete !== false}
            onChange={(e) => onPatchSettings({ preferQuickComplete: e.target.checked })}
          />
          Allow quick-complete without boss battle
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>📋 Quest filters</h3>
      <p className={styles.helperText} style={{ marginTop: 0 }}>
        Lite profile shows All, Today, Quick Wins, and Overdue by default with a &quot;More filters&quot; toggle.
        Balanced and Hardcore show the full filter row.
      </p>
    </Card>
  </div>
);

const ModulesSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
  onPatchSettings: (patch: Partial<GamificationPluginSettings>) => void;
}> = ({ settings, onSettingChange, onPatchSettings }) => {
  const modules: GamificationModules = {
    ...BALANCED_GAMEPLAY_MODULES,
    ...(settings.modules ?? {}),
  };

  const setModule = (key: keyof GamificationModules, value: boolean) => {
    onSettingChange('modules', { ...modules, [key]: value });
  };

  return (
    <div className={styles.settingsSection}>
      <Card className={styles.settingsCard}>
        <h3>🎮 Gameplay profile</h3>
        <p className={styles.helperText} style={{ marginTop: 0, marginBottom: '16px' }}>
          Profiles set recommended tab and system defaults. Customize individual modules below.
        </p>
        <div className={styles.settingGroup}>
          <label>
            Profile:
            <select
              value={settings.gameplayProfile ?? 'balanced'}
              onChange={(e) => {
                const profile = e.target.value as GamificationPluginSettings['gameplayProfile'];
                const bundle =
                  profile === 'hardcore'
                    ? { ...HARDCORE_GAMEPLAY_MODULES }
                    : profile === 'lite'
                      ? { ...LITE_GAMEPLAY_MODULES }
                      : { ...BALANCED_GAMEPLAY_MODULES };
                onPatchSettings({
                  gameplayProfile: profile,
                  modules: bundle,
                  notificationLevel: profile === 'lite' ? 'quiet' : 'normal',
                  preferQuickComplete: profile !== 'hardcore',
                  energyHudMode: profile === 'hardcore' ? 'full' : 'simple',
                });
              }}
            >
              <option value="lite">Lite — quests, pomodoro, energy</option>
              <option value="balanced">Balanced (recommended)</option>
              <option value="hardcore">Hardcore — everything on</option>
            </select>
          </label>
        </div>
      </Card>

      <Card className={styles.settingsCard}>
        <h3>📑 Player tabs</h3>
        <div className={styles.settingGroup}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={modules.enableShopTab === true} onChange={(e) => setModule('enableShopTab', e.target.checked)} />
            Shop tab
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={modules.enableCraftingTab === true} onChange={(e) => setModule('enableCraftingTab', e.target.checked)} />
            Crafting tab
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={modules.enableHabitsTab === true} onChange={(e) => setModule('enableHabitsTab', e.target.checked)} />
            Habits tab
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={modules.enableAchievementsTab === true} onChange={(e) => setModule('enableAchievementsTab', e.target.checked)} />
            Achievements tab
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={modules.enablePomodoroTab === true} onChange={(e) => setModule('enablePomodoroTab', e.target.checked)} />
            Pomodoro tab
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={modules.enableAnalyticsTab === true} onChange={(e) => setModule('enableAnalyticsTab', e.target.checked)} />
            Analytics tab
          </label>
        </div>
        <p className={styles.helperText}>Player and Quests tabs are always visible.</p>
      </Card>

      <Card className={styles.settingsCard}>
        <h3>⚙️ Systems</h3>
        <div className={styles.settingGroup}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={modules.enableBossBattles === true} onChange={(e) => setModule('enableBossBattles', e.target.checked)} />
            Boss battles (arena &amp; sidebar boss)
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={modules.enableEnergySystem === true} onChange={(e) => setModule('enableEnergySystem', e.target.checked)} />
            Energy system (HUD, costs, daily reset)
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={modules.enableProductivityGear === true} onChange={(e) => setModule('enableProductivityGear', e.target.checked)} />
            Productivity equipment (inventory modal)
          </label>
        </div>
      </Card>
    </div>
  );
};

const PenaltySettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => {
  const modules: GamificationModules = {
    ...BALANCED_GAMEPLAY_MODULES,
    ...(settings.modules ?? {}),
  };

  const setModule = (key: keyof GamificationModules, value: boolean) => {
    onSettingChange('modules', { ...modules, [key]: value });
  };

  const subPenaltyDisabled = !modules.enablePenalties;

  return (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>⚙️ Penalty modules</h3>
      <p className={styles.helperText} style={{ marginTop: 0, marginBottom: '16px' }}>
        Penalties are off by default. Configure tabs and systems under Feature Modules.
      </p>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={modules.enablePenalties === true}
            onChange={(e) => setModule('enablePenalties', e.target.checked)}
          />
          Enable penalties (master switch)
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            disabled={subPenaltyDisabled}
            checked={modules.enableOverduePenalties === true}
            onChange={(e) => setModule('enableOverduePenalties', e.target.checked)}
          />
          Overdue quest penalties (reduced rewards, debt, debuffs)
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            disabled={subPenaltyDisabled}
            checked={modules.enableBossPenalties === true}
            onChange={(e) => setModule('enableBossPenalties', e.target.checked)}
          />
          Boss battle timeout penalties
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            disabled={subPenaltyDisabled}
            checked={modules.enableFailureDebt === true}
            onChange={(e) => setModule('enableFailureDebt', e.target.checked)}
          />
          Failure debt (mark quest failed)
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            disabled={subPenaltyDisabled}
            checked={modules.enablePomodoroPenalties === true}
            onChange={(e) => setModule('enablePomodoroPenalties', e.target.checked)}
          />
          Pomodoro attachment penalties
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>⚠️ Failure Penalties</h3>
      <div className={styles.settingGroup}>
        <label>
          Low Priority Penalty (0.00 - 1.00):
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={settings.penaltyLowPct}
            onChange={(e) => onSettingChange('penaltyLowPct', parseFloat(e.target.value) || 0)}
          />
        </label>
        <label>
          Medium Priority Penalty (0.00 - 1.00):
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={settings.penaltyMediumPct}
            onChange={(e) => onSettingChange('penaltyMediumPct', parseFloat(e.target.value) || 0)}
          />
        </label>
        <label>
          High Priority Penalty (0.00 - 1.00):
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={settings.penaltyHighPct}
            onChange={(e) => onSettingChange('penaltyHighPct', parseFloat(e.target.value) || 0)}
          />
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>💰 Daily Debt Caps</h3>
      <div className={styles.settingGroup}>
        <label>
          Daily XP Debt Cap:
          <input
            type="number"
            min="0"
            value={settings.dailyDebtCapXP}
            onChange={(e) => onSettingChange('dailyDebtCapXP', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Daily Coin Debt Cap:
          <input
            type="number"
            min="0"
            value={settings.dailyDebtCapCoins}
            onChange={(e) => onSettingChange('dailyDebtCapCoins', parseInt(e.target.value) || 0)}
          />
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.pomodoroFailOnlyOnReset}
            onChange={(e) => onSettingChange('pomodoroFailOnlyOnReset', e.target.checked)}
          />
          Pomodoro: Fail only on Reset
        </label>
      </div>
    </Card>
  </div>
  );
};

const ShopSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>🛒 Shop System Settings</h3>
      <p className={styles.helperText} style={{ marginTop: 0, marginBottom: '16px' }}>
        To add or edit shop items (written to Shop.md), go to{' '}
        <strong>Economy &amp; Content → Game data hub</strong> in these settings.
      </p>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.enableSeasonalShop ?? true}
            onChange={(e) => onSettingChange('enableSeasonalShop', e.target.checked)}
          />
          Enable Seasonal Shop
        </label>
        <label>
          Shop Rotation Days:
          <input
            type="number"
            min="1"
            value={settings.shopRotationDays ?? 7}
            onChange={(e) => onSettingChange('shopRotationDays', parseInt(e.target.value) || 7)}
          />
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.enableSpecialEvents ?? true}
            onChange={(e) => onSettingChange('enableSpecialEvents', e.target.checked)}
          />
          Enable Special Events
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.dragonFestivalEnabled ?? true}
            onChange={(e) => onSettingChange('dragonFestivalEnabled', e.target.checked)}
          />
          Dragon Festival Events
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.mysticalMarketEnabled ?? true}
            onChange={(e) => onSettingChange('mysticalMarketEnabled', e.target.checked)}
          />
          Mystical Market Events
        </label>
      </div>
    </Card>
  </div>
);

const TreeSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>🌳 Tree Reward System</h3>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.treeRewardConfig.enableProgressiveRewards}
            onChange={(e) => onSettingChange('treeRewardConfig.enableProgressiveRewards', e.target.checked)}
          />
          Enable Progressive Tree Rewards
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.treeRewardConfig.enableItemDrops}
            onChange={(e) => onSettingChange('treeRewardConfig.enableItemDrops', e.target.checked)}
          />
          Enable Item Drops
        </label>
        <label>
          Base Item Drop Chance (0.00 - 1.00):
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={settings.treeRewardConfig.itemDropChance}
            onChange={(e) => onSettingChange('treeRewardConfig.itemDropChance', parseFloat(e.target.value) || 0)}
          />
        </label>
      </div>
    </Card>
  </div>
);

const TimelineSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>📅 Timeline View Settings</h3>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.timelineViewSettings?.enableTimelineView ?? true}
            onChange={(e) => onSettingChange('timelineViewSettings.enableTimelineView', e.target.checked)}
          />
          Enable Timeline View
        </label>
        <label>
          Default Timeline View:
          <select
            value={settings.timelineViewSettings?.defaultTimelineView || 'day'}
            onChange={(e) => onSettingChange('timelineViewSettings.defaultTimelineView', e.target.value)}
          >
            <option value="day">Day View</option>
            <option value="week">Week View</option>
            <option value="month">Month View</option>
          </select>
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.timelineViewSettings?.showCompletedTasks ?? true}
            onChange={(e) => onSettingChange('timelineViewSettings.showCompletedTasks', e.target.checked)}
          />
          Show Completed Tasks
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.timelineViewSettings?.groupByCategory ?? true}
            onChange={(e) => onSettingChange('timelineViewSettings.groupByCategory', e.target.checked)}
          />
          Group by Category
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.timelineViewSettings?.enableTimeBlocks ?? true}
            onChange={(e) => onSettingChange('timelineViewSettings.enableTimeBlocks', e.target.checked)}
          />
          Enable Time Blocks
        </label>
        <label>
          Timeline Color Mode:
          <select
            value={settings.timelineViewSettings?.colorMode || 'adaptive'}
            onChange={(e) => onSettingChange('timelineViewSettings.colorMode', e.target.value)}
          >
            <option value="adaptive">Adaptive (priority + difficulty + tag)</option>
            <option value="priority">Priority</option>
            <option value="difficulty">Difficulty</option>
            <option value="tag">Tag</option>
          </select>
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.timelineViewSettings?.useCustomDayRange ?? false}
            onChange={(e) => onSettingChange('timelineViewSettings.useCustomDayRange', e.target.checked)}
          />
          Use custom timeline day range
        </label>
        <label>
          Day Start Hour (0-23):
          <input
            type="number"
            min="0"
            max="23"
            disabled={!(settings.timelineViewSettings?.useCustomDayRange ?? false)}
            value={settings.timelineViewSettings?.dayStartHour ?? 0}
            onChange={(e) => onSettingChange('timelineViewSettings.dayStartHour', parseInt(e.target.value) || 0)}
          />
        </label>
        <label>
          Day End Hour (0-23):
          <input
            type="number"
            min="0"
            max="23"
            disabled={!(settings.timelineViewSettings?.useCustomDayRange ?? false)}
            value={settings.timelineViewSettings?.dayEndHour ?? 23}
            onChange={(e) => onSettingChange('timelineViewSettings.dayEndHour', parseInt(e.target.value) || 23)}
          />
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>📅 Calendar Integration</h3>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.calendarIntegration?.enableCalendarSync ?? false}
            onChange={(e) => onSettingChange('calendarIntegration.enableCalendarSync', e.target.checked)}
          />
          Enable Calendar Sync
        </label>
        <label>
          Calendar Provider:
          <select
            value={settings.calendarIntegration?.calendarProvider || 'none'}
            onChange={(e) => onSettingChange('calendarIntegration.calendarProvider', e.target.value)}
          >
            <option value="none">None</option>
            <option value="google">Google Calendar</option>
            <option value="outlook">Outlook</option>
            <option value="apple">Apple Calendar</option>
          </select>
        </label>
        <label>
          Sync Frequency (minutes):
          <input
            type="number"
            min="1"
            value={settings.calendarIntegration?.syncFrequency || 60}
            onChange={(e) => onSettingChange('calendarIntegration.syncFrequency', parseInt(e.target.value) || 60)}
          />
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>⏰ Scheduling Preferences</h3>
      <div className={styles.settingGroup}>
        <label>
          Default Task Duration (minutes):
          <input
            type="number"
            min="1"
            value={settings.schedulingPreferences?.defaultTaskDuration || 25}
            onChange={(e) => onSettingChange('schedulingPreferences.defaultTaskDuration', parseInt(e.target.value) || 25)}
          />
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.schedulingPreferences?.enableSmartScheduling ?? true}
            onChange={(e) => onSettingChange('schedulingPreferences.enableSmartScheduling', e.target.checked)}
          />
          Enable Smart Scheduling
        </label>
        <label>
          Working Hours Start:
          <input
            type="number"
            min="0"
            max="23"
            value={settings.schedulingPreferences?.workingHoursStart || 9}
            onChange={(e) => onSettingChange('schedulingPreferences.workingHoursStart', parseInt(e.target.value) || 9)}
          />
        </label>
        <label>
          Working Hours End:
          <input
            type="number"
            min="0"
            max="23"
            value={settings.schedulingPreferences?.workingHoursEnd || 17}
            onChange={(e) => onSettingChange('schedulingPreferences.workingHoursEnd', parseInt(e.target.value) || 17)}
          />
        </label>
      </div>
    </Card>
  </div>
);

const PerformanceSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>🚀 Performance Optimization</h3>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.performanceSettings?.enableCache ?? true}
            onChange={(e) => onSettingChange('performanceSettings.enableCache', e.target.checked)}
          />
          Enable Caching
        </label>
        <label>
          Cache TTL (milliseconds):
          <input
            type="number"
            min="1000"
            value={settings.performanceSettings?.cacheTTL || 300000}
            onChange={(e) => onSettingChange('performanceSettings.cacheTTL', parseInt(e.target.value) || 300000)}
          />
        </label>
        <label>
          Max Cache Size (entries):
          <input
            type="number"
            min="10"
            value={settings.performanceSettings?.maxCacheSize || 1000}
            onChange={(e) => onSettingChange('performanceSettings.maxCacheSize', parseInt(e.target.value) || 1000)}
          />
        </label>
        <label>
          Max Cache Memory (MB):
          <input
            type="number"
            min="1"
            value={settings.performanceSettings?.maxCacheMemoryMB || 50}
            onChange={(e) => onSettingChange('performanceSettings.maxCacheMemoryMB', parseInt(e.target.value) || 50)}
          />
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>📝 Write Optimization</h3>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.performanceSettings?.enableDebouncedWrites ?? true}
            onChange={(e) => onSettingChange('performanceSettings.enableDebouncedWrites', e.target.checked)}
          />
          Enable Debounced Writes
        </label>
        <label>
          Write Debounce Delay (milliseconds):
          <input
            type="number"
            min="100"
            value={settings.performanceSettings?.writeDebounceDelay || 1000}
            onChange={(e) => onSettingChange('performanceSettings.writeDebounceDelay', parseInt(e.target.value) || 1000)}
          />
        </label>
        <label>
          Max Write Batch Size:
          <input
            type="number"
            min="1"
            value={settings.performanceSettings?.maxWriteBatchSize || 10}
            onChange={(e) => onSettingChange('performanceSettings.maxWriteBatchSize', parseInt(e.target.value) || 10)}
          />
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>⚡ Worker Optimization</h3>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.performanceSettings?.enableWorkerParsing ?? true}
            onChange={(e) => onSettingChange('performanceSettings.enableWorkerParsing', e.target.checked)}
          />
          Enable Worker Parsing
        </label>
        <label>
          Max Workers:
          <input
            type="number"
            min="1"
            max="8"
            value={settings.performanceSettings?.maxWorkers || 2}
            onChange={(e) => onSettingChange('performanceSettings.maxWorkers', parseInt(e.target.value) || 2)}
          />
        </label>
        <label>
          Parsing Chunk Size (lines):
          <input
            type="number"
            min="100"
            value={settings.performanceSettings?.parsingChunkSize || 1000}
            onChange={(e) => onSettingChange('performanceSettings.parsingChunkSize', parseInt(e.target.value) || 1000)}
          />
        </label>
        <label>
          Auto Cleanup Interval (milliseconds):
          <input
            type="number"
            min="10000"
            value={settings.performanceSettings?.autoCleanupInterval || 60000}
            onChange={(e) => onSettingChange('performanceSettings.autoCleanupInterval', parseInt(e.target.value) || 60000)}
          />
        </label>
      </div>
    </Card>

    <Card className={styles.settingsCard}>
      <h3>🧪 Beta & Feature Flags</h3>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.betaMode ?? true}
            onChange={(e) => onSettingChange('betaMode', e.target.checked)}
          />
          Enable Beta Mode (debug buttons/logs)
        </label>
        <p className={styles.helperText} style={{ marginTop: 0 }}>
          Analytics tab visibility is controlled under Gameplay → Feature Modules.
        </p>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.featureFlags?.enableEnergyDebug ?? false}
            onChange={(e) => onSettingChange('featureFlags.enableEnergyDebug', e.target.checked)}
          />
          Enable Energy Debug UI
        </label>
      </div>
    </Card>
  </div>
);

const TutorialSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <TutorialSettingsPanel />
  </div>
);

const FileSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>📁 File Paths</h3>
      <div className={styles.settingGroup}>
        <label>
          Shopkeeper Image Path:
          <input
            type="text"
            value={settings.shopkeeperImagePath}
            onChange={(e) => onSettingChange('shopkeeperImagePath', e.target.value)}
            placeholder="assets/shopkeeper.jpg"
          />
        </label>
        <label>
          Quest Giver Image Path:
          <input
            type="text"
            value={settings.questGiverImagePath}
            onChange={(e) => onSettingChange('questGiverImagePath', e.target.value)}
            placeholder="assets/quest-giver.jpg"
          />
        </label>
        <label>
          Avatar Folder:
          <input
            type="text"
            value={settings.avatarFolder}
            onChange={(e) => onSettingChange('avatarFolder', e.target.value)}
            placeholder="assets/"
          />
        </label>
        <label>
          Inventory File Path:
          <input
            type="text"
            value={settings.inventoryFilePath}
            onChange={(e) => onSettingChange('inventoryFilePath', e.target.value)}
            placeholder="Inventory.md"
          />
        </label>
        <label>
          Master Class Folder:
          <input
            type="text"
            value={settings.masterClassFolder}
            onChange={(e) => onSettingChange('masterClassFolder', e.target.value)}
            placeholder="SkillTree/Master-Class"
          />
        </label>
        <label>
          Class Folder:
          <input
            type="text"
            value={settings.classFolder}
            onChange={(e) => onSettingChange('classFolder', e.target.value)}
            placeholder="SkillTree/Master-Class/Class"
          />
        </label>
        <label>
          Skill Folder:
          <input
            type="text"
            value={settings.skillFolder}
            onChange={(e) => onSettingChange('skillFolder', e.target.value)}
            placeholder="SkillTree/Master-Class/Class/Skills"
          />
        </label>
        <label>
          Stat Folder:
          <input
            type="text"
            value={settings.statFolder}
            onChange={(e) => onSettingChange('statFolder', e.target.value)}
            placeholder="SkillTree/Master-Class/Stats"
          />
        </label>
        <label>
          Default Quest File:
          <input
            type="text"
            value={settings.defaultQuestFilePath || 'GamifiedTasks.md'}
            onChange={(e) => onSettingChange('defaultQuestFilePath', e.target.value || 'GamifiedTasks.md')}
            placeholder="GamifiedTasks.md"
          />
        </label>
        <label>
          Quest storage mode:
          <select
            value={settings.questStorageMode || 'list'}
            onChange={(e) =>
              onSettingChange('questStorageMode', e.target.value as 'list' | 'per-note')
            }
          >
            <option value="list">List file (append to markdown)</option>
            <option value="per-note">One task per note</option>
          </select>
        </label>
        {(settings.questStorageMode || 'list') === 'per-note' && (
          <label>
            Task notes folder:
            <input
              type="text"
              value={settings.taskNoteFolder || 'Gamified/Tasks'}
              onChange={(e) => onSettingChange('taskNoteFolder', e.target.value || 'Gamified/Tasks')}
              placeholder="Gamified/Tasks"
            />
          </label>
        )}
        <label>
          Projects / contracts file:
          <input
            type="text"
            value={settings.projectsFilePath || 'GamifiedProjects.md'}
            onChange={(e) =>
              onSettingChange('projectsFilePath', e.target.value || 'GamifiedProjects.md')
            }
            placeholder="GamifiedProjects.md"
          />
        </label>
        <label>
          Brain dump file:
          <input
            type="text"
            value={settings.captureFilePath || 'Capture.md'}
            onChange={(e) => onSettingChange('captureFilePath', e.target.value || 'Capture.md')}
            placeholder="Capture.md"
          />
        </label>
        <label>
          Capture tag presets (comma-separated):
          <input
            type="text"
            value={(settings.captureTags || ['idea', 'work', 'plugin', 'personal', 'read-later']).join(', ')}
            onChange={(e) => {
              const tags = e.target.value
                .split(',')
                .map((t) => t.trim().replace(/^#/, ''))
                .filter(Boolean);
              onSettingChange('captureTags', tags.length ? tags : ['idea', 'work', 'plugin', 'personal', 'read-later']);
            }}
            placeholder="idea, work, plugin, personal, read-later"
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.captureRememberLastTag !== false}
            onChange={(e) => onSettingChange('captureRememberLastTag', e.target.checked)}
          />
          Remember last capture tag between sessions
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.captureIncludeDescription !== false}
            onChange={(e) => onSettingChange('captureIncludeDescription', e.target.checked)}
          />
          Show optional description field in brain dump
        </label>
        <label>
          Capture description format:
          <select
            value={settings.captureDescriptionFormat || 'thought'}
            onChange={(e) =>
              onSettingChange(
                'captureDescriptionFormat',
                e.target.value as 'thought' | 'dataview' | 'both'
              )
            }
          >
            <option value="thought">💭 thought line (plugin default)</option>
            <option value="dataview">[description:: …] inline (Task Genius)</option>
            <option value="both">Both formats</option>
          </select>
        </label>
      </div>
      <h4>External task sync</h4>
      <p className={styles.helperText}>
        Award XP when tasks are checked off in TaskForge, TaskNotes, or other apps that sync to
        your vault. Tasks need <code>#gamified-task</code> or TaskNotes <code>status: done</code>{' '}
        with gamified metadata.
      </p>
      <div className={styles.settingGroup}>
        <label>
          <input
            type="checkbox"
            checked={settings.externalCompletionSync !== false}
            onChange={(e) => onSettingChange('externalCompletionSync', e.target.checked)}
          />
          Sync completions from vault file changes
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.externalCompletionSummary !== false}
            onChange={(e) => onSettingChange('externalCompletionSummary', e.target.checked)}
          />
          Show summary modal when completions are detected
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.taskNotesCompatibility !== false}
            onChange={(e) => onSettingChange('taskNotesCompatibility', e.target.checked)}
          />
          TaskNotes compatibility (detect <code>status: done</code> in frontmatter)
        </label>
        <label>
          TaskNotes folder (optional):
          <input
            type="text"
            value={settings.taskNotesFolder || ''}
            onChange={(e) => onSettingChange('taskNotesFolder', e.target.value)}
            placeholder={
              (settings.questStorageMode || 'list') === 'per-note'
                ? settings.taskNoteFolder || 'Gamified/Tasks'
                : 'e.g. TaskNotes'
            }
          />
        </label>
        <label>
          Extra watch paths (comma-separated files or folders):
          <input
            type="text"
            value={(settings.externalWatchPaths || []).join(', ')}
            onChange={(e) => {
              const paths = e.target.value
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean);
              onSettingChange('externalWatchPaths', paths);
            }}
            placeholder="TaskForge/Tasks.md, Notes/Tasks"
          />
        </label>
      </div>
      <h4>Focus check-ins</h4>
      <p className={styles.helperText}>
        While Obsidian is open, a <strong>Check in</strong> button appears after your chosen interval.
        Click it to reflect on what you did — entries save to your check-in log.
      </p>
      <div className={styles.settingGroup}>
        <label>
          <input
            type="checkbox"
            checked={settings.enableFocusCheckIns !== false}
            onChange={(e) => onSettingChange('enableFocusCheckIns', e.target.checked)}
          />
          Enable focus check-ins
        </label>
        <label>
          Check-in interval:
          <select
            value={String(settings.focusCheckInIntervalMinutes ?? 120)}
            onChange={(e) =>
              onSettingChange('focusCheckInIntervalMinutes', parseInt(e.target.value, 10))
            }
          >
            <option value="60">Every 1 hour</option>
            <option value="90">Every 1.5 hours</option>
            <option value="120">Every 2 hours</option>
            <option value="180">Every 3 hours</option>
            <option value="240">Every 4 hours</option>
          </select>
        </label>
        <label>
          Check-in log file:
          <input
            type="text"
            value={settings.focusCheckInLogPath || 'CheckIns.md'}
            onChange={(e) => onSettingChange('focusCheckInLogPath', e.target.value || 'CheckIns.md')}
            placeholder="CheckIns.md"
          />
        </label>
        <label>
          Snooze duration (minutes):
          <input
            type="number"
            min={5}
            max={120}
            value={settings.focusCheckInSnoozeMinutes ?? 30}
            onChange={(e) =>
              onSettingChange('focusCheckInSnoozeMinutes', Math.max(5, parseInt(e.target.value, 10) || 30))
            }
          />
        </label>
      </div>
      <p className={styles.helperText}>
        Contract headers from the Projects tab are appended to the projects file. Task steps link via{' '}
        <code>[project:: Name]</code> and usually live in the default quest file or task notes folder.
      </p>
      {(settings.questStorageMode || 'list') === 'per-note' && (
        <p className={styles.helperText}>
          New quests (default save location) create a note under the task folder. List files above
          are still loaded for projects and legacy tasks.
        </p>
      )}
      {/* Saved quest locations that appear in the quest creation modal */}
      <h4>Quest Save Locations</h4>
      <p className={styles.helperText}>
        Configure named locations that will show up in the quest creation modal&apos;s &quot;Save Quest To&quot; dropdown.
      </p>
      <div className={styles.settingGroup}>
        {(settings.questSaveLocations ?? []).length === 0 && (
          <div className={styles.helperText}>
            No saved quest locations yet. New quests will use the default quest file above.
          </div>
        )}
        {(settings.questSaveLocations ?? []).map((loc, index) => (
          <div key={loc.id || index} className={styles.questLocationRow}>
            <input
              type="text"
              value={loc.label}
              onChange={(e) => {
                const locations = [...(settings.questSaveLocations ?? [])];
                locations[index] = { ...locations[index], label: e.target.value };
                onSettingChange('questSaveLocations', locations);
              }}
              placeholder="Location label (e.g. Work Quests)"
            />
            <input
              type="text"
              value={loc.filePath}
              onChange={(e) => {
                const locations = [...(settings.questSaveLocations ?? [])];
                locations[index] = { ...locations[index], filePath: e.target.value };
                onSettingChange('questSaveLocations', locations);
              }}
              placeholder="File path (e.g. Quests/WorkQuests.md)"
            />
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => {
                const locations = [...(settings.questSaveLocations ?? [])];
                locations.splice(index, 1);
                onSettingChange('questSaveLocations', locations);
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.addButton}
          onClick={() => {
            const locations = [...(settings.questSaveLocations ?? [])];
            const id = `loc-${Date.now()}-${locations.length}`;
            locations.push({
              id,
              label: 'New Quest Location',
              filePath: settings.defaultQuestFilePath || 'GamifiedTasks.md',
            });
            onSettingChange('questSaveLocations', locations);
          }}
        >
          ➕ Add Quest Location
        </button>
      </div>
    </Card>
  </div>
);

const ResetSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
  app?: App;
}> = ({ settings, onSettingChange, app }) => {
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [backups, setBackups] = useState<TFile[]>([]);

  useEffect(() => {
    if (app) {
      listPlayerDataBackups(app.vault).then(setBackups).catch(() => setBackups([]));
    }
  }, [app]);

  const handleReset = async (resetType: string) => {
    if (confirmReset !== resetType) {
      setConfirmReset(resetType);
      setTimeout(() => setConfirmReset(null), 5000); // Auto-cancel after 5 seconds
      return;
    }

    if (!app) {
      alert('App instance not available. Cannot perform reset.');
      return;
    }

    setIsResetting(true);
    setConfirmReset(null);

    try {
      switch (resetType) {
        case 'skills':
          await resetSkillsData(app, settings);
          break;
        case 'masterClass':
          await resetMasterClassData(app, settings);
          break;
        case 'class':
          await resetClassData(app, settings);
          break;
        case 'stats':
          await resetStatsData(app, settings);
          break;
        case 'playerProgress':
          await resetPlayerProgress(app);
          break;
      }
      
      // Show success notification
      alert(`Successfully reset ${resetType}!`);
      
      // Trigger a data refresh event
      document.dispatchEvent(new Event('player-data-updated'));
    } catch (error) {
      console.error(`Error resetting ${resetType}:`, error);
      alert(`Failed to reset ${resetType}. Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsResetting(false);
    }
  };

  const resetSkillsData = async (app: App, settings: GamificationPluginSettings) => {
    console.log('🔄 Resetting skills data...');
    const skillFolder = settings.skillFolder || 'SkillTree/Master-Class/Class/Skills';
    const folder = app.vault.getAbstractFileByPath(skillFolder);
    
    if (folder instanceof TFolder) {
      for (const file of folder.children) {
        if (file instanceof TFile && file.extension === 'md') {
          try {
            const content = await app.vault.read(file);
            const lines = content.split('\n');
            const yamlEndIndex = lines.findIndex((line: string, index: number) => index > 0 && line.trim() === '---');
            
            if (yamlEndIndex > 0) {
              // Parse existing frontmatter to preserve class, stats, and Description
              const frontmatter = lines.slice(1, yamlEndIndex).join('\n');
              const classMatch = frontmatter.match(/^class:\s*(.+)$/m);
              const statsMatch = frontmatter.match(/^stats:\s*\n((?:\s+-\s+.+\n?)+)/m);
              const descMatch = frontmatter.match(/^Description:\s*(.+)$/m);
              
              const className = classMatch ? classMatch[1].trim() : 'Unassigned';
              const statsLines = statsMatch ? statsMatch[1].trim() : '  - Unassigned';
              const description = descMatch ? descMatch[1].trim() : 'No description provided';
              
              // Reset YAML frontmatter while preserving content
              const newYaml = [
                '---',
                'name: ' + file.basename,
                'class: ' + className,
                'stats:',
                statsLines,
                'level: 1',
                'currentCP: 0',
                'requiredCP: 100',
                'totalCP: 0',
                'Description: ' + description,
                '---'
              ];
              const newContent = [...newYaml, ...lines.slice(yamlEndIndex + 1)].join('\n');
              await app.vault.modify(file, newContent);
            }
          } catch (error) {
            console.error(`Failed to reset skill file ${file.path}:`, error);
          }
        }
      }
    }
  };

  const resetMasterClassData = async (app: App, settings: GamificationPluginSettings) => {
    console.log('🔄 Resetting master class data...');
    const masterClassFolder = settings.masterClassFolder || 'SkillTree/Master-Class';
    const folder = app.vault.getAbstractFileByPath(masterClassFolder);
    
    if (folder instanceof TFolder) {
      for (const file of folder.children) {
        if (file instanceof TFile && file.extension === 'md') {
          try {
            const content = await app.vault.read(file);
            const lines = content.split('\n');
            const yamlEndIndex = lines.findIndex((line: string, index: number) => index > 0 && line.trim() === '---');
            
            if (yamlEndIndex > 0) {
              // Parse existing frontmatter to preserve classes, skills, and description
              const frontmatter = lines.slice(1, yamlEndIndex).join('\n');
              const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
              const classesMatch = frontmatter.match(/^classes:\s*\n((?:\s+-\s+.+\n?)+)/m);
              const skillsMatch = frontmatter.match(/^skills:\s*\n((?:\s+-\s+.+\n?)+)/m);
              const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
              
              const name = nameMatch ? nameMatch[1].trim() : file.basename;
              const classesLines = classesMatch ? classesMatch[1].trim() : '  - Physical\n  - Mental';
              const skillsLines = skillsMatch ? skillsMatch[1].trim() : '  - Body Builder\n  - Cardio';
              const description = descMatch ? descMatch[1].trim() : 'No description provided';
              
              // Reset YAML frontmatter while preserving content
              const newYaml = [
                '---',
                'name: ' + name,
                'level: 1',
                'currentCP: 0',
                'requiredCP: 400',
                'totalCP: 0',
                'description: ' + description,
                'classes:',
                classesLines,
                'skills:',
                skillsLines,
                '---'
              ];
              const newContent = [...newYaml, ...lines.slice(yamlEndIndex + 1)].join('\n');
              await app.vault.modify(file, newContent);
            }
          } catch (error) {
            console.error(`Failed to reset master class file ${file.path}:`, error);
          }
        }
      }
    }
  };

  const resetClassData = async (app: App, settings: GamificationPluginSettings) => {
    console.log('🔄 Resetting class data...');
    const classFolder = settings.classFolder || 'SkillTree/Master-Class/Class';
    const folder = app.vault.getAbstractFileByPath(classFolder);
    
    if (folder instanceof TFolder) {
      for (const file of folder.children) {
        if (file instanceof TFile && file.extension === 'md') {
          try {
            const content = await app.vault.read(file);
            const lines = content.split('\n');
            const yamlEndIndex = lines.findIndex((line: string, index: number) => index > 0 && line.trim() === '---');
            
            if (yamlEndIndex > 0) {
              // Parse existing frontmatter to preserve masterClass and description
              const frontmatter = lines.slice(1, yamlEndIndex).join('\n');
              const masterClassMatch = frontmatter.match(/^masterClass:\s*(.+)$/m);
              const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
              
              const masterClass = masterClassMatch ? masterClassMatch[1].trim() : 'Jester';
              const description = descMatch ? descMatch[1].trim() : 'No description provided';
              
              // Reset YAML frontmatter while preserving content
              const newYaml = [
                '---',
                'name: ' + file.basename,
                'masterClass: ' + masterClass,
                'level: 1',
                'currentCP: 0',
                'requiredCP: 100',
                'totalCP: 0',
                'description: ' + description,
                '---'
              ];
              const newContent = [...newYaml, ...lines.slice(yamlEndIndex + 1)].join('\n');
              await app.vault.modify(file, newContent);
            }
          } catch (error) {
            console.error(`Failed to reset class file ${file.path}:`, error);
          }
        }
      }
    }
  };

  const resetStatsData = async (app: App, settings: GamificationPluginSettings) => {
    console.log('🔄 Resetting stats data...');
    const statFolder = settings.statFolder || 'SkillTree/Master-Class/Stats';
    const folder = app.vault.getAbstractFileByPath(statFolder);
    
    if (folder instanceof TFolder) {
      for (const file of folder.children) {
        if (file instanceof TFile && file.extension === 'md') {
          try {
            const content = await app.vault.read(file);
            const lines = content.split('\n');
            const yamlEndIndex = lines.findIndex((line: string, index: number) => index > 0 && line.trim() === '---');
            
            if (yamlEndIndex > 0) {
              // Parse existing frontmatter to preserve code and description
              const frontmatter = lines.slice(1, yamlEndIndex).join('\n');
              const codeMatch = frontmatter.match(/^code:\s*(.+)$/m);
              const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
              
              const code = codeMatch ? codeMatch[1].trim() : file.basename.substring(0, 3).toUpperCase();
              const description = descMatch ? descMatch[1].trim() : 'No description provided';
              
              // Reset YAML frontmatter while preserving content
              const newYaml = [
                '---',
                'name: ' + file.basename,
                'code: ' + code,
                'value: 0',
                'description: ' + description,
                'level: 1',
                'currentCP: 0',
                'totalCP: 0',
                'requiredCP: 10',
                '---'
              ];
              const newContent = [...newYaml, ...lines.slice(yamlEndIndex + 1)].join('\n');
              await app.vault.modify(file, newContent);
            }
          } catch (error) {
            console.error(`Failed to reset stat file ${file.path}:`, error);
          }
        }
      }
    }
  };

  const resetPlayerProgress = async (app: App) => {
    console.log('🔄 Resetting player progress...');
    
    try {
      // Reset PlayerData.md to default values
      const resetData = {
        ...DEFAULT_PLAYER,
        // Preserve the current timestamp for lastDailyReset
        lastDailyReset: new Date().toISOString()
      };
      
      await updatePlayerData(app.vault, resetData);
      console.log('✅ Player progress reset successfully');
    } catch (error) {
      console.error('❌ Failed to reset player progress:', error);
      throw error;
    }
  };

  return (
    <div className={styles.settingsSection}>
      <Card className={styles.settingsCard}>
        <h3>🛡️ Backups & Restore</h3>
        {backups.length === 0 ? (
          <p>No backups yet. They’re created automatically on save.</p>
        ) : (
          <div className={styles.settingGroup}>
            {backups.slice(0, 5).map((b, i) => (
              <div key={b.path} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span>{i + 1}. {b.basename.replace('.md', '')}</span>
                <button
                  className={styles.resetButton}
                  onClick={async () => {
                    if (!app) return;
                    if (!confirm('Restore this backup? Current PlayerData.md will be overwritten.')) return;
                    await restorePlayerDataBackup(app.vault, b.path);
                    alert('Restored from backup. UI will refresh.');
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className={styles.settingsCard}>
        <h3>⚠️ Danger Zone</h3>
        <p className={styles.warningText}>
          These actions cannot be undone. Please backup your files before proceeding.
        </p>
        
        <div className={styles.resetButtonGroup}>
          <div className={styles.resetItem}>
            <h4>🎯 Reset Skills</h4>
            <p>Clear all skill progress and unlock status</p>
            <button
              className={`${styles.resetButton} ${confirmReset === 'skills' ? styles.confirmReset : ''}`}
              onClick={() => handleReset('skills')}
              disabled={isResetting}
            >
              {confirmReset === 'skills' ? '⚠️ Click Again to Confirm' : '🔄 Reset Skills'}
            </button>
          </div>

          <div className={styles.resetItem}>
            <h4>🏛️ Reset Master Class</h4>
            <p>Reset master class progress and selections</p>
            <button
              className={`${styles.resetButton} ${confirmReset === 'masterClass' ? styles.confirmReset : ''}`}
              onClick={() => handleReset('masterClass')}
              disabled={isResetting}
            >
              {confirmReset === 'masterClass' ? '⚠️ Click Again to Confirm' : '🔄 Reset Master Class'}
            </button>
          </div>

          <div className={styles.resetItem}>
            <h4>🎓 Reset Class</h4>
            <p>Reset current class progress and abilities</p>
            <button
              className={`${styles.resetButton} ${confirmReset === 'class' ? styles.confirmReset : ''}`}
              onClick={() => handleReset('class')}
              disabled={isResetting}
            >
              {confirmReset === 'class' ? '⚠️ Click Again to Confirm' : '🔄 Reset Class'}
            </button>
          </div>

          <div className={styles.resetItem}>
            <h4>📊 Reset Stats</h4>
            <p>Clear all statistics and metrics</p>
            <button
              className={`${styles.resetButton} ${confirmReset === 'stats' ? styles.confirmReset : ''}`}
              onClick={() => handleReset('stats')}
              disabled={isResetting}
            >
              {confirmReset === 'stats' ? '⚠️ Click Again to Confirm' : '🔄 Reset Stats'}
            </button>
          </div>

          <div className={styles.resetItem}>
            <h4>👤 Reset Player Progress</h4>
            <p>Reset XP, currency, levels, and achievements</p>
            <button
              className={`${styles.resetButton} ${styles.dangerButton} ${confirmReset === 'playerProgress' ? styles.confirmReset : ''}`}
              onClick={() => handleReset('playerProgress')}
              disabled={isResetting}
            >
              {confirmReset === 'playerProgress' ? '⚠️ Click Again to Confirm' : '🔄 Reset Player Progress'}
            </button>
          </div>
        </div>

        {isResetting && (
          <div className={styles.resetProgress}>
            <p>🔄 Resetting... Please wait.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

