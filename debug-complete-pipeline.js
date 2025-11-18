/**
 * COMPLETE PIPELINE DEBUG
 * Tests the entire banner system from parsing to display
 */

console.log('🔧 COMPLETE BANNER PIPELINE DEBUG');

// Your exact quest examples
const testQuests = [
    "- [ ] tfr3gr3g3rg #gamified-task ⭐84 ✨932 ��93 🔼 🔁 🛠️Body Builder ⚖️ 🖼️assets/quest_banners/quest_banner_tfr3gr3g3rg_1758250688286.jpg",
    "- [ ] Read the Bible #gamified-task ⭐48 ✨196 ��20 🔁 🛠️Cristianity 🌱 🖼️assets/quest_banners/quest_banner_read_the_bible_1758239546777.jpg"
];

async function debugCompleteSystem() {
    console.log('\n=== STEP 1: Plugin System Check ===');

    // Check if plugin exists
    const plugin = window.app?.plugins?.plugins['gamified-obsidian'];
    if (!plugin) {
        console.log('❌ CRITICAL: Plugin not found!');
        console.log('   Available plugins:', Object.keys(window.app?.plugins?.plugins || {}));
        return;
    }
    console.log('✅ Plugin found');

    // Check Enhanced Quest System
    if (!plugin.enhancedQuestSystem) {
        console.log('❌ CRITICAL: Enhanced Quest System not initialized!');
        return;
    }
    console.log('✅ Enhanced Quest System found');

    console.log('\n=== STEP 2: Banner Cache Check ===');

    // Test title extraction and caching
    testQuests.forEach((questText, index) => {
        console.log(`\n--- Quest ${index + 1}: "${questText.substring(0, 50)}..." ---`);

        // Test title extraction patterns
        const patterns = [
            /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️]+?)(?:\s+#|\s+⭐)/,
            /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️\n]+)/,
            /- \[.\] (.+?) #/,
            /- \[.\] ([^#]+)/
        ];

        let extractedTitle = null;
        for (const pattern of patterns) {
            const match = questText.match(pattern);
            if (match && match[1]) {
                extractedTitle = match[1].trim();
                console.log(`✅ Title extracted: "${extractedTitle}"`);
                break;
            }
        }

        if (!extractedTitle) {
            console.log('❌ Title extraction FAILED');
            return;
        }

        // Test banner path extraction
        const bannerMatch = questText.match(/🖼️([^\s]+)/);
        if (bannerMatch && bannerMatch[1]) {
            console.log(`✅ Banner path: "${bannerMatch[1]}"`);

            // Check if banner is cached
            const cachedBanner = plugin.enhancedQuestSystem.getCachedBanner(extractedTitle);
            console.log(`${cachedBanner ? '✅' : '❌'} Banner cached: ${!!cachedBanner}`);

            if (cachedBanner) {
                console.log(`   Cache entry length: ${cachedBanner.length} chars`);
                console.log(`   Starts with: ${cachedBanner.substring(0, 30)}...`);
            }
        } else {
            console.log('❌ Banner path extraction FAILED');
        }
    });

    console.log('\n=== STEP 3: DOM Detection Test ===');

    // Create test elements that match your quest format
    const testContainer = document.createElement('div');
    testContainer.innerHTML = `
        <div class="test-quest-1">
            ${testQuests[0]}
        </div>
        <div class="test-quest-2">
            ${testQuests[1]}
        </div>
    `;
    testContainer.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; background: white; padding: 20px; border: 2px solid red;';
    document.body.appendChild(testContainer);

    console.log('📍 Created test quest elements in DOM');

    // Test detection
    setTimeout(() => {
        console.log('\n--- Testing Enhanced Quest System Detection ---');

        // Manually trigger the detection system
        plugin.enhancedQuestSystem.injectBannersIntoQuestCards?.();

        setTimeout(() => {
            // Check if banners were injected
            const banner1 = testContainer.querySelector('.test-quest-1 .enhanced-quest-banner');
            const banner2 = testContainer.querySelector('.test-quest-2 .enhanced-quest-banner');

            console.log(`${banner1 ? '✅' : '❌'} Quest 1 banner injected: ${!!banner1}`);
            console.log(`${banner2 ? '✅' : '❌'} Quest 2 banner injected: ${!!banner2}`);

            if (banner1) {
                console.log('   Banner 1 HTML:', banner1.outerHTML.substring(0, 200));
            }
            if (banner2) {
                console.log('   Banner 2 HTML:', banner2.outerHTML.substring(0, 200));
            }

            // Clean up
            document.body.removeChild(testContainer);

            console.log('\n=== STEP 4: Real Quest Card Detection ===');

            // Look for actual quest cards in the DOM
            const realQuestSelectors = [
                '.quest-card',
                '.cinematic-quest-card',
                '[class*="quest"]',
                '[class*="Quest"]',
                '[class*="task"]',
                '[class*="Task"]'
            ];

            let foundRealCards = 0;
            realQuestSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`📍 Found ${elements.length} real quest cards with selector: ${selector}`);
                    foundRealCards += elements.length;

                    // Check first few for quest text
                    Array.from(elements).slice(0, 3).forEach((el, idx) => {
                        const text = el.textContent || '';
                        const hasQuestText = text.includes('#gamified-task') || text.includes('🛠️') || text.includes('⭐');
                        console.log(`   Card ${idx + 1}: ${hasQuestText ? '✅' : '❌'} Contains quest markers`);
                        if (hasQuestText) {
                            console.log(`      Text: ${text.substring(0, 100)}...`);
                        }
                    });
                }
            });

            if (foundRealCards === 0) {
                console.log('⚠️ No real quest cards found in DOM');
                console.log('   This might be why banners aren\'t showing up!');

                // Search by text content
                const allElements = Array.from(document.querySelectorAll('*'));
                const elementsWithQuestText = allElements.filter(el => {
                    const text = el.textContent || '';
                    return text.includes('#gamified-task') || text.includes('🛠️') || text.includes('⭐');
                });

                console.log(`📍 Found ${elementsWithQuestText.length} elements with quest text`);
                elementsWithQuestText.slice(0, 5).forEach((el, idx) => {
                    console.log(`   Element ${idx + 1}: ${el.tagName}.${el.className}`);
                    console.log(`      Text: ${(el.textContent || '').substring(0, 100)}...`);
                });
            }

            console.log('\n=== FINAL DIAGNOSIS ===');
            console.log('If banners still don\'t work, the issue is likely:');
            console.log('1. ❌ Quest cards not found in DOM (check selectors)');
            console.log('2. ❌ Banner cache not loading from GamifiedTasks.md');
            console.log('3. ❌ Title extraction not matching cached titles');
            console.log('4. ❌ Banner injection timing issues');
            console.log('\nNext steps:');
            console.log('- Check if GamifiedTasks.md exists and contains your quests');
            console.log('- Verify quest card selectors match actual DOM structure');
            console.log('- Test banner loading manually');

        }, 2000);
    }, 1000);
}

// Auto-run the complete debug
debugCompleteSystem();

// Also provide manual access
window.debugBannerPipeline = debugCompleteSystem;
