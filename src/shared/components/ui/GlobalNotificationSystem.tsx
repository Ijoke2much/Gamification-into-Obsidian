import React, { useState, useEffect } from 'react';
import { notificationService, type Notification } from '../../services/notificationService';
import styles from './GlobalNotificationSystem.module.css';

export const GlobalNotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const handleRemoveNotification = (id: string) => {
    notificationService.remove(id);
  };

  const handleActionClick = (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation();
    if (notification.action) {
      notification.action.onClick();
    }
    handleRemoveNotification(notification.id);
  };

  if (notifications.length === 0) return null;

  return (
    <div className={styles.notificationsContainer}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${styles.notification} ${styles[notification.type]} ${styles[notification.priority || 'normal']}`}
          onClick={() => handleRemoveNotification(notification.id)}
        >
          <span className={styles.notificationIcon}>{notification.icon}</span>
          <div className={styles.notificationContent}>
            <div className={styles.notificationTitle}>{notification.title}</div>
            <div className={styles.notificationMessage}>{notification.message}</div>
            {notification.action && (
              <button
                className={styles.actionButton}
                onClick={(e) => handleActionClick(notification, e)}
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            className={styles.closeButton}
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveNotification(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
