# Firefly 多平台部署指南

本项目一套代码可同时部署到 **Vercel**、**Cloudflare Pages**、**EdgeOne Pages** 三个平台，
各平台通过环境变量 `DEPLOY_TARGET` 自动选择对应的构建 adapter，无需改代码。

---

## 构建命令一览

| 平台 | 命令 | 输出目录 | 动态接口支持 |
|------|------|----------|--------------|
| Vercel（默认） | `pnpm build` 或 `pnpm build:vercel` | `dist`（含 `.vercel/output`） | ✅ `/api/indexnow`、`/gh/*` |
| Cloudflare Pages | `pnpm build:cloudflare` | `dist/client` | ✅ `/api/indexnow`（自动转 CF Function）、`/gh/*` |
| EdgeOne Pages | `pnpm build:edgeone` | `dist` | ✅ 通过 Edge Function（手动配置） |

> 说明：`pnpm build` 未设置 `DEPLOY_TARGET` 时默认走 Vercel，与原有行为完全一致。

---

## 一、Vercel

**构建命令**：`pnpm build`（或 `pnpm build:vercel`）
**输出目录**：不填 / `dist`（Vercel 自动识别 serverless 输出）

要点：
- 使用 `@astrojs/vercel`，保留全部动态能力（`/api/indexnow`、`/gh/*`）。
- 无需任何额外配置，保持现状即可。

---

## 二、Cloudflare Pages

**构建命令**：`pnpm build:cloudflare`
**输出目录**：`dist/client`
**环境变量**：无需手动设置（`cross-env` 已注入 `DEPLOY_TARGET=cloudflare`）

要点：
- 使用 `@astrojs/cloudflare@13`（兼容 Astro 6）。
- `prerenderEnvironment: "node"` 已配置，保证含 `node:fs` 的构建期逻辑（gallery / OG 图）正常。
- `/api/indexnow` 会被自动编译为 Cloudflare Function，动态接口可用。

> 若使用 `wrangler` CLI 手动部署：`wrangler pages deploy dist/client`

---

## 三、EdgeOne Pages

**构建命令**：`pnpm build:edgeone`
**输出目录**：`dist`
**环境变量**：无需手动设置（脚本内部固定 `DEPLOY_TARGET=static`）

要点：
- EdgeOne 没有官方 Astro adapter，因此采用**纯静态输出**（无 adapter）。
- `build:edgeone` 会自动临时移出两条 `prerender=false` 的动态路由（`api/indexnow`、`gh/[...path]`），
  构建完成后再自动恢复，不影响 Vercel / Cloudflare 构建。
- 静态部署后 `/api/indexnow` 与 `/gh/*` 需通过 **Edge Function** 承载（见下）。

### EdgeOne Edge Function 配置

1. 打开 EdgeOne 控制台 → **站点** → **Edge Functions**。
2. 新建 Edge Function，将 **`docs/edgeone-edge-function.js`** 的内容粘贴进去。
3. 绑定触发规则（URL 匹配）：
   - `/api/indexnow` → 触发（GET / POST）
   - `/gh/*` → 触发
4. 保存并发布。

此函数为 `/api/indexnow`（IndexNow URL 提交）与 `/gh/*`（GitHub 反向代理）提供与
Vercel / Cloudflare 一致的功能。若不配置，这两条路径返回 404，其余功能不受影响；
站点收录仍由构建时的 `scripts/ping-indexnow.js` 自动完成。

---

## 常见问题

**Q：EdgeOne 上访问首页报错 / 显示异常？**
确认输出目录填的是 `dist`，且构建命令是 `pnpm build:edgeone`（不能用默认 `pnpm build`，
否则会生成 serverless 格式、`dist` 根目录没有 `index.html`）。

**Q：站内搜索没结果？**
本项目已修复 pagefind 索引生成（自动探测 `dist` 或 `dist/client`）。
若仍异常，检查构建产物中是否存在 `pagefind/` 目录；没有则说明构建未跑完 pagefind 步骤。

**Q：本地 Windows 构建报 EPERM / 产物被清空？**
Windows Search 索引服务（SearchIndexer）会占用 `dist` 下文件，触发 Astro 收尾清理失败。
这是本机环境问题，不影响 Linux CI（三平台构建服务器）。可用 `OUT_DIR=dist-check` 指向
全新目录临时验证。

---

## 相关文件

- `astro.config.mjs` — 按 `DEPLOY_TARGET` 切换 adapter
- `scripts/build-pagefind.js` — 搜索索引生成（多平台通用）
- `scripts/build-edgeone.js` — EdgeOne 纯静态构建编排
- `scripts/prepare-static-build.js` — 动态路由暂移/恢复
- `docs/edgeone-edge-function.js` — EdgeOne Edge Function 代码