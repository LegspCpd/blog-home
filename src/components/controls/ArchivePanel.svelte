<script lang="ts">
	/**
	 * 归档时间线（Supabase / Claude 风）
	 *
	 *   /archive/                → 按年份的时间线
	 *   /archive/?category=xxx   → 分类筛选
	 *   /archive/?uncategorized=true
	 *   /archive/?tag=xxx        → 兼容旧链接（UI 已不再暴露标签入口）
	 *
	 * 数据由服务端传入，SSR 即渲染完整时间线，查询参数在 onMount 后再应用，
	 * 避免首屏空白。
	 */
	import { onMount } from "svelte";

	interface Post {
		id: string;
		data: {
			title: string;
			tags?: string[];
			category?: string | null;
			published: string | Date;
		};
	}

	interface Props {
		sortedPosts?: Post[];
	}

	let { sortedPosts = [] }: Props = $props();

	type Filter =
		| { type: "all" }
		| { type: "tag"; value: string }
		| { type: "category"; value: string }
		| { type: "uncategorized" };

	let filter = $state<Filter>({ type: "all" });

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const tag = params.get("tag");
		const category = params.get("category");
		const uncategorized = params.get("uncategorized");

		if (tag) filter = { type: "tag", value: tag };
		else if (category) filter = { type: "category", value: category };
		else if (uncategorized === "true") filter = { type: "uncategorized" };
	});

	const toDate = (v: string | Date): Date => (v instanceof Date ? v : new Date(v));

	const allPosts = $derived(
		[...(sortedPosts ?? [])].sort(
			(a, b) =>
				toDate(b.data.published).getTime() - toDate(a.data.published).getTime()
		)
	);

	const filtered = $derived(
		allPosts.filter((post) => {
			const tags = post.data.tags ?? [];
			const category = post.data.category?.trim() ?? "";
			switch (filter.type) {
				case "tag":
					return tags.some((t) => t.trim() === filter.value);
				case "category":
					return category === filter.value;
				case "uncategorized":
					return category === "";
				default:
					return true;
			}
		})
	);

	// 年份分组（保持倒序）
	const groups = $derived.by(() => {
		const map = new Map<string, Post[]>();
		for (const post of filtered) {
			const year = String(toDate(post.data.published).getFullYear());
			const bucket = map.get(year);
			if (bucket) bucket.push(post);
			else map.set(year, [post]);
		}
		return [...map.entries()].map(([year, posts]) => ({ year, posts }));
	});

	const formatDate = (v: string | Date) => {
		const d = toDate(v);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	};

	const activeLabel = $derived(
		filter.type === "tag"
			? `#${filter.value}`
			: filter.type === "category"
				? filter.value
				: filter.type === "uncategorized"
					? "未分类"
					: ""
	);

	// 用真实跳转清理筛选条件（保证分享/刷新后状态一致）
	const clearFilter = () => {
		if (typeof window !== "undefined") {
			window.location.href = "/archive/";
		}
	};
</script>

{#if filter.type !== "all"}
	<div class="su-filter-bar">
		<span class="su-filter-label">当前筛选</span>
		<span class="su-pill is-active">{activeLabel}</span>
		<span class="su-num">{filtered.length} 篇</span>
		<button type="button" class="su-filter-clear" onclick={clearFilter}>清除</button>
	</div>
{/if}

{#each groups as group (group.year)}
	<section class="su-year">
		<h2 class="su-year-head">
			<span class="su-year-num">{group.year}</span>
			<span class="su-num">{group.posts.length} 篇</span>
		</h2>
		<ul class="su-list">
			{#each group.posts as post (post.id)}
				<li>
					<a class="su-row" href={`/posts/${post.id.replace(/\.[^./]+$/, "")}/`}>
						<span class="su-row-date">{formatDate(post.data.published)}</span>
						<span class="su-row-title">{post.data.title}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<p class="su-empty">没有匹配的文章</p>
{/each}

<style>
	.su-filter-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		margin-bottom: 32px;
		padding: 12px 16px;
		border: 1px solid var(--su-border);
		border-radius: 8px;
	}

	.su-filter-label {
		font-size: 12px;
		line-height: 1.45;
		color: var(--su-muted-foreground);
	}

	.su-filter-clear {
		margin-left: auto;
		padding: 0;
		border: 0;
		background: none;
		color: var(--su-muted-foreground);
		font-family: inherit;
		font-size: 13px;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.su-filter-clear:hover {
		color: var(--su-primary);
	}

	.su-year + .su-year {
		margin-top: 64px;
	}

	.su-year-head {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin: 0 0 4px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--su-border);
	}

	.su-year-num {
		font-family: var(--font-mono-supabase);
		font-size: 22px;
		font-weight: 500;
		line-height: 1.2;
		letter-spacing: 0;
		color: var(--su-foreground);
	}

	.su-list > li + li {
		border-top: 1px solid var(--su-border);
	}

	/* 年份分组里的分隔线由 .su-year-head 提供，列表首项不再加线 */
	.su-year .su-list > li:first-child {
		border-top: 0;
	}

	.su-empty {
		margin: 0;
		padding: 32px 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--su-muted-foreground);
	}
</style>
