import { App, Modal } from 'obsidian';
import styles from "./CustomInputModal.module.css";
import { pixelNotice } from '../../../shared/utils/noticeUtils';

export class CustomInputModal extends Modal {
    onSubmit: (seconds: number) => void;
    private minutes = "";
    private seconds = "";

    constructor(app: App, onSubmit: (seconds: number) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl, modalEl } = this;

        // Style the modal
        if (modalEl) {
            modalEl.style.zIndex = "10001";
        }

        // Create wrapper
        const wrapper = contentEl.createDiv({ cls: styles.modalWrapper });

        // Header with icon
        const header = wrapper.createEl("div", { cls: styles.modalHeader });
        header.innerHTML = '<span class="header-icon">⚙️</span> Custom Timer Duration';

        // Quick presets section
        const presetsSection = wrapper.createDiv({ cls: styles.presetsSection });
        presetsSection.createEl("h3", { text: "Quick Presets", cls: styles.sectionTitle });

        const presetsGrid = presetsSection.createDiv({ cls: styles.presetsGrid });
        const quickPresets = [
            { label: "30 min", value: 30 },
            { label: "60 min", value: 60 },
            { label: "90 min", value: 90 },
            { label: "2 hours", value: 120 }
        ];

        quickPresets.forEach(preset => {
            const presetBtn = presetsGrid.createEl("button", {
                text: preset.label,
                cls: styles.quickPresetBtn
            });
            presetBtn.onclick = () => {
                this.onSubmit(preset.value * 60);
                this.close();
            };
        });

        // Custom input section
        const inputSection = wrapper.createDiv({ cls: styles.inputSection });
        inputSection.createEl("h3", { text: "Custom Duration", cls: styles.sectionTitle });

        // Minutes input
        const minRow = inputSection.createDiv({ cls: styles.inputRow });
        minRow.createEl("label", { text: "Minutes:", cls: styles.inputLabel });
        const minInput = minRow.createEl("input", {
            type: "number",
            placeholder: "25",
            cls: styles.timeInput,
            attr: { min: "0", max: "999" }
        });
        minInput.oninput = (e) => {
            this.minutes = (e.target as HTMLInputElement).value;
        };

        // Seconds input
        const secRow = inputSection.createDiv({ cls: styles.inputRow });
        secRow.createEl("label", { text: "Seconds:", cls: styles.inputLabel });
        const secInput = secRow.createEl("input", {
            type: "number",
            placeholder: "00",
            cls: styles.timeInput,
            attr: { min: "0", max: "59" }
        });
        secInput.oninput = (e) => {
            this.seconds = (e.target as HTMLInputElement).value;
        };

        // Auto-focus on minutes input
        setTimeout(() => minInput.focus(), 100);

        // Handle Enter key
        const handleEnter = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };
        minInput.addEventListener('keydown', handleEnter);
        secInput.addEventListener('keydown', handleEnter);

        // Action buttons
        const buttonRow = wrapper.createDiv({ cls: styles.buttonRow });

        const cancelBtn = buttonRow.createEl("button", {
            text: "Cancel",
            cls: styles.cancelBtn
        });
        cancelBtn.onclick = () => this.close();

        const submitBtn = buttonRow.createEl("button", {
            text: "Start Timer",
            cls: styles.submitBtn
        });

        const handleSubmit = () => {
            const min = parseInt(this.minutes) || 0;
            const sec = parseInt(this.seconds) || 0;
            const totalSeconds = min * 60 + sec;

            if (totalSeconds <= 0) {
                pixelNotice("Please enter a valid duration greater than 0");
                return;
            }

            if (totalSeconds > 24 * 60 * 60) { // 24 hours
                pixelNotice("Duration cannot exceed 24 hours");
                return;
            }

            this.onSubmit(totalSeconds);
            this.close();
        };

        submitBtn.onclick = handleSubmit;

        // Cleanup
        this.scope.register([], 'Enter', handleSubmit);
    }

    onClose() {
        this.contentEl.empty();
    }
}
