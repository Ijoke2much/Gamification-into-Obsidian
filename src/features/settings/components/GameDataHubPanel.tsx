import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type GamifiedObsidianPlugin from '../../../core/main';
import { Card } from '../../../shared/components/ui/Card';
import { AddItemModal } from '../../player/modals/AddItemModal';
import { pixelNotice } from '../../../shared/utils/noticeUtils';
import {
	getAllShopItems,
	type ShopItem,
} from '../../shop/utils/ShopParser';
import { currencyDisplay } from '../../../shared/services/currencyDisplayService';
import styles from './GameDataHubPanel.module.css';

interface GameDataHubPanelProps {
	plugin: GamifiedObsidianPlugin;
}

export const GameDataHubPanel: React.FC<GameDataHubPanelProps> = ({ plugin }) => {
	const [items, setItems] = useState<ShopItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [shopNoteMissing, setShopNoteMissing] = useState(false);

	const loadItems = useCallback(async () => {
		setLoading(true);
		try {
			currencyDisplay.initialize(plugin.settings);
			const files = plugin.app.vault.getMarkdownFiles();
			const shopFile = files.find((f) => f.basename.toLowerCase() === 'shop');
			setShopNoteMissing(!shopFile);
			const list = shopFile ? await getAllShopItems(plugin) : [];
			setItems(list);
		} catch (e) {
			console.error('[GameDataHub] Failed to load shop items', e);
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [plugin]);

	useEffect(() => {
		void loadItems();
	}, [loadItems]);

	useEffect(() => {
		const onShopUpdate = () => {
			void loadItems();
		};
		document.addEventListener('shop-data-updated', onShopUpdate);
		return () => document.removeEventListener('shop-data-updated', onShopUpdate);
	}, [loadItems]);

	const currencyLabel = currencyDisplay.getCurrencyLabel(true);

	const sortedItems = useMemo(() => {
		return [...items].sort((a, b) => a.name.localeCompare(b.name));
	}, [items]);

	const openShopMd = async () => {
		const shopFile = plugin.app.vault
			.getMarkdownFiles()
			.find((f) => f.basename.toLowerCase() === 'shop');
		if (!shopFile) {
			pixelNotice('No note named Shop.md found in this vault.', 3500);
			return;
		}
		await plugin.app.workspace.getLeaf(false).openFile(shopFile);
	};

	const openAddItem = () => {
		new AddItemModal(plugin.app, plugin, () => {}).open();
	};

	const openNewArtifact = () => {
		new AddItemModal(plugin.app, plugin, () => {}, undefined, 'artifact').open();
	};

	const openEdit = (item: ShopItem) => {
		new AddItemModal(plugin.app, plugin, () => {}, item).open();
	};

	return (
		<div>
			<Card className={styles.panel}>
				<h3>🧰 Game data hub</h3>
				<p className={styles.intro}>
					Create and edit shop listings here; they are written to{' '}
					<strong>Shop.md</strong> in your vault (same parser as the in-game shop). Crafting definitions can
					move here in a future update.
				</p>

				{shopNoteMissing && (
					<div className={styles.warn}>
						Could not find <strong>Shop.md</strong>. Add a note with that basename so shop items can be
						saved.
					</div>
				)}

				<div className={styles.actions}>
					<button type="button" className={`${styles.actionBtn} ${styles.actionBtnMuted}`} onClick={() => void loadItems()}>
						↻ Reload list
					</button>
					<button
						type="button"
						className={`${styles.actionBtn} ${styles.actionBtnMuted}`}
						disabled={shopNoteMissing}
						onClick={() => void openShopMd()}
					>
						Open Shop.md
					</button>
					<button
						type="button"
						className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
						disabled={shopNoteMissing}
						onClick={openAddItem}
					>
						＋ Add shop item
					</button>
					<button
						type="button"
						className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
						disabled={shopNoteMissing}
						onClick={openNewArtifact}
					>
						🏺 New artifact listing
					</button>
				</div>

				{loading ? (
					<p className={styles.empty}>Loading shop items…</p>
				) : sortedItems.length === 0 ? (
					<p className={styles.empty}>
						No items loaded. {shopNoteMissing ? 'Create Shop.md first.' : 'Shop.md exists but has no item lines.'}
					</p>
				) : (
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Name</th>
									<th>Price</th>
									<th>Category</th>
									<th>Rarity</th>
									<th aria-label="Actions" />
								</tr>
							</thead>
							<tbody>
								{sortedItems.map((item, idx) => (
									<tr key={`${idx}-${item.name}-${item.price}`}>
										<td>{item.icon ? `${item.icon} ` : ''}{item.name}</td>
										<td>
											{item.price} {currencyLabel}
										</td>
										<td>{item.category || '—'}</td>
										<td>{item.rarity || '—'}</td>
										<td>
											<button type="button" className={styles.editBtn} onClick={() => openEdit(item)} disabled={shopNoteMissing}>
												Edit
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</div>
	);
};
