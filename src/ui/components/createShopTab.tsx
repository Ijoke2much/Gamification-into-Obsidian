// src/ui/components/ShopTab.tsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import type GamifiedObsidianPlugin from "src/main";
import {
	ShopItem,
	ShopItemEffect,
	getAllShopItems,
	writeShopItems,
} from "src/utils/ShopParser";
import { AddItemModal } from "@/modals/Avatar_modal/AddItemModal";
import { Notice, TFile } from "obsidian";
import { addOrIncrementInventoryItem } from "../../utils/updateInventoryFile";
import { readPlayerData, writePlayerData } from "../../utils/playerDataUtils";

interface Props {
	plugin: GamifiedObsidianPlugin;
	rebuildShopTab: () => void; // callback to refresh parent
}

// Typewriter effect hook
function useTypewriter(text: string, speed = 30) {
	const [displayed, setDisplayed] = useState("");
	const [isAnimating, setIsAnimating] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		setDisplayed("");
		setIsAnimating(true);
		let i = 0;
		function type() {
			if (i < text.length) {
				setDisplayed((prev) => prev + text[i]);
				i++;
				timeoutRef.current = setTimeout(type, speed);
			} else {
				setIsAnimating(false);
			}
		}
		type();
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, [text, speed]);

	const revealAll = () => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		setDisplayed(text);
		setIsAnimating(false);
	};

	return { displayed, isAnimating, revealAll };
}

