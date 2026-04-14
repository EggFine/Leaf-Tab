import { currentSettings } from './store.js';

const engines = {
    'bing': { url: 'https://www.bing.com/search?q=', name: 'Bing' },
    'google': { url: 'https://www.google.com/search?q=', name: 'Google' },
    'baidu': { url: 'https://www.baidu.com/s?wd=', name: '百度' }
};

export function updateSearchPlaceholder() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const engineInfo = engines[currentSettings.engine] || engines['bing'];
    searchInput.placeholder = `在 ${engineInfo.name} 上搜索...`;
}

export function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchTransition = document.getElementById('searchTransition');

    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            const engineInfo = engines[currentSettings.engine] || engines['bing'];
            const targetUrl = `${engineInfo.url}${encodeURIComponent(query)}`;
            
            searchTransition.classList.add('active');
            searchInput.blur();
            
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 500); 
        }
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    searchBtn.addEventListener('click', performSearch);
    
    // 初始化时设置占位符
    updateSearchPlaceholder();
}