/**
 * 图片灯箱（Fancybox）配置
 * ============================================================================
 * 生效范围：文章正文图片、文章封面、动态/说说图片，以及任何带 data-fancybox 的元素。
 * 组件：src/components/features/FancyboxManager.astro
 *
 * 常见改法 / Common tweaks
 *   · 不想要缩放/旋转按钮 → 从 options.Toolbar.display.middle 里删掉对应字符串。
 *   · 不想要缩略图条 → options.Thumbs.autoStart = false。
 *   · 想允许点背景关闭 → options.dragToClose = true（默认就是）。
 *
 * 可用按钮名 / Available toolbar buttons
 *   "infobar" "zoomIn" "zoomOut" "toggle1to1" "rotateCCW" "rotateCW"
 *   "flipX" "flipY" "slideshow" "thumbs" "close"
 */

export interface FancyboxConfig {
	/** 文章正文 / 封面 / 动态图片的选择器（组队浏览）/ Image selectors, grouped */
	imageSelector: string;
	/** 点击后打开大图链接的选择器 / Anchor selector */
	linkSelector: string;
	/** 其他手动标记 data-fancybox 的元素 / Other opt-in elements */
	otherSelector: string;
	/**
	 * 通用参数，会与下面两组配置合并。
	 * Shared options, merged into both bindings below.
	 */
	options: Record<string, unknown>;
	/** 图片组（支持左右切换）额外参数 / Extra options for the image gallery */
	imageOptions: Record<string, unknown>;
}

export const fancyboxConfig: FancyboxConfig = {
	imageSelector: ".custom-md img, #post-cover img, .moment-images img",
	linkSelector: ".moment-images a[data-fancybox]",
	otherSelector: "[data-fancybox]:not(.moment-images a)",

	options: {
		// 底部缩略图条：autoStart = 打开时是否显示
		Thumbs: {
			autoStart: true,
			showOnStart: "yes",
		},
		// 工具栏按钮布局：left / middle / right 三组
		Toolbar: {
			display: {
				left: ["infobar"],
				middle: [
					"zoomIn",
					"zoomOut",
					"toggle1to1",
					"rotateCCW",
					"rotateCW",
					"flipX",
					"flipY",
				],
				right: ["slideshow", "thumbs", "close"],
			},
		},
		// 打开/关闭是否带动画
		animated: true,
		// 是否允许向下拖拽关闭
		dragToClose: true,
		// 键盘快捷键
		keyboard: {
			Escape: "close",
			Delete: "close",
			Backspace: "close",
			PageUp: "next",
			PageDown: "prev",
			ArrowUp: "next",
			ArrowDown: "prev",
			ArrowRight: "next",
			ArrowLeft: "prev",
		},
		// 图片是否自动适应窗口
		fitToView: true,
		// 提前预加载几张
		preload: 3,
		// 是否循环
		infinite: true,
		// 捏合缩放范围
		Panzoom: {
			maxScale: 3,
			minScale: 1,
		},
		// 不显示图片说明文字
		caption: false,
	},

	imageOptions: {
		// 同页所有图片视为一组，可左右切换
		groupAll: true,
		Carousel: {
			// 切换动画："slide" | "fade" | "crossfade"
			transition: "slide",
			preload: 2,
		},
	},
};
