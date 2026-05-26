// 列容器 —— 模板 manifest
// 实例以 'container-*' 为 id，kind: 'container', containerType: 'col'

const COL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="3" width="8" height="5" rx="1"></rect><rect x="8" y="10" width="8" height="5" rx="1"></rect><rect x="8" y="17" width="8" height="4" rx="1"></rect></svg>`;

const manifest = {
    id: 'col-container',
    type: 'container',
    kind: 'container',
    containerType: 'col',
    name: 'widget.colContainer.name',
    description: 'widget.colContainer.description',
    icon: COL_ICON,
    version: '1.0.0',
    author: 'Leaf Tab',
    removable: false,
    hideable: true,
    configSchema: [],

    mount(container /*, ctx */) {
        const root = document.createElement('div');
        root.className = 'widget-col-container';
        root.innerHTML = `<div class="widget-container-children" data-role="children"></div>`;
        container.appendChild(root);
    },

    unmount() {},

    onSettingsChange() {},
    onConfigChange() {}
};

export default manifest;
