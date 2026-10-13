<script setup lang="ts">
import { onMounted, shallowRef } from "vue";

/**
 * WinUI 应用壳 —— SSR 安全的外层。
 *
 * 为什么不直接在模板里静态 import 控件：
 * WinUIonWeb 的控件在 setup() 阶段就读 window 和主题资源，
 * Astro 的 SSR 阶段会直接抛 "window is not defined"。
 *
 * 所以这一层只做一件事：挂载后动态加载真正的壳
 * （WinShellClient.vue，里面才是静态 import 与完整的 XAML 结构）。
 * SSR 阶段走 v-else 分支，只吐出 <slot /> ——
 * 正文因此仍然是服务端渲染的静态 HTML，SEO 与 RSS 都不受影响。
 */

interface NavItem {
  Tag: string;
  Content: string;
  Icon?: string;
}

const props = defineProps<{
  /** 当前路径，用于高亮选中项 */
  path: string;
  items: NavItem[];
  footerItems?: NavItem[];
  siteTitle: string;
  /** 搜索索引：{Title, Tag, Description}，供 AutoSuggestBox 用 */
  searchIndex?: { Title: string; Tag: string; Description?: string }[];
}>();

const Client = shallowRef<any>(null);

onMounted(async () => {
  const mod = await import("./WinShellClient.vue");
  Client.value = mod.default;
});
</script>

<template>
  <component :is="Client" v-if="Client" v-bind="props">
    <slot />
  </component>
  <div v-else class="shell-fallback">
    <slot />
  </div>
</template>

<style>
/* 控件加载完成前的占位：沿用 WinUI 的内容区边距（24px），
   避免从占位切到真实外壳时整页跳动。 */
.shell-fallback {
  padding: 24px;
}
</style>
