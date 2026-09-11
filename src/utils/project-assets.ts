/**
 * 项目图标解析（构建时执行）
 *
 * 优先级：
 *   1. `icon` 是 http(s) 远程地址  → 直接使用
 *   2. `icon` 是 "/xxx" 公共路径   → 直接使用（public 目录）
 *   3. `icon` 是 src 相对路径       → 交给 Vite 处理（如 "assets/images/foo.png"）
 *   4. 未给 icon，且 `url` 是网站   → 推断 favicon 地址（见下）
 *   5. 都无法处理                   → 返回 null，页面显示首字母占位
 *
 * 关于「自动获取 favicon」的两种模式（由 projectsConfig 的
 * `useBuildTimeFaviconProbe` 控制）：
 *
 *   false（默认，推荐）
 *     不发任何网络请求，直接把域名交给 favicon 服务，由浏览器去取。
 *     构建速度快、离线也能构建、不会因为外网抖动拖慢构建。
 *
 *   true
 *     构建时真的去请求 `https://<host>/favicon.ico`（单次请求，1.5s 超时）。
 *     命中就用站点自己的图标，否则回落到 favicon 服务。
 *     注意：项目多时会明显拖慢构建；网络受限时每个项目最多多等 1.5s。
 *
 * 页面层会监听图片加载失败并回落到首字母占位，所以图标地址失效也不会破图。
 */
import * as path from "node:path";
import type { ImageMetadata } from "astro";

/** 只扫描 src/assets 下的图片，避免把整个仓库都 glob 进来 */
const localIcons = import.meta.glob<ImageMetadata>(
	"../assets/**/*.{png,jpg,jpeg,svg,webp,avif,ico,gif}",
	{ import: "default" }
);

const PROBE_TIMEOUT_MS = 1500;
const probeCache = new Map<string, string | null>();

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value);
const isPublicPath = (value: string) => value.startsWith("/");

/** favicon 兜底服务：浏览器端解析，构建时零成本 */
export const faviconServiceUrl = (host: string) =>
	`https://icons.duckduckgo.com/ip3/${host}.ico`;

async function probeSiteFavicon(host: string): Promise<string | null> {
	if (probeCache.has(host)) return probeCache.get(host) ?? null;

	const candidate = `https://${host}/favicon.ico`;
	let resolved: string | null = null;
	try {
		const res = await fetch(candidate, {
			redirect: "follow",
			signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
			headers: {
				"user-agent": "Mozilla/5.0 (compatible; AstroBuild/1.0)",
				accept: "image/*,*/*;q=0.8",
			},
		});
		const type = (res.headers.get("content-type") || "").toLowerCase();
		if (res.ok && type.startsWith("image/")) resolved = candidate;
	} catch {
		// 网络不可用/超时：静默降级，不影响构建
	}

	probeCache.set(host, resolved);
	return resolved;
}

/** 处理 src 相对路径（Vite 需要静态可分析的 glob 键） */
async function resolveLocalIcon(iconPath: string): Promise<string | null> {
	const normalized = path
		.normalize(path.join("../", iconPath))
		.replace(/\\/g, "/");
	const loader = localIcons[normalized];
	if (!loader) return null;
	try {
		const mod = await loader();
		return mod?.src ?? null;
	} catch {
		return null;
	}
}

export interface ResolveIconOptions {
	/** 是否在构建时真的去请求站点 favicon（默认 false） */
	probe?: boolean;
}

/** 解析单个项目的图标地址 */
export async function resolveProjectIcon(
	project: { icon?: string; url: string },
	options: ResolveIconOptions = {}
): Promise<string | null> {
	const icon = project.icon?.trim();

	if (icon) {
		if (isRemoteUrl(icon)) return icon;
		if (isPublicPath(icon)) return icon;
		const local = await resolveLocalIcon(icon);
		if (local) return local;
	}

	if (!isRemoteUrl(project.url)) return null;

	let host: string;
	try {
		host = new URL(project.url).hostname;
	} catch {
		return null;
	}

	if (options.probe) {
		const probed = await probeSiteFavicon(host);
		if (probed) return probed;
	}

	return faviconServiceUrl(host);
}

/** 批量解析（串行，避免构建时请求风暴） */
export async function resolveProjectIcons<T extends { icon?: string; url: string }>(
	projects: T[],
	options: ResolveIconOptions = {}
): Promise<Array<T & { iconSrc: string | null }>> {
	const out: Array<T & { iconSrc: string | null }> = [];
	for (const project of projects) {
		out.push({ ...project, iconSrc: await resolveProjectIcon(project, options) });
	}
	return out;
}
