/**
 * Pagefind 索引生成脚本（三平台通用）
 *
 * 解决的问题：
 *  - 使用 @astrojs/vercel / @astrojs/cloudflare adapter 时，静态页面输出在 dist/client，
 *    而 `pagefind --site dist` 在 dist 根目录扫不到任何 HTML，导致搜索索引从不生成。
 *  - 纯静态部署（EdgeOne）时页面直接在 dist 根目录。
 *
 * 本脚本自动探测包含 index.html 的目录根，再运行 pagefind，三平台构建脚本可完全一致。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 与 astro.config.mjs 的 outDir 一致：默认 dist，可用 OUT_DIR 覆盖
const distDir = path.join(rootDir, process.env.OUT_DIR || "dist");

function findStaticRoot(baseDir = distDir) {
  if (fs.existsSync(path.join(baseDir, "index.html"))) {
    return baseDir;
  }
  const clientDir = path.join(baseDir, "client");
  if (fs.existsSync(path.join(clientDir, "index.html"))) {
    return clientDir;
  }
  return null;
}

const staticRoot = findStaticRoot();

if (!staticRoot) {
  console.warn("[pagefind] Warning: no static directory containing index.html found; skipping search index generation.");
  process.exit(0);
}

console.log(`[pagefind] Static directory detected: ${staticRoot}`);

// 指定语言文件（与既有 pagefind.yml 一致）
const args = [
  "--site",
  staticRoot,
  "--force-language",
  "auto",
  "--exclude-selectors",
  "span.katex, span.katex-display, [data-pagefind-ignore], .search-panel, #search-panel",
];

const result = spawnSync(
  process.execPath,
  // 直接用 node 运行 pagefind 的 CLI 入口，避免 Windows 下 .bin 脚本带空格路径被 shell 误解析
  [path.join(rootDir, "node_modules", "pagefind", "lib", "runner", "bin.cjs"), ...args],
  { stdio: "inherit", shell: false },
);

if (result.error) {
  console.error("[pagefind] Error: indexing failed:", result.error.message);
  process.exit(result.status ?? 1);
}

/**
 * ⚠️ 关键修复：使用 Vercel / Cloudflare adapter 时，adapter 会在 `astro build`
 * 阶段就把静态产物复制到 `.vercel/output/static` / `.output/public`，
 * 而 Pagefind 是构建后才跑在 `dist/client` 上的 —— 于是索引永远不会进入部署目录，
 * 线上 `/pagefind/pagefind.js` 直接 404，搜索彻底失效。
 *
 * 这里把生成的索引同步复制到所有「真正的静态发布目录」。
 */
const generatedIndex = path.join(staticRoot, "pagefind");

const mirrorTargets = [
  path.join(rootDir, ".vercel", "output", "static"),
  path.join(rootDir, ".output", "public"),
  path.join(rootDir, ".netlify", "output", "public"),
].filter((dir) => {
  if (path.resolve(dir) === path.resolve(staticRoot)) return false;
  // 只有包含 index.html 的目录才是静态发布目录
  return fs.existsSync(path.join(dir, "index.html"));
});

if (fs.existsSync(generatedIndex)) {
  for (const target of mirrorTargets) {
    const dest = path.join(target, "pagefind");
    fs.cpSync(generatedIndex, dest, { recursive: true, force: true });
    console.log(
      `[pagefind] Index copied into deploy directory: ${path.relative(rootDir, dest)}`
    );
  }
  if (mirrorTargets.length === 0) {
    console.log(`[pagefind] Nothing to copy; index already lives in the publish directory: ${path.relative(rootDir, generatedIndex)}`);
  }
} else {
  console.warn("[pagefind] Warning: index directory was not generated; skipping copy step.");
}

process.exit(result.status ?? 0);