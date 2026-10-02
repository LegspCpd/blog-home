<script lang="ts">
	import I18nKey from "@/i18n/i18nKey";
	import { i18n } from "@/i18n/translation";
	import { onMount, tick } from "svelte";
	import Icon from "@/components/common/Icon.svelte";
	import type { SearchResult } from "@/global";
	import { url as formatUrl } from "@/utils/url-utils";

	// --- Props ---
	export let title = i18n(I18nKey.search);
	export let description = "";

	// --- State ---
	let keyword = "";
	let results: SearchResult[] = [];
	let isSearching = false;
	let initialized = false;
	let inputEl: HTMLInputElement | null = null;

	// 开发模式下的模拟结果（Pagefind 仅在生产构建后可用）
	const fakeResult: SearchResult[] = [
		{
			url: formatUrl("/"),
			meta: { title: "Dev Mode Search Result 1" },
			excerpt: "This is a <mark>mock</mark> result for development.",
		},
		{
			url: formatUrl("/"),
			meta: { title: "Dev Mode Search Result 2" },
			excerpt: "Pagefind only works in <mark>production</mark> build.",
		},
	];

	/**
	 * 地址栏同步：把关键词写进 ?q=。
	 * 这样刷新不会丢结果，搜索链接也能直接分享。
	 * 用 replaceState 而非 pushState，避免搜索时污染浏览历史。
	 */
	const syncUrl = (q: string, replace: boolean) => {
		if (typeof window === "undefined") return;
		const url = new URL(window.location.href);
		if (q) {
			url.searchParams.set("q", q);
		} else {
			url.searchParams.delete("q");
		}
		const method = replace ? "replaceState" : "pushState";
		window.history[method]({}, "", url);
	};

	const search = async () => {
		const q = keyword.trim();
		if (!initialized || !q) {
			results = [];
			return;
		}
		isSearching = true;

		try {
			if (import.meta.env.PROD && window.pagefind) {
				const response = await window.pagefind.search(q);
				results = await Promise.all(
					response.results.map((item) => item.data()),
				);
			} else if (import.meta.env.DEV) {
				const lower = q.toLowerCase();
				results = fakeResult.filter(
					(item) =>
						item.excerpt.toLowerCase().includes(lower) ||
						item.meta.title.toLowerCase().includes(lower),
				);
			}
		} catch (error) {
			console.error("Search error:", error);
			results = [];
		} finally {
			isSearching = false;
		}
	};

	// 300ms 防抖：连续输入时不必每敲一下就查一次
	let debounceTimer: ReturnType<typeof setTimeout>;
	const handleInput = () => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			search();
			syncUrl(keyword.trim(), true);
		}, 300);
	};

	const clear = () => {
		keyword = "";
		results = [];
		syncUrl("", true);
		inputEl?.focus();
	};

	// --- 快捷键：/ 或 Ctrl/⌘+K 聚焦搜索框 ---
	const onKeydown = (e: KeyboardEvent) => {
		const target = e.target as HTMLElement | null;
		// 已经在输入框里就不抢焦点
		const inField =
			target &&
			(target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable);

		if ((e.key === "/" && !inField) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
			e.preventDefault();
			inputEl?.focus();
			inputEl?.select();
		}
	};

	onMount(async () => {
		// 从 ?q= 恢复上次的关键词
		const params = new URLSearchParams(window.location.search);
		keyword = params.get("q") || "";

		if (import.meta.env.PROD) {
			if (window.pagefind) {
				initialized = true;
			} else {
				document.addEventListener(
					"pagefindready",
					() => {
						initialized = true;
						search();
					},
					{ once: true },
				);
				document.addEventListener(
					"pagefindloaderror",
					() => {
						initialized = true;
					},
					{ once: true },
				);
			}
		} else {
			initialized = true;
		}

		if (keyword) await search();

		document.addEventListener("keydown", onKeydown);
		// 浏览器前进/后退时同步输入框
		window.addEventListener("popstate", () => {
			keyword = new URLSearchParams(window.location.search).get("q") || "";
			search();
		});
		return () => {
			document.removeEventListener("keydown", onKeydown);
			clearTimeout(debounceTimer);
		};
	});
</script>

