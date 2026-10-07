/**
 * 阅读模式 - 无干扰阅读体验
 * 支持：字号/行高/字体/主题调节、目录同步、进度条、全屏、朗读
 */
import { onMount, onDestroy } from "svelte";
import { createEventDispatcher } from "svelte";
import { Icon } from "astro-icon/components";

interface ReadingSettings {
  fontSize: number;      // 14-24px
  lineHeight: number;    // 1.5-2.5
  fontFamily: string;    // serif/sans/mono
  theme: "light" | "dark" | "sepia" | "auto";
  maxWidth: number;      // 600-1200px
  showTOC: boolean;
  showProgress: boolean;
  autoScroll: boolean;
  autoScrollSpeed: number;
}

const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: "serif",
  theme: "auto",
  maxWidth: 800,
  showTOC: true,
  showProgress: true,
  autoScroll: false,
  autoScrollSpeed: 1,
};

const FONT_FAMILIES = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
  rounded: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
};

const THEMES = {
  light: { bg: "#fafafa", text: "#1a1a1a", accent: "#2fbf71" },
  dark: { bg: "#1a1a1a", text: "#fafafa", accent: "#4ade80" },
  sepia: { bg: "#f4f0e6", text: "#3c352d", accent: "#8b7355" },
  auto: null, // 跟随系统
};

const dispatch = createEventDispatcher();
let isActive = $state(false);
let settings = $state<ReadingSettings>({ ...DEFAULT_SETTINGS });
let tocItems = $state<Array<{id: string, text: string, level: number}>>([]);
let activeTocId = $state<string>("");
let scrollProgress = $state(0);
let autoScrollTimer: number;
let resizeObserver: ResizeObserver;
let articleElement: HTMLElement;
let tocElement: HTMLElement;
let progressBar: HTMLDivElement;

// 打开阅读模式
export function openReadingMode(article: HTMLElement, toc: Array<{id: string, text: string, level: number}>) {
  articleElement = article;
  tocItems = toc;
  loadSettings();
  applySettings();
  isActive = true;
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", handleKeydown);
}

// 关闭阅读模式
export function closeReadingMode() {
  isActive = false;
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleKeydown);
  stopAutoScroll();
  saveSettings();
}

// 加载设置
function loadSettings() {
  const saved = localStorage.getItem("reading_settings");
  if (saved) {
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
  }
}

// 保存设置
function saveSettings() {
  localStorage.setItem("reading_settings", JSON.stringify(settings));
}

// 应用设置到文章元素
function applySettings() {
  if (!articleElement) return;
  
  articleElement.style.fontSize = `${settings.fontSize}px`;
  articleElement.style.lineHeight = `${settings.lineHeight}`;
  articleElement.style.fontFamily = FONT_FAMILIES[settings.fontFamily as keyof typeof FONT_FAMILIES] || FONT_FAMILIES.serif;
  articleElement.style.maxWidth = `${settings.maxWidth}px`;
  
  // 应用主题
  const root = document.documentElement;
  if (settings.theme === "auto") {
    root.removeAttribute("data-reading-theme");
  } else {
    root.setAttribute("data-reading-theme", settings.theme);
  }
  
  // 更新进度条
  updateProgress();
}

// 键盘快捷键
function handleKeydown(e: KeyboardEvent) {
  if (!isActive) return;
  
  // ESC 退出
  if (e.key === "Escape") {
    closeReadingMode();
    return;
  }
  
  // 快捷键
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case "=":
      case "+":
        e.preventDefault();
        adjustFontSize(1);
        break;
      case "-":
        e.preventDefault();
        adjustFontSize(-1);
        break;
      case "0":
        e.preventDefault();
        resetFontSize();
        break;
      case "ArrowUp":
        e.preventDefault();
        adjustLineHeight(0.1);
        break;
      case "ArrowDown":
        e.preventDefault();
        adjustLineHeight(-0.1);
        break;
    }
  }
  
  // 空格自动滚动
  if (e.key === " " && e.target === document.body) {
    e.preventDefault();
    toggleAutoScroll();
  }
  
  // 方向键导航目录
  if (e.key === "ArrowRight" && settings.showTOC) {
    e.preventDefault();
    navigateTOC(1);
  }
  if (e.key === "ArrowLeft" && settings.showTOC) {
    e.preventDefault();
    navigateTOC(-1);
  }
}

