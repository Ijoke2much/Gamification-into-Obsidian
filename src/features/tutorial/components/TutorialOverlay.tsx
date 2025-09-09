import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TutorialStep } from '../types/TutorialTypes';
import { useMobileOptimizations } from '../../../shared/hooks/useMobileOptimizations';
import styles from './TutorialOverlay.module.css';

interface TutorialOverlayProps {
  step: TutorialStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onClose: () => void;
  isVisible: boolean;
  tutorialTitle: string;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  onClose,
  isVisible,
  tutorialTitle
}) => {
  const { isMobile, isTouchDevice, mobileUtils } = useMobileOptimizations();
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Find and highlight target element
  useEffect(() => {
    if (!step.target || !isVisible) {
      setHighlightedElement(null);
      return;
    }

    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      
      // Calculate popover position
      const rect = element.getBoundingClientRect();
      const padding = step.highlightPadding || 8;
      
      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'top':
          top = rect.top - 70 - padding;
          left = rect.left + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 320 - padding;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + padding;
          break;
        case 'center':
        default:
          top = window.innerHeight / 2;
          left = window.innerWidth / 2;
          break;
      }

      // Mobile adjustments
      if (isMobile) {
        if (step.position === 'left' || step.position === 'right') {
          // Force center position on mobile for left/right
          top = rect.bottom + padding;
          left = window.innerWidth / 2;
        }
        
        // Ensure popover stays within viewport
        const popoverWidth = 320;
        const popoverHeight = 200;
        
        if (left + popoverWidth / 2 > window.innerWidth - 20) {
          left = window.innerWidth - popoverWidth / 2 - 20;
        }
        if (left - popoverWidth / 2 < 20) {
          left = popoverWidth / 2 + 20;
        }
        if (top + popoverHeight > window.innerHeight - 20) {
          top = rect.top - popoverHeight - padding;
        }
        if (top < 20) {
          top = 20;
        }
      }

      setPopoverPosition({ top, left });

      // Scroll element into view if needed
      if (!mobileUtils.isInViewport(element)) {
        mobileUtils.scrollToElement(element, 100);
      }
    }
  }, [step.target, step.position, step.highlightPadding, isVisible, isMobile, mobileUtils]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (step.showBack !== false && currentStepIndex > 0) {
            onBack();
          }
          break;
        case 'ArrowRight':
        case 'Space':
        case 'Enter':
          if (step.showNext !== false && currentStepIndex < totalSteps - 1) {
            onNext();
          } else if (currentStepIndex === totalSteps - 1) {
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, step, currentStepIndex, totalSteps, onNext, onBack, onClose]);

  // Auto-next functionality
  useEffect(() => {
    if (step.autoNext && step.validation && isVisible) {
      const checkValidation = setInterval(() => {
        if (step.validation!()) {
          onNext();
        }
      }, 500);

      return () => clearInterval(checkValidation);
    }
  }, [step.autoNext, step.validation, isVisible, onNext]);

  if (!isVisible) return null;

  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  return createPortal(
    <div className={styles.overlay} ref={overlayRef}>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={step.position === 'center' ? undefined : onClose} />
      
      {/* Highlight circle for target element */}
      {highlightedElement && (
        <div
          className={styles.highlight}
          style={{
            top: highlightedElement.getBoundingClientRect().top - (step.highlightPadding || 8),
            left: highlightedElement.getBoundingClientRect().left - (step.highlightPadding || 8),
            width: highlightedElement.getBoundingClientRect().width + (step.highlightPadding || 8) * 2,
            height: highlightedElement.getBoundingClientRect().height + (step.highlightPadding || 8) * 2,
          }}
        />
      )}

      {/* Tutorial popover */}
      <div
        ref={popoverRef}
        className={`${styles.popover} ${isMobile ? styles.mobile : ''} ${styles[step.position || 'center']}`}
        style={{
          top: popoverPosition.top,
          left: popoverPosition.left,
          transform: step.position === 'center' ? 'translate(-50%, -50%)' : 
                    step.position === 'top' || step.position === 'bottom' ? 'translateX(-50%)' :
                    step.position === 'left' || step.position === 'right' ? 'translateY(-50%)' : 'none'
        }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>
            <h3>{step.title}</h3>
            <div className={styles.stepCounter}>
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close tutorial">
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Content */}
        <div className={styles.content}>
          {step.customContent || (
            <p className={styles.description}>{step.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <div className={styles.leftActions}>
            {step.skippable && step.showSkip !== false && (
              <button 
                className={`${styles.button} ${styles.skipButton}`} 
                onClick={onSkip}
              >
                Skip Tutorial
              </button>
            )}
          </div>

          <div className={styles.rightActions}>
            {step.showBack !== false && currentStepIndex > 0 && (
              <button 
                className={`${styles.button} ${styles.backButton}`} 
                onClick={onBack}
              >
                ← Back
              </button>
            )}
            
            {step.showNext !== false && (
              <button 
                className={`${styles.button} ${styles.nextButton}`} 
                onClick={currentStepIndex === totalSteps - 1 ? onClose : onNext}
              >
                {currentStepIndex === totalSteps - 1 ? 'Complete' : 'Next →'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile-specific touch hints */}
        {isTouchDevice && (
          <div className={styles.touchHints}>
            <small>💡 Tap anywhere outside to close • Swipe for navigation</small>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
