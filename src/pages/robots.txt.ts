import type { APIRoute } from "astro";

const robotsTxt = `
# robots.txt - LegspCpd Blog
# https://blog.legspcpd.top

# ============================================
# 通用规则 - 适用于所有爬虫
# ============================================
User-agent: *

# 允许抓取根路径及核心内容
Allow: /
Allow: /posts/
Allow: /archive/
Allow: /about/
Allow: /tags/
Allow: /categories/

# 屏蔽无需索引的内部路径
Disallow: /_astro/
Disallow: /api/
Disallow: /og/
Disallow: /gh/
Disallow: /ftp/
Disallow: /search/
Disallow: /yandex_
Disallow: /baidu_verify_
Disallow: /404

# 屏蔽分页参数（避免重复内容）
Disallow: /*?page=
Disallow: /*?tag=
Disallow: /*?category=

# ============================================
# 特定爬虫优化
# ============================================

# Googlebot - 允许更频繁抓取
User-agent: Googlebot
Crawl-delay: 1
Allow: /

# Bingbot - 针对 Bing 优化
User-agent: Bingbot
Crawl-delay: 1
Allow: /

# 百度爬虫 - 低频抓取
User-agent: Baiduspider
Crawl-delay: 2
Allow: /

# ============================================
# 禁止抓取特定文件类型（节省爬虫带宽）
# ============================================
User-agent: *
Disallow: /*.pdf$
Disallow: /*.zip$
Disallow: /*.gz$
Disallow: /*.7z$
Disallow: /*.rar$
Disallow: /*.tar$

# ============================================
# Sitemap
# ============================================
Sitemap: ${new URL("sitemap-index.xml", import.meta.env.SITE).href}

# IndexNow - 通知搜索引擎内容更新
# 详见 https://www.indexnow.org/
`.trim();

export const GET: APIRoute = () => {
	return new Response(robotsTxt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
