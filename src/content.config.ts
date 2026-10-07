import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * 内容收集 —— 只保留 posts。
 * 上一代的 spec 收集（about/friends/privacy/guestbook）随旧架构一起删除；
 * 这些页面如需重建，走常规 src/pages 路由，而不是内容集合。
 *
 * schema 字段与 16 篇存量文章的 frontmatter 保持兼容：
 *   title / published / description / tags / category / draft 是实际在用的；
 *   其余为可选增强项，缺省不影响渲染。
 */
const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),

    description: z.string().optional().default(""),
    image: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional().nullable().default(""),

    draft: z.boolean().optional().default(false),
    pinned: z.boolean().optional().default(false),
    lang: z.string().optional().default(""),
    author: z.string().optional().default(""),

    licenseName: z.string().optional().default(""),
    licenseUrl: z.string().optional().default(""),
    sourceLink: z.string().optional().default(""),
  }),
});

export const collections = { posts };