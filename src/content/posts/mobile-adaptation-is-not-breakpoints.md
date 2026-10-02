---
title: 移动端适配不是"加个断点"
published: 2026-10-04
tags: [前端, 移动端, CSS]
category: 技术
description: 断点只是起点。真正让页面在窄屏下"活着"的，是那些容易被忽略的细节：触摸尺寸、横向溢出、降级路径。
draft: false
---

给博客做移动端适配的时候，我一开始以为就是加几个 `@media`。写到后来发现，断点只是最表层的那一层。

## 一、断点解决不了横向溢出

最典型的破版是代码块和长表格。

我原来的代码块样式是这样的：

```css
.frame {
  overflow: hidden;   /* ← 问题在这 */
}
```

看起来是想"裁掉多余的边框圆角"，实际上把**溢出的代码行也裁掉了**。

窄屏下一行长代码直接消失，用户完全不知道自己漏看了什么。

改成：

```css
.frame {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}
```

一行 CSS 的差别，但这是"能用"和"不能用"的差别。

## 二、触摸目标比你想的小

手机上手指的接触面积大概 8-10mm。低于这个尺寸的按钮，点起来会很难受——尤其是相邻两个可点元素挨在一起的时候。

我的按钮 `min-height` 是 36px，大概 9.5mm，刚好压线。

但有些地方我漏了：

- 侧栏导航项在折叠状态下只显示图标，图标本身 16px，但**可点区域**是 36px
- 标签胶囊 `su-pill` 高度只有 22px 左右，鼠标上无所谓，手机上就是难点

胶囊那类元素我后来统一加了 `padding`，保证触摸区域不小于 36px 高。

## 三、iOS 会自动缩放页面

这是个很隐蔽的坑。

```css
input {
  font-size: 14px;   /* iOS Safari：聚焦时自动放大 */
}
```

iOS Safari 在输入框字号小于 16px 时，聚焦会自动放大页面，而且**用户放大后很难缩回去**。

我的搜索框原来跟着设计稿写了 14px，手机上一搜页面就跳了。

改成：

```css
@media (max-width: 640px) {
  input {
    font-size: 16px;
  }
}
```

顺便加了条注释说明原因，防止以后有人"优化"回去。

## 四、JS 挂了，导航也要能用

我给移动端加了一条固定顶栏，里面是纯链接的文字导航。

一开始我只在窄屏显示抽屉按钮。测试的时候把 JS 禁掉，发现：**手机上完全没法导航**——侧栏收进抽屉，抽屉靠 Svelte hydration 打开，JS 一挂就死。

后来改成顶栏直接输出 `<a>` 链接，抽屉只是增强：

```astro
<nav class="su-mobile-bar-nav" aria-label="主导航">
  {navItems.slice(0, 4).map((item) => (
    <a href={url(item.href)} class="su-mobile-bar-link">{item.title}</a>
  ))}
</nav>
```

**抽屉是锦上添花，链接才是底线。**

## 五、超窄屏的布局陷阱

顶栏有品牌名 + 4 个导航链接 + 抽屉按钮。在 520px 以下我把品牌名 `display: none` 了。

结果发现按钮下方留了一段空白——因为品牌名的 `padding-left: 44px` 本来是给抽屉按钮让位的，品牌名一隐藏，这个占位也跟着没了。

修法是让顶栏自己承担占位：

```css
@media (max-width: 520px) {
  .su-mobile-bar-brand { display: none; }
  .su-mobile-bar { padding-left: 60px; }  /* 16 + 36 + 8 */
}
```

这种问题只有真的把窗口拖窄才会发现。我后来每次改完都会把浏览器拖到 375px 和 320px 各看一眼。

## 六、写一个能真正发现问题的检查脚本

肉眼检查总会漏。我最后写了个脚本干这件事：

```js
// 触摸尺寸
const btnRules = css.match(/\.su-btn\{[^}]*\}/g);
const hasMinHeight = btnRules.some(m => /min-height:3[6-9]px/.test(m));

// 横向溢出防护
css.includes("overflow-x") || css.includes("word-break");

// viewport
const hasW = /width=device-width/.test(viewportMeta);

// 每个页面都要有移动端顶栏 + 抽屉入口
html.includes("su-mobile-bar") && html.includes("su-mobile-trigger");
```

这些检查不能替代真机测试，但能挡住"我改完忘了看"这种最常见的失误。

## 一点体会

移动端适配真正的工作量，不在写 `@media`，而在**逐个元素问一句：窄屏下它会怎样？**

- 长 URL → 换行还是撑破？
- 长代码 → 滚动还是裁掉？
- 输入框 → 会不会触发自动缩放？
- 点击目标 → 手指够得着吗？
- JS 挂了 → 还有路可走吗？

每个问题问一遍，适配就差不多了。

至于断点，那只是最后一步的收尾。