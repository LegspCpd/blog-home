/**
 * Service Worker 注册脚本
 * 支持：自动更新检测、更新提示、离线就绪通知
 */

interface SWRegistrationOptions {
  scope?: string;
  updateInterval?: number;        // 检查更新间隔（毫秒）
  onUpdateReady?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onError?: (error: Error) => void;
}

interface SWState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * 注册 Service Worker
 */
export async function registerSW(options: SWRegistrationOptions = {}): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("[SW] Service Worker not supported");
    return null;
  }
  
  const {
    scope = "/",
    updateInterval = 60 * 60 * 1000, // 1小时
    onUpdateReady,
    onOfflineReady,
    onError,
  } = options;
  
  const state: SWState = {
    isSupported: true,
    isRegistered: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
    registration: null,
  };
  
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope });
    
    state.isRegistered = true;
    state.registration = registration;
    
    console.log("[SW] Registered:", registration.scope);
    
    // 监听更新
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // 有新版本可用
          state.updateAvailable = true;
          console.log("[SW] New version available");
          
          if (onUpdateReady) {
            onUpdateReady(registration);
          }
          
          // 发送自定义事件
          window.dispatchEvent(new CustomEvent("sw-update-available", { 
            detail: { registration } 
          }));
        }
      });
    });
    
    // 监听控制器变更
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      console.log("[SW] Controller changed, reloading...");
      window.location.reload();
    });
    
    // 监听在线/离线状态
    window.addEventListener("online", () => {
      console.log("[SW] Online");
      // 触发后台同步
      if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(reg => {
          reg.sync?.register("contact-form").catch(console.error);
          reg.sync?.register("newsletter-subscribe").catch(console.error);
        });
      }
    });
    
    window.addEventListener("offline", () => {
      console.log("[SW] Offline");
    });
    
    // 定期检查更新
    const updateInterval = setInterval(() => {
      registration.update().catch(console.error);
    }, updateInterval);
    
    // 页面卸载时清理
    window.addEventListener("beforeunload", () => {
      clearInterval(updateInterval);
    });
    
    // 检查是否已有可用更新
    if (registration.waiting) {
      state.updateAvailable = true;
      if (onUpdateReady) onUpdateReady(registration);
    }
    
    // 检查是否已就绪离线
    if (registration.active && !state.isOnline) {
      if (onOfflineReady) onOfflineReady();
    }
    
    return registration;
  } catch (err) {
    console.error("[SW] Registration failed:", err);
    onError?.(err as Error);
    return null;
  }
}

/**
 * 检查并应用更新
 */
export function applyUpdate(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

/**
 * 跳过等待并立即刷新
 */
export function skipWaitingAndReload(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    // 等待 controllerchange 事件触发刷新
  }
}

/**
 * 检查更新
 */
export async function checkForUpdate(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    await registration.update();
    return !!registration.waiting;
  } catch {
    return false;
  }
}

/**
 * 获取 SW 版本
 */
export async function getSWVersion(registration: ServiceWorkerRegistration): Promise<string> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      resolve(event.data.version || "unknown");
    };
    
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(
        { type: "getVersion" },
        [channel.port2]
      );
    } else {
      resolve("unknown");
    }
  });
}

/**
 * 清除所有缓存
 */
export async function clearSWCache(): Promise<boolean> {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    
    // 取消注册所有 SW
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    
    return true;
  } catch {
    return false;
  }
}

/**
 * 离线就绪检测
 */
export function isOfflineReady(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!("serviceWorker" in navigator)) {
      resolve(false);
      return;
    }
    
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({ type: "checkOfflineReady" });
      
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data.isReady === true);
      };
      
      registration.active?.postMessage(
        { type: "checkOfflineReady" },
        [channel.port2]
      );
    }).catch(() => resolve(false));
  });
}

/**
 * 请求持久化存储
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if ("storage" in navigator && "persist" in navigator.storage) {
    try {
      const granted = await navigator.storage.persist();
      console.log("[SW] Persistent storage:", granted ? "granted" : "denied");
      return granted;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 获取存储估算
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    try {
      return await navigator.storage.estimate();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 请求后台同步
 */
export async function requestBackgroundSync(tag: string): Promise<boolean> {
  if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 请求周期性后台同步
 */
export async function requestPeriodicSync(tag: string, minInterval: number): Promise<boolean> {
  if ("serviceWorker" in navigator && "periodicSync" in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).periodicSync.register(tag, { minInterval });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 获取 SW 状态
 */
export function getSWState(): SWState {
  return {
    isSupported: "serviceWorker" in navigator,
    isRegistered: false, // 需要注册后更新
    isOnline: navigator.onLine,
    updateAvailable: false,
    registration: null,
  };
}

// 导出类型
export type { SWRegistrationOptions, SWState };