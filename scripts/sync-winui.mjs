/**
 * 同步 WinUIonWeb 上游到本仓库（vendor/winuionweb）。
 *
 * 组件库是**内联进来**的，不是 npm 依赖，也不是外部目录：
 *   · 不能当 npm 依赖 —— 上游 package.json 只暴露 dist-lib，
 *     而 NavigationViewMenuItems / NavigationViewItem 这类 XAML 属性组件
 *     只在 src/ 里，用包出口的具名导入会 MISSING_EXPORT，
 *     NavigationView 只能渲染空壳。
 *   · 不能读仓库外的目录 —— 本机能跑，但任何"只拿这个仓库"的构建器
 *     （包括 EdgeOne Pages 的 Git 自动部署）都会失败，
 *     线上会一直停在最后一个构建成功的旧版本。
 *
 * 用法：
 *   node scripts/sync-winui.mjs            # 用已有的克隆
 *   node scripts/sync-winui.mjs --clone    # 没有克隆就先克隆
 *
 * 只同步真正需要的子集（约 4.8 MB / 297 文件）：
 *   components/  utils/  styles/  index.ts  shims-vue.d.ts
 * 上游的 assets(5.6M) 与 gallery(3.5M) 是它自己的 demo 应用，与本项目无关；
 * components 只反向依赖 utils/navigationTransitionInfo，不碰那两块。
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
const UPSTREAM = path.resolve(REPO, "../WinUIonWeb");
const UPSTREAM_SRC = path.join(UPSTREAM, "WinUIonWeb", "src");
const VENDOR = path.join(REPO, "vendor", "winuionweb");

/** 需要同步的子集；顺序即复制顺序 */
const ENTRIES = [
  ["components", "dir"],
  ["utils", "dir"],
  ["styles", "dir"],
  ["index.ts", "file"],
  ["shims-vue.d.ts", "file"],
];
/** 一并带过来，保证许可证信息随源码走 */
const LEGAL = ["LICENSE", "THIRD_PARTY_NOTICES.md"];

if (process.argv.includes("--clone") && !existsSync(UPSTREAM_SRC)) {
  console.log("[sync-winui] 克隆上游到", UPSTREAM);
  execFileSync("git", ["clone", "https://github.com/Furry-Xiyi/WinUIonWeb.git", UPSTREAM], {
    cwd: REPO,
    stdio: "inherit",
  });
}

if (!existsSync(UPSTREAM_SRC)) {
  console.error(
    [
      "",
      "找不到上游源码：",
      "  " + UPSTREAM_SRC,
      "",
      "先克隆（或让脚本代劳）：",
      "  node scripts/sync-winui.mjs --clone",
      "",
    ].join("\n")
  );
  process.exit(1);
}

mkdirSync(VENDOR, { recursive: true });

for (const [name, kind] of ENTRIES) {
  const from = path.join(UPSTREAM_SRC, name);
  const to = path.join(VENDOR, name);
  if (!existsSync(from)) {
    console.warn(`[sync-winui] 上游没有 ${name}，跳过`);
    continue;
  }
  if (kind === "dir") {
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
  } else {
    copyFileSync(from, to);
  }
  console.log(`[sync-winui] ${name}`);
}

for (const name of LEGAL) {
  const from = path.join(UPSTREAM, "WinUIonWeb", name);
  if (existsSync(from)) {
    copyFileSync(from, path.join(VENDOR, name));
    console.log(`[sync-winui] ${name}`);
  }
}

// 上游的 tsconfig 不要带过来：它们 extends 上游自己的 devDependency
// （@tsconfig/node24、@vue/tsconfig），我们没装，Vite 解析会失败。
for (const f of ["tsconfig.json", "tsconfig.app.json", "tsconfig.lib.json", "tsconfig.node.json"]) {
  rmSync(path.join(VENDOR, f), { force: true });
}

console.log("[sync-winui] 完成。请跑 pnpm build 验证，然后提交 vendor/ 的改动。");
