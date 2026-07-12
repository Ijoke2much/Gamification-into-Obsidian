// src/ui/components/ShopTab.tsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import type GamifiedObsidianPlugin from "../../../core/main";
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import {
    ShopItem,
    ShopItemEffect,
    getAllShopItems,
    writeShopItems,
} from "../utils/ShopParser";
import { AvatarPickerModal } from "src/features/player/modals/AvatarPickerModal";
import { EditShopkeeperDialogueModal } from "../modals/EditShopkeeperDialogueModal";
import { PurchaseConfirmationModal } from "../modals/PurchaseConfirmationModal";
import { TFile, Modal } from 'obsidian';
import {
    getShopkeeperDialogue,
    fillDialogueTemplate,
    isDialogueCorrupted,
    ensureSafeForDisplay,
    sanitizeDialogueString,
} from "../utils/shopkeeperDialogueDefaults";
import { addOrIncrementInventoryItem } from "../../inventory/utils/updateInventoryFile";
import { readPlayerData, writePlayerData } from "src/features/player/utils/playerDataUtils";
import { currencyDisplay } from "../../../shared/services/currencyDisplayService";
import shopStyles from "./ShopTab.module.css";

interface Props {
    plugin: GamifiedObsidianPlugin;
    rebuildShopTab: () => void; // callback to refresh parent
}

// Fixed category tabs with icons (transferred from Shop/Artifacts)
const SHOP_CATEGORIES = [
    { key: "All", label: "All", icon: "🛒" },
    { key: "Materials", label: "Materials", icon: "📦" },
    { key: "Equipment", label: "Equipment", icon: "⚔️" },
    { key: "Artifacts", label: "Artifacts", icon: "🏺" },
    { key: "Weapons", label: "Weapons", icon: "🗡️" },
    { key: "Misc", label: "Misc", icon: "📋" },
] as const;

// Map item category (from Shop.md) to our canonical tab – case-insensitive
function normalizeCategoryForFilter(itemCategory: string | undefined): string {
    const c = (itemCategory || "").trim().toLowerCase();
    if (!c) return "Misc";
    if (c === "material" || c === "materials") return "Materials";
    if (c === "equipment") return "Equipment";
    if (c === "artifact" || c === "artifacts") return "Artifacts";
    if (c === "weapon" || c === "weapons") return "Weapons";
    if (c === "misc") return "Misc";
    return "Misc"; // anything else (consumable, snack, etc.)
}

// Category color for card top strip (inspired by product-card style)
function getCategoryColor(category: string): string {
    const c = category || "Misc";
    switch (c) {
        case "Materials": return "#0ea5e9";   // blue
        case "Equipment": return "#22c55e";   // green
        case "Artifacts": return "#a855f7";  // purple
        case "Weapons": return "#ef4444";    // red
        default: return "#64748b";            // gray for Misc
    }
}

