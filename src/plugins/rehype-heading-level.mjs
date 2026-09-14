import { visit } from "unist-util-visit";

/**
 * 将内容中的 h1 降级为 h2 的 rehype 插件
 *
 * 确保每个页面上只有一个 <h1> 标记（由页面模板提供），
 * 文章内容的 h1 自动降级为 h2，避免多个 h1 导致 SEO 问题。
 *
 * @returns {Function} A transformer function for the rehype plugin
 */
export default function rehypeHeadingLevel() {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (node.tagName === "h1") {
				node.tagName = "h2";
			}
		});
	};
}
