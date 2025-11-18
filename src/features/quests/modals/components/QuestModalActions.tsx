import React, { memo } from 'react';

interface QuestModalActionsProps {
    mode: "create" | "edit";
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

export const QuestModalActions: React.FC<QuestModalActionsProps> = memo(({
    mode,
    onClose,
    onSubmit
}) => {
    return (
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <button
                type="button"
                onClick={onClose}
                style={{
                    padding: "12px 24px",
                    backgroundColor: "var(--background-secondary)",
                    border: "1px solid var(--background-modifier-border)",
                    borderRadius: 6,
                    color: "var(--text-normal)",
                    cursor: "pointer",
                    fontSize: 14,
                }}
            >
                Cancel
            </button>
            <button
                type="submit"
                onClick={onSubmit}
                style={{
                    padding: "12px 24px",
                    backgroundColor: "var(--interactive-accent)",
                    border: "none",
                    borderRadius: 6,
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                }}
            >
                {mode === "create" ? "Create Quest" : "Update Quest"}
            </button>
        </div>
    );
});
