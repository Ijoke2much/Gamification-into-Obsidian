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
} from "../../utils/updateInventoryFile";

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
		const items = await readInventory(app.vault);
		setInventory(items);
		setLoading(false);
	}, [app]);

	useEffect(() => {
		reloadInventory();
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
