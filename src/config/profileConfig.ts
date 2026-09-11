import type { ProfileConfig } from "../types/config";

export const profileConfig: ProfileConfig = {
	// 头像
	// 图片路径支持三种格式：
	// 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
	// 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
	// 3. 远程 URL："https://imghub.2xgh.qzz.io/file/image/Image_1775995211463.jpg"
	avatar: "assets/images/ico.png",

	// 名字
	name: "LegspCpd",

	// 个人签名
	bio: "你不能只在赢时,才爱自己国家",

	// 链接配置
	// 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	links: [
		{
			name: "discord",
			icon: "ic:baseline-discord",
			url: "https://discord.gg/legspcpd",
			showName: false,
		},
		{
			name: "GitHub",
			icon: "mdi:github",
			url: "https://github.com/legspcpd",
			showName: false,
		},
		{
			name: "Email",
			icon: "material-symbols:attach-email-outline",
			url: "mailto:info@legspcpd.top",
			showName: false,
		},
		{
			name: "RSS",
			icon: "ri:rss-fill",
			url: "/rss/",
			showName: false,
		},
	],
};
