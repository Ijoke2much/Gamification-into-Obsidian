import React from 'react';
import { BatteryProgressBar } from './BatteryProgressBar';

export const BatteryTest: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: '#1a1a1a', color: 'white' }}>
      <h3>Battery Test</h3>
      <div style={{ marginBottom: '15px' }}>
        <p>Energy 10%:</p>
        <BatteryProgressBar percent={10} segments={20} width={400} height={24} statType="energy" />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <p>Focus 30%:</p>
        <BatteryProgressBar percent={30} segments={20} width={400} height={24} statType="focus" />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <p>Motivation 50%:</p>
        <BatteryProgressBar percent={50} segments={20} width={400} height={24} statType="motivation" />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <p>Calm 80%:</p>
        <BatteryProgressBar percent={80} segments={20} width={400} height={24} statType="calm" />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <p>Stress 100%:</p>
        <BatteryProgressBar percent={100} segments={20} width={400} height={24} statType="stress" />
      </div>
    </div>
  );
};