// 字号调节
function adjustFontSize(delta: number) {
  settings.fontSize = Math.max(14, Math.min(24, settings.fontSize + delta));
  applySettings();
  saveSettings();
}

function resetFontSize() {
  settings.fontSize = DEFAULT_SETTINGS.fontSize;
  applySettings();
  saveSettings();
}

// 行高调节
function adjustLineHeight(delta: number) {
  settings.lineHeight = Math.max(1.5, Math.min(2.5, settings.lineHeight + delta));
  applySettings();
  saveSettings();
}

// 字体切换
function setFontFamily(family: keyof typeof FONT_FAMILIES) {
  settings.fontFamily = family;
  applySettings();
  saveSettings();
}

// 主题切换
function setTheme(theme: ReadingSettings["theme"]) {
  settings.theme = theme;
  applySettings();
  saveSettings();
}

// 最大宽度
function setMaxWidth(width: number) {
  settings.maxWidth = Math.max(600, Math.min(1200, width));
  applySettings();
  saveSettings();
}

// 自动滚动
function toggleAutoScroll() {
  settings.autoScroll = !settings.autoScroll;
  if (settings.autoScroll) {
    startAutoScroll();
  } else {
    stopAutoScroll();
  }
  saveSettings();
}

function startAutoScroll() {
  if (!articleElement) return;
  const scrollStep = settings.autoScrollSpeed * 2;
  
  autoScrollTimer = window.setInterval(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    
    if (scrollTop >= maxScroll - 10) {
      stopAutoScroll();
      return;
    }
    
    window.scrollTo({
      top: scrollTop + scrollStep,
      behavior: "auto",
    });
  }, 50);
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer);
    autoScrollTimer = 0;
  }
}

function setAutoScrollSpeed(speed: number) {
  settings.autoScrollSpeed = Math.max(0.5, Math.min(3, speed));
  if (settings.autoScroll) {
    stopAutoScroll();
    startAutoScroll();
  }
  saveSettings();
}

// 目录导航
function navigateTOC(direction: number) {
  if (tocItems.length === 0) return;
  
  const currentIndex = tocItems.findIndex(t => t.id === activeTocId);
  let nextIndex = currentIndex + direction;
  
  if (nextIndex < 0) nextIndex = tocItems.length - 1;
  if (nextIndex >= tocItems.length) nextIndex = 0;
  
  const target = tocItems[nextIndex];
  const element = document.getElementById(target.id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    activeTocId = target.id;
  }
}

// 点击目录项
function onTocClick(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    activeTocId = id;
  }
}

// 滚动进度
function updateProgress() {
  if (!articleElement) return;
  
  const rect = articleElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const articleTop = rect.top;
  const articleBottom = rect.bottom;
  
  if (articleBottom <= 0) {
    scrollProgress = 100;
  } else if (articleTop >= viewportHeight) {
    scrollProgress = 0;
  } else {
    const visibleHeight = Math.min(articleBottom, viewportHeight) - Math.max(articleTop, 0);
    const totalHeight = rect.height;
    scrollProgress = Math.max(0, Math.min(100, (visibleHeight / totalHeight) * 100));
  }
  
  // 更新活跃目录项
  updateActiveTOC();
}

function updateActiveTOC() {
  if (tocItems.length === 0) return;
  
  let closest = tocItems[0];
  let minDistance = Infinity;
  
  for (const item of tocItems) {
    const element = document.getElementById(item.id);
    if (!element) continue;
    
    const rect = element.getBoundingClientRect();
    const distance = Math.abs(rect.top - window.innerHeight * 0.3);
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = item;
    }
  }
  
  if (closest.id !== activeTocId) {
    activeTocId = closest.id;
  }
}

