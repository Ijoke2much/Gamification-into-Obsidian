import React from 'react';
import styles from '../QuestModal.module.css';

interface QuestModalAdvancedOptionsProps {
    showAdvancedOptions: boolean;
    setShowAdvancedOptions: (show: boolean) => void;
    activeAdvancedTab: 'details' | 'customization' | 'features';
    setActiveAdvancedTab: (tab: 'details' | 'customization' | 'features') => void;
    
    // Details tab props
    description: string;
    setDescription: (description: string) => void;
    due: string;
    setDue: (due: string) => void;
    recur: string;
    setRecur: (recur: string) => void;
    scheduleTime: string;
    setScheduleTime: (time: string) => void;
    estimatedMinutes: string;
    setEstimatedMinutes: (minutes: string) => void;
    
    // Customization tab props
    questGiverImagePath: string;
    setQuestGiverImagePath: (path: string) => void;
    questGiverName: string;
    setQuestGiverName: (name: string) => void;
    
    // Features tab props
    subtasks: Array<{ text: string; completed: boolean; description?: string }>;
    newSubtask: string;
    setNewSubtask: (subtask: string) => void;
    newSubtaskDescription: string;
    setNewSubtaskDescription: (description: string) => void;
    handleAddSubtask: () => void;
    handleRemoveSubtask: (index: number) => void;
    
    // Mobile
    isMobile: boolean;
}

