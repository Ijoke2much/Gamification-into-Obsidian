import React, { memo } from 'react';

interface QuestModalActionsProps {
    mode: "create" | "edit";
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    isSubmitting?: boolean;
}

export const QuestModalActions: React.FC<QuestModalActionsProps> = memo(({
    mode,
    onClose,
    onSubmit,
    isSubmitting = false,
}) => {
    return (
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                style={{
                    padding: "12px 24px",
                    backgroundColor: "var(--interactive-accent)",
                    border: "none",
                    borderRadius: 6,
                    color: "white",
                    cursor: isSubmitting ? "wait" : "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                    opacity: isSubmitting ? 0.8 : 1,
                }}
            >
                {isSubmitting ? "Saving…" : (mode === "create" ? "Create Quest" : "Update Quest")}
            </button>
        </div>
    );
});
