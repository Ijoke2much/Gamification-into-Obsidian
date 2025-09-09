import React, { useState } from 'react';
import { Boss, BossTheme, BossCreationOptions } from '../types/BossTypes';
import { createBoss } from '../utils/bossFactory';
import styles from './BossCreationModal.module.css';

interface BossCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    bossThemes: BossTheme[];
    onCreateBoss: (boss: Boss) => void;
}

export const BossCreationModal: React.FC<BossCreationModalProps> = ({
    isOpen,
    onClose,
    bossThemes,
    onCreateBoss
}) => {
    const [selectedTheme, setSelectedTheme] = useState<BossTheme | null>(null);
    const [bossName, setBossName] = useState('');
    const [bossDescription, setBossDescription] = useState('');
    const [bossType, setBossType] = useState<'mini-boss' | 'boss' | 'epic-boss' | 'legendary-boss'>('boss');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'epic' | 'legendary'>('medium');
    const [estimatedDuration, setEstimatedDuration] = useState('');
    const [enableTimer, setEnableTimer] = useState(false);
    const [multiPhase, setMultiPhase] = useState(false);
    const [customAvatar, setCustomAvatar] = useState('');
    const [customBackground, setCustomBackground] = useState('');

    if (!isOpen) return null;

    const handleThemeSelect = (theme: BossTheme) => {
        setSelectedTheme(theme);
        // Auto-fill some fields based on theme
        if (!bossName) {
            setBossName(`${theme.name} Boss`);
        }
        if (!bossDescription) {
            setBossDescription(`A challenging ${theme.name.toLowerCase()} boss that will test your skills.`);
        }
    };

    const handleCreateBoss = () => {
        if (!selectedTheme || !bossName.trim()) {
            alert('Please select a theme and enter a boss name');
            return;
        }

        const creationOptions: BossCreationOptions = {
            name: bossName.trim(),
            description: bossDescription.trim(),
            difficulty,
            bossType,
            bossTheme: selectedTheme.id,
            enableTimer,
            multiPhase,
            customAvatar: customAvatar || undefined,
            customBackground: customBackground || undefined,
            estimatedDuration: estimatedDuration || 'Unknown'
        };

        try {
            const newBoss = createBoss(creationOptions);
            onCreateBoss(newBoss);
            onClose();
        } catch (error) {
            console.error('Error creating boss:', error);
            alert('Failed to create boss. Please try again.');
        }
    };

    const handleClose = () => {
        // Reset form
        setSelectedTheme(null);
        setBossName('');
        setBossDescription('');
        setBossType('boss');
        setDifficulty('medium');
        setEstimatedDuration('');
        setEnableTimer(false);
        setMultiPhase(false);
        setCustomAvatar('');
        setCustomBackground('');
        onClose();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2>🎨 Create Custom Boss</h2>
                    <button className={styles.closeButton} onClick={handleClose}>
                        ×
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {/* Theme Selection */}
                    <div className={styles.section}>
                        <h3>🎭 Choose Boss Theme</h3>
                        <div className={styles.themeGrid}>
                            {bossThemes.map((theme) => (
                                <div
                                    key={theme.id}
                                    className={`${styles.themeCard} ${selectedTheme?.id === theme.id ? styles.selected : ''}`}
                                    onClick={() => handleThemeSelect(theme)}
                                >
                                    <div className={styles.themeIcon}>{theme.defaultAvatar}</div>
                                    <h4>{theme.name}</h4>
                                    <p>{theme.description}</p>
                                    <div className={styles.personality}>
                                        <span>Confidence: {theme.personality.confidence}</span>
                                        <span>Aggression: {theme.personality.aggression}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Boss Details */}
                    {selectedTheme && (
                        <div className={styles.section}>
                            <h3>⚔️ Boss Details</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Boss Name</label>
                                    <input
                                        type="text"
                                        value={bossName}
                                        onChange={(e) => setBossName(e.target.value)}
                                        placeholder="Enter boss name..."
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Description</label>
                                    <textarea
                                        value={bossDescription}
                                        onChange={(e) => setBossDescription(e.target.value)}
                                        placeholder="Describe your boss..."
                                        className={styles.textarea}
                                        rows={3}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Boss Type</label>
                                    <select
                                        value={bossType}
                                        onChange={(e) => setBossType(e.target.value as any)}
                                        className={styles.select}
                                    >
                                        <option value="mini-boss">Mini Boss</option>
                                        <option value="boss">Boss</option>
                                        <option value="epic-boss">Epic Boss</option>
                                        <option value="legendary-boss">Legendary Boss</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Difficulty</label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value as any)}
                                        className={styles.select}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                        <option value="epic">Epic</option>
                                        <option value="legendary">Legendary</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Estimated Duration</label>
                                    <input
                                        type="text"
                                        value={estimatedDuration}
                                        onChange={(e) => setEstimatedDuration(e.target.value)}
                                        placeholder="e.g., 2 hours, 3 days"
                                        className={styles.input}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Battle Options */}
                    {selectedTheme && (
                        <div className={styles.section}>
                            <h3>⚙️ Battle Options</h3>
                            <div className={styles.optionsGrid}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={enableTimer}
                                        onChange={(e) => setEnableTimer(e.target.checked)}
                                    />
                                    <span>Enable Timer Battle</span>
                                </label>

                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={multiPhase}
                                        onChange={(e) => setMultiPhase(e.target.checked)}
                                    />
                                    <span>Multi-Phase Boss</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Custom Assets */}
                    {selectedTheme && (
                        <div className={styles.section}>
                            <h3>🎨 Custom Assets (Optional)</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Custom Avatar URL</label>
                                    <input
                                        type="text"
                                        value={customAvatar}
                                        onChange={(e) => setCustomAvatar(e.target.value)}
                                        placeholder="https://example.com/avatar.png"
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Custom Background URL</label>
                                    <input
                                        type="text"
                                        value={customBackground}
                                        onChange={(e) => setCustomBackground(e.target.value)}
                                        placeholder="https://example.com/background.png"
                                        className={styles.input}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {selectedTheme && (
                        <div className={styles.section}>
                            <h3>👁️ Boss Preview</h3>
                            <div className={styles.previewCard}>
                                <div className={styles.previewAvatar}>
                                    {customAvatar ? (
                                        <img src={customAvatar} alt="Custom Avatar" />
                                    ) : (
                                        <span>{selectedTheme.defaultAvatar}</span>
                                    )}
                                </div>
                                <div className={styles.previewInfo}>
                                    <h4>{bossName || 'Boss Name'}</h4>
                                    <p>{bossDescription || 'Boss description...'}</p>
                                    <div className={styles.previewStats}>
                                        <span className={styles.stat}>Type: {bossType}</span>
                                        <span className={styles.stat}>Difficulty: {difficulty}</span>
                                        {estimatedDuration && <span className={styles.stat}>Duration: {estimatedDuration}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.cancelButton} onClick={handleClose}>
                        Cancel
                    </button>
                    <button
                        className={styles.createButton}
                        onClick={handleCreateBoss}
                        disabled={!selectedTheme || !bossName.trim()}
                    >
                        🐉 Create Boss
                    </button>
                </div>
            </div>
        </div>
    );
};
