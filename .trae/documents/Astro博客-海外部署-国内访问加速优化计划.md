# Astro 博客海外部署（Vercel / Cloudflare / EdgeOne）国内访问加速优化计划

## Summary（目标与原则）

目标：在**不使用大陆服务器/不依赖备案**的前提下，提升国内访问速度与稳定性，优先改善：

1. 首屏可读内容出现速度（TTFB / LCP）
2. 首屏交互与滚动流畅度（TBT / INP）
3. 静态资源下载与复访速度（Cache 命中率）

核心原则：

- **不修改文章内容**：不改动 Markdown/MDX 文章正文与元数据（例如 `src/content/**`、`content/**`、`posts/**`、`*.md/*.mdx` 等）。
- 仅在必要时调整“展示层/构建层/部署层”以加速（配置、组件加载策略、缓存头、重写规则等）。
- 任何涉及 `/gh/*`（Edge 动态代理）的改动必须保持功能可用。

---

## Current State Analysis（基线现状）

### 1) 项目结构与关键文件（已定位）

- Astro 配置：`astro.config.mjs`
- Vercel 部署头部：`vercel.json`
- 路由与页面：`src/pages/**`
- 全局布局：`src/layouts/Layout.astro`
- 图片组件：`src/components/common/ImageWrapper.astro`、`src/components/common/CoverImage.astro`

### 2) 渲染方式：并非纯 static（一处明确动态）

存在动态路由：

- `src/pages/gh/[...path].astro`：
  - `export const prerender = false;`
  - `export const runtime = 'edge';`

结论：站点不是“纯静态一把梭”，至少 `/gh/*` 需要函数/边缘能力承载；其余页面可尽量保持预渲染与静态资源缓存。

### 3) 主要性能风险点（已发现）

1. **客户端 JS 上岛偏多且偏早**：多个组件使用 `client:load`（首屏即加载与 hydration），典型位置：
   - `src/components/layout/Navbar.astro`：Search / LightDarkSwitch / DisplaySettings 等
   - `src/pages/posts/[...slug].astro`：SharePoster
   - `src/pages/archive.astro`：ArchivePanel（`client:only="svelte"`）
2. **全局 Layout 注入较重脚本**：
   - `src/components/features/MusicManager.astro`：大量 `script is:inline`
   - `src/components/features/SpineModel.astro`：启用 Spine，并会加载外部 runtime（`unpkg`）
3. **缓存头覆盖不完整**：
   - `vercel.json` 目前仅对 `/_astro/*` 设置了长缓存
   - `public/` 下大量静态资源路径（如 `/assets/*`、`/pio/*`、`/gallery/*` 等）尚无统一长缓存策略

---

## Proposed Changes（改造方案：按收益/风险排序）

> 说明：下述“要改的文件”均为**配置与组件层**，不涉及文章内容目录与文章正文。

### A. 静态资源缓存策略补齐（低风险 / 高收益）

#### A1) Vercel：完善 `vercel.json` 的 headers 覆盖面

**要改的文件**
- `vercel.json`

**怎么改（策略）**
1. 保留现有 `/_astro/*`：`Cache-Control: public, max-age=31536000, immutable`
2. 新增对以下路径的长缓存（如存在）：
   - `/assets/*`
   - `/gallery/*`
   - `/favicon/*`
   - `/pio/*`
   - 其他确认来自 `public/` 的静态路径
3. 为 HTML（页面类响应）增加 CDN 缓存策略（不影响浏览器实时刷新）：
   - `Cache-Control: public, max-age=0, s-maxage=600`（或更大）并配合 `stale-while-revalidate=86400`
4. 对 `/gh/*`（若允许）增加边缘缓存：减少重复回源 GitHub（需确认内容可缓存与安全性）

**为什么**
- 国内跨境访问最大的成本在“第一次回源 + 资源下载”；长缓存与 SWR 能显著提升复访和多用户命中。

#### A2) Cloudflare Pages：新增 `_headers`（仅用于 CF 分支）

**要新增/维护的文件（若采用 CF Pages）**
- `public/_headers`（或按 Cloudflare Pages 约定的 headers 文件）

**怎么改**
- 复用与 Vercel 等价的缓存策略：
  - `/_astro/*`、`/assets/*`、`/pio/*` 等：长缓存 immutable
  - HTML：`max-age=0` + `s-maxage` + `stale-while-revalidate`

**为什么**
- 在 Cloudflare 分支，缓存头是否生效直接决定国内“体感慢/快”。

#### A3) EdgeOne Pages：新增/维护 `edgeone.json` 的 headers/rewrites（仅用于 EdgeOne 分支）

**要新增/维护的文件（若采用 EdgeOne Pages）**
- `edgeone.json`

**怎么改**
- `headers`：同样补齐静态资源长缓存、HTML 的边缘缓存策略
- `rewrites`（可选）：将体积巨大的静态资源（如音频）重写到对象存储/CDN 域名（见 D1）

**为什么**
- EdgeOne 的缓存/重写能力需要显式配置；默认策略往往不足以覆盖 blog 的所有静态资源路径。

---

### B. “首屏不必要 JS”延迟加载（中低风险 / 高收益）

#### B1) 将 `client:load` 调整为 `client:idle` / `client:visible`

