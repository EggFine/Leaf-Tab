document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const searchTransition = document.getElementById('searchTransition');

    // ==================== 状态与存储管理 ====================
    const defaultSettings = {
        theme: 'system', // 'system', 'light', 'dark'
        engine: 'bing'   // 'bing', 'google', 'baidu'
    };

    let currentSettings = { ...defaultSettings };

    function saveSettings() {
        localStorage.setItem('leaf-settings', JSON.stringify(currentSettings));
    }

    // ==================== 自定义下拉框逻辑 ====================
    function setupCustomSelect(selectId, onChange) {
        const wrapper = document.getElementById(selectId);
        const selectElement = wrapper.querySelector('.custom-select');
        const selectedValueDisplay = wrapper.querySelector('.selected-value');
        const options = wrapper.querySelectorAll('.custom-option');

        // Toggle dropdown
        selectElement.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper').forEach(el => {
                if (el !== wrapper) el.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });

        // Option click
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                
                // 更新显示与样式
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                selectedValueDisplay.textContent = option.textContent;
                
                wrapper.classList.remove('open');

                if (onChange) onChange(value);
            });
        });

        // 返回设置值的方法
        return {
            setValue: (value) => {
                const opt = Array.from(options).find(o => o.getAttribute('data-value') === value);
                if (opt) {
                    options.forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    selectedValueDisplay.textContent = opt.textContent;
                }
            }
        };
    }

    // 点击空白处关闭下拉框
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(el => {
            el.classList.remove('open');
        });
    });

    let themeSelectControl;
    let engineSelectControl;

    // ==================== 初始化与加载 ====================
    function loadSettings() {
        const saved = localStorage.getItem('leaf-settings');
        if (saved) {
            try {
                currentSettings = { ...defaultSettings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
        
        // 同步 UI 状态
        themeSelectControl.setValue(currentSettings.theme);
        engineSelectControl.setValue(currentSettings.engine);
    }

    // ==================== 主题逻辑 ====================
    function applyTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        let shouldUseDark = false;

        if (currentSettings.theme === 'dark') {
            shouldUseDark = true;
        } else if (currentSettings.theme === 'system' && prefersDark) {
            shouldUseDark = true;
        }

        if (shouldUseDark) {
            body.classList.add('dark-theme');
        } else {
            body.classList.remove('dark-theme');
        }
    }

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentSettings.theme === 'system') {
            applyTheme();
        }
    });

    themeToggle.addEventListener('click', () => {
        const isCurrentlyDark = body.classList.contains('dark-theme');
        const newTheme = isCurrentlyDark ? 'light' : 'dark';
        
        currentSettings.theme = newTheme;
        themeSelectControl.setValue(newTheme);
        
        saveSettings();
        applyTheme();
    });

    // ==================== 设置面板逻辑 ====================
    function openSettings() {
        settingsOverlay.classList.add('active');
    }

    function closeSettings() {
        settingsOverlay.classList.remove('active');
        // 关闭所有可能打开的下拉框
        document.querySelectorAll('.custom-select-wrapper').forEach(el => {
            el.classList.remove('open');
        });
        searchInput.focus(); 
    }

    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) {
            closeSettings();
        }
    });

    // 初始化下拉框并绑定回调
    themeSelectControl = setupCustomSelect('themeSelect', (value) => {
        currentSettings.theme = value;
        saveSettings();
        applyTheme();
    });

    engineSelectControl = setupCustomSelect('engineSelect', (value) => {
        currentSettings.engine = value;
        saveSettings();
    });

    // ==================== 搜索与过渡逻辑 ====================
    const engines = {
        'bing': 'https://www.bing.com/search?q=',
        'google': 'https://www.google.com/search?q=',
        'baidu': 'https://www.baidu.com/s?wd='
    };

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
    
    // ==================== 初始化与入场动画 ====================
    loadSettings();
    applyTheme();
    
    setTimeout(() => {
        body.classList.add('loaded');
        searchInput.focus();
    }, 50);
});