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
			desc: "本站。Astro + Svelte + Tailwind，Supabase 视觉语言的个人开发者站点，部署在 EdgeOne Pages。",
			url: "https://github.com/LegspCpd/blog-home",
			tags: ["Astro", "Svelte", "Tailwind"],
			status: "active",
			featured: true,
		},
		{
			name: "CloudFlare 优选",
			desc: "自建的 Cloudflare 优选域名，配合 SaaS / Worker 路由，让国内访问不再是减速器。",
			url: "https://cf.legspcpd.furry.bz/",
			tags: ["CloudFlare", "CDN", "优选"],
			status: "active",
		},
		{
			name: "移动网络优选",
			desc: "针对移动网络的 Cloudflare 优选节点，单独做了优化。",
			url: "https://cmcc.legspcpd.furry.bz/",
			tags: ["CloudFlare", "移动网络", "优选"],
			status: "active",
		},
		{
			name: "EdgeOne 优选",
			desc: "EdgeOne Pages 的优选接入，让国内访问更快更稳。",
			url: "https://eo.legspcpd.furry.bz/",
			tags: ["EdgeOne", "CDN", "优选"],
			status: "active",
		},
		{
			name: "EdgeOne 多 IP 优选",
			desc: "多 IP 版 EdgeOne 优选域名，由服务端自动做多节点负载。",
			url: "https://e.legspcpd.furry.bz/",
			tags: ["EdgeOne", "CDN", "多 IP"],
			status: "active",
		},
		{
			name: "GitHub 反向代理",
			desc: "给 GitHub 原始文件 / Release 准备的反向代理，解决国内直连不畅的问题。",
			url: "https://v-gh.legspcpd.de5.net/",
			tags: ["GitHub", "代理"],
			status: "active",
		},
		{
			name: "Cloudreve on Workers",
			desc: "把 Cloudreve v4 后端重写为可直接跑在 Cloudflare Workers 上的 TypeScript 实现。",
			url: "https://github.com/LegspCpd/Cloudreve-Worker",
			tags: ["CloudFlare", "Workers", "R2"],
			status: "wip",
		},
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
