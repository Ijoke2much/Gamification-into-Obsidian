import React, { useState, useEffect } from 'react';
import styles from './AddHabitForm.module.css';
import { getAllSkills, SkillMetadata } from '../../../shared/utils/skillDiscovery';
import { Vault } from 'obsidian';

interface HabitFormData {
    name: string;
    // Legacy single skill for compatibility
    skill: string;
    // New multiple skills list for richer linkage
    skills?: string[];
    skillColor: string;
    // New: type of habit - build (do more) vs avoid (do less)
    habitType: 'build' | 'avoid';
    difficulty: number;
    xpMultiplier: number;
    cpMultiplier: number;
    coinsMultiplier: number;
    // Icon from the primary selected skill
    primarySkillIcon?: string;
    // New: schedule configuration
    scheduleType?: 'daily' | 'weekly';
    /**
     * Days of week the habit should appear when scheduleType === 'weekly'
     * 0 = Sunday ... 6 = Saturday
     */
    scheduleDays?: number[];
}
  
  interface HabitFormProps {
    onSubmit: (habit: HabitFormData) => void;
    onCancel: () => void;
    vault: Vault;
    initialData?: HabitFormData;
    isEditing?: boolean;
  }
  
  const HabitForm: React.FC<HabitFormProps> = ({ onSubmit, onCancel, vault, initialData, isEditing = false }) => {
    const [formData, setFormData] = useState<HabitFormData>({
      name: initialData?.name || '',
      skill: initialData?.skill || '',
      skills: (initialData as any)?.skills || (initialData?.skill ? [initialData.skill] : []),
      skillColor: initialData?.skillColor || '',
      habitType: initialData?.habitType || 'build',
      difficulty: initialData?.difficulty || 1,
      xpMultiplier: initialData?.xpMultiplier || 10,
      cpMultiplier: initialData?.cpMultiplier || 5,
      coinsMultiplier: initialData?.coinsMultiplier || 3,
      primarySkillIcon: (initialData as any)?.primarySkillIcon,
      // Default schedule: daily on all days unless provided
      scheduleType: (initialData as any)?.scheduleType || 'daily',
      scheduleDays: (initialData as any)?.scheduleDays || [0, 1, 2, 3, 4, 5, 6]
    });

    const [skills, setSkills] = useState<SkillMetadata[]>([]);
    const [skillsLoading, setSkillsLoading] = useState(true);

    // Load skills from SkillTree
    useEffect(() => {
      const loadSkills = async () => {
        try {
          setSkillsLoading(true);
          const skillsData = await getAllSkills(vault);
          setSkills(skillsData);
        } catch (error) {
          console.error('Error loading skills:', error);
          // Fallback to empty array if skills can't be loaded
          setSkills([]);
        } finally {
          setSkillsLoading(false);
        }
      };

      loadSkills();
    }, [vault]);

    // Handle keyboard events for accessibility
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onCancel();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);
  
    // Generate a color for a skill based on its class
    const getSkillColor = (skillClass: string): string => {
      const colorMap: { [key: string]: string } = {
        'Physical': '#e74c3c',
        'Mental': '#3498db', 
        'Spiritual': '#9b59b6',
        'Creative': '#f39c12',
        'Social': '#27ae60',
        'Technical': '#8e44ad'
      };
      return colorMap[skillClass] || '#666666';
    };
  
    const getDifficultyStars = (difficulty: number) => {
      return '⭐'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
    };
  
    // Preview icon for the habit based on the primary associated skill,
    // falling back to any existing primarySkillIcon or a default star.
    const getHabitIconPreview = () => {
      const primarySkillName =
        (formData.skills && formData.skills[0]) || formData.skill || '';

      if (primarySkillName) {
        const meta = skills.find((s) => s.name === primarySkillName);
        if (meta?.icon) {
          return meta.icon;
        }
      }

      if (formData.primarySkillIcon) {
        return formData.primarySkillIcon;
      }

      return '⭐';
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const hasAnySkill = (formData.skills && formData.skills.length > 0) || !!formData.skill;
      if (formData.name.trim() && hasAnySkill) {
        // Determine primary skill for legacy fields
        const primarySkill = (formData.skills && formData.skills[0]) || formData.skill;
        const selectedSkill = skills.find(s => s.name === primarySkill);
        onSubmit({
          ...formData,
          skill: primarySkill,
          name: formData.name.trim(),
          skillColor: selectedSkill ? getSkillColor(selectedSkill.class) : '#666666',
          skills: formData.skills && formData.skills.length > 0 ? formData.skills : [primarySkill],
          primarySkillIcon: selectedSkill?.icon,
          // Ensure schedule fields are always populated on submit
          scheduleType: formData.scheduleType || 'daily',
          scheduleDays: (formData.scheduleDays && formData.scheduleDays.length > 0)
            ? formData.scheduleDays
            : [0, 1, 2, 3, 4, 5, 6]
        });
        setFormData({
          name: '',
          skill: '',
          skills: [],
          skillColor: '',
          habitType: 'build',
          difficulty: 1,
          xpMultiplier: 10,
          cpMultiplier: 5,
          coinsMultiplier: 3,
          primarySkillIcon: undefined,
          scheduleType: 'daily',
          scheduleDays: [0, 1, 2, 3, 4, 5, 6]
        });
      }
    };
  
    // Single-skill selection: keep skill and skills[0] in sync
    const handleSkillChange = (skillName: string) => {
      if (!skillName) {
        setFormData({
          ...formData,
          skill: '',
          skills: [],
          skillColor: ''
        });
        return;
      }

      const selectedSkill = skills.find((s) => s.name === skillName);
      setFormData({
        ...formData,
        skill: skillName,
        skills: [skillName],
        skillColor: selectedSkill ? getSkillColor(selectedSkill.class) : ''
      });
    };
  
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h3 className={styles.title}>{isEditing ? 'Edit Habit' : 'Create New Habit'}</h3>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Habit Type</label>
              <div className={styles.difficultyButtons}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, habitType: 'build' })}
                  className={`${styles.difficultyButton} ${formData.habitType === 'build' ? styles.selected : ''}`}
                >
                  Do more of this
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, habitType: 'avoid' })}
                  className={`${styles.difficultyButton} ${formData.habitType === 'avoid' ? styles.selected : ''}`}
                >
                  Avoid this
                </button>
              </div>
              <p className={styles.helpText}>
                For avoid habits (like “No eating out today”), mark it completed on days you successfully avoid the behavior.
              </p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Habit Name</label>
              <div className={styles.nameRow}>
                <div className={styles.iconPreview}>
                  {getHabitIconPreview()}
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={styles.input}
                  placeholder="Enter habit name..."
                  required
                />
              </div>
            </div>
            
            <div className={styles.field}>
              <label className={styles.label}>Associated Skills</label>
              <select
                value={formData.skill}
                onChange={(e) => handleSkillChange(e.target.value)}
                className={styles.select}
                disabled={skillsLoading}
              >
                <option value="">
                  {skillsLoading ? "Loading skills..." : skills.length > 0 ? "Select a skill..." : "No skills found in SkillTree"}
                </option>
                {!skillsLoading && skills
                  .map(skill => (
                  <option key={skill.name} value={skill.name}>
                    {skill.icon ? `${skill.icon} ` : ''}{skill.name} ({skill.class})
                  </option>
                ))}
              </select>

              {/* Class/Stats preview for the selected skill */}
              {!skillsLoading && formData.skill && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ padding: 10, border: '1px solid var(--background-modifier-border)', borderRadius: 8, background: 'var(--background-secondary)' }}>
                    {(() => {
                      const meta = skills.find(sk => sk.name === formData.skill);
                      if (!meta) return null;
                      return (
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ fontWeight: 600 }}>
                            {meta.name} — <span style={{ opacity: 0.85 }}>{meta.class}</span>
                          </div>
                          {meta.stats && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              {Object.keys(meta.stats).map(stat => (
                                <span key={stat} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 12, background: 'rgba(var(--interactive-accent-rgb),0.15)', color: 'var(--text-normal)' }}>{stat}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            
            {/* Schedule configuration */}
            <div className={styles.field}>
              <label className={styles.label}>Schedule</label>
              <div className={styles.difficultyButtons}>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      scheduleType: 'daily',
                      // daily implies all days are valid
                      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
                    })
                  }
                  className={`${styles.difficultyButton} ${
                    (formData.scheduleType || 'daily') === 'daily' ? styles.selected : ''
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      scheduleType: 'weekly',
                      // if user is switching for the first time, default to weekdays
                      scheduleDays:
                        formData.scheduleType === 'weekly' && formData.scheduleDays && formData.scheduleDays.length > 0
                          ? formData.scheduleDays
                          : [1, 2, 3, 4, 5],
                    })
                  }
                  className={`${styles.difficultyButton} ${
                    (formData.scheduleType || 'daily') === 'weekly' ? styles.selected : ''
                  }`}
                >
                  Weekly
                </button>
              </div>

              {(formData.scheduleType || 'daily') === 'weekly' && (
                <div className={styles.scheduleDaysRow}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => {
                    const isSelected = (formData.scheduleDays || []).includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const current = formData.scheduleDays || [];
                          const already = current.includes(index);
                          const next = already
                            ? current.filter((d) => d !== index)
                            : [...current, index].sort((a, b) => a - b);
                          setFormData({
                            ...formData,
                            scheduleDays: next.length > 0 ? next : [index],
                          });
                        }}
                        className={`${styles.dayChip} ${isSelected ? styles.dayChipSelected : ''}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              <p className={styles.helpText}>
                <strong>Daily</strong> shows every day. <strong>Weekly</strong> only shows on the days you pick
                in your habit list and streak views.
              </p>
            </div>
            
            <div className={styles.field}>
              <label className={styles.label}>Difficulty</label>
              <div className={styles.difficultyButtons}>
                {[1, 2, 3].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData({...formData, difficulty: level})}
                    className={`${styles.difficultyButton} ${
                      formData.difficulty === level ? styles.selected : ''
                    }`}
                  >
                    {getDifficultyStars(level)}
                  </button>
                ))}
              </div>
            </div>

            {/* Reward Multipliers */}
            <div className={styles.rewardsSection}>
              <label className={styles.label}>Reward Multipliers</label>
              <div className={styles.rewardsGrid}>
                <div className={styles.rewardField}>
                  <label className={styles.rewardLabel}>XP</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.xpMultiplier}
                    onChange={(e) => setFormData({...formData, xpMultiplier: parseInt(e.target.value) || 1})}
                    className={styles.rewardInput}
                  />
                </div>
                <div className={styles.rewardField}>
                  <label className={styles.rewardLabel}>CP</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.cpMultiplier}
                    onChange={(e) => setFormData({...formData, cpMultiplier: parseInt(e.target.value) || 1})}
                    className={styles.rewardInput}
                  />
                </div>
                <div className={styles.rewardField}>
                  <label className={styles.rewardLabel}>Coins</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.coinsMultiplier}
                    onChange={(e) => setFormData({...formData, coinsMultiplier: parseInt(e.target.value) || 1})}
                    className={styles.rewardInput}
                  />
                </div>
              </div>
              <div className={styles.rewardPreview}>
                {(() => { 
                  const obsidianWindow = window as Window & { app?: { plugins?: { plugins?: Record<string, { settings?: { currencyName?: string } }> } } };
                  const plugin = obsidianWindow?.app?.plugins?.plugins?.["Gamification-into-Obsidian"];
                  const currencyName = plugin?.settings?.currencyName || "Boogers"; 

                  const baseXp = formData.xpMultiplier * formData.difficulty;
                  const baseCp = formData.cpMultiplier * formData.difficulty;
                  const baseCoins = formData.coinsMultiplier * formData.difficulty;

                  // Simple 7‑day preview: treat it as a 2x bonus for clarity
                  const sevenDayMultiplier = 2;
                  const streakXp = Math.round(baseXp * sevenDayMultiplier);
                  const streakCp = Math.round(baseCp * sevenDayMultiplier);
                  const streakCoins = Math.round(baseCoins * sevenDayMultiplier);
                  const bonusPercent = Math.round((sevenDayMultiplier - 1) * 100);

                  return (
                    <div className={styles.rewardPreviewLines}>
                      <span>
                        <strong>Base completion reward:</strong>{' '}
                        {baseXp} XP, {baseCp} CP, {baseCoins} {currencyName}
                      </span>
                      <span className={styles.rewardPreviewAccent}>
                        <strong>7‑day streak bonus preview:</strong>{' '}
                        {streakXp} XP, {streakCp} CP, {streakCoins} {currencyName} (+{bonusPercent}%)
                      </span>
                      <p className={styles.rewardPreviewHint}>
                        Long streaks also grow your habit tree, which can drop <strong>materials</strong> and
                        boost XP / CP / {currencyName} for this skill.
                      </p>
                    </div>
                  ); 
                })()}
              </div>
            </div>
            
            <div className={styles.actions}>
              <button type="submit" className={styles.submitButton}>
                {isEditing ? 'Save Changes' : 'Create'}
              </button>
              <button type="button" onClick={onCancel} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  export default HabitForm;