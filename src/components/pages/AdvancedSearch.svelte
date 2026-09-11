<script lang="ts">
	/**
	 * 站内搜索
	 *
	 * 双引擎策略（保证「任何情况下都搜得出来」）：
	 *   1. 优先用 Pagefind（生产环境有索引时）：分词/排序更好
	 *   2. Pagefind 不可用（开发环境、索引未部署、加载失败）→ 降级到
	 *      构建时生成的 /search-index.json 本地全文检索（标题 + 正文 + 描述 + 标签/分类）
	 *
	 * 结果统一成 { url, meta.title, excerpt } 形状，高亮用 <mark>。
	 */
	import Icon from "@iconify/svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { onMount } from "svelte";
	import type { SearchResult } from "@/global";
	import { url as formatUrl } from "@/utils/url-utils";

	interface Props {
		title?: string;
		description?: string;
	}

	let { title = i18n(I18nKey.search), description = "" }: Props = $props();

	interface IndexItem {
		id: string;
		url: string;
		title: string;
		description?: string;
		category?: string;
		tags?: string[];
		encrypted?: boolean;
		text?: string;
	}

	let keyword = $state("");
	let results = $state<SearchResult[]>([]);
	let isSearching = $state(false);
	let initialized = $state(false);
	let engine = $state<"pagefind" | "local" | null>(null);

	let localIndex: IndexItem[] | null = null;

	// ── 本地索引 ────────────────────────────────────────────
	const loadLocalIndex = async (): Promise<IndexItem[]> => {
		if (localIndex) return localIndex;
		try {
			const res = await fetch(formatUrl("/search-index.json"), {
				credentials: "same-origin",
			});
			localIndex = res.ok ? ((await res.json()) as IndexItem[]) : [];
		} catch {
			localIndex = [];
		}
		return localIndex;
	};

	const escapeHtml = (value: string) =>
		value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");

	/** 命中词高亮（先转义再插 mark，避免 XSS） */
	const highlight = (raw: string, words: string[]) => {
		let out = escapeHtml(raw);
		for (const word of words) {
			if (!word) continue;
			const safe = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			out = out.replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>");
		}
		return out;
	};

	/** 把查询拆成小写词元 */
	const wordsOf = (query: string) =>
		query
			.toLowerCase()
			.split(/\s+/)
			.map((w) => w.trim())
			.filter(Boolean);

	/** 取命中位置附近的正文片段作为摘要 */
	const makeExcerpt = (item: IndexItem, words: string[]) => {
		const source = item.text?.trim() || item.description?.trim() || "";
		if (!source) return item.description ? highlight(item.description, words) : "";

		const lower = source.toLowerCase();
		let at = -1;
		for (const word of words) {
			const found = lower.indexOf(word);
			if (found >= 0 && (at < 0 || found < at)) at = found;
		}
		if (at < 0) return highlight(source.slice(0, 140), words);

		const start = Math.max(0, at - 60);
		const end = Math.min(source.length, at + 140);
		return (
			(start > 0 ? "…" : "") +
			highlight(source.slice(start, end), words) +
			(end < source.length ? "…" : "")
		);
	};

	const searchLocal = async (query: string): Promise<SearchResult[]> => {
		const index = await loadLocalIndex();
		const words = wordsOf(query);
		if (words.length === 0) return [];

		const scored = index
			.map((item) => {
				const haystackTitle = item.title.toLowerCase();
				const haystackBody = [
					item.text ?? "",
					item.description ?? "",
					item.category ?? "",
					(item.tags ?? []).join(" "),
				]
					.join(" ")
					.toLowerCase();

				let score = 0;
				let hits = 0;
				for (const word of words) {
					if (haystackTitle.includes(word)) {
						score += 12;
						hits++;
					}
					if (haystackBody.includes(word)) {
						score += 3;
						hits++;
					}
				}
				return { item, score, hits };
			})
			.filter((entry) => entry.hits > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 30);

		return scored.map(({ item }) => ({
			url: item.url,
			meta: { title: highlight(item.title, words) },
			excerpt: makeExcerpt(item, words),
		}));
	};

	// ── Pagefind ────────────────────────────────────────────
	const searchPagefind = async (query: string): Promise<SearchResult[]> => {
		const words = wordsOf(query);
		const response = await window.pagefind.search(query);
		const data = await Promise.all(response.results.map((item) => item.data()));
		// Pagefind 只在摘要里插 mark，标题需要自己补高亮
		return data.map((item) => ({
			...item,
			meta: { ...item.meta, title: highlight(item.meta?.title ?? "", words) },
		}));
	};

	const runSearch = async () => {
		const query = keyword.trim();
		if (!initialized || !query) {
			results = [];
			return;
		}
		isSearching = true;
		try {
			if (window.pagefind) {
				engine = "pagefind";
				results = await searchPagefind(query);
			} else {
				engine = "local";
				results = await searchLocal(query);
			}
		} catch (error) {
			console.error("Search error:", error);
			// Pagefind 出错时再兜底一次本地检索
			try {
				engine = "local";
				results = await searchLocal(query);
			} catch {
				results = [];
			}
		} finally {
			isSearching = false;
		}
	};

	onMount(() => {
		// 预热本地索引，保证第一次输入就能立刻出结果
		loadLocalIndex();

		const initialize = async () => {
			initialized = true;
			const initialKeyword =
				new URLSearchParams(window.location.search).get("q") || "";
			if (initialKeyword) keyword = initialKeyword;
			if (keyword.trim()) await runSearch();
		};

		// 生产环境给 Pagefind 一点加载时间，避免首屏搜索直接降级
		if (!import.meta.env.PROD) {
			initialize();
			return;
		}
		if (window.pagefind) {
			initialize();
			return;
		}
		const timer = setTimeout(() => initialize(), 1200);
		const onReady = () => {
			clearTimeout(timer);
			initialize();
		};
		document.addEventListener("pagefindready", onReady, { once: true });
		return () => {
			clearTimeout(timer);
			document.removeEventListener("pagefindready", onReady);
		};
	});

	let debounceTimer: ReturnType<typeof setTimeout>;
	const handleInput = () => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			runSearch();
		}, 220);
	};
