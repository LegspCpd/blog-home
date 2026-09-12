// 配置索引文件 - 统一导出所有配置
// 这样组件可以一次性导入多个相关配置，减少重复的导入语句

// 类型导出
export type {
	AnnouncementConfig,
	BackgroundWallpaperConfig,
	CommentConfig,
	CoverImageConfig,
	ExpressiveCodeConfig,
	FooterConfig,
	GalleryAlbum,
	GalleryConfig,
	LicenseConfig,
	MusicPlayerConfig,
	NavBarConfig,
	ProfileConfig,
	SakuraConfig,
	SidebarLayoutConfig,
	SiteConfig,
	SponsorConfig,
	SponsorItem,
	SponsorMethod,
	WidgetComponentConfig,
	WidgetComponentType,
} from "../types/config";

// 新配置的类型跟随各自文件导出（放在一起，改配置时不用来回跳）
export type {
	AmbientBlob,
	BackgroundAtmosphereConfig,
} from "./backgroundAtmosphere";
export type {
	BangumiCategoryConfig,
	BangumiCategoryId,
	BangumiCategoryMeta,
	BangumiPageConfig,
	BangumiPaginationConfig,
} from "./bangumiConfig";
export type { FancyboxConfig } from "./fancyboxConfig";
export type {
	ImageRevealConfig,
	LoadingConfig,
	PageLoaderConfig,
} from "./loadingConfig";
export type {
	FtpPageConfig,
	GhProxyPageConfig,
	HomeHighlight,
	HomePageConfig,
	NotFoundPageConfig,
	PageActionLink,
	PagesConfig,
	PostListPageConfig,
	PostPageConfig,
	PrivacyPageConfig,
	RssPageConfig,
	SearchPageConfig,
} from "./pagesConfig";
export type { ProjectItem } from "./projectsConfig";
export type { SidebarNavItem } from "./sidebarNav";

export { adConfig1, adConfig2 } from "./adConfig"; // 广告配置
export { announcementConfig } from "./announcementConfig"; // 公告配置
// 样式配置
export { backgroundAtmosphere } from "./backgroundAtmosphere"; // 背景氛围（mesh 柔光 + 卡片悬浮抬升）
export { backgroundWallpaper } from "./backgroundWallpaper"; // 背景壁纸配置
// 功能配置
export { commentConfig } from "./commentConfig"; // 评论系统配置
export { coverImageConfig } from "./coverImageConfig"; // 封面图配置
export { expressiveCodeConfig } from "./expressiveCodeConfig"; // 代码高亮配置
export { fancyboxConfig } from "./fancyboxConfig"; // 图片灯箱配置
export { fontConfig } from "./fontConfig"; // 字体配置
export { footerConfig } from "./footerConfig"; // 页脚配置
export { friendsConfig, friendsPageConfig, getEnabledFriends } from "./friendsConfig"; // 友链配置
export { galleryConfig } from "./galleryConfig"; // 相册配置
export { licenseConfig } from "./licenseConfig"; // 许可证配置
export { loadingConfig } from "./loadingConfig"; // 页面加载指示器 + 图片渐进显现
// 组件配置
export { musicPlayerConfig } from "./musicConfig"; // 音乐播放器配置
export { navBarConfig, navBarSearchConfig } from "./navBarConfig"; // 导航栏配置与搜索配置
export { live2dModelConfig, spineModelConfig } from "./pioConfig"; // 看板娘配置
export { profileConfig } from "./profileConfig"; // 用户资料配置
export { sakuraConfig } from "./sakuraConfig"; // 樱花特效配置
export { defaultNavItems, searchNavItem } from "./sidebarNav"; // 侧栏导航项与搜索入口
// 布局配置
export { sidebarLayoutConfig } from "./sidebarConfig"; // 侧边栏布局配置
// 核心配置
export { siteConfig } from "./siteConfig"; // 站点基础配置
export { sponsorConfig } from "./sponsorConfig"; // 赞助配置

// 页面级配置（每个页面的文案 / 阈值 / 列表）
export { pagesConfig } from "./pagesConfig";
// 分类页与自定义页面
export { bangumiPageConfig, buildCategoryMap } from "./bangumiConfig"; // 番组计划页（/bangumi/）
export {
	getSortedProjects,
	projectStatusLabel,
	projectsConfig,
} from "./projectsConfig"; // 项目页（/projects/）
