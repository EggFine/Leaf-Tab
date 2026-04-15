import { loadSettings, updateSettings, onSettingsChanged, currentSettings } from '../../newtab/js/store.js';
import { applyTheme } from '../../newtab/js/theme.js';

// Tab 配置
const TAB_CONFIG = {
    general: {
        title: '常规设置',
        file: 'tabs/general.html'
    },
    appearance: {
        title: '外观',
        file: 'tabs/appearance.html'
    },
    search: {
        title: '搜索引擎',
        file: 'tabs/search.html'
    },
    plugins: {
        title: '插件商城',
        file: 'tabs/plugins.html',
        module: './tabs/plugins.js'
    },
    layout: {
        title: '布局 DIY',
        file: 'tabs/layout.html',
        module: './tabs/layout.js'
    },
    about: {
        title: '关于',
        file: 'tabs/about.html'
    }
};

// 持有动态加载的 tab 模块 cleanup 函数
let currentTabCleanup = null;

let currentTab = 'general';
let selectControls = {};

// 动态加载 tab 内容
async function loadTabContent(tabName) {
    const config = TAB_CONFIG[tabName];
    if (!config) {
        console.error(`Tab ${tabName} not found`);
        return;
    }

    const tabContent = document.getElementById('tabContent');
    const currentTabTitle = document.getElementById('currentTabTitle');

    try {
        // 触发上一个 tab 的 cleanup
        if (typeof currentTabCleanup === 'function') {
            try { currentTabCleanup(); } catch (e) { console.error(e); }
            currentTabCleanup = null;
        }

        // 淡出动画
        if (tabContent) {
            tabContent.style.opacity = '0';
            tabContent.style.transform = 'translateY(10px)';
        }

        // 等待淡出完成
        await new Promise(resolve => setTimeout(resolve, 200));

        // 加载 HTML 内容
        const response = await fetch(config.file);
        if (!response.ok) {
            throw new Error(`Failed to load ${config.file}`);
        }

        const html = await response.text();

        // 更新标题和内容
        if (currentTabTitle) {
            currentTabTitle.textContent = config.title;
        }

        if (tabContent) {
            tabContent.innerHTML = html;

            // 触发淡入动画
            requestAnimationFrame(() => {
                tabContent.style.opacity = '1';
                tabContent.style.transform = 'translateY(0)';
            });
        }

        // 重新初始化该 tab 的下拉框
        initializeTabControls(tabName);

        // 加载外部 tab 模块（插件商城 / 布局编辑器）
        if (config.module) {
            try {
                const mod = await import(config.module);
                if (typeof mod.init === 'function' && tabContent) {
                    const maybeCleanup = await mod.init(tabContent);
                    if (typeof maybeCleanup === 'function') {
                        currentTabCleanup = maybeCleanup;
                    }
                }
            } catch (err) {
                console.error(`Failed to load tab module ${config.module}`, err);
            }
        }

    } catch (error) {
        console.error(`Error loading tab ${tabName}:`, error);
        if (tabContent) {
            tabContent.innerHTML = '<div class="setting-group"><p class="setting-desc">加载失败，请刷新页面重试。</p></div>';
            tabContent.style.opacity = '1';
            tabContent.style.transform = 'translateY(0)';
        }
    }
}

// 初始化特定 tab 的控件
function initializeTabControls(tabName) {
    // 清除旧的控件引用
    selectControls = {};

    if (tabName === 'appearance') {
        selectControls.theme = setupCustomSelect('themeSelect', async (value) => {
            await updateSettings({ theme: value });
            applyTheme();
        });
        selectControls.theme.setValue(currentSettings.theme);
    } else if (tabName === 'search') {
        selectControls.engine = setupCustomSelect('engineSelect', async (value) => {
            await updateSettings({ engine: value });
        });
        selectControls.engine.setValue(currentSettings.engine);
    }
    // general tab 已无动态控件；插件/布局 tab 由各自模块负责初始化
}