</script>

<header class="su-page-head">
	<p class="su-kicker">{i18n(I18nKey.search)}</p>
	<h1 class="su-title">{title}</h1>
	{#if description}
		<p class="su-page-desc">{description}</p>
	{/if}
</header>

<div class="su-search-field">
	<span class="su-search-icon">
		<Icon icon="material-symbols:search" width="16" height="16" />
	</span>
	<input
		type="search"
		class="su-search-input"
		placeholder="搜索标题或正文内容…"
		aria-label={i18n(I18nKey.search)}
		bind:value={keyword}
		oninput={handleInput}
	/>
</div>

<div class="su-search-results">
	{#if isSearching}
		<p class="su-search-status">
			<Icon icon="svg-spinners:ring-resize" width="14" height="14" />
			正在搜索…
		</p>
	{:else if results.length > 0}
		<p class="su-search-count">
			<span class="su-num">{results.length}</span> 条结果
		</p>
		<ul class="su-list">
			{#each results as result (result.url)}
				<li>
					<a class="su-result" href={result.url}>
						<span class="su-result-title">{@html result.meta.title}</span>
						{#if result.excerpt}
							<span class="su-result-excerpt">{@html result.excerpt}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{:else if keyword}
		<p class="su-search-status">没有找到与「{keyword}」相关的文章</p>
	{:else}
		<p class="su-search-status">输入关键词即可搜索标题与正文内容</p>
	{/if}
</div>

<style>
	.su-page-head {
		margin-bottom: 32px;
	}

	.su-title {
		margin: 8px 0 12px;
	}

	.su-page-desc {
		margin: 0;
		font-size: 16px;
		line-height: 1.7;
		color: var(--su-muted-foreground);
	}

	.su-search-field {
		position: relative;
		display: flex;
		align-items: center;
		margin-bottom: 32px;
	}

	.su-search-icon {
		position: absolute;
		left: 14px;
		display: flex;
		align-items: center;
		color: var(--su-muted-foreground);
		pointer-events: none;
	}

	.su-search-input {
		width: 100%;
		height: 44px;
		padding: 0 14px 0 40px;
		border: 1px solid var(--su-border);
		border-radius: 6px;
		background-color: var(--su-background);
		color: var(--su-foreground);
		font-family: inherit;
		font-size: 14px;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.su-search-input::placeholder {
		color: var(--su-ink-faint);
	}

	.su-search-input:focus {
		border-color: var(--su-primary);
	}

	.su-search-count {
		margin: 0 0 8px;
		font-size: 13px;
		line-height: 1.45;
		color: var(--su-muted-foreground);
	}

	.su-search-status {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 32px 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--su-muted-foreground);
	}

	.su-search-results .su-list {
		border-top: 1px solid var(--su-border);
	}

	.su-result {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px 0;
		text-decoration: none;
	}

	.su-result-title {
		font-size: 18px;
		font-weight: 500;
		line-height: 1.4;
		color: var(--su-foreground);
		transition: color 0.15s ease;
	}

	.su-result:hover .su-result-title {
		color: var(--su-primary);
	}

	.su-result-excerpt {
		font-size: 14px;
		line-height: 1.6;
		color: var(--su-muted-foreground);
	}

	:global(.su-search-results mark) {
		padding: 0 1px;
		background: transparent;
		color: var(--su-primary);
		font-weight: 500;
	}
</style>
