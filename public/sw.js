/**
 * Service Worker - 离线缓存、Stale-While-Revalidate、后台同步
 * 支持：静态资源缓存、动态内容缓存、后台同步、推送通知
 */

// Service Worker 版本
const SW_VERSION = "v1.2.0";
const CACHE_NAME = `blog-${SW_VERSION}`;

// 缓存策略常量
const CACHE_STRATEGIES = {
  // 静态资源：Cache First
  STATIC: "cache-first",
  // HTML 页面：Network First + Cache Fallback
  HTML: "network-first",
  // API 请求：Network First + Cache Fallback
  API: "network-first",
  // 图片：Cache First + 过期更新
  IMAGES: "cache-first",
  // 字体：Cache First
  FONTS: "cache-first",
  // CSS/JS：Stale While Revalidate
  ASSETS: "stale-while-revalidate",
};

// 缓存过期时间（毫秒）
const CACHE_EXPIRY = {
  STATIC: 365 * 24 * 60 * 60 * 1000,    // 1年
  HTML: 24 * 60 * 60 * 1000,            // 1天
  API: 5 * 60 * 1000,                   // 5分钟
  IMAGES: 30 * 24 * 60 * 60 * 1000,     // 30天
  FONTS: 365 * 24 * 60 * 60 * 1000,     // 1年
  ASSETS: 7 * 24 * 60 * 60 * 1000,      // 7天
};

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/posts/",
  "/archive/",
  "/tags/",
  "/categories/",
  "/about/",
  "/contact/",
  "/stats/",
  "/search/",
  "/offline.html",
];

// 需要预缓存的静态资源模式
const PRECACHE_PATTERNS = [
  /\/_astro\/.*\.js$/,
  /\/_astro\/.*\.css$/,
  /\/fonts\/.*\.(woff2?|ttf)$/,
  /\/favicon.*/,
  /\/manifest\.json$/,
];

// 安装事件 - 预缓存核心资源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("[SW] Pre-caching core assets");
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error("[SW] Precache failed:", err))
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 获取缓存策略
function getCacheStrategy(request: Request): string {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 静态资源
  if (path.match(/\.(js|css|woff2?|ttf|eot|otf)$/)) return CACHE_STRATEGIES.ASSETS;
  if (path.match(/\.(png|jpg|jpeg|webp|avif|gif|svg|ico)$/)) return CACHE_STRATEGIES.IMAGES;
  
  // HTML 页面
  if (path === "/" || path.endsWith(".html") || path.endsWith("/")) return CACHE_STRATEGIES.HTML;
  
  // API 请求
  if (path.startsWith("/api/")) return CACHE_STRATEGIES.API;
  
  // 字体文件
  if (path.match(/\.(woff2?|ttf)$/)) return CACHE_STRATEGIES.FONTS;
  
  // 默认
  return CACHE_STRATEGIES.ASSETS;
}

// 判断是否可缓存
function isCacheable(request: Request): boolean {
  const url = new URL(request.url);
  
  // 只缓存 GET 请求
  if (request.method !== "GET") return false;
  
  // 不缓存跨域请求（除非是已知 CDN）
  if (url.origin !== location.origin) {
    const allowedOrigins = [
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
      "https://cdn.jsdelivr.net",
      "https://cdn.tailwindcss.com",
    ];
    if (!allowedOrigins.some(o => url.origin === o)) return false;
  }
  
  // 不缓存带查询参数的 API 请求
  if (url.pathname.startsWith("/api/") && url.search) return false;
  
  // 不缓存认证相关
  if (url.pathname.includes("/auth/") || url.pathname.includes("/login")) return false;
  
  return true;
}

// 从缓存获取响应
async function getFromCache(request: Request): Promise<Response | undefined> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (!cached) return undefined;
  
  // 检查是否过期
  const cachedTime = cached.headers.get("sw-cached-time");
  if (cachedTime) {
    const age = Date.now() - parseInt(cachedTime);
    const strategy = getCacheStrategy(new Request(cached.url));
    const maxAge = CACHE_EXPIRY[strategy as keyof typeof CACHE_EXPIRY] || CACHE_EXPIRY.ASSETS;
    
    if (age > maxAge) {
      // 过期，删除
      await cache.delete(request);
      return undefined;
    }
  }
  
  return cached;
}

// 存入缓存
async function putInCache(request: Request, response: Response): Promise<void> {
  if (!isCacheable(request)) return;
  
  const cache = await caches.open(CACHE_NAME);
  const responseToCache = response.clone();
  
  // 添加缓存时间戳
  const headers = new Headers(responseToCache.headers);
  headers.set("sw-cached-time", Date.now().toString());
  
  const cachedResponse = new Response(responseToCache.body, {
    status: responseToCache.status,
    statusText: responseToCache.statusText,
    headers,
  });
  
  await cache.put(request, cachedResponse);
}

// 网络请求
async function fetchFromNetwork(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    
    // 只缓存成功的响应
    if (response.ok && isCacheable(request)) {
      // 异步存入缓存，不阻塞响应
      putInCache(request, response.clone()).catch(console.error);
    }
    
    return response;
  } catch (error) {
    console.error("[SW] Network fetch failed:", error);
    throw error;
  }
}

