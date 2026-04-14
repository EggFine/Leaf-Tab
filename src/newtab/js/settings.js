export function setupCustomSelect(selectId, onChange) {
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

export function initSettingsOverlay() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const searchInput = document.getElementById('searchInput');

    // 选项卡切换逻辑
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

    // 点击空白处关闭下拉框
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(el => {
            el.classList.remove('open');
        });
    });
}