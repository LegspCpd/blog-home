import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components";/* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import katex from "katex";
import "katex/dist/contrib/mhchem.mjs"; // 加载 mhchem 扩展
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";/* Handle directives */
import remarkMath from "remark-math";
import rehypeCallouts from "rehype-callouts";
import remarkSectionize from "remark-sectionize";
import { expressiveCodeConfig, siteConfig } from "./src/config";
import { i18n } from "./src/i18n/translation";
import I18nKey from "./src/i18n/i18nKey";
import { pluginLanguageBadge } from "expressive-code-language-badge";/* Language Badge */
import { pluginCollapsible } from "expressive-code-collapsible";/* Collapsible */
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { rehypeMermaid } from "./src/plugins/rehype-mermaid.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkMermaid } from "./src/plugins/remark-mermaid.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import mdx from "@astrojs/mdx";
import rehypeEmailProtection from "./src/plugins/rehype-email-protection.mjs";
import rehypeExternalLinks from "./src/plugins/rehype-external-links.mjs";
import rehypeFigure from "./src/plugins/rehype-figure.mjs";
import { remarkImageGrid } from "./src/plugins/remark-image-grid.js";
import rehypeHeadingLevel from "./src/plugins/rehype-heading-level.mjs";
import rehypeImageAlt from "./src/plugins/rehype-image-alt.mjs";

// 根据环境变量 DEPLOY_TARGET 切换部署 adapter，实现一套代码多平台构建
// 可选值：vercel（默认）| cloudflare | static
// - vercel      -> 使用 @astrojs/vercel（serverless，保留所有动态接口）
// - cloudflare  -> 使用 @astrojs/cloudflare（Cloudflare Pages Functions，动态接口自动转为 Function）
// - static/edgeone -> 无 adapter，纯静态输出（EdgeOne Pages / 任意静态托管）
const DEPLOY_TARGET = (process.env.DEPLOY_TARGET || "vercel").toLowerCase();
const useCloudflare = DEPLOY_TARGET === "cloudflare";
const useVercel = DEPLOY_TARGET === "vercel";
const useStatic = !useCloudflare && !useVercel;

