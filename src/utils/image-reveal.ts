/**
 * 图片渐进显现（progressive image reveal）
 * ---------------------------------------------------------------------------
 * 行为：图片不是「啪」地出现，而是从「半模糊 + 半透明」平滑过渡到清晰。
 *
 * 分工：
 *   · 样式（blur / 初始透明度 / 时长）由 CSS 动画负责，变量挂在 <html> 上，
 *     见 src/styles/loading.css —— 由 Layout.astro 静态输出，无需 JS 参与。
 *   · 本文件只负责「什么时候给图片加上 .su-revealable」。
 *
 * 为什么用「加载完才加类」而不是「一开始就藏起来」：
 *   站点是静态预渲染的，如果让 CSS 先把所有图藏起来、再由 JS 放出来，
 *   一旦 JS 失败或很慢，图片就永远不出现。现在这个方向是安全的——
 *   JS 不跑，图片只是「正常显示」，不会消失。
 *
 * 配置见 src/config/loadingConfig.ts 的 imageReveal
 */

import { loadingConfig } from "@/config/loadingConfig";

/** 触发动画的类名（与 loading.css 对应）/ Class that starts the animation */
const REVEAL_CLASS = "su-revealable";
/** 动画结束后的类名，用来释放 filter 合成层 / Applied once the animation ends */
const DONE_CLASS = "su-revealed";

let observer: IntersectionObserver | undefined;
let staggerIndex = 0;

/** 该图片是否应当跳过处理 / Whether this image should be left alone */
function isSkipped(img: HTMLImageElement): boolean {
	const cfg = loadingConfig.imageReveal;

	if (img.dataset.noReveal !== undefined) return true;
	if (img.classList.contains(REVEAL_CLASS) || img.classList.contains(DONE_CLASS)) return true;

	const src = img.currentSrc || img.getAttribute("src") || "";
	if (src.startsWith("data:")) return true;
	// SVG 模糊起来观感很差，直接跳过
	if (/\.svg(\?|#|$)/i.test(src)) return true;

	for (const selector of cfg.skipSelectors) {
		try {
			if (img.matches(selector) || img.closest(selector)) return true;
		} catch {
			// 选择器写错时忽略这一条，不影响其他图片
		}
	}

	return false;
}

/** 尺寸太小（头像、图标）就跳过 / Skip small images such as avatars and icons */
function isTooSmall(img: HTMLImageElement): boolean {
	const cfg = loadingConfig.imageReveal;

	const attrWidth = Number.parseInt(img.getAttribute("width") ?? "", 10);
	const attrHeight = Number.parseInt(img.getAttribute("height") ?? "", 10);

	const width = Number.isFinite(attrWidth) && attrWidth > 0 ? attrWidth : img.naturalWidth;
	const height = Number.isFinite(attrHeight) && attrHeight > 0 ? attrHeight : img.naturalHeight;

	// 尺寸未知（还没加载完）时先不判断，等 load 之后再看
	if (!width || !height) return true;

	return Math.min(width, height) < cfg.minImageSize;
}

/** 真正开始播放显现动画 / Start the reveal animation */
function reveal(img: HTMLImageElement): void {
	const cfg = loadingConfig.imageReveal;

	const delay = Math.min(staggerIndex * cfg.staggerMs, cfg.maxStaggerMs);
	staggerIndex += 1;
	if (delay > 0) img.style.setProperty("--su-img-delay", `${delay}ms`);

	const finish = () => {
		img.classList.remove(REVEAL_CLASS);
		img.classList.add(DONE_CLASS);
	};

	img.addEventListener("animationend", finish, { once: true });
	img.classList.add(REVEAL_CLASS);

	// 兜底：动画被中断（切页、reduced-motion 生效等）时也能收尾
	window.setTimeout(() => {
		if (img.classList.contains(REVEAL_CLASS)) finish();
	}, cfg.durationMs + delay + 500);
}

/** 等图片就绪后再决定是否播放动画 / Reveal once the image is actually ready */
function prepare(img: HTMLImageElement): void {
	if (img.complete && img.naturalWidth > 0) {
		if (!isTooSmall(img)) reveal(img);
		return;
	}

	img.addEventListener(
		"load",
		() => {
			if (!isTooSmall(img)) reveal(img);
		},
		{ once: true },
	);
}

/**
 * 扫描页面上的图片并挂上显现动画。
 * 幂等：重复调用只会处理还没处理过的图片，可在 SPA 切页后再次调用。
 *
 * Scan the page and wire up the reveal animation. Safe to call repeatedly.
 */
export function initImageReveal(): void {
	const cfg = loadingConfig.imageReveal;

	if (!cfg.enable) return;
	if (typeof window === "undefined" || typeof document === "undefined") return;
	// 尊重「减少动效」偏好：不做模糊动画
	if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

	const images = Array.from(document.querySelectorAll<HTMLImageElement>("img")).filter(
		(img) => !isSkipped(img),
	);
	if (images.length === 0) return;

	staggerIndex = 0;

	// 老浏览器没有 IntersectionObserver：直接全部处理
	if (typeof IntersectionObserver === "undefined") {
		for (const img of images) prepare(img);
		return;
	}

	if (!observer) {
		observer = new IntersectionObserver(
			(entries, obs) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					obs.unobserve(entry.target);
					prepare(entry.target as HTMLImageElement);
				}
			},
			// 提前 200px 触发，滚到图片时动画已经播完，不会「一边滚一边糊」
			{ rootMargin: "200px 0px" },
		);
	}

	for (const img of images) observer.observe(img);
}
