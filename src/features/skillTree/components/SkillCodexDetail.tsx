import React from 'react';
import type { SkillMetadata, ClassMetadata } from '../../../shared/utils/skillDiscovery';
import { skillToProgressView } from '../utils/skillProgressView';
import { useMobileOptimizations } from '../../../shared/hooks/useMobileOptimizations';
import styles from './SkillCodexDetail.module.css';

export interface SkillCodexDetailProps {
    skill: SkillMetadata;
    classMeta: ClassMetadata | undefined;
    onClose: () => void;
    onOpenInVault: (skill: SkillMetadata) => void;
}

export const SkillCodexDetail: React.FC<SkillCodexDetailProps> = ({
    skill,
    classMeta,
    onClose,
    onOpenInVault
}) => {
    const { isMobile } = useMobileOptimizations();
    const displayIcon = (skill.icon || '').trim() || '📜';
    const statNames = Object.keys(skill.stats || {}).filter(Boolean);
    const p = skillToProgressView(skill);
    const level = p.currentLevel;
    const cp = p.currentCP;
    const required = p.requiredCP;

    return (
        <div
            className={`${styles.backdrop}${isMobile ? ` ${styles.backdropMobile}` : ''}`}
            data-skill-codex-detail="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-skill-title"
            onClick={onClose}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
        >
            <div
                className={`${styles.panel}${isMobile ? ` ${styles.panelMobile}` : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.headerRow}>
                    <div className={styles.iconBox}>{displayIcon}</div>
                    <div className={styles.titleBlock}>
                        <h2 id="codex-skill-title" className={styles.skillName}>
                            {skill.name}
                        </h2>
                        {skill.epithet ? (
                            <p className={styles.epithet}>“{skill.epithet}”</p>
                        ) : null}
                    </div>
                </div>

                <div className={styles.classRow}>
                    <span className={styles.classIcon}>
                        {(classMeta?.icon || '').trim() || '⚔️'}
                    </span>
                    <div className={styles.classText}>
                        <p className={styles.className}>{skill.class}</p>
                        {classMeta?.tagline ? (
                            <p className={styles.classTagline}>{classMeta.tagline}</p>
                        ) : null}
                    </div>
                </div>

                <div className={styles.statGrid}>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>Rank</span>
                        <span className={styles.statValue}>
                            Lv.{level}
                        </span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>CP</span>
                        <span className={styles.statValue}>
                            {cp}/{required}
                        </span>
                    </div>
                </div>

                {statNames.length > 0 ? (
                    <div>
                        <span className={styles.statLabel}>Linked stats</span>
                        <ul className={styles.linkedStats}>
                            {statNames.map((name) => (
                                <li key={name}>{name}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {skill.description ? (
                    <p className={styles.bodyText}>{skill.description}</p>
                ) : (
                    <p className={styles.bodyText}>
                        No tale written yet — open the grimoire to add lore.
                    </p>
                )}

                {!isMobile ? (
                    <p className={styles.pathNote}>{skill.filePath}</p>
                ) : null}

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={() => onOpenInVault(skill)}
                    >
                        Open grimoire
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SkillCodexDetail;
