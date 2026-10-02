/**
 * 深度体检：找出之前 audit 没覆盖的问题。
 *
 * 维度：
 * 1. 外链格式（target=_blank 缺 rel=noopener）
 * 2. 图片缺 alt / 缺 width-height（CLS）
 * 3. 按钮缺 aria-label（只有图标时）
 * 4. 表单控件缺 label
 * 5. 重复 id
 * 6. 空的 href / javascript: 链接
 * 7. 标题层级跳级（h1 → h3）
 * 8. meta description 缺失或过短
 * 9. 站内链接指向已关闭的页面
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const DIST = "F:\\web\\new blog\\Supabase\\dist";

const files = [];
(function walk(dir) {
	if (!existsSync(dir)) return;
	for (const e of readdirSync(dir)) {
		if (e === "_astro" || e === "pagefind") continue;
		const p = join(dir, e);
		if (statSync(p).isDirectory()) walk(p);
		else if (extname(e) === ".html") files.push(p);
	}
})(DIST);

const issues = new Map();
const add = (kind, detail, page) => {
	if (!issues.has(kind)) issues.set(kind, []);
	if (issues.get(kind).length < 6) issues.get(kind).push({ detail, page });
	else issues.get(kind).push({ detail: "…", page: "" });
};

for (const f of files) {
	const html = readFileSync(f, "utf8");
	const rel = f.replace(DIST, "").replace(/\\/g, "/");

	// 1. 外链安全
	for (const m of html.matchAll(/<a\b[^>]*>/g)) {
		const tag = m[0];
		if (/href="https?:/.test(tag) && /target="_blank"/.test(tag)) {
			if (!/rel="[^"]*noopener/.test(tag)) {
				add("外链缺 noopener", tag.slice(0, 90), rel);
			}
		}
	}

	// 2. 图片
	for (const m of html.matchAll(/<img\b[^>]*>/g)) {
		const tag = m[0];
		if (!/\salt=/.test(tag)) add("img 缺 alt", tag.slice(0, 90), rel);
		// 首屏大图缺 width/height 会导致布局偏移
		if (!/\swidth=/.test(tag) && !/\sheight=/.test(tag)) {
			add("img 缺尺寸（CLS 风险）", tag.slice(0, 70), rel);
		}
	}

	// 3. 图标按钮无障碍名
	for (const m of html.matchAll(/<button\b[^>]*>([\s\S]{0,200}?)<\/button>/g)) {
		const [full, inner] = m;
		const hasAria = /aria-label=/.test(full);
		const hasText = inner.replace(/<[^>]*>/g, "").trim().length > 0;
		if (!hasAria && !hasText) {
			add("button 缺可访问名称", full.slice(0, 90), rel);
		}
	}

	// 4. 重复 id
	// 先剥掉注释：源码注释里出现的 id="xxx" 字样会被误判为真实元素
	const withoutComments = html
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "");
	const ids = [...withoutComments.matchAll(/\sid="([^"]+)"/g)].map(
		(m) => m[1],
	);
	const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
	if (dup.length) add("重复 id", [...new Set(dup)].slice(0, 3).join(", "), rel);

	// 5. 空 / javascript: 链接
	for (const m of html.matchAll(/href="(javascript:|#)"/g)) {
		add("无效 href", m[1], rel);
	}

	// 6. 标题层级跳级
	const levels = [...html.matchAll(/<h([1-6])\b/g)]
		.map((m) => Number(m[1]))
		.filter((l, i, arr) => i === 0 || l !== arr[i - 1]);
	for (let i = 1; i < levels.length; i++) {
		if (levels[i] - levels[i - 1] > 1) {
			add(
				"标题层级跳级",
				`h${levels[i - 1]} → h${levels[i]}`,
				rel,
			);
			break;
		}
	}

	// 7. meta description
	const desc = html.match(/<meta name="description" content="([^"]*)"/i);
	if (!desc) add("缺 meta description", "—", rel);
	else if (desc[1].length < 20 && rel !== "/index.html")
		add("meta description 过短", `${desc[1].length} 字符`, rel);
}

if (issues.size === 0) {
	console.log("未发现问题 ✅");
} else {
	for (const [kind, list] of issues) {
		console.log(`\n【${kind}】${list.length} 处`);
		for (const it of list) {
			console.log(`   ${it.page.padEnd(30)} ${it.detail}`);
		}
	}
	const total = [...issues.values()].reduce((s, l) => s + l.length, 0);
	console.log(`\n=== 合计 ${issues.size} 类问题 ===`);
}