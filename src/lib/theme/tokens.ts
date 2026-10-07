/**
 * Win UI 主题令牌 —— 完全由官方 @fluentui/tokens 驱动
 *
 * 上一版是我手写一份色值表（那 60 多个 #hex 全是凭印象填的），
 * 那不是「人家自己的架构」，是仿真。现在改为直接消费官方数据。
 *
 * 官方 API（@fluentui/tokens v1.x 实测）：
 *   tokens                   467 个 token 的嵌套对象
 *   webDarkTheme/webLightTheme  现成的明/暗主题对象
 *   themeToTokensObject()    转成 token 名 -> "var(--token)" 的映射（459 项）
 *
 * 构建期由 Astro 内联 themeToCss()，保证首屏无闪烁；
 * 运行时由官方 setTheme() 接管切换。两者同源于官方包，不会漂移。
 *
 * 官方约束：这些 CSS 自定义属性一旦注入，不要在样式表里用同名变量重新声明，
 * 否则 Fluent 组件会渲染错误颜色并破坏无障碍对比度。
 */

import { webDarkTheme, webLightTheme } from "@fluentui/tokens";

export type ThemeName = "dark" | "light";

// 注意：这里必须用 webDarkTheme/webLightTheme 的【真实字面值】，
// 不能用 themeToTokensObject() —— 后者返回的是 "var(--token)" 自引用映射
// （实测 459 项全部自引用），直接注入 CSS 等于没赋值。
const darkVars = webDarkTheme as Record<string, string>;
const lightVars = webLightTheme as Record<string, string>;

/** 站点默认主题：暗色优先 */
export const DEFAULT_THEME: ThemeName = "dark";

export const THEME_STORAGE_KEY = "winui-theme";

/** 构建期内联用：真实色值注入 :root，首屏无闪烁 */
export function themeToCss(name: ThemeName): string {
  const vars = name === "light" ? lightVars : darkVars;
  return Object.entries(vars)
    .map(([token, value]) => `${token}:${value}`)
    .join(";");
}

/** 客户端切换用：官方 setTheme 需要 token 名到真实值的映射 */
export function themeTokens(name: ThemeName): Record<string, string> {
  return name === "light" ? lightVars : darkVars;
}