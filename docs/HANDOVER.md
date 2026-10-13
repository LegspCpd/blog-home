# 项目交接记录（HANDOVER）

> 这份文件是**唯一权威的上下文来源**。新会话开始时先完整读它，
> 再读 `docs/adr/` 与 `CONTEXT.md`，不要凭记忆推断本项目的历史决定。
>
> 最后更新：2026-10-14 · 对应提交区间 `96e6c71` → 未提交工作区
> （工作区当时有 21 处改动，见文末「当前状态」）

---

## 1. 这个项目是什么

`F:\web\new blog\Supabase` 是我的个人博客，线上域名 **https://legspcpd.asia**。

**当前目标（用户 2026-10-12 明确的）**：把界面**彻彻底底**做成
[Furry-Xiyi/WinUIonWeb](https://github.com/Furry-Xiyi/WinUIonWeb) 的样子 ——
不是"参照它的风格另写一套"，而是**把上游仓库本体当作组件库直接吃进来**，
让站点里的导航、卡片、按钮全部是上游真实的 WinUI 3 复刻控件。
用户原话：「往死里做，复刻这种样子，让他能够完完整整的做进去，架构随便你」。

用户明确授权：**架构选择由我决定，不必逐步请示**。

---

## 2. 技术栈与版本（照抄，别猜）

| 组件 | 版本 | 备注 |
| --- | --- | --- |
| astro | 7.3.4 | 静态输出 |
| @astrojs/vue | 7.0.3 | |
| vue | 3.5.43 | **与上游 WinUIonWeb 的 devDependencies 完全一致**，已核对 |
| vite | 8.x（Rolldown 内核） | Vite 8 用 Rolldown 而非 Rollup，行为差异见 §5.4 |
| pnpm | 见 `packageManager` 字段 | 不要用 npm |
| WinUIonWeb | `file:..\WinUIonWeb\WinUIonWeb` | 克隆在 `F:\web\new blog\WinUIonWeb\WinUIonWeb`，上游提交 `e3bef96` |

**上游仓库位置**：`F:\web\new blog\WinUIonWeb\WinUIonWeb`
- 它是**独立可运行项目**，自带 `index.html` + `vite.config.ts` + 完整 Gallery 应用
  （`src/gallery/`，762 文件 / 265 个 `.vue` 控件），许可证 GPL-3.0-only
- 它的源码里有大量**权威用法示例**（尤其 `src/gallery/App.vue`），
  遇到控件不会用时，**先读它，不要试错**

---

## 3. 环境与命令速查

### 网络
所有需要联网的操作（pnpm 安装、克隆、curl）走本地代理：

```powershell
$env:HTTP_PROXY='http://127.0.0.1:19780'
$env:HTTPS_PROXY='http://127.0.0.1:19780'
```

npm 源用 `--registry=https://registry.npmmirror.com`。用 `pnpm add`，**不要用 `npm install`**。

### 常用命令

```bash
pnpm build            # astro build（当前 54 页）
pnpm check            # astro check，类型与诊断
pnpm a11y             # 对比度 / 语义结构 / 键盘可达性
pnpm visual           # 视觉检查
node scripts/probe-page.cjs <路由> [宽] [高]      # ★ 主力验证工具，见 §6
node scripts/probe-page.cjs / 1440 900             # 量首页真实 DOM
PROBE_SHOT=C:/Users/Administrator/shots/x.png node scripts/probe-page.cjs / 1440 900   # 顺带截图
PROBE_WAIT=90000 node scripts/probe-page.cjs http://localhost:5199/...   # 测外部站点
```

### Windows / Git Bash 的坑（都踩过）
- Git Bash 会把 `/navtest/` 这种参数**转成 Windows 路径**，跑脚本时要加 `MSYS_NO_PATHCONV=1`
- PowerShell 里调 chrome 用 `& $ch`；变量插值写 `"${v}:"` 不是 `"$v:"`
- ripgrep 不支持 `(?=…)` 前瞻
- `node -e` 里的引号容易被 shell 吃掉，**写成临时文件再跑**

---

## 4. 架构（当前实现）

```
Astro 页面（服务端渲染正文与页标题，SEO / RSS / sitemap 全部保留）
  └─ layouts/Base.astro            ← <html class="theme-dark">（必须！见 §5.9）
       └─ <WinShell client:load>   ← SSR 安全的外层，只做动态加载
            └─ WinShellClient.vue  ← 真实 WinUI 应用壳，只在客户端加载
                 ├─ TitleBar              窗口标题栏：应用图标 + 名称
                 ├─ NavigationView        左侧导航
                 │    ├ AutoSuggestBox    窗格内搜索（对齐 WinUI Gallery）
                 │    ├ MenuItems / FooterMenuItems
                 │    └ Content           ← <slot />，正文从这里进来
                 │         └─ PageHeader.astro  52px 页标题（**Astro 渲染**）
                 └─ Footer.astro
```

### 为什么是两层 Vue 组件（WinShell / WinShellClient）
WinUIonWeb 的控件在 `setup()` 阶段就读 `window` 和主题资源，静态 import 会让
Astro 的 SSR 直接抛 `window is not defined`。
`WinShell.vue` 只在 `onMounted` 里 `await import("./WinShellClient.vue")`，
所以后者的静态 import 永远不会在服务端执行。

### 为什么页标题用 Astro 渲染而不是 NavigationView 的 Header
NavigationView 的 `Header` 属性是**客户端渲染**的。把它当 `<h1>` 用会让
静态 HTML 里根本没有 h1 —— 构建全绿、页面好看，但搜索引擎和读屏拿到的是
一个没有标题的页面（`scripts/a11y-check.mjs` 实测报了 `no <h1>`）。
所以页面标题交回 `PageHeader.astro`，几何按官方规格复刻：

| 项 | 官方规格 | 实现 |
| --- | --- | --- |
| 高度 | 固定 52px | `min-height: 52px` |
| 字号字重 | 28px / 600 | 同 |
| 左内边距 | 内容区 24px | 同 |
| 语义 | 页面标题 | `<h1>`，每页恰好一个 |

外壳那边 `AlwaysShowHeader="false"`，避免出现两个标题。
**首页是例外**：它自己画 hero 大标题（官方 Gallery 首页也是这个做法），
hero 里的 `<h1>` 就是该页的唯一 h1。

### 搜索结果
`TitleBar` + `NavigationView` 都是上游真实控件，只有页标题是 Astro 渲染的
（因为 SEO 硬约束）。其余视觉全部来自上游 Fluent 令牌，见 §4 下文。

### 设计令牌：直接消费上游的 Fluent 变量
`src/styles/design.ts` 里所有颜色**不再是我挑的**，而是引用
`var(--app-bg, #202020)` 这类 Fluent 自定义属性 ——
这些变量由上游 `theme.css` 定义在 `:root`，而 `src/vue-app.js` 已经全局 import 了它。

运行时实测值（2026-10-14，`probe-page.cjs` 读出）：

| 令牌 | 值 |
| --- | --- |
| `--app-bg` | `rgb(32, 32, 32)` = #202020 |
| `--card-bg` | `rgba(255, 255, 255, 0.05)` |
| `--text-primary` | `rgb(255, 255, 255)` |
| `--text-secondary` | `rgba(255, 255, 255, 0.77)` |
| `--accent-base` | `rgb(76, 194, 255)` = #4CC2FF |

**这么做不只是省事**：NavigationView / Button / ScrollViewer 读的是同一批变量。
只要站点也读它们，配色就永远跟控件走，不会出现"卡片是自定义色、旁边控件是 Fluent 色"的割裂。
每个引用都带 WinUI 3 暗色的官方兜底值，CSS 未加载时不会闪白。

---

## 5. 已解决的关键坑（**每条都有证据，别再重新推导**）

> 这一节是全文最重要的部分。下面每一条都是**花了很多轮才定位到**的，
> 重来一次的成本极高。改动前请先读完。

### 5.1 ★ 生产构建打进两份 Vue，全站白屏（最贵的坑）

**症状**：`pnpm dev` 完全正常；`pnpm build` 后页面全白，控制台只有一句
```
TypeError: Cannot read properties of null (reading 'refs')
    at setRef ← patch ← componentUpdateFn ← setupRenderEffect ← mountComponent
```
**极具误导性** —— 看起来像 Vue 内部 bug、或控件写错了，实际都不是。

**根因**：`astro.config.mjs` 的 `vite.resolve` 只让 `@vitejs/plugin-vue` 默认 dedupe 了
`"vue"`，但 Vue 的运行时是由 `@vue/runtime-core`、`@vue/runtime-dom`、
`@vue/reactivity`、`@vue/shared` 分拆再 re-export 的。
生产构建因此打进了**两份 Vue**：

```
dist/_astro/runtime-core.esm-bundler.*.js   67 KB   ← 第一份（Astro 客户端渲染器用）
dist/_astro/vue-app.*.js                    2.27 MB ← 第二份，整个 Vue 内联在里面
```

判别方法：`__v_skip` 在两边的出现次数。修复前 `vue-app` 里有 11 次，修复后 0 次。

**为什么会导致 `refs` 为 null**：两份 Vue 各有自己的模块级变量
`currentRenderingInstance`。WinUI 组件里的 `h()` 走第二份，渲染却由第一份驱动，
于是第二份的 `currentRenderingInstance` 恒为 `null`；带 `ref` 的 vnode 得到
`owner = null`（`normalizeRef` 把 owner 存进 `rawRef.i`），patch 时
`setRef` 执行 `owner.refs` 就崩了。dev 模式模块实例唯一，所以不犯病。

**修复**（`astro.config.mjs`）：
```js
resolve: {
  dedupe: ["vue", "@vue/runtime-core", "@vue/runtime-dom", "@vue/reactivity", "@vue/shared"],
}
```

**验证**：`probe-page.cjs` 读生产构建，`shell: 1 / navMenu: 1 / navItem: 4`，
控制台无错误。修复后 `vue-app` 从 2 277 108 B 降到 2 198 509 B。

### 5.2 必须开 `features.prodDevtools`

上游 `vite.config.ts` 有这行，注释是：
> *"The XAML runtime resolves page bindings from Vue setupState.
> Production template inlining otherwise hides that scope."*

链路：`features.prodDevtools` → `@vitejs/plugin-vue` 的 `config` 钩子写入
`define.__VUE_PROD_DEVTOOLS__ = true`，同时把 `@vue/compiler-sfc` 的
`devToolsEnabled` 置真。生产环境若为假，SFC 编译器会把模板**内联进 `setup()`**，
`setupState` 作用域消失，而 WinUIonWeb 的 XAML 运行时正是从这个作用域解析页面绑定的。

`@astrojs/vue` 会把 options 原样透传给 `vue()`（`dist/index.js:85-94`
`const vueOptions = { ...options, template: {...} }`），所以直接在集成里写：

```js
vue({ appEntrypoint: "./src/vue-app.js", features: { prodDevtools: true } })
```

**注意**：这一条**不是** 5.1 那个崩溃的原因（开它之后崩溃依旧），
但它是**功能正确性所必需**的。两件事都要做。

### 5.3 `appEntrypoint` 必须是相对路径

`@astrojs/vue` 只对 `startsWith(".")` 的值做 `path.resolve(root, …)`；
非 `.` 开头的会被当成**裸模块说明符**丢给浏览器 → 入口永不执行 → 控件全部未注册
→ 页面空白但**构建照过**。必须写 `"./src/vue-app.js"`。

### 5.4 Rolldown 会摇掉匿名箭头默认导出

`export default (app) => { app.use(...) }` 会被 Vite 8 / Rolldown 当作无副作用摇掉，
产物里只剩具名导出。`@astrojs/vue` 生成的是
`if ('default' in mod) await mod.default(app)`，于是 setup 静默不执行。
**必须用命名函数**：`export default function setupWinUI(app) { … }`。

### 5.5 NavigationView 的权威用法与我的第一直觉相反

来自上游 `src/gallery/App.vue`：

```html
<NavigationView MenuItemsSource="{x:Bind navMenuItems, Mode=OneWay}"
                ItemInvoked="onNavigationItemInvoked" ...>
  <router-view />   <!-- 默认插槽是「页面内容」，不是菜单项！ -->
</NavigationView>
```

- **菜单项走 `MenuItemsSource` 属性**，值是纯 POJO 数组
  `{ Tag, Icon, Content, MenuItems }`；`Icon` 是 Segoe Fluent Icons 字形码，
  也可以是 vnode（上游用 `markRaw(h(ImageIcon, {...}))`）
- **不是** vnode、**不需要** `MenuItemTemplate`
- `NavigationViewItem` / `NavigationViewMenuItems` 这些「XAML 属性组件」
  只在 `src/components/NavigationViewProperties.ts` 里，
  **不在 `src/index.ts` 的导出表里** —— 这是必须 alias 到上游 `src` 的原因
- `ItemInvoked` 的值是**函数名字符串**，由 XAML 运行时从 `setupState` 解析

### 5.6 测量假象：窄视口下 NavigationView 整体不渲染

**同一份构建产物**，只改视口：

| 视口 | 结果 |
| --- | --- |
| 1100×800 | 正常渲染（截图 42128 B） |
| 900×400 | **整体不渲染**（截图 19335 B） |

窄视口会走 compact / overlay 分支。我曾在 900×400 下测了四种菜单写法，
全部"失败"，据此得出的结论**全部作废**。

**因此：所有验证必须固定视口。** `probe-page.cjs` 用
`Emulation.setDeviceMetricsOverride` 设 1280×900 或 1440×900，
**不要**再用 `chrome --window-size` 截图来判断控件是否工作。

### 5.7 静态服务器端口撞车，自检会误判通过

机器上有别的服务监听在 9200–9250 区间（返回 JWT 错误页）。
`python -m http.server` 若绑定失败，请求会落到那个服务上、**返回 200**，
自检通过但页面根本不是我们的 —— 测出来的空白是假象。

`probe-page.cjs` 因此改为 **Node 自建静态服务器**（监听 0 端口由系统分配），
并断言返回内容里含 `astro-island` 或 `<html>`。

### 5.8 上游源码被我插过调试桩，已还原

排查过程中我在 `WinUIonWeb/src/components/NavigationView.vue` 插过多次
globalThis 探针。**已 `git checkout` 还原**。
上游目录当前只有 `package.json` / `package-lock.json` 两处改动（与本次调试无关）。
改动上游前请先 `git -C "F:/web/new blog/WinUIonWeb/WinUIonWeb" status` 确认状态。

---

### 5.9 ★ `html` 必须带 `theme-dark`，否则控件拿到浅色令牌

上游 `theme.css` 把**浅色**令牌定义在 `:root`，**深色**定义在 `.theme-dark`。
不声明主题类时是混合状态：`--app-bg` 有 `:root:not(.theme-light)` 的深色兜底，
但 `--text-primary` / `ControlStroke` 等仍是浅色值。

实测后果：窗格里的搜索框是 `color: rgba(0,0,0,0.894)`、
`border-bottom-color: rgba(0,0,0,0.894)` —— 黑字黑边压在深色底上，完全看不清。
修复就是 `<html lang="zh-CN" class="theme-dark">`。

判别方法（`probe-page.cjs` 的 `searchBg` 字段）：
```json
{ "color": "rgb(255, 255, 255)", "boxBorder": "rgb(255, 255, 255)" }   // 正确
{ "color": "rgba(0, 0, 0, 0.894)", "boxBorder": "rgba(0, 0, 0, 0.894)" } // 缺主题类
```

### 5.10 页头里放 `<h1>` 会导致 SEO 退化

NavigationView 的 `Header` 是客户端渲染的。把页面标题放进它，静态 HTML 里
**一个 `<h1>` 都没有**：构建全绿、页面好看、`pnpm check` 也过，
但 `scripts/a11y-check.mjs` 会在 `[2] Semantic structure` 报 `no <h1>`。

正确做法：页面标题由 Astro 渲染（`src/components/win/PageHeader.astro`，
几何按官方 52px 规格），外壳 `AlwaysShowHeader="false"`。
每页**恰好一个 h1**，可用 `grep -o "<h1" dist/**/index.html | wc -l` 核对。

### 5.11 标签只差大小写 → Windows 上互相覆盖

`cf-ys.md` 写 `CloudFlare`、`cf-cname.md` 写 `Cloudflare`。Windows/macOS 的
文件系统不区分大小写，两个标签页落到同一个输出目录互相覆盖；Linux 上却是两个
目录 ——**这个问题在本地表现为"某个标签页 404"，在 CI 上完全看不出来**。

所以检查必须读**内容源**而不是产物：`scripts/audit-routes.cjs` 末尾的
「标签大小写」一节就是干这个的，任何平台都能抓到。

### 5.12 favicon 路径写错，全站 54 个页面都在 404

`Base.astro` 引用的是 `/favicon.ico`，而文件实际在 `/favicon/favicon.ico`。
每次访问都产生一条 404，在探针日志里伪装成"无关噪音"，实际是真实缺陷。
现已改为正确的路径，并补上深浅两套 PNG 与 apple-touch-icon。

## 6. 验证方法（**必须这么做，不要用截图代替**）

### 主力工具：`scripts/probe-page.cjs`

它做四件事：起 chrome（CDP）+ 自建静态服务器（内容校验）+ 固定视口 + 读**真实 DOM**。

```bash
MSYS_NO_PATHCONV=1 node scripts/probe-page.cjs / 1440 900
```

输出示例（修复后的首页）：
```json
{ "islandCount": 1, "islandInnerLen": 25854,
  "shell": 1, "menuHost": 1, "navMenu": 1,
  "navItem": 5, "navItemText": ["首页","归档","标签","RSS","GitHub"],
  "h1": ["LegspCpd Blog", "写点有意思的东西"],
  "fluent": { "appBg": "rgb(32, 32, 32)", "accent": "rgb(76, 194, 255)" } }
```

**判定标准**：`shell / navMenu ≥ 1`、`navItem ≥ 4`、无 `[exc]` 段。

> 历史教训：我曾两次未经 CDP 校验就宣布"控件已挂载"，
> 两次都是误读截图。**只认 probe 的 DOM 计数。**

### CI（`.github/workflows/ci.yml`）
构建通过 ≠ 产物正确，所以 CI 额外断言：
- 设计令牌真的内联进 HTML（现在校验的是 `var(--…)` 形态，见脚本内注释）
- 对比度：`scripts/a11y-check.mjs` 已升级为**解析 `var()` 兜底值 + alpha 合成**，
  因为 Fluent 大量使用半透明图层，直接拿 rgba 分量算会偏乐观
- 结构化数据、sitemap 可达性、sitemap/RSS/域名一致性

---

## 7. 凭据与环境变量（**本文件不含任何密钥值**）

> 这个仓库推送到 GitHub（`https://github.com/LegspCpd/blog-home`）。
> **真实密钥绝不能写进会被提交的文件** —— CI 日志、fork、镜像都会带走。
> 密钥值统一放在**被 gitignore 的** `.notes/secret-values.local.md`（本地文件），
> 或直接放在 GitHub Secrets 里。

| 名称 | 类型 | 存放位置 | 用途 / 获取方式 |
| --- | --- | --- | --- |
| `EDGEONE_API_TOKEN` | GitHub Secret | 仓库 Settings → Secrets and variables → Actions | EdgeOne Pages 部署。获取：console.cloud.tencent.com/edgeone/makers → 项目 → API Token |
| `EDGEONE_PROJECT_NAME` | GitHub Secret（可选） | 同上 | 默认 `blog-home` |
| `HTTP_PROXY` / `HTTPS_PROXY` | 本地环境变量 | 会话内 `export` | 本机代理 `http://127.0.0.1:19780` |

**未配置 `EDGEONE_API_TOKEN` 时**，部署 workflow 会输出 notice 并**直接成功退出**
（故意如此，保持主分支绿色）。

GitHub 仓库：`LegspCpd/blog-home`，主分支 `main`。
**注意**：CI 与部署 workflow 都只监听 `main`；早期版本监听 `master`，等于从未生效。

---

## 8. 当前状态（2026-10-14）

### 验证结果（全部通过）
| 检查 | 覆盖 | 结果 |
| --- | --- | --- |
| `pnpm build` | 53 页 | 通过 |
| `pnpm check` | 类型与诊断 | 0 error / 0 warning / 3 hint |
| `pnpm a11y` | 对比度 + 语义 + 键盘 | 全过 |
| `node scripts/audit-routes.cjs` | 53 条路由逐页 | 0 渲染问题 / 0 断链 / 0 标签冲突 |

### 已完成
- ✅ **WinUI 3 应用壳**：`TitleBar`（图标 + 名称）+ `NavigationView`
  （窗格内 AutoSuggestBox 搜索 / 带图标菜单 / 底部页脚项 / 蓝色选中指示条）
- ✅ **页标题**：Astro 渲染的 52px 页头，每页恰好一个 `h1`
- ✅ **深色主题**：`html.theme-dark`，控件令牌不再是浅色残留
- ✅ **设计系统**：全部引用上游 Fluent 令牌；字体 Segoe UI Variable；正文 14px
- ✅ **Fluent 卡片**：8px 圆角 / 半透明图层 / 描边 hover
- ✅ **站内搜索**：标题栏下方的窗格搜索框，对构建期生成的索引做本地过滤
- ✅ 删除死代码 `src/lib/theme/` 与死依赖 `@fluentui/tokens`、`@fluentui/web-components`
- ✅ 删除全部调试页面与脚本（`navtest` / `navmount` / `NavDiag` / `WinProbe` / `_deep` / `_nav` / `glyphs`）
- ✅ 修掉 4 个真实缺陷：favicon 404、标签大小写冲突、搜索框浅色令牌、页头 SEO 退化

### 待办
1. **设置页**：`IsSettingsVisible` 目前是 `false`。
   重新打开它需要一个真实的 `/settings/` 页面（官方 Gallery 有这个入口，
   纯装饰的空菜单项反而是坏体验）。
2. **CI 的「Verify design tokens are inlined」步骤需要复核**：
   它断言 `--c-base:#[0-9a-fA-F]{6}`（字面色值），而现在 `--c-base` 是
   `var(--app-bg, #202020)`，该断言**会失败**。这是当前最可能让 CI 变红的点。
3. **首页之外的页面排版还能再贴近官方**：归档页现在已对齐；文章详情页的
   正文排版（标题层级、代码块、引用）仍是通用样式，可再按 Fluent 收紧。
4. **依赖瘦身**：`package.json` 里还留着上一代主题的依赖
   （`@astrojs/starlight`、`svelte`、`tailwind-*`、`swup`、`pagefind`、`katex`、
   `satori`、`photoswipe`、各种 `@iconify-json/*` 等），本项目已不使用。
5. **图标字体限制**：见 §9 的「图标」一节 —— Windows 之外的平台字形会缺失。

## 9. 上游仓库使用备忘

- 上游源码 alias：`winui-src` → `F:\web\new blog\WinUIonWeb\WinUIonWeb\src`
  （**必须 alias 到 `src`**，因为 `NavigationViewProperties.ts` 不在包出口里）
- 上游官方编译产物在 `dist-lib/`（`index.js` + `style.css`），
  但它**不导出** `NavigationViewMenuItems` 这类属性组件，XAML 写法走不通 ——
  所以只能用源码 alias
- 上游自己的 Gallery 一键启动：`cd 上游目录 && npx vite --port 5199`
  然后用 `PROBE_WAIT=90000 node scripts/probe-page.cjs http://localhost:5199/WinUIonWeb/ 1280 900` 验证
  （首次加载要转换整棵组件图，等待时间要给足；实测 `navItem: 102` 为正常值）
- 上游生产构建：`npx vite build` + `npx vite preview --port 5200`
  实测**同样正常**（`navItem: 102`）—— 这是判定"问题在上游还是在我们"的黄金对照

### 参考的 Fluent 令牌真值（WinUI 3 Dark）
```
--app-bg        #202020
--card-bg       rgba(255,255,255,0.0512)
--card-bg-secondary rgba(255,255,255,0.0326)
--subtle-secondary  rgba(255,255,255,0.0605)
--subtle-tertiary   rgba(255,255,255,0.0419)
--text-primary  #FFFFFF
--text-secondary rgba(255,255,255,0.77)
--text-tertiary  rgba(255,255,255,0.53)
--text-disabled  rgba(255,255,255,0.36)
--accent-base   #4CC2FF
--accent-text   #000000
图标字体：'Segoe Fluent Icons'
```

---

## 10. 工作纪律（用户反复强调过）

1. **不许用截图代替 DOM 校验。** 只认 `probe-page.cjs` 的计数。
2. **不许用绕过 astro-island / 自己写 createApp 的探针来证明"控件已挂载"。**
   我曾这么干过，被用户当场纠正。探针必须跑真实页面。
3. **宣布修复前要做反向验证** —— 确认检查真的会失败，而不是恰好通过。
4. **测量环境必须先自证有效**（视口、服务器内容），否则结论无效。
   §5.6 与 §5.7 两次翻车都源于此。
5. 用户已授权自主推进，**不要为常规决定反复请示**；
   但涉及删数据、改密钥、发布上线这类不可逆动作，仍要明确说明再动。
