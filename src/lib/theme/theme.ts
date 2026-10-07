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

/**
 * 注册 Fluent UI Web Components。
 *
 * v3 的坑（都实测过，别照抄官方文档）：
 *  - `@fluentui/web-components/<name>.js` 经 exports.map 的通配符 `./*.js`
 *    指向的是 `define.js`，它零导出、纯副作用，`import "x/switch.js"` 这种
 *    写法会被打包器整个丢掉（包的 sideEffects 声明也救不回来）。
 *  - 组件类本身【不自带注册】，只有 define.js 会调 `Switch.define()`。
 *
 * 所以这里从 `<name>/index.js` 取类和 definition，在自己代码里显式 define：
 * 既有真实导出（挡tree-shaking），又确实注册了 custom element。
 */
import {
  Switch,
  SwitchDefinition,
} from "@fluentui/web-components/switch/index.js";
import {
  Button,
  ButtonDefinition,
} from "@fluentui/web-components/button/index.js";
import {
  Badge,
  BadgeDefinition,
} from "@fluentui/web-components/badge/index.js";
import {
  Divider,
  DividerDefinition,
} from "@fluentui/web-components/divider/index.js";
import {
  Tab,
  TabDefinition,
} from "@fluentui/web-components/tab/index.js";
import {
  Tablist,
  TablistDefinition,
} from "@fluentui/web-components/tablist/index.js";
import {
  TextInput,
  TextInputDefinition,
} from "@fluentui/web-components/text-input/index.js";
import {
  ProgressBar,
  ProgressBarDefinition,
} from "@fluentui/web-components/progress-bar/index.js";
import { setTheme } from "@fluentui/web-components";

/** 注册全部用到的 Fluent 组件（幂等：已注册则跳过） */
function registerFluentComponents(): void {
  const pairs = [
    [Switch, SwitchDefinition],
    [Button, ButtonDefinition],
    [Badge, BadgeDefinition],
    [Divider, DividerDefinition],
    [Tab, TabDefinition],
    [Tablist, TablistDefinition],
    [TextInput, TextInputDefinition],
    [ProgressBar, ProgressBarDefinition],
  ] as const;

  for (const [ctor, definition] of pairs) {
    const tag = (definition as { name?: string }).name;
    if (tag && customElements.get(tag)) continue;
    (ctor as unknown as { define: (d: unknown) => void }).define(definition);
  }
}
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  themeTokens,
  type ThemeName,
} from "./tokens";

const VALID: ThemeName[] = ["dark", "light"];

function isTheme(v: string | null): v is ThemeName {
  return v !== null && (VALID as string[]).includes(v);
}

/** 应用主题：写官方令牌 + 同步 <html> 属性 */
export function applyTheme(name: ThemeName): void {
  setTheme(themeTokens(name));
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
  persist(next);
  return next;
}

/** 持久化用户显式选择 */
function persist(name: ThemeName): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, name);
  } catch {
    /* 忽略写入失败 */
  }
}

function init(): void {
  // 先注册组件，再应用主题：组件升级时会读当前令牌
  registerFluentComponents();
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

  // 暴露给页面上的主题控件（NavBar 的 fluent-switch 用它按开关状态设置主题）
  const w = window as unknown as {
    __applyTheme?: (t: ThemeName) => void;
    __toggleTheme?: () => void;
  };
  w.__applyTheme = (t: ThemeName) => {
    applyTheme(t);
    persist(t);
  };
  w.__toggleTheme = toggleTheme;
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}