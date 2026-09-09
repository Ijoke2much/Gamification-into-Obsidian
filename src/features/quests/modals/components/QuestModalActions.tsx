import React, { memo } from 'react';
import styles from '../QuestModal.module.css';

interface QuestModalActionsProps {
    mode: "create" | "edit";
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    isSubmitting?: boolean;
    isMobile?: boolean;
    canSubmit?: boolean;
}

export const QuestModalActions: React.FC<QuestModalActionsProps> = memo(({
    mode,
    onClose,
    onSubmit,
    isSubmitting = false,
    isMobile = false,
    canSubmit = true,
}) => {
    const submitDisabled = isSubmitting || !canSubmit;
    return (
        <div
            className={isMobile ? styles.mobileFooterActions : undefined}
            style={isMobile ? undefined : {
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end',
                marginTop: 24,
            }}
        >
            <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                    padding: isMobile ? '12px 14px' : '12px 24px',
                    backgroundColor: 'var(--background-secondary)',
                    border: '1px solid var(--background-modifier-border)',
                    borderRadius: 6,
                    color: 'var(--text-normal)',
                    cursor: 'pointer',
                    fontSize: isMobile ? 15 : 14,
                    fontWeight: isMobile ? 700 : 400,
                }}
            >
                Cancel
            </button>
            <button
                type="submit"
                onClick={onSubmit}
                disabled={submitDisabled}
                title={!canSubmit ? "Add a skill to continue" : undefined}
                style={{
                    padding: isMobile ? '12px 14px' : '12px 24px',
                    backgroundColor: 'var(--interactive-accent)',
                    border: 'none',
                    borderRadius: 6,
                    color: 'white',
                    cursor: submitDisabled ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: isMobile ? 15 : 14,
                    opacity: submitDisabled ? 0.55 : 1,
                }}
            >
                {isSubmitting ? 'Saving…' : (mode === 'create' ? 'Create Quest' : 'Update Quest')}
            </button>
        </div>
    );
});