function setupCustomSelect(selectId, onChange) {
    const wrapper = document.getElementById(selectId);
    if (!wrapper) {
        return {
            setValue: () => {}
        };
    }

    const selectElement = wrapper.querySelector('.custom-select');
    const selectedValueDisplay = wrapper.querySelector('.selected-value');
    const optionsContainer = wrapper.querySelector('.custom-options');
    const options = Array.from(wrapper.querySelectorAll('.custom-option'));

    if (!selectElement || !selectedValueDisplay || !optionsContainer || options.length === 0) {
        return {
            setValue: () => {}
        };
    }

    const labelText = wrapper.closest('.setting-item')?.querySelector('label')?.textContent?.trim();
    const listboxId = `${selectId}-listbox`;

    optionsContainer.id = listboxId;
    optionsContainer.setAttribute('role', 'listbox');
    if (labelText) {
        optionsContainer.setAttribute('aria-label', labelText);
    }

    selectElement.setAttribute('role', 'combobox');
    selectElement.setAttribute('aria-haspopup', 'listbox');
    selectElement.setAttribute('aria-controls', listboxId);
    selectElement.setAttribute('aria-expanded', 'false');
    if (labelText) {
        selectElement.setAttribute('aria-label', labelText);
    }

    options.forEach((option, index) => {
        option.id = `${selectId}-option-${index}`;
        option.setAttribute('role', 'option');
        option.setAttribute('tabindex', '-1');
        option.setAttribute('aria-selected', 'false');
    });

    function getSelectedOption() {
        return options.find(option => option.classList.contains('selected')) ?? options[0];
    }

    function setExpanded(isOpen) {
        wrapper.classList.toggle('open', isOpen);
        selectElement.setAttribute('aria-expanded', String(isOpen));
    }

    function focusOption(option) {
        if (!option) {
            return;
        }

        options.forEach(opt => {
            opt.tabIndex = -1;
        });

        option.tabIndex = 0;
        option.focus();
        selectElement.setAttribute('aria-activedescendant', option.id);
    }

    function closeDropdown({ restoreFocus = false } = {}) {
        setExpanded(false);
        options.forEach(option => {
            option.tabIndex = -1;
        });

        const selectedOption = getSelectedOption();
        if (selectedOption) {
            selectElement.setAttribute('aria-activedescendant', selectedOption.id);
        }

        if (restoreFocus) {
            selectElement.focus();
        }
    }

    function openDropdown(focusTarget = getSelectedOption()) {
        setExpanded(true);
        focusOption(focusTarget);
    }

    function moveFocus(step) {
        const activeOption = options.find(option => option === document.activeElement) ?? getSelectedOption();
        const currentIndex = Math.max(options.indexOf(activeOption), 0);
        const nextIndex = (currentIndex + step + options.length) % options.length;
        focusOption(options[nextIndex]);
    }

    function selectOption(option, { restoreFocus = true, shouldNotify = true } = {}) {
        if (!option) {
            return;
        }

        const currentValue = getSelectedOption()?.getAttribute('data-value');
        const nextValue = option.getAttribute('data-value');

        options.forEach(opt => {
            const isSelected = opt === option;
            opt.classList.toggle('selected', isSelected);
            opt.setAttribute('aria-selected', String(isSelected));
        });

        selectedValueDisplay.textContent = option.textContent.trim();
        closeDropdown({ restoreFocus });

        if (shouldNotify && onChange && nextValue && nextValue !== currentValue) {
            Promise.resolve(onChange(nextValue)).catch(error => {
                console.error(`Failed to update ${selectId}`, error);
            });
        }
    }

    selectElement.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select-wrapper').forEach(el => {
            if (el !== wrapper) {
                el.classList.remove('open');
                el.querySelector('.custom-select')?.setAttribute('aria-expanded', 'false');
            }
        });

        if (wrapper.classList.contains('open')) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    options.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            selectOption(option);
        });

        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectOption(option);
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveFocus(1);
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveFocus(-1);
                return;
            }

            if (e.key === 'Home') {
                e.preventDefault();
                focusOption(options[0]);
                return;
            }

            if (e.key === 'End') {
                e.preventDefault();
                focusOption(options[options.length - 1]);
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                closeDropdown({ restoreFocus: true });
            }
        });
    });

    selectElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (wrapper.classList.contains('open')) {
                closeDropdown();
            } else {
                openDropdown();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!wrapper.classList.contains('open')) {
                openDropdown();
            } else {
                moveFocus(1);
            }
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!wrapper.classList.contains('open')) {
                openDropdown(getSelectedOption());
            } else {
                moveFocus(-1);
            }
            return;
        }

        if (e.key === 'Escape' && wrapper.classList.contains('open')) {
            e.preventDefault();
            closeDropdown();
        }
    });

    wrapper.addEventListener('focusout', (e) => {
        if (!wrapper.contains(e.relatedTarget)) {
            closeDropdown();
        }
    });

    return {
        setValue: (value) => {
            const opt = options.find(o => o.getAttribute('data-value') === value);
            if (opt) {
                selectOption(opt, { restoreFocus: false, shouldNotify: false });
            }
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    void initializeSettingsPage();
});

async function initializeSettingsPage() {
    // 1. 加载配置并应用主题
    await loadSettings();
    applyTheme();

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentSettings.theme === 'system') {
            applyTheme();
        }
    });

    // 2. 返回按钮
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // 直接导航到新标签页
            window.location.href = chrome.runtime.getURL('src/newtab/index.html');
        });
    }

    // 3. 选项卡切换逻辑
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('click', async () => {
            const targetTab = item.getAttribute('data-tab');
            if (targetTab === currentTab) {
                return;
            }

            // 更新菜单高亮
            menuItems.forEach(btn => btn.classList.remove('active'));
            item.classList.add('active');

            // 加载新 tab 内容
            currentTab = targetTab;
            await loadTabContent(targetTab);
        });
    });

    // 4. 加载默认 tab
    await loadTabContent(currentTab);

    // 5. 监听设置变化
    onSettingsChanged(() => {
        applyTheme();
        // 更新当前 tab 的控件值
        if (selectControls.theme) {
            selectControls.theme.setValue(currentSettings.theme);
        }
        if (selectControls.engine) {
            selectControls.engine.setValue(currentSettings.engine);
        }
    });

    // 6. 点击空白处关闭下拉框
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(el => {
            if (el.contains(e.target)) {
                return;
            }

            el.classList.remove('open');
            el.querySelector('.custom-select')?.setAttribute('aria-expanded', 'false');
            el.querySelectorAll('.custom-option').forEach(option => {
                option.tabIndex = -1;
            });
        });
    });
}
