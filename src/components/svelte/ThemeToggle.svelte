<script lang="ts">
	/**
	 * 主题切换（Supabase 设计系统）
	 *
	 * 点击在「亮色 → 暗色 → 跟随系统」之间循环，图标随当前模式变化。
	 * 复用站点既有主题逻辑（setting-utils / theme-change 事件），不重复实现。
	 */
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";
	import { DARK_MODE, LIGHT_MODE, SYSTEM_MODE } from "@/constants/constants";
	import type { LIGHT_DARK_MODE } from "@/types/config";
	import {
		applyThemeToDocument,
		getStoredTheme,
		setTheme,
	} from "@/utils/setting-utils";

	let mode: LIGHT_DARK_MODE = $state(LIGHT_MODE);
	let mounted = $state(false);

	const icons: Record<string, string> = {
		[LIGHT_MODE]: "material-symbols:light-mode-outline",
		[DARK_MODE]: "material-symbols:dark-mode-outline",
		[SYSTEM_MODE]: "material-symbols:contrast",
	};

	const labels: Record<string, string> = {
		[LIGHT_MODE]: "亮色主题",
		[DARK_MODE]: "暗色主题",
		[SYSTEM_MODE]: "跟随系统",
	};

	const cycle = () => {
		const next: LIGHT_DARK_MODE =
			mode === LIGHT_MODE
				? DARK_MODE
				: mode === DARK_MODE
					? SYSTEM_MODE
					: LIGHT_MODE;
		mode = next;
		setTheme(next);
	};

	onMount(() => {
		mounted = true;
		mode = getStoredTheme();
		// 保证 DOM 状态与存储一致（system 模式交给系统监听处理）
		if (mode !== SYSTEM_MODE) {
			const isDark = document.documentElement.classList.contains("dark");
			const shouldBeDark = mode === DARK_MODE;
			if (isDark !== shouldBeDark) applyThemeToDocument(mode);
		}

		const onChange = () => {
			mode = getStoredTheme();
		};
		window.addEventListener("theme-change", onChange);
		return () => window.removeEventListener("theme-change", onChange);
	});
</script>

<button
	type="button"
	onclick={cycle}
	title={labels[mode]}
	aria-label={labels[mode]}
	class="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2 text-[14px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
>
	{#if mounted}
		<Icon icon={icons[mode]} width="16" height="16" class="shrink-0" />
	{:else}
		<span class="size-4 shrink-0" aria-hidden="true"></span>
	{/if}
	<span class="truncate group-data-[collapsible=icon]:hidden su-label">{labels[mode]}</span>
</button>
