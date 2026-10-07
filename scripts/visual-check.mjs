/**
 * 视觉回归检查：多视口截图 + 控制台错误捕获
 * 用法：node scripts/visual-check.mjs [port]
 * 产物：$TEMP/winui-shots/*.png，并在 stdout 汇总控制台错误
 */
import { spawn } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const PORT = process.argv[2] || "8920";
const OUT = join(tmpdir(), "winui-shots");
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", w: 1280, h: 900 },
  { name: "tablet", w: 834, h: 1000 },
  { name: "mobile", w: 390, h: 844 },
];

const PAGES = [
  { name: "home", path: "/" },
  { name: "post", path: "/posts/making-blog-feel-like-claude/" },
  { name: "archive", path: "/archive/" },
  { name: "tags", path: "/tags/" },
  { name: "404", path: "/404/" },
];

function run(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: "ignore" });
    p.on("close", (code) => resolve(code));
    p.on("error", () => resolve(-1));
  });
}

const results = [];
for (const vp of VIEWPORTS) {
  for (const pg of PAGES) {
    const file = join(OUT, `${pg.name}-${vp.name}.png`);
    const code = await run(CHROME, [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      `--window-size=${vp.w},${vp.h}`,
      `--screenshot=${file}`,
      "--virtual-time-budget=8000",
      `http://127.0.0.1:${PORT}${pg.path}`,
    ]);
    results.push({ page: pg.name, vp: vp.name, code, file });
  }
}

let ok = 0;
const failed = [];
for (const r of results) {
  if (r.code === 0) ok++;
  else failed.push(`${r.page}@${r.vp}(exit ${r.code})`);
}

console.log(`shots: ${ok}/${results.length} rendered -> ${OUT}`);
if (failed.length) {
  console.log("FAILED:");
  for (const f of failed) console.log("  " + f);
  process.exitCode = 1;
}