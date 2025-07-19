import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
} from "react";
import {
	readInventory,
	InventoryItem,
	dropInventoryItem,
} from "../../utils/updateInventoryFile";
import type { App } from "obsidian";

export interface InventoryModalContextType {
	inventory: InventoryItem[];
	loading: boolean;
	refreshInventory: () => Promise<void>;
	dropItem: (itemName: string) => Promise<void>;
	app: App;
}

const InventoryModalContext = createContext<
	InventoryModalContextType | undefined
>(undefined);

export const InventoryModalProvider: React.FC<{
	app: App;
	children: React.ReactNode;
}> = ({ app, children }) => {
	const [inventory, setInventory] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(true);

	const refreshInventory = useCallback(async () => {
		setLoading(true);
		try {
			const inv = await readInventory(app.vault); // Pass app.vault instead of app
			setInventory(inv);
		} catch (e) {
			setInventory([]);
		} finally {
			setLoading(false);
		}
	}, [app]);

	const dropItem = async (itemName: string) => {
		setLoading(true);
		await dropInventoryItem(app, itemName);
		await refreshInventory();
		setLoading(false);
	};

	useEffect(() => {
		refreshInventory();
	}, [refreshInventory]);

	return (
		<InventoryModalContext.Provider
			value={{ inventory, refreshInventory, loading, dropItem, app }}
		>
			{children}
		</InventoryModalContext.Provider>
	);
};

export function useInventoryModalContext() {
	const ctx = useContext(InventoryModalContext);
	if (!ctx)
		throw new Error(
			"useInventoryModalContext must be used within InventoryModalProvider"
		);
	return ctx;
}
