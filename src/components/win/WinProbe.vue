<script setup lang="ts">
/** 真 WinUI 控件验证：Button + TextBlock + ToggleSwitch */
import Button from "winui-src/components/Button.vue";
import TextBlock from "winui-src/components/TextBlock.vue";
import ToggleSwitch from "winui-src/components/ToggleSwitch.vue";
import { ref } from "vue";

const on = ref(false);
function onClick(): void {
  console.log("clicked");
}
</script>

<template>
  <div class="probe">
    <TextBlock Text="WinUI 真控件验证" class="t" />
    <div class="row">
      <Button Click="onClick" Content="按钮" />
      <ToggleSwitch IsChecked="{x:Bind on}" />
    </div>
    <p class="note">
      上面若为 WinUI 原生样式（Segoe UI 字体、系统按钮形态），说明 WinUIonWeb 已真正接管渲染。
    </p>
  </div>
</template>

<style scoped>
.probe {
  padding: 18px;
}
.t {
  margin-bottom: 14px;
}
.row {
  display: flex;
  align-items: center;
  gap: 18px;
}
.note {
  margin-top: 18px;
  color: var(--c-faint);
  font-size: 13px;
}
</style>