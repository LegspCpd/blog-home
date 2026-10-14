<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from "vue";

/**
 * WinUI 3 应用壳 —— 真实结构，只在客户端加载。
 *
 * 这个文件永远由 WinShell.vue 通过 `await import()` 载入，
 * 所以下面这些静态 import 在 Astro 的 SSR 阶段根本不会执行 ——
 * 这是把 WinUI 控件（setup 里就读 window）接进 Astro 的唯一安全方式。
 *
 * 结构照抄上游 gallery/App.vue 与微软官方文档：
 *
 *   TitleBar                     ← 窗口标题栏：图标 + 标题 + 内容（搜索）
 *     ├ TitleBar.IconSource      ← 应用图标
 *     ├ TitleBar.Resources       ← 把内容区水平对齐设成 Stretch，搜索框才会撑满
 *     └ TitleBar.Content         ← AutoSuggestBox
 *   NavigationView               ← 左侧导航
 *     ├ PaneTitle                ← 菜单按钮旁的应用名
 *     ├ Header（官方 52px）       ← 当前页标题，内容区的滚动裁剪点
 *     ├ MenuItems / FooterItems  ← 主菜单 / 页脚项（显示在 Settings 之前）
 *     └ Content                  ← 页面正文
 *
 * 官方尺寸（TitleBar.vue 内部常量，与 WinUI 3 一致）：
 *   标题栏 Compact 32px / Expanded 48px；标题字号 12px；图标 16px
 * NavigationView：Header 固定 52px；内容区边距 24px（Minimal 12px）；
 *   自适应断点 1008 / 640。
 */

import TitleBar from "winui-src/components/TitleBar.vue";
import { TitleBarIconSource } from "winui-src/components/TitleBarProperties";
import NavigationView from "winui-src/components/NavigationView.vue";
import { NavigationViewAutoSuggestBox } from "winui-src/components/NavigationViewProperties";
// xamlScopeKey：把本组件的处理函数暴露给 XAML 运行时（见下方 provide 的说明）
import { xamlScopeKey } from "winui-src/index";
import AutoSuggestBox from "winui-src/components/AutoSuggestBox.vue";
// 注意：<HorizontalAlignment> / <ImageIconSource> 都来自上游的全局注册
// （registerWinUIComponents 里的 xamlPrimitives 与 IconSource），
// 没有对应的 .vue 文件，所以只能按组件名使用，不能按路径 import。
// 我们通过 app.use(WinUIOnWeb) 已经把它们注册好了。

interface NavItem {
  Tag: string;
  Content: string;
  Icon?: string;
}

const props = defineProps<{
  path: string;
  items: NavItem[];
  footerItems?: NavItem[];
  siteTitle: string;
  searchIndex?: { Title: string; Tag: string; Description?: string }[];
}>();

/**
 * 导航高亮与页头标题，分三种情况：
 *
 *   精确命中（/、/archive/、/tags/）  → 高亮该项，页头用菜单名
 *   前缀命中（/tags/Cloudflare/）     → 高亮父项，但页头要用页面标题，
 *                                      否则具体标签名会丢，只剩一个「标签」
 *   没有命中（/posts/xxx/）           → 不高亮任何项，页头用页面标题
 *
 * 页头用页面标题这一点对齐官方文档：`NavView.Header = SelectedItem.Content`
 * 是"导航类别"级别的做法，而子页面与详情页没有对应的菜单项，
 * 只能由页面自己提供标题。
 */
const exactMatch = computed(() => props.items.find((i) => i.Tag === props.path));

const prefixMatch = computed(() =>
  props.items
    .filter((i) => i.Tag !== "/" && props.path.startsWith(i.Tag))
    .sort((a, b) => b.Tag.length - a.Tag.length)[0]
);

const selected = computed(() =>
  // 设置页由 NavigationView 自己高亮「设置」项，
  // 这里返回 null，免得同时又高亮一个普通菜单项。
  props.path === "/settings/" ? null : (exactMatch.value ?? prefixMatch.value ?? null)
);

const rootEl = ref<HTMLElement | null>(null);

