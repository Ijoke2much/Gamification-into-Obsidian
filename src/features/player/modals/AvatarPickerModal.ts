// Modal for changing avatar
import { Modal, Platform, TFile, App } from "obsidian";

export class AvatarPickerModal extends Modal {
	files: TFile[];
	onSelect: (path: string) => void;
	private closeWatcher: MutationObserver | null = null;
	private closeStyleEl: HTMLStyleElement | null = null;
	private mobileFrameTimers: number[] = [];

	constructor(app: App, files: TFile[], onSelect: (path: string) => void) {
		super(app);
		this.files = files;
		this.onSelect = onSelect;
	}

	/** Hide Obsidian's frame X. Removing it makes Modal re-insert the node. */
	private hideNativeCloseButtons() {
		this.containerEl?.classList.add("gamify-avatar-picker-host");
		this.modalEl?.classList.add("gamify-avatar-picker-modal");

		const hide = (el: Element | null | undefined) => {
			if (!el) return;
			const html = el as HTMLElement;
			if (html.closest(".avatar-picker-header-container")) return;
			html.style.setProperty("display", "none", "important");
			html.style.setProperty("visibility", "hidden", "important");
			html.style.setProperty("opacity", "0", "important");
			html.style.setProperty("pointer-events", "none", "important");
			html.setAttribute("aria-hidden", "true");
			html.setAttribute("tabindex", "-1");
		};

		const CLOSE_SELECTORS = [
			".modal-close-button",
			".modal-close-btn",
			".modal-header-button",
			".clickable-icon.modal-header-button",
			'[aria-label="Close"]',
			'[aria-label="close"]',
		].join(", ");

		hide((this as unknown as { closeButtonEl?: HTMLElement }).closeButtonEl);
		const roots = [this.modalEl, this.containerEl, this.modalEl?.parentElement];
		for (const root of roots) {
			root?.querySelectorAll(CLOSE_SELECTORS).forEach(hide);
		}

		// Phone draws an empty title row beside our header. Desktop keeps Obsidian's title node.
		if (Platform.isMobile && this.modalEl) {
			for (const child of Array.from(this.modalEl.children)) {
				if (child === this.contentEl || child.classList.contains("modal-content")) continue;
				hide(child);
			}
		}
	}

	/** Phone layout runs after onOpen and can put the dialog back to dialog-width. */
	private applyMobileFrame() {
		const container =
			(this.contentEl.closest(".modal-container") as HTMLElement | null) ??
			(this.containerEl as HTMLElement);
		const modal =
			(this.contentEl.closest(".modal") as HTMLElement | null) ??
			(this.modalEl as HTMLElement);
		const bg =
			(this as unknown as { bgEl?: HTMLElement }).bgEl ??
			(container.querySelector(".modal-bg") as HTMLElement | null);

		const lock = (el: HTMLElement | null | undefined, props: Record<string, string>) => {
			if (!el) return;
			for (const [key, value] of Object.entries(props)) {
				el.style.setProperty(key, value, "important");
			}
		};

		lock(container, {
			position: "fixed",
			inset: "0",
			top: "0",
			left: "0",
			right: "0",
			bottom: "0",
			width: "100vw",
			height: "100dvh",
			"max-width": "none",
			"max-height": "none",
			"min-width": "100vw",
			margin: "0",
			padding: "0",
			transform: "none",
			display: "flex",
			"flex-direction": "column",
			"align-items": "stretch",
			"justify-content": "flex-start",
			"box-sizing": "border-box",
			background: "rgba(0, 0, 0, 0.72)",
			"z-index": "15000",
		});

		lock(bg, {
			position: "fixed",
			inset: "0",
			width: "100vw",
			height: "100dvh",
			"max-width": "none",
			transform: "none",
		});

		lock(modal, {
			position: "relative",
			inset: "auto",
			top: "auto",
			left: "0",
			right: "0",
			bottom: "auto",
			transform: "none",
			width: "100vw",
			"min-width": "100vw",
			"max-width": "100vw",
			height: "100dvh",
			"max-height": "100dvh",
			"min-height": "0",
			margin: "0",
			padding: "0",
			"align-self": "stretch",
			flex: "1 1 auto",
			"border-radius": "0",
			display: "flex",
			"flex-direction": "column",
			overflow: "hidden",
			"box-sizing": "border-box",
			background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
			border: "none",
			"box-shadow": "none",
		});

		lock(this.contentEl, {
			flex: "1 1 auto",
			"min-height": "0",
			height: "auto",
			width: "100%",
			"max-width": "none",
			margin: "0",
			padding:
				"max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px))",
			display: "flex",
			"flex-direction": "column",
			overflow: "hidden",
			"box-sizing": "border-box",
			background: "transparent",
		});
	}

