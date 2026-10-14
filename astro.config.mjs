// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "./src/config/site";

/**
 * WinUIonWeb 组件库 —— **已内联进本仓库**（vendor/winuionweb）。
 *
 * 为什么内联而不是从外部目录读：
 * 这台机器上原本是 alias 到 `../WinUIonWeb/WinUIonWeb/src`（仓库之外的兄弟目录）。
 * 本机能跑，但**任何只拿这个仓库的构建器都会失败** ——
 * 包括 EdgeOne Pages 的 Git 自动部署（它只拿仓库本身，跑不了克隆步骤）。
 * 现象极具迷惑性：本地一切正常、我们自己的 CI 也能过（因为 CI 里加了克隆），
 * 但线上一直停在"最后一个构建成功的版本"，也就是加 WinUIonWeb 之前的旧界面。
 *
 * 为什么内联"源码"而不是上游的 dist-lib：
 * 上游的库构建只导出主控件，`NavigationViewMenuItems` / `NavigationViewItem`
 * 这类 XAML 属性组件**只在 src/ 里**，用包出口的具名导入会 MISSING_EXPORT，
 * NavigationView 只能渲染空壳。所以必须吃源码。
 *
 * 内联范围（4.8 MB / 297 文件）：components、utils、styles、index.ts。
 * 上游的 assets(5.6M) 与 gallery(3.5M) 是它自己的 demo 应用，与本项目无关，
 * 已排除；components 只反向依赖 utils/navigationTransitionInfo，不碰那两块。
 *
 * 更新上游：node scripts/sync-winui.mjs
 */
const WINUI_SRC = fileURLToPath(new URL("./vendor/winuionweb", import.meta.url));
/** 内联目录（用于判断某个文件是否属于组件库） */
const WINUI_DIR = WINUI_SRC;
/** 本仓库根目录 */
const ROOT_DIR = fileURLToPath(new URL(".", import.meta.url));

/**
 * 统一的路径比较用的前缀。
 * Windows 上 fileURLToPath 给的是反斜杠（F:\web\...），而 Vite 传进
 * 解析钩子的 importer 用的是正斜杠（F:/web/...）——
 * 直接 startsWith 会永远不成立，插件静默失效。
 */
const WINUI_DIR_SLASH = WINUI_DIR.replace(/\\/g, "/");
if (!fs.existsSync(WINUI_SRC)) {
  throw new Error(
    [
      "",
      "找不到 WinUIonWeb 上游源码：",
      "  " + WINUI_SRC,
      "",
      "这个目录不在本仓库里，需要先把它克隆到该位置：",
      "  git clone https://github.com/Furry-Xiyi/WinUIonWeb.git ../WinUIonWeb",
      "",
      "（CI 会自动做这一步；本地开发需要手动执行一次。）",
      "",
    ].join("\n")
  );
}

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
        "winui-src": WINUI_SRC,
      },

      /**
       * 必须显式去重，否则生产构建会打进**两份 Vue**。
       *
       * 实测：dist/_astro 里 runtime-core.esm-bundler.*.js（67 KB）是一份，
       * 而 vue-app.*.js（2.27 MB）里还内联着完整一份（__v_skip ×11、
       * __v_isRef ×7、defineComponent ×9 都出现在该分块内）。
       *
       * 两份 Vue 各有自己的模块级 currentRenderingInstance。WinUI 组件里的
       * h() 走的是第二份，渲染却由第一份驱动，于是第二份的
       * currentRenderingInstance 恒为 null —— 带 ref 的 vnode 得到 owner=null，
       * patch 时 setRef 读 null.refs 直接抛异常：
       *   TypeError: Cannot read properties of null (reading 'refs')
       * dev 模式模块实例唯一，所以"开发正常、构建白屏"。
       *
       * plugin-vue 自己只 dedupe "vue"，而 vue 的运行时是拆成
       * @vue/runtime-core、@vue/runtime-dom、@vue/reactivity、@vue/shared
       * 几个包再 re-export 的，所以这几个都要点名。
       */
      dedupe: ["vue", "@vue/runtime-core", "@vue/runtime-dom", "@vue/reactivity", "@vue/shared"],
    },
  },

  integrations: [
    // Vue 岛：承载 WinUIonWeb 的 265 个控件。
    // jsxImportSource 只影响 JSX 语法；模板编译由 @astrojs/vue 负责。
    // 必须是相对路径（以 . 开头）：@astrojs/vue 只对 startsWith(".")
    // 的值做 path.resolve(root, …)，否则会当成裸模块 specifier 丢给浏览器，
    // 结果是入口永不执行、控件全部未注册（页面空白但构建照过）。
    vue({
      appEntrypoint: "./src/vue-app.js",

      /**
       * 必须开这个开关，否则 WinUIonWeb 在生产构建里整个崩掉。
       *
       * 上游 vite.config.ts 用同一行，注释写得很明白：
       *   "The XAML runtime resolves page bindings from Vue setupState.
       *    Production template inlining otherwise hides that scope."
       *
       * 链路：features.prodDevtools → @vitejs/plugin-vue 的 define
       * __VUE_PROD_DEVTOOLS__ = true，同时把 compiler-sfc 的
       * devToolsEnabled 置为 true。生产环境下若 devToolsEnabled 为 false，
       * SFC 编译器会把模板内联进 setup()，setupState 作用域随之消失；
       * WinUIonWeb 的 XAML 运行时正是从这个作用域解析页面绑定的。
       *
       * 缺失时的症状极具迷惑性：页面全白，控制台只有
       *   TypeError: Cannot read properties of null (reading 'refs')
       *        at setRef ← patch ← componentUpdateFn ← setupRenderEffect
       * 看着像 Vue 内部 bug 或重复运行时，实际是模板内联导致的。
       * dev 模式不受影响（isProduction 为 false 时 devToolsEnabled 恒为 true），
       * 所以"开发正常、构建白屏"。
       *
       * 验证方式：构建后 dist 里 NavigationView 能渲染出 .win-nav-item。
       */
      features: { prodDevtools: true },
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