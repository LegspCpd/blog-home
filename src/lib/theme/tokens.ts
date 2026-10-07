/**
 * Win UI 设计令牌 — Fluent UI Web Components v3
 *
 * v3 的 reality（与官方 styling 文档有出入，别照抄）：
 * 文档说暗色靠 `baseLayerLuminance = StandardLuminance.DarkMode` 切换自适应算法，
 * 但 v3.1.3 实际导出的是 400+ 个**扁平具体色值** token（--colorNeutralBackground1 等），
 * theme/ 目录下不存在任何 luminance token，也没有算法层。
 *
 * 所以本项目的做法是：不赌算法，自己把 Win11 的明暗两套色值写全，
 * 用官方 setTheme() 写入 CSS 自定义属性 —— key 不带 `--` 前缀。
 *
 * 关键约束（官方明令）：这些 CSS 自定义属性一旦由 setTheme 接管，
 * 就【不要】在样式表里用同名变量重新声明，否则组件会渲染错误颜色并破坏无障碍对比度。
 * 需要微调请改这里的值，不要写进 CSS。
 */

export type ThemeName = "dark" | "light";

type ThemeTokens = Record<string, string | number>;

/** 圆角阶梯 —— Win11 的标志性柔和圆角 */
const radius = {
  none: "0px",
  small: "4px",
  medium: "7px",   // Win11 控件默认
  large: "8px",
  xlarge: "12px",  // 卡片 / 浮层
  circular: "9999px",
};

/**
 * 暗色 —— 站点默认主题。
 * 色值取自 Win11 Fluent Design 的 Mica 深色体系：
 * 背景是略带蓝的黑（#202020 系），前景接近纯白，层级靠极微差的明度堆叠。
 */
const dark: ThemeTokens = {
  // ---- 背景层级：越靠上层越亮，模拟 Mica 材质叠层 ----
  colorNeutralBackground1: "#202020",        // 页面底
  colorNeutralBackground2: "#1c1c1c",        // 更沉的下层
  colorNeutralBackground3: "#282828",        // 卡片 / 浮层
  colorNeutralBackground4: "#2d2d2d",
  colorNeutralBackground5: "#333333",
  colorNeutralBackground6: "#3a3a3a",
  colorSubtleBackground: "#ffffff0a",         // 极淡填充
  colorSubtleBackgroundHover: "#ffffff12",
  colorSubtleBackgroundPressed: "#ffffff1a",
  colorSubtleBackgroundSelected: "#ffffff14",
  colorBackgroundOverlay: "#2c2c2c",
  colorTransparentBackground: "transparent",

  // ---- 前景：正文到弱提示的 4 级 ----
  colorNeutralForeground1: "#ffffff",         // 标题 / 正文
  colorNeutralForeground2: "#e6e6e6",
  colorNeutralForeground3: "#c5c5c5",         // 次要文本
  colorNeutralForeground4: "#9a9a9a",         // 弱提示
  colorNeutralForegroundDisabled: "#5c5c5c",
  colorNeutralForegroundOnBrand: "#000000",

  // ---- 品牌强调色：Win11 经典蓝 ----
  colorBrandBackground: "#0078d4",
  colorBrandBackgroundHover: "#1a86d9",
  colorBrandBackgroundPressed: "#005fb0",
  colorBrandBackgroundSelected: "#005fb0",
  colorBrandForeground1: "#c7e0f4",
  colorBrandForeground2: "#9cc9ec",

  // ---- 描边：卡片/输入框边界 ----
  colorNeutralStroke1: "#3d3d3d",
  colorNeutralStroke2: "#484848",
  colorNeutralStroke3: "#5a5a5a",
  colorNeutralStrokeAccessible: "#8a8a8a",    // 需满足对比度的边界
  colorStrokeFocus1: "#4cc2ff",               // 键盘焦点环
  colorStrokeFocus2: "#4cc2ff",
  colorTransparentStroke: "transparent",

  // ---- 圆角 / 字体 ----
  borderRadiusNone: radius.none,
  borderRadiusSmall: radius.small,
  borderRadiusMedium: radius.medium,
  borderRadiusLarge: radius.large,
  borderRadiusXLarge: radius.xlarge,
  borderRadiusCircular: radius.circular,
  fontFamilyBase: "'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  fontFamilyMonospace: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  fontSizeBase100: "12px",
  fontSizeBase200: "14px",
  fontSizeBase300: "14px",
  fontSizeBase400: "16px",
  fontSizeBase500: "20px",
  fontSizeBase600: "24px",
  fontWeightRegular: "400",
  fontWeightMedium: "500",
  fontWeightSemibold: "600",
  lineHeightBase100: "16px",
  lineHeightBase200: "20px",
  lineHeightBase300: "20px",
  lineHeightBase400: "24px",
  lineHeightBase500: "28px",
  lineHeightBase600: "32px",

  // ---- 间距 / 动效 ----
  spacingHorizontalS: "8px",
  spacingHorizontalM: "12px",
  spacingHorizontalL: "16px",
  spacingHorizontalXL: "20px",
  spacingVerticalS: "8px",
  spacingVerticalM: "12px",
  spacingVerticalL: "16px",
  durationFast: "100ms",
  durationNormal: "150ms",
  durationSlow: "250ms",
  curveEasyEase: "cubic-bezier(0.33, 0, 0.67, 1)",

  // ---- 阴影：Win11 飞浮层用双层阴影营造悬浮感 ----
  shadow2: "0 1px 2px rgba(0,0,0,.28)",
  shadow4: "0 2px 4px rgba(0,0,0,.28)",
  shadow8: "0 4px 8px rgba(0,0,0,.32)",
  shadow16: "0 8px 16px rgba(0,0,0,.36)",
  shadow28: "0 14px 28px rgba(0,0,0,.40)",
  shadow64: "0 32px 64px rgba(0,0,0,.44)",
};