// 滚动监听
let scrollHandler: () => void;

function setupScrollListener() {
  scrollHandler = () => {
    updateProgress();
  };
  window.addEventListener("scroll", scrollHandler, { passive: true });
}

function removeScrollListener() {
  window.removeEventListener("scroll", scrollHandler);
}

// 导出设置
function exportSettings() {
  const data = JSON.stringify(settings, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reading-settings.json";
  a.click();
  URL.revokeObjectURL(url);
}

// 导入设置
async function importSettings(file: File) {
  const text = await file.text();
  try {
    const imported = JSON.parse(text);
    settings = { ...DEFAULT_SETTINGS, ...imported };
    applySettings();
    saveSettings();
    dispatch("toast", { message: "设置导入成功", type: "success" });
  } catch {
    dispatch("toast", { message: "设置文件格式错误", type: "error" });
  }
}

// 朗读功能
let speechSynthesis: SpeechSynthesisUtterance | null = null;

function speakArticle() {
  if (!articleElement) return;
  
  if (speechSynthesis?.speaking) {
    window.speechSynthesis.cancel();
    return;
  }
  
  const text = articleElement.innerText;
  speechSynthesis = new SpeechSynthesisUtterance(text);
  speechSynthesis.lang = "zh-CN";
  speechSynthesis.rate = 1;
  speechSynthesis.pitch = 1;
  speechSynthesis.volume = 1;
  
  window.speechSynthesis.speak(speechSynthesis);
}

function stopSpeaking() {
  window.speechSynthesis.cancel();
}

// 全屏切换
async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
  } else {
    await document.exitFullscreen();
  }
}

// 打印/导出
function printArticle() {
  window.print();
}

