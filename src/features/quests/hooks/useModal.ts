import { useEffect } from 'react';

interface UseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const useModal = ({ isOpen, onClose }: UseModalProps) => {
    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';

            return () => {
                document.removeEventListener('keydown', handleEscape);
                document.body.style.overflow = '';
            };
        }
    }, [isOpen, onClose]);

    return {
        // Modal utilities can be added here
    };
};
