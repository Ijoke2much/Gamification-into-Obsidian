// Modal for changing avatar
import { Modal, TFile, App } from "obsidian";

export class AvatarPickerModal extends Modal {
	files: TFile[];
	onSelect: (path: string) => void;

	constructor(app: App, files: TFile[], onSelect: (path: string) => void) {
		super(app);
		this.files = files;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;

		// Ensure this modal appears above other modals (Quest modal has z-index 10000)
		(this.containerEl as HTMLElement).style.zIndex = "15000";

		// Simple mobile detection using window dimensions and touch capability
		const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
		const isLargePhone = window.innerHeight > 800; // iPhone 14 Pro Max is 932px height

		console.log('🔍 Avatar Modal Mobile Detection:', {
			isMobile,
			isLargePhone,
			innerWidth: window.innerWidth,
			innerHeight: window.innerHeight,
			hasTouch: 'ontouchstart' in window
		});

		// Remove the default modal close button that appears in background
		const existingCloseButton = this.containerEl.querySelector('.modal-close-button');
		if (existingCloseButton) {
			existingCloseButton.remove();
		}

		// MOBILE-ONLY STYLING - DESKTOP USES DEFAULT OBSIDIAN BEHAVIOR
		if (isMobile) {
			const container = this.containerEl as HTMLElement;
			const modal = this.modalEl as HTMLElement;

			// Make it ACTUALLY full screen and centered
			container.style.cssText = `
				position: fixed !important;
				top: 0 !important;
				left: 0 !important;
				right: 0 !important;
				bottom: 0 !important;
				width: 100vw !important;
				height: 100vh !important;
				z-index: 15000 !important;
				background: rgba(0, 0, 0, 0.9) !important;
				display: flex !important;
				align-items: center !important;
				justify-content: center !important;
				padding: 10px !important;
				box-sizing: border-box !important;
			`;

			// Make modal positioned at left -3% with smaller width and higher position
			modal.style.cssText = `
				position: absolute !important;
				left: -3% !important;
				top: 10% !important;
				transform: translateY(-50%) !important;
				width: 65vw !important;
				height: calc(100vh - 80px) !important;
				max-width: 450px !important;
				margin: 0 !important;
				border-radius: 16px !important;
				background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460) !important;
				border: 2px solid rgba(255, 215, 0, 0.4) !important;
				box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
				overflow: hidden !important;
				display: flex !important;
				flex-direction: column !important;
			`;
		} else {
			// DESKTOP - Beautiful golden border and blue background, bigger size
			const container = this.containerEl as HTMLElement;
			const modal = this.modalEl as HTMLElement;

			container.style.cssText = `
				position: fixed !important;
				top: 0 !important;
				left: 0 !important;
				right: 0 !important;
				bottom: 0 !important;
				width: 100vw !important;
				height: 100vh !important;
				z-index: 15000 !important;
				background: rgba(0, 0, 0, 0.85) !important;
				display: flex !important;
				align-items: center !important;
				justify-content: center !important;
				padding: 20px !important;
				box-sizing: border-box !important;
			`;

			modal.style.cssText = `
				position: relative !important;
				width: 800px !important;
				height: 650px !important;
				max-width: 90vw !important;
				max-height: 85vh !important;
				margin: 0 !important;
				border-radius: 16px !important;
				background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460) !important;
				border: 2px solid rgba(255, 215, 0, 0.4) !important;
				box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6) !important;
				overflow: hidden !important;
				display: flex !important;
				flex-direction: column !important;
			`;
		}

		// Create header container for proper alignment - iPhone 14 Pro Max optimized
		const headerContainer = contentEl.createDiv({ cls: 'avatar-picker-header-container' });
		headerContainer.style.cssText = `
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: ${isMobile ? (isLargePhone ? '18px 24px' : '16px 20px') : '16px'};
			border-bottom: ${isMobile ? '2px solid rgba(255, 215, 0, 0.4)' : '1px solid var(--background-modifier-border)'};
			background: ${isMobile ? 'linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95))' : 'var(--background-primary)'};
			flex-shrink: 0;
		`;

		const header = headerContainer.createEl("h2", { text: "Choose an Avatar" });
		header.addClass('avatar-picker-header');

		// Simple styling that works with Obsidian's native behavior
		header.style.cssText = `
			color: ${isMobile ? 'white' : 'var(--text-normal)'};
			margin: 0;
			font-size: ${isMobile ? '24px' : '20px'};
			font-weight: 600;
			text-align: center;
		`;

		// Add close button aligned with header
		const closeBtn = headerContainer.createEl("button", { text: "✕" });
		closeBtn.addClass('avatar-picker-close');
		closeBtn.style.cssText = `
			position: absolute;
			right: ${isMobile ? '20px' : '16px'};
			top: 50%;
			transform: translateY(-50%);
			width: ${isMobile ? '40px' : '32px'};
			height: ${isMobile ? '40px' : '32px'};
			border: ${isMobile ? '2px solid rgba(255, 215, 0, 0.5)' : '1px solid var(--background-modifier-border)'};
			background: ${isMobile ? 'linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.9))' : 'var(--background-secondary)'};
			color: ${isMobile ? 'white' : 'var(--text-normal)'};
			border-radius: 50%;
			font-size: ${isMobile ? '20px' : '16px'};
			font-weight: bold;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s ease;
			z-index: 10;
		`;

		// Add hover/touch effects for close button
		closeBtn.addEventListener('mouseenter', () => {
			if (!isMobile) {
				closeBtn.style.background = 'var(--background-modifier-hover)';
			}
		});

		closeBtn.addEventListener('mouseleave', () => {
			if (!isMobile) {
				closeBtn.style.background = 'var(--background-secondary)';
			}
		});

		if (isMobile) {
			closeBtn.addEventListener('touchstart', () => {
				closeBtn.style.transform = 'translateY(-50%) scale(0.9)';
				closeBtn.style.background = 'linear-gradient(135deg, rgba(255, 0, 0, 0.8), rgba(200, 0, 0, 0.8))';
				closeBtn.style.borderColor = 'rgba(255, 0, 0, 0.8)';
			});

			closeBtn.addEventListener('touchend', () => {
				closeBtn.style.transform = 'translateY(-50%) scale(1)';
				closeBtn.style.background = 'linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.9))';
				closeBtn.style.borderColor = 'rgba(255, 215, 0, 0.5)';
			});
		}

		closeBtn.onclick = () => this.close();

		// Add styling to the modal content - ensure proper layout
		contentEl.addClass('avatar-picker-content');
		contentEl.style.cssText = `
			background: ${isMobile ? 'transparent' : 'var(--background-primary)'};
			padding: 0;
			display: flex;
			flex-direction: column;
			height: ${isMobile ? '100%' : 'auto'};
			overflow: hidden;
		`;

		const list = contentEl.createDiv({ cls: "avatar-list" });
		list.addClass('avatar-grid');

		// SIMPLE GRID THAT SHOWS ALL AVATARS WITH PROPER SCROLLING
		const gridStyle = isMobile ? `
			display: grid !important;
			grid-template-columns: repeat(2, 1fr) !important;
			gap: 15px !important;
			padding: 15px !important;
			flex: 1 !important;
			overflow-y: auto !important;
			-webkit-overflow-scrolling: touch !important;
			min-height: 0 !important;
			max-height: none !important;
		` : `
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
			gap: 16px;
			padding: 20px;
			flex: 1;
			overflow-y: auto;
			justify-content: center;
			align-content: start;
		`;

		list.style.cssText = gridStyle;

		console.log('🖼️ Total avatar files found:', this.files.length);
		console.log('🖼️ Files:', this.files.map(f => f.path));
		console.log('🖼️ Is mobile:', isMobile);

		this.files.forEach((file) => {
			console.log('🖼️ Processing file:', file.path);
			const imgContainer = list.createDiv({ cls: 'avatar-item-container' });
			const img = imgContainer.createEl("img");
			img.src = this.app.vault.adapter.getResourcePath(file.path);
			img.addClass('avatar-item');
			console.log('🖼️ Image src set to:', img.src);

			// SIMPLE, VISIBLE AVATAR SIZING
			const imgStyle = isMobile ? `
				width: 100px !important;
				height: 100px !important;
				object-fit: cover !important;
				cursor: pointer !important;
				border-radius: 12px !important;
				border: 2px solid rgba(255, 215, 0, 0.4) !important;
				transition: all 0.2s ease !important;
				display: block !important;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
			` : `
				width: 120px;
				height: 120px;
				object-fit: cover;
				margin: 8px;
				cursor: pointer;
				border-radius: 12px;
				border: 3px solid rgba(255, 215, 0, 0.3);
				transition: all 0.2s ease;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
			`;

			img.style.cssText = imgStyle;

			// SIMPLE CONTAINER STYLING
			if (isMobile) {
				imgContainer.style.cssText = `
					display: flex !important;
					align-items: center !important;
					justify-content: center !important;
					padding: 12px !important;
					border-radius: 16px !important;
					transition: all 0.2s ease !important;
					background: linear-gradient(135deg, rgba(26, 26, 46, 0.6), rgba(22, 33, 62, 0.6)) !important;
					border: 2px solid rgba(255, 215, 0, 0.2) !important;
					min-height: 120px !important;
					width: 100% !important;
					box-sizing: border-box !important;
				`;
			}

			// Hover effects for both mobile and desktop
			img.addEventListener('mouseenter', () => {
				img.style.border = '2px solid var(--interactive-accent)';
				img.style.transform = 'scale(1.05)';
			});

			img.addEventListener('mouseleave', () => {
				img.style.border = isMobile ? '2px solid var(--background-modifier-border)' : '2px solid transparent';
				img.style.transform = 'scale(1)';
			});

			// Touch feedback for mobile
			if (isMobile) {
				img.addEventListener('touchstart', () => {
					img.style.border = '2px solid var(--interactive-accent)';
					img.style.transform = 'scale(0.95)';
				});

				img.addEventListener('touchend', () => {
					img.style.border = '2px solid var(--background-modifier-border)';
					img.style.transform = 'scale(1)';
				});
			}

			const clickHandler = (event: Event) => {
				event.preventDefault();
				event.stopPropagation();

				console.log('🎯 Avatar selected:', file.path);
				console.log('🎯 onSelect function:', typeof this.onSelect);
				console.log('🎯 Modal instance:', this);

				try {
					// Call the callback function
					const result = this.onSelect(file.path);
					console.log('✅ Avatar selection callback executed, result:', result);

					// Close the modal
					this.close();
					console.log('✅ Modal closed');

					// Force a UI update by dispatching a custom event
					document.dispatchEvent(new CustomEvent('avatar-changed', {
						detail: { avatarPath: file.path }
					}));
					console.log('✅ Avatar change event dispatched');

				} catch (error) {
					console.error('❌ Error in avatar selection:', error);
					console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
				}
			};

			// AGGRESSIVE MOBILE TOUCH HANDLING - DIRECT AND IMMEDIATE
			if (isMobile) {
				console.log('📱 Setting up mobile touch for:', file.path);

				// Method 1: Direct touchstart (most immediate)
				const mobileClickHandler = (event: Event) => {
					event.preventDefault();
					event.stopPropagation();
					console.log('📱📱📱 MOBILE TOUCH DETECTED:', file.path);

					// Stop all propagation immediately
					if ('stopImmediatePropagation' in event) {
						(event as Event & { stopImmediatePropagation(): void }).stopImmediatePropagation();
					}

					// Immediate visual feedback
					img.style.transform = 'scale(0.95)';
					img.style.border = '3px solid #FFD700';

					// Use setTimeout to ensure proper execution order
					setTimeout(async () => {
						try {
							console.log('📱 Calling onSelect directly...');
							await this.onSelect(file.path);
							console.log('📱 onSelect completed, now closing modal...');

							// Force close modal and prevent navigation
							this.close();

							// Prevent any further navigation
							if (window.history && typeof window.history.pushState === 'function') {
								window.history.replaceState(null, '', window.location.href);
							}

							console.log('📱 Modal closed and navigation prevented!');

						} catch (error) {
							console.error('📱 Error in mobile avatar selection:', error);
						}

						// Reset visual feedback
						img.style.transform = 'scale(1)';
						img.style.border = '2px solid rgba(255, 215, 0, 0.4)';
					}, 50);

					return false;
				};

				// Add ALL possible mobile events
				img.addEventListener('touchstart', mobileClickHandler, { passive: false });
				img.addEventListener('touchend', mobileClickHandler, { passive: false });
				imgContainer.addEventListener('touchstart', mobileClickHandler, { passive: false });
				imgContainer.addEventListener('touchend', mobileClickHandler, { passive: false });

				// Also add click as backup
				img.addEventListener('click', mobileClickHandler);
				imgContainer.addEventListener('click', mobileClickHandler);

				console.log('📱 Mobile touch handlers added for:', file.path);
			} else {
				// Desktop - use simple click handlers
				console.log('🖥️ Setting up desktop click handlers for:', file.path);
				img.addEventListener('click', clickHandler);
				imgContainer.addEventListener('click', clickHandler);
				console.log('🖥️ Desktop click handlers added for:', file.path);
			}
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}