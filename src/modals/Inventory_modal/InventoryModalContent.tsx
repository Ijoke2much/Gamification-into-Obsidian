import React from "react";
import { useInventoryModalContext } from "./InventoryModalContext";
import type { InventoryItem } from "../../utils/updateInventoryFile";

// Tag color mapping
const tagColors: Record<string, string> = {
	rare: "#a259f7",
	common: "#888",
	epic: "#4ec9b0",
	legendary: "#f7b32b",
	consumable: "#3fa34d",
	misc: "#5c5470",
	magic: "#2d9cdb",
	test: "#e94f37",
	// Add more as needed
};

const InventoryModalContent: React.FC = () => {
	const { inventory, loading, selectedItem, setSelectedItem, dropItem } =
		useInventoryModalContext();

	if (loading) return <div>Loading inventory...</div>;
	if (!inventory || inventory.length === 0)
		return <div>No items in inventory.</div>;

	const selected: InventoryItem | undefined = inventory.find(
		(item: InventoryItem) => item.name === selectedItem
	);

	return (
		<div className="inventory-modal-content">
			<div className="inventory-grid">
				{inventory.map((item: InventoryItem) => (
					<div
						key={item.name}
						className={`inventory-slot${
							selectedItem === item.name ? " selected" : ""
						}`}
						onClick={() => setSelectedItem(item.name)}
					>
						<span
							className="item-icon"
							role="img"
							aria-label={item.name}
						>
							{item.icon || "❓"}
						</span>
						<span className="item-quantity">
							{item.quantity ?? 1}
						</span>
					</div>
				))}
			</div>
			{selected && (
				<div className="item-details-panel">
					<h3>
						{selected.icon || "❓"} {selected.name}
					</h3>
					<div style={{ marginBottom: 8 }}>
						{selected.tags &&
							selected.tags.map((tag: string) => (
								<span
									key={tag}
									className="item-tag-badge"
									style={{
										backgroundColor:
											tagColors[tag.toLowerCase()] ||
											"#444",
										color: "#fff",
										borderRadius: 6,
										padding: "2px 8px",
										marginRight: 6,
										fontSize: "0.8em",
									}}
								>
									#{tag}
								</span>
							))}
					</div>
					{selected.description && <p>{selected.description}</p>}
					<p>Quantity: {selected.quantity ?? 1}</p>
					<button
						style={{
							marginTop: 12,
							background: "#e94f37",
							color: "#fff",
							border: "none",
							borderRadius: 6,
							padding: "6px 16px",
							cursor: "pointer",
						}}
						onClick={async () => {
							await dropItem(selected.name);
							setSelectedItem(null);
						}}
					>
						Drop
					</button>
					<button
						style={{
							marginLeft: 12,
							background: "#444",
							color: "#fff",
							border: "none",
							borderRadius: 6,
							padding: "6px 16px",
							cursor: "pointer",
						}}
						onClick={() => setSelectedItem(null)}
					>
						Close
					</button>
				</div>
			)}
		</div>
	);
};

export default InventoryModalContent;
