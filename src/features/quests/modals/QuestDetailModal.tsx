import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TFile } from 'obsidian';
import type { Quest } from '../utils/taskParser';
import type GamificationObsidianPlugin from '../../../core/main';
import { formatRecur, parseEstimatedMinutes, formatMinutesHuman } from '../utils/questDisplayUtils';
import styles from './QuestDetailModal.module.css';

interface QuestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quest: Quest | null;
  plugin: GamificationObsidianPlugin;
  currentEnergy?: number;
  onEdit?: (quest: Quest) => void;
  onComplete?: (questTitle: string) => void;
  onUncomplete?: (questTitle: string) => void;
  onToggleFavorite?: (questTitle: string) => void;
  onDelete?: (questTitle: string) => void;
  onStartPomodoro?: (quest: Quest) => void;
  onStartHyperfocus?: (quest: Quest) => void;
  onToggleSubtask?: (questId: string, subtaskIndex: number) => void;
}

export const QuestDetailModal: React.FC<QuestDetailModalProps> = ({
  isOpen,
  onClose,
  quest,
  plugin,
  currentEnergy = 70,
  onEdit,
  onComplete,
  onUncomplete,
  onToggleFavorite,
  onDelete,
  onStartPomodoro,
  onStartHyperfocus,
  onToggleSubtask,
}) => {
  const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Local state for optimistic subtask updates
  const [localSubtasks, setLocalSubtasks] = useState<Array<{ text: string; completed?: boolean }> | null>(null);
  const questIdRef = useRef<string | null>(null);
  // Keep a ref to the quest so we can use it even if prop becomes null temporarily
  const questRef = useRef<Quest | null>(null);
  
  // Update quest ref whenever quest changes - keep it even if quest becomes null
  useEffect(() => {
    if (quest) {
      questRef.current = quest;
    }
    // Don't clear questRef.current if quest becomes null - keep last known quest
    // This prevents modal from closing during reload
  }, [quest]);
  
  // Initialize and sync local subtasks when quest changes
  useEffect(() => {
    const currentQuest = quest || questRef.current;
    if (currentQuest) {
      const currentQuestId = currentQuest.id || currentQuest.title;
      // Update if it's a different quest OR if subtasks have changed (for reload sync)
      if (currentQuestId !== questIdRef.current) {
        // New quest - initialize
        if (currentQuest.subtasks) {
          setLocalSubtasks([...currentQuest.subtasks]);
        } else {
          setLocalSubtasks(null);
        }
        questIdRef.current = currentQuestId;
      } else if (currentQuest.subtasks && localSubtasks) {
        // Same quest - preserve optimistic updates
        // Only update if subtask count changed (new subtasks added/removed)
        if (currentQuest.subtasks.length !== localSubtasks.length) {
          // Subtask count changed, use quest data
          setLocalSubtasks([...currentQuest.subtasks]);
        }
        // If count is same, keep localSubtasks as-is (preserves optimistic completion state)
        // Don't overwrite with quest data - our optimistic state is what user sees
      } else if (currentQuest.subtasks && !localSubtasks) {
        // Quest now has subtasks
        setLocalSubtasks([...currentQuest.subtasks]);
      }
    }
  }, [quest?.id, quest?.title, quest?.subtasks]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  // Load banner image
  useEffect(() => {
    async function loadBannerImage() {
      const currentQuest = quest || questRef.current;
      if (!currentQuest?.banner || !plugin) {
        setBannerDataUrl(null);
        setBannerLoading(false);
        return;
      }

      setBannerLoading(true);
      setBannerError(false);

      try {
        // Try cached banner first
        if (plugin.enhancedQuestSystem) {
          const cachedBanner = plugin.enhancedQuestSystem.getCachedBanner(currentQuest.title);
          if (cachedBanner) {
            setBannerDataUrl(cachedBanner);
            setBannerLoading(false);
            return;
          }
          
          if (currentQuest.banner) {
            const bannerDataUrl = await plugin.enhancedQuestSystem.loadBannerAsDataUrl(currentQuest.banner);
            if (bannerDataUrl) {
              setBannerDataUrl(bannerDataUrl);
              setBannerLoading(false);
              return;
            }
          }
        }

        // Fallback to direct loading
        if (currentQuest.banner && (currentQuest.banner.startsWith("data:") || currentQuest.banner.startsWith("http"))) {
          setBannerDataUrl(currentQuest.banner);
          setBannerLoading(false);
          return;
        }

        if (currentQuest.banner) {
          const vaultFile = plugin.app.vault.getAbstractFileByPath(currentQuest.banner);
          if (vaultFile && vaultFile instanceof TFile) {
            const data = await plugin.app.vault.readBinary(vaultFile);
            const ext = currentQuest.banner.split(".").pop()?.toLowerCase() || "jpg";
            const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
            const base64 = arrayBufferToBase64(data);
            setBannerDataUrl(`data:${mime};base64,${base64}`);
            setBannerLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to load quest banner:", e);
        setBannerError(true);
      }
      
      setBannerLoading(false);
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

    const currentQuest = quest || questRef.current;
    if (isOpen && currentQuest) {
      loadBannerImage();
    }
  }, [quest?.banner, plugin, isOpen]);

  // Don't close modal if quest is temporarily null during reload - use ref
  if (!isOpen) return null;
  // Use quest from prop if available, otherwise use ref (for during reload)
  const displayQuest = quest || questRef.current;
  if (!displayQuest) return null;

  // Calculate energy info
  const questEnergy = displayQuest.energyCost || 10;
  const energyMatch = questEnergy <= currentEnergy * 0.3 ? 'perfect' : 
                      questEnergy <= currentEnergy * 0.6 ? 'good' : 
                      questEnergy <= currentEnergy ? 'challenging' : 'insufficient';

  // Format due date
  const getDueDateInfo = () => {
    if (!displayQuest.due) return null;
    
    const hasTime = displayQuest.due.includes('T');
    let dateStr = displayQuest.due;
    if (hasTime && !displayQuest.due.includes(':00', displayQuest.due.lastIndexOf(':'))) {
      dateStr = displayQuest.due + ':00';
    } else if (!hasTime) {
      dateStr = displayQuest.due + 'T00:00:00';
    }
    
    const due = new Date(dateStr);
    if (isNaN(due.getTime())) return null;
    
    const now = new Date();
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffMs = dueDateOnly.getTime() - nowDateOnly.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return {
      date: due,
      diffDays,
      hasTime,
      isOverdue: diffDays < 0,
      isToday: diffDays === 0,
      isTomorrow: diffDays === 1,
    };
  };

  const dueInfo = getDueDateInfo();
  const estimatedMinutes = parseEstimatedMinutes(displayQuest.estimatedTime);
  const recurLabel = formatRecur(displayQuest.recur);
  const bannerAlign = displayQuest.bannerAlign || 'center';
  const bannerPosition =
    bannerAlign === 'top' ? 'center top' :
    bannerAlign === 'bottom' ? 'center bottom' :
    'center center';

  // Use local subtasks if available, otherwise use quest subtasks
  const displaySubtasks = localSubtasks || displayQuest.subtasks || [];
  
  // Calculate completion progress
  const completionProgress = displaySubtasks && displaySubtasks.length > 0
    ? Math.round((displaySubtasks.filter(st => st.completed).length / displaySubtasks.length) * 100)
    : displayQuest.completed ? 100 : 0;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Sticky Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <span className={styles.headerIcon}>📋</span>
            <span>Quest Details</span>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            title="Close (Esc)"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Banner Section */}
        {displayQuest.banner && (
          <div className={styles.bannerContainer}>
            {bannerLoading ? (
              <div className={styles.bannerPlaceholder}>
                <span>Loading banner...</span>
              </div>
            ) : bannerError ? (
              <div className={styles.bannerPlaceholder}>
                <span>⚠️ Banner not available</span>
              </div>
            ) : bannerDataUrl ? (
              <div 
                className={styles.bannerImage}
                style={{
                  backgroundImage: `url(${bannerDataUrl})`,
                  backgroundPosition: bannerPosition,
                }}
              >
                <div className={styles.bannerOverlay}>
                  <h2 className={styles.bannerTitle}>{displayQuest.title}</h2>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Scrollable Content */}
        <div className={styles.modalBody} ref={contentRef}>
          {/* Title (if no banner) */}
          {!displayQuest.banner && (
            <h2 className={styles.questTitle}>{displayQuest.title}</h2>
          )}

          {/* Status Badges */}
          <div className={styles.badgesRow}>
            {displayQuest.completed && (
              <span className={`${styles.badge} ${styles.completedBadge}`}>
                ✅ Completed
              </span>
            )}
            {displayQuest.isFavorite && (
              <span className={`${styles.badge} ${styles.favoriteBadge}`}>
                ⭐ Favorite
              </span>
            )}
            {displayQuest.priority && (
              <span
                className={`${styles.badge} ${styles.priorityBadge}`}
                data-priority={displayQuest.priority.toLowerCase()}
              >
                <span className={styles.badgeLabel}>Priority:</span>{' '}
                <span className={styles.badgeValue}>{displayQuest.priority}</span>
              </span>
            )}
            {displayQuest.difficulty && (
              <span
                className={`${styles.badge} ${styles.difficultyBadge}`}
                data-difficulty={displayQuest.difficulty.toLowerCase()}
              >
                <span className={styles.badgeLabel}>Difficulty:</span>{' '}
                <span className={styles.badgeValue}>{displayQuest.difficulty}</span>
              </span>
            )}
          </div>

          {/* Objective (Description) */}
          {displayQuest.description && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Objective</h3>
              <div className={styles.sectionContent}>
                <p className={styles.description}>{displayQuest.description}</p>
              </div>
            </section>
          )}

          {/* Key Information Grid */}
          <div className={styles.infoGrid}>
            {dueInfo && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>📅 Due Date</span>
                <span className={`${styles.infoValue} ${dueInfo.isOverdue ? styles.overdue : ''} ${dueInfo.isToday ? styles.today : ''}`}>
                  {dueInfo.hasTime 
                    ? dueInfo.date.toLocaleString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })
                    : dueInfo.date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                  }
                  {dueInfo.isOverdue && <span className={styles.urgentTag}> Overdue</span>}
                  {dueInfo.isToday && <span className={styles.todayTag}> Today</span>}
                </span>
              </div>
            )}

            {estimatedMinutes && estimatedMinutes > 0 && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>⏱️ Estimated Time</span>
                <span className={styles.infoValue}>{formatMinutesHuman(estimatedMinutes)}</span>
              </div>
            )}

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>⚡ Energy Cost</span>
              <span className={`${styles.infoValue} ${styles[`energy${energyMatch.charAt(0).toUpperCase() + energyMatch.slice(1)}`]}`}>
                {questEnergy} {energyMatch === 'perfect' ? '✓' : energyMatch === 'insufficient' ? '⚠️' : ''}
              </span>
            </div>

            {(displayQuest.xp || displayQuest.cp || displayQuest.coins) && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>🎁 Rewards</span>
                <span className={styles.infoValue}>
                  {displayQuest.xp && <span className={styles.reward}>XP: {displayQuest.xp}</span>}
                  {displayQuest.cp && <span className={styles.reward}>CP: {displayQuest.cp}</span>}
                  {typeof displayQuest.coins === 'number' && displayQuest.coins > 0 && (
                    <span className={styles.reward}>Currency: {displayQuest.coins}</span>
                  )}
                </span>
              </div>
            )}

            {recurLabel && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>🔄 Recurrence</span>
                <span className={styles.infoValue}>{recurLabel}</span>
              </div>
            )}

            {displayQuest.skills && displayQuest.skills.length > 0 && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>🎯 Skills</span>
                <span className={styles.infoValue}>
                  {displayQuest.skills.map((skill, idx) => (
                    <span key={idx} className={styles.skillTag}>{skill}</span>
                  ))}
                </span>
              </div>
            )}
          </div>

          {/* Completion Progress */}
          {displaySubtasks && displaySubtasks.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                📊 Progress ({completionProgress}%)
              </h3>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${completionProgress}%` }}
                />
              </div>
              <div className={styles.subtasksList}>
                {displaySubtasks.map((subtask, idx) => (
                  <div 
                    key={idx} 
                    className={`${styles.subtaskItem} ${subtask.completed ? styles.subtaskCompleted : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={subtask.completed || false}
                      onClick={(e) => {
                        // Prevent the click from bubbling up to the modal overlay,
                        // which would otherwise trigger the close handler.
                        e.stopPropagation();
                      }}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onToggleSubtask && displayQuest && localSubtasks) {
                          // Optimistically update local state immediately
                          const updatedSubtasks = [...localSubtasks];
                          updatedSubtasks[idx] = {
                            ...updatedSubtasks[idx],
                            completed: !updatedSubtasks[idx].completed
                          };
                          setLocalSubtasks(updatedSubtasks);
                          
                          // Then call the handler to save to file (don't await - let it run in background)
                          // The handler will reload quests, and our useEffect will sync the changes
                          onToggleSubtask(displayQuest.id || displayQuest.title, idx);
                        }
                      }}
                      className={styles.subtaskCheckboxInput}
                      disabled={!onToggleSubtask}
                      title={onToggleSubtask ? "Click to toggle subtask" : "Subtask editing not available"}
                    />
                    <span className={styles.subtaskText}>{subtask.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          {displayQuest.notes && Array.isArray(displayQuest.notes) && displayQuest.notes.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>📌 Notes</h3>
              <div className={styles.sectionContent}>
                <ul className={styles.notesList}>
                  {displayQuest.notes.map((note: string, idx: number) => (
                    <li key={idx} className={styles.noteItem}>{note}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>

        {/* Sticky Footer with Actions */}
        <div className={styles.modalFooter}>
          <div className={styles.actionButtons}>
            {onEdit && (
              <button
                className={`${styles.actionButton} ${styles.editButton}`}
                onClick={() => {
                  onEdit(displayQuest);
                  onClose();
                }}
                title="Edit Quest"
              >
                ✏️ Edit
              </button>
            )}
            
            {!displayQuest.completed && onComplete && (
              <button
                className={`${styles.actionButton} ${styles.completeButton}`}
                onClick={() => {
                  onComplete(displayQuest.title);
                  onClose();
                }}
                title="Complete Quest"
              >
                ✅ Complete
              </button>
            )}
            
            {displayQuest.completed && onUncomplete && (
              <button
                className={`${styles.actionButton} ${styles.uncompleteButton}`}
                onClick={() => {
                  onUncomplete(displayQuest.title);
                  onClose();
                }}
                title="Mark Incomplete"
              >
                ↩️ Reopen
              </button>
            )}
            
            {onToggleFavorite && (
              <button
                className={`${styles.actionButton} ${styles.favoriteButton} ${displayQuest.isFavorite ? styles.active : ''}`}
                onClick={() => onToggleFavorite(displayQuest.title)}
                title={displayQuest.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                {displayQuest.isFavorite ? '⭐' : '☆'} Favorite
              </button>
            )}
            
            {onStartPomodoro && (
              <button
                className={`${styles.actionButton} ${styles.pomodoroButton}`}
                onClick={() => {
                  onStartPomodoro(displayQuest);
                  onClose();
                }}
                title="Start Pomodoro Timer"
              >
                🍅 Pomodoro
              </button>
            )}
            
            {onStartHyperfocus && (displayQuest.priority === 'high' || displayQuest.priority === 'highest' || displayQuest.difficulty === 'hard' || displayQuest.difficulty === 'epic') && (
              <button
                className={`${styles.actionButton} ${styles.hyperfocusButton}`}
                onClick={() => {
                  onStartHyperfocus(displayQuest);
                  onClose();
                }}
                title="Start Hyperfocus Session"
              >
                🧠⚡ Hyperfocus
              </button>
            )}
            
            {onDelete && (
              <button
                className={`${styles.actionButton} ${styles.deleteButton}`}
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${displayQuest.title}"?`)) {
                    onDelete(displayQuest.title);
                    onClose();
                  }
                }}
                title="Delete Quest"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default QuestDetailModal;

