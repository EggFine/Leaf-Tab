export const defaultSettings = {
    theme: 'system', // 'system', 'light', 'dark'
    engine: 'bing'   // 'bing', 'google', 'baidu'
};

export let currentSettings = { ...defaultSettings };

export function loadSettings() {
    const saved = localStorage.getItem('leaf-settings');
    if (saved) {
        try {
            currentSettings = { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Failed to parse settings', e);
        }
    }
}

export function saveSettings() {
    localStorage.setItem('leaf-settings', JSON.stringify(currentSettings));
}