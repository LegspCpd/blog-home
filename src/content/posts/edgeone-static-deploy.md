---
title: EdgeOne 静态部署踩坑实录
published: 2026-09-30
tags: [EdgeOne, 部署, 前端]
category: 技术
description: 从 Astro 7 到 EdgeOne Pages，中间横着一个 native binding 和一条"能编译但跑不起来"的报错链。
draft: false
---

EdgeOne Pages 是最近才加的部署目标。整体流程和其他平台没差别，但踩了两个坑，都挺典型。

## 坑一：native binding 缺失

构建到 RSS 那一页直接挂了：

```
Error: Cannot find native binding.
npm has a bug related to optional dependencies.
  caused by: Cannot find module '@bruits/satteri-linux-x64-gnu'
```

Astro 7 的 Markdown 默认走 Rust 实现的 Sätteri，它靠 napi 的平台包提供加速。项目里因为要用 remark/rehype 一大堆插件，已经在 `astro.config.mjs` 里把渲染器换成了 `unified()`：

```js
markdown: {
  processor: unified({ remarkPlugins: [...], rehypePlugins: [...] }),
}
```

但 RSS 那条路径是绕开这个配置的——它自己 new 了一个 Astro 容器去渲染正文：

```ts
const container = await AstroContainer.create({ renderers });
const html = await container.renderToString(Content);
```

于是 Sätteri 又被拉起来了。而 EdgeOne 构建机上那个可选依赖没装上。

**排查思路**：错误栈里 `@bruits/satteri` 出现在哪个模块，就去找谁在渲染 Markdown。

**最终改法**：RSS 不再渲染完整正文，改用摘要。这是 RSS 的合理形态——绝大多数阅读器本来就只显示摘要，渲染全文 HTML 塞进 CDATA 意义不大：

```ts
const postContent = postDescription;
```

顺带一提，这一步还有个附带好处：`AstroContainer` + MDX renderer 每次渲染都要完整跑一遍 remark/rehype 插件链，对 7 篇文章来说纯属浪费。

## 坑二：空目录被 git 忽略

```
[WARN] [astro-icon] Failed to load icons from "src/icons":
       ENOENT: no such file or directory, scandir 'src/icons/'
```

本地有这个目录所以不报错，CI 上没有。原因是——**git 不跟踪空目录**。

当时我在本地 `mkdir src/icons` 解决了问题，但没提交，所以线上照旧。

**修复**：

```bash
echo "" > src/icons/.gitkeep
```

这种坑的特点是：**本地怎么测都复现不了**。必须推到 CI 上才能发现。

## 一个顺手的习惯

修完之后我加了个校验脚本，直接读构建产物：

```js
// 令牌有没有真的进 CSS
const defined = new RegExp(`${token}\\s*:`).test(cssText);

// 页面结构是不是真的在
const hasSidebar = html.includes("su-scope");
```

以前我只看 `astro build` 最后那行 `Complete!`，看到就心满意足了。

但"Complete!"只代表**没抛异常**，不代表**结果是对的**。加了这个脚本之后，编译通过但页面是空壳的情况能被当场抓住。

## 小结

EdgeOne 部署本身没什么坑，坑都在前面。

- native binding：属于可选依赖 + 构建环境差异，本地和 CI 结果可能不一致
- 空目录：git 的基本行为，但很容易忘

两者共同点是：**都得靠实际产物来验证，光看代码看不出来。**