import React, { useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import SkillTreeModal from '../modals/SkillTreeModal';
import styles from './SkillTreeButton.module.css';

interface SkillTreeButtonProps {
    plugin: GamifiedObsidianPlugin;
    variant?: 'primary' | 'secondary' | 'icon';
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

export const SkillTreeButton: React.FC<SkillTreeButtonProps> = ({
    plugin,
    variant = 'primary',
    size = 'medium',
    className = ''
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const getButtonClass = () => {
        const baseClass = styles.skillTreeButton;
        const variantClass = styles[variant];
        const sizeClass = styles[size];
        return `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();
    };

    const getButtonContent = () => {
        switch (variant) {
            case 'icon':
                return '🌳';
            case 'secondary':
                return '🌳 Skills';
            default:
                return '🌳 View Skill Tree';
        }
    };

    return (
        <>
            <button
                className={getButtonClass()}
                onClick={handleOpenModal}
                title="Open Skill Tree Manager"
            >
                {getButtonContent()}
            </button>

            <SkillTreeModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                plugin={plugin}
            />
        </>
    );
};

export default SkillTreeButton;
