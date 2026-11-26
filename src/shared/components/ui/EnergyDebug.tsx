import React, { useState, useEffect } from 'react';
import { playerStore } from '../../state/playerStore';
import { PlayerData } from '../../../data/models/PlayerData';
import { BatteryProgressBar } from './BatteryProgressBar';

export const EnergyDebug: React.FC = () => {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);

  useEffect(() => {
    const loadPlayerData = async () => {
      const data = await playerStore.get();
      setPlayerData(data);
    };

    loadPlayerData();

    const unsubscribe = playerStore.onChange((change) => {
      if (change.type === 'data-updated') {
        setPlayerData(change.payload);
      }
    });

    return unsubscribe;
  }, []);

  if (!playerData) {
    return <div>Loading...</div>;
  }

  const stats = playerData.stats || {};

  return (
    <div style={{ padding: '20px', background: '#2a2a2a', color: 'white', borderRadius: '8px' }}>
      <h3>Energy Debug Info</h3>
      <div style={{ marginBottom: '20px' }}>
        <p><strong>Raw Player Data Stats:</strong></p>
        <pre style={{ background: '#1a1a1a', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
          {JSON.stringify(stats, null, 2)}
        </pre>
      </div>
      
      <div>
        <h4>Battery Rendering Test:</h4>
        {Object.entries(stats).map(([statName, value]) => {
          const numValue = typeof value === 'number' ? value : 50;
          return (
            <div key={statName} style={{ marginBottom: '10px' }}>
              <p>{statName}: {value} (rendering at {numValue}%)</p>
              <BatteryProgressBar 
                percent={numValue} 
                segments={20} 
                width={400} 
                height={24} 
                statType={statName.toLowerCase() as 'energy' | 'focus' | 'motivation' | 'calm' | 'stress'} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
