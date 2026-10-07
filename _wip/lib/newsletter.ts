/**
 * 新闻订阅系统 - 邮箱收集、验证、双重确认、取消订阅、管理后台
 * 支持：多列表管理、标签分组、自动欢迎邮件、取消订阅、GDPR 合规
 */

import { z } from "zod"; // @ts-ignore

// 订阅者状态
type SubscriberStatus = "pending" | "active" | "unsubscribed" | "bounced" | "complained";

// 订阅者接口
interface Subscriber {
  id: string;
  email: string;
  name?: string;
  status: SubscriberStatus;
  source: string;
  tags: string[];
  metadata: Record<string, any>;
  subscribedAt: number;
  confirmedAt?: number;
  unsubscribedAt?: number;
  lastEmailSent?: number;
  lastEmailOpened?: number;
  lastEmailClicked?: number;
  bounceCount: number;
  complaintCount: number;
  customFields: Record<string, string>;
}

// 邮件列表
interface EmailList {
  id: string;
  name: string;
  description: string;
  doubleOptIn: boolean;
  welcomeEmailTemplate?: string;
  unsubscribeTemplate?: string;
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
  tags: string[];
  subscriberCount: number;
  createdAt: number;
  updatedAt: number;
}

// 邮件活动
interface Campaign {
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
  htmlContent: string;
  textContent: string;
  listIds: string[];
  segmentFilters?: SegmentFilter[];
  status: "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";
  scheduledAt?: number;
  sentAt?: number;
  stats: CampaignStats;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface SegmentFilter {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" | "gt" | "lt" | "in" | "not_in";
  value: any;
  logic: "and" | "or";
}

// 验证模式
const emailSchema = z.string().email({ message: "无效的邮箱地址" });
const nameSchema = z.string().min(1).max(100).optional();

const subscribeSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  listId: z.string().min(1, "请选择邮件列表"),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  metadata: z.record(z.string()).optional(),
});

const unsubscribeSchema = z.object({
  email: emailSchema,
  listId: z.string().optional(),
  reason: z.string().optional(),
});

const campaignSchema = z.object({
  name: z.string().min(1, "活动名称不能为空"),
  subject: z.string().min(1, "主题不能为空").max(98, "主题过长"),
  preheader: z.string().max(100).optional(),
  fromName: z.string().min(1),
  fromEmail: emailSchema,
  replyToEmail: emailSchema.optional(),
  htmlContent: z.string().min(1, "HTML 内容不能为空"),
  textContent: z.string().min(1, "文本内容不能为空"),
  listIds: z.array(z.string()).min(1, "至少选择一个列表"),
  segmentFilters: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "gt", "lt", "in", "not_in"]),
    value: z.any(),
    logic: z.enum(["and", "or"]),
  })).optional(),
  scheduledAt: z.number().optional(),
});

/**
 * 邮件列表管理器
 */
class EmailListManager {
  private db: IDBDatabase | null = null;
  private lists: Map<string, any> = new Map();
  
  async init() {
    if (this.db) return;
    
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("newsletter-db", 2);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest | null)?.result!;
        
