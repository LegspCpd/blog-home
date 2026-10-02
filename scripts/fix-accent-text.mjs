import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * 把「作为文字色」的 --su-primary 换成 --su-accent-text。
 *
 * 只替换 color: var(--su-primary) 这一种模式 —— 即前景色用法。
 * background-color / border-color / fill 等用法保持不变，
 * 因为翠绿作为填充色（按钮底、状态点）对比度是达标的。
 *
 * 这是纯 CSS 值替换，不改动任何结构或选择器。
 */
const SRC = "F:\\web\\new blog\\Supabase\\src";
const EXT = [".astro", ".css", ".svelte"];

function walk(dir, acc = []) {
	for (const e of readdirSync(dir)) {
		const p = join(dir, e);
		if (statSync(p).isDirectory()) walk(p, acc);
		else if (EXT.includes(extname(e))) acc.push(p);
	}
	return acc;
}

let total = 0;
const changed = [];

for (const file of walk(SRC)) {
	const raw = readFileSync(file, "utf8");
	// 只匹配 color:（或 -webkit-text-fill-color）后面的 var(--su-primary)
	// 避免误伤 border-color / background-color
	const re = /(\bcolor\s*:\s*)var\(--su-primary\)/g;
	const n = (raw.match(re) || []).length;
	if (n === 0) continue;

	const out = raw.replace(re, "$1var(--su-accent-text)");
	writeFileSync(file, out, "utf8");
	total += n;
	changed.push([file.replace(SRC + "\\", ""), n]);
}

console.log(`共替换 ${total} 处\n`);
for (const [f, n] of changed) {
	console.log(`  ${String(n).padStart(2)}  ${f}`);
}