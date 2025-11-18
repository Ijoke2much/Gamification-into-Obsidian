import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useMobileOptimizations, useMobileGestures } from '../../../shared/hooks/useMobileOptimizations';
import styles from './EnhancedTouchInteractions.module.css';

interface TouchInteractionProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  onPinch?: (scale: number) => void;
  disabled?: boolean;
  className?: string;
  enableHapticFeedback?: boolean;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
}

export const EnhancedTouchInteractions: React.FC<TouchInteractionProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  onDoubleTap,
  onPinch,
  disabled = false,
  className = '',
  enableHapticFeedback = true,
  swipeThreshold = 50,
  longPressDelay = 500,
  doubleTapDelay = 300
}) => {
  const { isTouchDevice, mobileUtils } = useMobileOptimizations();
  const { gestureState, handleGestureStart, handleGestureMove, handleGestureEnd, getGestureDelta } = useMobileGestures();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const doubleTapTimerRef = useRef<NodeJS.Timeout>();
  const lastTapTimeRef = useRef<number>(0);
  const touchCountRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);
  
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [touchVisualState, setTouchVisualState] = useState<{
    show: boolean;
    x: number;
    y: number;
    scale: number;
  }>({ show: false, x: 0, y: 0, scale: 1 });

  // Haptic feedback helper
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    
    navigator.vibrate(patterns[type]);
  }, [enableHapticFeedback]);

  // Calculate distance between two touches
  const getDistance = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    
    const touch1 = touches[0];
    const touch2 = touches[1];
    
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !isTouchDevice) return;

    touchCountRef.current = e.touches.length;
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // Show touch visual feedback
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setTouchVisualState({
          show: true,
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
          scale: 1
        });
      }

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          setIsLongPressing(true);
          triggerHapticFeedback('medium');
          onLongPress();
        }, longPressDelay);
      }

      // Handle double tap
      if (onDoubleTap) {
        const now = Date.now();
        const timeDiff = now - lastTapTimeRef.current;
        
        if (timeDiff < doubleTapDelay) {
          // Double tap detected
          if (doubleTapTimerRef.current) {
            clearTimeout(doubleTapTimerRef.current);
          }
          triggerHapticFeedback('light');
          onDoubleTap();
          lastTapTimeRef.current = 0;
        } else {
          // First tap
          lastTapTimeRef.current = now;
          doubleTapTimerRef.current = setTimeout(() => {
            lastTapTimeRef.current = 0;
          }, doubleTapDelay);
        }
      }

      handleGestureStart(e);
    } else if (e.touches.length === 2 && onPinch) {
      // Two finger pinch
      initialDistanceRef.current = getDistance(e.touches);
    }
  }, [
    disabled, 
    isTouchDevice, 
    onLongPress, 
    onDoubleTap, 
    onPinch, 
    longPressDelay, 
    doubleTapDelay, 
    triggerHapticFeedback, 
    handleGestureStart, 
    getDistance
  ]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !isTouchDevice) return;

    if (e.touches.length === 1) {
      // Cancel long press if finger moves too much
      if (longPressTimerRef.current) {
        const { distance } = getGestureDelta();
        if (distance > 10) {
          clearTimeout(longPressTimerRef.current);
          setIsLongPressing(false);
        }
      }

      // Update touch visual feedback
      if (containerRef.current && touchVisualState.show) {
        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        setTouchVisualState(prev => ({
          ...prev,
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
          scale: 1.2 // Slightly larger during drag
        }));
      }

      handleGestureMove(e);
    } else if (e.touches.length === 2 && onPinch) {
      // Handle pinch gesture
      const currentDistance = getDistance(e.touches);
      if (initialDistanceRef.current > 0) {
        const scale = currentDistance / initialDistanceRef.current;
        onPinch(scale);
        
        // Update visual feedback for pinch
        setTouchVisualState(prev => ({
          ...prev,
          scale: Math.max(0.5, Math.min(2, scale))
        }));
      }
    }
  }, [
    disabled, 
    isTouchDevice, 
    onPinch, 
    touchVisualState.show, 
    getGestureDelta, 
    handleGestureMove, 
    getDistance
  ]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled || !isTouchDevice) return;

    // Clear timers
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // Hide touch visual feedback
    setTouchVisualState(prev => ({ ...prev, show: false, scale: 1 }));
    setIsLongPressing(false);

    // Handle swipe gestures
    if (touchCountRef.current === 1 && !isLongPressing) {
      const { deltaX, distance } = getGestureDelta();
      
      if (distance > swipeThreshold) {
        if (deltaX > swipeThreshold && onSwipeRight) {
          triggerHapticFeedback('light');
          onSwipeRight();
        } else if (deltaX < -swipeThreshold && onSwipeLeft) {
          triggerHapticFeedback('light');
          onSwipeLeft();
        }
      }
    }

    // Reset pinch state
    initialDistanceRef.current = 0;
    touchCountRef.current = 0;

    handleGestureEnd();
  }, [
    disabled, 
    isTouchDevice, 
    isLongPressing, 
    swipeThreshold, 
    onSwipeRight, 
    onSwipeLeft, 
    triggerHapticFeedback, 
    getGestureDelta, 
    handleGestureEnd
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (doubleTapTimerRef.current) {
        clearTimeout(doubleTapTimerRef.current);
      }
    };
  }, []);

  if (!isTouchDevice) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.touchContainer} ${className} ${isLongPressing ? styles.longPressing : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
      
      {/* Touch visual feedback */}
      {touchVisualState.show && (
        <div
          className={styles.touchFeedback}
          style={{
            left: touchVisualState.x,
            top: touchVisualState.y,
            transform: `translate(-50%, -50%) scale(${touchVisualState.scale})`
          }}
        />
      )}
      
      {/* Long press indicator */}
      {isLongPressing && (
        <div className={styles.longPressIndicator}>
          <div className={styles.longPressRipple} />
        </div>
      )}
    </div>
  );
};

