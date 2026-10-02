import { visit } from "unist-util-visit";

/**
 * 标题层级修正的 rehype 插件
 *
 * 做两件事：
 * 1. 把内容里的 h1 降为 h2 —— 页面模板已提供一个 h1，
 *    正文再出现 h1 会造成「一页多个 h1」，对 SEO 和读屏都不友好。
 * 2. 修正层级跳级 —— 相邻标题若从 h2 直接跳到 h4（或 h1→h3），
 *    屏幕阅读器依赖层级连续来构建导航，跳级会让它误判结构。
 *    这里把跳级的那一个压到「上一个 + 1」。
 *
 * 举例（常见于作者随手写了 #### 开篇）：
 *   h2 → h4   ⇒  h4 变 h3
 *   h3 → h5   ⇒  h5 变 h4
 *
 * @returns {Function} A transformer function for the rehype plugin
 */
export default function rehypeHeadingLevel() {
	return (tree) => {
		// 先降级 h1
		visit(tree, "element", (node) => {
			if (node.tagName === "h1") {
				node.tagName = "h2";
			}
		});

		// 再按文档顺序修正跳级
		let prev = 1; // 文档起点视为 h1（页面标题）
		visit(tree, "element", (node) => {
			const m = /^h([1-6])$/.exec(node.tagName || "");
			if (!m) return;
			const level = Number(m[1]);
			if (level > prev + 1) {
				node.tagName = `h${prev + 1}`;
				prev = prev + 1;
			} else {
				prev = level;
			}
		});
	};
}
