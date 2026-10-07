/**
 * 主题运行时 —— 浏览器端
 *
 * 职责：
 *  1. 注册 Fluent UI Web Components
 *  2. 用 setTheme() 把当前主题的令牌写进 CSS 自定义属性
 *  3. 主题切换（暗色默认 / 亮色可选），持久化到 localStorage
 *  4. 跟随系统偏好（仅当用户没有显式选择过时）
 *
 * 关键：令牌由 setTheme 接管后，不要在 CSS 里用同名变量重新声明。
 */

import { setTheme } from "@fluentui/web-components";
import {
  themes,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type ThemeName,
} from "../../lib/theme/tokens";

const VALID: ThemeName[] = ["dark", "light"];

function isTheme(v: string | null): v is ThemeName {
  return v !== null && (VALID as string[]).includes(v);
}

/** 应用主题：写令牌 + 同步 <html> 属性 */
export function applyTheme(name: ThemeName): void {
  setTheme(themes[name]);
  document.documentElement.setAttribute("data-theme", name);
}

/** 读取用户偏好；没有则默认暗色 */
export function storedTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    /* localStorage 不可用（隐私模式）时静默降级 */
  }
  return DEFAULT_THEME;
}

/** 切换主题并持久化 */
export function toggleTheme(): ThemeName {
  const next: ThemeName =
    document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* 忽略写入失败 */
  }
  return next;
}

function init(): void {
  applyTheme(storedTheme());

  // 用户没有显式选择过时，跟随系统切换
  const media = window.matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", (e) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      /* 忽略 */
    }
    if (!isTheme(saved)) {
      applyTheme(e.matches ? "light" : "dark");
    }
  });

  // 暴露给页面上的切换按钮
  (window as unknown as { __toggleTheme?: () => void }).__toggleTheme = toggleTheme;
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}