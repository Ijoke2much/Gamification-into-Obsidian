#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const esbuildConfigPath = path.join(__dirname, 'esbuild.config.mjs');
const buildType = process.argv[2] || 'mobile';

console.log(`🔄 Switching to ${buildType} build...`);

// Read the current config
let config = fs.readFileSync(esbuildConfigPath, 'utf8');

if (buildType === 'mobile') {
    // Use mobile entry point
    config = config.replace(
        'entryPoints: ["src/core/main.ts"]',
        'entryPoints: ["src/core/mobileEntry.ts"]'
    );
    console.log('📱 Mobile build configured');
} else if (buildType === 'desktop') {
    // Use desktop entry point
    config = config.replace(
        'entryPoints: ["src/core/mobileEntry.ts"]',
        'entryPoints: ["src/core/main.ts"]'
    );
    console.log('🖥️ Desktop build configured');
} else {
    console.error('❌ Invalid build type. Use "mobile" or "desktop"');
    process.exit(1);
}

// Write the updated config
fs.writeFileSync(esbuildConfigPath, config);
console.log('✅ Build configuration updated');
