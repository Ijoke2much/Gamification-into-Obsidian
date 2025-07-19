import React from "react";
import { App } from "obsidian";
import InventoryModalContent from "./InventoryModalContent";
import { InventoryModalProvider } from "./InventoryModalContext";

interface InventoryModalProps {
	app: App;
	onClose: () => void;
}

const InventoryModal: React.FC<InventoryModalProps> = ({ app, onClose }) => {
	return (
		<InventoryModalProvider app={app}>
			<div className="inventory-modal">
				<button className="close-btn" onClick={onClose}>
					×
				</button>
				<div className="inventory-modal-header">Inventory</div>
				<InventoryModalContent />
			</div>
		</InventoryModalProvider>
	);
};

export default InventoryModal;
