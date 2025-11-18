import React, { useState, useEffect, useRef, memo } from "react";
import { TFile } from "obsidian";
import type { Quest } from "../utils/taskParser";
import { formatRecur, parseEstimatedMinutes, formatMinutesHuman } from "../utils/questDisplayUtils";
import styles from "./CinematicQuestCard.module.css";

interface PluginType {
    app: {
        vault: {
            getAbstractFileByPath: (path: string) => TFile | null;
            readBinary: (file: TFile) => Promise<ArrayBuffer>;
        };
    };
    enhancedQuestSystem?: {
        getCachedBanner: (title: string) => string | null;
        loadBannerAsDataUrl: (path: string) => Promise<string | null>;
    };
}

interface CinematicQuestCardProps {
    quest: Quest;
    plugin?: PluginType;
    onEdit: (quest: Quest) => void;
    onToggleSubtask: (questTitle: string, subtaskIndex: number) => void;
    onCompleteQuest: (questTitle: string) => void;
    onUncompleteQuest?: (questTitle: string) => void;
    onDeleteQuest?: (questTitle: string) => void;
    onFailQuest?: (questTitle: string) => void;
    onToggleFavorite?: (questTitle: string) => void;
    collapsed?: boolean;
    bulkMode?: boolean;
    isSelected?: boolean;
    onSelect?: (questTitle: string) => void;
}

