#!/usr/bin/env node
/**
 * Copy static assets into the plugin folder (beside main.js).
 * Keeps PNGs out of the JS bundle for smaller mobile loads.
 */
import { cpSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = join(root, 'assets');
const treesSrc = join(root, 'src', 'assets', 'trees');
const treesDest = join(assetsRoot, 'trees');

mkdirSync(treesDest, { recursive: true });

if (existsSync(treesSrc)) {
	for (const name of ['tree_stage_1.png', 'tree_stage_2.png', 'tree_stage_3.png', 'tree_stage_4.png', 'tree_stage_5.png']) {
		const src = join(treesSrc, name);
		if (existsSync(src)) {
			cpSync(src, join(treesDest, name), { force: true });
		}
	}
}

console.log('✅ Plugin assets copied to assets/ (including assets/trees/)');
