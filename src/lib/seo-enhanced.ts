/**
 * SEO 增强组件 - JSON-LD 结构化数据、站点地图、Open Graph、Twitter Card
 * 自动生成：Article、BlogPosting、WebSite、Organization、BreadcrumbList、FAQPage 等
 */

interface SEOProps {
  // 基础信息
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageAlt?: string;
  
  // 文章专用
  article?: {
    headline: string;
    datePublished: string;
    dateModified?: string;
    authorName: string;
    authorUrl?: string;
    authorImage?: string;
    publisherName?: string;
    publisherLogo?: string;
    section?: string;
    tags?: string[];
    wordCount?: number;
    readTime?: number;
  };
  
  // 网站信息
  siteName?: string;
  siteUrl?: string;
  twitterHandle?: string;
  
  // 结构化数据类型
  schemaType?: "Article" | "BlogPosting" | "WebPage" | "WebSite" | "BreadcrumbList" | "FAQPage" | "HowTo" | "Product" | "Event";
  
  // 面包屑
  breadcrumbs?: Array<{ name: string; url: string }>;
  
  // FAQ
  faqs?: Array<{ question: string; answer: string }>;
  
  // HowTo
  howToSteps?: Array<{ name: string; text: string; image?: string; url?: string }>;
}

interface JSONLDContext {
  "@context": string;
  "@type": string;
  [key: string]: any;
}

// 生成基础 JSON-LD
function generateBaseSchema(props: SEOProps): JSONLDContext[] {
  const schemas: JSONLDContext[] = [];
  const siteUrl = props.siteUrl || "https://legspcpd.asia";
  const siteName = props.siteName || "LegspCpd Blog";
  const twitterHandle = props.twitterHandle || "@legspcpd";
  
  // 1. WebSite Schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
  
  // 2. Organization Schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/icons/icon-512.png`,
    sameAs: [
      `https://github.com/legspcpd`,
      `https://twitter.com/${twitterHandle.replace("@", "")}`,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+86-000-000-0000",
      contactType: "customer service",
      availableLanguage: ["Chinese", "English"],
    },
  });
  
  // 3. WebPage / Article Schema
  const pageSchema: JSONLDContext = {
    "@context": "https://schema.org",
    "@type": props.schemaType || "WebPage",
    name: props.title,
    description: props.description,
    url: props.canonicalUrl,
    image: props.ogImage ? {
      "@type": "ImageObject",
      url: props.ogImage,
      width: props.ogImageWidth || 1200,
      height: props.ogImageHeight || 630,
      caption: props.ogImageAlt,
    } : undefined,
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icons/icon-512.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": props.canonicalUrl,
    },
  };
  
  // 文章专用字段
  if (props.article && (props.schemaType === "Article" || props.schemaType === "BlogPosting")) {
    pageSchema.headline = props.article.headline;
    pageSchema.datePublished = props.article.datePublished;
    if (props.article.dateModified) pageSchema.dateModified = props.article.dateModified;
    pageSchema.author = {
      "@type": "Person",
      name: props.article.authorName,
      url: props.article.authorUrl,
      image: props.article.authorImage,
    };
    if (props.article.section) pageSchema.articleSection = props.article.section;
    if (props.article.tags) pageSchema.keywords = props.article.tags.join(", ");
    if (props.article.wordCount) pageSchema.wordCount = props.article.wordCount;
    if (props.article.readTime) pageSchema.timeRequired = `PT${props.article.readTime}M`;
    
    pageSchema["@type"] = props.schemaType;
  }
  
  schemas.push(pageSchema);
  
  // 4. BreadcrumbList
  if (props.breadcrumbs && props.breadcrumbs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: props.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    });
  }
  
  // 5. FAQPage
  if (props.faqs && props.faqs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: props.faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
  }
  
  // 6. HowTo
  if (props.howToSteps && props.howToSteps.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: props.title,
      description: props.description,
      step: props.howToSteps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
        image: step.image,
        url: step.url,
      })),
    });
  }
  
  return schemas;
}

// 生成 Open Graph 标签
function generateOpenGraph(props: SEOProps): Record<string, string> {
  const tags: Record<string, string> = {};
  const siteUrl = props.siteUrl || "https://legspcpd.asia";
  const siteName = props.siteName || "LegspCpd Blog";
  
  tags["og:type"] = props.schemaType === "Article" || props.schemaType === "BlogPosting" ? "article" : "website";
  tags["og:title"] = props.title;
  tags["og:description"] = props.description;
  tags["og:url"] = props.canonicalUrl;
  tags["og:site_name"] = siteName;
  tags["og:locale"] = "zh_CN";
  
  if (props.ogImage) {
    tags["og:image"] = props.ogImage;
    if (props.ogImageWidth) tags["og:image:width"] = props.ogImageWidth.toString();
    if (props.ogImageHeight) tags["og:image:height"] = props.ogImageHeight.toString();
    if (props.ogImageAlt) tags["og:image:alt"] = props.ogImageAlt;
  }
  
  if (props.article) {
    tags["article:published_time"] = props.article.datePublished;
    if (props.article.dateModified) tags["article:modified_time"] = props.article.dateModified;
    tags["article:author"] = props.article.authorName;
    if (props.article.section) tags["article:section"] = props.article.section;
    if (props.article.tags) {
      for (const tag of props.article.tags) {
        tags[`article:tag:${tag}`] = tag;
      }
    }
    if (props.article.readTime) tags["article:read_time"] = props.article.readTime.toString();
  }
  
  return tags;
}

