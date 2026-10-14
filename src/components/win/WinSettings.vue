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

/*
 * ★ 让可点击与不可点击的卡片同宽。
 *
 * 上游的 SettingsCard 在 IsClickEnabled 时渲染成 <button class="win-btn">，
 * 否则渲染成 <div class="win-settings-card">。button 自带 padding / border /
 * box-sizing，于是同一列里出现两种宽度 —— 实测（每个视口宽度都一样）：
 *
 *   可点击（订阅 RSS / 源码）        宽 726px，左边界 342px
 *   不可点击（文章总数 / 标签总数…）  宽 752px，左边界 346px
 *
 * 26px 的宽度差加上 4px 的左边界错位，在一列卡片里非常显眼。
 * 这里把两者的盒模型统一，并去掉 button 的默认外观 ——
 * 视觉表面由内部的 .win-settings-card-surface 负责，外层只要占满整行。
 */
.settings-list :is(.win-btn, .win-settings-card) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
}

/*
 * ★ 真正让宽度差 22px 的那一处（量了整条盒链才看出来）。
 *
 * 两种卡片的 DOM 深度不一样：
 *
 *   可点击  <button class="win-btn … win-settings-card">
 *             └ .win-button-content-presenter   padding: 5px 11px 6px   ← 多这一层
 *                └ .win-settings-card-surface    被左右各 11px 挤窄
 *   不可点击 <div class="win-settings-card">
 *             └ .win-settings-card-surface       直接铺满
 *
 * 于是可见表面一个 696px、一个 720px，同一列里前两张窄一截。
 * 把 presenter 的左右内边距去掉，两者都是 720px（上下内边距保留，
 * 高度本来就是一致的）。
 *
 * 我先试过改外层的 box-sizing、又试过改 surface 的 box-sizing ——
 * 那两次分别只让宽度从 752→720、696→720，都没对齐；
 * 真正定位到是靠把整条盒链逐层量出来，不是靠猜。
 *
 * 必须带 !important：这个 padding 不是来自样式表，而是上游 Button 控件
 * 把 WinUI 的主题资源（ButtonPadding）**以内联样式**写在元素上的 ——
 *   style="… padding: 5px 11px 6px; …"
 * 内联样式优先级高于任何选择器，不用 !important 根本盖不掉。
 * 这是少数真正需要 !important 的场合（覆盖运行时算出来的内联值）。
 */
.settings-list .win-button-content-presenter {
  padding-left: 0 !important;
  padding-right: 0 !important;
  /* 还有内联的 border-width: 1px —— 左右各 1px 让表面变成 718 而不是 720。
     卡片的可见边框由内部的 .win-settings-card-surface 自己画，
     这一层不需要边框。 */
  border-left-width: 0 !important;
  border-right-width: 0 !important;
}

/* button 的默认外观清掉之后要自己补回焦点环 ——
   键盘用户必须看得出焦点在哪（WCAG 2.4.7）。 */
.settings-list .win-btn:focus-visible {
  outline: 2px solid var(--accent-base, #4cc2ff);
  outline-offset: 2px;
}

/*
 * ★ 真正让宽度差 32px 的那一处。
 *
 * 上游的 .win-settings-card-surface 用的是 box-sizing: content-box，
 * 配上 width:100% + padding:16px 之后实际占 720+32=752px —— **比父级宽 32px**。
 * 而可点击那条走的是 .win-button-content-presenter（border-box），正好 720px。
 * 于是同一列里前两张窄、后四张宽（截图里看到的就是这个）。
 *
 * 把它的盒模型改成 border-box，两种卡片就都是 720px。
 * （我一开始只改了外层 .win-btn / .win-settings-card 的盒模型，
 *   外层确实都变成 720 了，但内层这个 content-box 仍然溢出 —— 量整条盒链才看出来。）
 */
.settings-list .win-settings-card-surface {
  box-sizing: border-box;
}

/* 占位行：和 SettingsCard 的实际高度对齐 */
.settings-skeleton {
  height: 64px;
  border: 1px solid var(--line-base);
  border-radius: var(--r-md);
  background: var(--c-s1);
}
</style>