// Cache First 策略
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await getFromCache(request);
  if (cached) return cached;
  
  try {
    const response = await fetchFromNetwork(request);
    return response;
  } catch {
    // 离线页面兜底
    if (request.mode === "navigate") {
      return caches.match("/offline.html");
    }
    throw new Error("Offline and no cache");
  }
}

// Network First 策略
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetchFromNetwork(request);
    return response;
  } catch {
    const cached = await getFromCache(request);
    if (cached) return cached;
    
    // 离线页面兜底
    if (request.mode === "navigate") {
      return caches.match("/offline.html");
    }
    throw new Error("Offline and no cache");
  }
}

// Stale While Revalidate 策略
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cached = await getFromCache(request);
  
  // 后台更新缓存
  const networkPromise = fetchFromNetwork(request).catch(() => null);
  
  if (cached) return cached;
  
  // 没有缓存，等待网络
  try {
    return await networkPromise;
  } catch {
    if (request.mode === "navigate") {
      return caches.match("/offline.html");
    }
    throw new Error("Offline and no cache");
  }
}

// 缓存优先，网络更新
async function cacheFirstNetworkUpdate(request: Request): Promise<Response> {
  const cached = await getFromCache(request);
  
  // 后台更新
  fetchFromNetwork(request).catch(() => {});
  
  if (cached) return cached;
  
  // 没有缓存，等待网络
  try {
    return await fetchFromNetwork(request);
  } catch {
    if (request.mode === "navigate") {
      return caches.match("/offline.html");
    }
    throw new Error("Offline and no cache");
  }
}

// 主请求处理
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const strategy = getCacheStrategy(request);
  
  let responsePromise: Promise<Response>;
  
  switch (strategy) {
    case CACHE_STRATEGIES.STATIC:
    case CACHE_STRATEGIES.FONTS:
      responsePromise = cacheFirst(request);
      break;
    case CACHE_STRATEGIES.HTML:
    case CACHE_STRATEGIES.API:
      responsePromise = networkFirst(request);
      break;
    case CACHE_STRATEGIES.IMAGES:
      responsePromise = cacheFirst(request);
      break;
    case CACHE_STRATEGIES.ASSETS:
    default:
      responsePromise = staleWhileRevalidate(request);
      break;
  }
  
  event.respondWith(
    responsePromise.catch(err => {
      console.error("[SW] Fetch failed:", err);
      // 最后兜底
      if (request.mode === "navigate") {
        return caches.match("/offline.html");
      }
      return new Response("Offline", { status: 503 });
    })
  );
});

// 后台同步 - 用于表单提交等
self.addEventListener("sync", (event) => {
  if (event.tag === "contact-form") {
    event.waitUntil(syncContactForm());
  } else if (event.tag === "newsletter-subscribe") {
    event.waitUntil(syncNewsletter());
  }
});

// 后台同步联系表单
async function syncContactForm(): Promise<void> {
  const db = await openDB();
  const pending = await db.getAll("pending-forms");
  
  for (const form of pending) {
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form.data),
      });
      await db.delete("pending-forms", form.id);
    } catch (err) {
      console.error("[SW] Sync contact form failed:", err);
    }
  }
}

// 后台同步订阅
async function syncNewsletter(): Promise<void> {
  const db = await openDB();
  const pending = await db.getAll("pending-newsletter");
  
  for (const sub of pending) {
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.data),
      });
      await db.delete("pending-newsletter", sub.id);
    } catch (err) {
      console.error("[SW] Sync newsletter failed:", err);
    }
  }
}

// IndexedDB 封装
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("blog-offline", 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("pending-forms")) {
        db.createObjectStore("pending-forms", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("pending-newsletter")) {
        db.createObjectStore("pending-newsletter", { keyPath: "id", autoIncrement: true });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 推送通知
self.addEventListener("push", (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options: NotificationOptions = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      { action: "open", title: "打开" },
      { action: "close", title: "关闭" },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知点击
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  if (event.action === "open") {
    event.waitUntil(
      clients.matchAll({ type: "window" })
        .then(clientList => {
          for (const client of clientList) {
            if (client.url === event.notification.data.url && "focus" in client) {
              return client.focus();
            }
          }
          return clients.openWindow(event.notification.data.url || "/");
        })
    );
  }
});

// 定期清理过期缓存
setInterval(async () => {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  for (const request of keys) {
    const cached = await cache.match(request);
    if (!cached) continue;
    
    const cachedTime = cached.headers.get("sw-cached-time");
    if (!cachedTime) continue;
    
    const age = Date.now() - parseInt(cachedTime);
    const strategy = getCacheStrategy(new Request(cached.url));
    const maxAge = CACHE_EXPIRY[strategy as keyof typeof CACHE_EXPIRY] || CACHE_EXPIRY.ASSETS;
    
    if (age > maxAge) {
      await cache.delete(request);
    }
  }
}, 24 * 60 * 60 * 1000); // 每天清理一次

// 监听消息
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  } else if (event.data === "getVersion") {
    event.ports[0].postMessage({ version: SW_VERSION });
  } else if (event.data === "clearCache") {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  } else if (event.data?.type === "skipWaiting") {
    self.skipWaiting();
  }
});

console.log("[SW] Service Worker loaded:", SW_VERSION);