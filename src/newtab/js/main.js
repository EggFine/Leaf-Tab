import { loadSettings, saveSettings, currentSettings } from './store.js';
import { applyTheme, initTheme } from './theme.js';
import { setupCustomSelect, initSettingsOverlay } from './settings.js';
import { initSearch } from './search.js';

document.addEventListener('DOMContentLoaded', () => {
    // ==================== 初始化与加载 ====================
    loadSettings();

    // ==================== 初始化下拉框 ====================
    const themeSelectControl = setupCustomSelect('themeSelect', (value) => {
        currentSettings.theme = value;
        saveSettings();
        applyTheme();
    });

    const engineSelectControl = setupCustomSelect('engineSelect', (value) => {
        currentSettings.engine = value;
        saveSettings();
    });

    // 同步 UI 状态
    themeSelectControl.setValue(currentSettings.theme);
    engineSelectControl.setValue(currentSettings.engine);

    // ==================== 绑定其他模块逻辑 ====================
    applyTheme();
    initTheme(themeSelectControl);
    initSettingsOverlay();
    initSearch();
    
    // ==================== 触发入场动画 ====================
    setTimeout(() => {
        document.body.classList.add('loaded');
        document.getElementById('searchInput').focus();
    }, 50);
});