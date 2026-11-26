// Test the full parsing flow to diagnose the issue
const fs = require('fs');
const path = require('path');

// Read the actual GamifiedTasks.md file
const gamifiedTasksPath = path.join(__dirname, '../../../..', 'GamifiedTasks.md');

console.log('Looking for GamifiedTasks.md at:', gamifiedTasksPath);

if (fs.existsSync(gamifiedTasksPath)) {
    const content = fs.readFileSync(gamifiedTasksPath, 'utf-8');
    console.log('\n📄 File found! Content length:', content.length, 'characters');
    console.log('\n📋 First 500 characters:');
    console.log(content.substring(0, 500));
    console.log('\n...\n');

    // Count total quests
    const questLines = content.split('\n').filter(line => line.includes('#gamified-task'));
    console.log('\n🎯 Total #gamified-task lines found:', questLines.length);

    // Show each quest with its date
    console.log('\n📅 Quest dates:');
    questLines.forEach((line, idx) => {
        const titleMatch = line.match(/- \[[ x]\] (.+?) #gamified-task/);
        const dateMatch = line.match(/📅(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)/);
        const title = titleMatch ? titleMatch[1] : 'Unknown';
        const date = dateMatch ? dateMatch[1] : 'NO DATE';
        console.log(`${idx + 1}. "${title.substring(0, 30)}..." → ${date}`);
    });

} else {
    console.log('❌ GamifiedTasks.md not found at:', gamifiedTasksPath);
    console.log('\nTrying to find it in common locations...');

    const possiblePaths = [
        path.join(__dirname, '../../../..', 'GamifiedTasks.md'),
        path.join(__dirname, '../../..', 'GamifiedTasks.md'),
        path.join(process.cwd(), 'GamifiedTasks.md'),
    ];

    possiblePaths.forEach(p => {
        console.log('Checking:', p, '→', fs.existsSync(p) ? '✅ EXISTS' : '❌ Not found');
    });
}

