/**
 * 界面主题。
 *
 * 站上有三套外观：
 *   · "winui"          —— WinUI 3 风味（默认），深色应用壳
 *   · "endfield"       —— 终末地风味，浅色纸面
 *   · "endfield-dark"  —— 终末地风味，深色
 *
 * 实现方式和参考站 2x.nz 一致：**主题就是 <html> 上的 data 属性**。
 * 切换 = 改属性 + 写 localStorage，**不跳转、不重载、不追加任何东西**。
 *
 * 注意终末地的深浅是**两套完整主题**，不是反色 ——
 * 套件里深色的纸是 #191919、墨是 #EDEDED，而且「在这里」的那条线
 * 从墨色变成**黄色**（浅色下黄不能当线用，深色下可以）。
 * 所以深色不是靠 filter 或反转做的，是另一组 token。
 *
 * 两个属性分工：
 *   data-site-theme="endfield"  → 决定"用终末地这套皮肤"
 *   data-ef-dark                → 在终末地内部切深浅
 * WinUI 3 那套不打任何属性（默认）。
 *
 * ⚠️ 首屏防闪的引导脚本在 Base.astro 的 <head> 里内联着，
 *    改动这里的键名或属性名时，那边要同步改 —— 两处必须一致。
 */

export type UiTheme = "winui" | "endfield" | "endfield-dark";

/** localStorage 键。Base.astro 的引导脚本里写了同一个字符串。 */
export const THEME_KEY = "blog:ui-theme";

/** 每个主题在 CSS 到达前要先铺对的底色/字色 */
const PAINT: Record<UiTheme, { bg: string; fg: string; scheme: "light" | "dark" }> = {
  winui: { bg: "#202020", fg: "#ffffff", scheme: "dark" },
  endfield: { bg: "#f4f4f2", fg: "#161616", scheme: "light" },
  "endfield-dark": { bg: "#191919", fg: "#ededed", scheme: "dark" },
};

/** 三套主题按这个顺序轮换（左下角那一项点一下换下一个） */
export const THEME_ORDER: UiTheme[] = ["winui", "endfield", "endfield-dark"];

/** 读当前主题；无存储或存储损坏都回落到默认的 WinUI 3 */
export function currentTheme(): UiTheme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "endfield" || v === "endfield-dark" ? v : "winui";
  } catch {
    // 隐私模式 / 存储被禁用时 localStorage 会抛异常，不允许它打断交互
    return "winui";
  }
}

/**
 * 把主题落到 DOM 上。
 *
 * 内联 backgroundColor / color / colorScheme 是**防闪的关键**：
 * CSS 还在下载时浏览器也得先铺一个背景，内联值保证那一帧就是对的颜色。
 */
export function applyTheme(theme: UiTheme): void {
  const root = document.documentElement;
  const paint = PAINT[theme];

  if (theme === "winui") {
    delete root.dataset.siteTheme;
    delete root.dataset.efDark;
  } else {
    root.dataset.siteTheme = "endfield";
    if (theme === "endfield-dark") root.dataset.efDark = "1";
    else delete root.dataset.efDark;
  }

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

/** 按 THEME_ORDER 轮换到下一个 */
export function toggleTheme(): UiTheme {
  const i = THEME_ORDER.indexOf(currentTheme());
  const next = THEME_ORDER[(i + 1) % THEME_ORDER.length];
  setTheme(next);
  return next;
}

/** 给人看的名字 */
export const THEME_LABEL: Record<UiTheme, string> = {
  winui: "WinUI 3",
  endfield: "终末地",
  "endfield-dark": "终末地 深色",
};
