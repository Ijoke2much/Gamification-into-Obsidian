import React from "react";
import type { Quest } from "../utils/taskParser";

interface QuestHeaderProps {
    quest: Quest;
    hasSubtasks: boolean;
    showSubtasks: boolean;
    onToggleSubtasks: () => void;
    onToggleFavorite: () => void;
}

export const QuestHeader: React.FC<QuestHeaderProps> = ({
    quest,
    hasSubtasks,
    showSubtasks,
    onToggleSubtasks,
    onToggleFavorite,
}) => {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                flex: 1,
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
                    <span
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: quest.completed
                                ? "rgba(255, 255, 255, 0.5)"
                                : "rgba(255, 255, 255, 0.95)",
                            textDecoration: quest.completed ? "line-through" : "none",
                            wordBreak: "break-word"
                        }}
                    >
                        {quest.title}
                    </span>
                    {quest.isFavorite && (
                        <span style={{ fontSize: 12 }}>⭐</span>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite();
                    }}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 16,
                        padding: 2,
                        opacity: quest.isFavorite ? 1 : 0.4,
                        transition: "opacity 0.2s",
                    }}
                    title={quest.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                    {quest.isFavorite ? "⭐" : "☆"}
                </button>
            </div>
            {hasSubtasks && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSubtasks();
                    }}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#888",
                        fontSize: 11,
                        cursor: "pointer",
                        padding: "2px 4px",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        alignSelf: "flex-start"
                    }}
                >
                    {showSubtasks ? "▼" : "▶"} {quest.subtasks.length} subtask{quest.subtasks.length !== 1 ? "s" : ""}
                </button>
            )}
        </div>
    );
};

interface QuestMetadataProps {
    quest: Quest;
}

