document.addEventListener('DOMContentLoaded', async () => {
    const statusMsg = document.getElementById('statusMsg');
    const titleInput = document.getElementById('titleInput');
    const urlInput = document.getElementById('urlInput');
    const actionBtn = document.getElementById('actionBtn');
    const actionFooter = document.getElementById('actionFooter');

    let currentTab = null;
    let bookmarks = [];
    let matchedBookmark = null; // 用于存储域名匹配或 URL 匹配的项

    // 获取域名工具函数
    function getDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return '';
        }
    }

    // 获取当前标签页
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0) {
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

            const settingsResult = await chrome.storage.sync.get('leaf-settings');
            const settings = settingsResult['leaf-settings'];

            // 适配新 schema：优先 widgets.bookmarks.visible + installedPlugins，兼容旧 showBookmarks
            const bookmarksEnabled = (() => {
                if (!settings) return true; // 未配置则默认放行
                // 新 schema
                if (settings.widgets || settings.installedPlugins) {
                    const installed = Array.isArray(settings.installedPlugins)
                        && settings.installedPlugins.includes('bookmarks');
                    const visible = settings.widgets?.bookmarks?.visible !== false;
                    return installed && visible;
                }
                // 旧 schema 兼容
                return settings.showBookmarks !== false;
            })();

            if (!bookmarksEnabled) {
                statusMsg.textContent = '收藏插件未启用，请在设置中开启。';
                actionBtn.textContent = '功能未开启';
                actionBtn.classList.add('disabled');
                return;
            }

            await loadBookmarksState();

        } else {
            statusMsg.textContent = '无法获取页面信息';
            actionBtn.textContent = '错误';
            actionBtn.classList.add('disabled');
        }
    } catch (e) {
        console.error('Popup initial error:', e);
        statusMsg.textContent = '发生初始化错误';
        actionBtn.textContent = '错误';
    }

    async function loadBookmarksState() {
        try {
            const result = await chrome.storage.sync.get('leaf-bookmarks');
            bookmarks = result['leaf-bookmarks'] || [];
            
            const currentUrl = currentTab.url;
            const currentDomain = getDomain(currentUrl);
            
            // 1. 优先查找完全匹配的 URL
            matchedBookmark = bookmarks.find(b => b.url === currentUrl);
            
            // 2. 如果没找到 URL 匹配，找域名匹配
            if (!matchedBookmark && currentDomain) {
                matchedBookmark = bookmarks.find(b => getDomain(b.url) === currentDomain);
            }
            
            updateUIState();
        } catch (e) {
            console.error('Load bookmarks error:', e);
            statusMsg.textContent = '加载收藏失败';
        }
    }

    function updateUIState() {
        actionBtn.classList.remove('disabled');
        
        // 清理可能存在的旧按钮
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

            // 填入匹配项的信息（如果用户还没手动修改的话）
            titleInput.value = currentTab.title || matchedBookmark.title;
            
            // 添加“另存为新项”按钮
            const secondaryBtn = document.createElement('button');
            secondaryBtn.id = 'secondaryActionBtn';
            secondaryBtn.className = 'action-btn secondary';
            secondaryBtn.textContent = '存为新项';
            secondaryBtn.onclick = () => handleAction(false); // false 表示作为新项添加
            actionFooter.appendChild(secondaryBtn);

            // 主按钮逻辑：执行更新/替换
            actionBtn.onclick = () => handleAction(true); // true 表示更新匹配项
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
                // 更新/替换模式
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
                // 新增模式
                bookmarks.push({
                    title: newTitle,
                    url: newUrl,
                    icon: newUrl === currentTab.url ? (currentTab.favIconUrl || '') : ''
                });
                statusMsg.textContent = '已添加到收藏';
            }
            
            await chrome.storage.sync.set({ 'leaf-bookmarks': bookmarks });
            
            // 操作成功后逻辑：重新加载状态以更新 UI
            await loadBookmarksState();
        } catch (e) {
            console.error('Action error:', e);
            statusMsg.textContent = '操作失败';
        } finally {
            btns.forEach(b => b.classList.remove('disabled'));
        }
    }
});
