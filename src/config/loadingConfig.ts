/**
 * 加载体验配置（Loading UX）
 * ============================================================================
 * 管两件事：
 *   A. pageLoader   —— 页面/路由切换时的「圆形进度」加载指示器
 *   B. imageReveal  —— 图片加载完成后「先模糊后清晰」的渐进显现
 *
 * 相关实现
 *   · 组件：src/components/common/PageLoader.astro
 *   · 脚本：src/utils/image-reveal.ts（由 Layout.astro 初始化）
 *   · 样式：src/styles/loading.css
 */

/** 页面加载指示器 / Route & first-paint loading indicator */
export interface PageLoaderConfig {
	/** 总开关 / Master switch */
	enable: boolean;
	/**
	 * 首次进入站点（整页加载）时是否也显示。
	 * false = 只在站内 SPA 跳转时显示 —— 首次访问会更快看到内容。
	 * Whether to show it on the very first full page load.
	 */
	showOnFirstLoad: boolean;
	/**
	 * 首屏延迟多少毫秒才出现。
	 * 网络/缓存很快时不会闪一下，避免「加载器一闪而过」的廉价感。
	 * Delay before appearing on the first load (ms).
	 */
	initialDelayMs: number;
	/**
	 * 站内 SPA 跳转时，延迟多少毫秒才出现。
	 * 0 = 一点击就出现；调大（如 150）则「跳得快时完全不出现」。
	 * Delay before appearing on an in-site SPA navigation (ms).
	 */
	transitionDelayMs: number;
	/**
	 * 一旦出现，至少停留多久（毫秒），避免闪烁。
	 * 别设太大：跳转很快时，动画停留过久反而显得「慢」。
	 * Minimum time visible once shown (ms).
	 */
	minVisibleMs: number;
	/**
	 * 安全兜底：最多显示多久（毫秒）后强制隐藏。
	 * 某次跳转异常卡住时，遮罩不会一直挂在页面上。
	 * Hard timeout so the overlay can never get stuck (ms).
	 */
	maxVisibleMs: number;
	/** 遮罩底色不透明度 0–1，越大越遮住内容 / Overlay tint opacity */
	overlayOpacity: number;
	/** 遮罩背景模糊像素，0 = 不模糊 / Backdrop blur in px */
	overlayBlurPx: number;
	/** 圆环尺寸（像素）/ Ring diameter in px */
	size: number;
	/** 圆环线宽（像素）/ Ring stroke width in px */
	strokeWidth: number;
	/** 圆环颜色，默认跟随主题主色 / Ring color, defaults to the theme primary */
	color: string;
	/** 圆环下方文字，留空则不显示 / Optional label below the ring */
	label: string;
}

/** 图片渐进显现 / Progressive image reveal */
export interface ImageRevealConfig {
	/** 总开关（关闭后图片恢复「加载完立刻出现」）/ Master switch */
	enable: boolean;
	/** 初始模糊强度（像素），越大越糊 / Initial blur radius in px */
	blurPx: number;
	/** 初始不透明度 0–1 / Initial opacity */
	startOpacity: number;
	/** 从模糊到清晰的过渡时长（毫秒）/ Transition duration in ms */
	durationMs: number;
	/**
	 * 小于这个尺寸（像素，取宽高较小值）的图片不做处理。
	 * 目的是跳过头像、图标、favicon 这类小图，避免它们也跟着糊一下。
	 * Images smaller than this (min(width, height)) are skipped.
	 */
	minImageSize: number;
	/** 多张图之间的错开间隔（毫秒），形成轻微瀑布感 / Stagger between images */
	staggerMs: number;
	/** 错开的上限（毫秒），图片很多时不会越等越久 / Cap for the stagger */
	maxStaggerMs: number;
	/**
	 * 额外跳过的选择器：命中的图片不做模糊处理。
	 * 命中任意一个即可跳过（如侧栏头像）。
	 * Extra opt-out selectors.
	 */
	skipSelectors: string[];
}

export interface LoadingConfig {
	pageLoader: PageLoaderConfig;
	imageReveal: ImageRevealConfig;
}

export const loadingConfig: LoadingConfig = {
	// ==========================================================================
	// A. 页面 / 路由加载指示器
	// ==========================================================================
	pageLoader: {
		enable: true,
		showOnFirstLoad: true,
		initialDelayMs: 140,
		transitionDelayMs: 60,
		minVisibleMs: 260,
		maxVisibleMs: 8000,
		overlayOpacity: 0.55,
		overlayBlurPx: 2,
		size: 40,
		strokeWidth: 3,
		color: "#3ecf8e",
		label: "",
	},

	// ==========================================================================
	// B. 图片渐进显现（先模糊 → 再清晰）
	// ==========================================================================
	imageReveal: {
		enable: true,
		blurPx: 14,
		startOpacity: 0.25,
		durationMs: 520,
		minImageSize: 96,
		staggerMs: 40,
		maxStaggerMs: 240,
		skipSelectors: [
			// 手动退出：给任意 <img> 加 data-no-reveal 即可
			"[data-no-reveal]",
			// 侧栏品牌头像、站点头像：小图且长期可见，不做处理更稳
			".su-avatar",
			".su-scope img",
		],
	},
};