export const QuestMetadata: React.FC<QuestMetadataProps> = ({ quest }) => {
    const getDifficultyColor = (difficulty?: string) => {
        switch (difficulty?.toLowerCase()) {
            case "hard": return "#ff4757";
            case "medium": return "#ffa502";
            case "easy": return "#2ed573";
            default: return "#747d8c";
        }
    };



    const getDifficultyStars = (difficulty?: string) => {
        switch (difficulty?.toLowerCase()) {
            case "hard": return "★★★";
            case "medium": return "★★☆";
            case "easy": return "★☆☆";
            default: return "★☆☆";
        }
    };

    const getPriorityEmoji = (priority?: string) => {
        switch (priority?.toLowerCase()) {
            case "highest": return "🔺";
            case "high": return "⏫";
            case "medium": return "🔼";
            case "low": return "🔽";
            case "lowest": return "⏬";
            default: return "";
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
            // Check if it includes time (ISO format with T)
            const hasTime = dateStr.includes('T');
            let date: Date;
            let timeStr = '';
            
            if (hasTime) {
                // Parse full ISO datetime
                date = new Date(dateStr);
                // Extract time portion
                timeStr = date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
            } else {
                // Just date, treat as local time
                date = new Date(dateStr + 'T00:00:00');
            }
            
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Set all times to midnight for accurate date comparison
            const dateOnly = new Date(date);
            dateOnly.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            tomorrow.setHours(0, 0, 0, 0);
            
            // Format the date
            const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
            
            let dateLabel = '';
            if (dateOnly.getTime() === today.getTime()) {
                dateLabel = hasTime ? `Today at ${timeStr}` : `Today (${formattedDate})`;
            } else if (dateOnly.getTime() === tomorrow.getTime()) {
                dateLabel = hasTime ? `Tomorrow at ${timeStr}` : `Tomorrow (${formattedDate})`;
            } else if (dateOnly.getTime() < today.getTime()) {
                dateLabel = hasTime ? `Overdue (${formattedDate} at ${timeStr})` : `Overdue (${formattedDate})`;
            } else {
                // For future dates
                const diffTime = dateOnly.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 7) {
                    dateLabel = hasTime 
                        ? `In ${diffDays} day${diffDays > 1 ? 's' : ''} at ${timeStr}`
                        : `In ${diffDays} day${diffDays > 1 ? 's' : ''} (${formattedDate})`;
                } else {
                    dateLabel = hasTime ? `${formattedDate} at ${timeStr}` : formattedDate;
                }
            }
            
            return dateLabel;
        } catch {
            return dateStr;
        }
    };

    const getDateColor = (dateStr?: string) => {
        if (!dateStr) return "#747d8c";
        try {
            const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            date.setHours(0, 0, 0, 0);
            
            if (date.getTime() < today.getTime()) return "#ff4757"; // Overdue
            if (date.getTime() === today.getTime()) return "#ffa502"; // Today
            return "#5352ed"; // Future
        } catch {
            return "#747d8c";
        }
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.7)",
                marginTop: 8,
            }}
        >
            {/* Top row: Difficulty, Priority, XP, CP */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {quest.difficulty && (
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: getDifficultyColor(quest.difficulty),
                            fontWeight: 500,
                        }}
                    >
                        {getDifficultyStars(quest.difficulty)} {quest.difficulty}
                    </span>
                )}
                {quest.priority && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {getPriorityEmoji(quest.priority)} {quest.priority}
                    </span>
                )}
                {quest.xp && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        ✨ {quest.xp} XP
                    </span>
                )}
                {quest.cp && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        ⭐ {quest.cp} CP
                    </span>
                )}
            </div>

            {/* Second row: Due date, Recurrence, Energy */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {quest.due && (
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: getDateColor(quest.due),
                            fontWeight: quest.due.includes('T') ? 600 : 400,
                        }}
                    >
                        {quest.due.includes('T') ? "🕐" : "📅"} {formatDate(quest.due)}
                        {quest.estimatedTime && ` (${quest.estimatedTime}m)`}
                    </span>
                )}
                {quest.recur && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        🔁 {quest.recur}
                    </span>
                )}
                {quest.energyCost && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        ⚡ {quest.energyCost} energy
                    </span>
                )}
            </div>

            {/* Skills row */}
            {quest.skills && quest.skills.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>Skills:</span>
                    {quest.skills.map((skill, index) => (
                        <span
                            key={index}
                            style={{
                                background: "rgba(99, 179, 237, 0.2)",
                                color: "#63b3ed",
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 10,
                            }}
                        >
                            {skill}
                        </span>
                    ))}
                </div>
            )}

            {/* Description */}
            {quest.description && (
                <div
                    style={{
                        fontSize: 11,
                        color: "rgba(255, 255, 255, 0.6)",
                        lineHeight: 1.4,
                        fontStyle: "italic",
                    }}
                >
                    {quest.description}
                </div>
            )}

            {/* Rewards */}
            {quest.rewards && quest.rewards.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>Rewards:</span>
                    {quest.rewards.map((reward, index) => (
                        <span
                            key={index}
                            style={{
                                background: "rgba(255, 215, 0, 0.2)",
                                color: "#ffd700",
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 10,
                            }}
                        >
                            {reward}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

interface QuestActionsProps {
    quest: Quest;
    onComplete: () => void;
    onEdit: () => void;
    onDelete?: () => void;
    onFail?: () => void;
    onUncomplete?: () => void;
}

export const QuestActions: React.FC<QuestActionsProps> = ({
    quest,
    onComplete,
    onEdit,
    onDelete,
    onFail,
    onUncomplete,
}) => {
    return (
        <div
            style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
            }}
        >
            {!quest.completed ? (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onComplete();
                    }}
                    style={{
                        background: "rgba(76, 175, 80, 0.2)",
                        border: "1px solid rgba(76, 175, 80, 0.4)",
                        borderRadius: 4,
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "#4CAF50",
                        fontWeight: 500,
                    }}
                    title="Complete Quest"
                >
                    ✓
                </button>
            ) : (
                onUncomplete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUncomplete();
                        }}
                        style={{
                            background: "rgba(255, 193, 7, 0.2)",
                            border: "1px solid rgba(255, 193, 7, 0.4)",
                            borderRadius: 4,
                            padding: "6px 10px",
                            cursor: "pointer",
                            fontSize: 11,
                            color: "#FFC107",
                            fontWeight: 500,
                        }}
                        title="Mark as Incomplete"
                    >
                        ↶
                    </button>
                )
            )}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
                style={{
                    background: "rgba(66, 135, 245, 0.2)",
                    border: "1px solid rgba(66, 135, 245, 0.4)",
                    borderRadius: 4,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "#4287f5",
                    fontWeight: 500,
                }}
                title="Edit Quest"
            >
                ✎
            </button>
            {!quest.completed && onFail && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onFail();
                    }}
                    style={{
                        background: "rgba(244, 67, 54, 0.2)",
                        border: "1px solid rgba(244, 67, 54, 0.4)",
                        borderRadius: 4,
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "#f44336",
                        fontWeight: 500,
                    }}
                    title="Fail Quest"
                >
                    ✗
                </button>
            )}
            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    style={{
                        background: "#f44336",
                        border: "1px solid #f44336",
                        borderRadius: 4,
                        padding: 0,
                        cursor: "pointer",
                        fontSize: 14,
                        color: "#ffffff",
                        fontWeight: "bold",
                        minWidth: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                    }}
                    title="Delete Quest"
                >
                    <span style={{
                        position: "relative",
                        width: "12px",
                        height: "12px",
                    }}>
                        <span style={{
                            position: "absolute",
                            top: "50%",
                            left: "0",
                            width: "100%",
                            height: "2px",
                            backgroundColor: "#ffffff",
                            transform: "translateY(-50%) rotate(45deg)",
                        }}></span>
                        <span style={{
                            position: "absolute",
                            top: "50%",
                            left: "0",
                            width: "100%",
                            height: "2px",
                            backgroundColor: "#ffffff",
                            transform: "translateY(-50%) rotate(-45deg)",
                        }}></span>
                    </span>
                </button>
            )}
        </div>
    );
};

