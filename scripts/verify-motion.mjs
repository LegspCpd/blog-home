/**
 * 动效验收：确认所有动效真的进了产物。
 *
 * 注意：压缩器会去掉属性值的引号（[data-active="true"] → [data-active=true]），
 * 且 ::before 可能被压成 :before。检查时必须用压缩后的形态比对，
 * 否则会得到一堆假 MISS。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "F:\\web\\new blog\\Supabase\\dist\\_astro";
let css = "";
for (const f of readdirSync(dir)) {
	if (f.endsWith(".css")) css += readFileSync(join(dir, f), "utf8") + "\n";
}
const flat = css.replace(/\s+/g, "").replace(/::/g, ":").replace(/"/g, "");

const keys = [
	["入场：淡入上浮", "@keyframessu-in-up"],
	["入场：左滑入", "@keyframessu-in-left"],
	["入场：缩放", "@keyframessu-in-scale"],
	["擦除动画", "@keyframessu-wipe"],
	["缓动令牌", "--su-ease-out:"],
	["回弹曲线", "--su-ease-spring:"],
	["级联步长", "--su-stagger:"],
	["延迟类 d8", ".su-d8{"],
	["卡片抬升", ".su-lift:hover{"],
	["按下反馈", ".su-press:active{"],
	["图标微移", ".su-nudge:hover"],
	["滚动渐入", ".rv.rv-in{"],
	["页面切出", "html.su-leaving#swup-container"],
	["页面切入", "html.su-entering#swup-container"],
	["主题过渡", "html.su-theme-shift"],
	["目录指示条", ".sb-toc:before"],
	["侧栏级联", ".su-nav-enter"],
	["导航指示条", "[data-sidebar=menu-button]:before"],
	["导航当前态", "[data-active=true]:before"],
	["reduced-motion", "prefers-reduced-motion:reduce"],
];

let miss = 0;
for (const [name, k] of keys) {
	const ok = flat.includes(k);
	if (!ok) miss++;
	console.log(`${ok ? "OK  " : "MISS"} ${name}`);
}

// JS 侧：数字计数与页面过渡脚本。
// 注意：Reveal / CountUp 用的是 <script is:inline>，产物里内联在 HTML 中，
// 不在 _astro/*.js。只扫 JS 会得到假 MISS。
const html =
	readFileSync(
		"F:\\web\\new blog\\Supabase\\dist\\stats\\index.html",
		"utf8",
	) +
	// 目录脚本只在文章页，且是普通 <script>（会被抽成独立 chunk），
	// 所以文章页的产物也要一起扫。
	readFileSync(
		"F:\\web\\new blog\\Supabase\\dist\\posts\\cf-ys\\index.html",
		"utf8",
	);
const htmlFlat = html.replace(/\s+/g, "");

console.log("");
for (const [name, k] of [
	["数字计数脚本", "data-counted"],
	["缓动函数 easeOutExpo", "Math.pow(2,-10*"],
	["页面过渡脚本", "su-leaving"],
	["目录指示条脚本", "--toc-indicator-y"],
	// 注意：产物经过压缩，函数名会被重命名，所以不能按函数名匹配，
	// 要按它写入的 CSS 变量 / DOM 操作来判定。
	["目录高亮（指示条显隐）", "--toc-indicator-opacity"],
	["目录高亮（滚到底兜底）", "scrollHeight"],
	["目录高亮（解绑重绑）", "astro:page-load"],
]) {
	const ok = htmlFlat.includes(k.replace(/\s+/g, ""));
	if (!ok) miss++;
	console.log(`${ok ? "OK  " : "MISS"} ${name}`);
}

console.log(`\n${miss === 0 ? "全部动效已生效 ✅" : `${miss} 项未生效 ❌`}`);