/**
 * 导航用事件委托来做 —— 这是被逼出来的，原因值得记下来。
 *
 * NavigationView 自己有 ItemInvoked，两种接法我都试过：
 *   1. XAML 名字符串 `ItemInvoked="onItemInvoked"` —— 运行时去"XAML 作用域"里
 *      按名字查，查不到就 `?.()` 静默跳过（连报错都没有）
 *   2. Vue 监听器 `@ItemInvoked` —— `emit('ItemInvoked')` 直接命中，
 *      不依赖任何作用域解析
 * 两种都验证过：编译产物里绑定确实存在（`onItemInvoked:r.onItemInvoked`），
 * 但点击后处理函数**一次都没被调用**。逐层查下来：
 *   · 点击**确实**落在菜单项上（原生 `<div role="menuitem">` 带 onClick）
 *   · 用 JS `el.click()` 直接触发也一样无效
 *   · 所以是它内部提前 return 了 —— 它的选择流程是围绕 **Frame 导航** 设计的
 *     （pendingSelectionRequest / 帧导航完成回调），我们没有 Frame，
 *     那套状态很可能一开始就卡住，把之后的每次点击都吞掉
 *
 * 与其继续逆向一个 180KB 组件的内部状态机，不如用**它自己渲染出来的 DOM**
 * 做事件委托：菜单项上的 `data-xaml-ref` 就是我们在 x:Name 里给的地址。
 * 这样导航既不依赖内部实现，也不会在下一次 sync 上游时失效。
 *
 * 附带的好处：以后若要接回 ItemInvoked，把 removeEventListener 那段去掉即可。
 */
/**
 * 站内跳转。
 *
 * 不能再用 `location.href = href` —— 那是**整页重载**：
 * 重新下载 HTML/CSS/JS、重新水合整套 WinUI 组件（约 2.2MB），
 * 又慢又一定会闪一下，这是"不像原生应用"最主要的来源。
 *
 * Astro 的 navigate() 走客户端路由：fetch 新页面的 HTML、只换 <body>，
 * 外壳因为有 transition:persist 而完全不重建
 * （侧边栏、搜索词、滚动位置全都留着）。
 *
 * 注意必须**静态导入**：`astro:transitions/client` 是 Astro 的虚拟模块，
 * 只在构建期解析 —— 我一开始写成 `await import(...)`，运行时直接
 * "Failed to fetch dynamically imported module"，导航静默失败。
 */
function goTo(href: string) {
  const router = (window as unknown as { __winuiNavigate?: (h: string) => void }).__winuiNavigate;
  if (router) router(href);
  else location.href = href;   // 兜底：脚本没跑起来时退回整页跳转
}

/**
 * 悬停即预取。
 *
 * 线上实测：站内跳转的耗时**全在取 HTML**（65–736ms），
 * 交换与渲染合计不到 20ms。这个延迟修不掉（HTML 的缓存头是
 * must-revalidate，每次都要回源验证），但可以**提前开始**：
 * 鼠标移到菜单项上就先取一次，等真点下去通常已经就绪。
 *
 * 实测典型场景：手移到菜单再点下去，中间至少 200–300ms，
 * 正好够一个往返。
 */
function onShellPointerOver(event: PointerEvent) {
  const item = (event.target as HTMLElement | null)?.closest?.(".win-nav-item");
  if (!item) return;
  const href = item.getAttribute("data-xaml-ref");
  if (!href || !href.startsWith("/")) return;
  const prefetch = (window as unknown as { __winuiPrefetch?: (h: string) => void }).__winuiPrefetch;
  prefetch?.(href);
}

function onShellClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const item = target?.closest?.(".win-nav-item");
  if (!item) return;

  // 普通菜单项：地址写在 x:Name 里，被渲染成 data-xaml-ref
  const href = item.getAttribute("data-xaml-ref");
  if (href) {
    if (href.startsWith("/")) {
      if (href !== location.pathname) void goTo(href);
    } else if (/^https?:/.test(href)) {
      window.open(href, "_blank", "noopener");
    }
    return;
  }

  // 「设置」项是 NavigationView 内置的，不会带我们的 x:Name
  if (item.getAttribute("data-navigation-value") === "settings") {
    if (location.pathname !== "/settings/") void goTo("/settings/");
  }
}

onMounted(() => {
  rootEl.value?.addEventListener("click", onShellClick);
  // pointerover 会冒泡，所以委托在根节点上就够了
  rootEl.value?.addEventListener("pointerover", onShellPointerOver);
});
onBeforeUnmount(() => {
  rootEl.value?.removeEventListener("click", onShellClick);
  rootEl.value?.removeEventListener("pointerover", onShellPointerOver);
});

