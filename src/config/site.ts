/**
 * 站点配置 —— 全站唯一的域名真相源。
 * astro.config.mjs 的 site、RSS、canonical、sitemap、robots 全部从这里派生，
 * 避免出现「sitemap 写一个域名、canonical 写另一个」这种已经发生过的错误。
 */

export const SITE = {
  /** 生产域名。不带尾斜杠。 */
  url: "https://legspcpd.asia",
  title: "LegspCpd Blog",
  subtitle: "记录技术、生活与思考",
  description:
    "LegspCpd 的个人博客，记录学习与生活点滴，分享技术经验与见解。",
  lang: "zh-CN",
  author: "LegspCpd",

  /** 社交与联系 */
  links: {
    github: "https://github.com/LegspCpd",
    rss: "/rss.xml",
  },
} as const;

/** 导航项 */
export const NAV = [
  { href: "/", label: "首页" },
  { href: "/archive/", label: "归档" },
  { href: "/tags/", label: "标签" },
] as const;

/** 每页文章数 */
export const POSTS_PER_PAGE = 10;

/** 拼接绝对 URL */
export function abs(path: string): string {
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${clean}`;
}