import React, { forwardRef, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { QuestFilters as QuestFiltersType, QuestSortOptions } from "../../../data/hooks/useQuestManagement";

interface QuestSearchBarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    placeholder?: string;
}

export const QuestSearchBar = forwardRef<HTMLInputElement, QuestSearchBarProps>(({
    searchValue,
    onSearchChange,
    placeholder = "Search quests..."
}, ref) => {
    return (
        <div style={{
            position: "relative",
            marginBottom: 16
        }}>
            <input
                ref={ref}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: "100%",
                    padding: "12px 16px 12px 40px",
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "rgba(0, 0, 0, 0.4)",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 500,
                    outline: "none",
                    transition: "all 0.2s ease"
                }}
                onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(59, 130, 246, 0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.2)";
                    e.currentTarget.style.boxShadow = "none";
                }}
            />
            <div style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#888",
                fontSize: 16
            }}>
                🔍
            </div>
            {searchValue && (
                <button
                    onClick={() => onSearchChange("")}
                    style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#888",
                        fontSize: 16,
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 4,
                        transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "none";
                        e.currentTarget.style.color = "#888";
                    }}
                    title="Clear search"
                >
                    ✕
                </button>
            )}
        </div>
    );
});

QuestSearchBar.displayName = 'QuestSearchBar';

interface QuestSortDropdownProps {
    sortOptions: QuestSortOptions;
    onSortChange: (options: QuestSortOptions) => void;
}

export const QuestSortDropdown: React.FC<QuestSortDropdownProps> = ({
    sortOptions,
    onSortChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const sortFields = [
        { value: 'title', label: 'Title' },
        { value: 'priority', label: 'Priority' },
        { value: 'difficulty', label: 'Difficulty' },
        { value: 'due', label: 'Due Date' },
        { value: 'xp', label: 'XP Reward' },
        { value: 'created', label: 'Created Date' },
        { value: 'modified', label: 'Modified Date' }
    ];

    const getSortLabel = () => {
        const field = sortFields.find(f => f.value === sortOptions.field);
        const direction = sortOptions.direction === 'asc' ? '↑' : '↓';
        return `${field?.label || 'Priority'} ${direction}`;
    };

    // Update dropdown position when opened
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
            });
        }
    }, [isOpen]);

    return (
        <div style={{ position: "relative" }}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    minWidth: "120px",
                    maxWidth: "140px",
                    padding: "10px 16px",
                    borderRadius: 6,
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "rgba(0, 0, 0, 0.4)",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.2s ease",
                    flexShrink: 0
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.4)";
                }}
            >
                <span>Sort by: {getSortLabel()}</span>
                <span style={{ color: "#888" }}>{isOpen ? "▲" : "▼"}</span>
            </button>

            {/* Portal for dropdown to avoid parent clipping */}
            {isOpen && createPortal(
                <>
                    {/* Click outside to close */}
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9998
                        }}
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Dropdown menu */}
                    <div style={{
                        position: "fixed",
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        background: "#2a2a2a",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        borderRadius: 8,
                        zIndex: 9999,
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                        overflow: "hidden"
                    }}>
                        {sortFields.map((field) => (
                            <div key={field.value}>
                                <button
                                    onClick={() => {
                                        onSortChange({
                                            field: field.value as QuestSortOptions['field'],
                                            direction: 'desc'
                                        });
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        background: sortOptions.field === field.value && sortOptions.direction === 'desc' 
                                            ? "rgba(59, 130, 246, 0.2)" 
                                            : "transparent",
                                        border: "none",
                                        color: "#fff",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: 13,
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!(sortOptions.field === field.value && sortOptions.direction === 'desc')) {
                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!(sortOptions.field === field.value && sortOptions.direction === 'desc')) {
                                            e.currentTarget.style.background = "transparent";
                                        }
                                    }}
                                >
                                    {field.label} ↓
                                </button>
                                <button
                                    onClick={() => {
                                        onSortChange({
                                            field: field.value as QuestSortOptions['field'],
                                            direction: 'asc'
                                        });
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        background: sortOptions.field === field.value && sortOptions.direction === 'asc' 
                                            ? "rgba(59, 130, 246, 0.2)" 
                                            : "transparent",
                                        border: "none",
                                        color: "#fff",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: 13,
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!(sortOptions.field === field.value && sortOptions.direction === 'asc')) {
                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!(sortOptions.field === field.value && sortOptions.direction === 'asc')) {
                                            e.currentTarget.style.background = "transparent";
                                        }
                                    }}
                                >
                                    {field.label} ↑
                                </button>
                            </div>
                        ))}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

