import { loadSettings, onSettingsChanged, currentSettings } from './store.js';
import { applyTheme } from './theme.js';
import { registerWidget } from './widgetRegistry.js';
import { initLayout, relayout, notifyWidgetsSettingsChanged } from './layout.js';
import { subscribeToErrors } from '../../common/errors.js';
import { toastError, toastWarning } from '../../common/toast.js';
import { initI18n, changeLang, resolveLang, getLang, t } from '../../common/i18n.js';

// Core widgets
import searchManifest from './widgets/core/search.js';
import themeToggleManifest from './widgets/core/themeToggle.js';
import settingsBtnManifest from './widgets/core/settingsBtn.js';
import brandManifest from './widgets/core/brand.js';

// Container 模板（供容器实例共享）
import rowContainerManifest from './widgets/core/containers/row.js';
import colContainerManifest from './widgets/core/containers/col.js';

// Plugin widgets
import bookmarksManifest from './widgets/plugins/bookmarks/index.js';

// 注册（顺序无关）
[
    searchManifest,
    themeToggleManifest,
    settingsBtnManifest,
    brandManifest,
    rowContainerManifest,
    colContainerManifest,
    bookmarksManifest
].forEach(registerWidget);

// 把错误通道接到 toast
subscribeToErrors((payload) => {
    // widget 内部生命周期错误噪音太大，不打扰用户；其余都给个提示
    if (/^widget\./.test(payload.source)) return;
    if (payload.source.startsWith('store.save.fallback')) {
        toastWarning(payload.message, { duration: 5000 });
        return;
    }
    if (payload.source.startsWith('store.') || payload.source.startsWith('storage.')) {
        toastError(t('error.toast.storage', { message: payload.message }));
        return;
    }
});

// 捕获 widget 里未 try/catch 到的冒泡错误
window.addEventListener('error', (e) => {
    // 忽略扩展 URL 外的第三方脚本（理论上不会有）
    if (!e.filename || e.filename.startsWith(chrome.runtime?.getURL?.('') || '')) {
        // 静默记录（toast 会太吵）
        try { console.error('[leaf-tab:window.onerror]', e.error || e.message); } catch {}
    }
});
window.addEventListener('unhandledrejection', (e) => {
    try { console.error('[leaf-tab:unhandledrejection]', e.reason); } catch {}
});

document.addEventListener('DOMContentLoaded', () => {
    void initializeNewTab();
});

async function initializeNewTab() {
    await loadSettings();
    await initI18n(currentSettings.language);
    applyTheme();

    initLayout();

    let lastWidgetsSnapshot = JSON.stringify(currentSettings.widgets || {});
    let lastGridSnapshot = JSON.stringify(currentSettings.grid || {});
    let lastTheme = currentSettings.theme;
    let lastEngine = currentSettings.engine;
    let lastInstalled = JSON.stringify(currentSettings.installedPlugins || []);
    let lastLang = getLang();

    onSettingsChanged(async () => {
        const themeChanged = currentSettings.theme !== lastTheme;
        if (themeChanged) {
            lastTheme = currentSettings.theme;
            applyTheme();
        }

        // 语言变化:重载 locale → relayout 让所有 widget 用新语言重渲染
        const desiredLang = resolveLang(currentSettings.language);
        if (desiredLang !== lastLang) {
            await changeLang(currentSettings.language);
            lastLang = desiredLang;
            relayout();
            // 保留快照,后面的 structuralChanged 判定不再误触发
            lastWidgetsSnapshot = JSON.stringify(currentSettings.widgets || {});
            lastGridSnapshot = JSON.stringify(currentSettings.grid || {});
            lastInstalled = JSON.stringify(currentSettings.installedPlugins || []);
            return;
        }

        const widgetsJson = JSON.stringify(currentSettings.widgets || {});
        const gridJson = JSON.stringify(currentSettings.grid || {});
        const installedJson = JSON.stringify(currentSettings.installedPlugins || []);
        const structuralChanged =
            widgetsJson !== lastWidgetsSnapshot ||
            gridJson !== lastGridSnapshot ||
            installedJson !== lastInstalled;
        const engineChanged = currentSettings.engine !== lastEngine;

        if (structuralChanged) {
            // 结构/网格/安装变化 → 完整 relayout
            relayout();
            lastWidgetsSnapshot = widgetsJson;
            lastGridSnapshot = gridJson;
            lastInstalled = installedJson;
        } else if (engineChanged || themeChanged) {
            lastEngine = currentSettings.engine;
            notifyWidgetsSettingsChanged();
        }
    });

    // 入场动画
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 50);
}
