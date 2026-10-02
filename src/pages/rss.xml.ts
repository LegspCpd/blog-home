import { render } from "astro:content";
import rss, { type RSSFeedItem } from "@astrojs/rss";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getSortedPosts } from "@utils/content-utils";
import { formatDateI18nWithTime } from "@utils/date-utils";
import { url } from "@utils/url-utils";
import type { APIContext } from "astro";
import sanitizeHtml from "sanitize-html";
import { profileConfig, siteConfig } from "@/config";
import { processCoverImageSync } from "@/utils/image-utils";
import pkg from "../../package.json";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

// 生成完整的文章封面 URL
function getPostImageUrl(imagePath: string): string | undefined {
	if (!imagePath) return undefined;
	if (imagePath.startsWith("http")) return imagePath;
	if (imagePath.startsWith("/")) return `${siteConfig.site_url}${imagePath}`;
	// 本地 src 目录图片
	return `${siteConfig.site_url}/${imagePath}`;
}

/**
 * 渲染文章正文为 HTML。
 *
 * 这里刻意不走 astro:content 的 render() + AstroContainer：
 * 那条路径会拉起 Astro 7 默认的 Rust Markdown 渲染器（Sätteri），
 * 它依赖平台相关的原生包，在 EdgeOne 构建机上因可选依赖缺失而直接崩溃
 * （Cannot find module '@bruits/satteri-linux-x64-gnu'）。
 *
 * 改为直接读原始 .md，用 marked 转 HTML —— 纯 JS，跨平台零原生依赖，
 * 构建稳定。代价是不走项目自定义的 remark 插件（KaTeX、callout 等），
 * 但 RSS 消费端对样式依赖低，基础 HTML 已足够。
 *
 * 路径解析不能用 import.meta.url：构建后该变量指向产物目录
 * （dist/ 或 .vercel/output/），src/content 并不在其旁边。
 * 构建与预览时进程工作目录都是项目根，因此以 cwd 为基准；
 * 万一某些 CI 把工作目录设到别处，再向上层找一层兜底。
 */
async function resolveContentDir(): Promise<string> {
	const sub = path.join("src", "content", "posts");
	let dir = path.resolve(process.cwd(), sub);
	if (existsSync(dir)) return dir;

	// 从 cwd 逐级向上找，最多 6 层
	let cur = process.cwd();
	for (let i = 0; i < 6; i++) {
		const parent = path.dirname(cur);
		if (parent === cur) break;
		cur = parent;
		dir = path.resolve(cur, sub);
		if (existsSync(dir)) return dir;
	}
	return path.resolve(process.cwd(), sub);
}

async function renderPostHtml(entryId: string): Promise<string> {
	const contentDir = await resolveContentDir();

	// entry.id 形如 "cloudreve-worker" 或 "day/yxdsm"
	const candidates = [entryId, `${entryId}.md`, `${entryId}.mdx`];

	for (const rel of candidates) {
		// 防目录穿越
		const full = path.resolve(contentDir, rel);
		if (!full.startsWith(contentDir)) continue;
		try {
			const raw = await readFile(full, "utf8");
			const { content } = matter(raw);
			if (!content.trim()) continue;
			return await marked.parse(content, { async: true, gfm: true });
		} catch {
			// 换下一个候选路径
		}
	}
	return "";
}

export async function GET(context: APIContext): Promise<Response> {
	const blog = await getSortedPosts();
	const feedItems: RSSFeedItem[] = [];

	for (const post of blog) {
		if (post.data.password) {
			feedItems.push({
				title: post.data.title,
				pubDate: post.data.published,
				description: post.data.description || "",
				link: url(`/posts/${post.id}/`),
				content: i18n(I18nKey.passwordProtectedRss),
			});
			continue;
		}

		const { remarkPluginFrontmatter } = await render(post);
		const postImage = processCoverImageSync(post.data.image, post.id);
		const categories = [post.data.category, ...post.data.tags].filter(
			Boolean,
		) as string[];

		// 描述优先使用 frontmatter，否则使用文章摘要，保证 RSS 有完整描述
		const postDescription =
			post.data.description?.trim() ||
			remarkPluginFrontmatter.excerpt?.trim() ||
			post.data.title;

		// 渲染完整正文；失败时退回摘要，保证 feed 始终有内容
		let postContent = postDescription;
		try {
			const html = await renderPostHtml(post.id);
			if (html.trim()) {
				postContent = sanitizeHtml(stripInvalidXmlChars(html), {
					allowedTags: sanitizeHtml.defaults.allowedTags.concat([
						"img",
						"h1",
						"h2",
						"pre",
						"code",
					]),
					// 允许必要的属性，否则链接/图片会被剥掉
					allowedAttributes: {
						a: ["href", "name", "target", "rel"],
						img: ["src", "alt", "title", "width", "height", "loading"],
						code: ["class"],
					},
				});
			}
		} catch (err) {
			console.warn(`[rss] ${post.id} 正文渲染失败，改用摘要：`, err);
		}

		feedItems.push({
			title: post.data.title,
			pubDate: post.data.published,
			description: postDescription,
			link: url(`/posts/${post.id}/`),
			content: postContent,
			categories,
			author: `${profileConfig.name}`,
			...((postImage
				? {
						customData: `<media:content xmlns:media="http://search.yahoo.com/mrss/" url="${getPostImageUrl(postImage) || ""}" medium="image"/>`,
					}
				: {}) as Record<string, string>),
		});
	}

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site ?? "https://firefly.cuteleaf.cn",
		stylesheet: "/rss/pretty-feed-v3.xsl",
		customData: `<language>${siteConfig.lang?.replace("_", "-") || "zh-CN"}</language>
		<templateTheme>Firefly</templateTheme>
		<templateThemeVersion>${pkg.version}</templateThemeVersion>
		<templateThemeUrl>https://github.com/CuteLeaf/Firefly</templateThemeUrl>
		<lastBuildDate>${formatDateI18nWithTime(new Date())}</lastBuildDate>
		<managingEditor>${profileConfig.name}</managingEditor>
		<webMaster>${profileConfig.name}</webMaster>`,
		items: feedItems,
	});
}