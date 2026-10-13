<script setup lang="ts">
import { computed, ref } from "vue";

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

const selected = computed(() => exactMatch.value ?? prefixMatch.value ?? null);

/** 点击菜单项 → 跳转。参数形状由上游决定，逐层回退取值。 */
function onItemInvoked(args: any) {
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
  <div class="winui-app">
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
      :IsSettingsVisible="false"
      :AlwaysShowHeader="false"
      IsBackButtonVisible="Collapsed"
      ItemInvoked="onItemInvoked"
    >
      <NavigationViewAutoSuggestBox>
        <AutoSuggestBox
          PlaceholderText="搜索文章…"
          QueryIcon="Find"
          :ItemsSource="suggestions"
          TextChanged="onTextChanged"
          QuerySubmitted="onQuerySubmitted"
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
