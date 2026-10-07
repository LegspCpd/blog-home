/**
 * 无障碍检查：对比度 + 语义结构 + 键盘可达性
 * 用法：node scripts/a11y-check.mjs
 * 读 dist/ 产物，纯静态分析，不依赖浏览器。
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";

const DIST = "dist";
let failures = 0;
const fail = (m) => {
  failures++;
  console.log("  FAIL " + m);
};
const pass = (m) => console.log("  ok   " + m);

/** 相对亮度（WCAG 2.1） */
function luminance(hex) {
  const c = hex.replace("#", "");
  const full =
    c.length === 3
      ? c
          .split("")
          .map((x) => x + x)
          .join("")
      : c;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ---- 1. 直接从设计系统取实际色值，算对比度 ----
// 检查的对象必须和页面真正用的数据是同一份：这里 import 的 design.ts
// 就是页面注入 :root 的那一份，不重新解析 CSS，避免检查到幻觉。
console.log("\n[1] Contrast ratios (WCAG AA needs 4.5 for body, 3.0 for large)");
const { canvas, text, neon } = await import("../src/styles/design.ts");

const checks = [
  ["body      body/base", text.body, canvas.base, 4.5],
  ["secondary muted/base", text.muted, canvas.base, 4.5],
  ["tertiary  faint/base", text.faint, canvas.base, 3.0],
  ["headline  ink/base", text.ink, canvas.base, 4.5],
  ["card      body/s1", text.body, canvas.s1, 4.5],
  ["card      muted/s1", text.muted, canvas.s1, 4.5],
  ["link      volt/base", neon.volt, canvas.base, 4.5],
  ["cta       onNeon/volt", text.onNeon, neon.volt, 4.5],
  ["inline mint/inset", neon.mint, canvas.inset, 4.5],
];

for (const [label, fg, bgc, min] of checks) {
  if (!fg || !bgc) {
    fail(`${label}: missing value`);
    continue;
  }
  const r = contrast(fg, bgc);
  const ok = r >= min;
  (ok ? pass : fail)(`${label} = ${r.toFixed(2)} (need ${min})`);
}

// ---- 2. 每页语义结构 ----
console.log("\n[2] Semantic structure");
const pages = [
  "index.html",
  "posts/making-blog-feel-like-claude/index.html",
  "archive/index.html",
  "tags/index.html",
  "404.html",
];
for (const p of pages) {
  const f = `${DIST}/${p}`;
  if (!existsSync(f)) {
    fail(`${p} missing`);
    continue;
  }
  const html = readFileSync(f, "utf8");
  const issues = [];
  if (!/<html[^>]+lang=/.test(html)) issues.push("no lang on <html>");
  if (!/<h1[\s>]/.test(html)) issues.push("no <h1>");
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s > 1) issues.push(`${h1s} <h1> (should be 1)`);
  if (!/<meta[^>]+name="description"/.test(html)) issues.push("no meta description");
  if (!/<link[^>]+rel="canonical"/.test(html)) issues.push("no canonical");
  if (!/<title>[^<]+<\/title>/.test(html)) issues.push("no <title>");

  if (issues.length) fail(`${p}: ${issues.join("; ")}`);
  else pass(`${p}: lang/h1/desc/canonical/title all present`);
}

// ---- 3. 交互元素可访问性 ----
console.log("\n[3] Interactive elements");

// 3a. 全站导航：每页都要有带无障碍名的导航、main、以及跳过导航入口
for (const p of pages) {
  const html = readFileSync(`${DIST}/${p}`, "utf8");
  const hasNav = /<nav[^>]*aria-label=/.test(html);
  const hasMain = /<main[\s>]/.test(html);
  const hasSkip =
    /class="skip|skip-to-content|跳到主内容|skip-link/i.test(html) ||
    /href="#main"/.test(html);

  const issues = [];
  if (!hasNav) issues.push("no <nav aria-label>");
  if (!hasMain) issues.push("no <main>");
  if (!hasSkip) issues.push("no skip-to-content link");

  // skip-link 必须真的有样式，否则它会一直挂在页面左上角
  if (hasSkip) {
    let css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)]
      .map((m) => m[1])
      .join("\n");
    const astroDir = `${DIST}/_astro`;
    if (existsSync(astroDir)) {
      for (const f of readdirSync(astroDir)) {
        if (f.endsWith(".css")) css += readFileSync(`${astroDir}/${f}`, "utf8");
      }
    }
    if (!/\.skip-link[^{]*\{/.test(css)) {
      issues.push("skip-link has markup but NO CSS rule (would always be visible)");
    }
  }

  issues.length ? fail(`${p}: ${issues.join("; ")}`) : pass(`${p}: nav/main/skip ok`);
}

// 3b. 图片 alt 与空链接
const idx = readFileSync(`${DIST}/index.html`, "utf8");
const imgs = [...idx.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
const noAlt = imgs.filter((t) => !/\balt=/.test(t));
(noAlt.length ? fail : pass)(
  `home: ${imgs.length} <img>, ${noAlt.length} missing alt`
);
const links = [...idx.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
const emptyLinks = links.filter(
  (t) => !/aria-label=/.test(t) && /href="#"|href=""/.test(t)
);
(emptyLinks.length ? fail : pass)(
  `home: ${links.length} <a>, ${emptyLinks.length} empty href/aria-less`
);

console.log(
  failures === 0 ? "\nRESULT: all a11y checks passed" : `\nRESULT: ${failures} failure(s)`
);
if (failures) process.exitCode = 1;