// 生成 Twitter Card 标签
function generateTwitterCard(props: SEOProps): Record<string, string> {
  const tags: Record<string, string> = {};
  const twitterHandle = props.twitterHandle || "@legspcpd";
  
  tags["twitter:card"] = props.ogImage ? "summary_large_image" : "summary";
  tags["twitter:site"] = twitterHandle;
  tags["twitter:creator"] = twitterHandle;
  tags["twitter:title"] = props.title;
  tags["twitter:description"] = props.description;
  
  if (props.ogImage) {
    tags["twitter:image"] = props.ogImage;
    if (props.ogImageAlt) tags["twitter:image:alt"] = props.ogImageAlt;
  }
  
  return tags;
}

// 生成其他 Meta 标签
function generateMetaTags(props: SEOProps): Record<string, string> {
  const tags: Record<string, string> = {};
  
  tags["description"] = props.description;
  tags["theme-color"] = "#2fbf71";
  tags["color-scheme"] = "light dark";
  
  // 验证标签（可选）
  // tags["google-site-verification"] = "xxx";
  
  return tags;
}

// 导出函数
export function generateAllSEO(props: SEOProps) {
  const jsonLd = generateBaseSchema(props);
  const openGraph = generateOpenGraph(props);
  const twitterCard = generateTwitterCard(props);
  const metaTags = generateMetaTags(props);
  
  return {
    jsonLd,
    openGraph,
    twitterCard,
    metaTags,
  };
}

// 生成站点地图
export function generateSitemap(
  urls: Array<{
    url: string;
    lastmod?: string;
    changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority?: number;
  }>
): string {
  const urlsXml = urls.map(u => `
    <url>
      <loc>${u.url}</loc>
      ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
      ${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ""}
      ${u.priority !== undefined ? `<priority>${u.priority.toFixed(1)}</priority>` : ""}
    </url>
  `).join("\n");
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlsXml}
</urlset>`;
}

// 生成 robots.txt
export function generateRobotsTxt(options: {
  allow?: string[];
  disallow?: string[];
  sitemap?: string;
  host?: string;
} = {}): string {
  const lines: string[] = [
    "User-agent: *",
    ...(options.disallow?.map(d => `Disallow: ${d}`) || []),
    ...(options.allow?.map(a => `Allow: ${a}`) || []),
    "",
  ];
  
  if (options.sitemap) {
    lines.push(`Sitemap: ${options.sitemap}`);
  }
  
  if (options.host) {
    lines.push(`Host: ${options.host}`);
  }
  
  return lines.join("\n");
}

// 生成 RSS 订阅
export function generateRSSFeed(
  items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
    guid: string;
    author?: string;
    categories?: string[];
    enclosure?: { url: string; type: string; length: number };
  }>,
  channel: {
    title: string;
    link: string;
    description: string;
    language?: string;
    copyright?: string;
    managingEditor?: string;
    webMaster?: string;
    image?: { url: string; title: string; link: string };
  }
): string {
  const itemsXml = items.map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="true">${item.guid}</guid>
      ${item.author ? `<author>${item.author}</author>` : ""}
      ${item.categories?.map(c => `<category>${c}</category>`).join("") || ""}
      ${item.enclosure ? `<enclosure url="${item.enclosure.url}" type="${item.enclosure.type}" length="${item.enclosure.length}" />` : ""}
    </item>
  `).join("\n");
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${channel.title}]]></title>
    <link>${channel.link}</link>
    <description><![CDATA[${channel.description}]]></description>
    <language>${channel.language || "zh-CN"}</language>
    ${channel.copyright ? `<copyright>${channel.copyright}</copyright>` : ""}
    ${channel.managingEditor ? `<managingEditor>${channel.managingEditor}</managingEditor>` : ""}
    ${channel.webMaster ? `<webMaster>${channel.webMaster}</webMaster>` : ""}
    ${channel.image ? `
      <image>
        <url>${channel.image.url}</url>
        <title><![CDATA[${channel.image.title}]]></title>
        <link>${channel.image.link}</link>
      </image>` : ""}
    <atom:link href="${channel.link}/rss.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`;
}

// 生成规范链接
export function generateCanonicalLinks(
  currentUrl: string,
  alternates: Array<{ lang: string; url: string }> = []
): string {
  const links = [`<link rel="canonical" href="${currentUrl}" />`];
  
  for (const alt of alternates) {
    links.push(`<link rel="alternate" hreflang="${alt.lang}" href="${alt.url}" />`);
  }
  
  // x-default
  if (alternates.length > 0) {
    links.push(`<link rel="alternate" hreflang="x-default" href="${alternates[0].url}" />`);
  }
  
  return links.join("\n");
}

// 预连接/预加载提示
export function generateResourceHints(resources: Array<{
  rel: "preconnect" | "dns-prefetch" | "preload" | "prefetch" | "modulepreload";
  href: string;
  as?: string;
  type?: string;
  crossorigin?: "anonymous" | "use-credentials";
}>): string {
  return resources.map(r => {
    const attrs = [`rel="${r.rel}"`, `href="${r.href}"`];
    if (r.as) attrs.push(`as="${r.as}"`);
    if (r.type) attrs.push(`type="${r.type}"`);
    if (r.crossorigin) attrs.push(`crossorigin="${r.crossorigin}"`);
    return `<link ${attrs.join(" ")} />`;
  }).join("\n");
}

// 默认导出
export default {
  generateAllSEO,
  generateSitemap,
  generateRobotsTxt,
  generateRSSFeed,
  generateCanonicalLinks,
  generateResourceHints,
};