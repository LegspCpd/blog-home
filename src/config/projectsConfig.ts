/**
 * 项目列表配置
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ 新增一个项目：往下面 items 数组里加一项即可，条数不限。               │
 * │ 改完保存，dev 会自动刷新；构建时才会重新解析图标。                    │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 字段说明
 *   name    必填  项目名
 *   desc    必填  一句话说明
 *   url     必填  仓库 / 站点地址（点击整张卡片跳这里）
 *   icon    可选  图标来源，三种写法都支持：
 *                  · "/icons/foo.svg"            → public 目录下的文件
 *                  · "assets/images/foo.png"     → src 目录下的文件（构建时会处理）
 *                  · "https://example.com/a.png" → 远程图片
 *                  · 留空                         → 自动尝试抓取 url 的 favicon
 *   tags    可选  技术/分类标签
 *   status  可选  "active" 维护中 | "wip" 进行中 | "archived" 已归档
 *   featured 可选 置顶显示（排在最前）
 */
export interface ProjectItem {
	name: string;
	desc: string;
	url: string;
	icon?: string;
	tags?: string[];
	status?: "active" | "wip" | "archived";
	featured?: boolean;
}

export const projectsConfig: {
	title: string;
	description: string;
	/**
	 * 是否在构建时真的去请求 `https://<host>/favicon.ico` 来拿图标。
	 *
	 * false（默认）：不发网络请求，直接把域名交给 favicon 服务由浏览器获取。
	 *   构建快、离线可构建、不会因外网抖动变慢。
	 * true：构建时探测站点自身 favicon（每项目最多多等 1.5s），
	 *   项目多或网络受限时不建议开启。
	 */
	useBuildTimeFaviconProbe: boolean;
	items: ProjectItem[];
} = {
	title: "项目",
	description: "我在维护和折腾的一些东西。",
	useBuildTimeFaviconProbe: false,
	items: [
		{
			name: "LegspCpd Blog",
			desc: "本站。Astro + Svelte + Tailwind，Supabase 视觉语言的个人开发者站点。",
			url: "https://github.com/LegspCpd/Firefly",
			tags: ["Astro", "Svelte", "Tailwind"],
			status: "active",
			featured: true,
		},
		// 示例（按需取消注释 / 照抄修改）：
		// {
		// 	name: "示例项目",
		// 	desc: "一句话说明这个项目在做什么。",
		// 	url: "https://example.com",        // 未给 icon 时自动取该站 favicon
		// 	icon: "assets/images/logo.png",    // 也可写 "/icons/logo.svg" 或远程地址
		// 	tags: ["TypeScript"],
		// 	status: "wip",
		// },
	],
};

/** 状态 → 中文标签 */
export const projectStatusLabel: Record<string, string> = {
	active: "维护中",
	wip: "进行中",
	archived: "已归档",
};

/** 展示顺序：置顶优先，其余保持配置里的顺序 */
export function getSortedProjects(items: ProjectItem[] = projectsConfig.items): ProjectItem[] {
	return [...items].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
}
