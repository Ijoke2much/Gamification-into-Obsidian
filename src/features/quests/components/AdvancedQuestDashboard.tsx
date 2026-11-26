// Advanced Quest Dashboard
// Integrates performance optimization, templates, sharing, and analytics

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AdvancedQuestDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  quests: any[];
}

export const AdvancedQuestDashboard: React.FC<AdvancedQuestDashboardProps> = ({
  isOpen,
  onClose,
  quests
}) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const totalQuests = quests.length;
  const completedQuests = quests.filter(q => q.completed).length;
  const activeQuests = totalQuests - completedQuests;

  const features = [
    {
      id: 'performance',
      icon: '🚀',
      title: 'Performance Optimization',
      description: 'Incremental parsing and caching for large quest files.',
      color: '#ff6b6b'
    },
    {
      id: 'templates',
      icon: '📋',
      title: 'Smart Templates',
      description: 'Context-aware quest templates and wizards.',
      color: '#51cf66'
    },
    {
      id: 'sharing',
      icon: '🔄',
      title: 'Cross-Vault Sharing',
      description: 'Share quests between different Obsidian vaults.',
      color: '#ffd43b'
    },
    {
      id: 'analytics',
      icon: '🧠',
      title: 'Advanced Analytics',
      description: 'Deep insights and optimization recommendations.',
      color: '#ff6b9d'
    }
  ];

  const quickActions = [
    { label: 'Create Template', color: '#8ecae6' },
    { label: 'Export Data', color: '#51cf66' },
    { label: 'Sync Settings', color: '#ffd43b' }
  ];

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}
    onClick={(e) => {
      // Close modal when clicking the backdrop
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}
    >
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '2px solid #333'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #8ecae6',
          paddingBottom: '12px'
        }}>
          <h2 style={{ margin: 0, color: '#8ecae6', display: 'flex', alignItems: 'center' }}>
            🎯 Advanced Quest Dashboard
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* System Status */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>System Status</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                {totalQuests}
              </div>
              <div style={{ color: '#fff', fontSize: '14px' }}>Total Quests</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                {completedQuests}
              </div>
              <div style={{ color: '#fff', fontSize: '14px' }}>Completed</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                {activeQuests}
              </div>
              <div style={{ color: '#fff', fontSize: '14px' }}>Active</div>
            </div>
          </div>
        </div>

        {/* Advanced Features */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#ccc' }}>Advanced Features</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {features.map(feature => (
              <div
                key={feature.id}
                onClick={() => setActiveFeature(feature.id)}
                style={{
                  backgroundColor: '#2a2a2a',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '2px solid #333',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = feature.color;
                  e.currentTarget.style.backgroundColor = '#3a3a3a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.backgroundColor = '#2a2a2a';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '24px', marginRight: '8px' }}>
                    {feature.icon}
                  </span>
                  <h4 style={{ 
                    margin: 0, 
                    color: feature.color,
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>
                    {feature.title}
                  </h4>
                </div>
                <p style={{ 
                  color: '#ccc', 
                  margin: 0, 
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', color: '#ccc' }}>Quick Actions</h3>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {quickActions.map((action, index) => (
              <button
                key={index}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: action.color,
                  color: '#000',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
