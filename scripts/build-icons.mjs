/**
 * 站点图标构建。
 *
 * ## 为什么要脚本化
 *
 * 原来的 9 个图标是各次手工导出的，实测结果：
 *
 *   尺寸      圆角半径/宽
 *   32px      15.6%   ← 异类（用了 5px 固定值，而不是按比例）
 *   128px     20.7%
 *   180px     21.4%
 *   192px     21.4%
 *
 * 也就是说**同一个标志在不同地方形状不一样**：浏览器标签页里偏方，
 * 主屏/收藏夹里偏圆。这正是"图标不统一"的来源。
 * 另外 favicon.ico 是一个 33x32 的单尺寸 BMP（宽度都不是 32），
 * 且 apple-touch-icon 四角透明 —— iOS 会把透明角落填成黑色。
 *
 * ## 做法
 *
 * · **单一母版**：以 192px 那两张为源，其余尺寸全部由它重采样得到，
 *   形状因此天然一致（就是同一张图缩放），不需要我反推圆角曲线。
 * · **apple-touch / maskable 单独渲染**：这两种必须是**满幅不透明**的
 *   方形（iOS 和 Android 都会自己再加一层遮罩），不能再带圆角。
 *   这里用 SVG 参数化渲染，不依赖母版。
 * · **.ico 手写**：内嵌 PNG 的 ICO 格式很简单，不值得为它装依赖。
 *
 * 运行：node scripts/build-icons.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
const DIR = path.join(ROOT, "public", "favicon");

/**
 * 实测得到的规格（来自 192px 母版）。
 * 这些数字不是"设计"出来的，是量出来的 —— 改之前先重新量一遍。
 */
const SPEC = {
  /** "light" = 浅色主题用的深色底；"dark" = 深色主题用的白底 */
  light: { bg: "#1e212b", dot: "#90aafa" },
  dark: { bg: "#ffffff", dot: "#819ae9" },
  /** 圆点直径占画布的比例 */
  dot: 0.25,
  /** 圆点圆心位置（占画布的比例） */
  center: 0.3,
};

/**
 * 需要产出的尺寸 —— 只产出真正被引用的，多余尺寸只增加仓库体积。
 *
 *   32   浏览器标签页（浅/深两套，靠 prefers-color-scheme 切换）
 *   128  应用标题栏的图标（WinShellClient.vue 里引用，**客户端渲染**，
 *        所以不会被"扫 HTML 找引用"的检查发现）
 *   192  安卓主屏 / manifest
 *   512  manifest 与 PWA 启动图
 *
 * 16/48 只存在于 favicon.ico 内部，不需要单独的 PNG。
 */
const SIZES = [32, 128, 192, 512];

/** 满幅渲染色（apple-touch / maskable 用），按变体取背景色 */
const fullBleedSvg = (size, { bg, dot }) => {
  const c = SPEC.center * 100;
  const r = (SPEC.dot / 2) * 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${bg}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="${dot}"/>
</svg>`;
};

/** 手写 ICO：每个条目内嵌一张 PNG（Vista 以后都支持） */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + 16 * entries.length;
  const blobs = [];

  entries.forEach(({ size, data }, i) => {
    const o = i * 16;
    // 256 在 ICO 里用 0 表示
    dir.writeUInt8(size >= 256 ? 0 : size, o + 0);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2); // 调色板数
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // planes
    dir.writeUInt16LE(32, o + 6); // bpp
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
    blobs.push(data);
  });

  return Buffer.concat([header, dir, ...blobs]);
}

const png = (input, size) =>
  sharp(input).resize(size, size, { kernel: "lanczos3", fit: "fill" }).png({ compressionLevel: 9 }).toBuffer();

async function main() {
  const masters = {
    light: path.join(DIR, "favicon-light-192.png"),
    dark: path.join(DIR, "favicon-dark-192.png"),
  };
  for (const [k, p] of Object.entries(masters)) {
    if (!existsSync(p)) {
      console.error(`找不到母版 ${k}: ${p}`);
      process.exit(1);
    }
  }

  const made = [];

  // ── 1. 常规图标：全部由母版重采样，形状天然一致 ──────────────
  for (const variant of ["light", "dark"]) {
    for (const size of SIZES) {
      const out = path.join(DIR, `favicon-${variant}-${size}.png`);
      writeFileSync(out, await png(masters[variant], size));
      made.push(`favicon-${variant}-${size}.png`);
    }
  }

  // ── 2. apple-touch-icon：必须满幅不透明 ──────────────────────
  // iOS 会自己给主屏图标加圆角遮罩；如果图里自带圆角 + 透明角落，
  // 透明部分会被渲染成黑色。原来那版就是四角透明的。
  const appleSize = 180;
  writeFileSync(
    path.join(DIR, "apple-touch-icon.png"),
    await sharp(Buffer.from(fullBleedSvg(appleSize, SPEC.dark))).png({ compressionLevel: 9 }).toBuffer()
  );
  made.push("apple-touch-icon.png");

  // ── 3. maskable：Android 自适应图标同样要求满幅 ──────────────
  for (const size of [192, 512]) {
    writeFileSync(
      path.join(DIR, `maskable-${size}.png`),
      await sharp(Buffer.from(fullBleedSvg(size, SPEC.light))).png({ compressionLevel: 9 }).toBuffer()
    );
    made.push(`maskable-${size}.png`);
  }

  // ── 4. favicon.ico：多尺寸内嵌 PNG ───────────────────────────
  // 原来那个是 33x32 的单尺寸 BMP —— 宽度都不是 32，某些老环境会画歪。
  const icoEntries = [];
  for (const size of [16, 32, 48]) {
    icoEntries.push({ size, data: await png(masters.light, size) });
  }
  writeFileSync(path.join(DIR, "favicon.ico"), buildIco(icoEntries));
  made.push("favicon.ico");

  console.log(`图标构建完成，共 ${made.length} 个：`);
  for (const m of made) console.log("  " + m);
}

main();
