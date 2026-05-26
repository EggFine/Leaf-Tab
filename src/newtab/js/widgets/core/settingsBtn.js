// settings-btn core widget —— 独立的"打开设置"按钮

import { t } from '../../../../common/i18n.js';

const GEAR_ICON =`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

let rootEl = null;

async function handleSettingsClick() {
    try {
        await chrome.runtime.openOptionsPage();
    } catch (error) {
        console.error('Failed to open options page', error);
        chrome.tabs.create({ url: chrome.runtime.getURL('src/settings/index.html') });
    }
}

const manifest = {
    id: 'settings-btn',
    type: 'core',
    name: 'widget.settingsBtn.name',
    description: 'widget.settingsBtn.description',
    icon: GEAR_ICON,
    version: '1.0.0',
    author: 'Leaf Tab',
    removable: false,
    hideable: true,
    defaultPosition: { cell: null, row: 1, col: 3 },
    configSchema: [],

    mount(container /*, ctx */) {
        rootEl = document.createElement('div');
        rootEl.className = 'top-controls';
        rootEl.innerHTML = `
            <button type="button" class="icon-btn" data-role="settings" aria-label="${t('widget.settingsBtn.aria')}">
                ${GEAR_ICON}
            </button>
        `;
        container.appendChild(rootEl);

        const settingsBtn = rootEl.querySelector('[data-role="settings"]');
        settingsBtn.addEventListener('click', handleSettingsClick);
    },

    unmount() {
        rootEl?.remove();
        rootEl = null;
    },

    onSettingsChange() {},
    onConfigChange() {}
};

export default manifest;
