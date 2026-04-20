// background.js (Service Worker)
// 注：SW 里不能用 DOM / localStorage，但可以用 chrome.storage
// 为什么不引入 common/storage.js：SW 体积小、且 SW 里不需要配额降级逻辑
// （写入方都在页面层，已经走了 wrapper）

const LEGACY_BOOKMARKS_KEY = 'leaf-bookmarks';

chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        // 首装/升级时把旧的 sync.leaf-bookmarks 迁到 local（与 common/bookmarks.js 互为保险）
        try {
            const [syncData, localData] = await Promise.all([
                chrome.storage.sync.get(LEGACY_BOOKMARKS_KEY),
                chrome.storage.local.get(LEGACY_BOOKMARKS_KEY)
            ]);
            if (syncData[LEGACY_BOOKMARKS_KEY] !== undefined
                && localData[LEGACY_BOOKMARKS_KEY] === undefined) {
                await chrome.storage.local.set({
                    [LEGACY_BOOKMARKS_KEY]: syncData[LEGACY_BOOKMARKS_KEY]
                });
            }
            if (syncData[LEGACY_BOOKMARKS_KEY] !== undefined) {
                await chrome.storage.sync.remove(LEGACY_BOOKMARKS_KEY).catch(() => {});
            }
        } catch (err) {
            console.error('[leaf-tab:bg] bookmark migration failed', err);
        }

        console.log(
            `[leaf-tab:bg] ${details.reason === 'install' ? 'installed' : 'updated'}`
            + ` (prev: ${details.previousVersion ?? '-'})`
        );
    } catch (err) {
        console.error('[leaf-tab:bg] onInstalled failed', err);
    }
});

// 轻量消息路由 —— 预留给未来 widget/插件使用
// 约定：请求 { type, payload }；响应 { ok, data?, error? }
// 注意 SW 中异步响应需 return true 保持通道开启
const HANDLERS = {
    ping: () => ({ pong: true, at: Date.now() }),
    getStorageBytes: async ({ area = 'local' } = {}) => {
        if (!['sync', 'local', 'session'].includes(area)) {
            throw new Error(`invalid storage area: ${area}`);
        }
        const fn = chrome.storage[area]?.getBytesInUse;
        if (typeof fn !== 'function') return { bytes: 0 };
        const bytes = await fn.call(chrome.storage[area]);
        return { bytes };
    }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
        sendResponse({ ok: false, error: 'invalid message shape' });
        return false;
    }
    const handler = HANDLERS[message.type];
    if (!handler) {
        sendResponse({ ok: false, error: `unknown message type: ${message.type}` });
        return false;
    }
    (async () => {
        try {
            const data = await handler(message.payload ?? {}, sender);
            sendResponse({ ok: true, data });
        } catch (err) {
            sendResponse({ ok: false, error: err?.message || String(err) });
        }
    })();
    return true; // 保持消息通道开启以便异步响应
});
