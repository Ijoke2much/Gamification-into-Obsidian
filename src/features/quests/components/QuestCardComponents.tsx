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
        <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    {hasSubtasks && (
                        <button
                            onClick={onToggleSubtasks}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#888",
                                fontSize: 12,
                                cursor: "pointer",
                                padding: 2,
                                lineHeight: 1,
                                flexShrink: 0
                            }}
                        >
                            {showSubtasks ? "▼" : "▶"}
                        </button>
                    )}
                    

                    
                    <span
                        style={{
                            fontWeight: 600,
                            color: quest.completed ? "#888" : "#fff",
                            textDecoration: quest.completed ? "line-through" : "none",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: 15
                        }}
                    >
                        {quest.title}
                    </span>

                    <button
                        onClick={onToggleFavorite}
                        style={{
                            background: "none",
                            border: "none",
                            color: quest.isFavorite ? "#ffd700" : "#666",
                            fontSize: 16,
                            cursor: "pointer",
                            padding: 2,
                            lineHeight: 1,
                            flexShrink: 0,
                            textShadow: quest.isFavorite ? "0 0 8px #ffd700" : "none"
                        }}
                        title={quest.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                        {quest.isFavorite ? "★" : "☆"}
                    </button>
                </div>
            </div>
            
            {/* Description - More Prominent */}
            {quest.description && (
                <div style={{
                    color: "#e2e8f0",
                    fontSize: 13,
                    fontStyle: "italic",
                    marginBottom: 8,
                    padding: "6px 10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: 6,
                    borderLeft: "3px solid #4299e1",
                    lineHeight: 1.4
                }}>
                    💭 {quest.description}
                </div>
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
            // Parse the date string more carefully
            const date = new Date(dateStr + 'T00:00:00'); // Ensure it's treated as local time
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Set all times to midnight for accurate comparison
            today.setHours(0, 0, 0, 0);
            tomorrow.setHours(0, 0, 0, 0);
            date.setHours(0, 0, 0, 0);
            
            // Format the actual date for display
            const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
            
            if (date.getTime() === today.getTime()) return `Today (${formattedDate})`;
            if (date.getTime() === tomorrow.getTime()) return `Tomorrow (${formattedDate})`;
            if (date.getTime() < today.getTime()) return `Overdue (${formattedDate})`;
            
            // For future dates, show relative time + actual date
            const diffTime = date.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 7) {
                return `In ${diffDays} day${diffDays > 1 ? 's' : ''} (${formattedDate})`;
            }
            
            return formattedDate;
        } catch {
            return dateStr;
        }
    };

    const getDateColor = (dateStr?: string) => {
        if (!dateStr) return "#747d8c";
        try {
            const date = new Date(dateStr + 'T00:00:00'); // Ensure it's treated as local time
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

    const getDateIcon = (dateStr?: string) => {
        if (!dateStr) return "📅";
        try {
            const date = new Date(dateStr + 'T00:00:00'); // Ensure it's treated as local time
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            date.setHours(0, 0, 0, 0);
            
            if (date.getTime() < today.getTime()) return "🚨"; // Overdue
            if (date.getTime() === today.getTime()) return "⏰"; // Today
            return "📅"; // Future
        } catch {
            return "📅";
        }
    };

    const getOverdueTime = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
            const dueDate = new Date(dateStr + 'T00:00:00');
            const now = new Date();
            
            // Set due date to end of day for more accurate calculation
            dueDate.setHours(23, 59, 59, 999);
            
            if (dueDate > now) return null; // Not overdue
            
            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            if (diffDays > 0) {
                if (diffDays === 1) return "1 day overdue";
                if (diffDays < 7) return `${diffDays} days overdue`;
                if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks overdue`;
                return `${Math.floor(diffDays / 30)} months overdue`;
            } else if (diffHours > 0) {
                return `${diffHours} hours overdue`;
            } else {
                return "Just overdue";
            }
        } catch {
            return null;
        }
    };

    const getUrgencyColor = (dateStr?: string) => {
        if (!dateStr) return "rgba(255, 71, 87, 0.9)";
        try {
            const dueDate = new Date(dateStr + 'T00:00:00');
            const now = new Date();
            dueDate.setHours(23, 59, 59, 999);
            
            if (dueDate > now) return "rgba(255, 71, 87, 0.9)"; // Not overdue
            
            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 1) return "rgba(255, 152, 0, 0.9)"; // Orange
            if (diffDays <= 3) return "rgba(255, 71, 87, 0.9)"; // Red
            return "rgba(156, 39, 176, 0.9)"; // Purple for very overdue
        } catch {
            return "rgba(255, 71, 87, 0.9)";
        }
    };

    return (
        <div style={{ marginBottom: 8 }}>
            {/* Skills */}
            {quest.skills && quest.skills.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                    {quest.skills.map((skill, index) => (
                        <span
                            key={index}
                            style={{
                                background: "rgba(59, 130, 246, 0.2)",
                                color: "#60a5fa",
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 500,
                                marginRight: 6,
                                border: "1px solid rgba(59, 130, 246, 0.3)"
                            }}
                        >
                            🛠️ {skill}
                        </span>
                    ))}
                </div>
            )}

            {/* Date and Recurrence - More Prominent */}
            {(quest.due || quest.recur) && (
                <div style={{ 
                    display: "flex", 
                    gap: 8, 
                    alignItems: "center", 
                    marginBottom: 8,
                    padding: "4px 8px",
                    background: "rgba(0, 0, 0, 0.2)",
                    borderRadius: 6,
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                }}>
                    {quest.due && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ 
                                background: getDateColor(quest.due),
                                color: "white",
                                padding: "3px 8px", 
                                borderRadius: 4, 
                                fontSize: 12,
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                boxShadow: `0 2px 4px ${getDateColor(quest.due)}40`
                            }}>
                                {getDateIcon(quest.due)} {formatDate(quest.due)}
                            </span>
                            
                            {/* Overdue Time Display */}
                            {getOverdueTime(quest.due) && (
                                <span style={{
                                    background: getUrgencyColor(quest.due),
                                    color: "white",
                                    padding: "2px 6px",
                                    borderRadius: 3,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    animation: "pulse 2s infinite",
                                    boxShadow: "0 1px 3px rgba(255, 71, 87, 0.4)"
                                }}>
                                    ⏰ {getOverdueTime(quest.due)}
                                </span>
                            )}
                        </div>
                    )}
                    {quest.recur && (
                        <span style={{ 
                            background: "rgba(108, 99, 255, 0.3)", 
                            color: "#c4b5fd", 
                            padding: "3px 8px", 
                            borderRadius: 4, 
                            fontSize: 12,
                            fontWeight: 600,
                            border: "1px solid rgba(108, 99, 255, 0.5)",
                            textTransform: "capitalize"
                        }}>
                            🔁 {quest.recur}
                        </span>
                    )}
                </div>
            )}

            {/* Rewards, Difficulty and Progress */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ 
                        background: "linear-gradient(135deg, #FFD700, #FFA500)", 
                        color: "#000", 
                        padding: "3px 8px", 
                        borderRadius: 4, 
                        fontSize: 11, 
                        fontWeight: 600 
                    }}>
                        ✨{quest.xp}
                    </span>
                    <span style={{ 
                        background: "linear-gradient(135deg, #4CAF50, #45a049)", 
                        color: "#fff", 
                        padding: "3px 8px", 
                        borderRadius: 4, 
                        fontSize: 11, 
                        fontWeight: 600 
                    }}>
                        ⭐{quest.cp}
                    </span>
                    <span style={{ 
                        background: "linear-gradient(135deg, #FF9800, #F57C00)", 
                        color: "#fff", 
                        padding: "3px 8px", 
                        borderRadius: 4, 
                        fontSize: 11, 
                        fontWeight: 600 
                    }}>
                        🪙{quest.coins}
                    </span>
                    
                    {/* Difficulty Badge - Only shows if quest has difficulty set */}
                    {quest.difficulty && (
                        <span style={{
                            background: getDifficultyColor(quest.difficulty),
                            color: "white",
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            boxShadow: `0 2px 4px ${getDifficultyColor(quest.difficulty)}40`
                        }}>
                            {getDifficultyStars(quest.difficulty)} {quest.difficulty}
                        </span>
                    )}

                    {/* Priority Badge - Only for Low, Medium, High */}
                    {quest.priority && ['low', 'medium', 'high'].includes(quest.priority.toLowerCase()) && (
                        <span style={{
                            background: quest.priority.toLowerCase() === 'high' ? "rgba(239, 68, 68, 0.2)" : 
                                       quest.priority.toLowerCase() === 'medium' ? "rgba(245, 158, 11, 0.2)" : 
                                       "rgba(34, 197, 94, 0.2)",
                            color: quest.priority.toLowerCase() === 'high' ? "#dc2626" : 
                                   quest.priority.toLowerCase() === 'medium' ? "#d97706" : 
                                   "#16a34a",
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "capitalize",
                            border: quest.priority.toLowerCase() === 'high' ? "1px solid rgba(239, 68, 68, 0.3)" : 
                                    quest.priority.toLowerCase() === 'medium' ? "1px solid rgba(245, 158, 11, 0.3)" : 
                                    "1px solid rgba(34, 197, 94, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                        }}>
                            {getPriorityEmoji(quest.priority)} {quest.priority} Priority
                        </span>
                    )}

                    {/* Time Estimate */}
                    {quest.estimatedTime && (
                        <span style={{
                            background: "rgba(156, 39, 176, 0.2)",
                            color: "#ba68c8",
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            border: "1px solid rgba(156, 39, 176, 0.3)"
                        }}>
                            ⏱️ {quest.estimatedTime}
                        </span>
                    )}

                    {/* Subtask Progress */}
                    {quest.subtasks.length > 0 && (
                        <span style={{ 
                            background: "rgba(59, 130, 246, 0.2)", 
                            color: "#60a5fa", 
                            padding: "3px 8px", 
                            borderRadius: 4, 
                            fontSize: 11, 
                            fontWeight: 600,
                            border: "1px solid rgba(59, 130, 246, 0.3)"
                        }}>
                            📋 {quest.subtasks.filter(s => s.completed).length}/{quest.subtasks.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Creation and Modified Dates */}
            {(quest.createdDate || quest.lastModified) && (
                <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#666", marginBottom: 4 }}>
                    {quest.createdDate && (
                        <span>Created: {new Date(quest.createdDate).toLocaleDateString()}</span>
                    )}
                    {quest.lastModified && (
                        <span>Modified: {new Date(quest.lastModified).toLocaleDateString()}</span>
                    )}
                </div>
            )}
        </div>
    );
};

interface QuestActionsProps {
    quest: Quest;
    onComplete: () => void;
    onUncomplete?: () => void;
    onEdit: () => void;
    onDelete?: () => void;
    onFail?: () => void;
}

export const QuestActions: React.FC<QuestActionsProps> = ({
    quest,
    onComplete,
    onUncomplete,
    onEdit,
    onDelete,
    onFail,
}) => {
    return (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {!quest.completed ? (
                <button
                    onClick={onComplete}
                    style={{
                        background: "#4CAF50",
                        border: "none",
                        borderRadius: 4,
                        color: "white",
                        fontSize: 12,
                        padding: "4px 8px",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                    }}
                    title="Complete Quest"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#45a049";
                        e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#4CAF50";
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    ✓
                </button>
            ) : onUncomplete ? (
                <button
                    onClick={onUncomplete}
                    style={{
                        background: "#FF9800",
                        border: "none",
                        borderRadius: 4,
                        color: "white",
                        fontSize: 12,
                        padding: "4px 8px",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                    }}
                    title="Mark as Incomplete"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#F57C00";
                        e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#FF9800";
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    ↺
                </button>
            ) : null}
            <button
                onClick={onEdit}
                style={{
                    background: "#2196F3",
                    border: "none",
                    borderRadius: 4,
                    color: "white",
                    fontSize: 12,
                    padding: "4px 8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                }}
                title="Edit Quest"
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1976D2";
                    e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#2196F3";
                    e.currentTarget.style.transform = "scale(1)";
                }}
            >
                ✏
            </button>
            {!quest.completed && onFail && (
                <button
                    onClick={onFail}
                    style={{
                        background: "#f44336",
                        border: "none",
                        borderRadius: 4,
                        color: "white",
                        fontSize: 12,
                        padding: "4px 8px",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                    }}
                    title="Fail Quest"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#d32f2f";
                        e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f44336";
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    ✗
                </button>
            )}
            {onDelete && (
                <button
                    onClick={onDelete}
                    style={{
                        background: "#ff6b6b",
                        border: "none",
                        borderRadius: 4,
                        color: "white",
                        fontSize: 12,
                        padding: "4px 8px",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                    }}
                    title="Delete Quest"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#ff5252";
                        e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ff6b6b";
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    🗑
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
    if (!showSubtasks || quest.subtasks.length === 0) return null;

    return (
        <div style={{ 
            background: "rgba(0, 0, 0, 0.2)", 
            borderRadius: 4, 
            padding: 8, 
            marginTop: 8,
            fontSize: 12
        }}>
            {quest.subtasks.map((subtask, index) => (
                <div key={index} style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 6, 
                    marginBottom: 4,
                    color: subtask.completed ? "#888" : "#ccc",
                    transition: "all 0.2s ease"
                }}>
                    <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => onToggleSubtask(quest.title, index)}
                        style={{ 
                            margin: 0, 
                            cursor: "pointer",
                            transform: "scale(1.1)"
                        }}
                    />
                    <span style={{ 
                        textDecoration: subtask.completed ? "line-through" : "none",
                        fontSize: 11,
                        flex: 1
                    }}>
                        {subtask.text}
                    </span>
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
    if (!showNotes || !quest.notes) return null;

    return (
        <div style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 4,
            padding: 8,
            marginTop: 8,
            fontSize: 11,
            color: "#ccc",
            fontStyle: "italic"
        }}>
            📝 {quest.notes}
        </div>
    );
};