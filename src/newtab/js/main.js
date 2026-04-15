import { loadSettings, onSettingsChanged, currentSettings } from './store.js';
import { applyTheme } from './theme.js';
import { registerWidget } from './widgetRegistry.js';
import { initLayout, relayout, notifyWidgetsSettingsChanged } from './layout.js';

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

document.addEventListener('DOMContentLoaded', () => {
    void initializeNewTab();
});

async function initializeNewTab() {
    await loadSettings();
    applyTheme();

    initLayout();

    let lastWidgetsSnapshot = JSON.stringify(currentSettings.widgets || {});
    let lastGridSnapshot = JSON.stringify(currentSettings.grid || {});
    let lastTheme = currentSettings.theme;
    let lastEngine = currentSettings.engine;
    let lastInstalled = JSON.stringify(currentSettings.installedPlugins || []);

    onSettingsChanged(() => {
        const themeChanged = currentSettings.theme !== lastTheme;
        if (themeChanged) {
            lastTheme = currentSettings.theme;
            applyTheme();
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
