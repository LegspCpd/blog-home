<script setup lang="ts">
/**
 * 站点导航 —— 真正的 WinUI NavigationView
 *
 * 这里是 XAML 语法，不是普通 Vue 模板：
 * · 属性用 XAML 名（PaneDisplayMode / IsPaneToggleButtonVisible）
 * · 事件用函数名字符串（SelectionChanged="onSelectionChanged"）
 *   运行时从 setup 作用域里解析这个名字
 * · 图标用 <NavigationViewItem.Icon> 这种 XAML 子元素语法
 */
import { ref } from "vue";
// 从上游源码目录导入（alias 在 astro.config.mjs 里）。
// 不能从包根导入：NavigationViewItem / NavigationViewMenuItems 这些
// XAML 属性组件不在包的 exports 里，包根导入会 MISSING_EXPORT。
import NavigationView from "winui-src/components/NavigationView.vue";
import {
  NavigationViewItem,
  NavigationViewMenuItems,
  NavigationViewPaneHeader,
} from "winui-src/components/NavigationViewProperties";
import { SITE } from "../../config/site";

type NavEntry = { Label: string; Tag: string; Glyph: string };

const NAV_ITEMS: NavEntry[] = [
  { Label: "首页", Tag: "home", Glyph: "&#xE80F;" },
  { Label: "归档", Tag: "archive", Glyph: "&#xE8C7;" },
  { Label: "标签", Tag: "tags", Glyph: "&#xE8EC;" },
];

const HREF: Record<string, string> = {
  home: "/",
  archive: "/archive/",
  tags: "/tags/",
};

/* 与当前路径对应的项，用于初始选中 */
function currentTag(): string {
  const p = window.location.pathname;
  if (p.startsWith("/archive")) return "archive";
  if (p.startsWith("/tags")) return "tags";
  return "home";
}

const selected = ref(currentTag());

function onSelectionChanged(args: unknown): void {
  const tag =
    (args as { SelectedItem?: { Tag?: string } } | undefined)?.SelectedItem?.Tag ??
    selected.value;
  selected.value = tag;
  const href = HREF[tag];
  if (href && !href.endsWith(window.location.pathname)) {
    window.location.href = href;
  }
}
</script>

<template>
  <NavigationView
    class="winui-nav"
    PaneDisplayMode="Left"
    IsPaneToggleButtonVisible="true"
    IsBackButtonVisible="Collapsed"
    IsTabStop="false"
    OpenPaneLength="236"
    SelectionChanged="onSelectionChanged"
  >
    <NavigationViewPaneHeader>
      <div class="brand">
        <span class="mark" aria-hidden="true"></span>
        <span class="name">{{ SITE.title }}</span>
      </div>
    </NavigationViewPaneHeader>

    <NavigationViewMenuItems>
      <NavigationViewItem
        v-for="item in NAV_ITEMS"
        :key="item.Tag"
        :Content="item.Label"
        :Tag="item.Tag"
      >
        <NavigationViewItem.Icon>
          <span class="glyph" v-html="item.Glyph"></span>
        </NavigationViewItem.Icon>
      </NavigationViewItem>
    </NavigationViewMenuItems>
  </NavigationView>
</template>

<style scoped>
.winui-nav {
  height: 100vh;
  width: 100%;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 4px 10px;
}
.mark {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--c-neon-volt);
  box-shadow: 0 0 10px rgba(0, 229, 154, 0.75);
}
.name {
  font-weight: 600;
  color: var(--c-ink);
  white-space: nowrap;
}
.glyph {
  font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif;
  font-size: 16px;
}
</style>