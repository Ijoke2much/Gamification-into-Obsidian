import React, { useState, useEffect, useMemo } from 'react';
import { 
  GamificationPluginSettings, 
  validateSettings, 
  SETTINGS_PRESETS, 
  SettingsPreset,
  SETTINGS_CATEGORIES,
  SettingsCategory
} from '../../../core/settings';
import { Card } from '../../../shared/components/ui/Card';
import { ClickableTooltip } from '../../../shared/components/ui/ClickableTooltip';
import { TutorialSettingsPanel } from '../../tutorial/components/TutorialSettingsPanel';
import styles from './SettingsUI.module.css';

interface SettingsUIProps {
  settings: GamificationPluginSettings;
  onSettingsChange: (settings: GamificationPluginSettings) => void;
  onSave: () => Promise<void>;
}

type ViewMode = 'cards' | 'category';

export const SettingsUI: React.FC<SettingsUIProps> = ({
  settings,
  onSettingsChange,
  onSave
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [validation, setValidation] = useState(validateSettings(settings));
  const [isSaving, setIsSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Update validation when settings change
  useEffect(() => {
    setValidation(validateSettings(settings));
  }, [settings]);

  // Handle setting changes
  const updateSetting = (path: string, value: any) => {
    const newSettings = { ...settings };
    const keys = path.split('.');
    let current: any = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    onSettingsChange(newSettings);
  };

  // Apply preset
  const applyPreset = (preset: SettingsPreset) => {
    const newSettings = { ...settings, ...preset.settings };
    onSettingsChange(newSettings);
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

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return SETTINGS_CATEGORIES;
    return SETTINGS_CATEGORIES.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Get current category
  const currentCategory = selectedCategory 
    ? SETTINGS_CATEGORIES.find(cat => cat.id === selectedCategory)
    : null;

  // Handle category selection
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setViewMode('category');
  };

  // Go back to cards view
  const goBackToCards = () => {
    setSelectedCategory(null);
    setViewMode('cards');
  };

  // Render category cards
  const renderCategoryCards = () => (
    <div className={styles.cardsContainer}>
      <div className={styles.cardsGrid}>
        {filteredCategories.map((category) => (
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

  // Render category settings
  const renderCategorySettings = () => {
    if (!currentCategory) return null;

    return (
      <div className={styles.categorySettings}>
        <div className={styles.categoryHeader}>
          <button className={styles.backButton} onClick={goBackToCards}>
            ← Back to Categories
          </button>
          <h2 className={styles.categoryTitle}>
            {currentCategory.icon} {currentCategory.name}
          </h2>
          <p className={styles.categoryDescription}>{currentCategory.description}</p>
        </div>

        <div className={styles.settingsContent}>
          {currentCategory.id === 'currency' && (
            <CurrencySettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'quests' && (
            <QuestSettingsSection settings={settings} onSettingChange={updateSetting} />
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
          {currentCategory.id === 'tree' && (
            <TreeSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'tutorials' && (
            <TutorialSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'files' && (
            <FileSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
          {currentCategory.id === 'advanced' && (
            <AdvancedSettingsSection settings={settings} onSettingChange={updateSetting} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.settingsContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>🎮 Gamification Settings</h1>
          {viewMode === 'category' && currentCategory && (
            <div className={styles.breadcrumb}>
              <span onClick={goBackToCards} className={styles.breadcrumbLink}>
                Categories
              </span>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbCurrent}>
                {currentCategory.icon} {currentCategory.name}
              </span>
            </div>
          )}
        </div>
        <div className={styles.headerActions}>
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
      {viewMode === 'cards' && (
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Search settings categories..."
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
        {viewMode === 'cards' ? renderCategoryCards() : renderCategorySettings()}
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS SECTIONS
// ============================================================================

const CurrencySettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: any) => void;
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
  onSettingChange: (path: string, value: any) => void;
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
  onSettingChange: (path: string, value: any) => void;
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
  onSettingChange: (path: string, value: any) => void;
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
  onSettingChange: (path: string, value: any) => void;
}> = ({ settings, onSettingChange }) => (
  <div className={styles.settingsSection}>
    <Card className={styles.settingsCard}>
      <h3>🛒 Shop System Settings</h3>
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
  onSettingChange: (path: string, value: any) => void;
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

const TutorialSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: any) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <TutorialSettingsPanel />
  </div>
);

const FileSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: any) => void;
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
      </div>
    </Card>
  </div>
);

const AdvancedSettingsSection: React.FC<{
  settings: GamificationPluginSettings;
  onSettingChange: (path: string, value: any) => void;
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
