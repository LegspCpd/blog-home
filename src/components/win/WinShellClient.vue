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
function onShellClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const item = target?.closest?.(".win-nav-item");
  if (!item) return;

  // 普通菜单项：地址写在 x:Name 里，被渲染成 data-xaml-ref
  const href = item.getAttribute("data-xaml-ref");
  if (href) {
    if (href.startsWith("/")) {
      if (href !== location.pathname) location.href = href;
    } else if (/^https?:/.test(href)) {
      window.open(href, "_blank", "noopener");
    }
    return;
  }

  // 「设置」项是 NavigationView 内置的，不会带我们的 x:Name
  if (item.getAttribute("data-navigation-value") === "settings") {
    if (location.pathname !== "/settings/") location.href = "/settings/";
  }
}

onMounted(() => rootEl.value?.addEventListener("click", onShellClick));
onBeforeUnmount(() => rootEl.value?.removeEventListener("click", onShellClick));

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
        <ImageIconSource ImageSource="/favicon/favicon-dark-128.png" />
      </TitleBarIconSource>
    </TitleBar>

    <NavigationView
      PaneDisplayMode="Left"
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


.win-nav-content-inner {
  padding-left: 24px;
  padding-right: 24px;
}

.winui-app {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
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
