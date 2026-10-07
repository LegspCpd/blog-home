/**
 * 设计系统 —— 「看似整洁，实际很有个性」的唯一数据源
 *
 * 气质来源（读完全部六份 DESIGN.md 之后混合）：
 *
 * · Linear     最深的近黑画布 #010102、四级表面阶梯、发丝边框撑起全部层级、
 *              display 字距拉到 -3px、紫色只出现在极少数地方
 * · Raycast    纯黑画布 + 紧凑 6–10px 圆角 + 单一白色主 CTA + 命令面板式的行
 * · VoltAgent  电光绿、1px 发丝边框当唯一的"阴影"、等宽字承载技术语气、
 *              大写 + 宽字距的 eyebrow 标签
 * · Cursor     400 字重的杂志感 display（不靠粗体说话）、负字距、
 *              一组柔和的粉彩标签色、暖调而非纯黑
 * · MiniMax    药丸按钮、饱和的产品色身份、超大圆角的"featured"卡片、
 *              32px 与 16px 圆角的对比当作视觉签名
 * · Superhuman 三段画布（靛蓝→白→深青）、次默认字重（460/540）的温度感、
 *              0.96 的极紧行高、收尾必须有一个深色 CTA 带
 *
 * 我自己的取舍（用户要求「整洁但有性格、有点随性、有点乱、有点 neon」）：
 *
 * 1. 底色不用纯黑，取 #08090c —— 比 Linear 的 #010102 稍亮，比 Raycast 的
 *    #07080a 稍冷，留出霓虹色的空间
 * 2. 霓虹只给三处：链接、主强调、以及每篇文章的一个随机"情绪色"。
 *    颜色从 Cursor 的五个粉彩 + VoltAgent 的电光绿里按文章哈希取，
 *    所以同一篇文章每次打开颜色一致，不同文章之间是乱的
 * 3. 留白故意不对称：首篇大卡跨两列，其余单列，间距在 24/32/56 之间跳动
 * 4. 动效全部短促（90–260ms）并用不同的曲线，让它有"重量"而不是"飘"
 */

/* ── 画布与表面（Linear 的四级阶梯 + Cursor 的暖调偏移）───────────── */
export const canvas = {
  /* 最底：带一点蓝的近黑，不是纯黑 */
  base: "#08090c",
  /* 卡片：一级抬升 */
  s1: "#0e1013",
  /* 二级抬升：hover 的卡片 */
  s2: "#14171b",
  /* 三级抬升：浮层、下拉 */
  s3: "#1b1f24",
  /* 内嵌：代码块、输入框 */
  inset: "#060709",
} as const;

/* 发丝边框：Linear 三档 + Raycast 的 rgba 层 */
export const line = {
  soft: "rgba(255, 255, 255, 0.05)",
  base: "rgba(255, 255, 255, 0.09)",
  strong: "rgba(255, 255, 255, 0.16)",
} as const;

/* ── 霓虹：只在极少数地方出现 ─────────────────────────────────────── */
export const neon = {
  /* VoltAgent 的电光绿，亮度最高，用作主 CTA */
  volt: "#00e59a",
  /* Linear 的薰衣草蓝 */
  lilac: "#8b8dff",
  /* Cursor 的粉彩组 —— 文章情绪色从这里取 */
  peach: "#ffb38a",
  mint: "#9fe6b4",
  sky: "#93c5fd",
  lav: "#cbb0f5",
  gold: "#e8b661",
} as const;

/** 文章情绪色池 —— 乱的来源，但每篇固定 */
export const moodPool = [
  neon.peach,
  neon.mint,
  neon.sky,
  neon.lav,
  neon.gold,
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

/* ── 文字：Cursor 的暖调偏移 + Linear 的四级 ─────────────────────── */
export const text = {
  /* 主标题：略带冷白的米色，参考 Cursor 的暖灰反向 */
  ink: "#f2f3f5",
  body: "#c3c7cf",
  muted: "#8b9099",
  faint: "#5c626c",
  onNeon: "#04070a",
} as const;

/* ── 字阶：Inter + 宽字距 eyebrow（VoltAgent）+ 负字距 display（Linear）───
 * 全部用 CSS font-feature-settings 控制，字体栈在 global.css
 */
export const type = {
  /* 巨型标题：56px，紧到 -2.2px，weight 500 —— 不靠 700 说话 */
  mega: { size: 56, weight: 500, lh: 1.04, ls: -2.2 },
  /* 区块标题 */
  display: { size: 34, weight: 500, lh: 1.12, ls: -1.1 },
  /* 卡片标题 */
  heading: { size: 20, weight: 600, lh: 1.3, ls: -0.4 },
  sub: { size: 16, weight: 600, lh: 1.4, ls: -0.15 },
  body: { size: 15.5, weight: 400, lh: 1.72, ls: 0 },
  small: { size: 13.5, weight: 400, lh: 1.6, ls: 0 },
  /* VoltAgent 的招牌：14px / 600 / 2.5px 大写眉标 */
  eyebrow: { size: 11, weight: 700, lh: 1.3, ls: 2.4 },
} as const;

/* ── 圆角：Linear 12px 为主 + MiniMax 的 32px 做"featured"签名 ────── */
export const radius = {
  xs: 4,
  sm: 7,
  md: 11,
  lg: 14,
  /* MiniMax 的 hero 圆角——只用在首篇大卡上，制造半径对比 */
  hero: 26,
  pill: 999,
} as const;

/* ── 间距：故意做成非等差，制造"随性"的节奏 ─────────────────────── */
export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 26,
  xl: 40,
  xxl: 64,
  /* 区块呼吸 */
  section: 104,
} as const;

/* ── 动效：短促、有重量、不同环节用不同曲线 ──────────────────────
 * MiniMax 建议 150–200ms；我把按下压到 90ms 让它"咬"一下，
 * 展开给到 260ms 让它有惯性感
 */
export const motion = {
  /* 极快：按下、hover 颜色 */
  snap: { ms: 90, curve: "cubic-bezier(0.2, 0, 0, 1)" },
  /* 标准：hover 抬起、淡入 */
  quick: { ms: 170, curve: "cubic-bezier(0.33, 0, 0.67, 1)" },
  /* 有重量：卡片进入、导航切换 */
  heavy: { ms: 260, curve: "cubic-bezier(0.16, 1, 0.3, 1)" },
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
 * 与组件里直接 import 常量不同，这里让全局样式能引用同一套值，
 * 避免同一个颜色在两处各写一遍。
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
    v.push(`--m-${k}:${val.ms}ms ${val.curve}`);
  }
  return v.join(";");
}
