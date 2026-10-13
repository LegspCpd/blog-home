import { getCollection } from "astro:content";

/**
 * 站内搜索索引 —— 构建期生成，随页面内联给 AutoSuggestBox。
 *
 * 为什么不用 pagefind 之类的外部方案：AutoSuggestBox 要的是同步的
 * 字符串数组（ItemsSource），异步索引接不进它的下拉建议列表。
 * 文章量是十几篇量级，把标题+摘要内联进 HTML 的代价可以忽略。
 *
 * 模块级缓存：Base.astro 会被 54 个页面各调用一次，
 * 没有缓存就会把内容集合读 54 遍。
 */
export interface SearchEntry {
  /** 标题，同时作为下拉建议里显示的文字 */
  Title: string;
  /** 目标地址 */
  Tag: string;
  Description: string;
}

let cache: SearchEntry[] | null = null;

export async function getSearchIndex(): Promise<SearchEntry[]> {
  if (cache) return cache;
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  cache = posts.map((post) => ({
    Title: post.data.title,
    // 与 pages/posts/[...slug].astro 的 getStaticPaths 用同一个 id
    Tag: `/posts/${post.id}/`,
    Description: post.data.description ?? "",
  }));
  return cache;
}
