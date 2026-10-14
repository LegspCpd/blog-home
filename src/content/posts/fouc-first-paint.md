---
title: 打开先闪一堆乱码，然后才正常——这个坑我踩了两次
published: 2026-10-15
description: 首屏骨架的样式写在了延迟加载的 CSS 包里，于是页面先以"没排版"的样子出现。数字很直白：首屏 9KB，另一半 472KB。以及为什么同一个错误我在 SFC 里又犯了一遍。
tags: [性能, CSS, Astro, 前端, 首屏]
category: 技术
draft: false
---

这个站的界面是一套 WinUI 3 风格的壳：顶部标题栏、左侧导航、右边内容区。
它有一个很讨厌的毛病：**打开的一瞬间是一堆没排版的文字，半秒到两秒之后才"啪"地归位。**

手机上尤其明显——因为手机网速慢，那段错位状态持续得更久。

## 先把现象翻译成可测的东西

"乱码"这个词其实不准确。页面上没有一个字是错的，字符编码也没问题。
真正发生的是：**骨架在首屏完全没有排版规则。**

于是标题栏、侧栏、正文——三个本该横向排开的区域——全按文档流挤成一竖列。
看起来就像一段没有样式的 HTML，俗称 FOUC（Flash Of Unstyled Content）。

要验证这一点，只需要查一件事：**骨架用的那些类，样式到底打在哪个 CSS 包里？**

```bash
# 骨架的类名
for cls in win-titlebar win-nav-shell win-nav-left-panel win-nav-content; do
  echo "$cls  Base=$(grep -c "\.$cls" dist/_astro/Base.*.css)"
  echo "$cls  vue-app=$(grep -c "\.$cls" dist/_astro/vue-app*.css)"
done
```

结果毫不含糊：

| 类名 | 首屏的 Base.css | 延迟加载的 vue-app.css |
|---|---|---|
| `.win-titlebar` | **0** | 55 |
| `.win-nav-shell` | **0** | 57 |
| `.win-nav-left-panel` | **0** | 71 |
| `.win-nav-content` | **0** | 20 |

而两个包的大小是：

```
Base.css        9,259 字节   ← 首屏加载
vue-app.css   482,382 字节   ← 由 island 动态加载
```

**首屏那个只有 9KB，骨架要用的规则一条都不在里面。**
剩下 472KB 要等 Vue island 被加载、执行、注册组件之后才注入。
在那之前，浏览器只能把骨架按默认样式渲染——这就是那段"乱码"。

## 为什么它会变成这样

因为这个壳的正文是**服务端渲染**的（为了 SEO 和首屏内容），
但**外壳本身是客户端组件**（WinUI 控件在 `setup()` 里就读 `window`，
SSR 会直接抛 `window is not defined`）。

所以架构上必然有两份东西：

1. 服务端吐出的一份**静态骨架**——为了让用户立刻看到大致轮廓，而不是白屏
2. 客户端接管后的**真实组件**

问题在于：骨架很自觉地"长得像"真实组件（用了同样的类名，这样接管时不会跳），
**但它依赖的样式只在真实组件那一侧。**
骨架穿上了真人的衣服，衣服却在另一个箱子里，还没运到。

## 第一次修：把样式搬到首屏能拿到的地方

骨架里我自己写的那部分（搜索框、菜单项、页脚项），样式原本放在
SFC 的 `<style>` 里：

```vue
<!-- 看起来没问题，其实是同一个错误的翻版 -->
<style>
.winui-ssr-item { height: 36px; padding: 0 12px 0 14px; }
</style>
```

**这个 `<style>` 同样会打进那 472KB 的包。** 位置放错了，等于没写。

我盯着这段代码想了很久才反应过来——我当时的第一反应是
"我明明写了 `winui-ssr-*` 的样式啊，怎么会没排版"。
原因是：**"我写了"和"首屏能拿到"是两件事。**

正确的做法是把骨架的首屏几何搬进**首屏一定会加载的那个文件**：

```css
/* src/styles/global.css —— 进 Base.css，首屏必到 */

/* 只写几何：尺寸、排布、滚动 */
html.shell-ready .win-titlebar { flex: 0 0 auto; height: 32px; }
html.shell-ready .win-nav-shell { display: flex; flex-direction: row; flex: 1 1 auto; }
html.shell-ready .win-nav-left-panel { flex: 0 0 auto; width: 322px; height: 100%; }
html.shell-ready .win-nav-content { flex: 1 1 auto; min-width: 0; overflow: hidden; }
```

一个刻意的取舍：**只写几何，不写外观。**
配色、圆角、阴影、hover 态仍然留给上游那 472KB 去负责。
两套规则各管一摊，不会打架；如果我在首屏也把外观写一遍，
将来上游改配色，就会出现"骨架和真身不一样"的新 bug。

## 第二次修：手机上骨架一直是 322px 宽的侧栏

修完首屏样式，我在 390px 的手机视口下量了一遍——
发现另一个问题：**骨架在手机上会稳稳地显示 322px 的完整侧栏**，
占掉 390px 里的 322px，正文只剩 68px。

原因是上游 NavigationView 的自适应断点（1008 / 640）
同样只存在于那 472KB 里。骨架拿不到，所以它永远是"桌面全展开"的样子。

所以在同一个文件里补齐响应式：

```css
/* 紧凑：只留图标栏 —— 与 1008 断点对齐 */
@media (max-width: 1008px) {
  html.shell-ready .win-nav-left-panel { width: 50px; }
  .winui-ssr-search, .winui-ssr-label { display: none; }
}

/* 最小：侧栏收起、正文满宽 —— 与 640 断点对齐 */
@media (max-width: 640px) {
  html.shell-ready .win-nav-left-panel { display: none; }
  html.shell-ready .win-nav-content-inner { padding-left: 16px; padding-right: 16px; }
}
```

## 验证方法：把时间拨回首屏

这类问题最容易自欺的地方是——**在本机看永远是对的**，
因为 CSS 早就缓存好了。

所以验证必须在"island 还没挂载"的时刻做。把等待时间压到 250ms：

```
390px   标题栏 390x32 | 侧栏 w=0（隐藏）| 正文 390 满宽 | 无横向溢出
768px   标题栏 768x32 | 侧栏 50px      | 正文 x=48 w=720
1440px  标题栏 1440x32| 侧栏 322px     | 正文 x=320 w=1120
```

三种视口下骨架**一出现就是对的形状**，等真实组件接管时位置不变，
切换看不出来。而 `Base.css` 只从 9,259 涨到 10,158 字节。

## 两条可以带走的经验

**第一，判断"样式有没有生效"要问对问题。**
不是"我写没写这条样式"，而是"**这条样式在哪一个文件里、那个文件什么时候到**"。
打包工具会把样式按入口切分，写在组件里的样式跟着组件走——
组件是懒加载的，样式就是懒加载的。

**第二，服务端渲染的骨架必须自带样式。**
骨架存在的唯一理由是"在真实内容到达前先撑住版面"。
如果它自己的样式要等真实内容一起到，那它连存在的意义都没有了。

那 472KB 我暂时没动——它是一整套 WinUI 控件的样式，
动它风险大于收益。但**首屏已经完全不依赖它了**。
