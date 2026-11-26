import React from "react";
import { App } from "obsidian";
import InventoryModalContent from "./InventoryModalContent";
import { InventoryModalProvider } from "./InventoryModalContext";
import modalStyles from "./InventoryModal.module.css";

interface InventoryModalProps {
	app: App;
	onClose: () => void;
}

const InventoryModal: React.FC<InventoryModalProps> = ({ app, onClose }) => {
	return (
		<InventoryModalProvider app={app}>
			<div 
				className={modalStyles.inventoryModal}
				data-inventory-modal="true"
			>
				<InventoryModalContent onClose={onClose} />
			</div>
		</InventoryModalProvider>
	);
};

export default InventoryModal;
