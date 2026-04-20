// 书签数据层（共享：popup / newtab 书签 widget）
// 存储位置：chrome.storage.local
//   原因：书签列表可能很大（含 favicon URL），sync 8KB/item 限制会吃不消；
//   且跨机同步对"收藏"不是核心诉求，local 更稳也更快。
// 旧数据迁移：首次访问时从 sync 搬到 local

import { readStorage, writeStorage, migrateKey } from './storage.js';
import { reportError } from './errors.js';

export const BOOKMARKS_KEY = 'leaf-bookmarks';
const STORAGE_AREA = 'local';

let migrationPromise = null;

async function ensureMigrated() {
    if (migrationPromise) return migrationPromise;
    migrationPromise = (async () => {
        try {
            await migrateKey(BOOKMARKS_KEY, 'sync', 'local');
        } catch (err) {
            reportError('bookmarks.migrate', err);
        }
    })();
    return migrationPromise;
}

export async function loadBookmarks() {
    await ensureMigrated();
    const { value } = await readStorage(BOOKMARKS_KEY, { area: STORAGE_AREA });
    return Array.isArray(value) ? value : [];
}

export async function saveBookmarks(bookmarks) {
    if (!Array.isArray(bookmarks)) {
        throw new TypeError('bookmarks must be an array');
    }
    await ensureMigrated();
    // local 配额 ~5MB，足够；仍走 wrapper 以统一错误处理
    await writeStorage(BOOKMARKS_KEY, bookmarks, {
        area: STORAGE_AREA,
        fallbackArea: null  // local 无处可退
    });
    return bookmarks;
}

// 订阅书签变化 —— 兼容迁移期：sync/local 两头都听
export function onBookmarksChanged(listener) {
    if (typeof listener !== 'function') return () => {};

    const handler = (changes, areaName) => {
        if (areaName !== 'local' && areaName !== 'sync') return;
        if (!changes[BOOKMARKS_KEY]) return;
        const newValue = changes[BOOKMARKS_KEY].newValue;
        // 忽略 sync 里被迁移清空的事件
        if (areaName === 'sync' && newValue === undefined) return;
        try {
            listener(Array.isArray(newValue) ? newValue : [], { area: areaName });
        } catch (err) {
            reportError('bookmarks.listener', err);
        }
    };

    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
}

// 根据 URL 查找匹配项（用于 popup）
export function findMatchedBookmark(bookmarks, url) {
    if (!Array.isArray(bookmarks) || !url) return null;
    const exact = bookmarks.find(b => b?.url === url);
    if (exact) return exact;

    let targetHost = '';
    try { targetHost = new URL(url).hostname; } catch { return null; }
    if (!targetHost) return null;

    return bookmarks.find(b => {
        if (!b?.url) return false;
        try { return new URL(b.url).hostname === targetHost; } catch { return false; }
    }) || null;
}
