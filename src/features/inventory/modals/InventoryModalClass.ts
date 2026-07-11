import { Modal, App } from "obsidian";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import InventoryModal from "./InventoryModal";

export class InventoryModalClass extends Modal {
	private root: Root | null = null;
	private isDragging = false;
	private currentX = 0;
	private currentY = 0;
	private initialX = 0;
	private initialY = 0;
	private xOffset = 0;
	private yOffset = 0;

	// Store bound functions for proper cleanup
	private boundDragMove: (e: MouseEvent) => void;
	private boundDragEnd: () => void;
	private boundDragStart: (e: MouseEvent) => void;

	constructor(app: App) {
		super(app);
		// Bind functions once to maintain references for cleanup
		this.boundDragMove = this.dragMove.bind(this);
		this.boundDragEnd = this.dragEnd.bind(this);
		this.boundDragStart = this.dragStart.bind(this);
	}

	private setupDragFunctionality() {
		// Wait for modal to be created, then add drag functionality
		setTimeout(() => {
			const modal = this.modalEl;
			if (!modal) return;

			// Ensure Obsidian's native title exists and reads "Inventory"
			let titleBar = modal.querySelector('.modal-title') as HTMLElement;
			if (!titleBar) {
				titleBar = document.createElement('div');
				titleBar.className = 'modal-title';
				modal.insertBefore(titleBar, modal.firstChild);
			}
			titleBar.textContent = 'Inventory';
			titleBar.style.cursor = 'move';
			titleBar.style.userSelect = 'none';

			// Add drag event listeners (bind once to avoid duplicate listeners)
			titleBar.removeEventListener('mousedown', this.boundDragStart);
			titleBar.addEventListener('mousedown', this.boundDragStart);
			document.addEventListener('mousemove', this.boundDragMove);
			document.addEventListener('mouseup', this.boundDragEnd);

			// Prevent text selection during drag
			titleBar.addEventListener('selectstart', (e) => e.preventDefault());

			// Move our custom circular close button into the title bar and hide the default X
			const defaultClose = modal.querySelector('.modal-close-button') as HTMLElement | null;
			if (defaultClose) {
				// Hide the default X
				defaultClose.style.display = 'none';
			}

			// If a custom close button already exists, reuse it; else create one
			let customClose = modal.querySelector('.gamify-close-btn') as HTMLButtonElement | null;
			if (!customClose) {
				customClose = document.createElement('button');
				customClose.className = 'gamify-close-btn';
				customClose.setAttribute('aria-label', 'Close');
				customClose.textContent = '✕';
				customClose.style.cssText = `
          position: absolute;
          top: 8px; right: 10px;
          width: 32px; height: 32px;
          border-radius: 0;
          background: #252742;
          border: 2px solid #0f1120;
          box-shadow: 2px 2px 0 #0f1120;
          color: #ecefff; font-weight: bold; font-size: 10px;
          font-family: "Press Start 2P","VT323",monospace;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 1001;
        `;
				customClose.addEventListener('click', () => this.close());
				titleBar.appendChild(customClose);
			}
		}, 100);
	}

	private dragStart(e: MouseEvent) {
		this.initialX = e.clientX - this.xOffset;
		this.initialY = e.clientY - this.yOffset;

		if (e.target === e.currentTarget) {
			this.isDragging = true;
			const modal = this.modalEl;
			if (modal) {
				modal.style.cursor = 'grabbing';
			}
		}
	}

	private dragMove(e: MouseEvent) {
		if (this.isDragging) {
			e.preventDefault();

			this.currentX = e.clientX - this.initialX;
			this.currentY = e.clientY - this.initialY;

			this.xOffset = this.currentX;
			this.yOffset = this.currentY;

			const modal = this.modalEl;
			if (modal) {
				modal.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
			}
		}
	}

	private dragEnd() {
		this.initialX = this.currentX;
		this.initialY = this.currentY;
		this.isDragging = false;

		const modal = this.modalEl;
		if (modal) {
			modal.style.cursor = '';
		}
	}

	onOpen() {
		// Add title to modal
		this.titleEl.setText("Inventory");

		// Mark this modal for targeted CSS without using :has()
		this.modalEl.classList.add("gamify-inventory-modal", "gamify-inventory-modal--pixel");

		this.root = createRoot(this.contentEl);
		this.root.render(
			React.createElement(InventoryModal, { app: this.app, onClose: () => this.close() })
		);

		// Setup drag functionality after render
		this.setupDragFunctionality();
	}

	onClose() {
		// Remove marker class
		this.modalEl.classList.remove("gamify-inventory-modal", "gamify-inventory-modal--pixel");
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
		this.contentEl.empty();

		// Clean up drag event listeners with proper function references
		document.removeEventListener('mousemove', this.boundDragMove);
		document.removeEventListener('mouseup', this.boundDragEnd);
		const modal = this.modalEl;
		const titleBar = modal?.querySelector('.modal-title') as HTMLElement | null;
		if (titleBar) titleBar.removeEventListener('mousedown', this.boundDragStart);
		const customClose = modal?.querySelector('.gamify-close-btn') as HTMLElement | null;
		if (customClose) customClose.remove();
		const defaultClose = modal?.querySelector('.modal-close-button') as HTMLElement | null;
		if (defaultClose) defaultClose.style.display = '';
	}
}
