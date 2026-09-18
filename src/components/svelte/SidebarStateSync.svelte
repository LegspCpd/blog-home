<script lang="ts">
	/**
	 * 侧栏折叠状态同步（客户端）
	 *
	 * shadcn 的 Sidebar.Provider 只负责「写」sidebar_state cookie，
	 * 而本站是静态预渲染，SSR 阶段拿不到请求 cookie，
	 * 因此组件初始状态必然与用户上次选择不一致。
	 *
	 * 处理流程：
	 *  1. Layout.astro 的 head 内联脚本先在首次绘制前给 <html> 加标记类，
	 *     由 supabase-layout.css 立即给出正确的 64px 几何与文字隐藏（无闪烁）；
	 *  2. hydration 完成后由本组件把 Svelte 状态对齐到 cookie；
	 *  3. 状态一致后移除标记类，交回正常样式（不产生动画，因为宽度不变）。
	 *
	 * 必须渲染在 Sidebar.Root 内部才能访问 sidebars 上下文。
	 */
	import { onMount } from "svelte";
	import { useSidebar } from "@/components/ui/sidebar/context.svelte.js";

	const sidebar = useSidebar();

	const readCookieOpen = (): boolean | null => {
		const matched = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/);
		if (!matched) return null;
		return matched[1] !== "false";
	};

	onMount(() => {
		const wantOpen = readCookieOpen();
		if (wantOpen !== null && wantOpen !== sidebar.open) {
			sidebar.setOpen(wantOpen);
		}

		requestAnimationFrame(() => {
			document.documentElement.classList.remove("su-sidebar-collapsed");
		});
	});
</script>
