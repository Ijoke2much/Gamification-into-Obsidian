import React, { useState } from "react";
import { CinematicQuestCard } from "./CinematicQuestCard";
import { EnhancedTouchInteractions } from "../../mobile/components/EnhancedTouchInteractions";
import type { Quest } from "../utils/taskParser";

interface MobileCinematicQuestCardProps {
    quest: Quest;
    plugin?: any; // Add plugin prop
    onEdit: (quest: Quest) => void;
    onToggleSubtask: (questTitle: string, subtaskIndex: number) => void;
    onCompleteQuest: (questTitle: string) => void;
    onUncompleteQuest?: (questTitle: string) => void;
    onDeleteQuest?: (questTitle: string) => void;
    onFailQuest?: (questTitle: string) => void;
    onToggleFavorite?: (questTitle: string) => void;
    collapsed?: boolean;
    bulkMode?: boolean;
    isSelected?: boolean;
    onSelect?: (questTitle: string) => void;
}

export const MobileCinematicQuestCard: React.FC<MobileCinematicQuestCardProps> = (props) => {
    const { quest, onCompleteQuest, onEdit, onToggleFavorite } = props;
    const [isExpanded, setIsExpanded] = useState(false);

    // Debug: Log that MobileCinematicQuestCard is rendering
    console.log('=== MOBILE CINEMATIC QUEST CARD RENDER ===');
    console.log('Quest title:', quest.title);
    console.log('Quest banner:', quest.banner);
    console.log('Plugin exists:', !!props.plugin);
    console.log('==========================================');

    // Mobile gesture handlers
    const handleSwipeRight = () => {
        if (!quest.completed) {
            onCompleteQuest(quest.title);
        }
    };

    const handleSwipeLeft = () => {
        onEdit(quest);
    };

    const handleLongPress = () => {
        if (onToggleFavorite) {
            onToggleFavorite(quest.title);
        }
    };

    const handleDoubleTap = () => {
        setIsExpanded(!isExpanded);
    };

    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;
    
    // Desktop drag and drop handlers (only enable on desktop)
    const [isDragging, setIsDragging] = useState(false);
    
    const handleDragStart = (e: React.DragEvent) => {
        if (isMobile) return; // Disable drag on mobile to avoid conflicts with touch gestures
        
        // Set the quest ID for drag operations
        const questId = quest.id || quest.title;
        e.dataTransfer.setData("application/x-quest-drag", questId);
        e.dataTransfer.setData("text/plain", questId);
        e.dataTransfer.effectAllowed = "move";
        
        // Create a custom drag image (optional)
        const target = e.currentTarget as HTMLElement;
        const dragImage = target.cloneNode(true) as HTMLElement;
        dragImage.style.transform = 'rotate(5deg)';
        dragImage.style.opacity = '0.8';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, target.offsetWidth / 2, target.offsetHeight / 2);
        
        // Clean up drag image after a short delay
        setTimeout(() => {
            if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 0);
        
        setIsDragging(true);
    };
    
    const handleDragEnd = (e: React.DragEvent) => {
        if (isMobile) return;
        setIsDragging(false);
    };

    if (isMobile) {
        return (
            <EnhancedTouchInteractions
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onLongPress={handleLongPress}
                onDoubleTap={handleDoubleTap}
                enableHapticFeedback={true}
                swipeThreshold={60}
                longPressDelay={500}
                doubleTapDelay={300}
            >
                <CinematicQuestCard {...props} />
                
                {/* Mobile Swipe Indicators */}
                <div className="mobile-swipe-indicators">
                    <div className="swipe-left-indicator">
                        <span className="swipe-icon">✏️</span>
                        <span className="swipe-text">Edit</span>
                    </div>
                    <div className="swipe-right-indicator">
                        <span className="swipe-icon">✅</span>
                        <span className="swipe-text">Complete</span>
                    </div>
                </div>

                {/* Mobile-specific styles */}
                <style>{`
                    .mobile-swipe-indicators {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        pointer-events: none;
                        z-index: 1;
                    }

                    .swipe-left-indicator,
                    .swipe-right-indicator {
                        position: absolute;
                        top: 0;
                        bottom: 0;
                        width: 100px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 0.8rem;
                        font-weight: 600;
                        opacity: 0;
                        transition: opacity 0.2s ease;
                        backdrop-filter: blur(10px);
                    }

                    .swipe-left-indicator {
                        left: 0;
                        background: linear-gradient(90deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.8));
                        border-radius: 16px 0 0 16px;
                    }

                    .swipe-right-indicator {
                        right: 0;
                        background: linear-gradient(90deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.8));
                        border-radius: 0 16px 16px 0;
                    }

                    .swipe-icon {
                        font-size: 1.5rem;
                        margin-bottom: 4px;
                    }

                    .swipe-text {
                        font-size: 0.7rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    /* Show indicators during touch interactions */
                    :global(.touch-interacting) .swipe-left-indicator,
                    :global(.touch-interacting) .swipe-right-indicator {
                        opacity: 1;
                    }
                `}</style>
            </EnhancedTouchInteractions>
        );
    }

    // Desktop version - render with drag and drop functionality
    return (
        <div
            draggable={!isMobile} // Only draggable on desktop
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
                cursor: !isMobile ? (isDragging ? 'grabbing' : 'grab') : 'default',
                opacity: isDragging ? 0.5 : 1,
                transform: isDragging ? 'rotate(2deg) scale(0.95)' : 'none',
                transition: 'all 0.2s ease',
                position: 'relative',
                zIndex: isDragging ? 1000 : 'auto'
            }}
        >
            <CinematicQuestCard {...props} />
            
            {/* Desktop Drag Indicator */}
            {!isMobile && (
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    opacity: 0.3,
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s ease'
                }}>
                    ⋮⋮
                </div>
            )}
            
            {/* Drag Helper Text */}
            {isDragging && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    pointerEvents: 'none',
                    zIndex: 1001
                }}>
                    Drop on filter to move quest
                </div>
            )}
        </div>
    );
};
