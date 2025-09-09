import React, { useEffect, useState } from 'react';
import { PomodoroNotification } from '../types/PomodoroTypes';
import styles from './PomodoroNotification.module.css';

interface PomodoroNotificationProps {
  notification: PomodoroNotification;
  onClose: () => void;
}

export const PomodoroNotificationComponent: React.FC<PomodoroNotificationProps> = ({ 
  notification, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 50);

    // Auto-close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, notification.duration);

    return () => clearTimeout(timer);
  }, [notification.duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getTypeClass = () => {
    switch (notification.type) {
      case 'achievement': return styles.achievement;
      case 'streak': return styles.streak;
      case 'milestone': return styles.milestone;
      case 'xp': return styles.xp;
      default: return styles.default;
    }
  };

  return (
    <div 
      className={`${styles.notification} ${getTypeClass()} ${isVisible ? styles.visible : ''} ${isClosing ? styles.closing : ''}`}
      onClick={handleClose}
    >
      <div className={styles.icon}>
        {notification.icon}
      </div>
      <div className={styles.content}>
        <div className={styles.title}>{notification.title}</div>
        <div className={styles.message}>{notification.message}</div>
      </div>
      <button className={styles.closeButton} onClick={handleClose}>
        ×
      </button>
    </div>
  );
};

// Notification Manager Component
interface NotificationManagerProps {
  notifications: PomodoroNotification[];
  onRemoveNotification: (id: string) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ 
  notifications, 
  onRemoveNotification 
}) => {
  return (
    <div className={styles.notificationContainer}>
      {notifications.map((notification) => (
        <PomodoroNotificationComponent
          key={notification.id}
          notification={notification}
          onClose={() => onRemoveNotification(notification.id)}
        />
      ))}
    </div>
  );
};