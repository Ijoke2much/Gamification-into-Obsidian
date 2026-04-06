// Default shopkeeper dialogue strings and helper to resolve overrides

export interface ShopkeeperDialogueOverrides {
  greeting?: string;
  purchaseConfirmation?: string;
  purchaseSuccess?: string;
  purchaseFollowUp?: string;
  farewell?: string;
  noThanks?: string;
  insufficientFunds?: string;
  addItem?: string;
  addArtifact?: string;
  imageUpdated?: string;
}

export const DEFAULT_SHOPKEEPER_DIALOGUE: Required<ShopkeeperDialogueOverrides> = {
  greeting: "Welcome to the Slop Shop! What would you like to buy today?",
  purchaseConfirmation: "Are you sure you want to buy \"{item}\" for {price} {currency}?\n\nEffects: {effects}",
  purchaseSuccess: "Excellent choice! You've purchased \"{item}\" for {price} {currency}. It's been added to your inventory!",
  purchaseFollowUp: "Take a look around! I've got plenty of interesting items for sale.",
  farewell: "Come back anytime!",
  noThanks: "Maybe next time! Let me know if you change your mind.",
  insufficientFunds: "Not enough {currency}! You need {amount} more to buy that {item}.",
  addItem: "A new item, {item}, has been added to the shop!",
  addArtifact: "A new artifact, {item}, has been added to the shop!",
  imageUpdated: "Shopkeeper image updated!",
};

/** Zero-width and other invisible chars that can corrupt display */
const INVISIBLE_CHAR_REGEX = /[\uFEFF\u200B\u200C\u200D\u2060\u00AD]/g;

/** Known corruption patterns for greeting */
const GREETING_CORRUPTION_PATTERNS = /undefined|elcooe|elccme|^[eE]lcome/;

/** Detect if dialogue overrides are corrupted and should be reset */
export function isDialogueCorrupted(overrides?: ShopkeeperDialogueOverrides | null): boolean {
  if (!overrides || typeof overrides !== "object") return false;
  const keys: (keyof ShopkeeperDialogueOverrides)[] = [
    "greeting", "purchaseConfirmation", "purchaseSuccess", "purchaseFollowUp", "farewell", "noThanks",
    "insufficientFunds", "addItem", "addArtifact", "imageUpdated"
  ];
  for (const key of keys) {
    const val = overrides[key];
    if (typeof val !== "string") continue;
    if (val.includes("undefined")) return true;
    if (val.includes("elcooe")) return true;
    if (val.includes("elccme")) return true;
    if (key === "greeting" && val.includes("elcome") && !val.startsWith("Welcome")) return true;
    if (key === "greeting" && !val.startsWith("W") && val.toLowerCase().includes("elcome")) return true;
  }
  return false;
}

/** Final safety gate: ensure dialogue is safe for display; fall back to default if corrupted */
export function ensureSafeForDisplay(
  text: string,
  key: keyof ShopkeeperDialogueOverrides = "greeting"
): string {
  const cleaned = sanitizeDialogueString(text);
  const defaultVal = DEFAULT_SHOPKEEPER_DIALOGUE[key];
  if (!cleaned) return defaultVal;
  if (cleaned.includes("undefined")) return defaultVal;
  if (key === "greeting" && GREETING_CORRUPTION_PATTERNS.test(cleaned)) return defaultVal;
  return cleaned;
}

/** Sanitize a single dialogue string - remove invisible chars and undefined */
export function sanitizeDialogueString(s: string): string {
  return s
    .replace(INVISIBLE_CHAR_REGEX, "")
    .replace(/undefined/g, "")
    .replace(/^\uFEFF/, "")
    .trim();
}

/**
 * Get the effective dialogue string (override or default)
 */
export function getShopkeeperDialogue(
  key: keyof ShopkeeperDialogueOverrides,
  overrides?: ShopkeeperDialogueOverrides | null
): string {
  const val = overrides?.[key];
  const raw = val !== undefined && val !== "" ? val : DEFAULT_SHOPKEEPER_DIALOGUE[key];
  const sanitized = sanitizeDialogueString(raw);
  return sanitized || DEFAULT_SHOPKEEPER_DIALOGUE[key];
}

/**
 * Replace placeholders in a dialogue template.
 * Uses empty string for undefined vars to never produce "undefined" in output.
 */
export function fillDialogueTemplate(
  template: string,
  vars: { item?: string; price?: string | number; amount?: string | number; currency?: string; effects?: string }
): string {
  let result = template;
  // Use ?? '' to never pass undefined to replace (avoids "undefined" in output)
  result = result.replace(/\{item\}/g, String(vars.item ?? ""));
  result = result.replace(/\{price\}/g, String(vars.price ?? ""));
  result = result.replace(/\{amount\}/g, String(vars.amount ?? ""));
  result = result.replace(/\{currency\}/g, String(vars.currency ?? ""));
  result = result.replace(/\{effects\}/g, String(vars.effects ?? ""));
  return sanitizeDialogueString(result);
}
