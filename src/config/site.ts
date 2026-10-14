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
/**
 * 左侧导航。
 *
 * 图标用 Segoe Fluent Icons 的字形码，**写在这里而不是靠下标去猜** ——
 * 之前 Base.astro 里是 ["","",""][i]，
 * 一加菜单项就会错位。
 * 这几个码位是渲染出来看过的：E80F 房子、E8A5 文档、E8F1 书架、E8EC 标签。
 */
export const NAV = [
  { href: "/", label: "首页", icon: "" },
  { href: "/posts/", label: "文章", icon: "" },
  { href: "/archive/", label: "归档", icon: "" },
  { href: "/tags/", label: "标签", icon: "" },
] as const;

/** 每页文章数 */
export const POSTS_PER_PAGE = 10;

/** 拼接绝对 URL */
export function abs(path: string): string {
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${clean}`;
}