	private scheduleMobileFrame() {
		this.applyMobileFrame();
		this.hideNativeCloseButtons();
		for (const delay of [0, 50, 200, 400]) {
			const id = window.setTimeout(() => {
				this.applyMobileFrame();
				this.hideNativeCloseButtons();
			}, delay);
			this.mobileFrameTimers.push(id);
		}
	}

	private ensureCloseKillStyle() {
		if (this.closeStyleEl) return;
		const style = document.createElement("style");
		style.setAttribute("data-gamify-avatar-close-kill", "true");
		style.textContent = `
.modal.gamify-avatar-picker-modal > .modal-close-button,
.modal.gamify-avatar-picker-modal .modal-close-button,
.modal.gamify-avatar-picker-modal > .modal-header-button,
.modal.gamify-avatar-picker-modal .modal-header-button,
.gamify-avatar-picker-host > .modal-close-button,
.gamify-avatar-picker-host .modal-close-button,
.gamify-avatar-picker-host > .modal-header-button,
.gamify-avatar-picker-host .modal-header-button,
.modal-container:has(.gamify-avatar-picker-modal) > .modal-close-button,
.modal-container:has(.gamify-avatar-picker-modal) .modal-close-button,
.modal-container:has(.gamify-avatar-picker-modal) > .modal-header-button,
.modal-container:has(.gamify-avatar-picker-modal) .modal-header-button,
.modal.gamify-avatar-picker-modal.is-avatar-picker-phone > .modal-title,
.modal.gamify-avatar-picker-modal > .modal-close-button::before {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  clip: rect(0, 0, 0, 0) !important;
  content: none !important;
}
`;
		document.head.appendChild(style);
		this.closeStyleEl = style;
	}

