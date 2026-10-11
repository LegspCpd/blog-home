<script setup lang="ts">
/**
 * NavigationView 诊断：用 onErrorCaptured 抓组件内部的真实异常，
 * 而不是 astro-island 那句被截断的 "reading 'refs'"。
 */
import { ref, onErrorCaptured } from "vue";
import NavigationView from "winui-src/components/NavigationView.vue";

const log = ref<string[]>([]);

onErrorCaptured((err) => {
  log.value.push(
    (err as Error)?.stack || (err as Error)?.message || String(err)
  );
  return false;
});
</script>

<template>
  <div class="diag">
    <h2>NavigationView 诊断</h2>

    <NavigationView
      PaneDisplayMode="Left"
      IsPaneToggleButtonVisible="true"
      IsBackButtonVisible="Collapsed"
    />

    <pre class="log">{{ log.join("\n\n") || "(no error captured)" }}</pre>
    <p class="hint">上面若为空，说明组件已挂载成功。</p>
  </div>
</template>

<style scoped>
.diag {
  padding: 16px;
}
.log {
  margin-top: 20px;
  padding: 12px;
  background: #000;
  color: #f66;
  font: 11px/1.5 monospace;
  white-space: pre-wrap;
  min-height: 80px;
}
.hint {
  color: #888;
  font-size: 12px;
}
</style>