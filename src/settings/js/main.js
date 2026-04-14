import { loadSettings, saveSettings, currentSettings } from '../../newtab/js/store.js';
import { applyTheme } from '../../newtab/js/theme.js';

function setupCustomSelect(selectId, onChange) {
    const wrapper = document.getElementById(selectId);
    if (!wrapper) return;
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

document.addEventListener('DOMContentLoaded', () => {
    // 1. 加载配置并应用主题
    loadSettings();
    applyTheme();

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentSettings.theme === 'system') {
            applyTheme();
        }
    });

    // Listen for storage changes from other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'leaf-settings') {
            loadSettings();
            applyTheme();
            themeSelectControl.setValue(currentSettings.theme);
            engineSelectControl.setValue(currentSettings.engine);
        }
    });

    // 2. 选项卡切换逻辑
    const menuItems = document.querySelectorAll('.menu-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const currentTabTitle = document.getElementById('currentTabTitle');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // 更新菜单高亮
            menuItems.forEach(btn => btn.classList.remove('active'));
            item.classList.add('active');

            // 更新标题
            if (currentTabTitle) {
                currentTabTitle.textContent = item.textContent.trim();
            }

            // 切换内容区
            const targetTabId = item.getAttribute('data-tab');
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTabId}`) {
                    pane.classList.add('active');
                }
            });
        });
    });

    // 3. 初始化下拉框并绑定回调
    const themeSelectControl = setupCustomSelect('themeSelect', (value) => {
        currentSettings.theme = value;
        saveSettings();
        applyTheme();
    });

    const engineSelectControl = setupCustomSelect('engineSelect', (value) => {
        currentSettings.engine = value;
        saveSettings();
    });

    // 同步 UI 状态
    themeSelectControl.setValue(currentSettings.theme);
    engineSelectControl.setValue(currentSettings.engine);

    // 点击空白处关闭下拉框
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(el => {
            el.classList.remove('open');
        });
    });
});