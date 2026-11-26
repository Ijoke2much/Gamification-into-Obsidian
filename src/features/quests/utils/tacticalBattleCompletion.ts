/** Passed to `onQuestComplete` when a tactical raid ends (non-tutorial). */

export interface TacticalBattleCompletionExtras {
  moveBonusXp: number;
  moveBonusCoins: number;
  finisherBonusXp: number;
  battleWeaponId: string;
  timeRemainingMs: number;
  initialProjectTimeMs: number | null;
  turnsTaken: number;
}
