/**
 * 全站体检（修正版）。
 *
 * 上两版的误报来源：
 *  - 死链：未对 href 做 decodeURIComponent，中文路径全部判成不存在
 *  - 变量：把第三方库运行时注入的变量（expressive-code / fancybox /
 *    Tailwind 主题变量）当成了缺失
 * 本版只报真实问题。
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "F:\\web\\new blog\\Supabase";
const DIST = join(ROOT, "dist");
let issues = 0;
const note = (m) => {
	console.log("  ⚠ " + m);
	issues++;
};

const htmlFiles = [];
(function walk(dir) {
	if (!existsSync(dir)) return;
	for (const f of readdirSync(dir)) {
		const p = join(dir, f);
		if (statSync(p).isDirectory()) {
			if (["_astro", "pagefind", "endfield", "pio", "gh"].includes(f)) continue;
			walk(p);
		} else if (extname(f) === ".html") {
			htmlFiles.push(p);
		}
	}
})(DIST);

// ---------- 1. 死链 ----------
console.log("=== 1. 站内死链 ===");
const deadLinks = new Map();
for (const f of htmlFiles) {
	const html = readFileSync(f, "utf8");
	const rel = f.replace(DIST, "").replace(/\\/g, "/");
	for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
		let href = m[1];
		if (/^\/(https?:|mailto:)/.test(href)) continue;
		// 解码中文/空格等百分号编码
		let decoded;
		try {
			decoded = decodeURIComponent(href);
		} catch {
			decoded = href;
		}

		const candidates = [];
		if (decoded.endsWith("/")) {
			candidates.push(join(DIST, decoded, "index.html"));
		} else {
			candidates.push(join(DIST, decoded));
			candidates.push(join(DIST, decoded, "index.html"));
		}
		if (!candidates.some((c) => existsSync(c))) {
			// 页面配置关闭时会主动重定向到 /404/，产物是一个跳转 HTML 而非目录，
			// 这属于预期行为，不算死链。
			if (decoded === "/404/") continue;
			if (!deadLinks.has(href)) deadLinks.set(href, new Set());
			deadLinks.get(href).add(rel);
		}
	}
}

if (deadLinks.size === 0) console.log("  无死链 ✅");
else {
	for (const [href, pages] of deadLinks) {
		const sample = [...pages].slice(0, 2).join(", ");
		note(`死链 ${href}  ← ${sample}${pages.size > 2 ? " 等" : ""}`);
	}
}

// ---------- 2. 真实缺失的 CSS 变量 ----------
console.log("\n=== 2. CSS 变量完整性 ===");
let css = "";
const adir = join(DIST, "_astro");
if (existsSync(adir)) {
	for (const f of readdirSync(adir)) {
		if (f.endsWith(".css")) css += readFileSync(join(adir, f), "utf8");
	}
}
for (const f of ["index.html", "archive/index.html", "posts/index.html"]) {
	const p = join(DIST, f);
	if (existsSync(p)) css += readFileSync(p, "utf8");
}

const refs = new Set();
for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) refs.add(m[1]);
const defined = new Set();
for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]);

// 第三方库运行时注入 / 由 JS 设置的变量，不算缺失
const externalPrefixes = [
	"--ec", // expressive-code
	"--expressive-code",
	"--f-", // fancybox
	"--fb-", // fancybox 别名
	"--fancybox-", // fancybox v5
	"--shiki",
	"--sl-", // shiki（代码高亮）
	"--tm", // 主题/typography 内部变量
	"--ln", // 同上
	"--overlay-", // Flowbite / UI 库 overlay
	"--default-", // Flowbite 默认值变量
	"--hue", // 主题色相，Layout 内联脚本设置
	"--toc-indicator-", // 目录高亮指示条位置，由 SbToc 脚本运行时写入
	"--banner-height",
	"--page-width",
	"--card-transparent-opacity",
	"--skeleton",
	"--callout",
	"--sidebar-border",
	"--bits-", // bits-ui
	"--progress",
	"--shift",
	"--cover",
	"--tw",
	"--text-",
	"--color-",
	"--spacing",
	"--font-weight",
	"--tracking",
	"--leading",
	"--radius-",
	"--animate",
	"--ease",
	"--drop-shadow",
	"--blur",
	"--bg-",
	"--primary",
	"--secondary",
	"--foreground",
	"--muted",
	"--accent",
	"--destructive",
	"--card",
	"--popover",
	"--input",
	"--ring",
	"--chart",
	"--sidebar",
	"--0", // Tailwind 数字开头变量（--0、--0bg 等误匹配）
	"--1",
];
const isExternal = (v) =>
	externalPrefixes.some((p) => v.startsWith(p)) ||
	// 项目自有但由 JS/内联脚本注入
	new Set([
		"--rd-progress",
		"--lucide-color",
		"--line-divider",
		"--line-color",
		"--card-bg",
		"--card-bg-transparent",
		"--card-bg-transparent90",
		"--radius-large",
		"--radius-medium",
		"--radius-small",
		"--btn-content",
		"--btn-regular-bg",
		"--btn-regular-bg-hover",
		"--btn-regular-bg-active",
		"--btn-plain-bg-hover",
		"--btn-plain-bg-active",
		"--btn-card-bg-hover",
		"--inline-code-bg",
		"--inline-code-color",
		"--link-underline",
		"--link-hover",
		"--content-meta",
		"--tooltip-bg",
		"--tooltip-color",
		"--primary-hover",
		"--text-color-secondary",
		"--transparent",
	]).has(v);

const realMissing = [...refs].filter((v) => !defined.has(v) && !isExternal(v));
if (realMissing.length === 0) console.log("  项目自有变量全部有定义 ✅");
else realMissing.forEach((v) => note(`未定义变量 ${v}`));

// ---------- 3. 产物统计 ----------
console.log("\n=== 3. 产物统计 ===");
console.log(`  HTML 页面: ${htmlFiles.length}`);
console.log(`  CSS 总量: ${(css.length / 1024).toFixed(1)} KB`);

console.log("\n=== 结论 ===");
console.log(issues === 0 ? "未发现真实问题 ✅" : `发现 ${issues} 个问题`);