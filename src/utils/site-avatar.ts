/**
 * 站点头像解析（构建时执行）
 *
 * `profileConfig.avatar` 支持三种写法（见 profileConfig 注释）：
 *   1. "/xxx"        → public 目录，可直接当 URL 用
 *   2. "assets/xxx"  → src 目录，**必须**走 Astro 图片管线才能得到可用 URL
 *   3. "https://..." → 远程地址，原样使用
 *
 * ⚠️ 历史缺陷：以前有地方把第 2 种写法的值当 URL 字符串直接拼接
 *    （例如 JSON-LD 输出 `https://<site>/assets/images/ico.png`），
 *    但该文件其实在 `src/assets/` 下，于是线上是一个 404 的破图。
 *    所有需要「站点头像 URL」的地方都必须调用本模块，不要自己拼。
 */
import * as path from "node:path";
import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import { profileConfig } from "@/config/profileConfig";
import { siteConfig } from "@/config/siteConfig";

/** 头像展示尺寸上限（实际最大只画到 64px，256 足够覆盖高 DPI） */
const AVATAR_SIZE = 256;

/** 只扫描 src/assets 下的图片，和 project-assets 保持一致 */
const localImages = import.meta.glob<ImageMetadata>(
	"../assets/**/*.{png,jpg,jpeg,webp,avif,gif}",
	{ import: "default" }
);

export interface SiteAvatar {
	/** 可直接放进 <img src> 的地址 */
	src: string;
	/** 原始宽高比（保留比例用），拿不到时为 1:1 */
	width: number;
	height: number;
	/** 是否为远程地址（远程的不要做本地优化） */
	isRemote: boolean;
}

const EMPTY: SiteAvatar = { src: "", width: 0, height: 0, isRemote: false };

/** 同一个构建进程内只解析一次（图片管线本身也有缓存） */
let cache: Promise<SiteAvatar> | null = null;

async function resolve(): Promise<SiteAvatar> {
	const raw = (profileConfig.avatar ?? "").trim();
	if (!raw) return EMPTY;

	// 远程地址 / data URI：原样使用
	if (/^(?:https?:)?\/\//i.test(raw) || raw.startsWith("data:")) {
		return { src: raw, width: AVATAR_SIZE, height: AVATAR_SIZE, isRemote: true };
	}

	// public 目录：本身就是可用 URL
	if (raw.startsWith("/")) {
		return { src: raw, width: AVATAR_SIZE, height: AVATAR_SIZE, isRemote: false };
	}

	// src 相对路径：交给 Astro 图片管线（顺便压成 webp，原图 400KB+）
	const key = path.normalize(path.join("../", raw)).replace(/\\/g, "/");
	const loader = localImages[key];
	if (!loader) return EMPTY;

	try {
		const image = await loader();
		const optimized = await getImage({
			src: image,
			width: AVATAR_SIZE,
			height: AVATAR_SIZE,
			fit: "cover",
			format: "webp",
		});
		return {
			src: optimized.src,
			width: optimized.options.width ?? AVATAR_SIZE,
			height: optimized.options.height ?? AVATAR_SIZE,
			isRemote: false,
		};
	} catch {
		// 图片管线异常时退回 Vite 原始 URL，至少不破图
		try {
			const image = await loader();
			return { src: image.src, width: image.width, height: image.height, isRemote: false };
		} catch {
			return EMPTY;
		}
	}
}

/** 解析站点头像（带缓存） */
export function getSiteAvatar(): Promise<SiteAvatar> {
	if (!cache) cache = resolve();
	return cache;
}

/**
 * 站点头像的**绝对**地址，供结构化数据 / og / RSS 等站外场景使用。
 * 解析不到时返回 undefined，调用方自行决定是否省略该字段。
 */
export async function getSiteAvatarAbsoluteUrl(): Promise<string | undefined> {
	const avatar = await getSiteAvatar();
	if (!avatar.src) return undefined;
	if (/^https?:\/\//i.test(avatar.src)) return avatar.src;

	const base = siteConfig.site_url.replace(/\/+$/, "");
	const pathname = avatar.src.startsWith("/") ? avatar.src : `/${avatar.src}`;
	return `${base}${pathname}`;
}
