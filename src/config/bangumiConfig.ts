/**
 * 番组计划（Bangumi）页面配置
 * ============================================================================
 * 页面：/bangumi/
 *
 * 快速上手 / Quick start
 *   1. 想改「显示哪些分类」→ 改 categories 里每个分类的 enable。
 *   2. 想改「抓多少数据」→ 改 pagination。
 *   3. 想改「卡片圆点颜色」→ 改 statusColors（填 Tailwind 背景色 class）。
 *
 * 注意 / Note
 *   本文件**不能** import `@/i18n/translation`：i18n 反过来依赖 `@/config`，
 *   会形成循环依赖。分类名通过 buildCategoryMap(translate) 从页面注入。
 *
 *   另外：配置目录会被 astro.config.mjs 通过 `./src/config`（索引）加载，
 *   那一刻 `@/` 别名还不存在，所以这里的**运行时**导入必须写成相对路径
 *   （`type` 导入会被编译期擦除，写 `@/` 安全）。
 *   The config barrel is loaded by astro.config.mjs before the `@/` alias
 *   exists, so runtime imports here must be relative paths.
 */
import I18nKey from "../i18n/i18nKey";

/** 分类 id，同时也是 Bangumi API 的 subject_type 语义名 / Category id */
export type BangumiCategoryId = "book" | "anime" | "music" | "game" | "real";

/** 单个分类 / One Bangumi category */
export interface BangumiCategoryConfig {
	/** 分类 id（不要改）/ Category id, do not change */
	id: BangumiCategoryId;
	/** 是否在页面上显示这个分类 / Whether this category is shown */
	enable: boolean;
	/**
	 * Bangumi 条目类型编号，**不要改**：
	 * 1=书籍 2=动画 3=音乐 4=游戏 6=真人影视
	 * Bangumi subject type, do not change.
	 */
	subjectType: number;
	/** 分类名对应的多语言 key（改文案请去 src/i18n/languages）/ i18n key for the label */
	i18nKey: I18nKey;
}

/** 数据抓取设置 / Data fetching */
export interface BangumiPaginationConfig {
	/** 每次请求返回多少条 / Page size per request */
	limit: number;
	/** 两次请求之间等待多少毫秒，避免被限流 / Delay between requests (ms) */
	delay: number;
	/** 单分类最多抓多少条，0 = 不限制 / Max items per category, 0 = unlimited */
	maxTotal: number;
}

/** Bangumi 页面配置 / Bangumi page configuration */
export interface BangumiPageConfig {
	/** API 地址，一般不用改 / Bangumi API base URL */
	apiUrl: string;
	/**
	 * 分类列表，**数组顺序 = 页面上的标签顺序**
	 * （如果 siteConfig.bangumi.categoryOrder 非空，则以那个顺序为准）
	 */
	categories: BangumiCategoryConfig[];
	/** 抓取设置 / Fetch settings */
	pagination: BangumiPaginationConfig;
	/** 条目详情页前缀，点卡片会跳到 subjectBaseUrl + 条目 id */
	subjectBaseUrl: string;
	/** 每个分类每页展示多少个条目 / Items per page in each tab */
	itemsPerPage: number;
	/**
	 * 收藏状态编号 → 内部状态名（与 Bangumi API 一致，一般不用改）
	 * 1=想看 2=看过 3=在看 4=搁置 5=抛弃
	 */
	statusMap: Record<number, string>;
	/**
	 * 收藏状态编号 → 卡片左上角小圆点的颜色（Tailwind 背景色 class）
	 * Collection status → dot color class on the card.
	 */
	statusColors: Record<number, string>;
}

export const bangumiPageConfig: BangumiPageConfig = {
	apiUrl: "https://api.bgm.tv",

	categories: [
		{ id: "book", enable: true, subjectType: 1, i18nKey: I18nKey.bangumiCategoryBook },
		{ id: "anime", enable: true, subjectType: 2, i18nKey: I18nKey.bangumiCategoryAnime },
		{ id: "music", enable: true, subjectType: 3, i18nKey: I18nKey.bangumiCategoryMusic },
		{ id: "game", enable: true, subjectType: 4, i18nKey: I18nKey.bangumiCategoryGame },
		{ id: "real", enable: false, subjectType: 6, i18nKey: I18nKey.bangumiCategoryReal },
	],

	pagination: {
		limit: 50,
		delay: 50,
		maxTotal: 1000,
	},

	subjectBaseUrl: "https://bgm.tv/subject/",

	itemsPerPage: 12,

	statusMap: {
		1: "wish",
		2: "collect",
		3: "doing",
		4: "on_hold",
		5: "dropped",
	},

	statusColors: {
		1: "bg-blue-500",
		2: "bg-green-500",
		3: "bg-yellow-500",
		4: "bg-orange-500",
		5: "bg-red-500",
	},
};

/** 分类名 → 分类元信息（供页面渲染分类标签使用） */
export interface BangumiCategoryMeta {
	id: BangumiCategoryId;
	name: string;
	subjectType: number;
}

/**
 * 把 categories 转成「分类 id → { name, subjectType }」的查表对象。
 *
 * 为什么要在页面调用：分类名需要走 i18n，而本文件不能依赖 i18n（见文件头说明）。
 * 所以由页面把 `i18n` 作为参数传进来。
 *
 * @param translate 通常直接传 `i18n`
 */
export function buildCategoryMap(
	translate: (key: I18nKey) => string,
): Record<BangumiCategoryId, BangumiCategoryMeta> {
	const map = {} as Record<BangumiCategoryId, BangumiCategoryMeta>;
	for (const category of bangumiPageConfig.categories) {
		map[category.id] = {
			id: category.id,
			name: translate(category.i18nKey),
			subjectType: category.subjectType,
		};
	}
	return map;
}
