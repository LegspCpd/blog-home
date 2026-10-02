import { h } from "hastscript";
import { visit } from "unist-util-visit";
import { shouldAddNoReferrer } from "../utils/image-utils.ts";

/**
 * 图片处理 rehype 插件
 *
 * 做两件事：
 *  1. 给所有正文图片打上 data-fancybox="article" 与 data-src，
 *     使 FancyboxManager 能接管，实现点击放大与左右切换。
 *     没有 data-fancybox 的图片点击是「点了没反应」。
 *  2. 把带 alt 文本的图片包进 <figure>，并用 figcaption 呈现 alt。
 *
 * @returns {Function} A transformer function for the rehype plugin
 */
export default function rehypeFigure() {
	return (tree) => {
		visit(tree, "element", (node, index, parent) => {
			// 只处理 img 元素
			if (node.tagName !== "img") {
				return;
			}

			const imgProps = { ...node.properties };

			// 添加 referrerpolicy（如果需要）解决 403 问题
			// 无论是否有 alt，都要检查并添加 referrerpolicy
			if (imgProps.src && shouldAddNoReferrer(imgProps.src)) {
				imgProps.referrerpolicy = "no-referrer";
			}

			// 接入灯箱：FancyboxManager 依赖 data-fancybox 分组名来聚合同一篇的图，
			// 靠 data-src 拿原图地址。装饰性图标（.no-lightbox）排除在外。
			const cls = imgProps.class;
			const isDecorative = Array.isArray(cls) && cls.includes("no-lightbox");
			if (!isDecorative && imgProps.src) {
				imgProps["data-fancybox"] = "article";
				imgProps["data-src"] = imgProps.src;
			}

			// 获取 alt 属性
			const alt = imgProps.alt;

			// 如果没有 alt 属性或 alt 为空字符串，则只更新属性并保持原样
			if (!alt || alt.trim() === "") {
				node.properties = imgProps;
				return;
			}

			// 创建 figure 元素，包含处理后的 img 和居中的 figcaption
			const figure = h("figure", [
				// 使用原始属性的 img 节点
				h("img", {
					...imgProps,
				}),
				h("figcaption", alt),
			]);

			// 居中显示
			const centerFigure = h("center", figure);

			// 替换当前的 img 节点为 figure 节点
			if (parent && typeof index === "number") {
				parent.children[index] = centerFigure;
			}
		});
	};
}