// Hook for enhanced touch interactions on specific elements
export const useEnhancedTouch = (
  elementRef: React.RefObject<HTMLElement>,
  options: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onLongPress?: () => void;
    onDoubleTap?: () => void;
    onPinch?: (scale: number) => void;
    enableHapticFeedback?: boolean;
    swipeThreshold?: number;
    longPressDelay?: number;
  } = {}
) => {
  const { isTouchDevice } = useMobileOptimizations();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isTouchDevice || !elementRef.current) return;

    const element = elementRef.current;
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    let longPressTimer: NodeJS.Timeout;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      
      setIsActive(true);
      touchStartTime = Date.now();
      touchStartPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };

      // Long press detection
      if (options.onLongPress) {
        longPressTimer = setTimeout(() => {
          if (options.enableHapticFeedback && navigator.vibrate) {
            navigator.vibrate([20]);
          }
          options.onLongPress!();
        }, options.longPressDelay || 500);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      setIsActive(false);
      
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }

      if (e.changedTouches.length !== 1) return;

      const touchEndTime = Date.now();
      const touchEndPos = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      };

      const deltaX = touchEndPos.x - touchStartPos.x;
      const deltaY = touchEndPos.y - touchStartPos.y;
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
      const duration = touchEndTime - touchStartTime;

      // Swipe detection
      const threshold = options.swipeThreshold || 50;
      if (distance > threshold && duration < 300) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0 && options.onSwipeRight) {
            if (options.enableHapticFeedback && navigator.vibrate) {
              navigator.vibrate([10]);
            }
            options.onSwipeRight();
          } else if (deltaX < 0 && options.onSwipeLeft) {
            if (options.enableHapticFeedback && navigator.vibrate) {
              navigator.vibrate([10]);
            }
            options.onSwipeLeft();
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (longPressTimer) {
        const currentPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
        const moveDistance = Math.sqrt(
          (currentPos.x - touchStartPos.x) ** 2 + 
          (currentPos.y - touchStartPos.y) ** 2
        );
        
        if (moveDistance > 10) {
          clearTimeout(longPressTimer);
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [isTouchDevice, elementRef, options]);

  return { isActive };
};
