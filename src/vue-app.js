/**
 * Vue 应用入口 —— 把 WinUIonWeb 注册为全局插件
 *
 * ⚠ 两个踩过的坑，都写在代码注释里：
 *
 * 1. 必须用具名函数 + export default。
 *    写成 `export default (app) => {...}`（匿名箭头）时，
 *    Rolldown 会把它当无意义的中间值消除，产物里既没有 default 也没有可用导出；
 *    而 @astrojs/vue 的 client.js 是这么调用的：
 *      const mod = await import(appEntrypoint);
 *      if ('default' in mod) { await mod.default(app); }
 *    'default' in mod === false → setup 静默不执行 → WinUI 控件从未注册。
 *
 * 2. 不要给 vue() 传 devtools 选项。
 *    @astrojs/vue 7.0.3 下传它会让客户端 hydrate 直接崩掉，
 *    报错被包装成误导性的 "Cannot read properties of null (reading 'refs')"。
 */

import WinUIOnWeb from "winui-src/index";

// WinUI 主题资源直接吃源码 CSS（alias 见 astro.config.mjs）
import "winui-src/styles/theme.css";
import "winui-src/styles/buttonResources.css";
import "winui-src/styles/dropDownButtonResources.css";
import "winui-src/styles/pivot.css";
import "winui-src/styles/swipe.css";
import "winui-src/styles/animations.css";
import "winui-src/styles/icons.css";

/** Astro 会以 `await mod.default(app)` 调用它 */
export default function setupWinUI(app) {
  app.use(WinUIOnWeb, { locale: "zh-CN" });
}