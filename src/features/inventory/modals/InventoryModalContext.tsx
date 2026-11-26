import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
	useCallback,
} from "react";
import { App } from "obsidian";
import {
	InventoryItem,
	dropItem,
	readInventory,
} from "../../../features/inventory/utils/updateInventoryFile";
import { InventoryOperations } from "../utils/inventoryOperations";
import { EnhancedInventoryItem } from "../types/EnhancedInventoryTypes";

interface InventoryModalContextProps {
	app: App;
	inventory: InventoryItem[];
	loading: boolean;
	reloadInventory: () => Promise<void>;
	selectedItem: string | null;
	setSelectedItem: (item: string | null) => void;
	dropItem: (itemName: string) => Promise<void>;
}

const InventoryModalContext = createContext<
	InventoryModalContextProps | undefined
>(undefined);

export const InventoryModalProvider: React.FC<{
	app: App;
	children: ReactNode;
}> = ({ app, children }) => {
	const [inventory, setInventory] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [selectedItem, setSelectedItem] = useState<string | null>(null);

	const reloadInventory = useCallback(async () => {
		setLoading(true);
		try {
			// Use the regular inventory system which already uses enhanced parser
			const items = await readInventory(app.vault);
			setInventory(items);
		} catch (error) {
			console.error('Failed to load inventory:', error);
			// If there's an error, at least show an empty array
			setInventory([]);
		}
		setLoading(false);
	}, [app]);

	useEffect(() => {
		reloadInventory();
		
		// Listen for inventory updates from other parts of the system
		const handleInventoryUpdate = () => {
			console.log('🎒 [Inventory] Received inventory-updated event, reloading...');
			reloadInventory();
		};
		
		window.addEventListener('inventory-updated', handleInventoryUpdate);
		
		return () => {
			window.removeEventListener('inventory-updated', handleInventoryUpdate);
		};
	}, [reloadInventory]);

	const handleDropItem = useCallback(
		async (itemName: string) => {
			await dropItem(app, itemName);
			await reloadInventory();
		},
		[app, reloadInventory]
	);

	return (
		<InventoryModalContext.Provider
			value={{
				app,
				inventory,
				loading,
				reloadInventory,
				selectedItem,
				setSelectedItem,
				dropItem: handleDropItem,
			}}
		>
			{children}
		</InventoryModalContext.Provider>
	);
};

export function useInventoryModalContext() {
	const context = useContext(InventoryModalContext);
	if (!context) {
		throw new Error(
			"useInventoryModalContext must be used within InventoryModalProvider"
		);
	}
	return context;
}