export default function ShopTab({ plugin, rebuildShopTab }: Props) {
	const [items, setItems] = useState<ShopItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [shopkeeperImg, setShopkeeperImg] = useState<string>("");
	const [imgError, setImgError] = useState(false);
	const [categoryFilter, setCategoryFilter] = useState<string>("All");
	const [rarityFilter, setRarityFilter] = useState<string>("All");
	const [sortBy, setSortBy] = useState<string>("Price (Low → High)");

	// Add coins state and fetchCoins function
	const [coins, setCoins] = useState(0);
	const fetchCoins = async () => {
		const playerData = await readPlayerData(plugin.app.vault);
		setCoins(playerData?.coins ?? 0);
	};

	// Dialogue state
	const [dialogue, setDialogue] = useState<string>(
		"Welcome to the Slop Shop! What would you like to buy today?"
	);
	const [dialogueOptions, setDialogueOptions] = useState<Array<{
		label: string;
		onClick: () => void;
	}> | null>(null);

	// Typewriter effect for dialogue
	const {
		displayed: animatedDialogue,
		isAnimating,
		revealAll,
	} = useTypewriter(dialogue, 24);

	const imagePath =
		plugin.settings.shopkeeperImagePath || "assets/shopkeeper.jpg";

	useEffect(() => {
		async function loadShopkeeperImage() {
			setImgError(false);
			if (imagePath.startsWith("http")) {
				setShopkeeperImg(imagePath);
				return;
			}
			// Try to find the file in the vault
			try {
				const vaultFile =
					plugin.app.vault.getAbstractFileByPath(imagePath);
				if (vaultFile && vaultFile instanceof TFile) {
					const data = await plugin.app.vault.readBinary(vaultFile);
					const ext =
						imagePath.split(".").pop()?.toLowerCase() || "jpg";
					const mime =
						ext === "png"
							? "image/png"
							: ext === "gif"
							? "image/gif"
							: "image/jpeg";
					const base64 = arrayBufferToBase64(data);
					setShopkeeperImg(`data:${mime};base64,${base64}`);
					return;
				}
			} catch (e) {
				console.error("Failed to load shopkeeper image", e);
				setImgError(true);
			}
			setImgError(true);
		}
		function arrayBufferToBase64(buffer: ArrayBuffer) {
			let binary = "";
			const bytes = new Uint8Array(buffer);
			const len = bytes.byteLength;
			for (let i = 0; i < len; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			return window.btoa(binary);
		}
		loadShopkeeperImage();
	}, [imagePath, plugin]);

	useEffect(() => {
		loadItems();
	}, []);

	const loadItems = async () => {
		setLoading(true);
		try {
			const allItems = await getAllShopItems(plugin);
			setItems(allItems);
		} catch (e) {
			console.error("Failed to load shop items", e);
			setItems([]);
		}
		setLoading(false);
		await fetchCoins();
	};

	const openAddItemModal = () => {
		new AddItemModal(plugin.app, plugin, async (newItem) => {
			new Notice(`Added "${newItem.name}" to the shop!`);
			await loadItems();
			if (rebuildShopTab) rebuildShopTab();
			setDialogue(
				`A new item, ${newItem.name}, has been added to the shop!`
			);
		}).open();
	};

	const openEditItemModal = (item: ShopItem) => {
		new AddItemModal(
			plugin.app,
			plugin,
			async (editedItem) => {
				await loadItems();
				if (rebuildShopTab) rebuildShopTab();
			},
			item
		).open();
	};

	const handleBuyClick = (item: ShopItem) => {
		setDialogue(
			`Are you sure you want to buy ${item.name} for ${item.price} coins?`
		);
		setDialogueOptions([
			{
				label: "Yes",
				onClick: async () => {
					await buyItem(item);
					setDialogueOptions(null);
				},
			},
			{
				label: "No",
				onClick: () => {
					setDialogue(
						"Maybe next time! Let me know if you change your mind."
					);
					setDialogueOptions(null);
				},
			},
		]);
	};

	const buyItem = async (item: ShopItem) => {
		const playerData = await readPlayerData(plugin.app.vault);
		if (!playerData) {
			new Notice("Player data not found!");
			return;
		}
		if (playerData.coins < item.price) {
			new Notice("Not enough coins!");
			return;
		}
		playerData.coins -= item.price;
		// Add item to inventory (use plugin.app as first argument)
		await addOrIncrementInventoryItem(plugin.app, item, 1);
		// --- Decrement shop stock and update Shop.md ---
		const allItems = await getAllShopItems(plugin);
		const idx = allItems.findIndex((i) => i.name === item.name);
		if (idx !== -1 && typeof allItems[idx].stock === "number") {
			allItems[idx].stock = Math.max(0, (allItems[idx].stock || 0) - 1);
			// Remove the item if stock is now zero
			if (allItems[idx].stock === 0) {
				allItems.splice(idx, 1);
			}
			await writeShopItems(plugin, allItems);
		}
		await writePlayerData(plugin.app.vault, playerData);
		await fetchCoins();
		await loadItems();
		new Notice(`Purchased ${item.name} for ${item.price} coins!`);
	};

	// Get unique categories and rarities from items
	const categories = useMemo(() => {
		const set = new Set<string>();
		items.forEach((item) => item.category && set.add(item.category));
		return ["All", ...Array.from(set)];
	}, [items]);
	const rarities = useMemo(() => {
		const set = new Set<string>();
		items.forEach((item) => item.rarity && set.add(item.rarity));
		return ["All", ...Array.from(set)];
	}, [items]);

	// Filtering and sorting logic
	const filteredSortedItems = useMemo(() => {
		let filtered = items;
		if (categoryFilter !== "All") {
			filtered = filtered.filter(
				(item) => item.category === categoryFilter
			);
		}
		if (rarityFilter !== "All") {
			filtered = filtered.filter((item) => item.rarity === rarityFilter);
		}
		const sorted = [...filtered];
		switch (sortBy) {
			case "Price (Low → High)":
				sorted.sort((a, b) => a.price - b.price);
				break;
			case "Price (High → Low)":
				sorted.sort((a, b) => b.price - a.price);
				break;
			case "Name (A-Z)":
				sorted.sort((a, b) => a.name.localeCompare(b.name));
				break;
			case "Name (Z-A)":
				sorted.sort((a, b) => b.name.localeCompare(a.name));
				break;
			case "Rarity (A-Z)":
				sorted.sort((a, b) =>
					(a.rarity || "").localeCompare(b.rarity || "")
				);
				break;
			case "Rarity (Z-A)":
				sorted.sort((a, b) =>
					(b.rarity || "").localeCompare(a.rarity || "")
				);
				break;
		}
		return sorted;
	}, [items, categoryFilter, rarityFilter, sortBy]);

	if (loading) {
		return <p>Loading shop...</p>;
	}

	if (items.length === 0) {
		return (
			<div>
				<div
					style={{
						background: "#222",
						color: "#ffd700",
						borderRadius: 12,
						padding: "16px 20px",
						margin: "16px auto",
						maxWidth: 500,
						fontSize: "1.1em",
						boxShadow: "0 2px 8px #0003",
						textAlign: "center",
					}}
				>
					Sorry, the shop is empty! Come back later for more items.
				</div>
				<button
					onClick={openAddItemModal}
					className="mt-2 px-4 py-2 bg-blue-600 rounded text-white"
				>
					Add New Item
				</button>
			</div>
		);
	}

	return (
		<div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
			{/* Shopkeeper/NPC Banner */}
			<div style={{ textAlign: "center", marginBottom: 12 }}>
				{imgError ? (
					<div
						style={{
							fontSize: "2em",
							marginBottom: 8,
							color: "#888",
						}}
					>
						🧙‍♂️
					</div>
				) : (
					<img
						src={shopkeeperImg}
						alt="Shopkeeper"
						style={{
							maxHeight: 180,
							maxWidth: "100%",
							objectFit: "contain",
							marginBottom: 8,
							borderRadius: 12,
							boxShadow: "0 2px 8px #0003",
						}}
					/>
				)}
				<div
					style={{
						fontWeight: "bold",
						fontSize: "1.3em",
						letterSpacing: 1,
					}}
				>
					The Slop Shop
				</div>
			</div>

			{/* Dialogue Box */}
			<div
				className="shop-dialogue-box"
				style={{
					margin: "16px 0",
					padding: "12px",
					background: "#222",
					color: "#fff",
					borderRadius: "8px",
					minHeight: "48px",
					fontFamily: "monospace",
					cursor: isAnimating ? "pointer" : "default",
					boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
				}}
				onClick={() => {
					if (isAnimating) revealAll();
				}}
				title={isAnimating ? "Click to reveal all" : undefined}
			>
				{animatedDialogue}
			</div>

			{dialogueOptions && (
				<div
					style={{
						display: "flex",
						gap: "8px",
						marginBottom: "12px",
					}}
				>
					{dialogueOptions.map((opt, i) => (
						<button
							key={i}
							onClick={opt.onClick}
							style={{
								padding: "6px 16px",
								borderRadius: "6px",
								border: "none",
								background: "#444",
								color: "#fff",
								cursor: "pointer",
							}}
						>
							{opt.label}
						</button>
					))}
				</div>
			)}

			{/* Coins Display */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontWeight: "bold",
					fontSize: "1.1em",
					marginBottom: 16,
					background: "#222",
					color: "#ffd700",
					borderRadius: 8,
					padding: "8px 0",
					boxShadow: "0 1px 4px #0002",
				}}
			>
				<span style={{ fontSize: "1.2em", marginRight: 8 }}>🪙</span>
				Coins: {coins.toLocaleString()}
			</div>

			{/* Add New Item Button */}
			<div style={{ textAlign: "center", marginBottom: 20 }}>
				<button
					onClick={openAddItemModal}
					className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold shadow"
					style={{ fontSize: "1em" }}
				>
					＋ Add New Item
				</button>
			</div>

			{/* Filtering and Sorting Controls */}
			<div
				style={{
					display: "flex",
					gap: 12,
					marginBottom: 20,
					flexWrap: "wrap",
					justifyContent: "center",
				}}
			>
				<label>
					Category:
					<select
						value={categoryFilter}
						onChange={(e) => setCategoryFilter(e.target.value)}
						style={{ marginLeft: 4 }}
					>
						{categories.map((cat) => (
							<option key={cat} value={cat}>
								{cat}
							</option>
						))}
					</select>
				</label>
				<label>
					Rarity:
					<select
						value={rarityFilter}
						onChange={(e) => setRarityFilter(e.target.value)}
						style={{ marginLeft: 4 }}
					>
						{rarities.map((rar) => (
							<option key={rar} value={rar}>
								{rar}
							</option>
						))}
					</select>
				</label>
				<label>
					Sort by:
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						style={{ marginLeft: 4 }}
					>
						<option>Price (Low → High)</option>
						<option>Price (High → Low)</option>
						<option>Name (A-Z)</option>
						<option>Name (Z-A)</option>
						<option>Rarity (A-Z)</option>
						<option>Rarity (Z-A)</option>
					</select>
				</label>
			</div>

			{/* Shop Items Grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
					gap: 16,
				}}
			>
				{filteredSortedItems.map((item) => (
					<div
						key={item.name}
						style={{
							background: "#292929",
							borderRadius: 12,
							padding: 16,
							boxShadow: "0 2px 8px #0003",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							minHeight: 140,
						}}
					>
						{/* Item Icon/Emoji (if available) */}
						{item.icon &&
						(item.icon.match(/^https?:\/\//) ||
							item.icon.match(/\.(png|jpe?g|gif|svg)$/i)) ? (
							<img
								src={item.icon}
								alt="icon"
								className="item-icon"
								style={{
									width: 48,
									height: 48,
									objectFit: "contain",
									margin: "0 auto",
									display: "block",
								}}
							/>
						) : item.icon ? (
							<div
								className="item-icon"
								style={{ fontSize: 36, textAlign: "center" }}
							>
								{item.icon}
							</div>
						) : null}
						<div
							style={{
								fontWeight: "bold",
								fontSize: "1.1em",
								marginBottom: 2,
							}}
						>
							{item.name}
						</div>
						{item.description && (
							<div
								style={{
									color: "#ffd700",
									fontWeight: 500,
									marginBottom: 6,
								}}
							>
								{item.description}
							</div>
						)}
						{item.stock && item.stock > 0 && (
							<div
								className="item-stock"
								style={{
									fontSize: 14,
									color: "#888",
									marginBottom: 4,
								}}
							>
								Stock: {item.stock}
							</div>
						)}
						<div
							style={{
								color: "#ffd700",
								fontWeight: 500,
								marginBottom: 6,
							}}
						>
							{item.price} coins
						</div>
						<div style={{ marginBottom: 10 }}>
							{item.tags.map((tag) => (
								<span
									key={tag}
									style={{
										backgroundColor: "#444",
										color: "white",
										borderRadius: 5,
										padding: "2px 6px",
										marginRight: 5,
										fontSize: "0.75em",
									}}
								>
									#{tag}
								</span>
							))}
						</div>
						{item.effects && item.effects.length > 0 && (
							<div className="shop-item-effects">
								{item.effects.map((effect, idx) => (
									<div className="shop-item-effect" key={idx}>
										{renderEffect(effect)}
									</div>
								))}
							</div>
						)}
						<div
							style={{
								display: "flex",
								gap: 8,
								width: "100%",
								marginTop: "auto",
							}}
						>
							<button
								onClick={() => handleBuyClick(item)}
								className="px-4 py-1 rounded bg-green-600 hover:bg-green-700 text-white font-semibold"
								style={{ flex: 1 }}
							>
								Buy
							</button>
							<button
								className="mod-cta"
								style={{
									flex: 1,
									background: "#f5c542",
									color: "#222",
									fontWeight: 500,
								}}
								onClick={() => openEditItemModal(item)}
							>
								Edit Item
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// Helper to render effect descriptions
function renderEffect(effect: ShopItemEffect) {
	switch (effect.type) {
		case "stat":
			return `+${effect.amount} ${effect.stat}`;
		case "coins":
			return `+${effect.amount} coins`;
		case "xp":
			return `+${effect.amount} XP`;
		case "unlock":
			return `Unlocks: ${effect.skill}`;
		case "meta":
			return `Meta: ${effect.description}`;
		default:
			return "Unknown effect";
	}
}
