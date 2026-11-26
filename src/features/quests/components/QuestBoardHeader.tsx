import React from "react";
import styles from "./QuestBoardHeader.module.css";

interface QuestBoardHeaderProps {
    onAddQuest: () => void;
    onQuickCapture?: () => void;
}

export const QuestBoardHeader: React.FC<QuestBoardHeaderProps> = ({ 
    onAddQuest,
    onQuickCapture,
}) => (
    <div className={styles.headerContainer}>
        <div className={styles.header}>
            <div className={styles.titleSection}>
                <div className={styles.title}>Quest Board</div>
                <div className={styles.subtitle}>
                    Adventures await...
                </div>
            </div>
            <div className={styles.buttonContainer}>
                <button
                    onClick={onAddQuest}
                    className={styles.addQuestButton}
                >
                    + Add Quest
                </button>
                {onQuickCapture && (
                    <button
                        type="button"
                        onClick={onQuickCapture}
                        className={styles.captureButton}
                        title="Brain dump — saves to Capture.md"
                    >
                        🧠 Brain Dump
                    </button>
                )}
            </div>
        </div>
    </div>
); 