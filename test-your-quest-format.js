/**
 * Test Script for Your Specific Quest Format
 * 
 * This tests the EXACT format you're using:
 * "- [ ] tfr3gr3g3rg #gamified-task ⭐84 ✨932 93 🔼 🔁 🛠️Body Builder ⚖️ 🖼️assets/quest_banners/quest_banner_tfr3gr3g3rg_1758250688286.jpg"
 */

console.log('🧪 Testing YOUR EXACT Quest Format...');

// Test 1: Title Extraction
function testTitleExtraction() {
    console.log('\n=== TEST 1: Title Extraction ===');

    const yourQuestText = "- [ ] tfr3gr3g3rg #gamified-task ⭐84 ✨932 93 🔼 🔁 🛠️Body Builder ⚖️ 🖼️assets/quest_banners/quest_banner_tfr3gr3g3rg_1758250688286.jpg";

    console.log('📝 Your quest text:', yourQuestText);

    // Test the regex patterns we're using
    const patterns = [
        /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️]+?)(?:\s+#|\s+⭐)/,
        /- \[.\] ([^#⭐✨🔁🛠️🌱🖼️\n]+)/,
        /- \[.\] (.+?) #/,
        /- \[.\] ([^#]+)/
    ];

    for (let i = 0; i < patterns.length; i++) {
        const match = yourQuestText.match(patterns[i]);
        if (match && match[1]) {
            console.log(`✅ Pattern ${i + 1} extracted: "${match[1].trim()}"`);
            break;
        } else {
            console.log(`❌ Pattern ${i + 1} failed`);
        }
    }
}

// Test 2: Banner Path Extraction
function testBannerExtraction() {
    console.log('\n=== TEST 2: Banner Path Extraction ===');

    const yourQuestText = "- [ ] tfr3gr3g3rg #gamified-task ⭐84 ✨932 93 🔼 🔁 🛠️Body Builder ⚖️ 🖼️assets/quest_banners/quest_banner_tfr3gr3g3rg_1758250688286.jpg";

    const bannerMatch = yourQuestText.match(/🖼️([^\s]+)/);
    if (bannerMatch) {
        console.log('✅ Banner path extracted:', bannerMatch[1]);
    } else {
        console.log('❌ Could not extract banner path');
    }
}

// Test 3: Quest Detection
function testQuestDetection() {
    console.log('\n=== TEST 3: Quest Detection ===');

    const yourQuestText = "- [ ] tfr3gr3g3rg #gamified-task ⭐84 ✨932 93 🔼 🔁 🛠️Body Builder ⚖️ 🖼️assets/quest_banners/quest_banner_tfr3gr3g3rg_1758250688286.jpg";

    // Test our detection criteria
    const detectionTests = [
        { test: '#gamified-task', result: yourQuestText.includes('#gamified-task') },
        { test: '🛠️', result: yourQuestText.includes('🛠️') },
        { test: '⭐', result: yourQuestText.includes('⭐') },
        { test: '✨', result: yourQuestText.includes('✨') },
        { test: '🖼️', result: yourQuestText.includes('🖼️') }
    ];

    detectionTests.forEach(({ test, result }) => {
        console.log(`${result ? '✅' : '❌'} Detection "${test}": ${result}`);
    });

    const shouldDetect = detectionTests.some(t => t.result);
    console.log(`\n${shouldDetect ? '✅' : '❌'} Overall detection: ${shouldDetect ? 'SHOULD WORK' : 'WILL FAIL'}`);
}

// Test 4: Create Mock Quest Card
function testMockQuestCard() {
    console.log('\n=== TEST 4: Mock Quest Card ===');

    // Create a mock quest card with your exact format
    const mockQuestCard = document.createElement('div');
    mockQuestCard.innerHTML = `
        <div class="quest-card">
            <div class="quest-content">
                - [ ] tfr3gr3g3rg #gamified-task ⭐84 ✨932 93 🔼 🔁 🛠️Body Builder ⚖️ 🖼️assets/quest_banners/quest_banner_tfr3gr3g3rg_1758250688286.jpg
            </div>
        </div>
    `;

    mockQuestCard.style.cssText = `
        border: 2px solid #333;
        padding: 16px;
        margin: 16px;
        border-radius: 8px;
        background: #f5f5f5;
        min-height: 100px;
    `;

    // Add to page
    document.body.appendChild(mockQuestCard);
    console.log('📍 Created mock quest card with your exact format');

    // Test if Enhanced Quest System would detect it
    const plugin = app?.plugins?.plugins['gamified-obsidian'];
    if (plugin && plugin.enhancedQuestSystem) {
        console.log('🔍 Testing detection with Enhanced Quest System...');

        setTimeout(() => {
            // Manually trigger banner injection
            plugin.enhancedQuestSystem.injectBannersIntoQuestCards?.();

            setTimeout(() => {
                const hasBanner = mockQuestCard.querySelector('.enhanced-quest-banner');
                console.log(`${hasBanner ? '✅' : '❌'} Banner injection result: ${hasBanner ? 'SUCCESS' : 'FAILED'}`);

                // Clean up
                document.body.removeChild(mockQuestCard);
            }, 1000);
        }, 500);
    } else {
        console.log('❌ Enhanced Quest System not available');
        document.body.removeChild(mockQuestCard);
    }
}

// Test 5: Check Current Banner Cache
function testBannerCache() {
    console.log('\n=== TEST 5: Banner Cache ===');

    const plugin = app?.plugins?.plugins['gamified-obsidian'];
    if (plugin && plugin.enhancedQuestSystem) {
        // Try to get the cached banner for your quest
        const cachedBanner = plugin.enhancedQuestSystem.getCachedBanner('tfr3gr3g3rg');
        console.log(`${cachedBanner ? '✅' : '❌'} Banner cached for "tfr3gr3g3rg": ${!!cachedBanner}`);

        if (cachedBanner) {
            console.log('📸 Banner data URL length:', cachedBanner.length);
            console.log('📸 Banner starts with:', cachedBanner.substring(0, 50));
        }

        // Also try with variations
        const variations = ['tfr3gr3g3rg', 'tfr3gr3g3rg ', ' tfr3gr3g3rg'];
        variations.forEach(variation => {
            const cached = plugin.enhancedQuestSystem.getCachedBanner(variation);
            console.log(`${cached ? '✅' : '❌'} Banner cached for "${variation}": ${!!cached}`);
        });
    } else {
        console.log('❌ Enhanced Quest System not available');
    }
}

// Run all tests
function runAllTests() {
    console.log('🧪 Testing YOUR specific quest format...\n');
    console.log('📝 Your quest: "- [ ] tfr3gr3g3rg #gamified-task ⭐84 ✨932 93 🔼 🔁 🛠️Body Builder ⚖️ 🖼️assets/quest_banners/quest_banner_tfr3gr3g3rg_1758250688286.jpg"');

    testTitleExtraction();
    testBannerExtraction();
    testQuestDetection();
    testMockQuestCard();
    testBannerCache();

    console.log('\n📊 Tests completed! Check the results above.');
}

// Auto-run
runAllTests();

// Export for manual use
window.testYourQuestFormat = {
    runAllTests,
    testTitleExtraction,
    testBannerExtraction,
    testQuestDetection,
    testMockQuestCard,
    testBannerCache
};

console.log('\n💡 You can run individual tests:');
console.log('   testYourQuestFormat.testTitleExtraction()');
console.log('   testYourQuestFormat.testBannerCache()');
console.log('   testYourQuestFormat.testMockQuestCard()');
