/**
 * hreflang 标签生成工具
 *
 * 根据 Bing Webmaster Guidelines 建议，
 * 为多语言内容添加 hreflang 标签，帮助搜索引擎理解页面语言和区域定位。
 *
 * 参考: https://developers.google.com/search/docs/specialty/international/localized-versions
 */

import { siteConfig } from "@/config";

/**
 * 站点支持的语言列表
 * key: siteConfig.lang 格式 (zh_CN, zh_TW, en, ja, ru)
 * value: hreflang ISO 格式 (zh-CN, zh-TW, en, ja, ru)
 */
export const SUPPORTED_LANGUAGES: Record<string, string> = {
	zh_CN: "zh-CN",
	zh_TW: "zh-TW",
	en: "en",
	ja: "ja",
	ru: "ru",
};

/**
 * 获取当前站点的默认 hreflang 标签
 * 用于在页面 head 中注入 <link rel="alternate" hreflang="..." href="..." />
 *
 * @param canonicalUrl - 当前页面的规范 URL
 * @returns hreflang 标签的 HTML 字符串数组
 */
export function getHreflangTags(canonicalUrl: string): Array<{
	rel: string;
	hreflang: string;
	href: string;
}> {
	const currentLang = siteConfig.lang || "zh_CN";
	const tags: Array<{
		rel: string;
		hreflang: string;
		href: string;
	}> = [];

	// 当前语言的 hreflang
	const hreflangValue = SUPPORTED_LANGUAGES[currentLang];
	if (hreflangValue) {
		tags.push({
			rel: "alternate",
			hreflang: hreflangValue,
			href: canonicalUrl,
		});
	}

	// x-default（默认语言，通常与站点主语言一致）
	tags.push({
		rel: "alternate",
		hreflang: "x-default",
		href: canonicalUrl,
	});

	return tags;
}
