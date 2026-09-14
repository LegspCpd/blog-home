import { getSortedPosts } from "@/utils/content-utils";

// 静态预渲染：构建时生成 allPostMeta.json，三个平台（Vercel/Cloudflare/EdgeOne）前端均可直接使用
export const prerender = true;

export async function GET(): Promise<Response> {
	const posts = await getSortedPosts();

	const allPostsData = posts
		.map((post) => ({
			id: post.id,
			title: post.data.title,
			description: post.data.description,
			published: post.data.published.getTime(),
			category: post.data.category || "",
			password: !!post.data.password,
		}))
		// 日历按纯日期排序，忽略置顶
		.sort((a, b) => b.published - a.published);

	return new Response(JSON.stringify(allPostsData));
}
