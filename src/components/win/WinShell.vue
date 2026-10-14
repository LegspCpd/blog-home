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
 * 骨架样式。
 *
 * 只负责"看起来和真实外壳一样、位置一样"。几何全部对齐实测值：
 *   标题栏 32px、侧边栏宽、菜单项 36px 高、页脚项贴底、内容区左内边距 24px。
 * 改任何一处都要两边一起改，否则接管的那一瞬间会跳。
 */
.winui-ssr-titlebar {
  display: flex;
  align-items: center;
  padding-left: 12px;
  flex: 0 0 auto;
}

.winui-ssr-title {
  font-size: 12px;
  color: var(--text-primary, #fff);
  line-height: 1;
}

.winui-ssr-pane {
  width: calc(var(--win-nav-open-pane-length, 320px) + 2px);
  padding-top: 40px;
  box-sizing: border-box;
}

.winui-ssr-search {
  height: 40px;
  margin: 0 6px 20px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--line-base);
  border-radius: var(--r-sm, 4px);
  background: var(--c-s1);
  color: var(--c-faint);
  font-size: 14px;
}

.winui-ssr-search-icon {
  font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif;
  font-size: 12px;
}

.winui-ssr-menu {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* 页脚项贴底：与真实外壳一样常驻左下角 */
.winui-ssr-footer {
  margin-top: auto;
  padding-bottom: 3px;
}

.winui-ssr-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 36px;
  padding: 0 12px 0 14px;
  color: var(--text-primary, #fff);
  font-size: 14px;
  text-decoration: none;
  transition: background 100ms cubic-bezier(0, 0, 0, 1);
}

.winui-ssr-item:hover {
  text-decoration: none;
  background: var(--c-s2);
}

/* 选中态用 WinUI 的左侧指示条，不是整块高亮 */
.winui-ssr-item.is-selected::before {
  content: "";
  position: absolute;
  left: 1px;
  top: 50%;
  width: 3px;
  height: 16px;
  margin-top: -8px;
  border-radius: 2px;
  background: var(--accent-base, #4cc2ff);
}

.winui-ssr-icon {
  font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif;
  font-size: 16px;
  width: 16px;
  text-align: center;
  flex: 0 0 auto;
}

.winui-ssr-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
