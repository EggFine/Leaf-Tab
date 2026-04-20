// chrome.storage 包装：配额管理 + sync→local 降级 + key 迁移
// 为什么不直接用 chrome.storage：
//   1. sync 每 item 8KB / 总 100KB 限制，写大对象会静默失败
//   2. 跨 area 迁移需要统一入口，避免各模块重复实现
//   3. 需要在降级/错误时把反馈冒泡给 UI

import { reportError } from './errors.js';

// Chrome sync 存储限制（官方文档值）
export const QUOTA_BYTES_SYNC = 102400;          // 总 100KB
export const QUOTA_BYTES_PER_ITEM_SYNC = 8192;   // 单项 8KB

// 记录哪些 key 已经 "落地" 到 local（用于自动后续写入时选对 area）
const fallbackCache = new Map(); // key -> area

function jsonSize(value) {
    try {
        return new Blob([JSON.stringify(value ?? null)]).size;
    } catch {
        return 0;
    }
}

function isQuotaError(err) {
    const msg = (err?.message || '').toLowerCase();
    return err?.name === 'QuotaExceededError'
        || msg.includes('quota')
        || msg.includes('max_write_operations')
        || msg.includes('too large');
}

export function cachedArea(key, defaultArea = 'sync') {
    return fallbackCache.get(key) || defaultArea;
}

export async function readStorage(key, { area = 'sync' } = {}) {
    // 先试 cachedArea（若上次写入降级到 local，本次就先读 local）
    const resolvedArea = cachedArea(key, area);
    try {
        const result = await chrome.storage[resolvedArea].get(key);
        if (result[key] !== undefined) {
            return { area: resolvedArea, value: result[key] };
        }
    } catch (err) {
        reportError('storage.read', err, { key, area: resolvedArea });
    }

    // 未命中 → 尝试另一 area（防止 cachedArea 与实际情况不一致）
    if (resolvedArea !== area) {
        try {
            const result = await chrome.storage[area].get(key);
            if (result[key] !== undefined) {
                return { area, value: result[key] };
            }
        } catch (err) {
            reportError('storage.read', err, { key, area });
        }
    }
    return { area: null, value: undefined };
}

export async function writeStorage(key, value, options = {}) {
    const {
        area = 'sync',
        fallbackArea = area === 'sync' ? 'local' : null,
        onFallback
    } = options;

    // 预检：sync 单项超 8KB 就直接降级
    if (area === 'sync' && fallbackArea) {
        const size = jsonSize(value);
        if (size > QUOTA_BYTES_PER_ITEM_SYNC) {
            try {
                await chrome.storage[fallbackArea].set({ [key]: value });
                fallbackCache.set(key, fallbackArea);
                onFallback?.({ reason: 'size', size, key, fromArea: area, toArea: fallbackArea });
                return { area: fallbackArea, fellBack: true, size };
            } catch (err) {
                reportError('storage.write.fallback', err, { key, fallbackArea });
                throw err;
            }
        }
    }

    try {
        await chrome.storage[area].set({ [key]: value });
        fallbackCache.set(key, area);
        return { area, fellBack: false };
    } catch (err) {
        if (isQuotaError(err) && fallbackArea) {
            try {
                await chrome.storage[fallbackArea].set({ [key]: value });
                fallbackCache.set(key, fallbackArea);
                onFallback?.({ reason: 'quota', error: err, key, fromArea: area, toArea: fallbackArea });
                return { area: fallbackArea, fellBack: true, reason: 'quota' };
            } catch (err2) {
                reportError('storage.write.fallback', err2, { key, fallbackArea });
                throw err2;
            }
        }
        reportError('storage.write', err, { key, area });
        throw err;
    }
}

// 一次性迁移：把 fromArea[key] 搬到 toArea[key]，fromArea 源数据清除
// 若 toArea 已存在值：默认不覆盖；传 overwrite=true 强制覆盖
export async function migrateKey(key, fromArea, toArea, { overwrite = false } = {}) {
    try {
        const [src, dst] = await Promise.all([
            chrome.storage[fromArea].get(key),
            chrome.storage[toArea].get(key)
        ]);
        const srcVal = src[key];
        if (srcVal === undefined) return { migrated: false, reason: 'no-source' };
        if (!overwrite && dst[key] !== undefined) {
            // 目标已有数据：仅清除 source，避免双写冲突
            await chrome.storage[fromArea].remove(key).catch(() => {});
            return { migrated: false, reason: 'dst-exists' };
        }
        await chrome.storage[toArea].set({ [key]: srcVal });
        await chrome.storage[fromArea].remove(key).catch(() => {});
        fallbackCache.set(key, toArea);
        return { migrated: true, value: srcVal };
    } catch (err) {
        reportError('storage.migrate', err, { key, fromArea, toArea });
        return { migrated: false, reason: 'error', error: err };
    }
}

// 获取某 area 已用字节（估算用于 UI 展示 / 阈值提醒）
export async function getBytesInUse(area = 'sync', keys = null) {
    try {
        if (typeof chrome.storage[area].getBytesInUse === 'function') {
            return await chrome.storage[area].getBytesInUse(keys);
        }
    } catch (err) {
        reportError('storage.getBytesInUse', err, { area });
    }
    return 0;
}
