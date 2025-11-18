// src/ui/components/ShopTab.tsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import type GamifiedObsidianPlugin from "../../../core/main";
import {
    ShopItem,
    ShopItemEffect,
    getAllShopItems,
    writeShopItems,
} from "../utils/ShopParser";
import { AddItemModal } from "src/features/player/modals/AddItemModal";
import { AvatarPickerModal } from "src/features/player/modals/AvatarPickerModal";
import { Notice, TFile } from "obsidian";
import { addOrIncrementInventoryItem } from "../../inventory/utils/updateInventoryFile";
import { readPlayerData, writePlayerData } from "src/features/player/utils/playerDataUtils";

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
    const currencyName = plugin.settings.currencyName || "Coins";
    const currencySymbol = plugin.settings.currencySymbol || "🪙";
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [shopkeeperImg, setShopkeeperImg] = useState<string>("");
    const [imgError, setImgError] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>("All");
    const [rarityFilter, setRarityFilter] = useState<string>("All");
    const [sortBy, setSortBy] = useState<string>("Price (Low → High)");
    const [customImagePath, setCustomImagePath] = useState<string | null>(null);

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
        customImagePath || plugin.settings.shopkeeperImagePath || "assets/shopkeeper.jpg";

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

    // Listen for shop data updates and refresh
    useEffect(() => {
        const handleShopDataUpdate = () => {
            console.log("Shop data updated, reloading items...");
            loadItems();
        };

        document.addEventListener("shop-data-updated", handleShopDataUpdate);

        return () => {
            document.removeEventListener(
                "shop-data-updated",
                handleShopDataUpdate
            );
        };
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

    const openShopkeeperPicker = async () => {
        const avatarFolder = plugin.settings.avatarFolder || "assets/";
        const files = plugin.app.vault
            .getFiles()
            .filter(
                (file) =>
                    file.path.startsWith(avatarFolder) &&
                    ["png", "jpg", "jpeg", "svg", "gif"].includes(
                        file.extension.toLowerCase()
                    )
            );
        try {
            const modal = new AvatarPickerModal(plugin.app, files, async (selectedPath: string) => {
                plugin.settings.shopkeeperImagePath = selectedPath;
                await plugin.saveSettings();
                setCustomImagePath(selectedPath);
                setDialogue("Shopkeeper image updated!");
            });
            if (modal && typeof modal.open === 'function') {
                modal.open();
            } else {
                setDialogue("Avatar picker not available on mobile");
            }
        } catch (error) {
            console.error('📱 Mobile avatar picker error:', error);
            setDialogue("Avatar picker not available on mobile");
        }
    };

    const openAddItemModal = () => {
        const modal = new AddItemModal(plugin.app, plugin, async (newItem: ShopItem) => {
            new Notice(`Added "${newItem.name}" to the shop!`, 0);
            await loadItems();
            if (rebuildShopTab) rebuildShopTab();
            setDialogue(
                `A new item, ${newItem.name}, has been added to the shop!`
            );
        });
        modal.open();
    };

    const openEditItemModal = (item: ShopItem) => {
        const modal = new AddItemModal(
            plugin.app,
            plugin,
            async (editedItem: ShopItem) => {
                await loadItems();
                if (rebuildShopTab) rebuildShopTab();
            },
            item
        );
        modal.open();
    };

    const handleBuyClick = (item: ShopItem) => {
        setDialogue(
            `Are you sure you want to buy ${item.name} for ${item.price} ${currencyName.toLowerCase()}?`
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
        // Reputation modifies effective price (±20% cap)
        const rep = Math.max(-100, Math.min(100, Number(playerData.questReputation ?? 0)));
        const repFactor = 1 - Math.max(-0.2, Math.min(0.2, rep / 500));
        const price = Math.max(1, Math.round(item.price * repFactor));
        
        if (playerData.coins < price) {
            new Notice(`Not enough ${currencyName.toLowerCase()}! You need ${price - playerData.coins} more.`);
            setDialogue(`Not enough ${currencyName.toLowerCase()}! You need ${(price - playerData.coins).toLocaleString()} more to buy that ${item.name}.`);
            setDialogueOptions([
                { label: "I understand", onClick: () => setDialogueOptions(null) }
            ]);
            return;
        }
        
        // Show purchase confirmation with item details
        const effectsPreview = item.effects?.map(effect => {
            if (typeof effect === 'string') return effect;
            if (effect.type === 'stat') return `+${effect.amount} ${effect.stat}`;
            if (effect.type === 'coins') return `+${effect.amount} ${currencyName}`;
            if (effect.type === 'xp') return `+${effect.amount} XP`;
            if (effect.type === 'unlock') return `Unlocks: ${effect.skill}`;
            if (effect.type === 'meta') return effect.description;
            return 'Unknown effect';
        }).join(', ') || 'No special effects';
        
        setDialogue(`Are you sure you want to buy "${item.name}" for ${price.toLocaleString()} ${currencyName.toLowerCase()}?\n\nEffects: ${effectsPreview}`);
        setDialogueOptions([
            { 
                label: `Yes, buy for ${currencySymbol}${price.toLocaleString()}`, 
                onClick: () => confirmPurchase(item, price) 
            },
            { 
                label: "No, maybe later", 
                onClick: () => {
                    setDialogue("Come back anytime!");
                    setDialogueOptions(null);
                }
            }
        ]);
    };
    
    const confirmPurchase = async (item: ShopItem, price: number) => {
        const playerData = await readPlayerData(plugin.app.vault);
        if (!playerData) return;
        playerData.coins -= price;
        
        // Record coin transaction
        try {
          const { CoinTransactionTracker } = await import('../../../shared/utils/coinTransactionTracker');
          await CoinTransactionTracker.recordTransaction(
            plugin.app.vault,
            -price,
            'shop',
            `Purchased ${item.name}`,
            { itemName: item.name, category: item.category }
          );
        } catch (error) {
          console.warn('[ShopTab] Failed to record coin transaction:', error);
        }
        
        // Add item to inventory (use plugin.app as first argument)
        // addOrIncrementInventoryItem now handles ShopItem directly
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
        
        // Show success message with dialogue
        new Notice(`Successfully purchased ${item.name}!`);
        setDialogue(`Excellent choice! You've purchased "${item.name}" for ${price.toLocaleString()} ${currencyName.toLowerCase()}. It's been added to your inventory!`);
        setDialogueOptions([
            { label: "Thanks!", onClick: () => setDialogueOptions(null) },
            { label: "What else do you have?", onClick: () => {
                setDialogue("Take a look around! I've got plenty of interesting items for sale.");
                setDialogueOptions(null);
            }}
        ]);
        
        // Trigger achievement events for item purchase
        try {
            const { achievementEventService } = await import('../../../features/achievements/services/achievementEventService');
            await achievementEventService.processGameEvent({
                type: 'item_purchased',
                data: { item, totalPurchases: 1 }, // TODO: Track actual total purchases
                timestamp: new Date()
            });
        } catch (error) {
            console.warn('[ShopTab] Failed to trigger achievement events:', error);
        }
        
        // reload coins and items after purchase
        await fetchCoins();
        await loadItems();
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
                <div style={{ marginTop: 8 }}>
                    <button
                        onClick={openShopkeeperPicker}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white"
                        title="Change the shopkeeper image"
                    >
                        Change Shopkeeper Image
                    </button>
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
                <span style={{ fontSize: "1.2em", marginRight: 8 }}>{currencySymbol}</span>
                {currencyName}: {coins.toLocaleString()}
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
                        {item.effects && item.effects.length > 0 && (
                            <div
                                style={{
                                    color: "#90EE90",
                                    fontSize: 12,
                                    marginBottom: 6,
                                    textAlign: "center",
                                    lineHeight: 1.3,
                                }}
                            >
                                Effects: {item.effects.map(effect => {
                                    if (typeof effect === 'string') return effect;
                                    if (effect.type === 'stat') return `+${effect.amount} ${effect.stat}`;
                                    if (effect.type === 'coins') return `+${effect.amount} ${currencyName}`;
                                    if (effect.type === 'xp') return `+${effect.amount} XP`;
                                    if (effect.type === 'unlock') return `Unlocks: ${effect.skill}`;
                                    if (effect.type === 'meta') return effect.description;
                                    return 'Unknown effect';
                                }).join(' • ')}
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
                            {item.price} {currencyName.toLowerCase()}
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
                        {(item.effects && item.effects.length > 0) || (((): number => { const r = getRawEffectLines(item); return r ? r.length : 0; })() > 0) ? (
                            <div className="shop-item-effects" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
                                {item.effects?.map((effect, idx) => (
                                    <span key={`eff-${idx}`} style={{
                                        background: '#1f3b4d',
                                        color: '#cbe9ff',
                                        border: '1px solid #2c5b73',
                                        borderRadius: 9999,
                                        padding: '2px 8px',
                                        fontSize: '0.75em'
                                    }}>
                                        {renderEffect(effect)}
                                    </span>
                                ))}
                                {getRawEffectLines(item)?.map((raw, idx) => (
                                    <span key={`raw-${idx}`} style={{
                                        background: raw.startsWith('debuff:') ? '#4d1f1f' : '#1f4d2a',
                                        color: '#fff',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: 9999,
                                        padding: '2px 8px',
                                        fontSize: '0.75em'
                                    }}>
                                        {renderRawEffect(raw, currencyName)}
                                    </span>
                                ))}
                            </div>
                        ) : null}
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
            // Note: effect rendering here is static; runtime currency name is in component
            return `+${effect.amount} coins`;
        case "xp":
            return `+${effect.amount} XP`;
        case "unlock":
            return `Unlocks: ${effect.skill}`;
        case "meta":
            return `Meta: ${effect.description}`;
        case "artifact":
            return `🏺 Enables: ${effect.activity} (${effect.durationMinutes}min)`;
        default:
            return "Unknown effect";
    }
}

function renderRawEffect(raw: string, currencyName: string) {
    // buff:xp;mult=1.5;dur=30m
    const mBuff = raw.match(/^buff:([a-z]+);mult=([0-9.]+);dur=([0-9smhdw]+)/i);
    if (mBuff) {
        const kind = mBuff[1];
        const mult = parseFloat(mBuff[2]);
        const dur = mBuff[3];
        const label = kind === 'rewards' ? 'All rewards' : kind === 'trade' ? 'Sell value' : kind.toUpperCase();
        const pct = Math.round((mult - 1) * 100);
        return `+${pct}% ${label} for ${dur}`;
    }
    // debuff:coins;mult=0.9;dur=1h
    const mDebuff = raw.match(/^debuff:([a-z]+);mult=([0-9.]+);dur=([0-9smhdw]+)/i);
    if (mDebuff) {
        const kind = mDebuff[1];
        const mult = parseFloat(mDebuff[2]);
        const dur = mDebuff[3];
        const label = kind === 'rewards' ? 'All rewards' : kind === 'trade' ? 'Sell value' : kind.toUpperCase();
        const pct = Math.round((1 - mult) * 100);
        return `-${pct}% ${label} for ${dur}`;
    }
    // xp:+100 or coins:+50
    const mSimple = raw.match(/^(xp|coins):\+?(\d+)/i);
    if (mSimple) {
        const type = mSimple[1].toLowerCase();
        const amt = parseInt(mSimple[2], 10);
        return type === 'xp' ? `+${amt} XP` : `+${amt} ${currencyName}`;
    }
    return raw;
}

// Narrow helper to avoid `any` on optional rawEffectLines extension
type ShopItemWithRaw = ShopItem & { rawEffectLines?: string[] };
function getRawEffectLines(item: ShopItem): string[] | undefined {
    const maybe = item as Partial<ShopItemWithRaw>;
    return Array.isArray(maybe.rawEffectLines) ? maybe.rawEffectLines : undefined;
}
