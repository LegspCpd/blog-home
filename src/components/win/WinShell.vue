<script setup lang="ts">
import { onMounted, shallowRef } from "vue";

/**
 * WinUI 应用壳 —— SSR 安全的外层。
 *
 * ## 为什么要有一个"静态骨架"
 *
 * 真正的壳（NavigationView / TitleBar）是 WinUIonWeb 的组件，它们在 setup()
 * 阶段就读 window 和主题资源，SSR 会直接抛 "window is not defined"，
 * 所以只能在挂载后动态加载。
 *
 * 但如果 SSR 阶段只吐 <slot/>（正文），两种情况都很难看：
 *   · 冷启动：先看到"光秃秃的正文"，过一会儿侧边栏才长出来
 *   · 站内跳转：实测外壳消失 **155ms** 才回来（22ms 消失、177ms 恢复）
 * 这正是"不像原生应用"的主要来源。
 *
 * 所以这里在服务端就渲染一份**几何完全一致**的静态骨架，
 * 挂载后由真实外壳原样接管 —— 前后位置一样，切换看不见。
 *
 * ## 骨架里的菜单项是真正的 <a>
 *
 * 这是刻意的**渐进增强**：JS 没跑起来时侧边栏照样能导航
 * （真实外壳的菜单项是 div、靠事件委托跳转，没 JS 就完全点不动）。
 * 客户端接管之后这些 <a> 会被替换掉，不影响站内跳转。
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

/**
 * 与 WinShellClient 里的判定保持一致，
 * 否则骨架和真实外壳会高亮不同的项，接管时会看到选中条跳一下。
 */
const isCurrent = (tag: string) =>
  tag === props.path || (tag !== "/" && props.path.startsWith(tag));
</script>

<template>
  <component :is="Client" v-if="Client" v-bind="props">
    <slot />
  </component>

  <!-- 静态骨架：类名刻意与真实外壳一致，好让同一套框架样式生效 -->
  <div v-else class="winui-app">
    <div class="win-titlebar winui-ssr-titlebar">
      <span class="winui-ssr-title">{{ props.siteTitle }}</span>
    </div>

    <div class="win-nav-shell is-left">
      <nav class="win-nav-left-panel winui-ssr-pane" aria-label="主导航">
        <!-- 搜索框占位：真实外壳装上后由 AutoSuggestBox 接管 -->
        <div class="winui-ssr-search" aria-hidden="true">
          <span>搜索文章…</span>
          <span class="winui-ssr-search-icon">&#xE721;</span>
        </div>

        <div class="winui-ssr-menu">
          <a
            v-for="item in props.items"
            :key="item.Tag"
            class="winui-ssr-item"
            :class="{ 'is-selected': isCurrent(item.Tag) }"
            :href="item.Tag"
            :aria-current="isCurrent(item.Tag) ? 'page' : undefined"
          >
            <span class="winui-ssr-icon" aria-hidden="true">{item.Icon}</span>
            <span class="winui-ssr-label">{item.Content}</span>
          </a>
        </div>

        <div class="winui-ssr-menu winui-ssr-footer">
          <a
            v-for="item in props.footerItems ?? []"
            :key="item.Tag"
            class="winui-ssr-item"
            :href="item.Tag"
          >
            <span class="winui-ssr-label">{{ item.Content }}</span>
          </a>
          <a
            class="winui-ssr-item"
            :class="{ 'is-selected': props.path === '/settings/' }"
            href="/settings/"
          >
            <span class="winui-ssr-icon" aria-hidden="true">&#xE713;</span>
            <span class="winui-ssr-label">设置</span>
          </a>
        </div>
      </nav>

      <main class="win-nav-content">
        <div class="win-nav-content-inner">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style>
/*
 * 骨架的样式**不在这里** —— 全部在 src/styles/global.css。
 *
 * 原因：这个 <style> 会打进 island 的 CSS 包（实测 482KB），首屏拿不到；
 * 而骨架必须在首屏就长得对，否则就是"先一堆乱码、再正常起来"。
 * 放进 global.css（Base.css，约 9KB，首屏必到）才有意义。
 */
</style>
