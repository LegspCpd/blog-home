/**
 * 页面级配置（Page-level configuration）
 * ============================================================================
 * 这里集中放着「每个页面自己能改的东西」：文案、入口按钮、判断阈值、每页条数等。
 * 想改某个页面的显示内容，先来这里找，不必翻 .astro 源码。
 *
 * Where to edit what / 改哪个页面，看哪一段：
 *   /                → home        首页（hero 按钮、个人名片、三张卡片、页脚入口）
 *   /posts/          → postList    文章列表（/posts/ 与 /page/2、/page/3… 共用）
 *   /posts/<slug>/   → post        文章详情（相关文章数量、目录阈值）
 *   /archive/        → postList    归档页（复用文章列表的文案）
 *   /rss/            → rss         RSS 订阅页
 *   /search/         → search      搜索页
 *   /404/            → notFound    404 页
 *   /privacy/        → privacy     服务条款与隐私政策页
 *   /ftp/            → ftp         文件下载页（文件清单就在这里改！）
 *   /gh/*            → ghProxy     GitHub 镜像代理（动态路由）
 *
 * 约定 / Conventions
 *   · 图标名必须是 astro.config.mjs 里已注册的图标集（material-symbols、fa7-brands…），
 *     写错只是不显示，不会报错。
 *   · href 以 "/" 开头 = 站内地址（会自动拼上 base）；以 http(s) 开头 = 外链。
 *   · 改完保存即可，dev 服务器会自动刷新；构建时才会真正生效。
 */

/** 页面上的一个按钮 / 链接（One action button or link on a page） */
export interface PageActionLink {
	/** 显示文字 / Label text */
	label: string;
	/** 目标地址 / Target URL（"/posts/" 站内，或 "https://…" 外链） */
	href: string;
	/** 图标名（可选）/ Astro-icon name, optional */
	icon?: string;
}

/** 首页卡片（One highlight card on the homepage） */
export interface HomeHighlight {
	/** 图标名 / Icon name */
	icon: string;
	/** 卡片标题 / Card title */
	title: string;
	/** 一句话说明 / One-sentence description */
	text: string;
}

/** 首页配置 / Homepage (route "/") */
export interface HomePageConfig {
	/**
	 * 首屏入口按钮，按顺序渲染。
	 * 第 1 个会用「实心主按钮」样式（翠绿底 + 深色字），后面的都是描边按钮。
	 * The first entry is rendered as the solid primary button.
	 */
	actions: PageActionLink[];
	/** 个人名片里的一句话签名 / Short tagline under your name */
	roleTagline: string;
	/** 卡片区标题 / Section heading above the cards */
	highlightsTitle: string;
	/** 卡片区副标题 / Section subtitle above the cards */
	highlightsDescription: string;
	/** 卡片内容，建议 2–4 张 / Cards, 2–4 looks best */
	highlights: HomeHighlight[];
	/** 「社交链接」区标题 / Heading of the social-links section */
	socialTitle: string;
	/** 页脚站点级入口（不含 RSS 之类的特殊链接也可自行增删）/ Footer quick links */
	footerLinks: PageActionLink[];
}

/** 文章列表 / 归档页配置 / Post list & archive */
export interface PostListPageConfig {
	/** 页头小标签 / Small eyebrow label */
	kicker: string;
	/** 主标题 / Page title */
	title: string;
	/** 归档页主标题（归档页复用 kicker）/ Archive page title */
	archiveTitle: string;
	/** 上一页按钮文字 / Previous-page button label */
	prevLabel: string;
	/** 下一页按钮文字 / Next-page button label */
	nextLabel: string;
}

/** 文章详情页配置 / Single post page */
export interface PostPageConfig {
	/** 底部「相关文章」展示条数，0 = 不显示 / Related posts count, 0 disables */
	relatedCount: number;
	/** 目录只收录这几级标题 / Heading levels included in the TOC */
	tocMinDepth: number;
	tocMaxDepth: number;
	/** 目录条目少于这个数就不显示 / Hide the TOC below this many entries */
	tocMinHeadings: number;
}

/** RSS 订阅页配置 / RSS page (route "/rss/") */
export interface RssPageConfig {
	/** 页面里列出最近多少篇文章 / How many recent posts to list */
	recentCount: number;
	/** 点击复制后提示文字显示多久（毫秒）/ Copy-feedback duration in ms */
	copyFeedbackMs: number;
}

/** 搜索页配置 / Search page (route "/search/") */
export interface SearchPageConfig {
	/** Pagefind 摘要长度 / Pagefind excerpt length */
	excerptLength: number;
}

/** 404 页配置 / Not-found page */
export interface NotFoundPageConfig {
	/** 404 页最多显示几个快捷入口 / Max quick links on the 404 page */
	maxNavItems: number;
}

/** 服务条款与隐私政策页 / Privacy page (route "/privacy/") */
export interface PrivacyPageConfig {
	/** 浏览器标题 / <title> */
	title: string;
	/** SEO 描述 / Meta description */
	description: string;
}

