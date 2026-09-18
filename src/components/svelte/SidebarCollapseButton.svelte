<script lang="ts">
	/**
	 * 侧栏折叠按钮（桌面端）
	 * 必须渲染在 Sidebar.Root 内部，才能通过 useSidebar() 拿到上下文。
	 * 自身不包裹 Menu / MenuItem，由调用方决定位置。
	 */
	import Icon from "@iconify/svelte";
	import * as Sidebar from "@/components/ui/sidebar/index.js";
	import { useSidebar } from "@/components/ui/sidebar/context.svelte.js";

	const sidebar = useSidebar();
</script>

<Sidebar.MenuButton
	tooltipContent={sidebar.state === "collapsed" ? "展开侧栏" : "折叠侧栏"}
	onclick={() => sidebar.toggle()}
	class="h-9 gap-2.5 rounded-[6px] px-2 text-[14px] text-muted-foreground group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
>
	<Icon
		icon={sidebar.state === "collapsed"
			? "material-symbols:left-panel-open-outline"
			: "material-symbols:left-panel-close-outline"}
		width="16"
		height="16"
		class="shrink-0"
	/>
	<span class="truncate group-data-[collapsible=icon]:hidden">
		{sidebar.state === "collapsed" ? "展开侧栏" : "折叠侧栏"}
	</span>
</Sidebar.MenuButton>
