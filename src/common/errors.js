// 统一错误处理：日志 + 订阅者广播（toast 等 UI 层可订阅）
// 设计意图：
//   - 所有 "不该吞掉的错误" 走 reportError，集中到控制台 + 订阅者
//   - 对 UI 来说，订阅 subscribeToErrors 即可弹 toast
//   - safeAsync/safe 给调用点提供"不抛出但可追溯"的包装

const subscribers = new Set();

export function subscribeToErrors(listener) {
    if (typeof listener !== 'function') return () => {};
    subscribers.add(listener);
    return () => subscribers.delete(listener);
}

export function reportError(source, err, extra = {}) {
    const payload = {
        source: source || 'unknown',
        message: err?.message || String(err) || '未知错误',
        name: err?.name,
        stack: err?.stack,
        extra,
        at: Date.now()
    };
    try {
        // eslint-disable-next-line no-console
        console.error(`[leaf-tab:${payload.source}]`, err, extra);
    } catch {}
    for (const fn of [...subscribers]) {
        try { fn(payload); } catch (subErr) {
            try { console.error('[leaf-tab:errors] subscriber threw', subErr); } catch {}
        }
    }
}

export async function safeAsync(source, fn, extra) {
    try {
        return await fn();
    } catch (err) {
        reportError(source, err, extra);
        return undefined;
    }
}

export function safe(source, fn, extra) {
    try {
        return fn();
    } catch (err) {
        reportError(source, err, extra);
        return undefined;
    }
}
