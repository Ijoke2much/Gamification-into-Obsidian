import React, { useState } from "react";
import type { Quest } from "../utils/taskParser";
import { 
    QuestHeader, 
    QuestMetadata, 
    QuestActions, 
    QuestSubtasks, 
    QuestNotes 
} from "./QuestCardComponents";

interface QuestCardProps {
    quest: Quest;
    onEdit: (quest: Quest) => void;
    onToggleSubtask: (questTitle: string, subtaskIndex: number) => void;
    onCompleteQuest: (questTitle: string) => void;
    onUncompleteQuest?: (questTitle: string) => void;
    collapsed: boolean;
    onDeleteQuest?: (questTitle: string) => void;
    onFailQuest?: (questTitle: string) => void;
    onToggleFavorite?: (questTitle: string) => void;
    bulkMode?: boolean;
    isSelected?: boolean;
    onSelect?: (questTitle: string) => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({
    quest,
    onEdit,
    onToggleSubtask,
    onCompleteQuest,
    onUncompleteQuest,
    collapsed,
    onDeleteQuest,
    onFailQuest,
    onToggleFavorite,
    bulkMode = false,
    isSelected = false,
    onSelect,
}) => {
    const [showSubtasks, setShowSubtasks] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const hasSubtasks = (quest.subtasks?.length || 0) > 0;

    const handleComplete = () => {
        setIsAnimating(true);
        setTimeout(() => {
            onCompleteQuest(quest.title);
            setIsAnimating(false);
        }, 300);
    };

    const handleToggleFavorite = () => {
        if (onToggleFavorite) {
            onToggleFavorite(quest.title);
        }
    };

    // Get priority color for border
    const getPriorityBorderColor = (priority?: string) => {
        switch (priority?.toLowerCase()) {
            case "high": case "highest": return "rgba(239, 68, 68, 0.6)";
            case "medium": return "rgba(245, 158, 11, 0.6)";
            case "low": case "lowest": return "rgba(34, 197, 94, 0.6)";
            default: return "rgba(255, 255, 255, 0.1)";
        }
    };

    // Calculate completion progress
    const getCompletionProgress = () => {
        if (!quest.subtasks || quest.subtasks.length === 0) {
            return quest.completed ? 100 : 0;
        }
        const completedSubtasks = quest.subtasks.filter(st => st.completed).length;
        return Math.round((completedSubtasks / quest.subtasks.length) * 100);
    };

    const completionProgress = getCompletionProgress();

    // Get difficulty visual indicator
    const getDifficultyIndicator = (difficulty?: string) => {
        switch (difficulty?.toLowerCase()) {
            case "hard": return { emoji: "🔥", color: "#ef4444", stars: "★★★" };
            case "medium": return { emoji: "⚡", color: "#f59e0b", stars: "★★☆" };
            case "easy": return { emoji: "🌱", color: "#22c55e", stars: "★☆☆" };
            default: return { emoji: "⭐", color: "#6b7280", stars: "★☆☆" };
        }
    };

    // Calculate time until due (countdown)
    const getTimeUntilDue = () => {
        if (!quest.due) return null;
        
        const now = new Date();
        const due = new Date(quest.due);
        const diffMs = due.getTime() - now.getTime();
        
        if (diffMs <= 0) return { text: "Overdue", color: "#ef4444", urgent: true };
        
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 7) return { text: `${diffDays} days`, color: "#6b7280", urgent: false };
        if (diffDays > 1) return { text: `${diffDays} days`, color: "#f59e0b", urgent: false };
        if (diffDays === 1) return { text: "Tomorrow", color: "#f59e0b", urgent: true };
        if (diffHours > 12) return { text: "Today", color: "#ef4444", urgent: true };
        if (diffHours > 1) return { text: `${diffHours}h`, color: "#ef4444", urgent: true };
        
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return { text: `${diffMinutes}m`, color: "#ef4444", urgent: true };
    };

    const difficultyInfo = getDifficultyIndicator(quest.difficulty);
    const timeInfo = getTimeUntilDue();

