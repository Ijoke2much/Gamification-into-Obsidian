import React, { memo } from 'react';

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
        <>
            {/* Mobile-specific CSS */}
            <style>{`
                @media (max-width: 768px), (pointer: coarse) {
                    .mobile-quest-modal {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        align-items: flex-start !important;
                        justify-content: flex-start !important;
                    }
                    
                    .mobile-quest-modal-content {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        max-width: none !important;
                        max-height: none !important;
                        margin: 0 !important;
                        padding: 12px !important;
                        border-radius: 0 !important;
                        box-sizing: border-box !important;
                        overflow-y: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }
                    
                    .mobile-quest-modal-content input,
                    .mobile-quest-modal-content select,
                    .mobile-quest-modal-content textarea {
                        min-height: 44px !important;
                        font-size: 16px !important;
                        padding: 12px !important;
                        border: 2px solid var(--interactive-accent) !important;
                        border-radius: 8px !important;
                    }
                    
                    .mobile-quest-modal-content button {
                        min-height: 44px !important;
                        font-size: 16px !important;
                        padding: 12px 16px !important;
                        border-radius: 8px !important;
                    }
                    
                    .mobile-hidden {
                        display: none !important;
                    }
                    
                    .mobile-date-spacing {
                        margin-bottom: 16px !important;
                    }
                }
            `}</style>
            
            {/* Header with close button */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: isMobile ? '16px' : '20px'
            }}>
                <h2 style={{
                    margin: "0",
                    color: "var(--text-normal)",
                    fontSize: isMobile ? "20px" : "24px",
                    fontWeight: 700,
                    flex: 1
                }}>
                    {mode === "create" ? "Create New Quest" : "Edit Quest"}
                </h2>
                
                {isMobile && (
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: "var(--interactive-accent)",
                            color: "var(--text-on-accent)",
                            border: "none",
                            borderRadius: "50%",
                            width: "44px",
                            height: "44px",
                            fontSize: "20px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        ×
                    </button>
                )}
            </div>
        </>
    );
});