let deployAdapter;
// 只有需要 adapter 的平台上才动态导入对应的包，避免在纯静态/EdgeOne 构建时被无谓加载
if (useCloudflare) {
  const { default: cloudflare } = await import("@astrojs/cloudflare");
  deployAdapter = cloudflare({
    /**
     * 使用 Node.js prerender 环境构建静态页：
     * 项目内的 gallery-utils / og 图片生成等构建期逻辑使用了 node:fs / node:path，
     * workerd 预渲染环境无法提供这些模块，会导致构建失败。
     * 部署产物仍是标准 Cloudflare Pages（静态 + Functions），运行时 Functions 才用 workerd。
     */
    prerenderEnvironment: "node",
  });
} else if (useVercel) {
  const { default: vercel } = await import("@astrojs/vercel");
  deployAdapter = vercel();
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import grayMatter from "gray-matter";

// ========== SEO: 构建文章 URL -> lastmod 映射（用于 sitemap 新鲜度信号） ==========
const postLastmodMap = new Map();
(function buildPostLastmodMap() {
  const configDir = path.dirname(fileURLToPath(import.meta.url));
  const postsDir = path.join(configDir, "src/content/posts");
  if (!fs.existsSync(postsDir)) return;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(md|mdx)$/.test(entry.name)) {
        try {
          const { data } = grayMatter(fs.readFileSync(full, "utf8"));
          if (data.draft === true) continue;
          const rel = path.relative(postsDir, full).replace(/\\/g, "/").replace(/\.(md|mdx)$/i, "");
          const lastmod = (data.updated || data.published);
          if (lastmod) {
            postLastmodMap.set(`/posts/${rel}/`, new Date(lastmod).toISOString());
          }
        } catch {
          /* 忽略无法解析的文件 */
        }
      }
    }
  };
  walk(postsDir);
})();

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.legspcpd.top',
  base: "/",
  trailingSlash: "always",
  // 输出目录：默认 dist，可用环境变量 OUT_DIR 覆盖（用于无痛验证或特殊部署）
  outDir: process.env.OUT_DIR || "dist",

  
  // 图像优化配置
  image: {
      // 全局响应式布局
      layout: "constrained",
	},

  experimental: {
      // Rust 编译器以提升构建性能（实验性），部分平台可能会导致构建失败，可以根据需要启用或禁用
      rustCompiler: false,
      // 队列渲染以优化性能（实验性）
      queuedRendering: { enabled: true },
	},

  integrations: [
      swup({
          theme: false,
          animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
          // the default value `transition-` cause transition delay
          // when the Tailwind class `transition-all` is used
          containers: [
              "#banner-overlay-container",
              "#banner-dim-container",
              "#swup-container",
              "#left-sidebar-dynamic",
              "#right-sidebar-dynamic",
              "#floating-toc-wrapper",
          ],
          smoothScrolling: false,
          cache: true,
          preload: true,
          accessibility: true,
          updateHead: true,
          updateBodyClass: false,
          globalInstance: true,
          // 滚动相关配置优化
          resolveUrl: (url) => url,
          animateHistoryBrowsing: false,
          skipPopStateHandling: (event) => {
              // 跳过锚点链接的处理，让浏览器原生处理
              return event.state && event.state.url && event.state.url.includes("#");
          },
      }),
      icon({
          include: {
              "material-symbols": ["*"],
              "fa7-brands": ["*"],
              "fa7-regular": ["*"],
              "fa7-solid": ["*"],
              "simple-icons": ["*"],
              mdi: ["*"],
          },
      }),
      expressiveCode({
          themes: [expressiveCodeConfig.darkTheme, expressiveCodeConfig.lightTheme],
          useDarkModeMediaQuery: false,
          themeCssSelector: (theme) => `[data-theme='${theme.name}']`,
          plugins: [
              // pluginLanguageBadge 配置 - 从expressiveCodeConfig读取设置
              ...(expressiveCodeConfig.pluginLanguageBadge?.enable === true
                  ? [pluginLanguageBadge()]
                  : []),
              pluginCollapsibleSections(),
              pluginLineNumbers(),
              // pluginCollapsible 配置 - 从expressiveCodeConfig读取设置，使用i18n文本
              ...(expressiveCodeConfig.pluginCollapsible?.enable === true
                  ? [
                          pluginCollapsible({
                              lineThreshold:
                                  expressiveCodeConfig.pluginCollapsible.lineThreshold || 15,
                              previewLines:
                                  expressiveCodeConfig.pluginCollapsible.previewLines || 8,
                              defaultCollapsed:
                                  expressiveCodeConfig.pluginCollapsible.defaultCollapsed ??
                                  true,
                              expandButtonText: i18n(I18nKey.codeCollapsibleShowMore),
                              collapseButtonText: i18n(I18nKey.codeCollapsibleShowLess),
                              expandedAnnouncement: i18n(I18nKey.codeCollapsibleExpanded),
                              collapsedAnnouncement: i18n(I18nKey.codeCollapsibleCollapsed),
                          }),
                      ]
                  : []),
          ],
          defaultProps: {
              wrap: false,
              overridesByLang: {
                  shellsession: {
                      showLineNumbers: false,
                  },
              },
          },
          styleOverrides: {
              borderRadius: "0.75rem",
              codeFontSize: "0.875rem",
              codeFontFamily:
                  "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              codeLineHeight: "1.5rem",
              frames: {},
              textMarkers: {
                  delHue: 0,
                  insHue: 180,
                  markHue: 250,
              },
              languageBadge: {
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  borderRadius: "0.25rem",
                  opacity: "1",
                  borderWidth: "0px",
                  borderColor: "transparent",
              },
          },
          frames: {
              showCopyToClipboardButton: true,
          },
      }),
      svelte(),
      sitemap({
          filter: (page) => {
              // 根据页面开关配置过滤sitemap
              const url = new URL(page);
              const pathname = url.pathname;

              if (pathname === "/friends/" && !siteConfig.pages.friends) {
                  return false;
              }
              if (pathname === "/sponsor/" && !siteConfig.pages.sponsor) {
                  return false;
              }
              if (pathname === "/guestbook/" && !siteConfig.pages.guestbook) {
                  return false;
              }
              if (pathname === "/bangumi/" && !siteConfig.pages.bangumi) {
                  return false;
              }
              if (pathname === "/gallery/" && !siteConfig.pages.gallery) {
                  return false;
              }
              // 排除无需索引的页面
              if (
                  pathname.startsWith("/api/") ||
                  pathname.startsWith("/og/") ||
                  pathname.startsWith("/gh/") ||
                  pathname.startsWith("/ftp/") ||
                  pathname.startsWith("/yandex_") ||
                  pathname.startsWith("/baidu_verify_") ||
                  pathname === "/search/" ||
                  pathname === "/404"
              ) {
                  return false;
              }

              return true;
          },
          // 自定义 sitemap 条目，为关键页面设置更高的优先级和更频繁的更新频率
          serialize: (item) => {
              const url = new URL(item.url);
              const pathname = url.pathname;

              // 首页 - 最高优先级
              if (pathname === "/" || pathname === "") {
                  return {
                      ...item,
                      changefreq: "daily",
                      priority: 1.0,
                      lastmod: new Date().toISOString(),
                  };
              }

              // 博客列表和归档 - 高优先级
              if (pathname === "/posts/" || pathname === "/archive/") {
                  return {
                      ...item,
                      changefreq: "daily",
                      priority: 0.9,
                  };
              }

              // 博客文章详情页 - 较高优先级
              if (pathname.startsWith("/posts/") && pathname !== "/posts/") {
                  const postLastmod = postLastmodMap.get(pathname);
                  return {
                      ...item,
                      changefreq: "weekly",
                      priority: 0.8,
                      ...(postLastmod ? { lastmod: postLastmod } : {}),
                  };
              }

              // 其他主要页面
              if (["/about/", "/friends/", "/sponsor/", "/guestbook/"].includes(pathname)) {
                  return {
                      ...item,
                      changefreq: "monthly",
                      priority: 0.6,
                  };
              }

              // 分页页面 - 较低优先级
              if (/\/\d+\/$/.test(pathname)) {
                  return {
                      ...item,
                      changefreq: "weekly",
                      priority: 0.5,
                  };
              }

              return item;
          },
      }),
      mdx(),
	],

  markdown: {
      remarkPlugins: [
          remarkMath,
          remarkReadingTime,
          remarkImageGrid,
          remarkExcerpt,
          remarkDirective,
          remarkSectionize,
          parseDirectiveNode,
          remarkMermaid,
      ],
      rehypePlugins: [
          [rehypeKatex, { katex }],
          [rehypeCallouts, { theme: siteConfig.rehypeCallouts.theme }],
          rehypeSlug,
          rehypeMermaid,
          rehypeFigure,
          rehypeHeadingLevel,
          rehypeImageAlt,
          [rehypeExternalLinks, { siteUrl: siteConfig.site_url }],
          [rehypeEmailProtection, { method: "base64" }], // 邮箱保护插件，支持 'base64' 或 'rot13'
          [
              rehypeComponents,
              {
                  components: {
                      github: GithubCardComponent,
                  },
              },
          ],
          [
              rehypeAutolinkHeadings,
              {
                  behavior: "append",
                  properties: {
                      className: ["anchor"],
                  },
                  content: {
                      type: "element",
                      tagName: "span",
                      properties: {
                          className: ["anchor-icon"],
                          "data-pagefind-ignore": true,
                      },
                      children: [
                          {
                              type: "text",
                              value: "#",
                          },
                      ],
                  },
              },
          ],
      ],
	},

  vite: {
      plugins: [tailwindcss()],
      server: {
          watch: {
              ignored: ["**/package/**", "**/Firefly-docs/**"],
          },
      },
      resolve: {
          alias: {
              "@rehype-callouts-theme": `rehype-callouts/theme/${siteConfig.rehypeCallouts.theme}`,
          },
      },
      build: {
          minify: "esbuild",
          esbuildOptions: {
              minify: true,
              // 移除 console.log 和 debugger
              drop: ["console", "debugger"],
          },
          rollupOptions: {
              onwarn(warning, warn) {
                  // temporarily suppress this warning
                  if (
                      warning.message.includes("is dynamically imported by") &&
                      warning.message.includes("but also statically imported by")
                  ) {
                      return;
                  }
                  warn(warning);
              },
          },
          // CSS 优化
          cssCodeSplit: true,
          cssMinify: "esbuild",
          // 提高内联资源阈值，减少小文件请求
          assetsInlineLimit: 8192,
          // 禁用 sourcemap 以减少构建体积
          sourcemap: false,
          // 提高 chunk 大小警告阈值
          chunkSizeWarningLimit: 1000,
      },
	},

  // 按 DEPLOY_TARGET 选择 adapter：
  // - vercel（默认）    -> @astrojs/vercel（serverless，保留全部动态接口）
  // - cloudflare        -> @astrojs/cloudflare（CF Pages Functions）
  // - static / edgeone  -> 纯静态输出（无 adapter，EdgeOne Pages 部署 dist）
  ...(deployAdapter ? { adapter: deployAdapter } : {}),
});