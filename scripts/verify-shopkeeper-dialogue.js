#!/usr/bin/env node
/**
 * Verify and repair shopkeeper dialogue in plugin data.json
 * Run from plugin root: node scripts/verify-shopkeeper-dialogue.js
 */

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data.json");
const DEFAULT_GREETING = "Welcome to the Slop Shop! What would you like to buy today?";

function isCorrupted(overrides) {
  if (!overrides || typeof overrides !== "object") return false;
  const greeting = overrides.greeting ?? "";
  return (
    greeting.includes("undefined") ||
    greeting.includes("elcooe") ||
    greeting.includes("elccme") ||
    (greeting.includes("elcome") && !greeting.startsWith("Welcome"))
  );
}

function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.log("No data.json found at", DATA_PATH);
    return;
  }

  const raw = fs.readFileSync(DATA_PATH, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("Invalid JSON in data.json:", e.message);
    return;
  }

  const overrides = data.shopkeeperDialogueOverrides;
  if (!overrides) {
    console.log("✓ No shopkeeperDialogueOverrides - using defaults");
    return;
  }

  if (isCorrupted(overrides)) {
    console.log("⚠ Corrupted dialogue detected:", JSON.stringify(overrides, null, 2));
    data.shopkeeperDialogueOverrides = {};
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log("✓ Repaired: cleared shopkeeperDialogueOverrides");
  } else {
    console.log("✓ Dialogue overrides look valid");
  }
}

main();
