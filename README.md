# LegspCpd Blog

> 个人博客源码 —— 记录学习、折腾与生活的碎片。

[![Site](https://img.shields.io/badge/站点-blog.legspcpd.top-3ecf8e)](https://blog.legspcpd.top)
![Astro](https://img.shields.io/badge/Astro-6.0.8-orange)
![Svelte](https://img.shields.io/badge/Svelte-5-ff3e00)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)
![Node.js >= 22](https://img.shields.io/badge/node.js-%3E%3D22-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)

线网站点：**<https://blog.legspcpd.top>**

---

## 关于本站

一个以内容为主、尽量克制装饰的个人博客。整体视觉参考 Supabase 的设计语言：
细发丝分隔线、灰阶层级、单一强调色，不做渐变与花哨动效。

主要特点：

- **静态生成** —— Astro 预渲染，首屏无 JS 阻塞，SEO 友好
- **SPA 式切换** —— 基于 Swup，站内跳转不整页刷新
- **可折叠侧栏** —— 展开 240px / 折叠 64px，状态用 Cookie 持久化，刷新不闪
- **全文搜索** —— Pagefind 索引 + 本地全文索引兜底，标题与正文均可检索
- **双主题** —— 亮色 / 暗色 / 跟随系统
- **首页精简** —— 只保留简介与入口，把注意力让给文章

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Astro 6（`output: static`，按 `DEPLOY_TARGET` 切换适配器） |
| 交互组件 | Svelte 5（runes 语法） |
| 样式 | Tailwind CSS v4（`@theme inline` 映射设计令牌） |
| UI 基础 | shadcn-svelte（luma 预设）+ bits-ui |
| 图标 | astro-icon / @iconify |
| 搜索 | Pagefind 1.4（Extended） |
| 代码高亮 | Expressive Code |
| 包管理 | pnpm 9 |

## 目录结构

```
.
├── src/
│   ├── components/          # 组件（common / layout / pages / svelte / ui …）
│   ├── config/              # 站点、侧栏、友链、项目等配置
│   ├── content/             # 文章（posts）与页面文案（spec）
│   ├── layouts/             # Layout.astro / SupabaseLayout.astro
│   ├── pages/               # 路由（首页、文章、归档、友链、搜索 …）
│   ├── styles/              # 全局样式与设计令牌
│   └── utils/               # 工具函数（头像解析、图标解析 …）
├── scripts/                 # 构建脚本（图标、Pagefind、IndexNow、i18n …）
├── public/                  # 静态资源（图片、音乐、demo、校验文件 …）
├── docs/                    # 部署与多语言说明
└── DESIGN-supabase.md       # 设计系统说明（排版 / 间距 / 圆角 / 用色）
```

## 本地运行

环境要求：**Node.js ≥ 22**、**pnpm ≥ 9**。

```bash
pnpm install     # 安装依赖
pnpm dev         # 启动开发服务器 → http://localhost:4321
```

常用命令：

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（端口 4321） |
| `pnpm build` | 生成图标 → 构建 → 生成搜索索引 → 推送 IndexNow |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm check` | Astro 类型与语法检查 |
| `pnpm lint` / `pnpm format` | Biome 检查 / 格式化 |
| `pnpm new-post` | 新建一篇文章 |

## 构建与部署

`pnpm build` 会依次执行：生成图标 → `astro build` → 生成 Pagefind 索引
→ 推送到 IndexNow。适配器由环境变量 `DEPLOY_TARGET` 决定：

```bash
pnpm build                # 默认（Vercel 适配器）
pnpm build:vercel         # Vercel
pnpm build:cloudflare     # Cloudflare Pages
pnpm build:edgeone        # EdgeOne Pages（纯静态）
```

平台的通用配置：

- 框架预设：`Astro`
- 构建命令：`pnpm run build`
- 输出目录：`dist`

更多细节见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。

## 搜索索引

站点使用 Pagefind 生成静态全文索引。构建产物会从 `dist/client/pagefind`
镜像到各平台的实际发布目录（`.vercel/output/static` 等），避免出现
「索引生成了但线上 404」的问题。此外还提供 `search-index.json`
作为兜底检索源，保证任何部署环境下搜索都能出结果。

## 设计系统

排版、间距、圆角与用色规范记录在 [`DESIGN-supabase.md`](DESIGN-supabase.md)，
核心约定：

- 字号阶梯只用 12 / 13 / 14 / 16 / 18 / 22 / 28 / 36 / 48 / 64
- 间距落在 8px 网格上，分区间距 64–96px
- 圆角：按钮与代码块 6px、卡片 12px、胶囊标签全圆角
- 层级靠细边框与灰色阶，仅用 `#3ecf8e` 一个强调色，且克制使用

## 致谢

本站基于开源主题 **[Firefly](https://github.com/CuteLeaf/Firefly)** 二次开发，
Firefly 又衍生于 [Fuwari](https://github.com/saicaca/fuwari)。感谢原作者的开源工作。

## 许可

代码遵循仓库内 [LICENSE](LICENSE) 声明；文章内容版权归作者所有，转载请先联系。
