export function initSettingsButton() {
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: 'src/settings/index.html' });
        });
    }
}