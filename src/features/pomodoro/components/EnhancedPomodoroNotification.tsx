import React, { useEffect, useState } from 'react';
import styles from './EnhancedPomodoroNotification.module.css';

interface EnhancedPomodoroNotificationProps {
  type: 'subtask_complete' | 'quest_progress' | 'session_complete' | 'achievement' | 'material_reward';
  title: string;
  message: string;
  icon: string;
  progress?: number;
  rewards?: {
    xp?: number;
    cp?: number;
    currency?: number;
    materials?: Array<{
      name: string;
      icon: string;
      quality: string;
    }>;
  };
  duration?: number;
  onClose: () => void;
}

export const EnhancedPomodoroNotification: React.FC<EnhancedPomodoroNotificationProps> = ({
  type,
  title,
  message,
  icon,
  progress,
  rewards,
  duration = 4000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 50);

    // Show rewards after a short delay for session completion
    if (type === 'session_complete' && rewards) {
      setTimeout(() => setShowRewards(true), 500);
    }

    // Auto-close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, type, rewards]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getTypeClass = () => {
    switch (type) {
      case 'subtask_complete': return styles.subtaskComplete;
      case 'quest_progress': return styles.questProgress;
      case 'session_complete': return styles.sessionComplete;
      case 'achievement': return styles.achievement;
      case 'material_reward': return styles.materialReward;
      default: return styles.default;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#4CAF50';
    if (progress >= 75) return '#FF9800';
    if (progress >= 50) return '#2196F3';
    return '#9E9E9E';
  };

  return (
    <div 
      className={`${styles.notification} ${getTypeClass()} ${isVisible ? styles.visible : ''} ${isClosing ? styles.closing : ''}`}
      onClick={handleClose}
    >
      <div className={styles.notificationHeader}>
        <div className={styles.iconContainer}>
          <span className={styles.icon}>{icon}</span>
        </div>
        <div className={styles.content}>
          <div className={styles.title}>{title}</div>
          <div className={styles.message}>{message}</div>
        </div>
        <button className={styles.closeButton} onClick={handleClose}>
          ×
        </button>
      </div>

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ 
                width: `${progress}%`,
                backgroundColor: getProgressColor(progress)
              }}
            />
          </div>
          <div className={styles.progressText}>{progress}% Complete</div>
        </div>
      )}

      {/* Rewards Display */}
      {showRewards && rewards && (
        <div className={styles.rewardsContainer}>
          <div className={styles.rewardsTitle}>Rewards Earned:</div>
          <div className={styles.rewardsGrid}>
            {rewards.xp && (
              <div className={styles.rewardItem}>
                <span className={styles.rewardIcon}>⭐</span>
                <span className={styles.rewardValue}>+{rewards.xp} XP</span>
              </div>
            )}
            {rewards.cp && (
              <div className={styles.rewardItem}>
                <span className={styles.rewardIcon}>⚡</span>
                <span className={styles.rewardValue}>+{rewards.cp} CP</span>
              </div>
            )}
            {rewards.currency && (
              <div className={styles.rewardItem}>
                <span className={styles.rewardIcon}>🪙</span>
                <span className={styles.rewardValue}>+{rewards.currency} Coins</span>
              </div>
            )}
          </div>
          
          {/* Materials */}
          {rewards.materials && rewards.materials.length > 0 && (
            <div className={styles.materialsSection}>
              <div className={styles.materialsTitle}>Materials Found:</div>
              <div className={styles.materialsGrid}>
                {rewards.materials.map((material, index) => (
                  <div key={index} className={styles.materialItem}>
                    <span className={styles.materialIcon}>{material.icon}</span>
                    <span className={styles.materialName}>{material.name}</span>
                    <span className={`${styles.materialQuality} ${styles[material.quality]}`}>
                      {material.quality}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confetti effect for achievements */}
      {type === 'achievement' && (
        <div className={styles.confettiContainer}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={styles.confetti}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Notification Manager for multiple notifications
interface NotificationManagerProps {
  notifications: Array<{
    id: string;
    type: 'subtask_complete' | 'quest_progress' | 'session_complete' | 'achievement' | 'material_reward';
    title: string;
    message: string;
    icon: string;
    progress?: number;
    rewards?: {
      xp?: number;
      cp?: number;
      currency?: number;
      materials?: Array<{
        name: string;
        icon: string;
        quality: string;
      }>;
    };
  }>;
  onRemoveNotification: (id: string) => void;
}

export const EnhancedNotificationManager: React.FC<NotificationManagerProps> = ({ 
  notifications, 
  onRemoveNotification 
}) => {
  return (
    <div className={styles.notificationContainer}>
      {notifications.map((notification) => (
        <EnhancedPomodoroNotification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          icon={notification.icon}
          progress={notification.progress}
          rewards={notification.rewards}
          onClose={() => onRemoveNotification(notification.id)}
        />
      ))}
    </div>
  );
};
