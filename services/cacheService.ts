// 全局数据缓存服务
// 只在页面刷新、登录时加载，切换页面不重复请求

const CACHE_PREFIX = 'destiny_cache_';

// 缓存过期时间（5分钟）
const CACHE_TTL = 5 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export const cacheService = {
  // 获取缓存
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(CACHE_PREFIX + key);
      if (!item) return null;
      
      const parsed: CacheItem<T> = JSON.parse(item);
      const isExpired = Date.now() - parsed.timestamp > CACHE_TTL;
      
      // 过期则删除
      if (isExpired) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      
      return parsed.data;
    } catch {
      return null;
    }
  },

  // 设置缓存
  set<T>(key: string, data: T): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch (e) {
      console.warn('Cache set failed:', e);
    }
  },

  // 删除指定缓存
  remove(key: string): void {
    localStorage.removeItem(CACHE_PREFIX + key);
  },

  // 清除所有缓存（登录/登出时调用）
  clearAll(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  },

  // 检查缓存是否存在（不检查过期）
  has(key: string): boolean {
    return localStorage.getItem(CACHE_PREFIX + key) !== null;
  },
};

// 缓存 key 常量
export const CACHE_KEYS = {
  USER_PROFILES: 'user_profiles',
  USER_BAZI: 'user_bazi',
  DASHBOARD_DATA: 'dashboard_data',
  MEMORIES: 'memories',
  REPORTS: 'reports',
  BALANCE: 'balance',
  LEVEL_STATE: 'level_state',
} as const;
