import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

interface MaterialReward {
    name: string;
    icon: string;
    quality: string;
    rarity: string;
    category: string;
    baseValue: number;
    description?: string;
}

interface MaterialRewardNotificationProps {
    materials: MaterialReward[];
    quality: string;
    source: string;
    onClose: () => void;
}

export const MaterialRewardNotification: React.FC<MaterialRewardNotificationProps> = ({
    materials,
    quality,
    source,
    onClose
}) => {
    const [isVisible, setIsVisible] = useState(true);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Allow animation to complete
    };

    const getQualityColor = (quality: string) => {
        switch (quality.toLowerCase()) {
            case 'fresh': return '#8BC34A';
            case 'normal': return '#2196F3';
            case 'dried': return '#FF9800';
            case 'refined': return '#9C27B0';
            case 'masterwork': return '#FFD700';
            case 'legendary': return '#FF5722';
            default: return '#757575';
        }
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity.toLowerCase()) {
            case 'common': return '#757575';
            case 'uncommon': return '#4CAF50';
            case 'rare': return '#2196F3';
            case 'epic': return '#9C27B0';
            case 'legendary': return '#FFD700';
            default: return '#757575';
        }
    };

    const getSourceIcon = (source: string) => {
        switch (source.toLowerCase()) {
            case 'quest completion': return '🎯';
            case 'habit tree milestone': return '🌳';
            case 'pomodoro session': return '⏰';
            default: return '🎁';
        }
    };

    if (!isVisible) return null;

    return (
        <div className="material-reward-notification-overlay">
            <div className="material-reward-notification">
                {/* Header */}
                <div className="notification-header">
                    <div className="header-content">
                        <span className="source-icon">{getSourceIcon(source)}</span>
                        <h3 className="notification-title">Materials Earned!</h3>
                        <span className="source-text">{source}</span>
                    </div>
                    <button className="close-button" onClick={handleClose}>
                        ✕
                    </button>
                </div>

                {/* Materials List */}
                <div className="materials-container">
                    {materials.map((material, index) => (
                        <div key={index} className="material-item">
                            <div className="material-icon">{material.icon}</div>
                            <div className="material-info">
                                <div className="material-name">{material.name}</div>
                                <div className="material-details">
                                    <span 
                                        className="material-quality" 
                                        style={{ color: getQualityColor(material.quality) }}
                                    >
                                        {material.quality} Quality
                                    </span>
                                    <span 
                                        className="material-rarity" 
                                        style={{ color: getRarityColor(material.rarity) }}
                                    >
                                        {material.rarity} Rarity
                                    </span>
                                    <span className="material-value">
                                        {material.baseValue} boogers
                                    </span>
                                </div>
                                <div className="material-category">{material.category}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="notification-footer">
                    <div className="total-materials">
                        Total: {materials.length} material{materials.length !== 1 ? 's' : ''}
                    </div>
                    <button className="claim-button" onClick={handleClose}>
                        Claim & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Export for use in other components
export { createRoot };

// CSS styles for the notification
const styles = `
.material-reward-notification-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-in-out;
}

.material-reward-notification {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    border-radius: 16px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: 2px solid #3498db;
    animation: slideIn 0.3s ease-out;
}

.notification-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #34495e;
}

.header-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.source-icon {
    font-size: 24px;
    margin-bottom: 8px;
}

.notification-title {
    color: #ecf0f1;
    margin: 0;
    font-size: 20px;
    font-weight: bold;
}

.source-text {
    color: #bdc3c7;
    font-size: 14px;
    text-transform: capitalize;
}

.close-button {
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.close-button:hover {
    background: #c0392b;
    transform: scale(1.1);
}

.materials-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
}

.material-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: rgba(52, 73, 94, 0.5);
    border-radius: 12px;
    border: 1px solid #34495e;
    transition: all 0.2s ease;
}

.material-item:hover {
    background: rgba(52, 73, 94, 0.8);
    border-color: #3498db;
    transform: translateY(-2px);
}

.material-icon {
    font-size: 32px;
    min-width: 40px;
    text-align: center;
}

.material-info {
    flex: 1;
}

.material-name {
    color: #ecf0f1;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 8px;
}

.material-details {
    display: flex;
    gap: 12px;
    margin-bottom: 6px;
    flex-wrap: wrap;
}

.material-quality,
.material-rarity,
.material-value {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.3);
    font-weight: 500;
}

.material-category {
    color: #95a5a6;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.notification-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 2px solid #34495e;
}

.total-materials {
    color: #bdc3c7;
    font-size: 14px;
    font-weight: 500;
}

.claim-button {
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
}

.claim-button:hover {
    background: linear-gradient(135deg, #229954 0%, #27ae60 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(39, 174, 96, 0.3);
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {
    from { 
        opacity: 0;
        transform: translateY(30px) scale(0.9);
    }
    to { 
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@media (max-width: 600px) {
    .material-reward-notification {
        padding: 16px;
        margin: 16px;
    }
    
    .material-details {
        flex-direction: column;
        gap: 6px;
    }
    
    .notification-footer {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
    }
}
`;

// Inject styles into the document
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
}
