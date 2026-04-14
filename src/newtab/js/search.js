import { currentSettings } from './store.js';

const engines = {
    'bing': { 
        url: 'https://www.bing.com/search?q=', 
        name: 'Bing',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3L5 6v12l4 3v-9l6-2v4l4 1V9l-10-4z"/></svg>`
    },
    'google': { 
        url: 'https://www.google.com/search?q=', 
        name: 'Google',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 12.2A9.5 9.5 0 1 0 12 21.5c4.7 0 8.5-3.3 9.4-7.8H12v-3.8h9.5z"/></svg>`
    },
    'baidu': { 
        url: 'https://www.baidu.com/s?wd=', 
        name: '百度',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 1 0 0-4.5zM7 7.5A2.5 2.5 0 1 0 7 12a2.5 2.5 0 1 0 0-4.5zM17 7.5a2.5 2.5 0 1 0 0 4.5 2.5 2.5 0 1 0 0-4.5zM12 11c-3.5 0-6 2.5-6 6 0 2 1.5 3 3 3h6c1.5 0 3-1 3-3 0-3.5-2.5-6-6-6z"/></svg>`
    }
};

export function updateSearchPlaceholder() {
    const searchInput = document.getElementById('searchInput');
    const engineDisplay = document.getElementById('engineDisplay');
    
    const engineInfo = engines[currentSettings.engine] || engines['bing'];
    
    if (searchInput) {
        searchInput.placeholder = `在 ${engineInfo.name} 上搜索...`;
    }
    
    if (engineDisplay) {
        // 横向排列 [logo][引擎名]
        engineDisplay.innerHTML = `
            ${engineInfo.svg}
            <h1>${engineInfo.name}</h1>
        `;
    }
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
    
    // 初始化时设置占位符和引擎显示
    updateSearchPlaceholder();
}