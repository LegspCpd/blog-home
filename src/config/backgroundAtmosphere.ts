/**
 * 背景氛围配置（Background atmosphere）
 * ============================================================================
 * 设计参考：DESIGN-vercel.md 的「hero 网格渐变（mesh gradient）」+
 *           DESIGN-x.ai.md 的「近黑画布 + 克制的暖/冷光」。
 *
 * 它做什么 / What it does
 *   在**主内容区顶部**铺一层极低透明度的柔光（几个大半径圆形渐变叠在一起），
 *   像 Vercel 首页那样只出现在首屏，向下自然淡出，滚动时随页面一起离开。
 *
 * 它不做什么 / What it must NOT do
 *   · 不替代 Supabase 设计系统：底色仍是 #111111 / #ffffff，主色仍是 #3ecf8e。
 *   · 不做霓虹、不做大面积渐变、不做玻璃拟态。色块 alpha 请保持 ≤ 0.3。
 *
 * 调参建议 / Tuning tips
 *   · 想更「有气氛」→ 提高 blobs[].alpha（每次 +0.02 地加，很容易过量）。
 *   · 想更「干净」→ 把 enable 设为 false，或删掉多余的 blob。
 *   · 色块中心点 x/y 是相对这一层的百分比，y 越大越靠下。
 *   · radius 建议 ≥ 360px，太小会看出「光斑」而不是「氛围」。
 */

/** 一个柔光色块 / One soft light blob */
export interface AmbientBlob {
	/** 颜色，十六进制 / Color in hex (#rrggbb) */
	color: string;
	/** 中心点横向位置，0–100（相对背景层宽度）/ Horizontal center, % of layer width */
	x: number;
	/** 中心点纵向位置，0–100（相对背景层高度）/ Vertical center, % of layer height */
	y: number;
	/** 半径（像素）/ Radius in px */
	radius: number;
	/** 最中心处的不透明度 0–1，建议 ≤ 0.3 / Peak alpha, keep ≤ 0.3 */
	alpha: number;
}

export interface BackgroundAtmosphereConfig {
	/** 总开关 / Master switch */
	enable: boolean;
	/**
	 * 背景层高度（像素）。只覆盖页面顶部这么多高度，往下自然淡出。
	 * Height of the atmosphere band in px (it fades out on its own).
	 */
	layerHeight: number;
	/** 亮色模式整体强度倍率 / Intensity multiplier in light mode */
	lightIntensity: number;
	/** 暗色模式整体强度倍率 / Intensity multiplier in dark mode */
	darkIntensity: number;
	/** 柔光色块，数组顺序 = 叠加顺序（后面的盖在前面上）/ Blobs, later ones paint on top */
	blobs: AmbientBlob[];
	/**
	 * 交互元素（卡片/按钮）的轻微悬浮抬升。
	 * 取自两份设计稿的「hairline + 极轻阴影」语言，不是玻璃拟态。
	 * Enables the whisper-soft hover elevation on interactive cards.
	 */
	interactiveElevation: boolean;
}

export const backgroundAtmosphere: BackgroundAtmosphereConfig = {
	enable: true,
	layerHeight: 560,
	lightIntensity: 0.7,
	darkIntensity: 1,

	blobs: [
		// 主色翠绿：整页只在这里出现一点点，呼应 --su-primary
		{ color: "#3ecf8e", x: 16, y: 0, radius: 520, alpha: 0.16 },
		// xAI 的 dusk 紫：冷色副调，压住画面不让它显得单调
		{ color: "#7c3aed", x: 74, y: 4, radius: 480, alpha: 0.1 },
		// xAI 的 breeze 蓝：更淡的一层，负责把中间过渡做得更柔和
		{ color: "#a0c3ec", x: 46, y: 24, radius: 440, alpha: 0.07 },
	],

	interactiveElevation: true,
};