interface QuestFiltersProps {
    filters: QuestFiltersType;
    onFiltersChange: (filters: Partial<QuestFiltersType>) => void;
    availableSkills: string[];
}

export const QuestFilters: React.FC<QuestFiltersProps> = ({
    filters,
    onFiltersChange,
    availableSkills
}) => {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 20,
            padding: 16,
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 12,
            backdropFilter: "blur(10px)"
        }}>
            {/* Status Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.8)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: 4
                }}>
                    Status
                </label>
                <div style={{ position: "relative" }}>
                    <select
                        value={filters.status}
                        onChange={(e) => onFiltersChange({ status: e.target.value })}
                        style={{
                            width: "100%",
                            padding: "5px 16px",
                            borderRadius: 8,
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: "pointer",
                            outline: "none",
                            appearance: "none",
                            transition: "all 0.2s ease",
                            backdropFilter: "blur(10px)"
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "rgba(100, 149, 237, 0.6)";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(100, 149, 237, 0.15)";
                            e.currentTarget.style.background = "linear-gradient(135deg, rgba(100, 149, 237, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)";
                        }}
                    >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="all">All</option>
                    </select>
                    <div style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: 12
                    }}>▼</div>
                </div>
            </div>

            {/* Priority Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.8)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: 4
                }}>
                    Priority
                </label>
                <div style={{ position: "relative" }}>
                    <select
                        value={filters.priority}
                        onChange={(e) => onFiltersChange({ priority: e.target.value })}
                        style={{
                            width: "100%",
                            padding: "5px 16px",
                            borderRadius: 8,
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: "pointer",
                            outline: "none",
                            appearance: "none",
                            transition: "all 0.2s ease",
                            backdropFilter: "blur(10px)"
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "rgba(100, 149, 237, 0.6)";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(100, 149, 237, 0.15)";
                            e.currentTarget.style.background = "linear-gradient(135deg, rgba(100, 149, 237, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)";
                        }}
                    >
                        <option value="all">All</option>
                        <option value="high">🔥 High</option>
                        <option value="medium">⚡ Medium</option>
                        <option value="low">🍃 Low</option>
                    </select>
                    <div style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: 12
                    }}>▼</div>
                </div>
            </div>

            {/* Difficulty Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.8)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: 4
                }}>
                    Difficulty
                </label>
                <div style={{ position: "relative" }}>
                    <select
                        value={filters.difficulty}
                        onChange={(e) => onFiltersChange({ difficulty: e.target.value })}
                        style={{
                            width: "100%",
                            padding: "5px 16px",
                            borderRadius: 8,
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: "pointer",
                            outline: "none",
                            appearance: "none",
                            transition: "all 0.2s ease",
                            backdropFilter: "blur(10px)"
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "rgba(100, 149, 237, 0.6)";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(100, 149, 237, 0.15)";
                            e.currentTarget.style.background = "linear-gradient(135deg, rgba(100, 149, 237, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)";
                        }}
                    >
                        <option value="all">All</option>
                        <option value="easy">🌱 Easy</option>
                        <option value="medium">⚔️ Medium</option>
                        <option value="hard">🔥 Hard</option>
                    </select>
                    <div style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: 12
                    }}>▼</div>
                </div>
            </div>

            {/* Favorites Toggle */}
            <div style={{ gridColumn: "span 3", marginTop: 8 }}>
                <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontSize: 14,
                    color: "#ffffff",
                    fontWeight: 500
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                }}
                >
                    <input
                        type="checkbox"
                        checked={filters.favorites}
                        onChange={(e) => onFiltersChange({ favorites: e.target.checked })}
                        style={{
                            width: 18,
                            height: 18,
                            cursor: "pointer",
                            accentColor: "#6495ed"
                        }}
                    />
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        ⭐ Show only favorites
                    </span>
                </label>
            </div>
        </div>
    );
};