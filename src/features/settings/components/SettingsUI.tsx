import React, { useState, useEffect, useMemo } from 'react';
import { 
  GamificationPluginSettings, 
  validateSettings, 
  SETTINGS_PRESETS, 
  SettingsPreset,
  SETTINGS_GROUPS,
  DEFAULT_SETTINGS
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

interface SettingsUIProps {
  settings: GamificationPluginSettings;
  onSettingsChange: (settings: GamificationPluginSettings) => void;
  onSave: () => Promise<void>;
  app?: App; // Obsidian App instance for file operations
  plugin?: GamifiedObsidianPlugin;
}

type ViewMode = 'groups' | 'category';

export const SettingsUI: React.FC<SettingsUIProps> = ({
  settings,
  onSettingsChange,
  onSave,
  app,
  plugin,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [validation, setValidation] = useState(validateSettings(settings));
  const [isSaving, setIsSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showPreviews, setShowPreviews] = useState(true);

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
    onSettingsChange(newSettings as unknown as GamificationPluginSettings);
  };

  // Apply preset
  const applyPreset = (preset: SettingsPreset) => {
    if (preset.name === "Safe Defaults") {
      // For Safe Defaults, use the complete DEFAULT_SETTINGS
      onSettingsChange({ ...DEFAULT_SETTINGS });
    } else {
      const newSettings = { ...settings, ...preset.settings };
      onSettingsChange(newSettings);
    }
    setShowPresets(false);
  };

  // Save settings
  const handleSave = async () => {
    if (!validation.isValid) {
      alert('Please fix validation errors before saving');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return SETTINGS_GROUPS;
    return SETTINGS_GROUPS.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.categories.some(cat => 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm]);

  // Get current group and category
  const currentGroup = selectedGroup 
    ? SETTINGS_GROUPS.find(group => group.id === selectedGroup)
    : null;
  
  const currentCategory = selectedCategory 
    ? currentGroup?.categories.find(cat => cat.id === selectedCategory)
    : null;

  // Handle group selection
  const handleGroupClick = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedCategory(null);
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

  // Go back to group categories view
  const goBackToGroupCategories = () => {
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
          {currentGroup.categories.map((category) => (
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

    return (
      <div className={styles.categorySettings}>
        <div className={styles.categoryHeader}>
          <button className={styles.backButton} onClick={goBackToGroupCategories}>
            ← Back to {currentGroup.name}
          </button>
          <h2 className={styles.categoryTitle}>
            {currentCategory.icon} {currentCategory.name}
          </h2>
          <p className={styles.categoryDescription}>{currentCategory.description}</p>
          
          {/* Settings Preview */}
          {showPreviews && (
            <div className={styles.settingsPreview}>
              <h4>Current Settings Preview</h4>
              <div className={styles.previewGrid}>
                {getSettingsPreview(currentCategory.id)}
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
            <EnergySettingsSection settings={settings} onSettingChange={updateSetting} />
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
          {currentCategory.id === 'advanced-config' && (
            <AdvancedSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'theming' && (
            <AppearanceSettings 
              settings={settings} 
              onSettingsChange={(newSettings) => onSettingsChange({ ...settings, ...newSettings })} 
            />
          )}
          {currentCategory.id === 'internationalization' && (
            <AppearanceSettings 
              settings={settings} 
              onSettingsChange={(newSettings) => onSettingsChange({ ...settings, ...newSettings })} 
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
            <span className={styles.previewLabel}>Energy HUD:</span>
            <span className={styles.previewValue}>{settings.enableEnergyHUD ? 'Enabled' : 'Disabled'}</span>
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
            className={`${styles.saveButton} ${isSaving ? styles.saving : ''}`}
            onClick={handleSave}
            disabled={!validation.isValid || isSaving}
          >
            {isSaving ? '💾 Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {viewMode === 'groups' && (
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Search settings groups..."
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
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>⚡ Energy System Settings</h3>
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.enableEnergyHUD ?? true}
            onChange={(e) => onSettingChange('enableEnergyHUD', e.target.checked)}
          />
          Enable Energy HUD
        </label>
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
      <h3>🔄 Daily Restore Values</h3>
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
  </div>
);

const PenaltySettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
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

const ShopSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>🛒 Shop System Settings</h3>
      <p className={styles.helperText} style={{ marginTop: 0, marginBottom: '16px' }}>
        To add or edit shop items (written to Shop.md), go to{' '}
        <strong>Rewards &amp; Progression → Game data hub</strong> in these settings.
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
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.featureFlags?.enableAnalyticsTab ?? true}
            onChange={(e) => onSettingChange('featureFlags.enableAnalyticsTab', e.target.checked)}
          />
          Show Analytics Tab
        </label>
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
      </div>
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

const AdvancedSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: unknown) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>🔧 Advanced Configuration</h3>
      <p className={styles.advancedNote}>
        These are advanced settings for fine-tuning the energy and focus systems. 
        Only modify these if you understand their impact on gameplay balance.
      </p>
      
      <h4>Quest Energy Costs</h4>
      <div className={styles.settingGroup}>
        <h5>Easy Quests</h5>
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

      <div className={styles.settingGroup}>
        <h5>Medium Quests</h5>
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

      <div className={styles.settingGroup}>
        <h5>Hard Quests</h5>
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

