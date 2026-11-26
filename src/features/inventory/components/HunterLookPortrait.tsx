import React from 'react';
import {
  GEAR_SLOT_LABELS,
  LOADOUT_SLOT_LABELS,
  LOADOUT_SLOTS,
  type EquippedGearItem,
  type EquippedLoadoutItem,
  type GearSlot,
  type LoadoutSlot,
} from '../utils/gearFile';
import {
  getDreamItemDurability,
  sumDreamGearBonuses,
} from '../../player/utils/dreamCombat';
import { PixelIcon } from '../../../shared/components/ui/PixelIcon';
import { resolveSlotSpriteUrl } from '../../../shared/utils/pixelSprites';
import styles from './HunterLookPortrait.module.css';

export type KitMode = 'look' | 'loadout';

const SLOT_POS: Record<GearSlot, string> = {
  head: styles.slotHead,
  body: styles.slotBody,
  hands: styles.slotHands,
  feet: styles.slotFeet,
  weapon: styles.slotWeapon,
  accessory: styles.slotAccessory,
  tool: styles.slotTool,
};

const RARITY_CLASS: Record<string, string> = {
  common: styles.rarityCommon,
  uncommon: styles.rarityUncommon,
  rare: styles.rarityRare,
  epic: styles.rarityEpic,
  legendary: styles.rarityLegendary,
};

const GhostSilhouette: React.FC<{ faceSrc?: string }> = ({ faceSrc }) => (
  <div className={styles.ghost} aria-hidden="true">
    <svg className={styles.ghostSvg} viewBox="0 0 120 220">
      <ellipse cx="60" cy="28" rx="18" ry="20" fill="rgba(18, 42, 68, 0.85)" stroke="rgba(80, 130, 160, 0.35)" strokeWidth="1.4" />
      <path
        d="M42 48c10-8 26-8 36 0l8 14c4 28-2 72-10 88H44c-8-16-14-60-10-88z"
        fill="rgba(12, 32, 52, 0.82)"
        stroke="rgba(80, 130, 160, 0.32)"
        strokeWidth="1.4"
      />
      <path d="M42 62c-16 10-22 28-22 48l10 6 18-28z" fill="rgba(12, 32, 52, 0.75)" stroke="rgba(80, 130, 160, 0.28)" strokeWidth="1.2" />
      <path d="M78 62c16 10 22 28 22 48l-10 6-18-28z" fill="rgba(12, 32, 52, 0.75)" stroke="rgba(80, 130, 160, 0.28)" strokeWidth="1.2" />
      <path d="M48 148v52c0 4 4 8 10 8h2V148z" fill="rgba(10, 28, 46, 0.8)" stroke="rgba(80, 130, 160, 0.28)" strokeWidth="1.2" />
      <path d="M72 148v52c0 4-4 8-10 8h-2V148z" fill="rgba(10, 28, 46, 0.8)" stroke="rgba(80, 130, 160, 0.28)" strokeWidth="1.2" />
    </svg>
    {faceSrc ? <img className={styles.ghostFace} src={faceSrc} alt="" /> : null}
  </div>
);

