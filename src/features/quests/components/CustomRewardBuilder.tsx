import React, { useState, useEffect } from 'react';
import { CraftingMaterial } from '../../crafting/types/CraftingTypes';
import { CraftingEngine } from '../../crafting/utils/craftingEngine';
import { QuestRewardItem, getRarityColor, getRarityDisplayName } from '../utils/questRewardsSystem';
import { IconPicker } from '../../inventory/utils/iconPicker';
import styles from './CustomRewardBuilder.module.css';

export interface CustomRewardBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onAddReward: (reward: EnhancedCustomReward) => void;
  isMobile?: boolean;
}

export interface EnhancedCustomReward {
  name: string;
  type: 'item' | 'material' | 'effect';
  category?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: string;
  description: string;
  quantity: number;
  
  // For materials
  materialData?: {
    category: 'herb' | 'mineral' | 'essence' | 'crystal' | 'organic' | 'mystical';
    quality: 'fresh' | 'normal' | 'dried' | 'refined' | 'masterwork';
    baseValue: number;
  };
  
  // For items with effects
  effects?: string[];
  
  // For existing items
  existingItem?: QuestRewardItem;
}

const MATERIAL_CATEGORIES = [
  { id: 'herb', name: 'Herb', icon: '🌿', description: 'Medicinal and alchemical plants' },
  { id: 'mineral', name: 'Mineral', icon: '⛏️', description: 'Ores and precious metals' },
  { id: 'essence', name: 'Essence', icon: '✨', description: 'Pure magical energy' },
  { id: 'crystal', name: 'Crystal', icon: '💎', description: 'Crystallized materials' },
  { id: 'organic', name: 'Organic', icon: '🪵', description: 'Living or once-living materials' },
  { id: 'mystical', name: 'Mystical', icon: '🌌', description: 'Otherworldly materials' }
] as const;

const MATERIAL_QUALITIES = [
  { id: 'fresh', name: 'Fresh', multiplier: 1.5, color: '#10b981', description: 'Recently gathered, high potency' },
  { id: 'normal', name: 'Normal', multiplier: 1.0, color: '#6b7280', description: 'Standard quality' },
  { id: 'dried', name: 'Dried', multiplier: 0.8, color: '#f59e0b', description: 'Aged, unique properties' },
  { id: 'refined', name: 'Refined', multiplier: 1.3, color: '#3b82f6', description: 'Processed for purity' },
  { id: 'masterwork', name: 'Masterwork', multiplier: 2.0, color: '#a855f7', description: 'Exceptional quality' }
] as const;

const EFFECT_PRESETS = [
  { name: 'XP Boost (1h)', effect: 'buff:xp;mult=1.2;dur=1h', description: '+20% XP for 1 hour' },
  { name: 'Coin Bonus', effect: 'coins:+50', description: 'Immediate 50 coins' },
  { name: 'CP Boost (30m)', effect: 'buff:cp;mult=1.3;dur=30m', description: '+30% CP for 30 minutes' },
  { name: 'Focus Session', effect: 'artifact:Deep work:60:productivity', description: '60-minute focus artifact' },
  { name: 'Study Boost', effect: 'artifact:Study session:45:education', description: '45-minute study artifact' },
  { name: 'Creative Flow', effect: 'artifact:Creative work:90:art', description: '90-minute creative artifact' }
];

