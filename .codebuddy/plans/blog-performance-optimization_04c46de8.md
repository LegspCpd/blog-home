---
name: blog-performance-optimization
overview: 在不使用大陆服务器前提下，针对 EdgeOne 和 Cloudflare 进行静态站点性能优化，包含缓存策略、资源加载、构建参数与兼容性验证，并完成回归测试。
todos:
  - id: baseline-audit
    content: 使用[subagent:code-explorer]复核性能相关文件与调用链
    status: completed
  - id: unify-cache-rules
    content: 新增public/_headers并对齐vercel.json缓存与安全头
    status: completed
    dependencies:
      - baseline-audit
  - id: build-tuning
    content: 优化astro.config.mjs构建参数降低请求与体积
    status: completed
    dependencies:
      - unify-cache-rules
  - id: head-connection-hints
    content: 在Layout.astro添加dns-prefetch与preconnect关键域名
    status: completed
    dependencies:
      - build-tuning
  - id: font-source-hardening
    content: 调整fontConfig字体源与回退策略避免慢链路
    status: completed
    dependencies:
      - head-connection-hints
  - id: regression-and-verification
    content: 执行pnpm check和pnpm build并抽样验证关键页面
    status: completed
    dependencies:
      - font-source-hardening
  - id: report-results
    content: 整理变更清单与测试结果输出最终优化报告
    status: completed
    dependencies:
      - regression-and-verification
---

## User Requirements

在不使用大陆服务器、且不涉及备案方案的前提下，优化博客在海外平台的访问速度，重点提升 EdgeOne 与 Cloudflare 的国内访问表现；通过 CDN 配置、资源压缩、缓存策略、加载链路优化等技术手段实现，并在修改后完成自测，保证原有功能完整可用。

## Product Overview

对现有博客进行“跨平台部署性能增强”：保持当前页面结构与交互不变，重点优化首屏加载、静态资源命中率、跨境链路握手时延与重复请求开销，使 EdgeOne/Cloudflare 与 Vercel 的体验差距缩小，页面打开更快、资源加载更稳定。

## Core Features

- 统一多平台缓存头策略（Vercel / Cloudflare / EdgeOne）  
- 优化关键资源加载链路（DNS 预解析、预连接）  
- 调整构建输出策略降低请求数量与体积  
- 优化字体资源来源与回退策略（未来启用时可直接受益）  
- 完整回归测试与性能验证，输出可复核测试结果

## Tech Stack Selection

- 复用现有栈：Astro 6 + Vite + `@astrojs/vercel` + 静态资源目录 `public/`
- 延续现有配置入口：`astro.config.mjs`、`vercel.json`、`src/layouts/Layout.astro`、`src/config/fontConfig.ts`

## Implementation Approach

采用“平台配置对齐 + 构建产物优化 + 关键链路预热 + 回归验证”四段式方案：
1) 先把 Vercel 已有缓存策略映射为 `public/_headers`，覆盖 Cloudflare/EdgeOne Pages；
2) 再优化构建参数与外部资源连接成本；
3) 最后执行构建与页面回归，验证缓存头与核心功能。
关键决策：优先复用现有路径与配置习惯，避免引入新架构；以静态资源长缓存+HTML 短缓存 SWR 为主，兼顾更新及时性与命中率。

复杂度与瓶颈：

- 配置匹配为 O(1) 规则查找，主要瓶颈在首访跨境握手与未命中回源；通过 preconnect、长缓存、压缩传输缓解。  

## Implementation Notes (Execution Details)

- 保持向后兼容：不改页面路由与业务组件行为，仅改部署与加载策略。  
- 避免日志噪音：不新增高频前端调试输出。  
- 控制影响面：仅修改性能相关配置文件，不做无关重构。  
- 对高风险项（如第三方脚本加载顺序）采用保守策略并回归关键页面。  

## Architecture Design

- 现有结构不变：内容渲染层（Astro 页面/布局）+ 资源分发层（CDN 缓存规则）+ 构建层（Vite/Astro build）  
- 新增跨平台统一出口：`public/_headers` 作为 EdgeOne/Cloudflare Pages 的缓存与安全头承载点；`vercel.json` 保持 Vercel 对齐。  

## Directory Structure

## Directory Structure Summary

本次改造聚焦“多 CDN 平台一致性与前端加载链路优化”，仅涉及已验证的核心配置文件与一个新增 headers 文件。

f:/Github/Firefly/

- astro.config.mjs  # [MODIFY] 构建性能参数优化（如 assetsInlineLimit、sourcemap 策略），保持现有最小侵入。
- vercel.json  # [MODIFY] 校准缓存与安全头规则，与多平台策略保持一致，避免配置漂移。
- public/_headers  # [NEW] Cloudflare/EdgeOne Pages 缓存头与安全头规则，覆盖静态资源长缓存与页面 SWR。
- src/layouts/Layout.astro  # [MODIFY] 在 head 注入 dns-prefetch/preconnect，优化跨域首连时延。
- src/config/fontConfig.ts  # [MODIFY] 调整字体源优先级与可达性配置，避免未来启用后出现慢加载链路。

## Agent Extensions

- **code-explorer**  
- Purpose: 在实现前后快速核对受影响文件、调用点与规则覆盖范围。  
- Expected outcome: 确保修改范围完整、无遗漏，并避免无关文件改动。�。