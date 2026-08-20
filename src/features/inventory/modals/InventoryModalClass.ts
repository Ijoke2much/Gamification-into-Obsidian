import { Modal, App } from "obsidian";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import InventoryModal from "./InventoryModal";
import { isLikelyMobileDevice } from "../../../shared/utils/deviceDetect";
import { getAppliedVisualTheme } from "../../../shared/utils/visualThemeManager";

function isSystemHunterTheme(): boolean {
	try {
		const applied = getAppliedVisualTheme();
		if (applied.preset === "system-hunter" || applied.shell === "system") {
			return true;
		}
	} catch {
		/* ignore */
	}
	if (typeof document !== "undefined") {
		const htmlPreset = document.documentElement.getAttribute(
			"data-gamification-visual-theme"
		);
		const htmlShell = document.documentElement.getAttribute(
			"data-gamification-shell"
		);
		if (htmlPreset === "system-hunter" || htmlShell === "system") return true;
	}
	return false;
}

export class InventoryModalClass extends Modal {
	private root: Root | null = null;
	private isDragging = false;
	private currentX = 0;
	private currentY = 0;
	private initialX = 0;
	private initialY = 0;
	private xOffset = 0;
	private yOffset = 0;
	private closeWatcher: MutationObserver | null = null;

	// Store bound functions for proper cleanup
	private boundDragMove: (e: MouseEvent) => void;
	private boundDragEnd: () => void;
	private boundDragStart: (e: MouseEvent) => void;
	private closeStyleEl: HTMLStyleElement | null = null;

	constructor(app: App) {
		super(app);
		// Bind functions once to maintain references for cleanup
		this.boundDragMove = this.dragMove.bind(this);
		this.boundDragEnd = this.dragEnd.bind(this);
		this.boundDragStart = this.dragStart.bind(this);
	}

	/** Document-level CSS so Obsidian's frame X cannot win over module CSS. */
	private ensureCloseKillStyle() {
		if (this.closeStyleEl?.isConnected) return;
		const style = document.createElement("style");
		style.setAttribute("data-gamify-inventory-close-kill", "true");
		style.textContent = `
.modal.gamify-inventory-modal > .modal-close-button,
.modal.gamify-inventory-modal .modal-close-button,
.modal.gamify-inventory-modal .modal-close-btn,
.gamify-inventory-modal-host > .modal-close-button,
.gamify-inventory-modal-host .modal-close-button,
.gamify-inventory-modal-host .modal-close-btn,
.modal-container:has(.gamify-inventory-modal) > .modal-close-button,
.modal-container:has(.gamify-inventory-modal) .modal-close-button {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  clip: rect(0, 0, 0, 0) !important;
}
`;
		document.head.appendChild(style);
		this.closeStyleEl = style;
	}

	/**
	 * Hide Obsidian's native frame X. Do not remove() it — the Modal class
	 * holds closeButtonEl and will re-insert a deleted node, which is why
	 * the tiny corner X kept coming back.
	 */
	private hideNativeCloseButtons() {
		this.containerEl?.classList.add("gamify-inventory-modal-host");
		this.modalEl?.classList.add("gamify-inventory-modal");

		const hide = (el: Element | null | undefined) => {
			if (!el) return;
			const html = el as HTMLElement;
			// Never touch the plugin's own header close.
			if (html.closest("[data-inventory-modal]")) return;
			html.style.setProperty("display", "none", "important");
			html.style.setProperty("visibility", "hidden", "important");
			html.style.setProperty("opacity", "0", "important");
			html.style.setProperty("pointer-events", "none", "important");
			html.setAttribute("aria-hidden", "true");
			html.setAttribute("tabindex", "-1");
		};

		const CLOSE_SELECTORS =
			".modal-close-button, .modal-close-btn, .clickable-icon.modal-close-button";

		hide((this as unknown as { closeButtonEl?: HTMLElement }).closeButtonEl);
		this.modalEl?.querySelectorAll(CLOSE_SELECTORS).forEach(hide);
		this.containerEl?.querySelectorAll(CLOSE_SELECTORS).forEach(hide);
	}

