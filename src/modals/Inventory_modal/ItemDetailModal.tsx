import React from "react";
import { useInventoryModalContext } from "./InventoryModalContext";

const ItemDetailModal: React.FC = () => {
	const { selectedItem, setSelectedItem } = useInventoryModalContext();

	if (!selectedItem) return null;

	return (
		<div className="item-detail-modal">
			<button onClick={() => setSelectedItem(null)}>Close</button>
			<h3>Item Details</h3>
			<div>Details for: {selectedItem}</div>
			{/* Add more item details here */}
		</div>
	);
};

export default ItemDetailModal;
