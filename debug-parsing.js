/**
 * DEBUG: Test parsing with your EXACT quest format
 */

console.log('🔍 DEBUGGING QUEST PARSING...');

// Your exact quest examples
const quest1 = "- [ ] tfr3gr3g3rg #gamified-task ⭐84 ✨932 ��93 🔼 🔁 🛠️Body Builder ⚖️ 🖼️assets/quest_banners/quest_banner_tfr3gr3g3rg_1758250688286.jpg";
const quest2 = "- [ ] Read the Bible #gamified-task ⭐48 ✨196 ��20 🔁 🛠️Cristianity 🌱 🖼️assets/quest_banners/quest_banner_read_the_bible_1758239546777.jpg";

console.log('\n=== QUEST 1 ===');
console.log('Text:', quest1);
console.log('Length:', quest1.length);

console.log('\n=== QUEST 2 ===');
console.log('Text:', quest2);
console.log('Length:', quest2.length);

// Test title extraction patterns
console.log('\n=== TESTING TITLE EXTRACTION PATTERNS ===');

const patterns = [
    { name: 'Pattern 1: Between checkbox and #', regex: /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️]+?)(?:\s+#|\s+⭐)/ },
    { name: 'Pattern 2: Before any emoji', regex: /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️\n]+)/ },
    { name: 'Pattern 3: Legacy format', regex: /- \[.\] (.+?) #/ },
    { name: 'Pattern 4: Before hashtag', regex: /- \[.\] ([^#]+)/ },
    { name: 'Pattern 5: Simple extraction', regex: /- \[.\] ([^\s]+)/ }
];

[quest1, quest2].forEach((quest, questIndex) => {
    console.log(`\n--- Quest ${questIndex + 1} Title Extraction ---`);

    patterns.forEach(({ name, regex }) => {
        const match = quest.match(regex);
        if (match && match[1]) {
            const title = match[1].trim();
            console.log(`✅ ${name}: "${title}"`);
        } else {
            console.log(`❌ ${name}: NO MATCH`);
        }
    });
});

// Test banner path extraction
console.log('\n=== TESTING BANNER PATH EXTRACTION ===');

[quest1, quest2].forEach((quest, questIndex) => {
    console.log(`\n--- Quest ${questIndex + 1} Banner Extraction ---`);

    const bannerMatch = quest.match(/🖼️([^\s]+)/);
    if (bannerMatch && bannerMatch[1]) {
        console.log(`✅ Banner path: "${bannerMatch[1]}"`);
    } else {
        console.log(`❌ Banner path: NO MATCH`);
    }
});

// Test quest detection criteria
console.log('\n=== TESTING QUEST DETECTION CRITERIA ===');

const detectionCriteria = [
    '#gamified-task',
    '🛠️',
    '⭐',
    '✨',
    '🖼️'
];

[quest1, quest2].forEach((quest, questIndex) => {
    console.log(`\n--- Quest ${questIndex + 1} Detection ---`);

    detectionCriteria.forEach(criteria => {
        const found = quest.includes(criteria);
        console.log(`${found ? '✅' : '❌'} Contains "${criteria}": ${found}`);
    });

    const shouldDetect = detectionCriteria.some(criteria => quest.includes(criteria));
    console.log(`\n${shouldDetect ? '✅' : '❌'} OVERALL DETECTION: ${shouldDetect ? 'SHOULD WORK' : 'WILL FAIL'}`);
});

// Test the corrupted characters issue
console.log('\n=== TESTING CORRUPTED CHARACTERS ===');

[quest1, quest2].forEach((quest, questIndex) => {
    console.log(`\n--- Quest ${questIndex + 1} Character Analysis ---`);

    // Look for the corrupted characters
    const corruptedMatch = quest.match(/��\d+/);
    if (corruptedMatch) {
        console.log(`⚠️ Found corrupted characters: "${corruptedMatch[0]}"`);
        console.log('   This might be affecting parsing!');
    } else {
        console.log('✅ No corrupted characters found');
    }

    // Show character codes around the corrupted area
    const corruptedIndex = quest.indexOf('��');
    if (corruptedIndex !== -1) {
        const start = Math.max(0, corruptedIndex - 5);
        const end = Math.min(quest.length, corruptedIndex + 10);
        const segment = quest.substring(start, end);

        console.log(`   Segment around corruption: "${segment}"`);
        console.log('   Character codes:', Array.from(segment).map(char => char.charCodeAt(0)));
    }
});

console.log('\n=== SUMMARY ===');
console.log('1. Check if title extraction is working correctly');
console.log('2. Check if banner path extraction is working');
console.log('3. Check if quest detection criteria are met');
console.log('4. Look for any character encoding issues');
console.log('\nIf all tests pass but banners still don\'t show, the issue is likely:');
console.log('- Banner cache not loading properly');
console.log('- Quest cards not being found in the DOM');
console.log('- Banner injection failing');
