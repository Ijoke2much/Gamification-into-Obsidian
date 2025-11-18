/**
 * Simple test script to manually update PlayerData.md
 * Run this to test if changes persist after Obsidian reload
 */

const fs = require('fs');
const path = require('path');

const playerDataPath = path.join(__dirname, '../../../SkillTree/PlayerData.md');

// Read current file
const content = fs.readFileSync(playerDataPath, 'utf8');

console.log('Current PlayerData.md content:');
console.log(content);
console.log('\n---\n');

// Update level, xp, coins to test values
const updatedContent = content
    .replace(/^level: \d+$/m, 'level: 5')
    .replace(/^xp: \d+$/m, 'xp: 250')
    .replace(/^xpRequired: \d+$/m, 'xpRequired: 2500')
    .replace(/^coins: \d+$/m, 'coins: 1000')
    .replace(/^cp: \d+$/m, 'cp: 50')
    .replace(/energy: \d+$/m, 'energy: 100')
    .replace(/focus: \d+$/m, 'focus: 95');

// Write updated content
fs.writeFileSync(playerDataPath, updatedContent, 'utf8');

console.log('✅ Updated PlayerData.md with test values:');
console.log('  - Level: 5');
console.log('  - XP: 250 / 2500');
console.log('  - Coins: 1000');
console.log('  - CP: 50');
console.log('  - Energy: 100');
console.log('  - Focus: 95');
console.log('\n👉 Now reload Obsidian and check if these values persist!');

