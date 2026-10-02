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

		// 使用摘要作为 content，避免在 EdgeOne 等环境下因原生绑定缺失导致构建失败
		// 完整内容渲染需要 AstroContainer + MDX renderer，依赖 @bruits/satteri 原生绑定
		const postContent = postDescription;

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