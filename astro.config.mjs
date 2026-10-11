// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "./src/config/site";

/**
 * 构建期扫描文章 frontmatter，建立 slug → lastmod 映射。
 * sitemap 的 lastmod 是搜索引擎判断内容新鲜度的主要信号，
 * 只给首页一条等于没有，所以这里必须从真实 frontmatter 取。
 */
const lastmodMap = new Map();
{
  const postsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "src/content/posts");
  if (fs.existsSync(postsDir)) {
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.mdx?$/.test(entry.name)) {
          const raw = fs.readFileSync(full, "utf8");
          const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (!fm) continue;
          const body = fm[1];
          if (/^draft:\s*true/m.test(body)) continue;
          const rel = path
            .relative(postsDir, full)
            .replace(/\\/g, "/")
            .replace(/\.mdx?$/i, "");
          const slug = rel.replace(/\/index$/i, "");
          const updated = body.match(/^updated:\s*(\S+)/m)?.[1];
          const published = body.match(/^published:\s*(\S+)/m)?.[1];
          const stamp = updated || published;
          if (stamp) {
            const d = new Date(stamp);
            if (!Number.isNaN(d.valueOf())) {
              lastmodMap.set(`/posts/${slug}/`, d.toISOString());
            }
          }
        }
      }
    };
    walk(postsDir);
  }
}

/**
 * Win UI 架构 —— Astro 配置
 *
 * 相对上一代（Firefly/Supabase）已移除的集成，都是被删掉的旧架构专属：
 *   swup / icon / expressive-code / svelte / mdx / 整套 unified remark·rehype 管线。
 * 现在只保留内容渲染真正需要的：@astrojs/mdx（部分文章用 MDX）+ sitemap。
 */

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  trailingSlash: "always",
  outDir: process.env.OUT_DIR || "dist",
  compressHTML: true,

  /**
   * WinUIonWeb 的源码直连。
   *
   * 为什么必须这么绕：它的 package.json 只把 dist-lib 暴露为 exports，
   * 而 NavigationViewItem / NavigationViewMenuItems 这些 XAML 属性组件
   * 只存在于 src/components/*.ts，不在对外接口里。
   * 用包根具名导入时它们是 MISSING_EXPORT，NavigationView 只能渲染空壳。
   *
   * pnpm 对 file: 依赖会按 files 字段裁剪，src 根本没被拷进 node_modules，
   * 所以这里 alias 到克隆下来的上游源码目录，直接吃它的原始实现。
   */
  vite: {
    resolve: {
      alias: {
        "winui-src": fileURLToPath(
          new URL("../WinUIonWeb/WinUIonWeb/src", import.meta.url)
        ),
      },
    },
    // 上游是独立仓库、未经过本项目的 tsconfig，放宽排除
    ssr: { noExternal: ["winuionweb"] },
  },

  integrations: [
    // Vue 岛：承载 WinUIonWeb 的 265 个控件。
    // jsxImportSource 只影响 JSX 语法；模板编译由 @astrojs/vue 负责。
    // 必须是相对路径（以 . 开头）：@astrojs/vue 只对 startsWith(".")
    // 的值做 path.resolve(root, …)，否则会当成裸模块 specifier 丢给浏览器，
    // 结果是入口永不执行、控件全部未注册（页面空白但构建照过）。
    vue({
      appEntrypoint: "./src/vue-app.js",
    }),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        // 不进索引的路径：搜索页、404
        if (pathname === "/search/" || pathname.startsWith("/404")) return false;
        return true;
      },
      serialize: (item) => {
        const { pathname } = new URL(item.url);
        // 首页最高优先
        if (pathname === "/") {
          return { ...item, changefreq: "daily", priority: 1.0, lastmod: new Date().toISOString() };
        }
        // 列表页
        if (["/posts/", "/archive/", "/tags/"].includes(pathname)) {
          return { ...item, changefreq: "daily", priority: 0.9 };
        }
        // 文章详情页：带上 frontmatter 里的真实更新时间
        if (pathname.startsWith("/posts/") && pathname !== "/posts/") {
          const lastmod = lastmodMap.get(pathname);
          return {
            ...item,
            changefreq: "weekly",
            priority: 0.8,
            ...(lastmod ? { lastmod } : {}),
          };
        }
        // 标签页低优先
        if (pathname.startsWith("/tags/")) {
          return { ...item, changefreq: "weekly", priority: 0.5 };
        }
        return { ...item, changefreq: "monthly", priority: 0.6 };
      },
    }),
  ],

  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
});