import React, { useRef } from 'react';
import { EnhancedTouchInteractions } from './EnhancedTouchInteractions';
import { HabitData } from '../../habits/utils/habitsUtils';
import styles from './MobileTouchEnhancedHabitCard.module.css';

interface MobileTouchEnhancedHabitCardProps {
  habit: HabitData;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleExpanded?: () => void;
  isExpanded?: boolean;
  children: React.ReactNode;
}

export const MobileTouchEnhancedHabitCard: React.FC<MobileTouchEnhancedHabitCardProps> = ({
  habit,
  onComplete,
  onEdit,
  onDelete,
  onToggleExpanded,
  isExpanded = false,
  children
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSwipeRight = () => {
    // Swipe right to complete habit
    onComplete();
  };

  const handleSwipeLeft = () => {
    // Swipe left to edit
    onEdit();
  };

  const handleLongPress = () => {
    // Long press for options menu
    const contextMenu = [
      { label: 'Complete', action: onComplete, icon: '✅' },
      { label: 'Edit', action: onEdit, icon: '✏️' },
      { label: 'Delete', action: onDelete, icon: '🗑️' }
    ];

    // Create and show context menu
    showContextMenu(contextMenu, cardRef.current);
  };

  const handleDoubleTap = () => {
    // Double tap to toggle expanded view
    if (onToggleExpanded) {
      onToggleExpanded();
    }
  };

  const showContextMenu = (items: Array<{label: string, action: () => void, icon: string}>, target: HTMLElement | null) => {
    if (!target) return;

    // Remove existing context menu
    const existingMenu = document.querySelector('.habit-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'habit-context-menu';
    menu.style.cssText = `
      position: fixed;
      background: var(--background-primary);
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      min-width: 150px;
      overflow: hidden;
      animation: contextMenuSlideIn 0.2s ease-out;
    `;

    items.forEach(item => {
      const menuItem = document.createElement('button');
      menuItem.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: none;
        color: var(--text-normal);
        text-align: left;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s ease;
        font-size: 0.9rem;
      `;
      menuItem.innerHTML = `<span>${item.icon}</span> ${item.label}`;
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = 'var(--background-modifier-hover)';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'none';
      });
      
      menuItem.addEventListener('click', () => {
        item.action();
        menu.remove();
      });
      
      menu.appendChild(menuItem);
    });

    // Position menu
    const rect = target.getBoundingClientRect();
    menu.style.top = `${rect.top + rect.height + 8}px`;
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 200)}px`;

    // Add to document
    document.body.appendChild(menu);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (menu.parentNode) {
        menu.remove();
      }
    }, 5000);

    // Remove on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', handleOutsideClick);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 100);
  };

  return (
    <EnhancedTouchInteractions
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onLongPress={handleLongPress}
      onDoubleTap={handleDoubleTap}
      className={`${styles.habitCard} ${isExpanded ? styles.expanded : ''}`}
      enableHapticFeedback={true}
    >
      <div ref={cardRef} className={styles.cardContent}>
        {children}
        
        {/* Swipe indicators */}
        <div className={styles.swipeIndicators}>
          <div className={styles.swipeLeft}>
            <span>✏️ Edit</span>
          </div>
          <div className={styles.swipeRight}>
            <span>✅ Complete</span>
          </div>
        </div>
      </div>
    </EnhancedTouchInteractions>
  );
};
