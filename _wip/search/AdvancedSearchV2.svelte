/**
 * 高级搜索组件 - 支持分面筛选、搜索历史、热门搜索、保存搜索
 * 基于 pagefind 构建，提供类 Algolia 的搜索体验
 */
import { onMount } from "svelte";
import { pagefind } from "pagefind";
import { createEventDispatcher } from "svelte";

interface SearchFilters {
  category?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  author?: string;
}

interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
  category?: string;
  tags: string[];
  date: string;
  wordCount: number;
  readTime: number;
}

interface SavedSearch {
  id: string;
  query: string;
  filters: SearchFilters;
  createdAt: number;
  name: string;
}

export let placeholder = "搜索文章、标签、分类...";
export let indexUrl = "/pagefind/";

const dispatch = createEventDispatcher();
let searchInput: HTMLInputElement;
let pagefindInstance: any;
let query = $state("");
let results = $state<SearchResult[]>([]);
let filters = $state<SearchFilters>({});
let isSearching = $state(false);
let showFilters = $state(false);
let searchHistory = $state<string[]>([]);
let savedSearches = $state<SavedSearch[]>([]);
let popularSearches = $state<string[]>([]);
let selectedResultIndex = $state(-1);
let showResults = $state(false);
let debounceTimer: number;

// 初始化 pagefind
onMount(async () => {
  try {
    pagefindInstance = await pagefind({
      indexUrl,
      bundleDir: `${indexUrl}pagefind/`,
    });
    
    // 加载搜索历史
    const history = localStorage.getItem("search_history");
    if (history) searchHistory = JSON.parse(history).slice(0, 10);
    
    // 加载保存的搜索
    const saved = localStorage.getItem("saved_searches");
    if (saved) savedSearches = JSON.parse(saved);
    
    // 加载热门搜索（从本地存储或预设）
    const popular = localStorage.getItem("popular_searches");
    if (popular) popularSearches = JSON.parse(popular);
    else popularSearches = ["教程", "部署", "优化", "EdgeOne", "Astro", "TypeScript"];
    
  } catch (e) {
    console.error("Pagefind init failed:", e);
  }
});

// 防抖搜索
function debouncedSearch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch();
  }, 150);
}

async function performSearch() {
  if (!pagefindInstance || !query.trim()) {
    results = [];
    showResults = false;
    return;
  }
  
  isSearching = true;
  selectedResultIndex = -1;
  
  try {
    // 构建过滤器
    const filterConditions: string[] = [];
    if (filters.category) filterConditions.push(`category:${filters.category}`);
    if (filters.tag) filterConditions.push(`tag:${filters.tag}`);
    if (filters.dateFrom) filterConditions.push(`date:>=${filters.dateFrom}`);
    if (filters.dateTo) filterConditions.push(`date:<=${filters.dateTo}`);
    if (filters.author) filterConditions.push(`author:${filters.author}`);
    
    const searchOptions: any = {
      filters: filterConditions.length ? { include: filterConditions } : undefined,
      ranking: { termFrequency: 0.5, termSimilarity: 0.3, termPosition: 0.2 },
    };
    
    const searchResult = await pagefindInstance.search(query, searchResult);
    results = searchResult.results.slice(0, 20).map((r: any) => ({
      url: r.url,
      title: r.meta.title,
      excerpt: r.excerpt,
      category: r.meta.category,
      tags: r.meta.tags || [],
      date: r.meta.date,
      wordCount: r.meta.wordCount,
      readTime: r.meta.minutes,
    }));
    
    // 记录搜索历史
    if (query.trim() && !searchHistory.includes(query.trim())) {
      searchHistory = [query.trim(), ...searchHistory.slice(0, 9)];
      localStorage.setItem("search_history", JSON.stringify(searchHistory));
    }
    
    // 更新热门搜索
    updatePopularSearches(query.trim());
    
    showResults = results.length > 0;
    selectedResultIndex = showResults ? 0 : -1;
  } catch (e) {
    console.error("Search failed:", e);
    results = [];
  } finally {
    isSearching = false;
  }
}

function updatePopularSearches(term: string) {
  if (!term) return;
  const idx = popularSearches.indexOf(term);
  if (idx > -1) popularSearches.splice(idx, 1);
  popularSearches.unshift(term);
  if (popularSearches.length > 20) popularSearches.pop();
  localStorage.setItem("popular_searches", JSON.stringify(popularSearches));
}

// 保存搜索
function saveSearch() {
  if (!query.trim()) return;
  const name = prompt("为这个搜索起个名字:", query);
  if (!name) return;
  
  const saved: SavedSearch = {
    id: crypto.randomUUID(),
    query,
    filters: { ...filters },
    createdAt: Date.now(),
    name,
  };
  savedSearches = [saved, ...savedSearches];
  localStorage.setItem("saved_searches", JSON.stringify(savedSearches));
  
  dispatch("toast", { message: "搜索已保存", type: "success" });
}

// 删除保存的搜索
function deleteSavedSearch(id: string) {
  savedSearches = savedSearches.filter(s => s.id !== id);
  localStorage.setItem("saved_searches", JSON.stringify(savedSearches));
}

// 应用保存的搜索
function applySavedSearch(search: SavedSearch) {
  query = search.query;
  filters = { ...search.filters };
  performSearch();
}

// 清空筛选器
function clearFilters() {
  filters = {};
  performSearch();
}

// 键盘导航
function handleKeydown(e: KeyboardEvent) {
  if (!showResults || results.length === 0) return;
  
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      selectedResultIndex = Math.min(selectedResultIndex + 1, results.length - 1);
      break;
    case "ArrowUp":
      e.preventDefault();
      selectedResultIndex = Math.max(selectedResultIndex - 1, 0);
      break;
    case "Enter":
      e.preventDefault();
      if (selectedResultIndex >= 0) {
        navigateTo(results[selectedResultIndex].url);
      }
      break;
    case "Escape":
      showResults = false;
      searchInput?.blur();
      break;
  }
}

function navigateTo(url: string) {
  if (window.swup && typeof window.swup.navigate === "function") {
    window.swup.navigate(url);
  } else {
    window.location.href = url;
  }
  showResults = false;
  query = "";
  selectedResultIndex = -1;
}

// 标签输入处理
function addTag(tag: string) {
  if (!tag.trim()) return;
  if (!filters.tag) filters.tag = tag.trim();
  else if (!filters.tag.includes(tag.trim())) filters.tag += `,${tag.trim()}`;
  performSearch();
}

function removeTag(tag: string) {
  if (!filters.tag) return;
  const tags = filters.tag.split(",").filter(t => t !== tag);
  filters.tag = tags.join(",") || undefined;
  performSearch();
}

// 分类选择
function setCategory(cat: string) {
  filters.category = filters.category === cat ? undefined : cat;
  performSearch();
}

// 日期范围
function setDateRange(from: string, to: string) {
  filters.dateFrom = from || undefined;
  filters.dateTo = to || undefined;
  performSearch();
}