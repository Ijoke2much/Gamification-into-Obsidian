// Seasonal Shop Header Component
// Displays current season, rotation info, and special events

import React, { useState, useEffect } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { getShopIntegration } from '../utils/shopIntegration';

interface SeasonalShopHeaderProps {
  plugin: GamifiedObsidianPlugin;
  onRefreshShop?: () => void;
}

interface SeasonalInfo {
  season: string;
  daysUntilRotation: number;
  specialItems: number;
}

const SEASON_EMOJIS: Record<string, string> = {
  'Spring Awakening': '🌸',
  'Summer Heat': '☀️',
  'Harvest Season': '🍂',
  'Winter Frost': '❄️',
  'Dragon Festival': '🐉',
  'Mystical Market': '🔮',
  'spring': '🌱',
  'summer': '☀️',
  'autumn': '🍂',
  'winter': '❄️'
};

const SEASON_COLORS: Record<string, string> = {
  'Spring Awakening': '#90EE90',
  'Summer Heat': '#FFD700',
  'Harvest Season': '#FF8C00',
  'Winter Frost': '#87CEEB',
  'Dragon Festival': '#FF6B6B',
  'Mystical Market': '#9370DB',
  'spring': '#90EE90',
  'summer': '#FFD700',
  'autumn': '#FF8C00',
  'winter': '#87CEEB'
};

export const SeasonalShopHeader: React.FC<SeasonalShopHeaderProps> = ({ 
  plugin, 
  onRefreshShop 
}) => {
  const [seasonalInfo, setSeasonalInfo] = useState<SeasonalInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSeasonalInfo();
    
    // Refresh info every minute
    const interval = setInterval(loadSeasonalInfo, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadSeasonalInfo = () => {
    const shopIntegration = getShopIntegration();
    if (shopIntegration) {
      const info = shopIntegration.getSeasonalInfo();
      setSeasonalInfo(info);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const shopIntegration = getShopIntegration();
      if (shopIntegration) {
        await shopIntegration.refreshInventory();
        loadSeasonalInfo();
        onRefreshShop?.();
      }
    } catch (error) {
      console.error('Failed to refresh shop:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!seasonalInfo) {
    return (
      <div style={{
        padding: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '8px',
        margin: '8px 0',
        color: 'white',
        textAlign: 'center'
      }}>
        🛒 <strong>Welcome to the Shop!</strong>
      </div>
    );
  }

  const seasonEmoji = SEASON_EMOJIS[seasonalInfo.season] || '🛒';
  const seasonColor = SEASON_COLORS[seasonalInfo.season] || '#667eea';

  return (
    <div style={{
      padding: '16px',
      background: `linear-gradient(135deg, ${seasonColor} 0%, ${seasonColor}dd 100%)`,
      borderRadius: '12px',
      margin: '8px 0',
      color: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '24px' }}>{seasonEmoji}</span>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: 'bold',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              {seasonalInfo.season}
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '12px', 
              opacity: 0.9 
            }}>
              {seasonalInfo.specialItems} special items available
            </p>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            color: 'white',
            padding: '6px 12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }
          }}
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        opacity: 0.9
      }}>
        <span>
          📅 Next rotation: {seasonalInfo.daysUntilRotation} days
        </span>
        <span>
          ⭐ Season bonuses active
        </span>
      </div>

      {seasonalInfo.daysUntilRotation <= 1 && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '6px',
          fontSize: '11px',
          textAlign: 'center',
          animation: 'pulse 2s infinite'
        }}>
          🚨 <strong>Inventory rotating soon!</strong> Get special items before they disappear!
        </div>
      )}
    </div>
  );
};