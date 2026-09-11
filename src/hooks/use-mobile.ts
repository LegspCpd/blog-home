import { readable } from "svelte/store";

/**
 * 极简媒体查询 store（shadcn-svelte Sidebar 的 useIsMobile 依赖）
 * 参考 shadcn-svelte 官方实现，去除重复依赖
 */
export function useIsMobile(breakpoint = 768) {
	const query = `(max-width: ${breakpoint - 1}px)`;

	return readable(typeof window !== "undefined" ? window.matchMedia(query).matches : false, (set) => {
		if (typeof window === "undefined") return;

		const mql = window.matchMedia(query);
		const onChange = () => set(mql.matches);

		onChange();
		mql.addEventListener("change", onChange);

		return () => mql.removeEventListener("change", onChange);
	});
}
