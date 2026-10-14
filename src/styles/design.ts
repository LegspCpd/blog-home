/**
 * 设计系统 —— 直接采用 WinUIonWeb 自己的 Fluent 令牌
 *
 * 与上一版（自创的「霓虹近黑」体系）的根本区别：
 * 这套值不再是"我挑的颜色"，而是**引用上游 theme.css 在 :root 上定义的
 * Fluent 自定义属性**。vue-app.js 已经全局 import 了那份 theme.css，
 * 所以页面里 --app-bg / --card-bg / --text-primary / --accent-base
 * 全都是活的（实测：rgb(32,32,32) / rgba(255,255,255,0.05) / #fff / #4CC2FF）。
 *
 * 这么做的理由不只是省事：站点里的 NavigationView、Button、ScrollViewer
 * 读的是同一批令牌。只要我们也读它们，配色就永远跟着控件走，
 * 不会出现"卡片是自定义色、旁边的控件是 Fluent 色"的割裂。
 * 每个引用都带 WinUI 3 暗色的官方兜底值，CSS 还没加载时也不会闪白。
 *
 * 令牌名保持不变（--c-base / --line-base / --c-neon-volt …），
 * 让既有样式表继续可用，只是语义从"霓虹"变成"Fluent 强调色"。
 */

/* ── Fluent 基础令牌（原样引用上游，附 WinUI 3 Dark 兜底）─────────── */
export const fluent = {
  appBg: "var(--app-bg, #202020)",
  /* LayerFillColorDefault —— 卡片/图层 */
  layerFill: "var(--card-bg, rgba(255, 255, 255, 0.0512))",
  layerFillSecondary: "var(--card-bg-secondary, rgba(255, 255, 255, 0.0326))",
  /* SubtleFill —— hover / pressed 的透明叠加 */
  subtleSecondary: "var(--subtle-secondary, rgba(255, 255, 255, 0.0605))",
  subtleTertiary: "var(--subtle-tertiary, rgba(255, 255, 255, 0.0419))",
  /* 描边：WinUI 暗色下 CardStrokeColorDefault 是半透明白 */
  strokeDefault: "var(--card-stroke, rgba(255, 255, 255, 0.0698))",
  /* TextFillColor */
  textPrimary: "var(--text-primary, #ffffff)",
  textSecondary: "var(--text-secondary, rgba(255, 255, 255, 0.786))",
  textTertiary: "var(--text-tertiary, rgba(255, 255, 255, 0.5442))",
  textDisabled: "var(--text-disabled, rgba(255, 255, 255, 0.3628))",
  /* AccentFillColorDefault */
  accent: "var(--accent-base, #4cc2ff)",
  accentText: "var(--accent-text, #000000)",
  /* SystemFillColor —— WinUI 的语义色 */
  success: "var(--system-success, #6ccb5f)",
  caution: "var(--system-caution, #fce100)",
  critical: "var(--system-critical, #ff99a4)",
  neutral: "var(--system-neutral, rgba(255, 255, 255, 0.5442))",
} as const;

/* ── 画布与表面：WinUI 的图层阶梯 ─────────────────────────────────── */
export const canvas = {
  /* SolidBackgroundFillColorBase —— WinUI 窗口底色 #202020 */
  base: fluent.appBg,
  /* 一级图层：卡片 */
  s1: fluent.layerFill,
  /* 二级：hover */
  s2: fluent.subtleSecondary,
  /* 三级：浮层、下拉 */
  s3: fluent.subtleTertiary,
  /* 内嵌：代码块、输入框（比底色更暗一档） */
  inset: "rgba(255, 255, 255, 0.0326)",
} as const;

/* 发丝描边：WinUI 用不同透明度的白撑层级，而不是阴影 */
export const line = {
  soft: "rgba(255, 255, 255, 0.0419)",
  base: "rgba(255, 255, 255, 0.0698)",
  strong: "rgba(255, 255, 255, 0.1045)",
} as const;

/**
 * 强调色。
 * 键名沿用上一版（volt/lilac/…），但值已换成 WinUI 的语义色 ——
 * 这样既不用改所有引用点，配色又回到了 Fluent 体系内。
 */
export const neon = {
  /* 主强调：AccentFillColorDefault */
  volt: fluent.accent,
  /* 次要强调：Fluent 的 attention 变体 */
  lilac: "#8b8dff",
  /* 语义色，供文章情绪色取用 */
  peach: fluent.critical,
  mint: fluent.success,
  sky: fluent.accent,
  lav: "#b4a0e8",
  gold: fluent.caution,
} as const;

/** 文章情绪色池 —— 全部来自 WinUI 语义色，保证与控件同源 */
export const moodPool = [
  neon.sky,
  neon.mint,
  neon.gold,
  neon.peach,
  neon.lav,
  neon.volt,
] as const;