const CinematicQuestCardComponent: React.FC<CinematicQuestCardProps> = ({
    quest,
    plugin,
    onEdit,
    onToggleSubtask,
    onCompleteQuest,
    
    onUncompleteQuest,
    onDeleteQuest,
    onFailQuest,
    onToggleFavorite,
    collapsed = false,
    bulkMode = false,
    isSelected = false,
    onSelect,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null);
    const [bannerError, setBannerError] = useState(false);

    // Intersection observer to defer heavy banner work until visible/expanded
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!rootRef.current) return;
        const elem = rootRef.current;
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                setIsVisible(entry.isIntersecting);
            },
            { root: null, rootMargin: '200px 0px', threshold: 0.01 }
        );
        observer.observe(elem);
        return () => observer.unobserve(elem);
    }, []);

    // Enhanced banner loading using the enhanced quest system (deferred)
    useEffect(() => {
        async function loadBannerImage() {
            // Only load when card is visible and not collapsed; if collapsible, also prefer when expanded
            const shouldLoad = !collapsed && isVisible && (!!plugin);
            if (!quest.banner || !plugin || !shouldLoad) {
                setBannerDataUrl(null);
                return;
            }

            setBannerError(false);

            try {
                // First try to get cached banner from enhanced quest system
                if (plugin.enhancedQuestSystem) {
                    const cachedBanner = plugin.enhancedQuestSystem.getCachedBanner(quest.title);
                    if (cachedBanner) {
                        setBannerDataUrl(cachedBanner);
                        return;
                    }
                    
                    // If not cached, load it through the enhanced system
                    const bannerDataUrl = await plugin.enhancedQuestSystem.loadBannerAsDataUrl(quest.banner);
                    if (bannerDataUrl) {
                        setBannerDataUrl(bannerDataUrl);
                        return;
                    }
                }

                // Fallback to original loading method
                if (quest.banner.startsWith("data:") || quest.banner.startsWith("http")) {
                    setBannerDataUrl(quest.banner);
                    return;
                }

                const vaultFile = plugin.app.vault.getAbstractFileByPath(quest.banner);
                if (vaultFile && vaultFile instanceof TFile) {
                    const data = await plugin.app.vault.readBinary(vaultFile);
                    const ext = quest.banner.split(".").pop()?.toLowerCase() || "jpg";
                    const mime =
                        ext === "png"
                            ? "image/png"
                            : ext === "gif"
                            ? "image/gif"
                            : "image/jpeg";
                    const base64 = arrayBufferToBase64(data);
                    setBannerDataUrl(`data:${mime};base64,${base64}`);
                    return;
                }
            } catch (e) {
                console.error("Failed to load quest banner:", e);
                setBannerError(true);
            }
            setBannerError(true);
        }

        function arrayBufferToBase64(buffer: ArrayBuffer) {
            let binary = "";
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }

        loadBannerImage();
    }, [quest.banner, plugin, collapsed, isVisible]);

    

    // Calculate completion progress for multi-step quests
    const getCompletionProgress = () => {
        if (!quest.subtasks || quest.subtasks.length === 0) {
            return quest.completed ? 100 : 0;
        }
        const completedSubtasks = quest.subtasks.filter(st => st.completed).length;
        return Math.round((completedSubtasks / quest.subtasks.length) * 100);
    };

    const completionProgress = getCompletionProgress();


	const estimatedMinutes = parseEstimatedMinutes(quest.estimatedTime);
	const recurLabel = formatRecur(quest.recur);

    // Get quest category styling based on skills or tags
    const getQuestCategory = () => {
        const skills = quest.skills || [];
        
        if (skills.some(s => ['writing', 'creative', 'journal'].includes(s.toLowerCase()))) {
            return { 
                label: 'CREATIVE QUEST', 
                color: '#9333ea',
                bgColor: 'rgba(147, 51, 234, 0.1)',
                borderColor: 'rgba(147, 51, 234, 0.3)',
                icon: '🎨'
            };
        }
        if (skills.some(s => ['coding', 'programming', 'tech', 'development'].includes(s.toLowerCase()))) {
            return { 
                label: 'TECH QUEST', 
                color: '#0ea5e9',
                bgColor: 'rgba(14, 165, 233, 0.1)',
                borderColor: 'rgba(14, 165, 233, 0.3)',
                icon: '💻'
            };
        }
        if (skills.some(s => ['fitness', 'exercise', 'health', 'workout', 'body builder'].includes(s.toLowerCase()))) {
            return { 
                label: 'FITNESS QUEST', 
                color: '#22c55e',
                bgColor: 'rgba(34, 197, 94, 0.1)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
                icon: '🏃'
            };
        }
        if (skills.some(s => ['learning', 'study', 'education', 'research'].includes(s.toLowerCase()))) {
            return { 
                label: 'KNOWLEDGE QUEST', 
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                icon: '📚'
            };
        }
        if (skills.some(s => ['business', 'work', 'professional'].includes(s.toLowerCase()))) {
            return { 
                label: 'CAREER QUEST', 
                color: '#8b5cf6',
                bgColor: 'rgba(139, 92, 246, 0.1)',
                borderColor: 'rgba(139, 92, 246, 0.3)',
                icon: '💼'
            };
        }
        
        // Default based on priority
        if (quest.priority === 'high' || quest.priority === 'highest') {
            return { 
                label: 'URGENT QUEST', 
                color: '#ef4444',
                bgColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                icon: '⚡'
            };
        }
        
        return { 
            label: 'MAIN QUEST', 
            color: '#fbbf24',
            bgColor: 'rgba(251, 191, 36, 0.1)',
            borderColor: 'rgba(251, 191, 36, 0.3)',
            icon: '⭐'
        };
    };

    const category = getQuestCategory();

    // Get difficulty styling
    const getDifficultyInfo = () => {
        switch (quest.difficulty?.toLowerCase()) {
            case 'hard':
                return { stars: '★★★', level: 'HARD', color: '#ef4444' };
            case 'medium':
                return { stars: '★★☆', level: 'MEDIUM', color: '#f59e0b' };
            case 'easy':
                return { stars: '★☆☆', level: 'EASY', color: '#22c55e' };
            default:
                return { stars: '★☆☆', level: 'EASY', color: '#6b7280' };
        }
    };

    const difficulty = getDifficultyInfo();

    // Get due date info
    const getDueDateInfo = () => {
        if (!quest.due) return { text: 'No Due Date', color: '#6b7280', urgent: false };
        
        // Handle both date-only and datetime formats
        const hasTime = quest.due.includes('T');
        
        // Ensure proper ISO format with seconds for reliable parsing
        let dateStr = quest.due;
        if (hasTime && !quest.due.includes(':00', quest.due.lastIndexOf(':'))) {
            // Add seconds if missing (e.g., 2025-09-30T16:57 -> 2025-09-30T16:57:00)
            dateStr = quest.due + ':00';
        } else if (!hasTime) {
            // Add time for date-only format
            dateStr = quest.due + 'T00:00:00';
        }
        
        const due = new Date(dateStr);
        
        // Validate the date object
        if (isNaN(due.getTime())) {
            console.error('[CinematicQuestCard] Invalid date format:', quest.due);
            return { text: 'Invalid Date', color: '#ef4444', urgent: false };
        }
        
        const now = new Date();
        
        // Compare dates at day level, not millisecond level
        const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        
        const diffMs = dueDateOnly.getTime() - nowDateOnly.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        // Debug logging
        console.log(`[${quest.title}] Date Debug:`, {
            questDue: quest.due,
            parsedDue: due.toDateString(),
            nowDateOnly: nowDateOnly.toDateString(),
            dueDateOnly: dueDateOnly.toDateString(),
            diffDays,
            diffMs
        });
        
        if (diffDays < 0) return { text: 'Overdue', color: '#ef4444', urgent: true };
        if (diffDays === 0) return { text: 'Today', color: '#f59e0b', urgent: true };
        if (diffDays === 1) return { text: 'Tomorrow', color: '#3b82f6', urgent: false };
        if (diffDays <= 7) return { text: `${diffDays} days`, color: '#6b7280', urgent: false };
        
        return { text: `${diffDays} days`, color: '#6b7280', urgent: false };
    };

    const dueDateInfo = getDueDateInfo();

    const handleComplete = () => {
        setIsAnimating(true);
        setTimeout(() => {
            onCompleteQuest(quest.title);
            setIsAnimating(false);
        }, 600);
    };

    const handleToggleExpand = () => {
        if (!collapsed) {
            setIsExpanded(!isExpanded);
        }
    };

    const handleToggleFavorite = () => {
        if (onToggleFavorite) {
            onToggleFavorite(quest.title);
        }
    };

    // Build card classes
    const cardClasses = [
        styles.questCard,
        quest.completed && styles.completed,
        isExpanded && styles.expanded,
        isSelected && styles.selected,
        quest.isFavorite && styles.favorite,
        collapsed && styles.collapsed,
    ].filter(Boolean).join(' ');

    return (
        <div 
            ref={rootRef}
            className={cardClasses}
            style={{
                '--quest-color': category.color,
                '--quest-bg': category.bgColor,
                '--quest-border': category.borderColor,
            } as React.CSSProperties}
        >
            {/* Quest Banner */}
            {quest.banner && !collapsed && bannerDataUrl && !bannerError && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '170px',
                    backgroundImage: `url(${bannerDataUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '12px 12px 0 0',
                    overflow: 'hidden',
                    opacity: 0.75,
                    zIndex: 2
                }}>
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                        padding: '12px 16px',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.7)'
                    }}>
                        {quest.title}
                    </div>
                </div>
            )}

            {/* Background Layer */}
            <div className={styles.backgroundLayer} style={{ 
                marginTop: quest.banner && !collapsed ? '170px' : '0' 
            }}>
                <div className={styles.gradientOverlay} />
                <div className={styles.patternOverlay} />
            </div>

            {/* Main Quest Header */}
            <div 
                className={styles.questHeader} 
                onClick={handleToggleExpand}
            >
                {/* Quest Avatar */}
                <div className={styles.questAvatar}>
                    <div className={styles.avatarIcon}>
                        {category.icon}
                    </div>
                </div>

                {/* Quest Info */}
                <div className={styles.questInfo}>
                    <div 
                        className={styles.questCategory}
                        style={{ color: category.color }}
                    >
                        {category.label}
                    </div>
                    <h3 className={styles.questTitle}>{quest.title}</h3>
                    <div className={styles.questMeta}>
						{quest.skills?.[0] && (
							<span className={styles.skillTag}>
								Skill: {quest.skills[0].toUpperCase()}
							</span>
						)}
						{recurLabel && (
							<span className={`${styles.skillTag} ${styles.recurTag}`} title="Recurring">
								Recurring: {recurLabel}
							</span>
						)}
                        <span 
                            className={styles.skillTag}
                            style={{ 
                                color: dueDateInfo.color === '#6b7280' ? 'rgba(255, 255, 255, 0.8)' : dueDateInfo.color,
                                background: dueDateInfo.color === '#6b7280' ? 'rgba(255, 255, 255, 0.1)' : `${dueDateInfo.color}20`,
                                border: `1px solid ${dueDateInfo.color === '#6b7280' ? 'rgba(255, 255, 255, 0.2)' : dueDateInfo.color}40`
                            }}
                        >
                            {dueDateInfo.text}
                        </span>
						{estimatedMinutes && estimatedMinutes > 0 && (
							<span className={`${styles.skillTag} ${styles.durationTag}`} title="Estimated duration">
								⏱️ {formatMinutesHuman(estimatedMinutes)}
							</span>
						)}
                    </div>
                    {/* Difficulty and Priority Display */}
                    <div className={styles.difficultyPriorityRow}>
                        {quest.difficulty && (
                            <span className={styles.difficultyTag}>
                                Difficulty: {quest.difficulty.toUpperCase()}
                            </span>
                        )}
                        {quest.priority && (
                            <span className={styles.priorityTag}>
                                Priority: {quest.priority.toUpperCase()}
                            </span>
                        )}
                    </div>

                    
                </div>

                {/* Bulk Selection Checkbox */}
                {bulkMode && onSelect && (
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(quest.title)}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.bulkCheckbox}
                    />
                )}

                {/* Rank Badge */}
                <div className={styles.rankBadge}>
                    <div className={styles.rankNumber}>
                        {difficulty.stars}
                    </div>
                </div>

                {/* Expand Arrow */}
                {!collapsed && (
                    <div className={`${styles.expandArrow} ${isExpanded ? styles.expanded : ''}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10l5 5 5-5z"/>
                        </svg>
                    </div>
                )}
            </div>

            {/* Progress Bar for Multi-Step Quests */}
            {quest.subtasks && quest.subtasks.length > 0 && (
                <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill}
                            style={{ 
                                width: `${completionProgress}%`,
                                background: completionProgress === 100 
                                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                    : `linear-gradient(90deg, ${category.color}, ${category.color}dd)`
                            }}
                        />
                    </div>
                    <div className={styles.progressText}>
                        {quest.subtasks.filter(st => st.completed).length} / {quest.subtasks.length} Complete
                    </div>
                </div>
            )}

            {/* Expanded Quest Details */}
            {!collapsed && (
                <div className={`${styles.questExpanded} ${isExpanded ? styles.visible : ''}`}>
                    <div className={styles.expandedContent}>
                        {/* Quest Description */}
                        <div className={styles.questDescription}>
                            <h4>OBJECTIVE</h4>
                            <p>{quest.description || "Complete this quest to earn rewards and progress your journey."}</p>
                            
                            {/* Subtasks List */}
                            {quest.subtasks && quest.subtasks.length > 0 && (
                                <div className={styles.objectivesList}>
                                    <h5>OBJECTIVES:</h5>
                                    <ul>
                                        {quest.subtasks.map((subtask, index) => (
                                            <li 
                                                key={index}
                                                className={`${styles.objective} ${subtask.completed ? styles.completed : ''}`}
                                                onClick={() => onToggleSubtask(quest.title, index)}
                                            >
                                                <div className={styles.objectiveCheckbox}>
                                                    {subtask.completed ? '✓' : '○'}
                                                </div>
                                                <span className={styles.objectiveText}>
                                                    {subtask.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Rewards Section */}
                        <div className={styles.rewardsSection}>
                            <h4>REWARDS</h4>
                            <div className={styles.rewardsList}>
                                <div className={styles.rewardItem}>
                                    <div className={styles.rewardIcon}>✨</div>
                                    <div className={styles.rewardValue}>{quest.xp || 100}</div>
                                    <div className={styles.rewardLabel}>XP</div>
                                </div>
                                <div className={styles.rewardItem}>
                                    <div className={styles.rewardIcon}>⭐</div>
                                    <div className={styles.rewardValue}>{quest.cp || 50}</div>
                                    <div className={styles.rewardLabel}>CP</div>
                                </div>
                                <div className={styles.rewardItem}>
                                    <div className={styles.rewardIcon}>🪙</div>
                                    <div className={styles.rewardValue}>{quest.coins || 25}</div>
                                    <div className={styles.rewardLabel}>COINS</div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={styles.actionButtons}>
                            <div className={styles.actionButtonsTopRow}>
                                {!quest.completed ? (
                                    <button 
                                        className={`${styles.actionButton} ${styles.completeButton}`}
                                        onClick={handleComplete}
                                    >
                                        COMPLETE QUEST
                                    </button>
                                ) : onUncompleteQuest ? (
                                    <button 
                                        className={`${styles.actionButton} ${styles.uncompleteButton}`}
                                        onClick={() => onUncompleteQuest(quest.title)}
                                    >
                                        MARK INCOMPLETE
                                    </button>
                                ) : (
                                    <button 
                                        className={`${styles.actionButton} ${styles.completedButton}`}
                                        disabled
                                    >
                                        ✓ COMPLETED
                                    </button>
                                )}
                                
                                <button 
                                    className={`${styles.actionButton} ${styles.editButton}`}
                                    onClick={() => onEdit(quest)}
                                >
                                    ✏️ EDIT
                                </button>
                            </div>
                            
                            <div className={styles.actionButtonsBottomRow}>
                                {onDeleteQuest && (
                                    <button 
                                        className={`${styles.actionButton} ${styles.deleteButton}`}
                                        onClick={() => onDeleteQuest(quest.title)}
                                    >
                                        🗑️ DELETE
                                    </button>
                                )}

                                {!quest.completed && onFailQuest && (
                                    <button 
                                        className={`${styles.actionButton} ${styles.failButton}`}
                                        onClick={() => onFailQuest(quest.title)}
                                    >
                                        ⚠️ FAIL
                                    </button>
                                )}
                            </div>
                            
                            {onToggleFavorite && (
                                <button 
                                    className={`${styles.actionButton} ${styles.favoriteButton} ${quest.isFavorite ? styles.favorited : ''}`}
                                    onClick={handleToggleFavorite}
                                >
                                    {quest.isFavorite ? '★' : '♡'} FAVORITE
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Completion Animation Overlay */}
            {isAnimating && (
                <div className={styles.completionOverlay}>
                    <div className={styles.completionText}>QUEST COMPLETED!</div>
                    <div className={styles.completionIcon}>🏆</div>
                </div>
            )}
        </div>
    );
};

export const CinematicQuestCard = memo(CinematicQuestCardComponent);
