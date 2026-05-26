// theme-toggle core widget —— 独立的明暗模式切换按钮

import { updateSettings } from '../../store.js';
import { applyTheme } from '../../theme.js';
import { t } from '../../../../common/i18n.js';

const SUN_ICON = `<svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const MOON_ICON = `<svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

let rootEl = null;
let themeBtn = null;
let getSettingsRef = () => ({ theme: 'system' });

function syncThemeToggleState() {
    if (!themeBtn) return;
    const isDark = document.body.classList.contains('dark-theme');
    themeBtn.setAttribute('aria-pressed', String(isDark));
    const mode = t(isDark ? 'widget.themeToggle.mode.dark' : 'widget.themeToggle.mode.light');
    themeBtn.title = getSettingsRef().theme === 'system'
        ? t('widget.themeToggle.title.system', { mode })
        : t('widget.themeToggle.title.manual', { mode });
}

async function handleThemeToggle() {
    const isCurrentlyDark = document.body.classList.contains('dark-theme');
    const newTheme = isCurrentlyDark ? 'light' : 'dark';
    try {
        await updateSettings({ theme: newTheme });
        applyTheme();
        syncThemeToggleState();
    } catch (error) {
        console.error('Failed to update theme', error);
    }
}

const manifest = {
    id: 'theme-toggle',
    type: 'core',
    name: 'widget.themeToggle.name',
    description: 'widget.themeToggle.description',
    icon: MOON_ICON,
    version: '1.0.0',
    author: 'Leaf Tab',
    removable: false,
    hideable: true,
    defaultPosition: { cell: null, row: 1, col: 3 },
    configSchema: [],

    mount(container, ctx) {
        getSettingsRef = ctx.getSettings;

        rootEl = document.createElement('div');
        rootEl.className = 'top-controls';
        rootEl.innerHTML = `
            <button type="button" class="icon-btn theme-toggle" data-role="theme" aria-label="${t('widget.themeToggle.aria')}">
                ${SUN_ICON}
                ${MOON_ICON}
            </button>
        `;
        container.appendChild(rootEl);

        themeBtn = rootEl.querySelector('[data-role="theme"]');
        themeBtn.addEventListener('click', handleThemeToggle);

        syncThemeToggleState();
    },

    unmount() {
        rootEl?.remove();
        rootEl = null;
        themeBtn = null;
    },

    onSettingsChange() {
        syncThemeToggleState();
    },

    onConfigChange() {}
};

export default manifest;
