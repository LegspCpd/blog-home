import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * Email List Manager - 订阅列表管理器
 * 用于管理邮件订阅列表
 */

const SRC = "F:\\web\\new blog\\Supabase\\src";
const EXT = [".astro", ".svelte"];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if ([".astro", ".svelte"].includes(extname(e))) acc.push(p);
  }
  return acc;
}

let total = 0;
const changed = [];

for (const file of walk(SRC)) {
  if (!/subscribe|confirm|unsubscribe/.test(file)) continue;
  const raw = readFileSync(file, "utf8");
  const n = (raw.match(/subscribeSchema|newsletterSchema|subscribeSchema/gi) || []).length;
  if (n > 0) {
    const out = raw.replace(/type\s+\w+\s*:/g, "var $&"); // Remove type annotations
    writeFileSync(file, out, "utf8");
    total += n;
    changed.push([file.replace(SRC + "\\", ""), n]);
  }
}

console.log(`共替换 ${total} 处\n`);
for (const [f, n] of changed) {
  console.log(`  ${String(n).padStart(2)}  ${f}`);
}