import React, { useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import SkillTreeModal from '../modals/SkillTreeModal';
import styles from './SkillTreeButton.module.css';

const SkillTreeIcon: React.ReactNode = (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
    >
        {/* Canopy */}
        <circle cx="12" cy="7" r="4.5" fill="#16a34a" />
        <circle cx="9" cy="8" r="3.5" fill="#22c55e" />
        <circle cx="15" cy="8" r="3.5" fill="#22c55e" />
        {/* Trunk */}
        <path
            d="M12 11v6"
            stroke="#bbf7d0"
            strokeWidth="2"
            strokeLinecap="round"
        />
        {/* Branches */}
        <path
            d="M12 13l-3 2.5M12 14.5l3 2"
            stroke="#bbf7d0"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
        {/* Ground node */}
        <circle cx="12" cy="19" r="1.3" fill="#15803d" />
    </svg>
);

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
                return SkillTreeIcon;
            default:
                return (
                    <>
                        {SkillTreeIcon}
                        <span>Skill Tree</span>
                    </>
                );
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
