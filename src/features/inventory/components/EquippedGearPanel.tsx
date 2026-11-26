import React from 'react';
import {
	GEAR_SLOT_LABELS,
	LOADOUT_SLOT_LABELS,
	type EquippedGearItem,
	type EquippedLoadoutItem,
	type GearSlot,
	type LoadoutSlot,
} from '../utils/gearFile';
import {
	getDreamItemCombatBonuses,
	getDreamItemDurability,
} from '../../player/utils/dreamCombat';
import {
	getRarityColor,
	getRarityDisplayName,
} from '../../quests/utils/questRewardsSystem';
import { PixelIcon } from '../../../shared/components/ui/PixelIcon';
import styles from './EquippedGearPanel.module.css';

export const EquippedGearPanel: React.FC<{
	look: EquippedGearItem[];
	loadout: EquippedLoadoutItem[];
	kitMode: 'look' | 'loadout';
	selectedLookSlot: GearSlot | null;
	selectedLoadoutSlot: LoadoutSlot | null;
	unbreaking?: boolean;
	clayUi?: boolean;
	onSelectLookSlot: (slot: GearSlot) => void;
	onSelectLoadoutSlot: (slot: LoadoutSlot) => void;
}> = ({
	look,
	loadout,
	kitMode,
	selectedLookSlot,
	selectedLoadoutSlot,
	unbreaking = false,
	clayUi = false,
	onSelectLookSlot,
	onSelectLoadoutSlot,
}) => {
	const filledLook = look.filter((entry) => entry.itemName);
	const featuredLook =
		look.find((entry) => entry.slot === selectedLookSlot && entry.itemName) ??
		filledLook[0] ??
		null;
	const featuredLoadout =
		loadout.find((entry) => entry.slot === selectedLoadoutSlot && entry.itemName) ??
		loadout.find((entry) => entry.itemName) ??
		null;

	const featured = kitMode === 'loadout' ? featuredLoadout : featuredLook;
	const featuredItem = featured?.item ?? null;
	const bonuses =
		kitMode === 'look' && featuredLook?.item
			? getDreamItemCombatBonuses(featuredLook.item, featuredLook.slot, unbreaking)
			: { atk: 0, def: 0, hp: 0 };
	const condition =
		kitMode === 'look' && featuredLook
			? getDreamItemDurability(featuredLook.item, unbreaking)
			: 'intact';
	const rarity = (featuredItem?.rarity || 'common').toLowerCase();
	const rarityColor = getRarityColor(rarity);

	return (
		<aside className={`${styles.panel} ${clayUi ? styles.panelClay : ''}`} aria-label="Equipped gear">
			<h3 className={styles.title}>Equipped gear</h3>

			{featuredItem && featured ? (
				<div className={styles.card} style={{ borderColor: rarityColor }}>
					<div className={styles.cardHead}>
						<span className={styles.cardIcon} aria-hidden="true">
							<PixelIcon
								item={featuredItem}
								fallback="🧰"
								className={styles.cardIconEmoji}
								imgClassName={styles.cardIconImg}
							/>
						</span>
						<div className={styles.cardMeta}>
							<p className={styles.cardName} style={{ color: rarityColor }}>
								{featuredItem.name}
							</p>
							<p className={styles.cardSub}>
								{getRarityDisplayName(rarity)}
								{kitMode === 'look' && featuredLook
									? ` · ${GEAR_SLOT_LABELS[featuredLook.slot]}`
									: featuredLoadout
										? ` · ${LOADOUT_SLOT_LABELS[featuredLoadout.slot]}`
										: ''}
							</p>
						</div>
					</div>
					{featuredItem.description ? (
						<p className={styles.cardDesc}>{featuredItem.description}</p>
					) : null}
					{kitMode === 'look' ? (
						<ul className={styles.statList}>
							{bonuses.atk > 0 ? <li>+{Math.round(bonuses.atk)} ATK</li> : null}
							{bonuses.def > 0 ? <li>+{Math.round(bonuses.def)} DEF</li> : null}
							{bonuses.hp > 0 ? <li>+{Math.round(bonuses.hp)} HP</li> : null}
							{bonuses.atk <= 0 && bonuses.def <= 0 && bonuses.hp <= 0 ? (
								<li>No combat bonus</li>
							) : null}
						</ul>
					) : (
						<p className={styles.cardDesc}>Brought to work. Does not change the doll.</p>
					)}
					{kitMode === 'look' && !unbreaking ? (
						<p className={styles.condition}>
							{condition === 'intact'
								? 'Intact'
								: condition === 'worn'
									? 'Worn'
									: 'Broken'}
						</p>
					) : null}
				</div>
			) : (
				<p className={styles.empty}>
					{kitMode === 'look'
						? 'Tap a slot on the hunter, then equip a piece from the bag.'
						: 'Tap Brought A or B, then equip a tool from the bag.'}
				</p>
			)}

			{kitMode === 'look' && filledLook.length > 0 ? (
				<div className={styles.list}>
					{filledLook.map((entry) => {
						const active = entry.slot === featuredLook?.slot;
						return (
							<button
								key={entry.slot}
								type="button"
								className={`${styles.row} ${active ? styles.rowActive : ''}`}
								onClick={() => onSelectLookSlot(entry.slot)}
							>
								<span className={styles.rowIcon}>
									<PixelIcon
										item={entry.item}
										fallback="·"
										className={styles.rowIconEmoji}
										imgClassName={styles.rowIconImg}
									/>
								</span>
								<span className={styles.rowName}>{entry.itemName}</span>
								<span className={styles.rowSlot}>{GEAR_SLOT_LABELS[entry.slot]}</span>
							</button>
						);
					})}
				</div>
			) : null}

			{kitMode === 'loadout' ? (
				<div className={styles.list}>
					{loadout.map((entry) => (
						<button
							key={entry.slot}
							type="button"
							className={`${styles.row} ${
								entry.slot === selectedLoadoutSlot ? styles.rowActive : ''
							}`}
							onClick={() => onSelectLoadoutSlot(entry.slot)}
						>
							<span className={styles.rowIcon}>
								<PixelIcon
									item={entry.item}
									fallback="🧰"
									className={styles.rowIconEmoji}
									imgClassName={styles.rowIconImg}
								/>
							</span>
							<span className={styles.rowName}>{entry.itemName || 'Empty'}</span>
							<span className={styles.rowSlot}>{LOADOUT_SLOT_LABELS[entry.slot]}</span>
						</button>
					))}
				</div>
			) : null}
		</aside>
	);
};