const BoardLines: React.FC = () => (
  <svg className={styles.boardLines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {/* head → neck */}
    <path d="M50 11 V 22" />
    {/* weapon → left shoulder */}
    <path d="M14 32 H 38 V 38" />
    {/* accessory → right shoulder */}
    <path d="M86 32 H 62 V 38" />
    {/* hands → left hip */}
    <path d="M14 55 H 38 V 50" />
    {/* tool → right hip */}
    <path d="M86 55 H 62 V 50" />
    {/* feet → ankles */}
    <path d="M50 89 V 78" />
  </svg>
);

export interface HunterLookPortraitProps {
  avatarSrc: string;
  look: EquippedGearItem[];
  loadout?: EquippedLoadoutItem[];
  mode?: KitMode;
  compact?: boolean;
  showEmptyLook?: boolean;
  selectedLookSlot?: GearSlot | null;
  selectedLoadoutSlot?: LoadoutSlot | null;
  onPortraitClick?: () => void;
  onLookSlotClick?: (slot: GearSlot) => void;
  onLoadoutSlotClick?: (slot: LoadoutSlot) => void;
  showEditHint?: boolean;
  forceIntact?: boolean;
  clayUi?: boolean;
}

export const HunterLookPortrait: React.FC<HunterLookPortraitProps> = ({
  avatarSrc,
  look,
  loadout = [],
  mode = 'look',
  compact = false,
  selectedLookSlot = null,
  selectedLoadoutSlot = null,
  onPortraitClick,
  onLookSlotClick,
  onLoadoutSlotClick,
  showEditHint = false,
  forceIntact = false,
  clayUi = false,
}) => {
  if (compact) {
    return (
      <div className={`${styles.root} ${styles.rootFace} ${clayUi ? styles.rootClay : ''}`}>
        <button
          type="button"
          className={`${styles.faceHit} gamifyHunterPortrait`}
          onClick={onPortraitClick}
          aria-label={onPortraitClick ? 'Change avatar' : 'Hunter portrait'}
          disabled={!onPortraitClick}
        >
          {!clayUi && (
            <>
              <span className={`${styles.corner} ${styles.cornerTL}`} aria-hidden="true" />
              <span className={`${styles.corner} ${styles.cornerTR}`} aria-hidden="true" />
              <span className={`${styles.corner} ${styles.cornerBL}`} aria-hidden="true" />
              <span className={`${styles.corner} ${styles.cornerBR}`} aria-hidden="true" />
            </>
          )}
          <img className={`${styles.faceImg} gamifyHunterFace`} src={avatarSrc} alt="" />
          {showEditHint && (
            <span className={styles.editHint} aria-hidden="true">
              Edit
            </span>
          )}
        </button>
      </div>
    );
  }

  const lookBySlot = new Map(look.map((entry) => [entry.slot, entry]));
  const loadoutBySlot = new Map(loadout.map((entry) => [entry.slot, entry]));
  const interactiveLook = Boolean(onLookSlotClick);
  const interactiveLoadout = Boolean(onLoadoutSlotClick);
  const gear = sumDreamGearBonuses(look, forceIntact);

  const renderSlot = (slot: GearSlot) => {
    const equipped = lookBySlot.get(slot);
    const filled = Boolean(equipped?.itemName);
    const emptySlotSrc = resolveSlotSpriteUrl(slot);
    const condition = getDreamItemDurability(equipped?.item ?? null, forceIntact);
    const rarity = (equipped?.item?.rarity || 'common').toLowerCase();
    const label = equipped?.itemName || GEAR_SLOT_LABELS[slot];
    const className = [
      styles.slot,
      SLOT_POS[slot],
      filled ? styles.slotFilled : styles.slotEmpty,
      RARITY_CLASS[rarity] ?? styles.rarityCommon,
      selectedLookSlot === slot ? styles.slotSelected : '',
      mode === 'loadout' ? styles.slotDim : '',
      condition === 'worn' ? styles.slotWorn : '',
      condition === 'broken' ? styles.slotBroken : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        key={slot}
        type="button"
        className={`${className} gamifyHunterSlot`}
        title={label}
        aria-label={filled ? `${GEAR_SLOT_LABELS[slot]}: ${equipped?.itemName}` : `${GEAR_SLOT_LABELS[slot]} empty`}
        disabled={!interactiveLook}
        onClick={(event) => {
          event.stopPropagation();
          onLookSlotClick?.(slot);
        }}
      >
        {filled ? (
          <PixelIcon
            item={equipped?.item ?? { name: equipped?.itemName ?? '' }}
            fallback="⚔"
            className={styles.slotIcon}
            imgClassName={styles.slotImg}
          />
        ) : emptySlotSrc ? (
          <img className={`${styles.slotImg} ${styles.slotImgMuted}`} src={emptySlotSrc} alt="" />
        ) : (
          <span className={styles.slotIconMuted}>·</span>
        )}
      </button>
    );
  };

  return (
    <div
      className={[
        styles.root,
        compact ? styles.rootCompact : styles.rootDressing,
        mode === 'loadout' ? styles.rootLoadout : '',
        clayUi ? styles.rootClay : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.board}>
        <BoardLines />
        <div className={styles.ghostWrap}>
          <button
            type="button"
            className={`${styles.ghostHit} gamifyHunterPortrait`}
            onClick={onPortraitClick}
            aria-label={onPortraitClick ? 'Change avatar' : 'Hunter silhouette'}
            disabled={!onPortraitClick}
          >
            <GhostSilhouette faceSrc={avatarSrc} />
            {showEditHint && (
              <span className={styles.editHint} aria-hidden="true">
                Edit
              </span>
            )}
          </button>
          {renderSlot('body')}
        </div>
        {renderSlot('head')}
        {renderSlot('weapon')}
        {renderSlot('accessory')}
        {renderSlot('hands')}
        {renderSlot('tool')}
        {renderSlot('feet')}
      </div>

      {!compact && (
        <div className={styles.gearStats} aria-label="Stats from gear">
          <p className={styles.gearStatsTitle}>Stats from gear</p>
          <div className={styles.gearStatsRow}>
            <span>ATK {Math.round(gear.atk)}</span>
            <span>DEF {Math.round(gear.def)}</span>
            <span>HP {Math.round(gear.hp)}</span>
          </div>
        </div>
      )}

      {!compact && mode === 'loadout' && (
        <div className={styles.broughtRow} aria-label="Battle loadout">
          {LOADOUT_SLOTS.map((slot) => {
            const equipped = loadoutBySlot.get(slot);
            const filled = Boolean(equipped?.itemName);
            return (
              <button
                key={slot}
                type="button"
                className={[
                  styles.brought,
                  'gamifyHunterSlot',
                  filled ? styles.slotFilled : styles.slotEmpty,
                  selectedLoadoutSlot === slot ? styles.slotSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!interactiveLoadout}
                title={equipped?.itemName || LOADOUT_SLOT_LABELS[slot]}
                onClick={(event) => {
                  event.stopPropagation();
                  onLoadoutSlotClick?.(slot);
                }}
              >
                <span className={styles.broughtKey}>{LOADOUT_SLOT_LABELS[slot]}</span>
                {filled ? (
                  <PixelIcon
                    item={equipped?.item ?? { name: equipped?.itemName ?? '' }}
                    fallback="🧰"
                    className={styles.broughtIcon}
                    imgClassName={styles.broughtImg}
                  />
                ) : null}
                <span className={styles.broughtName}>
                  {filled ? equipped?.itemName : 'Empty'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
