import { getSortedPosts } from "@/utils/content-utils";
import { getPostUrlBySlug } from "@/utils/url-utils";

// 静态预渲染：构建时生成 /search-index.json
export const prerender = true;

/**
 * 轻量全文搜索兜底索引
 *
 * 为什么需要它：
 *  Pagefind 只有在「构建完成 + 索引文件被部署」后才可用，开发环境下
 *  永远不可用，历史上也出现过索引没进部署目录导致线上搜索全空的情况。
 *  这里额外产出一份纯文本索引，搜索页在 Pagefind 不可用时自动降级到它，
 *  保证「任何情况下都搜得出来」。
 *
 * 体积控制：每篇正文截断到 MAX_BODY_CHARS，够搜索用又不至于让 JSON 过大。
 */
const MAX_BODY_CHARS = 8000;

/** 把 Markdown 压成纯文本（只用于搜索匹配与摘要） */
function stripMarkdown(markdown: string): string {
	return markdown
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/~~~[\s\S]*?~~~/g, " ")
		.replace(/`[^`\n]*`/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/[*_~]{1,3}/g, "")
		.replace(/&[a-z]+;/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export async function GET(): Promise<Response> {
	const posts = await getSortedPosts();

	const index = posts.map((post) => {
		const isEncrypted = Boolean(post.data.password);
		// 加密文章只索引标题/描述，绝不把正文放进明文索引
		const text = isEncrypted ? "" : stripMarkdown(post.body ?? "").slice(0, MAX_BODY_CHARS);

		return {
			id: post.id,
			url: getPostUrlBySlug(post.id),
			title: post.data.title,
			description: post.data.description ?? "",
			category: post.data.category ?? "",
			tags: post.data.tags ?? [],
			encrypted: isEncrypted,
			text,
		};
	});

	return new Response(JSON.stringify(index), {
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
	});
}
