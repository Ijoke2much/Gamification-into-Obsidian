// Enhanced Achievement Notification Component
// Provides animated feedback when achievements are unlocked

import React, { useState, useEffect } from 'react';
import { Achievement } from '../../../data/models/AchievementSystem';

interface AchievementNotificationProps {
  achievement: Achievement;
  isVisible: boolean;
  onClose: () => void;
  onViewGallery?: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  isVisible,
  onClose,
  onViewGallery,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      setShowConfetti(true);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <>
      {/* Main Notification */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          border: `2px solid ${getTierColor(achievement.tier)}`,
          borderRadius: '20px',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '400px',
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${getTierColor(achievement.tier)}40`,
          zIndex: 10000,
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          borderLeft: `6px solid ${getTierColor(achievement.tier)}`,
        }}
      >
        {/* Header with Achievement Icon and Tier */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '48px',
              marginRight: '16px',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              animation: 'bounce 0.6s ease-in-out',
            }}
          >
            {achievement.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: '0 0 4px 0',
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              🎉 Achievement Unlocked!
            </h3>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '16px',
                background: getTierColor(achievement.tier),
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {achievement.tier}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>
        </div>

        {/* Achievement Details */}
        <div style={{ marginBottom: '20px' }}>
          <h4
            style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {achievement.title}
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#ccc',
              lineHeight: '1.4',
            }}
          >
            {achievement.description}
          </p>
        </div>

        {/* Rewards Preview */}
        {achievement.rewards && (
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div
              style={{
                color: '#fff',
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              🎁 Rewards Earned
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {achievement.rewards.xp && (
                <span
                  style={{
                    color: '#66BB6A',
                    background: 'rgba(102, 187, 106, 0.2)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '1px solid rgba(102, 187, 106, 0.3)',
                  }}
                >
                  ⚡ +{achievement.rewards.xp} XP
                </span>
              )}
              {achievement.rewards.coins && (
                <span
                  style={{
                    color: '#FFD54F',
                    background: 'rgba(255, 213, 79, 0.2)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '1px solid rgba(255, 213, 79, 0.3)',
                  }}
                >
                  🪙 +{achievement.rewards.coins} Coins
                </span>
              )}
              {achievement.rewards.title && (
                <span
                  style={{
                    color: '#BA68C8',
                    background: 'rgba(186, 104, 200, 0.2)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '1px solid rgba(186, 104, 200, 0.3)',
                  }}
                >
                  👑 "{achievement.rewards.title}"
                </span>
              )}
              {achievement.rewards.items && achievement.rewards.items.length > 0 && (
                <span
                  style={{
                    color: '#81C784',
                    background: 'rgba(129, 199, 132, 0.2)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '1px solid rgba(129, 199, 132, 0.3)',
                  }}
                >
                  📦 {achievement.rewards.items.join(', ')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            height: '6px',
            marginTop: '16px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: `linear-gradient(90deg, ${getTierColor(achievement.tier)}, ${getTierColor(achievement.tier)}80)`,
              height: '100%',
              width: '100%',
              borderRadius: '8px',
              animation: 'progressFill 1s ease-out',
            }}
          />
        </div>

        {onViewGallery && (
          <button
            type="button"
            onClick={onViewGallery}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1px solid ${getTierColor(achievement.tier)}`,
              background: `${getTierColor(achievement.tier)}22`,
              color: '#fff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              letterSpacing: '0.4px',
            }}
          >
            View in trophy gallery →
          </button>
        )}
      </div>

      {/* Confetti Animation */}
      {showConfetti && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '-10px',
                left: `${Math.random() * 100}%`,
                width: '8px',
                height: '8px',
                background: getConfettiColor(i),
                borderRadius: '50%',
                animation: `confetti ${2 + Math.random() * 3}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          
          @keyframes progressFill {
            from { width: 0%; }
            to { width: 100%; }
          }
          
          @keyframes confetti {
            0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}
      </style>
    </>
  );
};

// Helper function to get tier colors
const getTierColor = (tier: string): string => {
  const colors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    legendary: '#9F7AEA',
  };
  return colors[tier as keyof typeof colors] || '#4CAF50';
};

// Helper function to get confetti colors
const getConfettiColor = (index: number): string => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  return colors[index % colors.length];
};

export default AchievementNotification;
