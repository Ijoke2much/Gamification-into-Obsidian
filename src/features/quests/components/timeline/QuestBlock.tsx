import React from 'react';
import type { Quest } from '../../utils/taskParser';
import { PlacedQuest, getEnergyMatchClass, formatMinutesHuman } from './TimelineUtils';
import styles from '../QuestTimelineView.module.css';

interface QuestBlockProps {
  block: PlacedQuest;
  blockIdx: number;
  dayCol: {
    scheduled: PlacedQuest[];
    isToday: boolean;
  };
  currentEnergy: number;
  expandedBlocks: Set<string>;
  openDropdown: string | null;
  blockThemes: Record<string, string>;
  isExpanded: boolean;
  isDropdownOpen: boolean;
  isCurrentTask: boolean;
  energy: number;
  energyMatch: string;
  isHyperfocusOptimal: boolean;
  time: string;
  endTime: string;
  durationLabel: string;
  gapMinutes: number | null;
  showGap: boolean;
  themeClass: string | undefined;
  borderColor: string;
  textColor: string;
  onQuestSelect: (quest: Quest) => void;
  onQuestComplete: (questTitle: string) => void;
  onQuestEdit: (quest: Quest) => void;
  onQuestMove: (questId: string, newDateIso: string) => void;
  onStartHyperfocus?: (quest: Quest) => void;
  setLastSelectedQuestId: (id: string) => void;
  toggleBlockExpansion: (questId: string) => void;
  toggleDropdown: (questId: string, e: React.MouseEvent) => void;
  handleToggleSubtask: (questTitle: string, subtaskIndex: number) => void;
  setOpenDropdown: (id: string | null) => void;
}