function exportAsMarkdown() {
  if (!articleElement) return;
  
  const title = document.title;
  const content = articleElement.innerHTML;
  const markdown = `# ${title}\n\n${htmlToMarkdown(content)}`;
  
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function htmlToMarkdown(html: string): string {
  // 简单的 HTML 转 Markdown
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, "### $1\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/g, "$1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/g, "*$1*")
    .replace(/<code[^>]*>(.*?)<\/code>/g, "`$1`")
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs, "```\n$1\n```\n\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, "[$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g, "![$2]($1)")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

// 渲染设置面板
function renderSettingsPanel() {
  return (
    <div class="reading-settings-panel">
      <div class="settings-section">
        <h4>字体与排版</h4>
        <div class="setting-row">
          <label>字号</label>
          <input type="range" min="14" max="24" bind:value={settings.fontSize} on:input={applySettings} on:change={saveSettings} />
          <span>{settings.fontSize}px</span>
        </div>
        <div class="setting-row">
          <label>行高</label>
          <input type="range" min="1.5" max="2.5" step="0.1" bind:value={settings.lineHeight} on:input={applySettings} on:change={saveSettings} />
          <span>{settings.lineHeight}</span>
        </div>
        <div class="setting-row">
          <label>字体</label>
          <select bind:value={settings.fontFamily} on:change={applySettings}>
            {#each Object.entries(FONT_FAMILIES) as [key, value]}
              <option value={key}>{key}</option>
            {/each}
          </select>
        </div>
        <div class="setting-row">
          <label>宽度</label>
          <input type="range" min="600" max="1200" step="50" bind:value={settings.maxWidth} on:input={applySettings} on:change={saveSettings} />
          <span>{settings.maxWidth}px</span>
        </div>
      </div>
      
      <div class="settings-section">
        <h4>主题与显示</h4>
        <div class="setting-row">
          <label>主题</label>
          <select bind:value={settings.theme} on:change={applySettings}>
            <option value="auto">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="sepia">护眼</option>
          </select>
        </div>
        <label class="toggle">
          <input type="checkbox" bind:checked={settings.showTOC} on:change={saveSettings} />
          <span>显示目录</span>
        </label>
        <label class="toggle">
          <input type="checkbox" bind:checked={settings.showProgress} on:change={saveSettings} />
          <span>显示进度条</span>
        </label>
      </div>
      
      <div class="settings-section">
        <h4>自动滚动</h4>
        <label class="toggle">
          <input type="checkbox" bind:checked={settings.autoScroll} on:change={toggleAutoScroll} />
          <span>启用自动滚动</span>
        </label>
        <div class="setting-row">
          <label>速度</label>
          <input type="range" min="0.5" max="3" step="0.1" bind:value={settings.autoScrollSpeed} on:change={setAutoScrollSpeed} />
          <span>{settings.autoScrollSpeed}x</span>
        </div>
      </div>
      
      <div class="settings-actions">
        <button on:click={exportSettings}>导出设置</button>
        <label class="file-input">
          导入设置
          <input type="file" accept=".json" on:change={(e) => importSettings(e.target.files[0])} />
        </label>
      </div>
    </div>
  );
}

function renderTOC() {
  if (!settings.showTOC || tocItems.length === 0) return null;
  
  return (
    <aside class="reading-toc">
      <div class="toc-header">
        <h4>目录</h4>
        <button class="toc-toggle" on:click={() => settings.showTOC = !settings.showTOC}>
          {settings.showTOC ? "隐藏" : "显示"}目录
        </button>
      </div>
      <nav class="toc-nav">
        {#each tocItems as item}
          <a
            href="#{item.id}"
            class="toc-item {item.id === activeTocId ? 'active' : ''} toc-level-{item.level}"
            on:click={(e) => { e.preventDefault(); onTocClick(item.id); }}
          >
            {item.text}
          </a>
        {/each}
      </nav>
    </aside>
  );
}

function renderProgressBar() {
  if (!settings.showProgress) return null;
  
  return (
    <div class="reading-progress-bar" role="progressbar" aria-valuenow={Math.round(scrollProgress)} aria-valuemin={0} aria-valuemax={100}>
      <div class="progress-fill" style="width: {scrollProgress}%" />
      <span class="progress-text">{Math.round(scrollProgress)}%</span>
    </div>
  );
}

function renderControlBar() {
  return (
    <div class="reading-control-bar">
      <div class="control-group">
        <button on:click={adjustFontSize(-1)} title="减小字号 (Ctrl+-)" aria-label="减小字号">A-</button>
        <button on:click={resetFontSize} title="重置字号 (Ctrl+0)" aria-label="重置字号">A</button>
        <button on:click={adjustFontSize(1)} title="增大字号 (Ctrl+=)" aria-label="增大字号">A+</button>
      </div>
      
      <div class="control-group">
        <select bind:value={settings.theme} on:change={applySettings} aria-label="主题">
          <option value="auto">自动</option>
          <option value="light">☀️ 浅色</option>
          <option value="dark">🌙 深色</option>
          <option value="sepia">📄 护眼</option>
        </select>
      </div>
      
      <div class="control-group">
        <button on:click={toggleAutoScroll} class={settings.autoScroll ? "active" : ""} aria-pressed={settings.autoScroll} title="自动滚动 (空格)">
          {settings.autoScroll ? "⏸️ 暂停" : "▶️ 自动滚动"}
        </button>
        {settings.autoScroll && (
          <select bind:value={settings.autoScrollSpeed} on:change={setAutoScrollSpeed} aria-label="滚动速度">
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
          </select>
        )}
      </div>
      
      <div class="control-group">
        <button on:click={speakArticle} aria-label="朗读文章">🔊 朗读</button>
        <button on:click={toggleFullscreen} aria-label="全屏">⛶ 全屏</button>
        <button on:click={printArticle} aria-label="打印">🖨️ 打印</button>
        <button on:click={exportAsMarkdown} aria-label="导出 Markdown">📥 导出</button>
        <button on:click={closeReadingMode} class="close-btn" aria-label="退出阅读模式 (Esc)">✕</button>
      </div>
    </div>
  );
}

// 主渲染