/** 文件下载页 / File download page (route "/ftp/") */
export interface FtpPageConfig {
	/**
	 * 下载地址前缀，最终链接 = releaseBase + 文件名。
	 * Keep the trailing slash / 结尾的斜杠不要删。
	 */
	releaseBase: string;
	/**
	 * 文件清单：一行一个文件名，想加文件就在这里加。
	 * File list — one filename per line; add new files here.
	 */
	files: string[];
}

/** GitHub 镜像代理 / GitHub mirror proxy (dynamic route "/gh/*") */
export interface GhProxyPageConfig {
	/**
	 * 对外使用的域名（用于把 GitHub 返回的链接改写成自己的域名）。
	 * ⚠️ 应与实际访问本站的域名一致；现网值保留了历史配置，改前请确认。
	 */
	domain: string;
	/** 上游地址，一般不用改 / Upstream base URL */
	upstreamBase: string;
	/** 转发时使用的 User-Agent */
	userAgent: string;
}

/** 全部页面级配置 / All page-level configuration */
export interface PagesConfig {
	home: HomePageConfig;
	postList: PostListPageConfig;
	post: PostPageConfig;
	rss: RssPageConfig;
	search: SearchPageConfig;
	notFound: NotFoundPageConfig;
	privacy: PrivacyPageConfig;
	ftp: FtpPageConfig;
	ghProxy: GhProxyPageConfig;
}

export const pagesConfig: PagesConfig = {
	// ==========================================================================
	// 首页 / Homepage  →  /
	// ==========================================================================
	home: {
		actions: [
			{
				label: "查看文章",
				href: "/posts/",
				icon: "material-symbols:arrow-forward",
			},
			{
				label: "关于我",
				href: "/about/",
				icon: "material-symbols:arrow-outward",
			},
		],
		roleTagline: "写教程 · 自部署 · 折腾边缘",
		highlightsTitle: "小而清晰，先把每一次打开做好",
		highlightsDescription:
			"统一的版式、克制的配色、能按步骤复现的内容 —— 其余的交给速度。",
		highlights: [
			{
				icon: "material-symbols:edit-note-outline",
				title: "写作 / 教程",
				text: "把踩过的坑整理成能按步骤复现的教程，而不是只可远观的结论。",
			},
			{
				icon: "material-symbols:dns-outline",
				title: "自部署 / 服务",
				text: "维护自托管服务与 Macro / API 接口，能自己拿在手里的就不交出去。",
			},
			{
				icon: "material-symbols:bolt-outline",
				title: "边缘 / CDN 优选",
				text: "Cloudflare、EdgeOne 优选与边缘部署，让国内访问不再是减速器。",
			},
		],
		socialTitle: "社交链接",
		footerLinks: [
			{ label: "服务条款与隐私政策", href: "/privacy/" },
			{ label: "关于我", href: "/about/" },
			{ label: "RSS 订阅", href: "/rss/" },
			{ label: "留言板", href: "/guestbook/" },
		],
	},

	// ==========================================================================
	// 文章列表 / Post list  →  /posts/ 与 /page/2 …
	// ==========================================================================
	postList: {
		kicker: "文章",
		title: "全部文章",
		archiveTitle: "全部文章",
		prevLabel: "上一页",
		nextLabel: "下一页",
	},

	// ==========================================================================
	// 文章详情 / Single post  →  /posts/<slug>/
	// ==========================================================================
	post: {
		relatedCount: 5,
		tocMinDepth: 2,
		tocMaxDepth: 3,
		tocMinHeadings: 3,
	},

	// ==========================================================================
	// RSS 订阅页 / RSS page  →  /rss/
	// ==========================================================================
	rss: {
		recentCount: 6,
		copyFeedbackMs: 2000,
	},

	// ==========================================================================
	// 搜索页 / Search page  →  /search/
	// ==========================================================================
	search: {
		excerptLength: 20,
	},

	// ==========================================================================
	// 404 页 / Not-found page
	// ==========================================================================
	notFound: {
		maxNavItems: 5,
	},

	// ==========================================================================
	// 服务条款与隐私政策 / Privacy page  →  /privacy/
	// ==========================================================================
	privacy: {
		title: "服务条款与隐私政策",
		description:
			"本站的服务条款与隐私政策，包含数据收集范围、使用方式与第三方 API 合规声明。",
	},

	// ==========================================================================
	// 文件下载页 / File download page  →  /ftp/
	//   加文件只改 files 数组；下载前缀改 releaseBase
	// ==========================================================================
	ftp: {
		releaseBase: "https://github.com/LegspCpd/files-01.github.io/releases/download/end/",
		files: [
			"MaaEnd-win-x86_64-v2.7.0.zip",
			"wldyly-2021_BD.mp4",
			"MudRunner.7z",
			"GitHub-Store-1.7.0.exe",
			"QQListenerv1.1.exe",
			"Cloudflare_WARP_2026.3.851.0.msi",
			// "下一个文件.apk",
			// "再下一个文件.zip",
		],
	},

	// ==========================================================================
	// GitHub 镜像代理 / GitHub mirror proxy  →  /gh/*
	// ==========================================================================
	ghProxy: {
		domain: "blog.legspcpd.indevs.in",
		upstreamBase: "https://github.com",
		userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
	},
};
