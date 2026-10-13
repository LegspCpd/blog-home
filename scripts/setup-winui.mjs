/**
 * 本地开发前置：准备 WinUIonWeb 上游源码。
 *
 * 为什么需要这一步：
 * 上游不是 npm 依赖 —— 它的 package.json 只把 dist-lib 暴露为 exports，
 * 而 NavigationViewMenuItems / NavigationViewItem 这类 XAML 属性组件
 * **只存在于 src/**，用包根具名导入会得到 MISSING_EXPORT，
 * NavigationView 只能渲染空壳。所以构建直接吃上游源码目录。
 *
 * 用法：
 *   node scripts/setup-winui.mjs
 *
 * 等价于 CI 里做的那两步（见 .github/workflows/ci.yml）：
 *   1. 把上游克隆到 ../WinUIonWeb（与 astro.config.mjs 的 winui-src 别名一致）
 *   2. 删掉上游的 tsconfig —— 它们 extends 的是上游自己的 devDependency
 *      （@tsconfig/node24、@vue/tsconfig），而我们不装上游依赖，
 *      Vite 处理上游文件时解析 tsconfig 会失败。
 *      上游组件全部用相对导入、没有 paths 别名，所以删掉没有副作用。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
const UPSTREAM = path.resolve(REPO, "../WinUIonWeb");
const UPSTREAM_REPO = path.join(UPSTREAM, "WinUIonWeb");
const SRC = path.join(UPSTREAM_REPO, "src");

/** 钉住上游提交，保证任何机器上构建出的东西一致 */
const PINNED_SHA = "e3bef96";

const git = (args, cwd) =>
  execFileSync("git", args, { cwd, stdio: "inherit", encoding: "utf8" });

console.log("[setup-winui] 仓库根目录:", REPO);
console.log("[setup-winui] 上游目标位置:", UPSTREAM_REPO);

if (!existsSync(path.join(UPSTREAM, ".git"))) {
  if (existsSync(UPSTREAM)) {
    console.error(
      `[setup-winui] ${UPSTREAM} 已存在但不是 git 仓库，请先手动清理。`
    );
    process.exit(1);
  }
  console.log("[setup-winui] 克隆上游…");
  git(["clone", "https://github.com/Furry-Xiyi/WinUIonWeb.git", UPSTREAM], REPO);
} else {
  console.log("[setup-winui] 上游已存在，跳过克隆");
}

if (!existsSync(SRC)) {
  console.error(`[setup-winui] 找不到 ${SRC}，克隆结果不完整。`);
  process.exit(1);
}

// 检出钉住的提交（只在可解析时执行，避免浅克隆下的意外失败）
try {
  git(["checkout", "--quiet", PINNED_SHA], UPSTREAM);
  console.log(`[setup-winui] 已检出 ${PINNED_SHA}`);
} catch {
  console.warn(
    `[setup-winui] 无法检出 ${PINNED_SHA}（可能是浅克隆），沿用当前 HEAD。`
  );
}

// 删掉上游 tsconfig —— 理由见文件头注释
const removed = readdirSync(UPSTREAM_REPO).filter((f) =>
  /^tsconfig(\..+)?\.json$/.test(f)
);
for (const f of removed) rmSync(path.join(UPSTREAM_REPO, f), { force: true });
console.log(
  removed.length
    ? `[setup-winui] 已移除上游 tsconfig: ${removed.join(", ")}`
    : "[setup-winui] 上游没有 tsconfig，跳过"
);

console.log("[setup-winui] 完成，可以 pnpm build 了。");
