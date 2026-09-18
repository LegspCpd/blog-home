/**
 * 侧栏导航数据 + 图标映射
 * 集中一处维护，供 SupabaseLayout 与各页面复用。
 */
export interface SidebarNavItem {
	title: string;
	href: string;
	icon: string;
}

const iconMap: Record<string, string> = {
	home: "material-symbols:home-outline",
	article: "material-symbols:article-outline",
	project: "material-symbols:deployed-code-outline",
	tags: "material-symbols:tag",
	archive: "material-symbols:archive-outline",
	about: "material-symbols:person-outline",
	friends: "material-symbols:group-outline",
	guestbook: "material-symbols:chat-outline",
	search: "material-symbols:search",
};

export const resolveIcon = (name: string): string =>
	iconMap[name] || "material-symbols:circle";

/** 全站默认侧栏导航 */
export const defaultNavItems: SidebarNavItem[] = [
	{ title: "首页", href: "/", icon: "home" },
	{ title: "文章", href: "/posts/", icon: "article" },
	{ title: "项目", href: "/projects/", icon: "project" },
	{ title: "归档", href: "/archive/", icon: "archive" },
	{ title: "友链", href: "/friends/", icon: "friends" },
	{ title: "留言板", href: "/guestbook/", icon: "guestbook" },
	{ title: "关于我", href: "/about/", icon: "about" },
];

/** 侧栏顶部独立搜索入口 */
export const searchNavItem: SidebarNavItem = {
	title: "搜索",
	href: "/search/",
	icon: "search",
};
