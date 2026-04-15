// Search core widget ——  搜索框 + 引擎显示
// 由原 src/newtab/js/search.js 改造：挂载函数化，DOM 自建，无全局 id 依赖

const engines = {
    bing: {
        url: 'https://www.bing.com/search?q=',
        name: '必应，有求必应',
        name_en: 'Bing',
        icon: 'assets/bing.svg'
    },
    google: {
        url: 'https://www.google.com/search?q=',
        name: 'Google 谷歌',
        name_en: 'Google',
        icon: 'assets/google.svg'
    },
    baidu: {
        url: 'https://www.baidu.com/s?wd=',
        name: '百度一下，你就知道',
        name_en: 'Baidu',
        icon: 'assets/baidu.svg'
    }
};

const ICON_SEARCH = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
const ICON_ARROW = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

let rootEl = null;
let searchInput = null;
let searchBtn = null;
let engineDisplay = null;
let searchTimer = null;
let getSettingsRef = () => ({ engine: 'bing' });

function isImeConfirmEvent(event) {
    return event.isComposing || event.keyCode === 229;
}

function performSearch() {
    if (searchTimer !== null || !searchInput) return;
    const query = searchInput.value.trim();
    if (!query) return;

    const engineKey = getSettingsRef().engine || 'bing';
    const engineInfo = engines[engineKey] || engines.bing;
    const targetUrl = `${engineInfo.url}${encodeURIComponent(query)}`;

    const overlay = document.getElementById('searchTransition');
    if (overlay) overlay.classList.add('active');
    searchInput.blur();
    if (searchBtn) searchBtn.disabled = true;

    searchTimer = window.setTimeout(() => {
        window.location.href = targetUrl;
    }, 500);
}

function updateDisplay() {
    const engineKey = getSettingsRef().engine || 'bing';
    const engineInfo = engines[engineKey] || engines.bing;

    if (searchInput) {
        searchInput.placeholder = `在 ${engineInfo.name_en} 上搜索...`;
    }

    if (engineDisplay) {
        engineDisplay.innerHTML = `
            <div class="engine-icon" style="-webkit-mask-image: url('${engineInfo.icon}'); mask-image: url('${engineInfo.icon}');"></div>
            <h1>${engineInfo.name}</h1>
        `;
    }
}

const manifest = {
    id: 'search',
    type: 'core',
    name: '搜索',
    description: '中央搜索框，可切换搜索引擎',
    icon: ICON_SEARCH,
    version: '1.0.0',
    author: 'Leaf Tab',
    removable: false,
    defaultPosition: { cell: 'MC', colSpan: 1, rowSpan: 1 },
    configSchema: [],

    mount(container, ctx) {
        getSettingsRef = ctx.getSettings;

        rootEl = document.createElement('div');
        rootEl.className = 'widget-search';
        rootEl.innerHTML = `
            <div class="engine-display" id="engineDisplay"></div>
            <div class="search-container">
                <span class="search-icon">${ICON_SEARCH}</span>
                <input type="text" id="searchInput" class="search-input" placeholder="在网络上搜索..." autocomplete="off">
                <button type="button" id="searchBtn" class="search-btn" aria-label="搜索">${ICON_ARROW}</button>
            </div>
        `;
        container.appendChild(rootEl);

        searchInput = rootEl.querySelector('#searchInput');
        searchBtn = rootEl.querySelector('#searchBtn');
        engineDisplay = rootEl.querySelector('#engineDisplay');

        searchInput.addEventListener('keydown', (e) => {
            if (isImeConfirmEvent(e)) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
        searchBtn.addEventListener('click', performSearch);

        updateDisplay();

        // 延迟自动聚焦（给入场动画留时间）
        setTimeout(() => {
            searchInput?.focus();
        }, 100);
    },

    unmount() {
        rootEl?.remove();
        rootEl = null;
        searchInput = null;
        searchBtn = null;
        engineDisplay = null;
        if (searchTimer !== null) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }
    },

    onSettingsChange() {
        updateDisplay();
    },

    onConfigChange() {
        // 无插件级 config
    }
};

export default manifest;
