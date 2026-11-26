import React, { memo } from 'react';
import styles from '../QuestModal.module.css';

interface QuestModalHeaderProps {
    mode: "create" | "edit";
    isMobile: boolean;
    onClose: () => void;
}

export const QuestModalHeader: React.FC<QuestModalHeaderProps> = memo(({
    mode,
    isMobile,
    onClose
}) => {
    return (
        <div className={isMobile ? styles.mobileHeaderBar : undefined} style={isMobile ? undefined : {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
        }}>
            <h2 style={{
                margin: 0,
                color: 'var(--text-normal)',
                fontSize: isMobile ? 16 : 24,
                fontWeight: 700,
                flex: 1,
                lineHeight: 1.3,
                paddingRight: 8,
            }}>
                {mode === 'create' ? 'Create New Quest' : 'Edit Quest'}
            </h2>

            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={isMobile ? styles.mobileCloseBtn : undefined}
                style={isMobile ? undefined : {
                    background: 'var(--interactive-accent)',
                    color: 'var(--text-on-accent)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    fontSize: 18,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                ×
            </button>
        </div>
    );
});