export const QuestModalAdvancedOptions: React.FC<QuestModalAdvancedOptionsProps> = ({
    showAdvancedOptions,
    setShowAdvancedOptions,
    activeAdvancedTab,
    setActiveAdvancedTab,
    description,
    setDescription,
    due,
    setDue,
    recur,
    setRecur,
    scheduleTime,
    setScheduleTime,
    estimatedMinutes,
    setEstimatedMinutes,
    questGiverImagePath,
    setQuestGiverImagePath,
    questGiverName,
    setQuestGiverName,
    subtasks,
    newSubtask,
    setNewSubtask,
    newSubtaskDescription,
    setNewSubtaskDescription,
    handleAddSubtask,
    handleRemoveSubtask,
    isMobile
}) => {
    if (!showAdvancedOptions) {
        return (
            <div style={{ marginBottom: 24 }}>
                <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(true)}
                    style={{
                        width: "100%",
                        padding: "16px 20px",
                        backgroundColor: "rgba(var(--interactive-accent-rgb), 0.1)",
                        border: "2px solid var(--interactive-accent)",
                        borderRadius: 12,
                        color: "var(--interactive-accent)",
                        cursor: "pointer",
                        fontSize: 16,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        transition: "all 0.3s ease",
                    }}
                >
                    ⚙️ Advanced Options
                    <span style={{
                        transform: "rotate(0deg)",
                        transition: "transform 0.3s ease",
                        fontSize: 18,
                    }}>
                        ▼
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: 24 }}>
            <button
                type="button"
                onClick={() => setShowAdvancedOptions(false)}
                style={{
                    width: "100%",
                    padding: "16px 20px",
                    backgroundColor: "var(--interactive-accent)",
                    border: "2px solid var(--interactive-accent)",
                    borderRadius: 12,
                    color: "white",
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    transition: "all 0.3s ease",
                }}
            >
                ⚙️ Advanced Options
                <span style={{
                    transform: "rotate(180deg)",
                    transition: "transform 0.3s ease",
                    fontSize: 18,
                }}>
                    ▼
                </span>
            </button>

            {/* Advanced Options Content */}
            <div style={{
                marginTop: 16,
                padding: 20,
                backgroundColor: "var(--background-secondary)",
                borderRadius: 12,
                border: "1px solid var(--background-modifier-border)",
                animation: "slideDown 0.3s ease-out",
            }}>
                {/* Tab Navigation */}
                <div style={{
                    display: "flex",
                    gap: 4,
                    marginBottom: 20,
                    borderBottom: "2px solid var(--background-modifier-border)",
                }}>
                    {[
                        { id: 'details', label: '📝 Details', icon: '📝' },
                        { id: 'customization', label: '🎨 Customization', icon: '🎨' },
                        { id: 'features', label: '⚡ Features', icon: '⚡' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveAdvancedTab(tab.id as 'details' | 'customization' | 'features')}
                            style={{
                                padding: "12px 16px",
                                backgroundColor: activeAdvancedTab === tab.id ? "var(--interactive-accent)" : "transparent",
                                border: "none",
                                borderRadius: "8px 8px 0 0",
                                color: activeAdvancedTab === tab.id ? "white" : "var(--text-normal)",
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: 500,
                                transition: "all 0.2s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            {tab.icon} {tab.label.replace(/^[^\s]+ /, '')}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={{ minHeight: 200 }}>
                    {activeAdvancedTab === 'details' && (
                        <div>
                            {/* Quest Description */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}>
                                    Quest Description (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Enter quest description..."
                                    rows={3}
                                    style={{
                                        width: "100%",
                                        padding: 12,
                                        borderRadius: 8,
                                        border: "1px solid var(--background-modifier-border)",
                                        backgroundColor: "var(--background-primary)",
                                        color: "var(--text-normal)",
                                        fontSize: 14,
                                        resize: "vertical",
                                        minHeight: 80
                                    }}
                                />
                            </div>

                            {/* Due Date and Recurrence */}
                            <div style={{ 
                                display: isMobile ? "block" : "flex", 
                                gap: isMobile ? 0 : 16, 
                                marginBottom: 16 
                            }}>
                                <div style={{ 
                                    flex: isMobile ? "none" : 1,
                                    marginBottom: isMobile ? 16 : 0
                                }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: 8,
                                        fontWeight: 600,
                                        color: "var(--text-normal)",
                                    }}>
                                        📅 Due Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={due}
                                        onChange={(e) => setDue(e.target.value)}
                                        className={`${styles.input} ${styles.dateInput}`}
                                    />
                                </div>
                                <div style={{ flex: isMobile ? "none" : 1 }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: 8,
                                        fontWeight: 600,
                                        color: "var(--text-normal)",
                                    }}>
                                        🔄 Recurrence (Optional)
                                    </label>
                                    <select
                                        value={recur}
                                        onChange={(e) => setRecur(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="">No recurrence</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="bi-weekly">Bi-weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="yearly">Yearly</option>
                                        <option value="weekdays">Weekdays only</option>
                                        <option value="weekends">Weekends only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Schedule Time Section */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}>
                                    🕐 Schedule Time
                                </label>
                                
                                {/* Start Time Picker */}
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: 6,
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                        fontWeight: 500,
                                    }}>
                                        Start Time (Optional)
                                    </label>
                                    <input
                                        type="time"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: 12,
                                            borderRadius: 8,
                                            border: "1px solid var(--background-modifier-border)",
                                            backgroundColor: "var(--background-primary)",
                                            color: "var(--text-normal)",
                                            fontSize: 14,
                                        }}
                                    />
                                </div>

                                {/* Quick Time Buttons */}
                                <div style={{
                                    display: "flex",
                                    gap: 6,
                                    marginBottom: 12,
                                    flexWrap: "wrap",
                                }}>
                                    {[
                                        { label: "9 AM", value: "09:00" },
                                        { label: "12 PM", value: "12:00" },
                                        { label: "2 PM", value: "14:00" },
                                        { label: "5 PM", value: "17:00" },
                                        { label: "8 PM", value: "20:00" },
                                    ].map(time => (
                                        <button
                                            key={time.value}
                                            type="button"
                                            onClick={() => setScheduleTime(time.value)}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: 6,
                                                border: scheduleTime === time.value
                                                    ? "2px solid var(--interactive-accent)"
                                                    : "1px solid var(--background-modifier-border)",
                                                backgroundColor: scheduleTime === time.value
                                                    ? "var(--interactive-accent)"
                                                    : "var(--background-secondary)",
                                                color: scheduleTime === time.value
                                                    ? "white"
                                                    : "var(--text-normal)",
                                                cursor: "pointer",
                                                fontSize: 12,
                                                fontWeight: 500,
                                                transition: "all 0.2s ease",
                                            }}
                                        >
                                            {time.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Estimated Duration */}
                                <div>
                                    <label style={{
                                        display: "block",
                                        marginBottom: 6,
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                        fontWeight: 500,
                                    }}>
                                        Estimated Duration (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={estimatedMinutes}
                                        onChange={(e) => setEstimatedMinutes(e.target.value)}
                                        placeholder="e.g., 30, 45m, 1h30m"
                                        style={{
                                            width: "100%",
                                            padding: 12,
                                            borderRadius: 8,
                                            border: "1px solid var(--background-modifier-border)",
                                            backgroundColor: "var(--background-primary)",
                                            color: "var(--text-normal)",
                                            fontSize: 14,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeAdvancedTab === 'customization' && (
                        <div>
                            {/* Quest Giver Name */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}>
                                    Quest Giver Name
                                </label>
                                <input
                                    type="text"
                                    value={questGiverName}
                                    onChange={(e) => setQuestGiverName(e.target.value)}
                                    placeholder="Enter quest giver name..."
                                    style={{
                                        width: "100%",
                                        padding: 12,
                                        borderRadius: 8,
                                        border: "1px solid var(--background-modifier-border)",
                                        backgroundColor: "var(--background-primary)",
                                        color: "var(--text-normal)",
                                        fontSize: 14,
                                    }}
                                />
                            </div>

                            {/* Quest Banner */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <label style={{
                                        fontWeight: 600,
                                        color: "var(--text-normal)",
                                    }}>
                                        🖼️ Quest Banner
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            // TODO: Implement banner upload functionality
                                            alert("Banner upload feature coming soon!");
                                        }}
                                        style={{
                                            fontSize: 12,
                                            padding: "4px 8px",
                                            backgroundColor: "var(--interactive-accent)",
                                            border: "none",
                                            borderRadius: 4,
                                            color: "white",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Add Banner
                                    </button>
                                </div>
                                <div style={{
                                    padding: 16,
                                    backgroundColor: "var(--background-primary)",
                                    border: "2px dashed var(--background-modifier-border)",
                                    borderRadius: 8,
                                    textAlign: "center",
                                    color: "var(--text-muted)",
                                    fontSize: 14,
                                }}>
                                    🖼️ Banner preview will appear here
                                    <br />
                                    <small>Upload an image to customize your quest banner</small>
                                </div>
                            </div>

                            {/* Quest Theme */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}>
                                    🎨 Quest Theme
                                </label>
                                <select
                                    style={{
                                        width: "100%",
                                        padding: 12,
                                        borderRadius: 8,
                                        border: "1px solid var(--background-modifier-border)",
                                        backgroundColor: "var(--background-primary)",
                                        color: "var(--text-normal)",
                                        fontSize: 14,
                                    }}
                                >
                                    <option value="default">Default Theme</option>
                                    <option value="fantasy">Fantasy Adventure</option>
                                    <option value="sci-fi">Sci-Fi Mission</option>
                                    <option value="medieval">Medieval Quest</option>
                                    <option value="modern">Modern Task</option>
                                    <option value="mystery">Mystery Investigation</option>
                                </select>
                            </div>

                            {/* Quest Color Scheme */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}>
                                    🌈 Color Scheme
                                </label>
                                <div style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                }}>
                                    {[
                                        { name: "Blue", color: "#3b82f6" },
                                        { name: "Purple", color: "#8b5cf6" },
                                        { name: "Green", color: "#10b981" },
                                        { name: "Red", color: "#ef4444" },
                                        { name: "Orange", color: "#f97316" },
                                        { name: "Pink", color: "#ec4899" },
                                    ].map((scheme) => (
                                        <button
                                            key={scheme.name}
                                            type="button"
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 8,
                                                backgroundColor: scheme.color,
                                                border: "2px solid transparent",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                            }}
                                            title={scheme.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeAdvancedTab === 'features' && (
                        <div>
                            {/* Subtasks */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontWeight: 600,
                                    color: "var(--text-normal)",
                                }}>
                                    📋 Subquests (Optional)
                                </label>
                                
                                {/* Add Subtask */}
                                <div style={{
                                    display: "flex",
                                    gap: 8,
                                    marginBottom: 12,
                                }}>
                                    <input
                                        type="text"
                                        value={newSubtask}
                                        onChange={(e) => setNewSubtask(e.target.value)}
                                        placeholder="Enter subquest..."
                                        style={{
                                            flex: 1,
                                            padding: 12,
                                            borderRadius: 8,
                                            border: "1px solid var(--background-modifier-border)",
                                            backgroundColor: "var(--background-primary)",
                                            color: "var(--text-normal)",
                                            fontSize: 14,
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSubtask}
                                        disabled={!newSubtask.trim()}
                                        style={{
                                            padding: "12px 16px",
                                            backgroundColor: "var(--interactive-accent)",
                                            border: "none",
                                            borderRadius: 8,
                                            color: "white",
                                            cursor: "pointer",
                                            fontSize: 14,
                                            fontWeight: 600,
                                            opacity: newSubtask.trim() ? 1 : 0.5,
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>
                                
                                {/* Subtask Description */}
                                <input
                                    type="text"
                                    value={newSubtaskDescription}
                                    onChange={(e) => setNewSubtaskDescription(e.target.value)}
                                    placeholder="Optional subquest description..."
                                    style={{
                                        width: "100%",
                                        padding: 8,
                                        borderRadius: 4,
                                        border: "1px solid var(--background-modifier-border)",
                                        backgroundColor: "var(--background-primary)",
                                        color: "var(--text-normal)",
                                        fontSize: 12,
                                        marginBottom: 12,
                                    }}
                                />

                                {/* Subtasks List */}
                                {subtasks.length > 0 && (
                                    <div style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                    }}>
                                        {subtasks.map((subtask, index) => (
                                            <div key={index} style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                padding: "8px 12px",
                                                backgroundColor: "var(--background-primary)",
                                                border: "1px solid var(--background-modifier-border)",
                                                borderRadius: 6,
                                            }}>
                                                <span style={{
                                                    flex: 1,
                                                    fontSize: 14,
                                                    color: "var(--text-normal)",
                                                }}>
                                                    {subtask.text}
                                                </span>
                                                {subtask.description && (
                                                    <span style={{
                                                        fontSize: 12,
                                                        color: "var(--text-muted)",
                                                        fontStyle: "italic",
                                                    }}>
                                                        {subtask.description}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSubtask(index)}
                                                    style={{
                                                        background: "#f44336",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        color: "white",
                                                        cursor: "pointer",
                                                        width: 24,
                                                        height: 24,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: 12,
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
