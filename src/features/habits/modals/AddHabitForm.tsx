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
    difficulty: number;
    xpMultiplier: number;
    cpMultiplier: number;
    coinsMultiplier: number;
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
      difficulty: initialData?.difficulty || 1,
      xpMultiplier: initialData?.xpMultiplier || 10,
      cpMultiplier: initialData?.cpMultiplier || 5,
      coinsMultiplier: initialData?.coinsMultiplier || 3
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
          skills: formData.skills && formData.skills.length > 0 ? formData.skills : [primarySkill]
        });
        setFormData({ name: '', skill: '', skills: [], skillColor: '', difficulty: 1, xpMultiplier: 10, cpMultiplier: 5, coinsMultiplier: 3 });
      }
    };
  
    // Add a skill to the multi-select list
    const addSkill = (skillName: string) => {
      if (!skillName) return;
      const updated = new Set([...(formData.skills || []), skillName]);
      const primary = [...updated][0] || '';
      const selectedSkill = skills.find(s => s.name === primary);
      setFormData({
        ...formData,
        skill: primary,
        skills: [...updated],
        skillColor: selectedSkill ? getSkillColor(selectedSkill.class) : ''
      });
    };

    // Remove a skill from the list
    const removeSkill = (skillName: string) => {
      const remaining = (formData.skills || []).filter(s => s !== skillName);
      const primary = remaining[0] || '';
      const selectedSkill = skills.find(s => s.name === primary);
      setFormData({
        ...formData,
        skill: primary,
        skills: remaining,
        skillColor: selectedSkill ? getSkillColor(selectedSkill.class) : ''
      });
    };
  
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h3 className={styles.title}>{isEditing ? 'Edit Habit' : 'Create New Habit'}</h3>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Habit Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={styles.input}
                placeholder="Enter habit name..."
                required
              />
            </div>
            
            <div className={styles.field}>
              <label className={styles.label}>Associated Skills</label>
              <select
                value=""
                onChange={(e) => addSkill(e.target.value)}
                className={styles.select}
                disabled={skillsLoading}
              >
                <option value="">
                  {skillsLoading ? "Loading skills..." : skills.length > 0 ? "Add a skill..." : "No skills found in SkillTree"}
                </option>
                {!skillsLoading && skills
                  .filter(s => !(formData.skills || []).includes(s.name))
                  .map(skill => (
                  <option key={skill.name} value={skill.name}>
                    {skill.name} ({skill.class})
                  </option>
                ))}
              </select>

              {/* Selected skills chips and preview */}
              {(formData.skills && formData.skills.length > 0) && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {(formData.skills || []).map(s => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 14, background: 'var(--interactive-accent)', color: '#fff', fontSize: 12 }}>
                        {s}
                        <button type="button" onClick={() => removeSkill(s)} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
                      </span>
                    ))}
                  </div>

                  {/* Class/Stats preview like quest modal */}
                  <div style={{ padding: 10, border: '1px solid var(--background-modifier-border)', borderRadius: 8, background: 'var(--background-secondary)' }}>
                    {(formData.skills || []).map(skillName => {
                      const meta = skills.find(sk => sk.name === skillName);
                      if (!meta) return null;
                      return (
                        <div key={skillName} style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600 }}>{meta.name} — <span style={{ opacity: 0.85 }}>{meta.class}</span></div>
                          {meta.stats && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              {Object.keys(meta.stats).map(stat => (
                                <span key={stat} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 12, background: 'rgba(var(--interactive-accent-rgb),0.15)', color: 'var(--text-normal)' }}>{stat}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                  const plugin = obsidianWindow?.app?.plugins?.plugins?.["Gamification-into-Obsidian"] || obsidianWindow?.app?.plugins?.plugins?.["Gamification-into-Obsidian"];
                  const currencyName = plugin?.settings?.currencyName || "Coins"; 
                  return (
                    <span>Preview: {formData.xpMultiplier * formData.difficulty} XP, {formData.cpMultiplier * formData.difficulty} CP, {formData.coinsMultiplier * formData.difficulty} {currencyName}</span>
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