    // Drag handlers
    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        
        // Set invisible drag image
        const dragImage = new Image();
        dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-quest-drag", quest.id);
        e.dataTransfer.setData("text/plain", quest.id);
        
        // Add dragging class to body for global drag state
        document.body.classList.add('quest-dragging');
        

    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.stopPropagation();
        document.body.classList.remove('quest-dragging');

    };

    return (
        <div
            draggable={!quest.completed} // Only allow dragging if quest is not completed
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
                background: quest.completed 
                    ? "rgba(46, 213, 115, 0.1)"
                    : isSelected 
                    ? "rgba(59, 130, 246, 0.1)"
                    : "rgba(255, 255, 255, 0.05)",
                border: isSelected
                    ? "2px solid rgba(59, 130, 246, 0.5)"
                    : quest.isFavorite 
                    ? "2px solid rgba(255, 215, 0, 0.5)"
                    : `1px solid ${getPriorityBorderColor(quest.priority)}`,
                borderLeft: quest.priority ? `4px solid ${getPriorityBorderColor(quest.priority)}` : undefined,
                borderRadius: 8,
                padding: collapsed ? 8 : 12,
                marginBottom: collapsed ? 4 : 8,
                position: "relative",
                fontSize: collapsed ? 11 : 13,
                lineHeight: 1.3,
                transform: isAnimating ? "scale(1.02) rotate(1deg)" : "scale(1)",
                transition: "all 0.3s ease",
                boxShadow: isSelected
                    ? "0 4px 12px rgba(59, 130, 246, 0.2)"
                    : quest.isFavorite 
                    ? "0 4px 12px rgba(255, 215, 0, 0.2)"
                    : collapsed ? "0 1px 4px rgba(0, 0, 0, 0.1)" : "0 2px 8px rgba(0, 0, 0, 0.1)",
                cursor: !quest.completed ? "grab" : "default"
            }}
        >
            {/* Progress Bar - only show if there are subtasks or quest is in progress */}
            {!quest.completed && (quest.subtasks && quest.subtasks.length > 0) && (
                <div style={{
                    width: "100%",
                    height: "3px",
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "2px",
                    marginBottom: "8px",
                    overflow: "hidden"
                }}>
                    <div style={{
                        width: `${completionProgress}%`,
                        height: "100%",
                        background: completionProgress > 75 ? "linear-gradient(90deg, #16a34a, #22c55e)" :
                                   completionProgress > 50 ? "linear-gradient(90deg, #d97706, #f59e0b)" :
                                   completionProgress > 25 ? "linear-gradient(90deg, #dc2626, #ef4444)" :
                                   "linear-gradient(90deg, #6b7280, #9ca3af)",
                        borderRadius: "2px",
                        transition: "width 0.3s ease"
                    }} />
                </div>
            )}

            {/* Header with title and favorite toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: collapsed ? 4 : 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
                    {/* Bulk mode checkbox */}
                    {bulkMode && onSelect && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelect(quest.title)}
                            style={{
                                marginTop: 2,
                                cursor: "pointer",
                                accentColor: "#3b82f6"
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                    
                    <QuestHeader
                        quest={quest}
                        hasSubtasks={hasSubtasks}
                        showSubtasks={showSubtasks}
                        onToggleSubtasks={() => setShowSubtasks(!showSubtasks)}
                        onToggleFavorite={handleToggleFavorite}
                    />
                </div>
                
                <QuestActions
                    quest={quest}
                    onComplete={handleComplete}
                    onEdit={() => onEdit(quest)}
                    onDelete={onDeleteQuest ? () => onDeleteQuest(quest.title) : undefined}
                    onFail={onFailQuest ? () => onFailQuest(quest.title) : undefined}
                    onUncomplete={onUncompleteQuest ? () => onUncompleteQuest(quest.title) : undefined}
                />
            </div>

            {/* Completion status indicator */}
            {quest.completed && (
                <div style={{
                    background: "rgba(76, 175, 80, 0.2)",
                    border: "1px solid rgba(76, 175, 80, 0.4)",
                    borderRadius: 6,
                    padding: "8px 12px",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "#4CAF50"
                }}>
                    <span>✅</span>
                    <span style={{ fontWeight: 600 }}>Quest Completed</span>
                    {quest.lastModified && (
                        <span style={{ marginLeft: "auto", opacity: 0.8 }}>
                            Completed: {new Date(quest.lastModified).toLocaleDateString()}
                        </span>
                    )}
                </div>
            )}

            {/* Metadata section with skills, description, rewards, dates - hide some details in collapsed view */}
            {!collapsed && <QuestMetadata quest={quest} />}

            {/* Subtasks section - always show if not collapsed */}
            {!collapsed && (
                <QuestSubtasks
                    quest={quest}
                    showSubtasks={showSubtasks}
                    onToggleSubtask={onToggleSubtask}
                />
            )}

            {/* Notes section - hide in collapsed view */}
            {!collapsed && quest.notes && (
                <div style={{ marginTop: 8 }}>
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#888",
                            fontSize: 11,
                            cursor: "pointer",
                            padding: "2px 4px",
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                        }}
                    >
                        {showNotes ? "▼" : "▶"} Notes
                    </button>
                    <QuestNotes quest={quest} showNotes={showNotes} />
                </div>
            )}

            {/* Compact view summary - only show essential info */}
            {collapsed && (
                <div style={{ 
                    fontSize: 10, 
                    color: "rgba(255, 255, 255, 0.6)", 
                    display: "flex", 
                    gap: 8, 
                    alignItems: "center",
                    marginTop: 4,
                    flexWrap: "wrap"
                }}>
                    {quest.difficulty && (
                        <span style={{ 
                            color: difficultyInfo.color,
                            display: "flex",
                            alignItems: "center",
                            gap: 2
                        }}>
                            {difficultyInfo.emoji} {difficultyInfo.stars}
                        </span>
                    )}
                    {timeInfo && (
                        <span style={{ 
                            color: timeInfo.color,
                            fontWeight: timeInfo.urgent ? "600" : "normal"
                        }}>
                            ⏰ {timeInfo.text}
                        </span>
                    )}
                    {quest.subtasks && quest.subtasks.length > 0 && (
                        <span>{completionProgress}% ({quest.subtasks.filter(st => st.completed).length}/{quest.subtasks.length})</span>
                    )}
                    {quest.xp && <span>✨{quest.xp} XP</span>}
                    {quest.cp && <span>⭐{quest.cp} CP</span>}
                </div>
            )}

            {/* Visual indicators for normal view */}
            {!collapsed && (quest.difficulty || timeInfo) && (
                <div style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    alignItems: "center"
                }}>
                    {quest.difficulty && (
                        <span style={{
                            background: `${difficultyInfo.color}20`,
                            border: `1px solid ${difficultyInfo.color}40`,
                            color: difficultyInfo.color,
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: 11,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                        }}>
                            {difficultyInfo.emoji} {quest.difficulty} {difficultyInfo.stars}
                        </span>
                    )}
                    {timeInfo && (
                        <span style={{
                            background: `${timeInfo.color}20`,
                            border: `1px solid ${timeInfo.color}40`,
                            color: timeInfo.color,
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: 11,
                            fontWeight: timeInfo.urgent ? 600 : 500,
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                        }}>
                            ⏰ {timeInfo.text}
                        </span>
                    )}
                </div>
            )}

            {/* Completion animation overlay */}
            {isAnimating && (
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(76, 175, 80, 0.3)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    color: "#4CAF50",
                    animation: "questComplete 0.3s ease-in-out"
                }}>
                    ✨ Quest Complete! ✨
                </div>
            )}

            {/* CSS animations */}
            <style>
                {`
                    @keyframes questComplete {
                        0% { opacity: 0; transform: scale(0.8); }
                        50% { opacity: 1; transform: scale(1.1); }
                        100% { opacity: 0.8; transform: scale(1); }
                    }
                `}
            </style>
        </div>
    );
}; 