export const CustomRewardBuilder: React.FC<CustomRewardBuilderProps> = ({
  isOpen,
  onClose,
  onAddReward,
  isMobile = false
}) => {
  const [rewardType, setRewardType] = useState<'item' | 'material' | 'effect'>('material');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rarity, setRarity] = useState<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'>('common');
  const [icon, setIcon] = useState('💎');
  const [quantity, setQuantity] = useState(1);
  
  // Material specific
  const [materialCategory, setMaterialCategory] = useState<'herb' | 'mineral' | 'essence' | 'crystal' | 'organic' | 'mystical'>('mineral');
  const [materialQuality, setMaterialQuality] = useState<'fresh' | 'normal' | 'dried' | 'refined' | 'masterwork'>('normal');
  const [baseValue, setBaseValue] = useState(5);
  
  // Effect specific
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [customEffect, setCustomEffect] = useState('');
  
  // Icon picker
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  // Available materials for reference
  const [availableMaterials, setAvailableMaterials] = useState<CraftingMaterial[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load available crafting materials for reference
      const materials = CraftingEngine.getDefaultMaterials();
      setAvailableMaterials(materials);
    }
  }, [isOpen]);

  // Auto-set base value based on rarity and quality
  useEffect(() => {
    const rarityMultipliers = { common: 1, uncommon: 3, rare: 8, epic: 20, legendary: 50 };
    const qualityData = MATERIAL_QUALITIES.find(q => q.id === materialQuality);
    const baseRarityValue = rarityMultipliers[rarity];
    const qualityMultiplier = qualityData?.multiplier || 1.0;
    setBaseValue(Math.round(baseRarityValue * qualityMultiplier));
  }, [rarity, materialQuality]);

  const handleAddEffect = (effect: string) => {
    if (effect && !selectedEffects.includes(effect)) {
      setSelectedEffects([...selectedEffects, effect]);
    }
  };

  const handleRemoveEffect = (index: number) => {
    setSelectedEffects(selectedEffects.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const reward: EnhancedCustomReward = {
      name: name.trim(),
      type: rewardType,
      rarity,
      icon,
      description: description.trim(),
      quantity
    };

    if (rewardType === 'material') {
      reward.materialData = {
        category: materialCategory,
        quality: materialQuality,
        baseValue
      };
      reward.category = 'material';
    } else if (rewardType === 'effect') {
      reward.effects = [...selectedEffects];
      if (customEffect.trim()) {
        reward.effects.push(customEffect.trim());
      }
      reward.category = 'consumable';
    }

    onAddReward(reward);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setName('');
    setDescription('');
    setRarity('common');
    setIcon('💎');
    setQuantity(1);
    setMaterialCategory('mineral');
    setMaterialQuality('normal');
    setBaseValue(5);
    setSelectedEffects([]);
    setCustomEffect('');
  };

  if (!isOpen) return null;

  const containerStyle = isMobile ? styles.mobileContainer : styles.desktopContainer;

  return (
    <div className={styles.overlay}>
      <div className={containerStyle}>
        <div className={styles.header}>
          <h3>🎁 Create Custom Reward</h3>
          <button type="button" onClick={onClose} className={styles.closeButton}>✕</button>
        </div>

        <div className={styles.content}>
          {/* Reward Type Selection */}
          <div className={styles.section}>
            <label className={styles.label}>Reward Type</label>
            <div className={styles.typeSelector}>
              <button
                type="button"
                className={`${styles.typeButton} ${rewardType === 'material' ? styles.active : ''}`}
                onClick={() => setRewardType('material')}
              >
                💎 Crafting Material
              </button>
              <button
                type="button"
                className={`${styles.typeButton} ${rewardType === 'effect' ? styles.active : ''}`}
                onClick={() => setRewardType('effect')}
              >
                ✨ Effect Item
              </button>
              <button
                type="button"
                className={`${styles.typeButton} ${rewardType === 'item' ? styles.active : ''}`}
                onClick={() => setRewardType('item')}
              >
                ⚔️ Equipment/Artifact
              </button>
            </div>
          </div>

          {/* Basic Properties */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter reward name..."
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                min={1}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your custom reward..."
              className={styles.textarea}
              rows={2}
            />
          </div>

          {/* Rarity and Icon */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Rarity</label>
              <select
                value={rarity}
                onChange={(e) => setRarity(e.target.value as any)}
                className={styles.select}
              >
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Icon</label>
              <div className={styles.iconSelector}>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className={styles.iconButton}
                >
                  {icon}
                </button>
                <span className={styles.iconHint}>Click to change</span>
              </div>
            </div>
          </div>

          {/* Material-specific fields */}
          {rewardType === 'material' && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>🔨 Crafting Material Properties</h4>
              
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Category</label>
                  <select
                    value={materialCategory}
                    onChange={(e) => setMaterialCategory(e.target.value as any)}
                    className={styles.select}
                  >
                    {MATERIAL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Quality</label>
                  <select
                    value={materialQuality}
                    onChange={(e) => setMaterialQuality(e.target.value as any)}
                    className={styles.select}
                  >
                    {MATERIAL_QUALITIES.map(quality => (
                      <option key={quality.id} value={quality.id}>
                        {quality.name} (×{quality.multiplier})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Base CP Value: {baseValue}</label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={baseValue}
                  onChange={(e) => setBaseValue(Number(e.target.value))}
                  className={styles.slider}
                />
              </div>

              <div className={styles.materialPreview}>
                <h5>📋 Material Preview</h5>
                <div className={styles.previewCard} style={{ borderColor: getRarityColor(rarity) }}>
                  <div className={styles.previewHeader}>
                    <span className={styles.previewIcon}>{icon}</span>
                    <span className={styles.previewName} style={{ color: getRarityColor(rarity) }}>
                      {name || 'Custom Material'}
                    </span>
                    <span className={styles.previewRarity}>
                      {getRarityDisplayName(rarity)}
                    </span>
                  </div>
                  <div className={styles.previewDetails}>
                    <span>Category: {MATERIAL_CATEGORIES.find(c => c.id === materialCategory)?.name}</span>
                    <span>Quality: {MATERIAL_QUALITIES.find(q => q.id === materialQuality)?.name}</span>
                    <span>Value: {baseValue} CP</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Effect-specific fields */}
          {rewardType === 'effect' && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>⚡ Effect Properties</h4>
              
              <div className={styles.effectPresets}>
                <label className={styles.label}>Quick Effects</label>
                <div className={styles.presetGrid}>
                  {EFFECT_PRESETS.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAddEffect(preset.effect)}
                      className={styles.presetButton}
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Custom Effect</label>
                <input
                  type="text"
                  value={customEffect}
                  onChange={(e) => setCustomEffect(e.target.value)}
                  placeholder="e.g., buff:xp;mult=1.5;dur=2h"
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customEffect.trim()) {
                      handleAddEffect(customEffect.trim());
                      setCustomEffect('');
                    }
                  }}
                  className={styles.addButton}
                >
                  Add Effect
                </button>
              </div>

              {selectedEffects.length > 0 && (
                <div className={styles.selectedEffects}>
                  <label className={styles.label}>Selected Effects</label>
                  {selectedEffects.map((effect, index) => (
                    <div key={index} className={styles.effectTag}>
                      <span>{effect}</span>
                      <button type="button" onClick={() => handleRemoveEffect(index)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {name && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>👀 Preview</h4>
              <div className={styles.rewardPreview}>
                <div className={styles.previewCard} style={{ borderColor: getRarityColor(rarity) }}>
                  <div className={styles.previewHeader}>
                    <span className={styles.previewIcon}>{icon}</span>
                    <span className={styles.previewName} style={{ color: getRarityColor(rarity) }}>
                      {name} {quantity > 1 && `x${quantity}`}
                    </span>
                    <span className={styles.previewRarity}>
                      {getRarityDisplayName(rarity)}
                    </span>
                  </div>
                  {description && (
                    <div className={styles.previewDescription}>{description}</div>
                  )}
                  {rewardType === 'material' && (
                    <div className={styles.previewTags}>
                      <span className={styles.tag}>🔨 Crafting Material</span>
                      <span className={styles.tag}>{baseValue} CP</span>
                    </div>
                  )}
                  {rewardType === 'effect' && selectedEffects.length > 0 && (
                    <div className={styles.previewTags}>
                      {selectedEffects.slice(0, 2).map((effect, i) => (
                        <span key={i} className={styles.tag}>⚡ {effect.split(':')[0]}</span>
                      ))}
                      {selectedEffects.length > 2 && (
                        <span className={styles.tag}>+{selectedEffects.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className={styles.createButton}
          >
            Create Reward
          </button>
        </div>

        {/* Icon Picker Modal */}
        {showIconPicker && (
          <div className={styles.iconPickerOverlay}>
            <div className={styles.iconPickerModal}>
              <div className={styles.iconPickerHeader}>
                <h4>Choose Icon</h4>
                <button type="button" onClick={() => setShowIconPicker(false)}>✕</button>
              </div>
              <div className={styles.iconGrid}>
                {IconPicker.getIconCategories().map(category => (
                  <div key={category.name} className={styles.iconCategory}>
                    <h5>{category.icon} {category.name}</h5>
                    <div className={styles.iconList}>
                      {category.icons.map(iconOption => (
                        <button
                          key={iconOption}
                          type="button"
                          onClick={() => {
                            setIcon(iconOption);
                            setShowIconPicker(false);
                          }}
                          className={`${styles.iconOption} ${icon === iconOption ? styles.selected : ''}`}
                        >
                          {iconOption}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
