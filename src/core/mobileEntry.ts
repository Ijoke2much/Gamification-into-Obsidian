import { Plugin, Notice } from "obsidian";
import { GamificationPluginSettings, DEFAULT_SETTINGS } from './settings';
import { isDialogueCorrupted } from '../features/shop/utils/shopkeeperDialogueDefaults';

// Ultra-minimal mobile plugin that avoids all complex imports
export default class MobileGamifiedObsidianPlugin extends Plugin {
    settings!: GamificationPluginSettings;

    async onload() {
        console.log('📱 MOBILE PLUGIN: Starting ultra-minimal load...');

        // Show immediate notice
        new Notice('📱 Mobile Gamification: Loading...');

        try {
            // Minimal settings loading
            this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

            // Migration: clear corrupted shopkeeper dialogue overrides
            if (isDialogueCorrupted(this.settings.shopkeeperDialogueOverrides)) {
                this.settings.shopkeeperDialogueOverrides = {};
                await this.saveData(this.settings);
            }

            console.log('📱 MOBILE PLUGIN: Settings loaded');

            // Add minimal command
            this.addCommand({
                id: 'mobile-open-gamification',
                name: 'Open Gamification (Mobile)',
                callback: () => {
                    console.log('📱 MOBILE PLUGIN: Command executed');
                    new Notice('📱 Gamification opened!');
                    this.openMobileView();
                }
            });

            // Add floating button
            this.addMobileButton();

            console.log('📱 MOBILE PLUGIN: Loaded successfully!');
            new Notice('📱 Mobile Gamification: Loaded successfully!');

        } catch (error) {
            console.error('📱 MOBILE PLUGIN: Load failed:', error);
            new Notice('❌ Mobile Plugin: Load failed - ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    private addMobileButton(): void {
        console.log('📱 MOBILE PLUGIN: Adding mobile button...');

        setTimeout(() => {
            try {
                // Remove existing button
                const existing = document.querySelector('.mobile-gamification-btn');
                if (existing) existing.remove();

                // Create button
                const button = document.createElement('button');
                button.className = 'mobile-gamification-btn';
                button.innerHTML = '🎮';
                button.title = 'Open Gamification';

                // Simple styling
                button.style.cssText = `
					position: fixed;
					bottom: 20px;
					right: 20px;
					width: 50px;
					height: 50px;
					border-radius: 50%;
					background: #007acc;
					color: white;
					border: none;
					font-size: 20px;
					z-index: 9999;
					cursor: pointer;
					box-shadow: 0 2px 10px rgba(0,0,0,0.3);
				`;

                // Click handler
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('📱 MOBILE PLUGIN: Button clicked');
                    new Notice('📱 Gamification button clicked!');
                    this.openMobileView();
                });

                // Add to page
                document.body.appendChild(button);
                console.log('📱 MOBILE PLUGIN: Button added successfully');

            } catch (error) {
                console.error('📱 MOBILE PLUGIN: Button creation failed:', error);
            }
        }, 1000);
    }

    private openMobileView(): void {
        console.log('📱 MOBILE PLUGIN: Opening mobile view...');

        // Create a simple modal
        const modal = document.createElement('div');
        modal.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0,0,0,0.8);
			z-index: 10000;
			display: flex;
			align-items: center;
			justify-content: center;
		`;

        const content = document.createElement('div');
        content.style.cssText = `
			background: var(--background-primary, white);
			padding: 20px;
			border-radius: 10px;
			max-width: 90%;
			max-height: 90%;
			overflow: auto;
		`;

        content.innerHTML = `
			<h2>📱 Gamification Plugin</h2>
			<p>Mobile version loaded successfully!</p>
			<p>This is a minimal mobile-safe version.</p>
			<p>Features:</p>
			<ul>
				<li>✅ Mobile-optimized loading</li>
				<li>✅ Touch-friendly interface</li>
				<li>✅ Error recovery</li>
				<li>✅ Minimal resource usage</li>
			</ul>
			<button onclick="this.closest('.mobile-modal').remove()" style="
				background: #007acc;
				color: white;
				border: none;
				padding: 10px 20px;
				border-radius: 5px;
				cursor: pointer;
				margin-top: 10px;
			">Close</button>
		`;

        modal.className = 'mobile-modal';
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    onunload() {
        console.log('📱 MOBILE PLUGIN: Unloading...');

        // Clean up button
        const button = document.querySelector('.mobile-gamification-btn');
        if (button) button.remove();

        // Clean up modal
        const modal = document.querySelector('.mobile-modal');
        if (modal) modal.remove();
    }
}
