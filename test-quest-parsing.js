// Quick test to see how the parser handles your quest format
const testQuests = `
- [ ] test #gamified-task ⭐38 ✨893 ��89 🔼 🛠️Stamina 🌱 ⏱️5 📅2025-10-02T22:11
- [ ] efewfefef #gamified-task ⭐51 ✨973 ��97 🔁weekly 🛠️Body Builder 🔥 📅2025-10-02T20:24
💭 the test objective
test 1
test 2
test 3
- [ ] test daily #gamified-task ⭐56 ✨872 ��87 🔁bi-weekly 🛠️Cristianity ⚖️ ⏱️15 📅2025-10-09
- [ ] tester #gamified-task ⭐46 ✨364 ��36 ⏩ 🔁daily 🛠️Body Builder 🌱 ⏱️15 📅2025-10-11T22:52
💭 test description
- [ ] 5g5g5g5g5g5 #gamified-task ⭐77 ✨504 ��50 🔼 🛠️Body Builder ⚖️ ⏱️15 📅2025-10-17T17:36
- [ ] test new #gamified-task ⭐19 ✨276 ��28 ⏩ 🔁daily 🛠️Bodybuilder 🌱 ⏱️15 📅2025-10-14T22:00
`;

// Test date extraction regex
const dateRegex = /📅(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)/;
const lines = testQuests.split('\n');

console.log('Testing quest date extraction:');
console.log('================================');
lines.forEach((line, idx) => {
    if (line.includes('#gamified-task')) {
        console.log(`\nLine ${idx}:`, line);
        const match = line.match(dateRegex);
        if (match) {
            console.log('  ✅ Date found:', match[1]);
        } else {
            console.log('  ❌ No date found!');
            // Check if date emoji exists
            if (line.includes('📅')) {
                console.log('  ⚠️  Date emoji exists but regex failed');
                // Try to extract what comes after the emoji
                const idx = line.indexOf('📅');
                console.log('  Raw text after emoji:', line.substring(idx, idx + 30));
            }
        }
    }
});