export const QuestBlock: React.FC<QuestBlockProps> = ({
  block,
  blockIdx,
  dayCol,
  currentEnergy,
  expandedBlocks,
  openDropdown,
  blockThemes,
  isExpanded,
  isDropdownOpen,
  isCurrentTask,
  energy,
  energyMatch,
  isHyperfocusOptimal,
  time,
  endTime,
  durationLabel,
  gapMinutes,
  showGap,
  themeClass,
  borderColor,
  textColor,
  onQuestSelect,
  onQuestComplete,
  onQuestEdit,
  onQuestMove,
  onStartHyperfocus,
  setLastSelectedQuestId,
  toggleBlockExpansion,
  toggleDropdown,
  handleToggleSubtask,
  setOpenDropdown
}) => {
  return (
    <div key={block.quest.id}>
      {/* Time marker and connector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <div style={{
          fontSize: '12px',
          fontFamily: 'monospace',
          fontWeight: '700',
          width: '48px',
          color: isCurrentTask ? '#f59e0b' : 'var(--text-muted)',
          textAlign: 'right'
        }}>
          {time}
        </div>
        <div style={{
          width: '4px',
          height: isCurrentTask ? '16px' : '12px',
          borderRadius: '2px',
          background: isCurrentTask ? '#f59e0b' : 'var(--background-modifier-border)',
          transition: 'all 0.2s'
        }} />
        
        {/* Gap indicator */}
        {showGap && (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            opacity: 0.7
          }}>
            {gapMinutes ? formatMinutesHuman(gapMinutes) : '0 min'} free
          </div>
        )}
      </div>

      {/* Quest Card */}
      <div
        className={`
          ${styles.block} 
          ${styles[`energy_${energyMatch}`]}
          ${themeClass ? styles[themeClass] : ''}
          ${isHyperfocusOptimal ? styles.hyperfocusOptimal : ''}
          ${block.quest.completed ? styles.completed : ''}
          ${isExpanded ? styles.expanded : ''}
          ${isCurrentTask ? styles.currentTask : ''}
        `}
        style={{
          marginLeft: '27px',
          marginRight: '16px',
          marginBottom: '16px',
          borderRadius: '8px',
          borderLeft: `4px solid ${borderColor}`,
          background: block.quest.completed ? 'rgba(var(--background-modifier-border-rgb), 0.4)' : 
                      isCurrentTask ? `${borderColor}10` : 'var(--background-secondary)',
          opacity: block.quest.completed ? 0.6 : 1,
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          border: isCurrentTask ? `2px solid ${borderColor}40` : undefined,
          boxShadow: isCurrentTask ? `0 0 20px ${borderColor}30` : undefined,
          padding: '16px',
          zIndex: isExpanded || isDropdownOpen ? 100 : 2,
          boxSizing: 'border-box',
          overflow: 'hidden',
          width: '87%'
        }}
        onClick={() => { if (!isDropdownOpen) { setLastSelectedQuestId(block.quest.id); onQuestSelect(block.quest); } }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px', flex: 1, minWidth: 0 }}>
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuestComplete(block.quest.title);
              }}
              style={{
                marginTop: '4px',
                flexShrink: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'transform 0.2s',
                fontSize: '20px'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {block.quest.completed ? (
                <span style={{ color: '#10b981' }}>✓</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>○</span>
              )}
            </button>

            {/* Quest Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '4px',
                flexWrap: 'wrap'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: textColor,
                  lineHeight: '1.3'
                }}>
                  {block.quest.title}
                </h4>
                
                {/* Energy indicator */}
                <span style={{ 
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: energyMatch === 'low' ? '#dcfce7' : energyMatch === 'medium' ? '#fef3c7' : '#fee2e2',
                  color: energyMatch === 'low' ? '#166534' : energyMatch === 'medium' ? '#92400e' : '#991b1b'
                }}>
                  ⚡{energy}
                </span>

                {/* Duration */}
                <span style={{ 
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontWeight: '500'
                }}>
                  {durationLabel}
                </span>
              </div>

              {/* Time range */}
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}>
                {time} - {endTime}
              </div>

              {/* Skills */}
              {block.quest.skills && block.quest.skills.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '4px', 
                  marginBottom: '8px',
                  flexWrap: 'wrap'
                }}>
                  {block.quest.skills.slice(0, 3).map((skill: string) => (
                    <span 
                      key={skill}
                      style={{ 
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: 'rgba(var(--interactive-accent-rgb), 0.1)',
                        color: 'var(--interactive-accent)',
                        borderRadius: '4px',
                        fontWeight: '500'
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                  {block.quest.skills.length > 3 && (
                    <span style={{ 
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic'
                    }}>
                      +{block.quest.skills.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Hyperfocus indicator */}
              {isHyperfocusOptimal && (
                <div style={{ 
                  fontSize: '11px',
                  color: '#7c3aed',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}>
                  🎯 Optimal for Hyperfocus
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Hyperfocus button */}
            {onStartHyperfocus && isHyperfocusOptimal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartHyperfocus(block.quest);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🎯 Focus
              </button>
            )}

            {/* Expand/Collapse button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleBlockExpansion(block.quest.id);
              }}
              style={{
                padding: '4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--text-muted)'
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>

            {/* More options dropdown */}
            <button
              onClick={(e) => toggleDropdown(block.quest.id, e)}
              style={{
                padding: '4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: 'var(--text-muted)'
              }}
            >
              ⋯
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '12px', 
            borderTop: '1px solid rgba(var(--background-modifier-border-rgb), 0.3)' 
          }}>
            {/* Description */}
            {block.quest.description && (
              <div style={{ 
                fontSize: '13px', 
                color: 'var(--text-muted)', 
                marginBottom: '8px',
                lineHeight: '1.4'
              }}>
                {block.quest.description}
              </div>
            )}

            {/* Subtasks */}
            {block.quest.subtasks && block.quest.subtasks.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  marginBottom: '4px',
                  color: 'var(--text-normal)'
                }}>
                  Subtasks:
                </div>
                {block.quest.subtasks.map((subtask: any, idx: number) => (
                  <div 
                    key={idx}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      marginBottom: '2px',
                      fontSize: '11px'
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSubtask(block.quest.title, idx);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '12px'
                      }}
                    >
                      {subtask.completed ? '✓' : '○'}
                    </button>
                    <span style={{ 
                      color: subtask.completed ? 'var(--text-muted)' : 'var(--text-normal)',
                      textDecoration: subtask.completed ? 'line-through' : 'none'
                    }}>
                      {subtask.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Rewards */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '8px',
              flexWrap: 'wrap'
            }}>
              {block.quest.xp && (
                <span style={{ 
                  fontSize: '11px',
                  padding: '2px 6px',
                  background: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  ✨ {block.quest.xp} XP
                </span>
              )}
              {block.quest.cp && (
                <span style={{ 
                  fontSize: '11px',
                  padding: '2px 6px',
                  background: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  ⭐ {block.quest.cp} CP
                </span>
              )}
            </div>
          </div>
        )}

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '16px',
            background: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            minWidth: '140px'
          }}>
            <button
              className={styles.dropdownItem}
              onClick={(e) => {
                e.stopPropagation();
                onQuestEdit(block.quest);
                setOpenDropdown(null);
              }}
            >
              <span className={styles.dropdownIcon}>✏️</span>
              <span>Edit</span>
            </button>
            <button
              className={styles.dropdownItem}
              onClick={(e) => {
                e.stopPropagation();
                onQuestComplete(block.quest.title);
                setOpenDropdown(null);
              }}
            >
              ✅ Complete
            </button>
            <div className={styles.dropdownDivider} />
            <button
              className={styles.dropdownItem}
              onClick={(e) => {
                e.stopPropagation();
                const dateOnly = block.quest.due?.split('T')[0];
                if (dateOnly) onQuestMove(block.quest.id, dateOnly);
                setOpenDropdown(null);
              }}
            >
              <span className={styles.dropdownIcon}>🗑️</span>
              <span>Unschedule</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