// Typewriter effect hook - guards against undefined char to prevent "undefined" in output
function useTypewriter(text: string, speed = 30) {
    const [displayed, setDisplayed] = useState("");
    const [isAnimating, setIsAnimating] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const safeText = String(text ?? "").replace(/undefined/g, "");

    useEffect(() => {
        setDisplayed("");
        setIsAnimating(true);
        let i = 0;
        function type() {
            if (i < safeText.length) {
                const ch = safeText[i];
                if (ch !== undefined) setDisplayed((prev) => prev + ch);
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
    }, [safeText, speed]);

    const revealAll = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setDisplayed(safeText);
        setIsAnimating(false);
    };

    return { displayed, isAnimating, revealAll };
}

export default function ShopTab({ plugin, rebuildShopTab }: Props) {
    // Ensure currency display service is initialized for consistent labels
    currencyDisplay.initialize(plugin.settings);
    const currencyName = currencyDisplay.getCurrencyName();
    const currencyNameLower = currencyDisplay.getCurrencyNameLowercase();
    const currencySymbol = currencyDisplay.getCurrencySymbol();
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

    // Dialogue state (uses overrides from settings)
    const getDialogue = (key: Parameters<typeof getShopkeeperDialogue>[0]) =>
        getShopkeeperDialogue(key, plugin.settings.shopkeeperDialogueOverrides);
    const getResolvedGreeting = () =>
        ensureSafeForDisplay(
            fillDialogueTemplate(getDialogue("greeting"), {
                currency: currencyNameLower ?? "coins",
            }),
            "greeting"
        );
    const [dialogue, setDialogue] = useState<string>(getResolvedGreeting());
    const [dialogueOptions, setDialogueOptions] = useState<Array<{
        label: string;
        onClick: () => void;
    }> | null>(null);

    // Typewriter effect for dialogue
    const safeDialogue = sanitizeDialogueString(dialogue);
    const {
        displayed: animatedDialogue,
        isAnimating,
        revealAll,
    } = useTypewriter(safeDialogue, 24);

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

    // Migration: clear corrupted dialogue overrides (e.g. "undefined", "elcooe") and reset to defaults
    useEffect(() => {
        if (isDialogueCorrupted(plugin.settings.shopkeeperDialogueOverrides)) {
            plugin.settings.shopkeeperDialogueOverrides = {};
            plugin.saveSettings();
            setDialogue(getResolvedGreeting());
        }
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

    const openDebugDialogueModal = () => {
        const overrides = plugin.settings.shopkeeperDialogueOverrides ?? {};
        const raw = getDialogue("greeting");
        const filled = fillDialogueTemplate(raw, { currency: currencyNameLower ?? "coins" });
        const resolved = getResolvedGreeting();
        const firstChars = safeDialogue.slice(0, 10).split("").map((c, i) =>
            `[${i}]="${c}" U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`
        ).join(" ");
        const info = [
            "=== Shopkeeper Dialogue Debug ===",
            "",
            "1. overrides (saved): " + JSON.stringify(overrides),
            "2. getDialogue('greeting'): " + JSON.stringify(raw),
            "3. after fillDialogueTemplate: " + JSON.stringify(filled),
            "4. getResolvedGreeting(): " + JSON.stringify(resolved),
            "5. dialogue state: " + JSON.stringify(dialogue),
            "6. safeDialogue (to typewriter): " + JSON.stringify(safeDialogue),
            "7. First 10 chars: " + firstChars,
            "8. animatedDialogue length: " + animatedDialogue.length,
        ].join("\n");
        const modal = new Modal(plugin.app);
        modal.contentEl.createEl("h2", { text: "Dialogue Debug" });
        const pre = modal.contentEl.createEl("pre", {
            attr: { style: "font-size:11px; overflow:auto; max-height:60vh; white-space:pre-wrap;" },
        });
        pre.setText(info);
        modal.open();
    };

    const openEditDialogueModal = () => {
        const modal = new EditShopkeeperDialogueModal(
            plugin.app,
            plugin,
            async (overrides) => {
                plugin.settings.shopkeeperDialogueOverrides = overrides;
                await plugin.saveSettings();
                setDialogue(getResolvedGreeting());
                pixelNotice("Shopkeeper dialogue updated!");
            }
        );
        modal.open();
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
                setDialogue(getDialogue("imageUpdated"));
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

    const getEffectsPreview = (item: ShopItem) =>
        item.effects?.map((effect) => {
            if (typeof effect === "string") return effect;
            if (effect.type === "stat") return `+${effect.amount} ${effect.stat}`;
            if (effect.type === "coins") return `+${effect.amount} ${currencyName}`;
            if (effect.type === "xp") return `+${effect.amount} XP`;
            if (effect.type === "unlock") return `Unlocks: ${effect.skill}`;
            if (effect.type === "meta") return effect.description;
            return "Unknown effect";
        }).join(", ") || "No special effects";

    const executePurchase = async (item: ShopItem, price: number) => {
        const playerData = await readPlayerData(plugin.app.vault);
        if (!playerData) return;
        playerData.coins -= price;

        try {
            const { CoinTransactionTracker } = await import(
                "../../../shared/utils/coinTransactionTracker"
            );
            await CoinTransactionTracker.recordTransaction(
                plugin.app.vault,
                -price,
                "shop",
                `Purchased ${item.name}`,
                { itemName: item.name, category: item.category }
            );
        } catch (error) {
            console.warn("[ShopTab] Failed to record coin transaction:", error);
        }

        await addOrIncrementInventoryItem(plugin.app, item, 1);
        const allItems = await getAllShopItems(plugin);
        const idx = allItems.findIndex((i) => i.name === item.name);
        if (idx !== -1 && typeof allItems[idx].stock === "number") {
            allItems[idx].stock = Math.max(0, (allItems[idx].stock || 0) - 1);
            if (allItems[idx].stock === 0) allItems.splice(idx, 1);
            await writeShopItems(plugin, allItems);
        }
        await writePlayerData(plugin.app.vault, playerData);

        pixelNotice(`Successfully purchased ${item.name}!`);

        try {
            const { achievementEventService } = await import(
                "../../../features/achievements/services/achievementEventService"
            );
            await achievementEventService.processGameEvent({
                type: "item_purchased",
                data: { item, totalPurchases: 1 },
                timestamp: new Date(),
            });
        } catch (error) {
            console.warn("[ShopTab] Failed to trigger achievement events:", error);
        }

        await fetchCoins();
        await loadItems();
    };

    const handleBuyClick = async (item: ShopItem) => {
        const playerData = await readPlayerData(plugin.app.vault);
        if (!playerData) {
            pixelNotice("Player data not found!");
            return;
        }
        const rep = Math.max(-100, Math.min(100, Number(playerData.questReputation ?? 0)));
        const repFactor = 1 - Math.max(-0.2, Math.min(0.2, rep / 500));
        const price = Math.max(1, Math.round(item.price * repFactor));

        if (playerData.coins < price) {
            pixelNotice(`Not enough ${currencyNameLower}! You need ${price - playerData.coins} more.`);
            setDialogue(
                fillDialogueTemplate(getDialogue("insufficientFunds"), {
                    currency: currencyNameLower,
                    amount: (price - playerData.coins).toLocaleString(),
                    item: item.name,
                })
            );
            setDialogueOptions([
                { label: "I understand", onClick: () => setDialogueOptions(null) },
            ]);
            return;
        }

        const effectsText = getEffectsPreview(item);
        const modal = new PurchaseConfirmationModal({
            app: plugin.app,
            plugin,
            item,
            price,
            effectsText,
            shopkeeperImg: shopkeeperImg || "",
            overrides: plugin.settings.shopkeeperDialogueOverrides,
            currencyName,
            currencyNameLower,
            currencySymbol,
            onPurchase: async () => {
                await executePurchase(item, price);
            },
            onWhatElse: () => {
                setDialogue(getDialogue("purchaseFollowUp"));
            },
        });
        modal.open();
    };

    // Rarities from items (categories are fixed: SHOP_CATEGORIES)
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
                (item) => normalizeCategoryForFilter(item.category) === categoryFilter
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
        return (
            <p className={`gami-shop-tab ${shopStyles.shopRoot} ${shopStyles.shopLoading}`} data-pixel-shell="shop">
                Loading shop...
            </p>
        );
    }

    return (
        <div
            className={`gami-shop-tab ${shopStyles.shopRoot}`}
            data-pixel-shell="shop"
        >
            <div className="gami-shop-header">
                <span className={shopStyles.shopHeaderTitle}>🛒 Shop</span>
                <div className={shopStyles.shopCurrencyBadge}>
                    <span>{currencySymbol}</span>
                    <span>{coins.toLocaleString()}</span>
                </div>
            </div>

            <div className={shopStyles.shopkeeperSection}>
                {imgError ? (
                    <div className={shopStyles.shopkeeperFallback}>🧙‍♂️</div>
                ) : (
                    <img src={shopkeeperImg} alt="Shopkeeper" />
                )}
                <div className={shopStyles.shopkeeperActions}>
                    <button
                        type="button"
                        onClick={openShopkeeperPicker}
                        className="gami-shop-keeper-btn"
                        title="Change the shopkeeper image"
                    >
                        Change image
                    </button>
                    <button
                        type="button"
                        onClick={openEditDialogueModal}
                        className="gami-shop-keeper-btn"
                        title="Edit shopkeeper dialogue"
                    >
                        Edit dialogue
                    </button>
                    <button
                        type="button"
                        onClick={openDebugDialogueModal}
                        className="gami-shop-keeper-btn debugBtn"
                        title="Debug dialogue (diagnostic info)"
                    >
                        Debug
                    </button>
                </div>
            </div>

            <div
                className={`shop-dialogue-box ${isAnimating ? shopStyles.dialogueAnimating : ""}`}
                onClick={() => {
                    if (isAnimating) revealAll();
                }}
                title={isAnimating ? "Click to reveal all" : undefined}
            >
                {animatedDialogue}
            </div>

            {dialogueOptions && (
                <div className={`gami-shop-dialogue-options ${shopStyles.dialogueOptions}`}>
                    {dialogueOptions.map((opt, i) => (
                        <button key={i} type="button" onClick={opt.onClick}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}

            <div className={`gami-shop-category-tabs ${shopStyles.categoryTabs}`}>
                {SHOP_CATEGORIES.map((cat) => (
                    <button
                        key={cat.key}
                        type="button"
                        data-active={categoryFilter === cat.key ? "true" : "false"}
                        onClick={() => setCategoryFilter(cat.key)}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>

            <div className={shopStyles.filterRow}>
                <select
                    className="gami-shop-select"
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value)}
                >
                    {rarities.map((rar) => (
                        <option key={rar} value={rar}>{rar}</option>
                    ))}
                </select>
                <select
                    className="gami-shop-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option>Price (Low → High)</option>
                    <option>Price (High → Low)</option>
                    <option>Name (A-Z)</option>
                    <option>Name (Z-A)</option>
                    <option>Rarity (A-Z)</option>
                    <option>Rarity (Z-A)</option>
                </select>
            </div>

            {items.length === 0 ? (
                <div className={`gami-shop-empty-wrap ${shopStyles.emptyWrap}`}>
                    <div className="gami-shop-empty-msg">
                        Sorry, the shop is empty! Come back later for more items.
                    </div>
                    <div className={shopStyles.emptyHint}>
                        To add or edit listings, open <strong>Gamification</strong> settings → <strong>Rewards &amp; Progression</strong> → <strong>Game data hub</strong>.
                    </div>
                </div>
            ) : (
                <div className="gami-shop-grid">
                    {filteredSortedItems.map((item) => {
                        const itemCategory = normalizeCategoryForFilter(item.category);
                        const categoryColor = getCategoryColor(itemCategory);
                        const rawEffects = getRawEffectLines(item);
                        const hasEffects = (item.effects && item.effects.length > 0) || (rawEffects && rawEffects.length > 0);
                        const isNew = item.tags?.some(t => t.toLowerCase() === "new") ?? false;
                        return (
                            <div key={item.name} className="gami-shop-card">
                                {isNew && (
                                    <div className="gami-shop-card-new">NEW</div>
                                )}
                                <div
                                    className="gami-shop-card-category"
                                    style={{ "--shop-cat-color": categoryColor } as React.CSSProperties}
                                >
                                    {itemCategory}
                                </div>
                                <div className={shopStyles.cardBody}>
                                    {item.icon &&
                                    (item.icon.match(/^https?:\/\//) || item.icon.match(/\.(png|jpe?g|gif|svg)$/i)) ? (
                                        <div className={shopStyles.cardIconWrap}>
                                            <img src={item.icon} alt="" className={shopStyles.cardIconImg} />
                                        </div>
                                    ) : item.icon ? (
                                        <div className={shopStyles.cardIconEmoji}>{item.icon}</div>
                                    ) : (
                                        <div className={shopStyles.cardIconPlaceholder}>🎁</div>
                                    )}
                                    <div className="gami-shop-card-title">{item.name}</div>
                                    {item.stock != null && item.stock > 0 && (
                                        <div className={shopStyles.cardStock}>Stock: {item.stock}</div>
                                    )}
                                </div>
                                <div className="gami-shop-card-desc">
                                    <div>
                                        {item.description ||
                                            (hasEffects
                                                ? (item.effects?.map(e => renderEffect(e)).join(" • ") ||
                                                    rawEffects?.slice(0, 1).map(r => renderRawEffect(r, currencyName)).join(" • ") ||
                                                    "")
                                                : <span className={shopStyles.descEmpty}>No description</span>)}
                                    </div>
                                </div>
                                <div className="gami-shop-card-footer">
                                    <div className={shopStyles.cardPrice}>
                                        <span>{currencySymbol}</span>
                                        <span>{item.price} {currencyNameLower}</span>
                                    </div>
                                    <div className={shopStyles.cardActions}>
                                        <button type="button" onClick={() => handleBuyClick(item)}>
                                            Buy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
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