<!-- 搜索框 -->
<div class="as-box">
	<div class="as-field">
		<span class="as-field-icon" aria-hidden="true">
			<Icon icon="material-symbols:search" />
		</span>
		<input
			bind:this={inputEl}
			type="search"
			class="as-input"
			placeholder={i18n(I18nKey.search)}
			autocomplete="off"
			aria-label={title}
			bind:value={keyword}
			on:input={handleInput}
		/>
		{#if keyword}
			<button type="button" class="as-clear" on:click={clear} aria-label="清空">
				<Icon icon="material-symbols:close" />
			</button>
		{/if}
		<kbd class="as-kbd" aria-hidden="true">/</kbd>
	</div>

	{#if description}
		<p class="as-desc">{description}</p>
	{/if}
</div>

<!-- 结果 -->
<div class="as-results">
	{#if isSearching}
		<div class="as-state">
			<Icon icon="svg-spinners:ring-resize" class="as-spinner" />
			<p>{i18n(I18nKey.searchLoading)}</p>
		</div>
	{:else if results.length > 0}
		<p class="as-count">
			<span class="su-num">{results.length}</span> 条结果
		</p>
		<ul class="as-list">
			{#each results as result}
				<li>
					<a href={result.url} class="as-item">
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
						<h3 class="as-item-title">{@html result.meta.title}</h3>
						<p class="as-item-excerpt">{@html result.excerpt}</p>
					</a>
				</li>
			{/each}
		</ul>
	{:else if keyword.trim()}
		<div class="as-state">
			<Icon icon="material-symbols:search-off" class="as-state-icon" />
			<p>{i18n(I18nKey.searchNoResults)}</p>
		</div>
	{:else}
		<div class="as-state">
			<Icon icon="material-symbols:search" class="as-state-icon" />
			<p>{i18n(I18nKey.searchTypeSomething)}</p>
			<p class="as-hint">按 <kbd>/</kbd> 可快速聚焦搜索框</p>
		</div>
	{/if}
</div>

<style>
	/* ---- 搜索框 ---- */
	.as-box {
		margin-bottom: 28px;
	}

	.as-field {
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		height: 52px;
		border: 1px solid var(--su-border);
		border-radius: var(--su-radius-lg);
		background-color: var(--su-card);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.as-field:focus-within {
		border-color: var(--su-accent-text);
		box-shadow: 0 0 0 3px var(--su-primary-soft);
	}

	.as-field-icon {
		display: inline-flex;
		color: var(--su-ink-faint);
		font-size: 20px;
		flex: none;
	}

	.as-input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		outline: none;
		background: transparent;
		font-family: inherit;
		font-size: 16px;
		color: var(--su-foreground);
	}

	.as-input::placeholder {
		color: var(--su-ink-faint);
	}

	/* 去掉 Safari type=search 的原生清除按钮，用自绘的 */
	.as-input::-webkit-search-decoration,
	.as-input::-webkit-search-cancel-button {
		-webkit-appearance: none;
	}

	.as-clear {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		flex: none;
		border: 0;
		border-radius: var(--su-radius-full);
		background-color: var(--su-muted);
		color: var(--su-muted-foreground);
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.15s ease;
	}

	.as-clear:hover {
		background-color: var(--su-accent);
		color: var(--su-foreground);
	}

	.as-kbd {
		flex: none;
		padding: 2px 7px;
		border: 1px solid var(--su-border);
		border-bottom-width: 2px;
		border-radius: var(--su-radius-xs);
		background-color: var(--su-canvas-soft);
		font-family: var(--font-mono-supabase);
		font-size: 11px;
		color: var(--su-ink-faint);
	}

	.as-desc {
		margin: 12px 0 0;
		font-size: 14px;
		color: var(--su-muted-foreground);
	}

	/* ---- 结果 ---- */
	.as-count {
		margin: 0 0 12px;
		font-size: 13px;
		color: var(--su-muted-foreground);
	}

	.as-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.as-item {
		display: block;
		padding: 16px 4px;
		color: inherit;
		text-decoration: none;
		border-bottom: 1px solid var(--su-border);
		border-radius: var(--su-radius-sm);
		transition: background-color 0.15s ease;
	}

	.as-item:hover {
		background-color: var(--su-canvas-soft);
	}

	.as-item-title {
		margin: 0 0 6px;
		font-size: 17px;
		font-weight: 600;
		line-height: 1.4;
		color: var(--su-foreground);
		transition: color 0.15s ease;
	}

	.as-item:hover .as-item-title {
		color: var(--su-primary-deep);
	}

	.as-item-excerpt {
		margin: 0;
		font-size: 14px;
		line-height: 1.6;
		color: var(--su-muted-foreground);
	}

	/* pagefind 返回的关键词高亮 */
	.as-item-title :global(mark),
	.as-item-excerpt :global(mark) {
		background-color: var(--su-primary-soft);
		color: var(--su-primary-deep);
		font-weight: 600;
		padding: 0 0.15em;
		border-radius: 2px;
	}

	/* ---- 状态 ---- */
	.as-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 56px 16px;
		text-align: center;
		color: var(--su-muted-foreground);
		font-size: 15px;
	}

	.as-state-icon {
		font-size: 40px;
		opacity: 0.4;
	}

	.as-spinner {
		font-size: 32px;
		color: var(--su-accent-text);
	}

	.as-hint {
		font-size: 13px;
		color: var(--su-ink-faint);
	}

	.as-hint kbd {
		padding: 1px 6px;
		border: 1px solid var(--su-border);
		border-radius: var(--su-radius-xs);
		font-family: var(--font-mono-supabase);
		font-size: 11px;
	}

	@media (max-width: 640px) {
		.as-field {
			height: 48px;
			padding-inline: 12px;
		}
		.as-input {
			font-size: 16px; /* 低于 16px 会触发 iOS 自动缩放 */
		}
		.as-kbd {
			display: none; /* 手机没有物理键盘 */
		}
	}
</style>