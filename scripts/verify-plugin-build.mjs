#!/usr/bin/env node
/**
 * Print plugin version and bundle sizes — use to confirm phone sync target.
 */
import { readFileSync, statSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function sizeMb(path) {
	if (!existsSync(path)) return 'missing';
	return `${(statSync(path).size / 1024 / 1024).toFixed(2)} MB`;
}

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));

console.log('\n📦 Gamification plugin build');
console.log('   Version:', manifest.version);
console.log('   main.js:', sizeMb(join(root, 'main.js')));
console.log('   styles.css:', sizeMb(join(root, 'styles.css')));
console.log('   manifest.json: present');
console.log('   assets/trees:', existsSync(join(root, 'assets/trees/tree_stage_1.png')) ? 'ok' : 'MISSING');
console.log('   assets/sprites:', existsSync(join(root, 'assets/sprites/weapons/sword.png')) ? 'ok' : 'MISSING');
console.log('   assets/focus-stage:', existsSync(join(root, 'assets/focus-stage.jpg')) ? 'ok' : 'MISSING');
if (!existsSync(join(root, 'styles.css'))) {
	console.error('\n❌ styles.css missing — Obsidian/BRAT will not load plugin CSS.\n');
	process.exit(1);
}
console.log('\n📦 BRAT release files: manifest.json, main.js, styles.css');
console.log('\n📱 Sync to phone (Obsidian Sync must include .obsidian/plugins/):');
console.log('   .obsidian/plugins/Gamification-into-Obsidian/manifest.json');
console.log('   .obsidian/plugins/Gamification-into-Obsidian/main.js');
console.log('   .obsidian/plugins/Gamification-into-Obsidian/styles.css');
console.log('   Then: disable → re-enable plugin on phone. Settings should show v' + manifest.version + '\n');
