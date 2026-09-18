/**
 * EdgeOne Edge Function — 为纯静态部署提供动态接口
 *
 * EdgeOne Pages 没有官方 Astro adapter，无法自动把 Astro 的 `prerender = false`
 * 动态路由变成 Edge Function。因此 EdgeOne 采用纯静态部署（`build:edgeone`），
 * 下面这两个接口功能由本 Edge Function 提供，与 Vercel / Cloudflare 保持一致：
 *
 *   1. GET /api/indexnow?url=...   -> 302 重定向到 Bing IndexNow（URL 提交）
 *   2. POST /api/indexnow          -> 批量提交 {urls:[...]} 到 Bing IndexNow
 *   3. /gh/*                       -> GitHub 反向代理（把外部链接替换为本站域名）
 *
 * 部署方法（EdgeOne 控制台）：
 *   1. 登录 EdgeOne 控制台 -> 站点 -> Edge Functions
 *   2. 新建一个 Edge Function，将本文件内容粘贴进去
 *   3. 绑定触发规则（URL 匹配）：
 *      - `/api/indexnow`  -> 触发本函数（方法 GET/POST）
 *      - `/gh/*`          -> 触发本函数
 *   4. 保存并发布
 *
 * 注意：Edge Functions 使用 Web 标准 API（fetch / Response / URLSearchParams），
 * 运行时即 Worker / Edge 环境，与 Cloudflare Workers 兼容。
 */

// 你的博客域名
const YOUR_DOMAIN = "blog.legspcpd.top";

// IndexNow 配置：key 会自动从请求域名下的 {key}.txt 校验（由 EdgeOne 静态文件提供）
const BING_INDEXNOW_URL = "https://www.bing.com/indexnow";

// 处理请求
async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // ---------- 1. /gh/* GitHub 反向代理 ----------
  if (pathname.startsWith("/gh/")) {
    const ghPath = pathname.slice("/gh/".length);
    const targetUrl = new URL(`/${ghPath}`, "https://github.com");
    targetUrl.search = url.search;

    try {
      const githubResponse = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept:
            request.headers.get("accept") ||
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      let pageHtml = await githubResponse.text();
      // 替换链接，保证点击后仍在本站域名下
      pageHtml = pageHtml.replaceAll(
        "https://github.com",
        `https://${YOUR_DOMAIN}/gh`,
      );
      pageHtml = pageHtml.replaceAll(
        "https://raw.githubusercontent.com",
        `https://${YOUR_DOMAIN}/gh/raw`,
      );

      return new Response(pageHtml, {
        status: githubResponse.status,
        headers: {
          "Content-Type":
            githubResponse.headers.get("content-type") ||
            "text/html; charset=utf-8",
        },
      });
    } catch (error) {
      return new Response(`<h1>代理出错: ${error.message}</h1>`, {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  // ---------- 2. /api/indexnow ----------
  if (pathname === "/api/indexnow") {
    // 从当前请求的域名根取 IndexNow key（EdgeOne 静态文件 5f1247...txt 已部署）
    // 这里 key 由站点域名决定，直接使用部署在 public 下的 key 文件值
    const INDEXNOW_KEY = "5f124721eb672b47360d00676083cecb";

    if (request.method === "GET") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) {
        return new Response(
          JSON.stringify({ error: "Missing 'url' query parameter" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      if (!INDEXNOW_KEY) {
        return new Response(
          JSON.stringify({ error: "IndexNow key not configured" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      const indexNowUrl = new URL(BING_INDEXNOW_URL);
      indexNowUrl.searchParams.set("url", targetUrl);
      indexNowUrl.searchParams.set("key", INDEXNOW_KEY);
      return Response.redirect(indexNowUrl.toString(), 302);
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();
        const urls = Array.isArray(body?.urls) ? body.urls : [];
        if (urls.length === 0) {
          return new Response(
            JSON.stringify({ error: "Missing 'urls' array in request body" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        const results = await Promise.allSettled(
          urls.map(async (targetUrl) => {
            const indexNowUrl = new URL(BING_INDEXNOW_URL);
            indexNowUrl.searchParams.set("url", targetUrl);
            indexNowUrl.searchParams.set("key", INDEXNOW_KEY);
            const response = await fetch(indexNowUrl.toString());
            return { url: targetUrl, status: response.status };
          }),
        );
        const submitted = results.map((r) =>
          r.status === "fulfilled"
            ? r.value
            : { url: "unknown", status: 500 },
        );
        return new Response(JSON.stringify({ submitted }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response("Method Not Allowed", { status: 405 });
  }

  // ---------- 3. 其它 -> 交给静态资源处理 ----------
  return new Response("Not Found", { status: 404 });
}

// EdgeOne 标准入口
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  },
};