/**
 * ★ 把 XAML 事件处理函数交给运行时 —— 不写这一段，点击导航就完全没反应。
 *
 * WinUIonWeb 的事件是**函数名字符串**（`ItemInvoked="onItemInvoked"`），
 * 运行时用 resolveXamlHandler 去"XAML 作用域"里按名字查这个函数。
 * 作用域只有两个来源（见 vendor/winuionweb/components/xamlRuntime.ts 的 scopeFor）：
 *
 *   1. 祖先中 __name 以 Page 结尾的组件（isGalleryScope）—— 上游 Gallery 的约定
 *   2. **父组件 provides 里的 xamlScopeKey** ← 我们走这条
 *
 * Vue 的 provides 沿原型链向上查找，所以这里 provide 一次，
 * 所有后代控件（NavigationView、AutoSuggestBox…）都能解析到。
 *
 * 我最初漏了这一步。症状极具迷惑性：菜单**渲染完全正常**、DOM 计数全对、
 * 点击也命中了目标元素，但点了就是不动 ——
 * resolveXamlHandler 返回 undefined，调用处 `?.()` 于是静默什么都不做，
 * 控制台连一条报错都没有。
 * **只验证渲染、不验证交互，就会漏掉整类问题。**
 */
provide(xamlScopeKey, {
  onItemInvoked,
  onTextChanged,
  onQuerySubmitted,
});

/**
 * 点击菜单项 → 跳转。
 *
 * 分两种：普通项带 Tag；「设置」项是 WinUI 内置的，
 * 它没有 Tag，只把 IsSettingsInvoked 置真 —— 所以要单独认它，
 * 否则会得到一个点了没反应的菜单项。
 */
function onItemInvoked(args: any) {
    if (args?.IsSettingsInvoked) {
    if (props.path !== "/settings/") location.href = "/settings/";
    return;
  }
  const tag =
    args?.InvokedItemContainer?.Tag ??
    args?.InvokedItem?.Tag ??
    args?.Tag;
  if (typeof tag === "string" && tag && tag !== props.path) {
    location.href = tag;
  }
}

/* ── 搜索：对构建期注入的文章索引做本地过滤 ─────────────────────── */
const index = computed(() => props.searchIndex ?? []);
const suggestions = ref<string[]>([]);

/** 各事件实参的字段名上游可能不同，逐个回退，取不到就当空串 */
const textOf = (args: any): string =>
  String(args?.QueryText ?? args?.Text ?? args?.queryText ?? "").trim();

function onTextChanged(args: any) {
  const q = textOf(args).toLowerCase();
  if (!q) {
    suggestions.value = [];
    return;
  }
  suggestions.value = index.value
    .filter(
      (e) =>
        e.Title.toLowerCase().includes(q) ||
        e.Tag.toLowerCase().includes(q) ||
        (e.Description ?? "").toLowerCase().includes(q)
    )
    .slice(0, 6)
    .map((e) => e.Title);
}

function onQuerySubmitted(args: any) {
  const q = textOf(args).toLowerCase();
  if (!q) return;
  const hit =
    index.value.find((e) => e.Title.toLowerCase() === q) ??
    index.value.find((e) => e.Title.toLowerCase().includes(q)) ??
    index.value.find((e) => (e.Description ?? "").toLowerCase().includes(q));
  if (hit) location.href = hit.Tag;
}
</script>

<template>
  <div ref="rootEl" class="winui-app">
    <!--
      窗口标题栏。
      官方 Gallery 的汉堡按钮在窗格内（NavigationView 自己那个），不在标题栏，
      所以 IsPaneToggleButtonVisible 关掉；本站没有历史栈，后退键也关掉。
      搜索框按 WinUI Gallery 的做法放在 NavigationView 的窗格里，不在这里。
    -->
    <TitleBar :Title="siteTitle" :IsPaneToggleButtonVisible="false" :IsBackButtonVisible="false">
      <TitleBarIconSource>
        <!--
          标题栏图标固定用 dark 那套（白色标志）。

          为什么固定：应用自身永远是深色主题（<html class="theme-dark">），
          标题栏也是深色，所以白色标志在任何系统主题下都是对的。
          浏览器标签页的图标则相反 —— 它跟随**浏览器/系统**主题切换
          （Base.astro 里用 prefers-color-scheme 声明了两套）。

          这两者看起来"颜色不同"不属于不统一：各自都在为自己的背景选对的那一套。
          真正要避免的是同一个背景下出现两种标志 —— 那正是 favicon.ico
          之前写 sizes="any" 造成的问题（浏览器优先选它，深色底在深色标签栏上看不见）。
        -->
        <ImageIconSource ImageSource="/favicon/favicon-dark-128.png" />
      </TitleBarIconSource>
    </TitleBar>

    <NavigationView
      PaneDisplayMode="Auto"
      :MenuItemsSource="items"
      :FooterMenuItemsSource="footerItems ?? []"
      :SelectedItem="selected"
      :IsSettingsVisible="true"
      :AlwaysShowHeader="false"
      IsBackButtonVisible="Collapsed"
      @ItemInvoked="onItemInvoked"
    >
      <NavigationViewAutoSuggestBox>
        <AutoSuggestBox
          PlaceholderText="搜索文章…"
          QueryIcon="Find"
          :ItemsSource="suggestions"
          @TextChanged="onTextChanged"
          @QuerySubmitted="onQuerySubmitted"
        />
      </NavigationViewAutoSuggestBox>

      <div class="winui-content">
        <slot />
      </div>
    </NavigationView>
  </div>
