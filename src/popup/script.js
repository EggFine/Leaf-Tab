import { loadBookmarks, saveBookmarks, findMatchedBookmark } from '../common/bookmarks.js';
import { readStorage } from '../common/storage.js';
import { reportError, subscribeToErrors } from '../common/errors.js';
import { toastError } from '../common/toast.js';
import { initI18n, t } from '../common/i18n.js';

// 把 errors 通道接到 toast，popup 内部的错误用户能感知到
subscribeToErrors((payload) => {
    if (payload.source?.startsWith('storage')) {
        toastError(t('error.toast.storage', { message: payload.message }));
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    // 先取语言偏好,再初始化 i18n,再渲染 UI
    const { value: settingsForLang } = await readStorage('leaf-settings', { area: 'sync' });
    await initI18n(settingsForLang?.language);

    const statusMsg = document.getElementById('statusMsg');
    const titleInput = document.getElementById('titleInput');
    const urlInput = document.getElementById('urlInput');
    const actionBtn = document.getElementById('actionBtn');
    const actionFooter = document.getElementById('actionFooter');

    let currentTab = null;
    let bookmarks = [];
    let matchedBookmark = null;

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            statusMsg.textContent = t('popup.status.tabUnavailable');
            actionBtn.textContent = t('popup.btn.error');
            actionBtn.classList.add('disabled');
            return;
        }

        currentTab = tabs[0];
        titleInput.value = currentTab.title || '';
        urlInput.value = currentTab.url || '';

        const urlText = currentTab.url || '';
        if (!urlText || (!urlText.startsWith('http://') && !urlText.startsWith('https://'))) {
            statusMsg.textContent = t('popup.status.unsupportedUrl');
            actionBtn.textContent = t('popup.btn.unsupported');
            actionBtn.classList.add('disabled');
            return;
        }

        // 读设置判断收藏插件是否启用
        const { value: settings } = await readStorage('leaf-settings', { area: 'sync' });
        const bookmarksEnabled = (() => {
            if (!settings) return true;
            if (settings.widgets || settings.installedPlugins) {
                const installed = Array.isArray(settings.installedPlugins)
                    && settings.installedPlugins.includes('bookmarks');
                const visible = settings.widgets?.bookmarks?.visible !== false;
                return installed && visible;
            }
            return settings.showBookmarks !== false;
        })();

        if (!bookmarksEnabled) {
            statusMsg.textContent = t('popup.status.pluginDisabled');
            actionBtn.textContent = t('popup.btn.disabled');
            actionBtn.classList.add('disabled');
            return;
        }

        await refreshBookmarksState();

    } catch (err) {
        reportError('popup.init', err);
        statusMsg.textContent = t('popup.status.initError');
        actionBtn.textContent = t('popup.btn.error');
    }

    async function refreshBookmarksState() {
        try {
            bookmarks = await loadBookmarks();
            matchedBookmark = findMatchedBookmark(bookmarks, currentTab.url);
            updateUIState();
        } catch (err) {
            reportError('popup.loadBookmarks', err);
            statusMsg.textContent = t('popup.status.loadFailed');
        }
    }

    function updateUIState() {
        actionBtn.classList.remove('disabled');

        const oldSecondary = document.getElementById('secondaryActionBtn');
        if (oldSecondary) oldSecondary.remove();

        if (matchedBookmark) {
            const isExactMatch = matchedBookmark.url === currentTab.url;

            if (isExactMatch) {
                statusMsg.textContent = t('popup.status.alreadyBookmarked');
                actionBtn.textContent = t('popup.btn.update');
            } else {
                statusMsg.textContent = t('popup.status.siteMatch', { title: matchedBookmark.title });
                actionBtn.textContent = t('popup.btn.replace');
            }

            titleInput.value = currentTab.title || matchedBookmark.title;

            const secondaryBtn = document.createElement('button');
            secondaryBtn.id = 'secondaryActionBtn';
            secondaryBtn.className = 'action-btn secondary';
            secondaryBtn.textContent = t('popup.btn.saveAsNew');
            secondaryBtn.onclick = () => handleAction(false);
            actionFooter.appendChild(secondaryBtn);

            actionBtn.onclick = () => handleAction(true);
        } else {
            statusMsg.textContent = t('popup.status.notBookmarked');
            actionBtn.textContent = t('popup.btn.add');
            actionBtn.onclick = () => handleAction(false);
        }
    }

    async function handleAction(shouldUpdate) {
        const newTitle = titleInput.value.trim();
        const newUrl = urlInput.value.trim();

        if (!newTitle || !newUrl) {
            statusMsg.textContent = t('popup.status.titleUrlRequired');
            return;
        }

        const btns = actionFooter.querySelectorAll('.action-btn');
        btns.forEach(b => b.classList.add('disabled'));

        try {
            if (shouldUpdate && matchedBookmark) {
                const index = bookmarks.findIndex(b => b.url === matchedBookmark.url);
                if (index !== -1) {
                    bookmarks[index] = {
                        title: newTitle,
                        url: newUrl,
                        icon: newUrl === currentTab.url ? (currentTab.favIconUrl || matchedBookmark.icon) : ''
                    };
                }
                statusMsg.textContent = t('popup.status.updated');
            } else {
                bookmarks.push({
                    title: newTitle,
                    url: newUrl,
                    icon: newUrl === currentTab.url ? (currentTab.favIconUrl || '') : ''
                });
                statusMsg.textContent = t('popup.status.added');
            }

            await saveBookmarks(bookmarks);
            await refreshBookmarksState();
        } catch (err) {
            reportError('popup.handleAction', err);
            statusMsg.textContent = t('popup.status.actionFailed');
        } finally {
            btns.forEach(b => b.classList.remove('disabled'));
        }
    }
});