	onOpen() {
		const { contentEl } = this;

		this.modalEl.classList.add("gamify-avatar-picker-modal");
		this.containerEl.classList.add("gamify-avatar-picker-host");
		this.modalEl.parentElement?.classList.add("gamify-avatar-picker-host");
		this.ensureCloseKillStyle();
		this.hideNativeCloseButtons();
		window.setTimeout(() => this.hideNativeCloseButtons(), 0);
		window.setTimeout(() => this.hideNativeCloseButtons(), 120);
		this.closeWatcher?.disconnect();
		this.closeWatcher = new MutationObserver(() => this.hideNativeCloseButtons());
		this.closeWatcher.observe(this.modalEl, { childList: true, subtree: true });
		this.closeWatcher.observe(this.containerEl, { childList: true, subtree: true });

		// Ensure this modal appears above other modals (Quest modal has z-index 10000)
		(this.containerEl as HTMLElement).style.zIndex = "15000";

		// Obsidian's own mobile flag. Width and ontouchstart also match desktop trackpads.
		const isMobile = Platform.isMobile;

		if (isMobile) {
			this.modalEl.classList.add("is-avatar-picker-phone");
			const container = this.containerEl as HTMLElement;
			const modal = this.modalEl as HTMLElement;

			container.style.cssText = `
				position: fixed !important;
				top: 0 !important;
				left: 0 !important;
				right: 0 !important;
				bottom: 0 !important;
				width: 100% !important;
				height: 100dvh !important;
				z-index: 15000 !important;
				background: rgba(0, 0, 0, 0.9) !important;
				display: flex !important;
				flex-direction: column !important;
				align-items: stretch !important;
				justify-content: stretch !important;
				padding-top: max(12px, env(safe-area-inset-top, 0px)) !important;
				padding-right: max(12px, env(safe-area-inset-right, 0px)) !important;
				padding-bottom: max(12px, env(safe-area-inset-bottom, 0px)) !important;
				padding-left: max(12px, env(safe-area-inset-left, 0px)) !important;
				box-sizing: border-box !important;
			`;

			modal.style.cssText = `
				position: relative !important;
				left: auto !important;
				top: auto !important;
				right: auto !important;
				bottom: auto !important;
				transform: none !important;
				width: 100% !important;
				height: auto !important;
				max-width: none !important;
				max-height: none !important;
				flex: 1 1 auto !important;
				min-height: 0 !important;
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
			flex-shrink: 0;
			box-sizing: border-box;
			padding: ${isMobile ? '14px 72px' : '16px'};
			border-bottom: ${isMobile ? '2px solid rgba(255, 215, 0, 0.4)' : '1px solid var(--background-modifier-border)'};
			background: ${isMobile ? 'linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95))' : 'var(--background-primary)'};
		`;

		const header = headerContainer.createEl("h2", { text: "Choose an Avatar" });
		header.addClass('avatar-picker-header');

		// Simple styling that works with Obsidian's native behavior
		header.style.cssText = `
			color: ${isMobile ? 'white' : 'var(--text-normal)'};
			margin: 0;
			font-size: ${isMobile ? '18px' : '20px'};
			font-weight: 600;
			text-align: center;
			line-height: 1.3;
			${isMobile ? 'max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' : ''}
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
		contentEl.style.cssText = isMobile ? `
			background: transparent;
			padding: 0;
			margin: 0;
			display: flex;
			flex-direction: column;
			flex: 1 1 auto;
			min-height: 0;
			height: auto;
			overflow: hidden;
			box-sizing: border-box;
		` : `
			background: var(--background-primary);
			padding: 0;
			display: flex;
			flex-direction: column;
			height: auto;
			overflow: hidden;
		`;

		const list = contentEl.createDiv({ cls: "avatar-list" });
		list.addClass('avatar-grid');

		// SIMPLE GRID THAT SHOWS ALL AVATARS WITH PROPER SCROLLING
		const gridStyle = isMobile ? `
			display: grid !important;
			grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
			gap: 12px !important;
			padding: 16px !important;
			flex: 1 1 auto !important;
			align-content: start !important;
			overflow-y: auto !important;
			-webkit-overflow-scrolling: touch !important;
			min-height: 0 !important;
			box-sizing: border-box !important;
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
				width: min(140px, 100%) !important;
				height: auto !important;
				aspect-ratio: 1 !important;
				object-fit: cover !important;
				cursor: pointer !important;
				border-radius: 12px !important;
				border: 2px solid rgba(255, 215, 0, 0.4) !important;
				transition: transform 0.2s ease !important;
				display: block !important;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
				pointer-events: none !important;
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
					background: linear-gradient(135deg, rgba(26, 26, 46, 0.6), rgba(22, 33, 62, 0.6)) !important;
					border: 2px solid rgba(255, 215, 0, 0.2) !important;
					min-height: 0 !important;
					width: 100% !important;
					box-sizing: border-box !important;
					cursor: pointer !important;
					touch-action: manipulation !important;
				`;
				imgContainer.setAttribute('role', 'button');
			}

			if (!isMobile) {
				img.addEventListener('mouseenter', () => {
					img.style.border = '2px solid var(--interactive-accent)';
					img.style.transform = 'scale(1.05)';
				});

				img.addEventListener('mouseleave', () => {
					img.style.border = '2px solid transparent';
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

			imgContainer.addEventListener('click', clickHandler);
			if (!isMobile) {
				img.addEventListener('click', clickHandler);
			}
		});

		if (this.files.length === 0) {
			const empty = list.createEl('p', {
				text: 'No avatar images in the avatar folder.',
			});
			empty.style.cssText = isMobile
				? 'grid-column: 1 / -1; margin: 24px 8px; color: #fff; text-align: center; font-size: 15px;'
				: 'grid-column: 1 / -1; margin: 24px 8px; text-align: center;';
		}

		if (isMobile) this.scheduleMobileFrame();
	}

	onClose() {
		for (const id of this.mobileFrameTimers) window.clearTimeout(id);
		this.mobileFrameTimers = [];
		this.closeWatcher?.disconnect();
		this.closeWatcher = null;
		this.closeStyleEl?.remove();
		this.closeStyleEl = null;
		this.modalEl.classList.remove("gamify-avatar-picker-modal");
		this.containerEl.classList.remove("gamify-avatar-picker-host");
		this.modalEl.parentElement?.classList.remove("gamify-avatar-picker-host");
		this.contentEl.empty();
	}
}