/** 亮色 —— 由暗色推导而来，保持同一套语义位置 */
const light: ThemeTokens = {
  colorNeutralBackground1: "#f3f3f3",        // 页面底
  colorNeutralBackground2: "#eeeeee",
  colorNeutralBackground3: "#ffffff",        // 卡片浮起
  colorNeutralBackground4: "#fafafa",
  colorNeutralBackground5: "#ffffff",
  colorNeutralBackground6: "#ffffff",
  colorSubtleBackground: "#00000008",
  colorSubtleBackgroundHover: "#0000000f",
  colorSubtleBackgroundPressed: "#00000018",
  colorSubtleBackgroundSelected: "#00000010",
  colorBackgroundOverlay: "#ffffff",
  colorTransparentBackground: "transparent",

  colorNeutralForeground1: "#1a1a1a",
  colorNeutralForeground2: "#2d2d2d",
  colorNeutralForeground3: "#3d3d3d",
  colorNeutralForeground4: "#616161",
  colorNeutralForegroundDisabled: "#a0a0a0",
  colorNeutralForegroundOnBrand: "#ffffff",

  colorBrandBackground: "#0067c0",
  colorBrandBackgroundHover: "#1975c5",
  colorBrandBackgroundPressed: "#005494",
  colorBrandBackgroundSelected: "#005494",
  colorBrandForeground1: "#003a6d",
  colorBrandForeground2: "#2b5792",

  colorNeutralStroke1: "#d6d6d6",
  colorNeutralStroke2: "#e0e0e0",
  colorNeutralStroke3: "#ebebeb",
  colorNeutralStrokeAccessible: "#6b6b6b",
  colorStrokeFocus1: "#005fb0",
  colorStrokeFocus2: "#005fb0",
  colorTransparentStroke: "transparent",

  borderRadiusNone: radius.none,
  borderRadiusSmall: radius.small,
  borderRadiusMedium: radius.medium,
  borderRadiusLarge: radius.large,
  borderRadiusXLarge: radius.xlarge,
  borderRadiusCircular: radius.circular,
  fontFamilyBase: "'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  fontFamilyMonospace: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  fontSizeBase100: "12px",
  fontSizeBase200: "14px",
  fontSizeBase300: "14px",
  fontSizeBase400: "16px",
  fontSizeBase500: "20px",
  fontSizeBase600: "24px",
  fontWeightRegular: "400",
  fontWeightMedium: "500",
  fontWeightSemibold: "600",
  lineHeightBase100: "16px",
  lineHeightBase200: "20px",
  lineHeightBase300: "20px",
  lineHeightBase400: "24px",
  lineHeightBase500: "28px",
  lineHeightBase600: "32px",

  spacingHorizontalS: "8px",
  spacingHorizontalM: "12px",
  spacingHorizontalL: "16px",
  spacingHorizontalXL: "20px",
  spacingVerticalS: "8px",
  spacingVerticalM: "12px",
  spacingVerticalL: "16px",
  durationFast: "100ms",
  durationNormal: "150ms",
  durationSlow: "250ms",
  curveEasyEase: "cubic-bezier(0.33, 0, 0.67, 1)",

  shadow2: "0 1px 2px rgba(0,0,0,.10)",
  shadow4: "0 2px 4px rgba(0,0,0,.10)",
  shadow8: "0 4px 8px rgba(0,0,0,.12)",
  shadow16: "0 8px 16px rgba(0,0,0,.14)",
  shadow28: "0 14px 28px rgba(0,0,0,.16)",
  shadow64: "0 32px 64px rgba(0,0,0,.18)",
};

export const themes: Record<ThemeName, ThemeTokens> = { dark, light };

/** 站点默认主题：暗色优先 */
export const DEFAULT_THEME: ThemeName = "dark";

/** localStorage 键 */
export const THEME_STORAGE_KEY = "winui-theme";

/** 供 SSR 在首屏吐出正确的 data-theme，避免闪烁 */
export function dataThemeAttr(t: ThemeName): string {
  return t === "dark" ? "dark" : "light";
}