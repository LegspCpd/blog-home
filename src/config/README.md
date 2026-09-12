# 配置文件说明

本目录包含 Firefly 主题的所有配置文件，采用模块化设计，每个文件负责特定的功能模块。

## 📁 配置文件结构

```
src/config/
├── index.ts               # 配置索引文件 - 统一导出
├── README.md              # 本文件
│
├── siteConfig.ts          # 站点基础配置（标题、描述、主题色、分页…）
├── profileConfig.ts       # 用户资料（头像、昵称、社交链接）
│
├── pagesConfig.ts         # ★ 页面级配置：首页 / 文章列表 / 文章详情 / RSS /
│                          #   搜索 / 404 / 隐私政策 / 文件下载页(/ftp) / gh 代理
├── projectsConfig.ts      # 项目页（/projects/）的项目列表
├── bangumiConfig.ts       # 番组计划页（/bangumi/）的 API、分类、抓取设置
├── sidebarNav.ts          # 左侧侧栏的导航项
├── friendsConfig.ts       # 友链页与友链数据
├── galleryConfig.ts       # 相册配置
├── sponsorConfig.ts       # 赞助配置
│
├── backgroundWallpaper.ts # 背景壁纸配置
├── backgroundAtmosphere.ts # ★ 背景氛围（mesh 柔光 + 卡片悬浮抬升）
├── loadingConfig.ts       # ★ 加载体验（页面圆环指示器 + 图片渐进显现）
├── fancyboxConfig.ts      # ★ 图片灯箱参数
│
├── commentConfig.ts       # 评论系统配置
├── announcementConfig.ts  # 公告配置
├── licenseConfig.ts       # 许可证配置
├── footerConfig.ts        # 页脚配置（内容在 FooterConfig.html）
├── expressiveCodeConfig.ts # 代码高亮配置
├── fontConfig.ts          # 字体配置
├── sidebarConfig.ts       # 侧边栏布局配置
├── navBarConfig.ts        # 导航栏配置
├── musicConfig.ts         # 音乐播放器配置
├── pioConfig.ts           # 看板娘（Spine / Live2D）配置
├── sakuraConfig.ts        # 樱花特效配置
├── adConfig.ts            # 广告配置
└── coverImageConfig.ts    # 封面图配置
```

> ★ = 本仓库为本站定制／新增的配置。

## 🗺️ 想改什么，看哪里

| 想做的事 | 改这里 |
| --- | --- |
| 改首页文案 / 按钮 / 三张卡片 | `pagesConfig.ts` → `home` |
| 改文章列表标题、上/下一页文字 | `pagesConfig.ts` → `postList` |
| 改相关文章数量、目录显示阈值 | `pagesConfig.ts` → `post` |
| 增删 /ftp 下载页的文件 | `pagesConfig.ts` → `ftp.files` |
| 改 RSS 页列出几篇、复制提示时长 | `pagesConfig.ts` → `rss` |
| 改搜索摘要长度 | `pagesConfig.ts` → `search` |
| 改 404 页快捷入口数量 | `pagesConfig.ts` → `notFound` |
| 改隐私政策页标题 / 描述 | `pagesConfig.ts` → `privacy` |
| 增删项目页的项目 | `projectsConfig.ts` → `items` |
| 改番组计划抓多少数据 / 显示哪些分类 | `bangumiConfig.ts` |
| 改左侧侧栏的导航项 | `sidebarNav.ts` → `defaultNavItems` |
| 调背景柔光强弱 / 位置 | `backgroundAtmosphere.ts` |
| 调节圆环加载器（大小、延迟、遮罩浓度） | `loadingConfig.ts` → `pageLoader` |
| 调图片「先模糊后清晰」的强度与时长 | `loadingConfig.ts` → `imageReveal` |
| 改灯箱按钮 / 手势 | `fancyboxConfig.ts` |
| 改站点标题、主题色、分页条数 | `siteConfig.ts` |

## 🚀 使用方式

### 推荐：使用配置索引（统一导入）
```typescript
import { siteConfig, profileConfig, pagesConfig } from "@/config";
```

### 直接导入单个配置（效果相同）
```typescript
import { projectsConfig } from "@/config/projectsConfig";
import { bangumiPageConfig } from "@/config/bangumiConfig";
```

> 别名 `@/` 指向 `src/`，定义在 `tsconfig.json`。仓库里两种写法都能用，
> 新增代码统一用 `@/config/...` 或 `@/config`（索引）。

## 📋 配置文件列表

- `siteConfig.ts` - 站点基础配置（标题、描述、主题色等）
- `pagesConfig.ts` - **页面级配置**（首页、文章列表/详情、RSS、搜索、404、隐私政策、/ftp、gh 代理）
- `projectsConfig.ts` - 项目页配置（项目列表、状态标签）
- `bangumiConfig.ts` - 番组计划配置（API、分类开关、抓取设置、状态颜色）
- `sidebarNav.ts` - 左侧侧栏导航项
- `backgroundWallpaper.ts` - 背景壁纸配置（壁纸模式、图片、横幅文字等）
- `backgroundAtmosphere.ts` - 背景氛围（顶部 mesh 柔光、卡片悬浮抬升）
- `loadingConfig.ts` - 加载体验（页面圆环指示器、图片渐进显现）
- `fancyboxConfig.ts` - 图片灯箱参数（选择器、工具栏、键盘）
- `profileConfig.ts` - 用户资料配置（头像、姓名、社交链接等）
- `musicConfig.ts` - 音乐播放器配置（支持本地音乐和 Meting API）
- `sakuraConfig.ts` - 樱花特效配置（数量、速度、尺寸等）
- `commentConfig.ts` - 评论系统配置（Giscus 等）
- `announcementConfig.ts` - 公告配置（标题、内容、链接等）
- `licenseConfig.ts` - 许可证配置（CC 协议等）
- `footerConfig.ts` - 页脚配置（HTML 注入等）
- `expressiveCodeConfig.ts` - 代码高亮配置（主题等）
- `fontConfig.ts` - 字体配置（字体族、大小等）
- `sidebarConfig.ts` - 侧边栏配置（组件布局等）
- `navBarConfig.ts` - 导航栏配置（链接、样式等）
- `pioConfig.ts` - 看板娘配置（Spine、Live2D 等）
- `adConfig.ts` - 广告配置（广告位设置等）
- `friendsConfig.ts` - 友链配置（友链列表等）
- `galleryConfig.ts` - 相册配置
- `sponsorConfig.ts` - 赞助配置（赞助方式、二维码等）
- `coverImageConfig.ts` - 封面图配置（随机封面图列表等）

## ✍️ 写配置的约定

1. **每个可调字段都要有中文 + 英文注释**，说明「改它会怎样」。
2. 新配置的类型**就写在同一个文件里**（例如 `pagesConfig.ts` 的 `HomePageConfig`），
   这样改配置时不用在两个文件之间来回跳。
   历史遗留的公共类型仍在 `src/types/config.ts`。
3. 配置里**不要** import `@/i18n/translation`：i18n 反过来依赖 `@/config`，会形成循环依赖。
   需要多语言时，把 `i18n` 作为参数传进配置（参考 `bangumiConfig.ts` 的 `buildCategoryMap`）。
4. 图标名必须来自 `astro.config.mjs` 里注册过的图标集。
5. 不要覆盖站点既有 CSS 变量（`--primary`、`--card-bg` 等），本站设计令牌统一用 `--su-*` 前缀。
