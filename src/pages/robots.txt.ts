import type { APIContext } from "astro";
import { SITE } from "../config/site";

/**
 * robots.txt
 * Sitemap 地址从 SITE.url 派生 —— 上一代就是因为这里手写域名，
 * 导致 sitemap 与 robots 指向不同域名，Search Console 判「无法抓取」。
 */
export function GET(_context: APIContext) {
  const body = `# ${SITE.title}
# ${SITE.url}

User-agent: *
Allow: /

# 无需索引的路径
Disallow: /404
Disallow: /search/

Sitemap: ${SITE.url}/sitemap-index.xml
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