**要改的文件**
- `src/components/layout/Navbar.astro`
- `src/pages/posts/[...slug].astro`
- （视情况）`src/pages/archive.astro`、`src/pages/search.astro`

**怎么改（原则）**
- 不影响首屏可读内容的功能：从 `client:load` 改为 `client:idle` 或 `client:visible`
  - Navbar 的设置/主题/搜索：优先 `client:idle`
  - 文章页 SharePoster：通常不在首屏关键内容，改为 `client:visible` 或 `client:idle`
  - 仅在用户进入对应功能页（比如 search 页）才需要立即加载

**为什么**
- Astro 的优势是“默认 0 JS”；把上岛时机推迟，能直接降低首屏 JS 体积与主线程执行开销。

---

### C. Music/Spine 等重功能：从“全站注入”改为“用户触发后加载”（中风险 / 很高收益）

> 该项对速度提升通常最大，但需要更谨慎验证功能回归。

#### C1) MusicManager：避免首屏解析大段 inline 脚本

**要改的文件**
- `src/layouts/Layout.astro`
- `src/components/features/MusicManager.astro`
- `src/config/musicConfig.ts`

**怎么改（策略）**
- 保留 UI 入口，但将核心逻辑改为：
  - 用户点击/交互后再 `import()` 相关模块
  - 或至少在 `requestIdleCallback` 后才执行初始化

**为什么**
- 解析/执行大段 inline JS 会抬高 TBT，并延后 LCP 及交互可用时间。

#### C2) SpineModel：从首屏加载外部 runtime 改为按需

**要改的文件**
- `src/layouts/Layout.astro`
- `src/components/features/SpineModel.astro`
- `src/config/pioConfig.ts`

**怎么改（策略）**
- 首屏不拉 spine runtime；在用户首次交互或进入特定页面时再加载
- （可选）加入 `preconnect` 到 runtime 域名，减少握手成本

**为什么**
- 第三方 CDN（如 unpkg）在国内可达性不稳定；不应该成为首屏关键路径。

---

### D. 大体积静态资源（如音频）卸载到对象存储并重写（可选，高收益但涉及部署策略）

#### D1) 不改文章链接的“URL 保持不变”方案

**目标**
- 仍然访问 `/assets/music/**`，但实际由对象存储/CDN 域名承载（例如 Cloudflare R2 / 其他海外存储）。

**要改的文件（按平台）**
- Vercel：`vercel.json`（rewrites）
- Cloudflare：Worker/Pages 路由重写配置（若采用）
- EdgeOne：`edgeone.json`（rewrites）

**为什么**
- `public/assets/music/*` 会显著增加部署体积与发布耗时，并且音频资源通常不应与站点同源同仓承载。

---

### E. 远程图片与字体优化（视现状启用）

#### E1) 远程图片统一优化（避免原图直出拖慢 LCP）

**要改的文件（候选）**
- `src/components/common/CoverImage.astro`
- `src/components/common/ImageWrapper.astro`
- `astro.config.mjs`（若要启用平台图片服务）

**策略**
- 若封面/头像使用远程图床：引入平台图片优化能力或边缘代理，使其输出合适尺寸 + WebP/AVIF。

#### E2) 字体加载策略（避免首屏字体成为瓶颈）

**要改的文件（候选）**
- `src/components/common/Markdown.astro`
- `src/components/features/FontManager.astro`

**策略**
- 确认 `@fontsource-variable/jetbrains-mono` 是否在首屏无条件加载；必要时延迟加载或只保留 woff2/子集。

---

## Assumptions & Decisions（关键假设与决策）

1. “不要破坏文章”解释为：不修改文章 Markdown/MDX 内容与文章元数据文件；允许修改布局/组件以改善加载策略，只要页面渲染结果不丢内容、不影响链接。
2. 三平台都需要一套可落地的策略，但会以“缓存策略一致、动态路由 `/gh/*` 兼容”为核心。
3. `/gh/*` 的功能必须保留；任何缓存增强都以“内容安全可缓存”为前提（必要时对用户态/私有内容禁用缓存）。

---

## Verification（验证与回归检查）

### 1) 功能回归（必测）
1. 首页、文章页、归档页、搜索页可正常访问
2. `/gh/*` 代理功能正常（含链接重写）
3. 暗色/亮色切换、设置面板、搜索功能在延迟加载后仍可用
4. Music/Spine（若启用按需加载）在用户触发后可正常播放/展示

### 2) 性能验证（建议同时对三平台做对比）
1. 浏览器 DevTools：
   - 首屏 JS 请求数量与体积下降
   - Long Task 减少，TBT/INP 改善
2. `curl -I` 检查关键路径缓存头：
   - `/_astro/*`：`max-age=31536000, immutable`
   - `public/` 静态资源路径（`/assets/*`、`/pio/*` 等）：同上
   - HTML：`s-maxage` 与 `stale-while-revalidate` 生效（平台相关）
3. 多次访问同一资源确认缓存命中（平台响应头如 `x-vercel-cache`、`cf-cache-status` 等）

---

## Implementation Notes（执行注意事项）

- 执行改动前建议先确认：文章内容目录（例如 `src/content/**`）不被编辑；仅动列出的配置/组件文件。
- 每改一项（尤其是 Music/Spine）都要做功能回归与性能对比，避免“优化导致功能不可用”。

