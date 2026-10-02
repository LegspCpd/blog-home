/**
 * 对比度检查：算出设计令牌两两组合的 WCAG 对比度。
 * 目的：找出「看起来还行但实际不达标」的配色。
 */
const L = (hex) => {
	const s = hex.replace("#", "");
	const n = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
	const v = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
	const lin = v.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
	return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

const ratio = (a, b) => {
	const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
};

// 从 supabase-tokens.css 里抠出实际值
const src = await import("node:fs").then((fs) =>
	fs.readFileSync(
		"F:\\web\\new blog\\Supabase\\src\\styles\\supabase-tokens.css",
		"utf8",
	),
);

function tokens(block) {
	// 取 :root { … } 或 :root.dark { … } 里的变量
	const start = src.indexOf(block);
	if (start === -1) return {};
	const from = src.indexOf("{", start);
	const to = src.indexOf("}", from);
	const body = src.slice(from, to);
	const out = {};
	for (const m of body.matchAll(/(--su-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
		out[m[1]] = m[2].slice(0, 7);
	}
	return out;
}

const light = tokens(":root {");
const dark = tokens(":root.dark {");

// 检查项：前景 / 背景 组合，以及各自的用途
const PAIRS = [
	["--su-foreground", "--su-background", "正文 / 页面背景", 4.5],
	["--su-foreground", "--su-card", "正文 / 卡片", 4.5],
	["--su-foreground", "--su-canvas-soft", "正文 / 次级表面", 4.5],
	["--su-muted-foreground", "--su-background", "次级文字 / 页面", 4.5],
	["--su-muted-foreground", "--su-card", "次级文字 / 卡片", 4.5],
	["--su-ink-faint", "--su-background", "三级文字 / 页面", 3],
	["--su-ink-faint", "--su-card", "三级文字 / 卡片", 3],
	["--su-accent-text", "--su-background", "强调文字 / 页面", 4.5],
	["--su-accent-text", "--su-card", "强调文字 / 卡片", 4.5],
	["--su-accent-text", "--su-canvas-soft", "强调文字 / 次级表面", 4.5],
	["--su-primary-deep", "--su-background", "深翠绿 / 页面（悬停态）", 3],
	["--su-primary", "--su-background", "翠绿填充 / 页面（非文本）", 1.3],
	["--su-primary-foreground", "--su-primary", "按钮文字 / 翠绿", 4.5],
	["--su-border", "--su-background", "边框 / 背景（非文本，仅观感）", 1.0],
	["--su-hairline-strong", "--su-background", "强边框 / 背景", 1.5],
];

function report(name, t) {
	console.log(`\n=== ${name} ===`);
	console.log("用途".padEnd(30) + "比值   判定");
	let fails = 0;
	for (const [fg, bg, label, min] of PAIRS) {
		const f = t[fg];
		const b = t[bg];
		if (!f || !b) {
			console.log(`${label.padEnd(28)} 缺少令牌`);
			continue;
		}
		const r = ratio(f, b);
		const ok = r >= min;
		if (!ok) fails++;
		const mark = ok ? "OK  " : "FAIL";
		console.log(
			`${label.padEnd(28)} ${r.toFixed(2).padStart(5)}  ${mark} (需 ≥${min})`,
		);
	}
	return fails;
}

const f1 = report("亮色模式", light);
const f2 = report("暗色模式", dark);

console.log(`\n=== 结论 ===`);
const total = f1 + f2;
console.log(total === 0 ? "全部达标 ✅" : `${total} 项未达 WCAG AA`);
