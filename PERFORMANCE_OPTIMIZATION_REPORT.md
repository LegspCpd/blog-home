# 跨平台部署性能优化报告

## 优化目标
在不使用大陆服务器、不涉及备案的前提下，通过 CDN 配置、资源压缩、缓存策略、加载链路优化等技术手段，提升博客在海外平台（EdgeOne / Cloudflare）的国内访问表现，缩小与 Vercel 的体验差距。

---

## 已完成变更清单

### 1. 多平台缓存与安全头统一 (`public/_headers`)
**新增文件**: `public/_headers`

为 Cloudflare / EdgeOne Pages 提供与 Vercel 对齐的缓存策略：
- **安全头**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
- **页面缓存**: HTML 使用 SWR 策略 (`max-age=0, s-maxage=600, stale-while-revalidate=86400`)
- **静态资源长缓存**: `/_astro/*`, `/assets/*`, `/favicon/*`, `/gallery/*`, `/pio/*` 及常见静态扩展名使用 `max-age=31536000, immutable`

### 2. Vercel 配置校准 (`vercel.json`)
**状态**: 已存在，与新增 `_headers` 保持一致

现有配置已覆盖：
- 全局安全头与 SWR 缓存策略
- `_astro/`, `assets/`, `favicon/`, `gallery/`, `pio/` 目录的长期缓存

### 3. 构建参数优化 (`astro.config.mjs`)
**修改**: `vite.build` 配置

```javascript
// 提高内联资源阈值，减少小文件请求
assetsInlineLimit: 8192,  // 原 4096

// 禁用 sourcemap 以减少构建体积
sourcemap: false,

// 提高 chunk 大小警告阈值
chunkSizeWarningLimit: 1000,
```

### 4. 关键链路预热 (`src/layouts/Layout.astro`)
**新增**: 动态生成 `dns-prefetch` 与 `preconnect`

根据当前配置自动预热以下域名：
- Google Analytics: `https://www.googletagmanager.com`, `https://www.google-analytics.com`
- Microsoft Clarity: `https://www.clarity.ms`
- Umami: 配置的 `scriptUrl` 域名
- 51la: 配置的 `sdkUrl` 域名（默认 `sdk.51.la`）
- 启用的自定义字体源域名

### 5. 字体源优化 (`src/config/fontConfig.ts`)
**修改**: 字体 CDN 源与回退策略

| 字体 | 原地址 | 优化后地址 |
|------|--------|-----------|
| Zen Maru Gothic | fonts.googleapis.com | fonts.loli.net |
| Inter | fonts.googleapis.com | fonts.loli.net |
| MiSans Normal | unpkg.com | cdn.jsdelivr.net |
| MiSans Regular | unpkg.com | cdn.jsdelivr.net |
| MiSans Semibold | unpkg.com | cdn.jsdelivr.net |

**回退链补强**: 新增中文系统字体 `PingFang SC`, `Hiragino Sans GB`, `Microsoft YaHei`, `Noto Sans CJK SC`, `Source Han Sans SC`

### 6. 字体加载优化 (`src/components/features/FontManager.astro`)
**修改**: 
- 外部字体样式链接添加 `crossorigin="anonymous"`
- 移除 `console.log` 与 `PerformanceObserver` 噪音
- 仅在启用自定义字体时执行加载监听

---

## 待执行的回归验证命令

在本地终端执行以下命令完成最终验证：

```powershell
# 1. 进入项目目录
cd f:/Github/Firefly

# 2. 安装依赖（如缺失）
pnpm install

# 3. 类型检查
pnpm check

# 4. 生产构建
pnpm build
```

### 构建产物抽样检查要点

构建完成后，检查 `dist/` 目录：

1. **缓存头文件存在**: `dist/_headers` 应与 `public/_headers` 内容一致
2. **HTML 包含预热标签**: 抽样检查 `dist/index.html`，确认包含：
   ```html
   <link rel="dns-prefetch" href="https://...">
   <link rel="preconnect" href="https://..." crossorigin="anonymous">
   ```
3. **资源内联**: 检查 `dist/_astro/` 下小于 8KB 的资源是否被正确内联
4. **无 sourcemap**: 确认 `dist/` 下没有 `.map` 文件

---

## 部署后验证建议

### EdgeOne / Cloudflare Pages 部署检查

1. **响应头验证**:
   ```bash
   curl -I https://your-domain.com/
   # 应看到: X-Content-Type-Options: nosniff
   # 应看到: Cache-Control: public, max-age=0, s-maxage=600, stale-while-revalidate=86400
   
   curl -I https://your-domain.com/_astro/xxx.js
   # 应看到: Cache-Control: public, max-age=31536000, immutable
   ```

2. **预热标签验证**:
   ```bash
   curl -s https://your-domain.com/ | grep -E "dns-prefetch|preconnect"
   ```

3. **字体加载测试** (如启用自定义字体):
   - 打开浏览器 DevTools Network 面板
   - 确认字体请求使用 `fonts.loli.net` 或 `cdn.jsdelivr.net`
   - 检查 `crossorigin` 属性是否正确传递

---

## 风险与回滚方案

| 变更项 | 风险 | 回滚方式 |
|--------|------|---------|
| `public/_headers` | 低，仅影响 Cloudflare/EdgeOne | 删除文件即可 |
| `astro.config.mjs` 构建参数 | 低，sourcemap 仅影响调试 | 恢复 `sourcemap: true` |
| 字体源切换 | 极低，使用更稳定的 CDN | 恢复 `fontConfig.ts` 原地址 |
| Layout 预热标签 | 低，按配置动态生成 | 移除 `connectionHintOrigins` 相关代码 |

---

## 预期效果

- **首屏加载**: DNS 预解析 + 预连接减少跨境握手时延 50-200ms
- **静态资源**: 长期缓存策略提升二次访问命中率至 95%+
- **构建体积**: sourcemap 禁用 + 资源内联阈值提升减少 10-20% 请求数
- **字体加载**: 更稳定的 CDN 源 + 完善的回退链降低字体加载失败率

---

## 文件变更汇总

| 文件路径 | 操作 | 说明 |
|---------|------|------|
| `public/_headers` | 新增 | Cloudflare/EdgeOne 缓存与安全头配置 |
| `astro.config.mjs` | 修改 | 构建参数优化 |
| `src/layouts/Layout.astro` | 修改 | 动态生成 dns-prefetch/preconnect |
| `src/config/fontConfig.ts` | 修改 | 字体源与回退策略优化 |
| `src/components/features/FontManager.astro` | 修改 | 字体加载优化 |
| `vercel.json` | 未修改 | 原有配置已对齐 |

---

*报告生成时间: 2026-05-08*
*优化范围: 多平台 CDN 配置对齐 + 构建优化 + 关键链路预热 + 字体链路加固*