/** 按 slug 稳定地挑一个情绪色：同一篇文章永远是同一个颜色 */
export function moodOf(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) | 0;
  }
  return moodPool[Math.abs(h) % moodPool.length];
}

/* ── 文字：WinUI 的 TextFillColor 三级 ───────────────────────────── */
export const text = {
  ink: fluent.textPrimary,
  body: fluent.textSecondary,
  muted: fluent.textTertiary,
  faint: fluent.textDisabled,
  /* 强调色块上的前景：WinUI 暗色下是纯黑 */
  onNeon: fluent.accentText,
} as const;

/**
 * 字阶：对齐 WinUI 3 的 type ramp（Segoe UI Variable）。
 *
 *   Caption 12 / Body 14 / BodyStrong 14 SemiBold
 *   Subtitle 20 SemiBold / Title 28 SemiBold / TitleLarge 40 SemiBold
 *
 * 不再用负字距和大写宽字距 —— 那是上一版霓虹风格的手法，
 * WinUI 的字距基本是 0，靠字重和字号拉开层次。
 */
export const type = {
  mega: { size: 40, weight: 600, lh: 1.15, ls: -0.5 },
  display: { size: 28, weight: 600, lh: 1.2, ls: -0.3 },
  heading: { size: 20, weight: 600, lh: 1.28, ls: -0.1 },
  sub: { size: 14, weight: 600, lh: 1.43, ls: 0 },
  body: { size: 14, weight: 400, lh: 1.6, ls: 0 },
  small: { size: 12, weight: 400, lh: 1.5, ls: 0 },
  eyebrow: { size: 12, weight: 600, lh: 1.3, ls: 0 },
} as const;

/**
 * 圆角：WinUI 3 只有两档半 ——
 *   ControlCornerRadius 4（控件）、OverlayCornerRadius 8（卡片/浮层）。
 * 上一版那套 26px 的 hero 圆角是 MiniMax 的语言，不属于 WinUI。
 */
export const radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 8,
  hero: 8,
  pill: 999,
} as const;

/**
 * 长文可读行宽。
 *
 * WinUI 的内容是左对齐的，所以正文不再用 margin:0 auto 居中 ——
 * 居中会让正文与页头标题对不齐。行宽仍然要限制：
 * 中文长文一行超过 40 字左右就很难回行阅读。
 */
export const readable = {
  /** 正文 */
  prose: 720,
  /** 文章头部的摘要等 */
  head: 760,
} as const;

/** 间距：WinUI 的 4 的倍数栅格 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 48,
} as const;

/**
 * 动效：Fluent 的时长与曲线。
 * 控件类用 FastOutLinearIn/FastOutSlowIn，入场用减速曲线。
 */
export const motion = {
  /* 按下、hover 变色 */
  snap: { ms: 100, curve: "cubic-bezier(0, 0, 0, 1)" },
  /* 标准过渡 */
  quick: { ms: 167, curve: "cubic-bezier(0.8, 0, 0.2, 1)" },
  /* 入场：有减速惯性 */
  heavy: { ms: 250, curve: "cubic-bezier(0.16, 1, 0.3, 1)" },
} as const;

/** 生成 transition 简写，避免各处手写字符串 */
export function trans(kind: keyof typeof motion): string {
  const m = motion[kind];
  return `${m.ms}ms ${m.curve}`;
}

/** 生成 font 简写 */
export function font(t: keyof typeof type): string {
  const x = type[t];
  return `${x.weight} ${x.size}px/${x.lh} var(--sans)`;
}

/**
 * 输出成 CSS 自定义属性，注入 :root。
 * 值本身又是 var(--app-bg …) 这类引用，CSS 变量在"被使用"时才求值，
 * 所以即使这份内联样式先于 theme.css 到达，也不会闪白 —— 兜底值就是
 * WinUI 3 暗色的官方值。
 */
export function designVars(): string {
  const v: string[] = [];
  for (const [k, val] of Object.entries(canvas)) v.push(`--c-${k}:${val}`);
  for (const [k, val] of Object.entries(line)) v.push(`--line-${k}:${val}`);
  for (const [k, val] of Object.entries(neon)) v.push(`--c-neon-${k}:${val}`);
  for (const [k, val] of Object.entries(text)) v.push(`--c-${k}:${val}`);
  for (const [k, val] of Object.entries(radius)) v.push(`--r-${k}:${val}px`);
  for (const [k, val] of Object.entries(space)) v.push(`--s-${k}:${val}px`);
  for (const [k, val] of Object.entries(type)) {
    v.push(`--t-${k}-size:${val.size}px`);
    v.push(`--t-${k}-weight:${val.weight}`);
    v.push(`--t-${k}-lh:${val.lh}`);
    v.push(`--t-${k}-ls:${val.ls}px`);
  }
  for (const [k, val] of Object.entries(motion)) {
    v.push(`--m-${k}:${val.ms} ${val.curve}`);
  }
  return v.join(";");
}
