/**
 * EdgeOne（纯静态）构建脚本
 *
 * 串起：暂移动态路由 -> 生成图标 -> astro 静态构建 -> pagefind 索引 -> IndexNow 推送 -> 恢复动态路由
 * 使用 try/finally 确保无论构建是否成功都会恢复被暂移的动态路由文件，避免污染工作区。
 *
 * 用法：
 *   node scripts/build-edgeone.js
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, extraEnv = {}) {
  const result = spawnSync(cmd, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...extraEnv },
  });
  return result.status ?? 1;
}

// 支持 OUT_DIR 覆盖（默认为 dist），便于无痛验证
const outDir = process.env.OUT_DIR || "dist";

const prepareStatic = path.join(rootDir, "scripts", "prepare-static-build.js");

function main() {
  // 1. 暂移动态路由（indexnow / gh 代理）——EdgeOne 用 Edge Function 承载
  let prepStatus = run(process.execPath, [prepareStatic]);
  if (prepStatus !== 0) process.exit(prepStatus);

  // 定位 astro CLI 入口（不同安装方式路径不同）
  const astroCli = path.join(rootDir, "node_modules", "astro", "bin", "astro.mjs");

  try {
    // 2. 生成图标
    const icons = path.join(rootDir, "scripts", "generate-icons.js");
    let status = run(process.execPath, [icons], { DEPLOY_TARGET: "static" });
    if (status !== 0) process.exit(status);

    // 3. astro 纯静态构建（直接用 CLI JS 入口，避免 Windows 下 shell 路径问题）
    status = run(process.execPath, [astroCli, "build"], {
      DEPLOY_TARGET: "static",
      OUT_DIR: outDir,
    });
    if (status !== 0) process.exit(status);

    // 4. 站内搜索索引（pagefind）
    const pagefindScript = path.join(rootDir, "scripts", "build-pagefind.js");
    status = run(process.execPath, [pagefindScript]);
    if (status !== 0) process.exit(status);

    // 5. IndexNow 推送（可选，构建成功后自动提交 sitemap）
    const pingScript = path.join(rootDir, "scripts", "ping-indexnow.js");
    run(process.execPath, [pingScript]);
  } finally {
    // 6. 无论成败都恢复动态路由，保证工作区干净
    run(process.execPath, [prepareStatic, "--restore"]);
  }
}

main();