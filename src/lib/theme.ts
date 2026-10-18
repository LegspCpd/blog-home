/**
 * 界面主题（两套皮肤）。
 *
 * 站上有两套完整外观：
 *   · "winui"     —— WinUI 3 风味（默认）
 *   · "endfield"  —— 终末地风味（endfield-ui skill）
 *
 * 实现方式和参考站 2x.nz 完全一致：**主题就是 <html> 上的一个 data 属性**，
 * 两套皮肤各自挂在自己那个属性值下面。切换 = 改属性 + 写 localStorage，
 * **不跳转、不重载、不追加任何东西** —— 同一页里原地换皮。
 *
 * 默认主题不打属性（省一次属性写入，也让 HTML 更干净）；
 * 只有选了终末地才打上 data-site-theme="endfield"。
 *
 * ⚠️ 首屏防闪的引导脚本在 Base.astro 的 <head> 里内联着，
 *    它必须在本模块之前执行（body 还没绘制就定好主题）。
 *    改动这里的键名时，那边要同步改 —— 两处的字符串必须一致。
 */

export type UiTheme = "winui" | "endfield";

/** localStorage 键。Base.astro 的引导脚本里写了同一个字符串。 */
export const THEME_KEY = "blog:ui-theme";

/** 两套皮肤各自的底色与字色 —— 用于在 CSS 到达前先把底色铺对 */
const PAINT: Record<UiTheme, { bg: string; fg: string; scheme: "light" | "dark" }> = {
  winui: { bg: "#202020", fg: "#ffffff", scheme: "dark" },
  endfield: { bg: "#f4f4f2", fg: "#161616", scheme: "light" },
};

/** 读当前主题；无存储或存储损坏都回落到默认的 WinUI 3 */
export function currentTheme(): UiTheme {
  try {
    return localStorage.getItem(THEME_KEY) === "endfield" ? "endfield" : "winui";
  } catch {
    // 隐私模式 / 存储被禁用时 localStorage 会抛异常
    return "winui";
  }
}

/**
 * 把主题落到 DOM 上。
 *
 * 内联 backgroundColor / color / colorScheme 这三项是**防闪的关键**：
 * CSS 里那套 token 还在下载时，浏览器也得先画一个背景，
 * 内联值保证那一瞬间就是对的颜色，不会先闪一下白或黑。
 */
export function applyTheme(theme: UiTheme): void {
  const root = document.documentElement;
  const paint = PAINT[theme];

  if (theme === "endfield") root.dataset.siteTheme = "endfield";
  else delete root.dataset.siteTheme;

  root.style.backgroundColor = paint.bg;
  root.style.color = paint.fg;
  root.style.colorScheme = paint.scheme;
}

/** 写存储并应用 */
export function setTheme(theme: UiTheme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // 存不下就只改这一次会话的外观，不打断交互
  }
  applyTheme(theme);
}

/** 在两套之间来回切 */
export function toggleTheme(): UiTheme {
  const next: UiTheme = currentTheme() === "endfield" ? "winui" : "endfield";
  setTheme(next);
  return next;
}

/** 给人看的名字 */
export const THEME_LABEL: Record<UiTheme, string> = {
  winui: "WinUI 3",
  endfield: "终末地",
};