	private setupDragFunctionality() {
		// Wait for modal to be created, then add drag functionality
		setTimeout(() => {
			const modal = this.modalEl;
			if (!modal) return;

			// Ensure Obsidian's native title exists and reads "Inventory"
			let titleBar = modal.querySelector(".modal-title") as HTMLElement;
			if (!titleBar) {
				titleBar = document.createElement("div");
				titleBar.className = "modal-title";
				modal.insertBefore(titleBar, modal.firstChild);
			}
			titleBar.textContent = "Inventory";
			titleBar.style.cursor = "move";
			titleBar.style.userSelect = "none";

			// Add drag event listeners (bind once to avoid duplicate listeners)
			titleBar.removeEventListener("mousedown", this.boundDragStart);
			titleBar.addEventListener("mousedown", this.boundDragStart);
			document.addEventListener("mousemove", this.boundDragMove);
			document.addEventListener("mouseup", this.boundDragEnd);

			// Prevent text selection during drag
			titleBar.addEventListener("selectstart", (e) => e.preventDefault());

			this.hideNativeCloseButtons();
		}, 100);
	}

	private dragStart(e: MouseEvent) {
		this.initialX = e.clientX - this.xOffset;
		this.initialY = e.clientY - this.yOffset;

		if (e.target === e.currentTarget) {
			this.isDragging = true;
			const modal = this.modalEl;
			if (modal) {
				modal.style.cursor = "grabbing";
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
			modal.style.cursor = "";
		}
	}

	onOpen() {
		// Add title to modal
		this.titleEl.setText("Inventory");

		// Mark this modal for targeted CSS without using :has()
		this.modalEl.classList.add("gamify-inventory-modal");
		this.containerEl.classList.add("gamify-inventory-modal-host");
		this.modalEl.parentElement?.classList.add("gamify-inventory-modal-host");
		this.ensureCloseKillStyle();
		const onMobile = isLikelyMobileDevice();
		const systemTheme = isSystemHunterTheme();

		if (onMobile) {
			// Solo Leveling / System Hunter chrome — never attach --pixel on phone
			this.modalEl.classList.add(
				"gamify-inventory-modal--mobile",
				"gamify-inventory-modal--system"
			);
			this.modalEl.setAttribute("data-gamification-mobile", "true");
		} else if (systemTheme) {
			// Desktop Solo Leveling: same system shell as mobile (not pixel RPG)
			this.modalEl.classList.add("gamify-inventory-modal--system");
			this.modalEl.classList.remove("gamify-inventory-modal--pixel");
		} else {
			this.modalEl.classList.add("gamify-inventory-modal--pixel");
			this.modalEl.classList.remove("gamify-inventory-modal--system");
		}

		if (systemTheme || onMobile) {
			this.modalEl.setAttribute("data-inventory-system", "true");
		} else {
			this.modalEl.removeAttribute("data-inventory-system");
		}

		this.root = createRoot(this.contentEl);
		this.root.render(
			React.createElement(InventoryModal, {
				app: this.app,
				onClose: () => this.close(),
			})
		);

		// Always hide native / legacy close buttons — React owns the one X
		this.hideNativeCloseButtons();
		window.setTimeout(() => this.hideNativeCloseButtons(), 0);
		window.setTimeout(() => this.hideNativeCloseButtons(), 120);

		// Re-hide if Obsidian re-inserts the native X. Hiding (not removing)
		// avoids a remove/restore loop that used to disable this observer.
		this.closeWatcher?.disconnect();
		this.closeWatcher = new MutationObserver(() => this.hideNativeCloseButtons());
		// Direct children only — native X is a frame sibling of .modal / .modal-content,
		// not inside the React tree. Observing subtree would refire on every inventory render.
		this.closeWatcher.observe(this.modalEl, { childList: true });
		this.closeWatcher.observe(this.containerEl, { childList: true });

		// Drag chrome is desktop-only (conflicts with touch scroll on phone)
		if (!onMobile) {
			this.setupDragFunctionality();
		}
	}

	onClose() {
		this.closeWatcher?.disconnect();
		this.closeWatcher = null;
		this.closeStyleEl?.remove();
		this.closeStyleEl = null;

		// Remove marker class
		this.modalEl.classList.remove(
			"gamify-inventory-modal",
			"gamify-inventory-modal--pixel",
			"gamify-inventory-modal--mobile",
			"gamify-inventory-modal--system"
		);
		this.containerEl.classList.remove("gamify-inventory-modal-host");
		this.modalEl.parentElement?.classList.remove("gamify-inventory-modal-host");
		this.modalEl.removeAttribute("data-gamification-mobile");
		this.modalEl.removeAttribute("data-inventory-system");
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
		this.contentEl.empty();

		// Clean up drag event listeners with proper function references
		document.removeEventListener("mousemove", this.boundDragMove);
		document.removeEventListener("mouseup", this.boundDragEnd);
		const modal = this.modalEl;
		const titleBar = modal?.querySelector(".modal-title") as HTMLElement | null;
		if (titleBar) titleBar.removeEventListener("mousedown", this.boundDragStart);
		modal?.querySelectorAll(".gamify-close-btn").forEach((el) => el.remove());
	}
}
