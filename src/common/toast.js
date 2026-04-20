// 轻量 toast 通知 —— 无依赖，由 common/toast.css 提供样式
// 用法：showToast('已保存', { type: 'success' })
// 样式标签 leaf-toast-* 需要页面引入 src/common/toast.css

let hostEl = null;

function ensureHost() {
    if (hostEl && hostEl.isConnected) return hostEl;
    hostEl = document.createElement('div');
    hostEl.className = 'leaf-toast-host';
    hostEl.setAttribute('role', 'status');
    hostEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(hostEl);
    return hostEl;
}

export function showToast(message, options = {}) {
    const {
        type = 'info',      // 'info' | 'success' | 'warning' | 'error'
        duration = 3000,
        dismissible = true
    } = options;

    if (typeof document === 'undefined' || !document.body) {
        // 非浏览器环境（如 SW） → fallback console
        try { console.log(`[toast:${type}] ${message}`); } catch {}
        return () => {};
    }

    const host = ensureHost();
    const el = document.createElement('div');
    el.className = `leaf-toast leaf-toast-${type}`;
    el.textContent = String(message);
    host.appendChild(el);

    // 下一帧触发 in 动画
    requestAnimationFrame(() => el.classList.add('in'));

    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        el.classList.remove('in');
        el.classList.add('out');
        setTimeout(() => el.remove(), 300);
    };

    const timer = duration > 0 ? setTimeout(close, duration) : null;
    if (dismissible) {
        el.addEventListener('click', () => {
            if (timer) clearTimeout(timer);
            close();
        });
    }

    return () => {
        if (timer) clearTimeout(timer);
        close();
    };
}

// 便捷别名
export const toastSuccess = (m, opts) => showToast(m, { ...opts, type: 'success' });
export const toastError = (m, opts) => showToast(m, { duration: 5000, ...opts, type: 'error' });
export const toastWarning = (m, opts) => showToast(m, { ...opts, type: 'warning' });
export const toastInfo = (m, opts) => showToast(m, { ...opts, type: 'info' });
