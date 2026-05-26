// brand core widget —— 底部品牌 Logo 浮层
// 仅为浮层槽设计；即使被放到普通格子也能正常渲染

const LEAF_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="brand-svg"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>`;

let rootEl = null;

const manifest = {
    id: 'brand',
    type: 'core',
    name: 'widget.brand.name',
    description: 'widget.brand.description',
    icon: LEAF_ICON,
    version: '1.0.0',
    author: 'Leaf Tab',
    removable: false,
    hideable: false,
    defaultPosition: { cell: 'BC-float', colSpan: 1, rowSpan: 1 },
    configSchema: [],

    mount(container) {
        rootEl = document.createElement('div');
        rootEl.className = 'brand-corner';
        rootEl.innerHTML = `
            ${LEAF_ICON}
            <span>Leaf Tab</span>
        `;
        container.appendChild(rootEl);
    },

    unmount() {
        rootEl?.remove();
        rootEl = null;
    },

    onSettingsChange() {},
    onConfigChange() {}
};

export default manifest;
