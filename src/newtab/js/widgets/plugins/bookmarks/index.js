// bookmarks plugin —— 收藏网格
// 由原 src/newtab/js/bookmarks.js 改造：DOM 自建，showTitles 从 ctx.config 读取

const FALLBACK_COLORS = [
    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
    '#6f42c1', '#fd7e14', '#20c997', '#d63384', '#6610f2'
];

const BOOKMARK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>`;

const BOOKMARKS_STORAGE_KEY = 'leaf-bookmarks';

let rootEl = null;
let grid = null;
let ctxRef = null;
let storageListener = null;

function getFallbackColor(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % FALLBACK_COLORS.length);
    return FALLBACK_COLORS[index];
}

function renderBookmarks(bookmarks) {
    if (!grid) return;
    grid.innerHTML = '';

    const showTitles = ctxRef?.config?.showTitles !== false;

    if (!bookmarks || bookmarks.length === 0) {
        grid.innerHTML = `
            <div class="empty-bookmarks">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; opacity: 0.5;"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>
                <div style="font-weight: 500; margin-bottom: 4px;">暂无收藏</div>
                <div style="font-size: 12px; opacity: 0.7;">点击浏览器右上角 Leaf Tab 图标收藏当前页面</div>
            </div>
        `;
        return;
    }

    bookmarks.forEach((bookmark, index) => {
        const item = document.createElement('a');
        item.className = 'bookmark-item';
        if (!showTitles) item.classList.add('no-title');
        item.href = bookmark.url;
        item.title = bookmark.title;
        item.style.animationDelay = `${index * 0.05}s`;

        const color = getFallbackColor(bookmark.title);
        const firstChar = bookmark.title ? bookmark.title.charAt(0).toUpperCase() : '?';

        let iconHtml = '';
        if (bookmark.icon) {
            iconHtml = `
                <img src="${bookmark.icon}" alt="" class="bookmark-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="bookmark-fallback-icon" style="display:none; background-color: ${color};">
                    ${firstChar}
                </div>
            `;
        } else {
            iconHtml = `
                <div class="bookmark-fallback-icon" style="background-color: ${color};">
                    ${firstChar}
                </div>
            `;
        }

        const titleHtml = showTitles
            ? `<div class="bookmark-title">${bookmark.title}</div>`
            : '';

        item.innerHTML = `
            <div class="bookmark-icon-wrapper">
                ${iconHtml}
                <button class="delete-bookmark-btn" aria-label="删除收藏" data-url="${bookmark.url}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            ${titleHtml}
        `;

        item.addEventListener('click', (e) => {
            e.preventDefault();
            const overlay = document.getElementById('searchTransition');
            if (overlay) {
                overlay.classList.add('active');
                setTimeout(() => {
                    window.location.href = bookmark.url;
                }, 500);
            } else {
                window.location.href = bookmark.url;
            }
        });

        const deleteBtn = item.querySelector('.delete-bookmark-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            item.style.transform = 'scale(0.8)';
            item.style.opacity = '0';

            setTimeout(async () => {
                await removeBookmark(bookmark.url);
            }, 200);
        });

        grid.appendChild(item);
    });
}

async function loadAndRender() {
    try {
        const result = await chrome.storage.sync.get(BOOKMARKS_STORAGE_KEY);
        renderBookmarks(result[BOOKMARKS_STORAGE_KEY] || []);
    } catch (e) {
        console.error('Failed to load bookmarks', e);
    }
}

async function removeBookmark(url) {
    try {
        const result = await chrome.storage.sync.get(BOOKMARKS_STORAGE_KEY);
        let bookmarks = result[BOOKMARKS_STORAGE_KEY] || [];
        bookmarks = bookmarks.filter(b => b.url !== url);
        await chrome.storage.sync.set({ [BOOKMARKS_STORAGE_KEY]: bookmarks });
    } catch (e) {
        console.error('Failed to remove bookmark', e);
    }
}

const manifest = {
    id: 'bookmarks',
    type: 'plugin',
    name: '收藏',
    description: '快速访问常用网站，支持自动获取网站图标',
    icon: BOOKMARK_ICON,
    version: '1.0.0',
    author: 'Leaf Tab',
    removable: true,
    defaultPosition: { cell: 'BC', colSpan: 3, rowSpan: 1 },
    configSchema: [
        { key: 'showTitles', label: '显示标题', type: 'toggle', default: true,
          description: '在每个收藏项下方显示网站标题' }
    ],

    mount(container, ctx) {
        ctxRef = ctx;

        rootEl = document.createElement('div');
        rootEl.className = 'bookmarks-module';
        rootEl.innerHTML = `
            <div class="bookmarks-grid" data-role="grid"></div>
        `;
        container.appendChild(rootEl);

        grid = rootEl.querySelector('[data-role="grid"]');

        storageListener = (changes, namespace) => {
            if (namespace !== 'sync') return;
            if (!changes[BOOKMARKS_STORAGE_KEY]) return;
            renderBookmarks(changes[BOOKMARKS_STORAGE_KEY].newValue || []);
        };
        chrome.storage.onChanged.addListener(storageListener);

        loadAndRender();
    },

    unmount() {
        if (storageListener) {
            chrome.storage.onChanged.removeListener(storageListener);
            storageListener = null;
        }
        rootEl?.remove();
        rootEl = null;
        grid = null;
        ctxRef = null;
    },

    onConfigChange() {
        loadAndRender();
    },

    onSettingsChange() {}
};

export default manifest;
