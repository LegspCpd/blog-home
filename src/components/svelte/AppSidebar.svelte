<script lang="ts">
	/**
	 * 全站侧边栏（shadcn-svelte Sidebar + Supabase 设计系统）
	 *
	 * - 桌面端 collapsible="icon"：展开 240px / 折叠 64px
	 * - 折叠时所有文字完全隐藏，只保留图标（含底部三项）
	 * - 移动端自动切换为 Sheet 抽屉
	 *
	 * 尺寸通过 Sidebar.Provider 的 style 传入：shadcn 默认以行内样式写死
	 * 16rem / 3rem，必须用同样方式覆盖才能生效。
	 */
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";
	import * as Sidebar from "@/components/ui/sidebar/index.js";
	import SidebarCollapseButton from "@/components/svelte/SidebarCollapseButton.svelte";	import SidebarStateSync from "@components/svelte/SidebarStateSync.svelte";	import ThemeToggle from "@/components/svelte/ThemeToggle.svelte";

	interface NavItem {
		title: string;
		href: string;
		icon: string;
	}

	interface Props {
		navItems?: NavItem[];
		searchItem?: NavItem;
		/** 初始展开状态（由 SSR 从 sidebar_state cookie 读取） */
		defaultOpen?: boolean;
		/** 已解析好的站点头像地址（由 AppSidebar.astro 传入） */
		brandAvatar?: string;
	}

	let { navItems, searchItem, defaultOpen = true, brandAvatar = "" }: Props =
		$props();

	const items = $derived(navItems ?? []);

	let currentPath = $state("/");
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	const isActive = (href: string) => {
		if (!currentPath) return false;
		const normalize = (p: string) => (p !== "/" ? p.replace(/\/+$/, "") : "/");
		const current = normalize(currentPath);
		const pathOnly = normalize(href.split("?")[0]);
		if (pathOnly === "/") return current === "/";
		return current === pathOnly || current.startsWith(`${pathOnly}/`);
	};

	const githubUrl = "https://github.com/LegspCpd/Firefly";

	onMount(() => {
		const sync = () => {
			currentPath = window.location.pathname;
		};
		sync();
		document.addEventListener("swup:page:view", sync);
		return () => document.removeEventListener("swup:page:view", sync);
	});
</script>

<Sidebar.Provider
	class="su-scope"
	open={defaultOpen}
	style="--sidebar-width: 240px; --sidebar-width-icon: 64px; --sidebar-width-mobile: 272px;"
>
	<Sidebar.Root collapsible="icon">
		<!-- 把组件折叠状态对齐到 cookie（首次加载时纠偏，无闪烁） -->
		<SidebarStateSync />

		<!-- ── 品牌 ─────────────────────────────────────────── -->
		<Sidebar.Header class="border-b border-sidebar-border p-0">
			<a
				href="/"
				aria-label="返回首页"
				class="flex h-14 items-center gap-2.5 px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
			>
				<!--
					品牌图标 = 站点头像（唯一来源 profileConfig.avatar）。
					折叠时只留这个 28px 方块：不参与基线对齐、无文字，保证
					在 64px 轨道里精确居中且不「下坠」。
				-->
				{#if brandAvatar}
					<img
						src={brandAvatar}
						width="28"
						height="28"
						alt=""
						aria-hidden="true"
						class="block size-7 shrink-0 self-center rounded-[6px] border border-sidebar-border bg-muted object-cover"
					/>
				{:else}
					<span
						class="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-primary text-[13px] leading-none font-medium text-primary-foreground"
						aria-hidden="true">L</span
					>
				{/if}
				<span class="min-w-0 su-label group-data-[collapsible=icon]:hidden">
					<span class="block truncate text-[14px] leading-tight font-medium text-sidebar-foreground"
						>LegspCpd</span
					>
					<span
						class="mt-0.5 flex items-center gap-1.5 text-[11px] leading-none text-muted-foreground"
					>
						<span class="size-1.5 rounded-full bg-primary" aria-hidden="true"></span>
						Blog
					</span>
				</span>
			</a>
		</Sidebar.Header>

		<!-- ── 导航 ─────────────────────────────────────────── -->
		<Sidebar.Content class="px-3 py-3 group-data-[collapsible=icon]:px-[14px]">
			{#if searchItem}
				<Sidebar.Menu class="mb-2 gap-1">
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							tooltipContent={searchItem.title}
							class="h-9 gap-2.5 rounded-[6px] border border-sidebar-border bg-transparent px-2 text-[14px] text-muted-foreground group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
						>
							{#snippet child({ props })}
								<a {...props} href={searchItem.href}>
									{#if mounted}
										<Icon icon={searchItem.icon} width="16" height="16" class="shrink-0" />
									{:else}
										<span class="size-4 shrink-0" aria-hidden="true"></span>
									{/if}
									<span class="truncate group-data-[collapsible=icon]:hidden"
										>{searchItem.title}</span
									>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			{/if}

			<Sidebar.Group class="p-0">
				<Sidebar.GroupLabel
					class="h-6 px-2 text-[11px] font-normal tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden"
				>
					导航
				</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu class="gap-1">
						{#each items as item, index (item.title + index)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									isActive={isActive(item.href)}
									tooltipContent={item.title}
									class="h-9 gap-2.5 rounded-[6px] px-2 text-[14px] group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
								>
									{#snippet child({ props })}
										<a {...props} href={item.href}>
											{#if mounted}
												<Icon icon={item.icon} width="16" height="16" class="shrink-0" />
											{:else}
												<span class="size-4 shrink-0" aria-hidden="true"></span>
											{/if}
											<span class="truncate group-data-[collapsible=icon]:hidden">{item.title}</span
											>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>

		<!-- ── 底部：主题 / GitHub / 折叠 ───────────────────── -->
		<Sidebar.Footer class="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-[14px]">
			<Sidebar.Menu class="gap-1">
				<Sidebar.MenuItem>
					<ThemeToggle />
				</Sidebar.MenuItem>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						tooltipContent="GitHub"
						class="h-9 gap-2.5 rounded-[6px] px-2 text-[14px] group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
					>
						{#snippet child({ props })}
							<a {...props} href={githubUrl} target="_blank" rel="noopener noreferrer">
								{#if mounted}
									<Icon icon="fa7-brands:github" width="16" height="16" class="shrink-0" />
								{:else}
									<span class="size-4 shrink-0" aria-hidden="true"></span>
								{/if}
								<span class="truncate group-data-[collapsible=icon]:hidden">GitHub</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
				<Sidebar.MenuItem class="hidden md:block">
					<SidebarCollapseButton />
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Footer>
	</Sidebar.Root>

	<!-- 移动端抽屉触发按钮（需在 Provider 内才能访问侧栏上下文） -->
	<div class="su-mobile-trigger">
		<Sidebar.Trigger
			class="size-9 rounded-[6px] border border-border bg-background text-foreground"
		>
			{#if mounted}
				<Icon icon="material-symbols:menu-open" width="16" height="16" />
			{:else}
				<span class="size-4" aria-hidden="true"></span>
			{/if}
			<span class="sr-only">切换导航</span>
		</Sidebar.Trigger>
	</div>
</Sidebar.Provider>
