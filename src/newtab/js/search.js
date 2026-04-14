import { currentSettings } from './store.js';

const engines = {
    'bing': 'https://www.bing.com/search?q=',
    'google': 'https://www.google.com/search?q=',
    'baidu': 'https://www.baidu.com/s?wd='
};

export function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchTransition = document.getElementById('searchTransition');

    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            const engineUrl = engines[currentSettings.engine] || engines['bing'];
            const targetUrl = `${engineUrl}${encodeURIComponent(query)}`;
            
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
}