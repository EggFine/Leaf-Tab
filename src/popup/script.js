import { loadBookmarks, saveBookmarks, findMatchedBookmark } from '../common/bookmarks.js';
import { readStorage } from '../common/storage.js';
import { reportError, subscribeToErrors } from '../common/errors.js';
import { toastError } from '../common/toast.js';

// 把 errors 通道接到 toast，popup 内部的错误用户能感知到
subscribeToErrors((payload) => {
    if (payload.source?.startsWith('storage')) {
        toastError(`存储异常：${payload.message}`);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
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
            statusMsg.textContent = '无法获取页面信息';
            actionBtn.textContent = '错误';
            actionBtn.classList.add('disabled');
            return;
        }

        currentTab = tabs[0];
        titleInput.value = currentTab.title || '';
        urlInput.value = currentTab.url || '';

        const urlText = currentTab.url || '';
        if (!urlText || (!urlText.startsWith('http://') && !urlText.startsWith('https://'))) {
            statusMsg.textContent = '无法收藏此页面（不支持的URL协议）';
            actionBtn.textContent = '不支持的页面';
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
            statusMsg.textContent = '收藏插件未启用，请在设置中开启。';
            actionBtn.textContent = '功能未开启';
            actionBtn.classList.add('disabled');
            return;
        }

        await refreshBookmarksState();

    } catch (err) {
        reportError('popup.init', err);
        statusMsg.textContent = '发生初始化错误';
        actionBtn.textContent = '错误';
    }

    async function refreshBookmarksState() {
        try {
            bookmarks = await loadBookmarks();
            matchedBookmark = findMatchedBookmark(bookmarks, currentTab.url);
            updateUIState();
        } catch (err) {
            reportError('popup.loadBookmarks', err);
            statusMsg.textContent = '加载收藏失败';
        }
    }

    function updateUIState() {
        actionBtn.classList.remove('disabled');

        const oldSecondary = document.getElementById('secondaryActionBtn');
        if (oldSecondary) oldSecondary.remove();

        if (matchedBookmark) {
            const isExactMatch = matchedBookmark.url === currentTab.url;

            if (isExactMatch) {
                statusMsg.textContent = '此页面已在收藏中';
                actionBtn.textContent = '更新信息';
            } else {
                statusMsg.textContent = `发现来自同一站点的收藏: "${matchedBookmark.title}"`;
                actionBtn.textContent = '替换旧项';
            }

            titleInput.value = currentTab.title || matchedBookmark.title;

            const secondaryBtn = document.createElement('button');
            secondaryBtn.id = 'secondaryActionBtn';
            secondaryBtn.className = 'action-btn secondary';
            secondaryBtn.textContent = '存为新项';
            secondaryBtn.onclick = () => handleAction(false);
            actionFooter.appendChild(secondaryBtn);

            actionBtn.onclick = () => handleAction(true);
        } else {
            statusMsg.textContent = '页面未收藏';
            actionBtn.textContent = '添加到收藏';
            actionBtn.onclick = () => handleAction(false);
        }
    }

    async function handleAction(shouldUpdate) {
        const newTitle = titleInput.value.trim();
        const newUrl = urlInput.value.trim();

        if (!newTitle || !newUrl) {
            statusMsg.textContent = '标题和链接不能为空';
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
                statusMsg.textContent = '收藏已更新';
            } else {
                bookmarks.push({
                    title: newTitle,
                    url: newUrl,
                    icon: newUrl === currentTab.url ? (currentTab.favIconUrl || '') : ''
                });
                statusMsg.textContent = '已添加到收藏';
            }

            await saveBookmarks(bookmarks);
            await refreshBookmarksState();
        } catch (err) {
            reportError('popup.handleAction', err);
            statusMsg.textContent = '操作失败';
        } finally {
            btns.forEach(b => b.classList.remove('disabled'));
        }
    }
});
