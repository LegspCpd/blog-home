import { visit } from "unist-util-visit";

/**
 * 为缺少 alt 属性的图片自动添加描述性 alt 文本的 rehype 插件
 *
 * 当图片没有 alt 属性或 alt 为空时，从图片文件名生成描述性 alt 文本，
 * 帮助搜索引擎和屏幕阅读器理解图片内容。
 *
 * @returns {Function} A transformer function for the rehype plugin
 */
export default function rehypeImageAlt() {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (node.tagName !== "img") {
				return;
			}

			const props = node.properties || {};
			const src = props.src || "";
			const alt = props.alt;

			// 已有描述性 alt 文本，跳过
			if (alt && alt.trim() !== "") {
				return;
			}

			// 从图片 URL/路径中提取文件名作为备选 alt 文本
			let altText = "";
			if (src) {
				try {
					// 从 URL 或路径中提取文件名
					const url = new URL(src, "https://local");
					const pathname = url.pathname;
					const fileName = pathname.split("/").pop() || "";
					// 移除文件扩展名，将连字符/下划线替换为空格
					altText = fileName
						.replace(/\.[^.]+$/, "") // 移除扩展名
						.replace(/[-_]/g, " ") // 连字符/下划线 → 空格
						.replace(/\s+/g, " ")
						.trim();
				} catch {
					// 如果是相对路径，直接提取文件名
					const fileName = src.split("/").pop() || "";
					altText = fileName
						.replace(/\.[^.]+$/, "")
						.replace(/[-_]/g, " ")
						.replace(/\s+/g, " ")
						.trim();
				}
			}

			// 如果实在提取不到，使用默认描述
			if (!altText) {
				altText = "文章配图";
			}

			props.alt = altText;
			node.properties = props;
		});
	};
}
