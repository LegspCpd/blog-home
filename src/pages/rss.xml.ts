import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { SITE } from "../config/site";

export async function GET(context: APIContext) {
  const posts = (await getCollection("posts", ({ data }) => !data.draft))
    .sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: SITE.url, // 唯一域名来源，不会写错
    trailingSlash: true,
    customData: `<language>${SITE.lang}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description || "",
      pubDate: post.data.updated ?? post.data.published,
      link: `/posts/${post.id}/`,
      categories: [...post.data.tags],
    })),
  });
}