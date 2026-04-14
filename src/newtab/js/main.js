import { loadSettings, currentSettings } from './store.js';
import { applyTheme, initTheme } from './theme.js';
import { initSettingsButton } from './settings.js';
import { initSearch, updateSearchPlaceholder } from './search.js';

document.addEventListener('DOMContentLoaded', () => {
    // ==================== 初始化与加载 ====================
    loadSettings();
    applyTheme();

    // ==================== 绑定其他模块逻辑 ====================
    initTheme();
    initSettingsButton();
    initSearch();
    
    // 监听设置页面修改导致的数据变动
    window.addEventListener('storage', (e) => {
        if (e.key === 'leaf-settings') {
            loadSettings();
            applyTheme();
            updateSearchPlaceholder();
        }
    });
    
    // ==================== 触发入场动画 ====================
    setTimeout(() => {
        document.body.classList.add('loaded');
        document.getElementById('searchInput').focus();
    }, 50);
});