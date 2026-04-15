import { currentSettings } from './store.js';

const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme() {
    const shouldUseDark = currentSettings.theme === 'dark' ||
        (currentSettings.theme === 'system' && colorSchemeQuery.matches);

    if (shouldUseDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// 系统主题变化 → 在 theme === 'system' 时跟随重算
colorSchemeQuery.addEventListener('change', () => {
    if (currentSettings.theme === 'system') {
        applyTheme();
    }
});
