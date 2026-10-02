---
title: 一次部署瘦身 45MB 的过程
published: 2026-10-08
tags: [前端, 部署, 性能, 工程实践]
category: 技术
description: 顺手写了个脚本量产物体积，发现 170MB 里有 45MB 从未被任何页面引用。以及一个关于"自引用误判"的坑。
draft: false
---

整理文件时看到 `dist` 有 170MB，顺手想看看都是什么。

结果量出来是这样：

```
other   122.72 MB   538 个   71.7%
img      34.82 MB   419 个   20.3%
html      8.04 MB   107 个    4.7%
js        2.95 MB    85 个    1.7%
css       0.68 MB    32 个    0.4%
```

一个博客站点，170MB。

## 大头是什么

`other` 占 71.7%，这说明大部分文件不是常见的图片/JS/CSS。往下钻：

```
assets     92.6 MB   →  assets/music 91.8 MB
demo       39.7 MB   →  Live2D 模型
pio        16.4 MB   →  Spine 模型
endfield    4.0 MB
```

`assets/music` 是音乐播放器的曲目，能理解。但 `demo`、`pio`、`endfield` 这些是什么？

翻了下 git 历史，这是上游 Firefly 主题带的演示素材：Live2D 模型、Spine 模型、Endfield 联动资源。合并进来看一眼挺好，但**线上一个页面都没引用过它们**。

## 怎么确认「真的没引用」

这是关键。我不想凭目录名猜，于是写了个脚本，扫描产物里所有 html/js/json/css，提取出被引用的资源路径，再跟这些目录对撞。

第一遍结果：

```
/demo                39.7 MB / 524 文件  ❌ 未被任何页面引用
/pio                 16.4 MB /  96 文件  ❌ 未被任何页面引用
/endfield             4.0 MB / 305 文件  ❌ 未被任何页面引用
```

看起来可以直接删。但我没删。

## 一个自引用的坑

我先写了清理脚本跑了一遍，结果它告诉我：

```
[prune] 保留 demo/ —— 产物中仍存在引用（39.7 MB）
```

跟我手工扫的结果矛盾。

排查后发现是**自引用**：我在扫描时把 `demo/` 目录**自己内部的 JS 文件**也读了进去，而那些模型加载脚本里写着 `/demo/...` 这样的路径。于是它在自己内部找到了引用。

修正很简单——扫描时跳过候选目录本身：

```js
function collectText(dir, acc = [], excludeDirs = []) {
  for (const entry of readdirSync(dir)) {
    if (excludeDirs.includes(entry)) continue;
    // ...
  }
}
```

改完再跑，`demo/` 干净利落地被清掉了。

## 保守原则

即使修正了自引用，我还是给清理脚本加了严格的限制：

```js
const CANDIDATES = ["demo", "endfield", "iku", "lt", "yd", "test"];
```

只有列表里的才可能删，不做模糊匹配。删之前再扫一遍产物确认零引用，拿不准就保留。

`pio/` 我**故意没放进列表**，因为它的配置文件里写着 `enabled: true`——静态扫看不出来，但运行时可能在动态加载。

原则很简单：**宁可不删，也不能删错。** 45MB 的收益，不值得冒线上白屏的风险。

## 只清产物，不动源文件

还有一点：清理只针对 `dist/`，`public/` 里的原文件一个不动。

```
EdgeOne 构建
  ├─ 暂移动态路由
  ├─ astro build（拷贝 public/ 到 dist）
  ├─ pagefind 索引
  ├─ prune-unused-assets dist   ← 只删产物
  ├─ IndexNow 推送
  └─ 恢复动态路由
```

这样本地开发完全不受影响，你随时能打开 `public/demo` 看那些模型。

## 效果

```
170 MB → 126 MB
```

每次部署少传 45MB。对 EdgeOne Pages 来说，上传时间、构建缓存命中、CDN 回源都会受益。

## 顺便做的另一件事

扫首屏的时候还发现 `Layout.astro` 里有个 120 行的 IIFE，在操作 `#wallpaper-wrapper`、`#banner`、`.banner-home-text-overlay`。

这些元素属于 Firefly 的 banner 布局，当前站点全用的是侧栏布局，**根本不渲染它们**。所以那 120 行每次都在对不存在的元素做 `querySelector`。

加了个守卫：

```js
(function applyWallpaperMode() {
  if (!document.getElementById("wallpaper-wrapper")) return;
  // ...原来的 120 行
})();
```

元素不存在就直接返回，开销几乎为零；哪天重新启用 banner 布局，逻辑会自己走回原样。

## 一点想法

我一开始想的是"优化一下 CSS"——因为首屏 CSS 有 241KB，看着很大。

但分析完发现，`layout-styles.css` 里的 19 个类有 **13 个仍在使用**（都是 Layout.astro 的脚本在操作）。真正的大头是 Tailwind v4 按需生成的原子类，它已经在按需生成了。

**没什么可优化的。**

那次「优化」最后变成了纯粹的自我安慰。而真正有用的那 45MB，来源是一个我完全没预期的地方——`public/` 里躺着 45MB 从没被用过的模型文件。

所以现在我养成了一个习惯：**改动之前先量一下。**

不量就不知道自己在优化什么，甚至不知道有没有在优化。