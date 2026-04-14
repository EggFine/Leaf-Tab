import { currentSettings, saveSettings } from './store.js';

export function applyTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let shouldUseDark = false;

    if (currentSettings.theme === 'dark') {
        shouldUseDark = true;
    } else if (currentSettings.theme === 'system' && prefersDark) {
        shouldUseDark = true;
    }

    if (shouldUseDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

export function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentSettings.theme === 'system') {
            applyTheme();
        }
    });

    themeToggle.addEventListener('click', () => {
        const isCurrentlyDark = document.body.classList.contains('dark-theme');
        const newTheme = isCurrentlyDark ? 'light' : 'dark';
        
        currentSettings.theme = newTheme;
        saveSettings();
        applyTheme();
    });
}