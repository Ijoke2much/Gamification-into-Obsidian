import React from 'react';
import { Quest } from '../utils/taskParser';
import { previewQuestRewards, getRarityColor, getRarityDisplayName } from '../utils/questRewardsSystem';

interface QuestRewardPreviewProps {
  quest: Quest;
  showPreview?: boolean;
}

export const QuestRewardPreview: React.FC<QuestRewardPreviewProps> = ({ quest, showPreview = true }) => {
  if (!showPreview) return null;

  const rewards = previewQuestRewards(quest);
  
  if (rewards.length === 0) return null;

  return (
    <div className="quest-reward-preview" style={{
      marginTop: '8px',
      padding: '8px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      border: '1px solid #ddd'
    }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#666' }}>
        🎁 Potential Rewards:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {rewards.map((reward, index) => (
          <div
            key={index}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 6px',
              borderRadius: '12px',
              fontSize: '11px',
              backgroundColor: getRarityColor(reward.rarity) + '20',
              border: `1px solid ${getRarityColor(reward.rarity)}`,
              color: getRarityColor(reward.rarity),
              fontWeight: 'bold'
            }}
            title={`${reward.name} - ${reward.description}`}
          >
            <span style={{ marginRight: '4px' }}>{reward.icon}</span>
            <span>{reward.name}</span>
            {reward.quantity && reward.quantity > 1 && (
              <span style={{ marginLeft: '4px', opacity: 0.8 }}>x{reward.quantity}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 