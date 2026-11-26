import React, { useEffect, useState, useCallback } from 'react';
import { isLikelyMobileDevice } from '../utils/deviceDetect';

/**
 * Hook for mobile-specific optimizations and touch interactions.
 *
 * Important: `isMobile` means a real mobile/Obsidian-mobile client.
 * Narrow desktop windows use `isCompactLayout` / `isSmallScreen` only —
 * never force pixel theme or mobile-only chrome from width alone.
 */
export const useMobileOptimizations = () => {
    const detectMobileDevice = () => isLikelyMobileDevice();

    const detectCompactLayout = () =>
        typeof window !== 'undefined' && window.innerWidth <= 768;

    const [isMobile, setIsMobile] = useState(detectMobileDevice);
    const [isCompactLayout, setIsCompactLayout] = useState(detectCompactLayout);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);
    const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

    // Detect real mobile device (UA / Obsidian body classes / iPad) — not viewport width
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(detectMobileDevice());
            setIsCompactLayout(detectCompactLayout());
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Detect touch device
    useEffect(() => {
        const checkTouchDevice = () => {
            const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

            setIsTouchDevice(hasTouchScreen || hasCoarsePointer);
        };

        checkTouchDevice();
        window.addEventListener('resize', checkTouchDevice);
        return () => window.removeEventListener('resize', checkTouchDevice);
    }, []);

    // Detect orientation and screen size
    useEffect(() => {
        const updateScreenInfo = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            setScreenSize({ width, height });
            setIsLandscape(width > height);
            setIsCompactLayout(width <= 768);
        };

        updateScreenInfo();
        window.addEventListener('resize', updateScreenInfo);
        window.addEventListener('orientationchange', updateScreenInfo);

        return () => {
            window.removeEventListener('resize', updateScreenInfo);
            window.removeEventListener('orientationchange', updateScreenInfo);
        };
    }, []);

    // Optimize performance for mobile devices only (not narrow desktop).
    // Inject once globally — many callers of this hook used to append duplicate <style> tags.
    useEffect(() => {
        if (!isMobile) return;
        const ATTR = 'data-gamify-mobile-anim-nuke';
        if (document.head.querySelector(`style[${ATTR}]`)) return;
        const style = document.createElement('style');
        style.setAttribute(ATTR, 'true');
        // Ceremony / achievement hosts mount outside this subtree so light
        // level-up + unlock toasts can still animate on mobile.
        style.textContent = `
            [data-gamification-mobile='true'] *:not([data-gamify-allow-motion]),
            [data-gamification-mobile='true'] *:not([data-gamify-allow-motion])::before,
            [data-gamification-mobile='true'] *:not([data-gamify-allow-motion])::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }, [isMobile]);

    // Touch-friendly click handler
    const handleTouchClick = useCallback((callback: () => void, delay: number = 300) => {
        let timeoutId: NodeJS.Timeout;
        let hasMoved = false;
        let startX = 0;
        let startY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            hasMoved = false;
        };

        const handleTouchMove = (e: TouchEvent) => {
            const moveX = Math.abs(e.touches[0].clientX - startX);
            const moveY = Math.abs(e.touches[0].clientY - startY);

            if (moveX > 10 || moveY > 10) {
                hasMoved = true;
            }
        };

        const handleTouchEnd = () => {
            if (!hasMoved) {
                timeoutId = setTimeout(callback, delay);
            }
        };

        return {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            cleanup: () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            }
        };
    }, []);

    // Prevent zoom on double tap
    const preventZoom = useCallback(() => {
        let lastTouchEnd = 0;

        const handleTouchEnd = (event: TouchEvent) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        };

        document.addEventListener('touchend', handleTouchEnd, false);

        return () => {
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    // Swipe detection
    const useSwipe = useCallback((onSwipeLeft?: () => void, onSwipeRight?: () => void) => {
        const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
        const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

        const minSwipeDistance = 50;

        const onTouchStart = (e: React.TouchEvent) => {
            setTouchEnd(null);
            setTouchStart({
                x: e.targetTouches[0].clientX,
                y: e.targetTouches[0].clientY,
            });
        };

        const onTouchMove = (e: React.TouchEvent) => {
            setTouchEnd({
                x: e.targetTouches[0].clientX,
                y: e.targetTouches[0].clientY,
            });
        };

        const onTouchEnd = () => {
            if (!touchStart || !touchEnd) return;

            const distanceX = touchStart.x - touchEnd.x;
            const distanceY = touchStart.y - touchEnd.y;
            const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

            if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
                if (distanceX > 0 && onSwipeLeft) {
                    onSwipeLeft();
                } else if (distanceX < 0 && onSwipeRight) {
                    onSwipeRight();
                }
            }
        };

        return {
            onTouchStart,
            onTouchMove,
            onTouchEnd,
        };
    }, []);

    // Mobile-specific utility functions
    const mobileUtils = {
        // Check if element is in viewport
        isInViewport: (element: HTMLElement) => {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        },

        // Smooth scroll to element
        scrollToElement: (element: HTMLElement, offset: number = 0) => {
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        },

        // Get safe area insets (for devices with notches)
        getSafeAreaInsets: () => {
            const style = getComputedStyle(document.documentElement);
            return {
                top: parseInt(style.getPropertyValue('--sat') || '0'),
                right: parseInt(style.getPropertyValue('--sar') || '0'),
                bottom: parseInt(style.getPropertyValue('--sab') || '0'),
                left: parseInt(style.getPropertyValue('--sal') || '0'),
            };
        },

        // Check if device supports hover
        supportsHover: () => {
            return window.matchMedia('(hover: hover)').matches;
        },

        // Check if device prefers reduced motion
        prefersReducedMotion: () => {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },

        // Check if device is in dark mode
        prefersDarkMode: () => {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        },

        // Get device pixel ratio
        getPixelRatio: () => {
            return window.devicePixelRatio || 1;
        },

        // Check if device is low-end
        isLowEndDevice: () => {
            const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
            const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency || 4;
            return memory < 4 || cores < 4;
        }
    };

    return {
        isMobile,
        isCompactLayout,
        isTouchDevice,
        isLandscape,
        screenSize,
        handleTouchClick,
        preventZoom,
        useSwipe,
        mobileUtils,

        // Convenience getters
        isSmallScreen: screenSize.width <= 768,
        isMediumScreen: screenSize.width > 768 && screenSize.width <= 1024,
        isLargeScreen: screenSize.width > 1024,

        // Mobile-specific classes (apply only when isMobile is true)
        mobileClasses: {
            container: 'mobile-optimized mobile-container',
            card: 'mobile-card',
            button: 'mobile-optimized',
            touchTarget: 'touch-spacing',
            scrollable: 'touch-scroll',
            noZoom: 'no-zoom',
            swipeable: 'swipeable'
        }
    };
};

/**
 * Hook for optimizing component performance on mobile
 */
export const useMobilePerformance = () => {
    const [shouldOptimize, setShouldOptimize] = useState(false);

    useEffect(() => {
        const checkPerformance = () => {
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
            const isSmallScreen = window.innerWidth <= 768;
            const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
            const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency || 4;
            const isLowEnd = memory < 4 || cores < 4;

            setShouldOptimize(isMobile || isSmallScreen || isLowEnd);
        };

        checkPerformance();
        window.addEventListener('resize', checkPerformance);
        return () => window.removeEventListener('resize', checkPerformance);
    }, []);

    // Lazy load components on mobile
    const lazyLoad = useCallback((importFn: () => Promise<{ default: React.ComponentType }>, fallback?: React.ComponentType) => {
        if (shouldOptimize) {
            return React.lazy(importFn);
        }
        return importFn;
    }, [shouldOptimize]);

    // Debounce expensive operations on mobile
    const debounce = useCallback((func: (...args: unknown[]) => void, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: unknown[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), shouldOptimize ? delay * 2 : delay);
        };
    }, [shouldOptimize]);

    return {
        shouldOptimize,
        lazyLoad,
        debounce
    };
};

/**
 * Hook for mobile gesture handling
 */
export const useMobileGestures = () => {
    const [gestureState, setGestureState] = useState({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    });

    const handleGestureStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setGestureState({
            isDragging: true,
            startX: clientX,
            startY: clientY,
            currentX: clientX,
            currentY: clientY
        });
    }, []);

    const handleGestureMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (!gestureState.isDragging) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setGestureState(prev => ({
            ...prev,
            currentX: clientX,
            currentY: clientY
        }));
    }, [gestureState.isDragging]);

    const handleGestureEnd = useCallback(() => {
        setGestureState(prev => ({
            ...prev,
            isDragging: false
        }));
    }, []);

    const getGestureDelta = useCallback(() => {
        return {
            deltaX: gestureState.currentX - gestureState.startX,
            deltaY: gestureState.currentY - gestureState.startY,
            distance: Math.sqrt(
                Math.pow(gestureState.currentX - gestureState.startX, 2) +
                Math.pow(gestureState.currentY - gestureState.startY, 2)
            )
        };
    }, [gestureState]);

    return {
        gestureState,
        handleGestureStart,
        handleGestureMove,
        handleGestureEnd,
        getGestureDelta
    };
};
