---
title: EdgeOne 静态部署：从崩溃到稳定，一次完整的排查记录
published: 2026-10-03
tags: [EdgeOne, 部署, 前端, 排错]
category: 技术
description: 从 "Cannot find native binding" 到警告清零，这次把 EdgeOne 静态部署里踩过的坑完整记录下来。
draft: false
---

EdgeOne Pages 部署这个博客，过程不算顺利。这篇把踩过的坑按时间顺序记下来。

## 坑一：native binding 缺失

第一次部署直接在预渲染阶段崩了：

```
Error: Cannot find native binding.
npm has a bug related to optional dependencies.
  caused by: Cannot find module '@bruits/satteri-linux-x64-gnu'
```

Astro 7 的 Markdown 默认走 Rust 实现（Sätteri），它靠 napi 的平台包提供加速。这些平台包是**可选依赖**，在某些构建环境里没装上。

奇怪的是本地构建没问题。所以问题只在线上出现。

### 为什么本地没事

因为我的项目在 `astro.config.mjs` 里已经把渲染器换成了 unified：

```js
markdown: {
  processor: unified({ remarkPlugins: [...], rehypePlugins: [...] }),
}
```

Astro 7 起 Markdown 默认交给 Sätteri，我因为要用 remark/rehype 一大堆插件（KaTeX、callout、directive…），显式切回了 unified。**页面渲染这条路已经不碰 Sätteri 了。**

但 RSS 那条路径绕开了这个配置——它自己 new 了一个容器去渲染正文：

```ts
const container = await AstroContainer.create({ renderers });
const html = await container.renderToString(Content);
```

于是 Sätteri 又被拉起来了。

### 修法

先把 RSS 降级成只输出摘要，能构建了。但这治标不治本——RSS 就只剩标题，没内容了。

真正的修法是绕开整条链路，**直接读原始 markdown 文件**：

```ts
const raw = await readFile(fullPath, "utf8");
const { content } = matter(raw);
const html = await marked.parse(content, { gfm: true });
```

`marked` 和 `gray-matter` 本来就在依赖里，纯 JS，零原生依赖。RSS 内容从 6.7KB 涨回 38.7KB，而且 EdgeOne 构建不再需要任何原生包。

### 一个踩过的坑

第一版我用 `import.meta.url` 拼路径：

```ts
const contentDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../content/posts",
);
```

本地测试通过，但构建后 RSS 还是只有摘要。

原因：`import.meta.url` 在构建后指向**产物目录**（`dist/.vercel/...`），`src/content` 根本不在旁边。

正确做法是用 `process.cwd()`——构建和预览时进程工作目录都是项目根。

## 坑二：空目录不被 Git 跟踪

```
[WARN] [astro-icon] Failed to load icons from "src/icons":
       ENOENT: no such file or directory
```

本地有这个目录，CI 上没有。

原因很朴素：**git 不跟踪空目录**。我本地 `mkdir src/icons` 解决了问题，但没提交，所以线上照旧。

修法：

```bash
echo "" > src/icons/.gitkeep
```

这类问题的特点是本地怎么测都复现不了。

## 坑三：114 条警告淹没真正的报错

EdgeOne 构建能过了，但日志里有 114 条警告刷屏：

```
[WARN] `Astro.request.headers` was used when rendering the route `src/pages/404.astro'`.
```

63 个页面各触发两次。

根因是 `AppSidebar` 在 SSR 阶段读 `Astro.cookies` 决定侧栏初始折叠态，而静态预渲染时 cookies 内部会去访问 `request.headers`。

### 关键的转折

我一开始的处理是"按构建目标分流"——静态时不读 cookie。能消掉 EdgeOne 的警告，但 Vercel 上还有 57 条。

后来我去读 `SidebarStateSync.svelte`，发现它的注释描述了一套完整机制：

> 1. Layout.astro 的 head 内联脚本先在首次绘制前给 `<html>` 加标记类
> 2. hydration 完成后由本组件把 Svelte 状态对齐到 cookie
> 3. 状态一致后移除标记类

**注释写得很清楚，但这套机制从来没被实现过。**

也就是说，SSR 读 cookie 之所以必要，正是因为缺了这套首屏同步机制。

于是我把它补上：

```js
// Layout.astro 的 head 内联脚本
try {
  var m = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/);
  if (m && m[1] === "false") {
    document.documentElement.classList.add("su-sidebar-collapsed");
  }
} catch (e) {}
```

CSS 据此在首次绘制前就给出正确的 64px 轨道宽度和文字隐藏，hydration 后再由 Svelte 对齐并移除标记类（宽度不变，所以不产生动画）。

补完之后，`AppSidebar` 根本不需要读 cookie 了。

**Vercel 57 → 0，EdgeOne 0，干净。**

## 一点总结

这三次排查有个共同点：**症状都在表面，根因都不在表面。**

- 崩溃报的是"缺原生包"，实际是我让一条路径绕过了渲染器配置
- 图标报的是"目录不存在"，实际是 git 不跟踪空目录
- 警告报的是"访问了 request"，实际是注释里写着一套没实现的机制

我的教训是：**看到警告先别急着绕过去，先读一遍它上下文的代码。** 那些"看起来多余的注释"，有时候恰恰是唯一记录真实意图的地方。

## 现在的构建

```
> pnpm build:edgeone
🔍 扫描源文件中的图标使用...
📁 找到 58 个源文件
✅ 成功加载 21 个图标
[build] 63 page(s) built in 12.42s
[build] Complete!
```

零警告，零错误，12 秒。