#!/usr/bin/env node
/**
 * Copy built plugin artifacts to the iCloud Obsidian vault (what iPhone/iPad syncs).
 *
 * Local dev vault:  ~/Obsidian-vaults/Gamified-test-0-plugin
 * iCloud vault:     ~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Gamified-test-0-plugin
 */
import { cpSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaultName = process.env.GAMIFICATION_VAULT_NAME || 'Gamified-test-0-plugin';
const icloudVault = join(
	process.env.HOME || '',
	'Library/Mobile Documents/iCloud~md~obsidian/Documents',
	vaultName
);
const icloudPlugin = join(icloudVault, '.obsidian/plugins/Gamification-into-Obsidian');

if (!existsSync(icloudVault)) {
	console.error('❌ iCloud vault not found:', icloudVault);
	console.error('   Set GAMIFICATION_VAULT_NAME if your vault has a different name.');
	process.exit(1);
}

mkdirSync(icloudPlugin, { recursive: true });

const copyFile = (name) => {
	const src = join(pluginRoot, name);
	const dest = join(icloudPlugin, name);
	if (!existsSync(src)) {
		console.warn('⚠️  Missing:', src);
		return;
	}
	cpSync(src, dest, { force: true });
	console.log('   ✓', name);
};

console.log('\n📲 Publishing to iCloud Obsidian vault');
console.log('   From:', pluginRoot);
console.log('   To:  ', icloudPlugin);

const manifest = JSON.parse(readFileSync(join(pluginRoot, 'manifest.json'), 'utf8'));
console.log('   Version:', manifest.version);

copyFile('manifest.json');
copyFile('main.js');
copyFile('main.css');

const assetsSrc = join(pluginRoot, 'assets');
const assetsDest = join(icloudPlugin, 'assets');
if (existsSync(assetsSrc)) {
	cpSync(assetsSrc, assetsDest, { recursive: true, force: true });
	console.log('   ✓ assets/ (recursive)');
} else {
	console.warn('⚠️  No assets/ folder — run npm run build first');
}

console.log('\n✅ Published. On iPhone: wait for iCloud sync, then disable → re-enable plugin.');
console.log('   Expected version in settings:', manifest.version, '\n');