interface QuestSubtasksProps {
    quest: Quest;
    showSubtasks: boolean;
    onToggleSubtask: (questTitle: string, subtaskIndex: number) => void;
}

export const QuestSubtasks: React.FC<QuestSubtasksProps> = ({
    quest,
    showSubtasks,
    onToggleSubtask,
}) => {
    if (!showSubtasks || !quest.subtasks || quest.subtasks.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                marginTop: 8,
                paddingLeft: 12,
                borderLeft: "2px solid rgba(255, 255, 255, 0.1)",
            }}
        >
            {quest.subtasks.map((subtask, index) => (
                <div
                    key={index}
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 6,
                        fontSize: 11,
                    }}
                >
                    <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => onToggleSubtask(quest.title, index)}
                        style={{
                            marginTop: 2,
                            cursor: "pointer",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                textDecoration: subtask.completed ? "line-through" : "none",
                                color: subtask.completed
                                    ? "rgba(255, 255, 255, 0.4)"
                                    : "rgba(255, 255, 255, 0.8)",
                            }}
                        >
                            {subtask.text}
                        </div>
                        {subtask.description && (
                            <div
                                style={{
                                    fontSize: 10,
                                    color: "rgba(255, 255, 255, 0.5)",
                                    marginTop: 2,
                                    fontStyle: "italic",
                                }}
                            >
                                {subtask.description}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

interface QuestNotesProps {
    quest: Quest;
    showNotes: boolean;
}

export const QuestNotes: React.FC<QuestNotesProps> = ({ quest, showNotes }) => {
    if (!showNotes || !quest.notes) {
        return null;
    }

    return (
        <div
            style={{
                marginTop: 4,
                padding: 8,
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: 4,
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.6)",
                lineHeight: 1.4,
            }}
        >
            {quest.notes}
        </div>
    );
};