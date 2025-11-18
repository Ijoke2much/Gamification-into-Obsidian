#!/usr/bin/env node

/**
 * Bundle Analysis Script for Gamification Plugin
 * 
 * This script analyzes the built bundle to identify:
 * - Large dependencies
 * - Unused code (dead code elimination)
 * - Bundle size breakdown
 * - Performance opportunities
 */

import fs from 'fs';

async function analyzeBundleSize() {
    console.log('🔍 Analyzing bundle size...\n');

    try {
        // Check if main.js exists
        const bundlePath = 'main.js';
        if (!fs.existsSync(bundlePath)) {
            console.log('❌ Bundle not found. Run npm run build first.');
            return;
        }

        // Get bundle size
        const stats = fs.statSync(bundlePath);
        const sizeInKB = (stats.size / 1024).toFixed(2);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`📦 Bundle Size Analysis:`);
        console.log(`   main.js: ${sizeInKB} KB (${sizeInMB} MB)`);

        // Check CSS size
        if (fs.existsSync('styles.css')) {
            const cssStats = fs.statSync('styles.css');
            const cssSizeInKB = (cssStats.size / 1024).toFixed(2);
            console.log(`   styles.css: ${cssSizeInKB} KB`);
        }

        // Analyze bundle content (basic analysis)
        const bundleContent = fs.readFileSync(bundlePath, 'utf-8');

        console.log(`\n📊 Bundle Content Analysis:`);
        console.log(`   Total lines: ${bundleContent.split('\n').length.toLocaleString()}`);
        console.log(`   Characters: ${bundleContent.length.toLocaleString()}`);

        // Look for potential optimizations
        const largeStrings = bundleContent.match(/".{100,}"/g) || [];
        const functionCount = (bundleContent.match(/function\s+\w+/g) || []).length;
        const classCount = (bundleContent.match(/class\s+\w+/g) || []).length;

        console.log(`   Functions: ${functionCount}`);
        console.log(`   Classes: ${classCount}`);
        console.log(`   Large strings: ${largeStrings.length}`);

        // Check for debugging code in production
        const debugPatterns = [
            'console.log',
            'console.debug',
            'console.warn',
            'debugger;'
        ];

        console.log(`\n🐛 Debug Code Check:`);
        debugPatterns.forEach(pattern => {
            const matches = (bundleContent.match(new RegExp(pattern, 'g')) || []).length;
            if (matches > 0) {
                console.log(`   ⚠️  Found ${matches} instances of '${pattern}'`);
            }
        });

        // Performance recommendations
        console.log(`\n🚀 Performance Recommendations:`);

        if (parseFloat(sizeInMB) > 2) {
            console.log(`   📉 Bundle is quite large (${sizeInMB} MB). Consider:`);
            console.log(`      - Code splitting with React.lazy()`);
            console.log(`      - Tree shaking unused imports`);
            console.log(`      - Minimizing dependencies`);
        } else if (parseFloat(sizeInMB) > 1) {
            console.log(`   📋 Bundle size is moderate (${sizeInMB} MB). Consider:`);
            console.log(`      - Lazy loading non-critical components`);
            console.log(`      - Optimizing large dependencies`);
        } else {
            console.log(`   ✅ Bundle size is good (${sizeInMB} MB)`);
        }

        if (largeStrings.length > 10) {
            console.log(`   📝 Found ${largeStrings.length} large strings - consider external files for large data`);
        }

        // Check specific Obsidian optimization opportunities
        if (bundleContent.includes('React.createElement')) {
            console.log(`   ⚛️  Consider using React JSX transform for smaller bundles`);
        }

        console.log(`\n✅ Analysis complete!`);

    } catch (error) {
        console.error('❌ Error analyzing bundle:', error.message);
    }
}

async function checkDependencies() {
    console.log('\n📚 Dependency Analysis...\n');

    try {
        // Read package.json
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        const deps = { ...packageJson.dependencies };
        const devDeps = { ...packageJson.devDependencies };

        console.log(`Production Dependencies (${Object.keys(deps).length}):`);
        Object.entries(deps).forEach(([name, version]) => {
            console.log(`   ${name}: ${version}`);
        });

        console.log(`\nDev Dependencies (${Object.keys(devDeps).length}):`);
        Object.entries(devDeps).forEach(([name, version]) => {
            console.log(`   ${name}: ${version}`);
        });

        // Check for potential unused dependencies
        const bundleContent = fs.readFileSync('main.js', 'utf-8');

        console.log(`\n🔍 Dependency Usage Check:`);
        Object.keys(deps).forEach(dep => {
            if (!bundleContent.includes(dep) && !bundleContent.includes(dep.replace(/-/g, ''))) {
                console.log(`   ⚠️  '${dep}' might be unused`);
            }
        });

    } catch (error) {
        console.error('❌ Error analyzing dependencies:', error.message);
    }
}

async function checkPerformanceMetrics() {
    console.log('\n⚡ Performance Metrics...\n');

    try {
        // Simulated load time estimation (very rough)
        const bundleSize = fs.statSync('main.js').size;
        const estimatedLoadTime = {
            fast3g: ((bundleSize / (1.6 * 1024 * 1024)) * 8).toFixed(2), // 1.6 Mbps
            slow3g: ((bundleSize / (0.4 * 1024 * 1024)) * 8).toFixed(2), // 400 Kbps
            wifi: ((bundleSize / (25 * 1024 * 1024)) * 8).toFixed(2), // 25 Mbps
        };

        console.log(`📶 Estimated Load Times:`);
        console.log(`   Fast 3G: ${estimatedLoadTime.fast3g}s`);
        console.log(`   Slow 3G: ${estimatedLoadTime.slow3g}s`);
        console.log(`   WiFi: ${estimatedLoadTime.wifi}s`);

        // Check for performance anti-patterns
        const bundleContent = fs.readFileSync('main.js', 'utf-8');
        const antiPatterns = [
            { pattern: /document\.createElement/g, name: 'Direct DOM manipulation' },
            { pattern: /innerHTML\s*=/g, name: 'innerHTML usage' },
            { pattern: /setTimeout.*0/g, name: 'setTimeout with 0 delay' },
        ];

        console.log(`\n🔍 Performance Anti-patterns:`);
        antiPatterns.forEach(({ pattern, name }) => {
            const matches = (bundleContent.match(pattern) || []).length;
            if (matches > 0) {
                console.log(`   ⚠️  ${name}: ${matches} occurrences`);
            }
        });

    } catch (error) {
        console.error('❌ Error checking performance metrics:', error.message);
    }
}

// Main execution
async function main() {
    console.log('🚀 Gamification Plugin Bundle Analyzer\n');
    console.log('=====================================\n');

    await analyzeBundleSize();
    await checkDependencies();
    await checkPerformanceMetrics();

    console.log('\n🎯 Next Steps:');
    console.log('   1. Review any warnings above');
    console.log('   2. Consider implementing lazy loading for large components');
    console.log('   3. Remove any unused dependencies');
    console.log('   4. Test loading performance in Obsidian');
    console.log('\n📖 For more optimization tips, see: https://esbuild.github.io/api/#analyze');
}

main().catch(console.error);
