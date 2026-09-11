/**
 * Supabase 设计系统（DESIGN-supabase.md）语义色映射
 *
 * ⚠️ 这是给 @lucide/svelte 图标使用的静态颜色值。
 * Sidebar 内部（.su-scope 作用域）会覆盖 --lucide-* 令牌为 currentColor，
 * 因此这些颜色实际只在作用域外生效；保留它们是为了图标在任何场景下都不会报错。
 */
export const supabaseIconColors = {
	// 品牌 & 强调
	primary: "#3ecf8e",
	primaryDeep: "#24b47e",

	// 表面
	canvas: "#ffffff",
	canvasNight: "#111111",
	hairline: "#dfdfdf",

	// 文本
	ink: "#171717",
	inkMute: "#707070",
} as const;
