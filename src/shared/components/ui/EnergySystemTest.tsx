import React, { useState } from 'react';
import { rewardService } from '../../services/rewardService';
import { buffService } from '../../services/buffService';
import { playerStore } from '../../state/playerStore';
import styles from './EnergySystemTest.module.css';

export const EnergySystemTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);


const runTest = async () => {
  setLoading(true);
  setTestResult('Running test...');
  
  try {
    // Test 1: Get player data
    await playerStore.get();
    setTestResult(prev => prev + '\n✅ Player data loaded');
    
    // Test 2: Add a buff
    await buffService.addBuff('coffee');
    setTestResult(prev => prev + '\n✅ Coffee buff added');
    
    // Test 3: Complete a quest
    const reward = await rewardService.completeQuest('Test Quest', 'medium');
    setTestResult(prev => prev + `\n✅ Quest completed: +${reward.final.xp} XP, +${reward.final.coins} coins`);
    
    // Test 4: Take a break
    const breakReward = await rewardService.takeBreak('meditation');
    setTestResult(prev => prev + `\n✅ Break taken: +${breakReward.final.xp} XP, +${breakReward.final.coins} coins`);
    
    // Test 5: Get updated player data
    const updatedPlayer = await playerStore.get();
    setTestResult(prev => prev + `\n✅ Player updated: Energy ${updatedPlayer?.stats?.energy}, Focus ${updatedPlayer?.stats?.focus}`);
    
    setTestResult(prev => prev + '\n\n🎉 All tests passed! Energy system is working.');
    
  } catch (error) {
    setTestResult(prev => prev + `\n❌ Test failed: ${error}`);
  } finally {
    setLoading(false);
  }
};

  const resetStats = async () => {
    setLoading(true);
    try {
      await playerStore.updateStats({
        energy: 80,
        focus: 75,
        motivation: 85,
        calm: 70,
        stress: 20
      });
      setTestResult('Stats reset to default values');
    } catch (error) {
      setTestResult(`Failed to reset stats: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.testContainer}>
      <h3>Energy System Test</h3>
      <div className={styles.buttonRow}>
        <button 
          onClick={runTest} 
          disabled={loading}
          className={styles.testButton}
        >
          {loading ? 'Running...' : 'Run Test'}
        </button>
        <button 
          onClick={resetStats} 
          disabled={loading}
          className={styles.resetButton}
        >
          Reset Stats
        </button>
      </div>
      
      <div className={styles.resultArea}>
        <pre>{testResult || 'Click "Run Test" to test the energy system...'}</pre>
      </div>
    </div>
  );
};
