<script setup lang="ts">
import { onMounted, shallowRef } from "vue";
import { SITE } from "../../config/site";

/**
 * 设置页内容 —— WinUI 的 SettingsCard 列表。
 *
 * 和 WinShell 一样分两层：这一层 SSR 安全，挂载后才动态 import
 * 真正的控件（WinUI 控件在 setup 里就读 window，SSR 会炸）。
 *
 * 页面上只放**真实可用**的东西：
 *   · 能点的项真的会跳转（RSS 订阅、GitHub 源码）
 *   · 站点统计来自构建期数据，不是写死的
 * 不放装饰性的空 ToggleSwitch —— 那种"看着能调其实没接线"的开关
 * 比没有这个页面更糟。
 */
const props = defineProps<{
  /** 文章总数（构建期传入） */
  postCount: number;
  /** 标签总数（构建期传入） */
  tagCount: number;
  /** 构建时间，ISO 字符串 */
  buildTime: string;
}>();

const Card = shallowRef<any>(null);

onMounted(async () => {
  const mod = await import("winui-src/components/SettingsCard.vue");
  Card.value = mod.default;
});

const buildTimeText = (() => {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(props.buildTime));
  } catch {
    return props.buildTime;
  }
})();
</script>

<template>
  <div class="settings-list">
    <template v-if="Card">
      <!-- 能点就点：SettingsCard 的 IsClickEnabled 会把它变成可交互行 -->
      <component :is="Card"
        Header="订阅 RSS"
        Description="用任意阅读器订阅，有新文章就会推送过来"
        HeaderIcon="&#xE734;"
        :IsClickEnabled="true"
        @click="() => (location.href = SITE.links.rss)" />

      <component :is="Card"
        Header="源码"
        Description="本站的前端源码在 GitHub 上"
        HeaderIcon="&#xE774;"
        :IsClickEnabled="true"
        @click="() => (location.href = SITE.links.github)" />

      <component :is="Card"
        Header="文章总数"
        :Description="`目前收录 ${postCount} 篇`"
        HeaderIcon="&#xE8A5;"
        :IsActionIconVisible="false" />

      <component :is="Card"
        Header="标签总数"
        :Description="`共 ${tagCount} 个标签`"
        HeaderIcon="&#xE8EC;"
        :IsActionIconVisible="false" />

      <component :is="Card"
        Header="本次构建"
        :Description="buildTimeText"
        HeaderIcon="&#xE72C;"
        :IsActionIconVisible="false" />

      <component :is="Card"
        Header="外观"
        Description="本站跟随 WinUI 3 的深色主题，暂不提供切换"
        HeaderIcon="&#xE793;"
        :IsActionIconVisible="false" />
    </template>

    <!-- 控件加载完成前的占位，用同样的行高避免跳动 -->
    <template v-else>
      <div class="settings-skeleton" v-for="i in 6" :key="i"></div>
    </template>
  </div>
</template>

<style>
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: var(--readable-prose, 720px);
}

/* 占位行：和 SettingsCard 的实际高度对齐 */
.settings-skeleton {
  height: 64px;
  border: 1px solid var(--line-base);
  border-radius: var(--r-md);
  background: var(--c-s1);
}
</style>