</template>

<style>
/*
 * 对上游几何的收口。
 *
 * 上游页头是 min-height:36px + margin-top:44px；微软官方文档写的是
 * 「标题区域…具有固定高度 52 px」并且「停靠在页面顶部」。
 * 这里把几何调回官方规格，其余外观（28px/600、颜色令牌）保持上游不变。
 */
.win-nav-page-header {
  min-height: 52px;
  margin-top: 0;
  /* 官方内容区边距 24px；上游默认 56px 是给"没有独立标题栏"的场景留汉堡按钮位。
     我们有 TitleBar，所以按内容边距对齐。 */
  --win-nav-header-margin-left: 24px;
}


/*
 * 固定视口框架 —— 这几条是整个界面的地基。
 *
 * 上游的 NavigationView 本来就是按「固定高度的应用框架」设计的：
 *   .win-nav-shell      height:100%           ← 要求父容器有确定高度
 *   .win-nav-left-panel display:flex; column  ← 页脚靠它贴底
 *   .win-nav-content    flex:1 1 auto; min-height:0
 *
 * 这里原来写的是 `.winui-app { min-height: 100dvh }`。min-height 会随内容长高，
 * 于是父容器始终没有确定高度，整套模型就塌了 —— 实测：
 *   页面总高 2020px、侧边栏 1982px（而不是视口 900px）、
 *   RSS/GitHub/设置 被推到 y=1899/1939/1979。
 * 也就是必须把页面拉到最底部才看得见「设置」，而它本该常驻左下角。
 *
 * 规则挂在 html.shell-ready 下（由本组件 onMounted 时加上这个类）：
 * JS 没跑起来时不会加，静态回退内容仍是普通可滚动的文档，不会被裁掉。
 */
html.shell-ready,
html.shell-ready body {
  height: 100%;
  overflow: hidden;
}

/* 确定高度，而不是 min-height。
   display:flex 必须留着：外壳靠它把标题栏和 NavigationView 竖排，
   并让 NavigationView 收缩到「视口高度 − 标题栏高度」。
   （我上一版替换这段样式时把 display:flex 一起删掉了，
     结果 flex 收缩不发生、侧边栏又长回内容高度 —— 是量出来才发现的。） */
html.shell-ready .winui-app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}

/* 标题栏不参与收缩。
   上游给的是 flex:0 1 auto（可收缩），而 NavigationView 的基准高度远大于容器，
   两者按比例一起被压缩 —— 实测标题栏从 32px 被压成 14px。 */
html.shell-ready .win-titlebar {
  flex: 0 0 auto;
}

/* NavigationView 吃掉标题栏以下的全部高度。
   height:auto 必须显式写：上游那句 height:100% 是相对 .winui-app 算的，
   会把标题栏的高度也算进去 —— 实测底边落到 932px、超出视口 32px，
   于是最底下的「设置」被裁掉。flex:1 自己会算出正确的剩余高度。 */
html.shell-ready .win-nav-shell {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}

/* 侧边栏撑满这块高度，页脚（RSS / GitHub / 设置）就能常驻底部 */
html.shell-ready .win-nav-left-panel {
  height: 100%;
}

/* 内容区自己滚。
   上游把这一层设成 overflow:hidden —— 它假设页面内容被放进一个 Frame 由 Frame 滚。
   我们没有 Frame，就由这一层当滚动容器。 */
html.shell-ready .win-nav-content-inner {
  overflow-y: auto;
  overflow-x: hidden;
  padding-left: 24px;
  padding-right: 24px;
  /* 这一层的子元素被上游设了 max-height:100%，会把内容压扁到视口高度、滚不动 */
  > * {
    max-height: none;
  }
}

.winui-content {
  padding: 0 0 32px;
}

/*
 * WinUI 的滚动条：细、悬浮、无按钮。
 * 浏览器默认滚动条是这套界面里最突兀的"网页感"来源。
 */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.4) transparent;
}
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.28);
  background-clip: padding-box;
  border: 4px solid transparent;
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.44);
  background-clip: padding-box;
  border: 4px solid transparent;
}
::-webkit-scrollbar-corner {
  background: transparent;
}
</style>
