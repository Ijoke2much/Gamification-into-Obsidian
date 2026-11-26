#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const file = path.resolve(__dirname, '../preview/journey-overworld-hub-mockup.html');
const platform = process.platform;

try {
	if (platform === 'darwin') {
		execSync(`open "${file}"`, { stdio: 'inherit' });
	} else if (platform === 'win32') {
		execSync(`start "" "${file}"`, { shell: true, stdio: 'inherit' });
	} else {
		execSync(`xdg-open "${file}"`, { stdio: 'inherit' });
	}
	console.log('Opened:', file);
} catch {
	console.error('Could not auto-open. Open this file in a browser:\n', file);
	process.exit(1);
}
