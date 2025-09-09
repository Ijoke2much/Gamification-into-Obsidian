import React from 'react';
import { notify } from '../../services/notificationService';

export const NotificationDemo: React.FC = () => {
  const showAllNotificationTypes = () => {
    // Success
    notify.success("Success!", "Operation completed successfully", 4000);
    
    // Info
    setTimeout(() => {
      notify.info("Information", "Here's some useful information", 4000);
    }, 500);
    
    // Warning
    setTimeout(() => {
      notify.warning("Warning", "Please be careful with this action", 4000);
    }, 1000);
    
    // Error
    setTimeout(() => {
      notify.error("Error", "Something went wrong", 4000);
    }, 1500);
    
    // Achievement
    setTimeout(() => {
      notify.achievement("Achievement Unlocked!", "First Steps - Complete your first quest", 5000);
    }, 2000);
    
    // Quest
    setTimeout(() => {
      notify.quest("New Quest Available", "Daily Challenge: Complete 5 tasks", 4000);
    }, 2500);
    
    // Boss
    setTimeout(() => {
      notify.boss("Boss Defeated!", "You've defeated the Dragon Boss!", 6000);
    }, 3000);
    
    // Crafting
    setTimeout(() => {
      notify.crafting("Item Crafted!", "Successfully crafted Legendary Sword", 4000);
    }, 3500);
    
    // Shop
    setTimeout(() => {
      notify.shop("Purchase Complete", "Bought XP Booster for 100 coins", 4000);
    }, 4000);
    
    // Energy
    setTimeout(() => {
      notify.energy("Energy Restored", "Your energy has been fully restored", 4000);
    }, 4500);
    
    // Habit
    setTimeout(() => {
      notify.habit("Habit Streak!", "7-day streak maintained!", 4000);
    }, 5000);
    
    // Pomodoro
    setTimeout(() => {
      notify.pomodoro("Session Complete", "Great work! Take a break", 4000);
    }, 5500);
  };

  const showSingleNotification = (type: keyof typeof notify) => {
    const messages = {
      success: { title: "Success!", message: "Operation completed successfully" },
      info: { title: "Information", message: "Here's some useful information" },
      warning: { title: "Warning", message: "Please be careful with this action" },
      error: { title: "Error", message: "Something went wrong" },
      achievement: { title: "Achievement Unlocked!", message: "First Steps - Complete your first quest" },
      quest: { title: "New Quest Available", message: "Daily Challenge: Complete 5 tasks" },
      boss: { title: "Boss Defeated!", message: "You've defeated the Dragon Boss!" },
      crafting: { title: "Item Crafted!", message: "Successfully crafted Legendary Sword" },
      shop: { title: "Purchase Complete", message: "Bought XP Booster for 100 coins" },
      energy: { title: "Energy Restored", message: "Your energy has been fully restored" },
      habit: { title: "Habit Streak!", message: "7-day streak maintained!" },
      pomodoro: { title: "Session Complete", message: "Great work! Take a break" }
    };

    const { title, message } = messages[type];
    notify[type](title, message, 4000);
  };

  const addTestBuff = async () => {
    try {
      const { playerStore } = await import('../../state/playerStore');
      const player = await playerStore.get();
      
      if (player) {
        const testBuff = {
          name: "Test Buff",
          type: 'multiplier' as const,
          value: 1.5,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          description: "A test buff that multiplies rewards by 1.5x",
          icon: "⚡",
          category: 'energy' as const
        };
        
        const updatedPlayer = {
          ...player,
          buffs: [...(player.buffs || []), testBuff]
        };
        
        await playerStore.update(() => updatedPlayer);
        notify.success("Test Buff Added!", "A test buff has been added to your player data", 3000);
      }
    } catch (error) {
      console.error('Error adding test buff:', error);
      notify.error("Error", "Failed to add test buff", 3000);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h3>Notification System Demo</h3>
      <p>Test the global notification system with different types of notifications.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={showAllNotificationTypes}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '10px',
            width: '100%'
          }}
        >
          Show All Notification Types
        </button>
        
        <button 
          onClick={addTestBuff}
          style={{
            padding: '10px 20px',
            backgroundColor: '#FFD700',
            color: 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '10px',
            width: '100%'
          }}
        >
          Add Test Buff (30 min)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        <button onClick={() => showSingleNotification('success')} style={{ padding: '8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Success
        </button>
        <button onClick={() => showSingleNotification('info')} style={{ padding: '8px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Info
        </button>
        <button onClick={() => showSingleNotification('warning')} style={{ padding: '8px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Warning
        </button>
        <button onClick={() => showSingleNotification('error')} style={{ padding: '8px', backgroundColor: '#F44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Error
        </button>
        <button onClick={() => showSingleNotification('achievement')} style={{ padding: '8px', backgroundColor: '#FFD700', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Achievement
        </button>
        <button onClick={() => showSingleNotification('quest')} style={{ padding: '8px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Quest
        </button>
        <button onClick={() => showSingleNotification('boss')} style={{ padding: '8px', backgroundColor: '#FF5722', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Boss
        </button>
        <button onClick={() => showSingleNotification('crafting')} style={{ padding: '8px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Crafting
        </button>
        <button onClick={() => showSingleNotification('shop')} style={{ padding: '8px', backgroundColor: '#009688', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Shop
        </button>
        <button onClick={() => showSingleNotification('energy')} style={{ padding: '8px', backgroundColor: '#FFEB3B', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Energy
        </button>
        <button onClick={() => showSingleNotification('habit')} style={{ padding: '8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Habit
        </button>
        <button onClick={() => showSingleNotification('pomodoro')} style={{ padding: '8px', backgroundColor: '#E91E63', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Pomodoro
        </button>
      </div>
    </div>
  );
};