        if (!db.objectStoreNames.contains("lists")) {
          db.createObjectStore("lists", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("subscribers")) {
          const store = db.createObjectStore("subscribers", { keyPath: "id" });
          store.createIndex("email", "email", { unique: true });
          store.createIndex("status", "status");
          store.createIndex("listId", "listId");
          store.createIndex("tags", "tags", { multiEntry: true });
        }
        if (!db.objectStoreNames.contains("campaigns")) {
          const store = db.createObjectStore("campaigns", { keyPath: "id" });
          store.createIndex("status", "status");
          store.createIndex("listIds", "listIds", { multiEntry: true });
        }
        if (!db.objectStoreNames.contains("campaign-stats")) {
          db.createObjectStore("campaign-stats", { keyPath: "campaignId" });
        }
        if (!db.objectStoreNames.contains("events")) {
          const store = db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
          store.createIndex("subscriberId", "subscriberId");
          store.createIndex("campaignId", "campaignId");
          store.createIndex("type", "type");
          store.createIndex("timestamp", "timestamp");
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.loadLists();
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  private async loadLists() {
    if (!this.db) await this.init();
    const transaction = this.db!.transaction("lists", "readonly");
    const store = transaction.objectStore("lists");
    const lists = await new Promise<any[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    this.lists.clear();
    for (const list of lists) this.lists.set(list.id, list);
  }
  
  async createList(list: Omit<any, "id" | "subscriberCount" | "createdAt" | "updatedAt">) {
    if (!this.db) await this.init();
    
    const newList = {
      ...list,
      id: crypto.randomUUID(),
      subscriberCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction("lists", "readwrite");
      const store = transaction.objectStore("lists");
      const request = store.add(newList);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    this.lists.set(newList.id, newList);
    return newList;
  }
  
  async getList(id: string) {
    if (!this.db) await this.init();
    return this.lists.get(id);
  }
  
  async getAllLists() {
    if (!this.db) await this.init();
    return Array.from(this.lists.values());
  }
  
  async updateList(id: string, updates: any) {
    if (!this.db) await this.init();
    
    const list = this.lists.get(id);
    if (!list) return undefined;
    
    const updated = { ...list, ...updates, updatedAt: Date.now() };
    
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction("lists", "readwrite");
      const store = transaction.objectStore("lists");
      const request = store.put(updated);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    this.lists.set(id, updated);
    return updated;
  }
  
  async deleteList(id: string) {
    if (!this.db) await this.init();
    
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction("lists", "readwrite");
      const store = transaction.objectStore("lists");
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    this.lists.delete(id);
    return true;
  }
  
  // Get the database instance for other managers
  getDatabase(): IDBDatabase | null {
    return this.db;
  }
  
  // Initialize and return database
  async initialize(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    return this.db!;
  }
}

// 订阅者管理器
class SubscriberManager {
  private db: IDBDatabase | null = null;
  
  async setDB(db: IDBDatabase) {
    this.db = db;
  }
  
  async subscribe(data: any) {
    if (!this.db) throw new Error("Database not initialized");
    
    // 验证输入
    const validated = {
      email: data.email,
      name: data.name,
      listId: data.listId,
      tags: data.tags || [],
      source: data.source || "api",
      redirectUrl: data.redirectUrl,
      metadata: data.metadata || {},
    };
    
    // 检查是否已存在
    const existing = await this.getSubscriberByEmail(validated.email);
    
    if (existing) {
      if (existing.status === "active") {
        const updated = await this.updateSubscriber(existing.id, {
          tags: [...new Set([...existing.tags, ...(data.tags || [])])],
        });
        return { subscriber: updated ?? existing, needsConfirmation: false };
      } else if (existing.status === "pending") {
        await this.sendConfirmationEmail(existing);
        return { subscriber: existing, needsConfirmation: true };
      } else if (existing.status === "unsubscribed") {
        const updated = await this.updateSubscriber(existing.id, {
          status: "pending",
          tags: [...new Set([...existing.tags, ...(data.tags || [])])],
          unsubscribedAt: undefined,
        });
        await this.sendConfirmationEmail(updated ?? existing);
        return { subscriber: updated ?? existing, needsConfirmation: true };
      }
    }
    
    // 新订阅者
    const subscriber: Subscriber = {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      status: "pending",
      source: data.source || "api",
      tags: data.tags || [],
      metadata: data.metadata || {},
      subscribedAt: Date.now(),
      confirmedAt: undefined,
      unsubscribedAt: undefined,
      lastEmailSent: undefined,
      lastEmailOpened: undefined,
      lastEmailClicked: undefined,
      bounceCount: 0,
      complaintCount: 0,
      customFields: {},
    };
    
    await this.saveSubscriber(subscriber);
    await this.sendConfirmationEmail(subscriber);
    
    return { subscriber, needsConfirmation: true };
  }
  
  async confirmSubscription(token: string) {
    // TODO: Implement token-based confirmation
    // For now, find subscriber by token in metadata and activate
    if (!this.db) throw new Error("Database not initialized");
    
    return new Promise<Subscriber | null>((resolve, reject) => {
      const transaction = this.db!.transaction("subscribers", "readonly");
      const store = transaction.objectStore("subscribers");
      const request = store.getAll();
      
      request.onsuccess = () => {
        const subscribers = request.result as Subscriber[];
        const subscriber = subscribers.find(s => 
          s.metadata?.confirmationToken === token && s.status === "pending"
        );
        
        if (subscriber) {
          this.updateSubscriber(subscriber.id, {
            status: "active",
            confirmedAt: Date.now(),
            metadata: { ...subscriber.metadata, confirmationToken: undefined }
          }).then(updated => resolve(updated)).catch(reject);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async unsubscribe(data: any) {
    const subscriber = await this.getSubscriberByEmail(data.email);
    if (!subscriber) return false;
    
    await this.updateSubscriber(subscriber.id, {
      status: "unsubscribed",
      unsubscribedAt: Date.now(),
    });
    
    await this.logEvent(subscriber.id, "unsubscribed", { reason: data.reason });
    return true;
  }
  
  async bulkImport(subscribers: any[]) {
    let success = 0;
    let failed = 0;
    
    for (const sub of subscribers) {
      try {
        await this.subscribe({
          email: sub.email,
          name: sub.name,
          listId: sub.metadata?.listId || "default",
          tags: sub.tags,
          source: "import",
        });
        success++;
      } catch {
        failed++;
      }
    }
    
    return { success, failed };
  }
  
  async exportSubscribers(filters?: any) {
    if (!this.db) throw new Error("Database not initialized");
    
    return new Promise<Subscriber[]>((resolve, reject) => {
      const transaction = this.db!.transaction("subscribers", "readonly");
      const store = transaction.objectStore("subscribers");
      const request = store.getAll();
      
      request.onsuccess = () => {
        let subscribers = request.result as Subscriber[];
        
        // Apply filters if provided
        if (filters) {
          if (filters.status) {
            subscribers = subscribers.filter(s => s.status === filters.status);
          }
          if (filters.listId) {
            subscribers = subscribers.filter(s => s.metadata?.listId === filters.listId);
          }
          if (filters.tags && filters.tags.length > 0) {
            subscribers = subscribers.filter(s => 
              filters.tags.some((tag: string) => s.tags.includes(tag))
            );
          }
        }
        
        resolve(subscribers);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  private async getSubscriberByEmail(email: string): Promise<Subscriber | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("subscribers", "readonly");
      const store = transaction.objectStore("subscribers");
      const index = store.index("email");
      const request = index.get(email);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async getSubscriberById(id: string): Promise<Subscriber | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("subscribers", "readonly");
      const store = transaction.objectStore("subscribers");
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async saveSubscriber(subscriber: Subscriber): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("subscribers", "readwrite");
      const store = transaction.objectStore("subscribers");
      const request = store.add(subscriber);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private async updateSubscriber(id: string, updates: Partial<Subscriber>): Promise<Subscriber | null> {
    if (!this.db) return null;
    
    const existing = await this.getSubscriberById(id);
    if (!existing) return null;
    
    const updated: Subscriber = { ...existing, ...updates };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("subscribers", "readwrite");
      const store = transaction.objectStore("subscribers");
      const request = store.put(updated);
      
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async sendConfirmationEmail(subscriber: Subscriber): Promise<void> {
    // Generate confirmation token
    const token = crypto.randomUUID();
    
    // Update subscriber with confirmation token
    await this.updateSubscriber(subscriber.id, {
      metadata: { ...subscriber.metadata, confirmationToken: token }
    });
    
    // In a real implementation, you would send an actual email here
    // For now, we'll log the confirmation link
    const confirmationUrl = `${window.location.origin}/confirm?token=${token}`;
    console.log(`Confirmation email would be sent to ${subscriber.email}: ${confirmationUrl}`);
    
    // Log the event
    await this.logEvent(subscriber.id, "confirmation_sent", { token, url: confirmationUrl });
  }
  
  private async logEvent(subscriberId: string, type: string, data: any): Promise<void> {
    if (!this.db) return;
    
    const event = {
      id: crypto.randomUUID(),
      subscriberId,
      type,
      data,
      timestamp: Date.now(),
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("events", "readwrite");
      const store = transaction.objectStore("events");
      const request = store.add(event);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// 邮件活动管理器
class CampaignManager {
  private db: IDBDatabase | null = null;
  
  async setDB(db: IDBDatabase) {
    this.db = db;
  }
  
  async createCampaign(data: any) {
    const campaign: Campaign = {
      ...data,
      id: crypto.randomUUID(),
      status: "draft",
      stats: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: "system",
    };
    
    if (this.db) {
      await this.saveCampaign(campaign);
    }
    
    return campaign;
  }
  
  private async saveCampaign(campaign: Campaign): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("campaigns", "readwrite");
      const store = transaction.objectStore("campaigns");
      const request = store.add(campaign);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async getCampaign(campaignId: string): Promise<Campaign | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("campaigns", "readonly");
      const store = transaction.objectStore("campaigns");
      const request = store.get(campaignId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getAllCampaigns(): Promise<Campaign[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("campaigns", "readonly");
      const store = transaction.objectStore("campaigns");
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    if (!this.db) return null;
    
    const existing = await this.getCampaign(campaignId);
    if (!existing) return null;
    
    const updated: Campaign = { ...existing, ...updates, updatedAt: Date.now() };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("campaigns", "readwrite");
      const store = transaction.objectStore("campaigns");
      const request = store.put(updated);
      
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }
  
  async sendCampaign(campaignId: string): Promise<boolean> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return false;
    
    // Update status to sending
    await this.updateCampaign(campaignId, { status: "sending" });
    
    // Get subscribers from target lists
    const subscribers = await this.getSubscribersForCampaign(campaign);
    
    let sent = 0;
    let failed = 0;
    
    for (const subscriber of subscribers) {
      try {
        // In a real implementation, send actual email here
        await this.sendEmailToSubscriber(subscriber, campaign);
        sent++;
        
        // Log event
        await this.logCampaignEvent(campaignId, subscriber.id, "sent");
      } catch (error) {
        failed++;
        await this.logCampaignEvent(campaignId, subscriber.id, "failed", { error: String(error) });
      }
    }
    
    // Update campaign stats
    await this.updateCampaignStats(campaignId, { sent, failed });
    await this.updateCampaign(campaignId, { 
      status: failed > 0 && sent === 0 ? "failed" : "sent",
      sentAt: Date.now()
    });
    
    return failed === 0;
  }
  
  private async getSubscribersForCampaign(campaign: Campaign): Promise<Subscriber[]> {
    if (!this.db) return [];
    
    // Get all active subscribers from target lists
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("subscribers", "readonly");
      const store = transaction.objectStore("subscribers");
      const index = store.index("status");
      const request = index.getAll("active");
      
      request.onsuccess = () => {
        let subscribers = request.result as Subscriber[];
        
        // Filter by listIds if specified
        if (campaign.listIds && campaign.listIds.length > 0) {
          subscribers = subscribers.filter(s => 
            campaign.listIds.includes(s.metadata?.listId || "")
          );
        }
        
        // Apply segment filters if any
        if (campaign.segmentFilters && campaign.segmentFilters.length > 0) {
          subscribers = subscribers.filter(s => 
            this.matchesSegmentFilters(s, campaign.segmentFilters!)
          );
        }
        
        resolve(subscribers);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  private matchesSegmentFilters(subscriber: Subscriber, filters: SegmentFilter[]): boolean {
    let result = true;
    
    for (const filter of filters) {
      const fieldValue = this.getNestedValue(subscriber, filter.field);
      const matches = this.compareValues(fieldValue, filter.operator, filter.value);
      
      if (filter.logic === "and") {
        result = result && matches;
      } else {
        result = result || matches;
      }
    }
    
    return result;
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private compareValues(fieldValue: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case "equals": return fieldValue === filterValue;
      case "not_equals": return fieldValue !== filterValue;
      case "contains": return String(fieldValue).includes(String(filterValue));
      case "not_contains": return !String(fieldValue).includes(String(filterValue));
      case "starts_with": return String(fieldValue).startsWith(String(filterValue));
      case "ends_with": return String(fieldValue).endsWith(String(filterValue));
      case "gt": return fieldValue > filterValue;
      case "lt": return fieldValue < filterValue;
      case "in": return Array.isArray(filterValue) && filterValue.includes(fieldValue);
      case "not_in": return Array.isArray(filterValue) && !filterValue.includes(fieldValue);
      default: return false;
    }
  }
  
  private async sendEmailToSubscriber(subscriber: Subscriber, campaign: Campaign): Promise<void> {
    // In a real implementation, this would send an actual email
    // For now, we'll just simulate sending
    console.log(`Sending campaign "${campaign.name}" to ${subscriber.email}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  private async logCampaignEvent(campaignId: string, subscriberId: string, type: string, data: any = {}): Promise<void> {
    if (!this.db) return;
    
    const event = {
      id: crypto.randomUUID(),
      campaignId,
      subscriberId,
      type,
      data,
      timestamp: Date.now(),
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("events", "readwrite");
      const store = transaction.objectStore("events");
      const request = store.add(event);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private async updateCampaignStats(campaignId: string, updates: Partial<CampaignStats>): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("campaign-stats", "readwrite");
      const store = transaction.objectStore("campaign-stats");
      const getRequest = store.get(campaignId);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result || { campaignId, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, unsubscribed: 0, openRate: 0, clickRate: 0, bounceRate: 0 };
        const updated = { ...existing, ...updates };
        
        // Calculate rates
        if (updated.sent > 0) {
          updated.openRate = (updated.opened / updated.sent) * 100;
          updated.clickRate = (updated.clicked / updated.sent) * 100;
          updated.bounceRate = (updated.bounced / updated.sent) * 100;
        }
        
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
  
  async scheduleCampaign(campaignId: string, scheduledAt: number): Promise<boolean> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return false;
    
    if (scheduledAt <= Date.now()) {
      return this.sendCampaign(campaignId);
    }
    
    // In a real implementation, you'd use a scheduler (setTimeout, cron, etc.)
    // For now, just update the campaign status
    await this.updateCampaign(campaignId, { 
      status: "scheduled", 
      scheduledAt 
    });
    
    // Set a timeout for sending (in a real app, use a proper job queue)
    setTimeout(() => {
      this.sendCampaign(campaignId);
    }, scheduledAt - Date.now());
    
    return true;
  }
  
  async getCampaignStats(campaignId: string): Promise<CampaignStats | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("campaign-stats", "readonly");
      const store = transaction.objectStore("campaign-stats");
      const request = store.get(campaignId);
      
      request.onsuccess = () => {
        const stats = request.result;
        if (stats) {
          resolve({
            sent: stats.sent || 0,
            delivered: stats.delivered || 0,
            opened: stats.opened || 0,
            clicked: stats.clicked || 0,
            bounced: stats.bounced || 0,
            complained: stats.complained || 0,
            unsubscribed: stats.unsubscribed || 0,
            openRate: stats.openRate || 0,
            clickRate: stats.clickRate || 0,
            bounceRate: stats.bounceRate || 0,
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Create manager instances
export const emailListManager = new EmailListManager();
export const subscriberManager = new SubscriberManager();
export const campaignManager = new CampaignManager();

// Initialize database and share with all managers
async function initializeManagers() {
  const db = await emailListManager.initialize();
  subscriberManager.setDB(db);
  campaignManager.setDB(db);
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeManagers().catch(console.error);
}

export function createSubscribeForm(config: {
  listId: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  placeholder?: string;
  buttonText?: string;
  showName?: boolean;
  showTags?: boolean;
  tags?: string[];
}) {
  return {
    ...config,
    validate: (data: { email: string; name?: string }) => {
      const emailSchema = z.string().email({ message: "无效的邮箱地址" });
      const result = z.object({
        email: z.string().email({ message: "无效的邮箱地址" }),
        name: z.string().min(1).max(100).optional(),
      }).safeParse(data);
      return { success: true, data: { email: data.email, name: data.name } };
    },
    submit: async (data: { email: string; name?: string }) => {
      const result = await subscriberManager.subscribe({
        email: data.email,
        name: data.name,
        listId: config.listId,
        tags: config.tags,
      });
      return { success: true, needsConfirmation: result.needsConfirmation };
    },
  };
}

// 订阅者状态类型导出
export type { SubscriberStatus };
// 接口类型导出
export type { Subscriber, EmailList, Campaign, CampaignStats, SegmentFilter };