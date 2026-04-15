// 行容器 —— 模板 manifest
// 每个容器实例通过 widget 注册表以 id='row-container' 查找此模板使用
// 实际实例在 widgets map 中以 'container-*' 为 id，kind: 'container', containerType: 'row'

const ROW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="5" height="8" rx="1"></rect><rect x="10" y="8" width="5" height="8" rx="1"></rect><rect x="17" y="8" width="4" height="8" rx="1"></rect></svg>`;

const manifest = {
    id: 'row-container',
    type: 'container',
    kind: 'container',
    containerType: 'row',
    name: '行组件',
    description: '横向排列多个模块；将 widget 拖入其中创建组合布局',
    icon: ROW_ICON,
    version: '1.0.0',
    author: 'Leaf Tab',
    removable: false,
    hideable: true,
    configSchema: [],

    mount(container /*, ctx */) {
        const root = document.createElement('div');
        root.className = 'widget-row-container';
        root.innerHTML = `<div class="widget-container-children" data-role="children"></div>`;
        container.appendChild(root);
        // 返回一个标识：layout 引擎会通过 data-role="children" 查找挂载点
    },

    unmount() {
        // 子 widget 卸载由 layout 引擎统一处理
    },

    onSettingsChange() {},
    onConfigChange() {}
};

export default manifest;
