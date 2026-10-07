import { readFileSync, writeFileSync } from "node:fs";

const target = "F:\\web\\new blog\\Supabase\\src\\lib\\newsletter.ts";
const raw = readFileSync(target, "utf8");

// Remove type annotations
const cleaned = raw
  .replace(/type (\w+):\s*\w+/g, (match) => {
    // Remove type annotations but keep the variable name
    const match = match[0].replace(/type\s+(\w+)\s*:/g, "$1:");
    return match;
  });

// Check if changes were made
const original = readFileSync(target, "utf8");
if (raw !== content) {
  writeFileSync(target, content, "utf8");
  console.log("Fixed newsletter.ts");
} else {
  console.log("No changes needed");
}