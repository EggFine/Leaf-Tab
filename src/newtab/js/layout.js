// 动态网格布局引擎（含容器嵌套）
// - 读取 store 中的 grid 尺寸与 widgets 映射
// - 顶层 widget 挂载到 .widget-cell；容器挂在格子里，其子 widget 挂到容器的 children 槽
// - 浮层槽（*-float）作为 body 下的 fixed 层外挂

import { currentSettings, updateWidget, topLevelLocationKey } from './store.js';
import { getWidget, listAll } from './widgetRegistry.js';

const FLOAT_CELLS = ['BC-float', 'TL-float', 'TR-float'];

const mounted = new Map(); // widgetId -> { manifest, container, ctx }

function isFloatCell(name) {
    return typeof name === 'string' && FLOAT_CELLS.includes(name);
}

function isContainerEntry(entry) {
    return entry && entry.kind === 'container';
}

function isPluginInstalled(widgetId) {
    // 容器实例不在 registry 中，用 entry 判断
    const entry = currentSettings.widgets?.[widgetId];
    if (isContainerEntry(entry)) return true;
    const manifest = getWidget(widgetId);
    if (!manifest) return false;
    if (manifest.type === 'core' || manifest.type === 'container') return true;
    return (currentSettings.installedPlugins || []).includes(widgetId);
}

// 解析 widget 应当使用的 manifest：容器实例 → 模板
function resolveManifest(id, entry) {
    if (isContainerEntry(entry)) {
        const templateId = entry.containerType === 'col' ? 'col-container' : 'row-container';
        return getWidget(templateId);
    }
    return getWidget(id);
}

function buildContext(widgetId, entry) {
    return {
        get config() {
            const latest = currentSettings.widgets?.[widgetId];
            return { ...(latest?.config || entry.config || {}) };
        },
        getSettings() {
            return currentSettings;
        },
        async updateConfig(patch) {
            if (!patch || typeof patch !== 'object') return;
            await updateWidget(widgetId, { config: patch });
        }
    };
}

function currentDims() {
    return {
        rows: currentSettings.grid?.rows || 3,
        cols: currentSettings.grid?.cols || 3
    };
}

function ensureGridHost() {
    let grid = document.querySelector('.widget-grid');
    if (!grid) {
        grid = document.createElement('div');
        grid.className = 'widget-grid';
        document.body.appendChild(grid);
    }

    const { rows, cols } = currentDims();
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.dataset.rows = String(rows);
    grid.dataset.cols = String(cols);

    const existing = [...grid.querySelectorAll('.widget-cell')];
    const expected = rows * cols;
    const matches = existing.length === expected && existing.every(el => {
        const r = parseInt(el.dataset.row, 10);
        const c = parseInt(el.dataset.col, 10);
        return r >= 1 && r <= rows && c >= 1 && c <= cols;
    });

    if (!matches) {
        existing.forEach(el => el.remove());
        for (let r = 1; r <= rows; r++) {
            for (let c = 1; c <= cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'widget-cell';
                cell.dataset.row = String(r);
                cell.dataset.col = String(c);
                cell.style.gridRow = String(r);
                cell.style.gridColumn = String(c);
                if (r === 1) cell.classList.add('cell-edge-top');
                if (r === rows) cell.classList.add('cell-edge-bottom');
                if (c === 1) cell.classList.add('cell-edge-left');
                if (c === cols) cell.classList.add('cell-edge-right');
                grid.appendChild(cell);
            }
        }
    }

    return grid;
}

function ensureFloatHost(cellName) {
    let host = document.querySelector(`.widget-float[data-area="${cellName}"]`);
    if (!host) {
        host = document.createElement('div');
        host.className = 'widget-float';
        host.dataset.area = cellName;
        document.body.appendChild(host);
    }
    return host;
}

function getTopLevelCellHost(entry) {
    if (isFloatCell(entry?.cell)) {
        return ensureFloatHost(entry.cell);
    }
    if (!Number.isInteger(entry?.row) || !Number.isInteger(entry?.col)) return null;
    ensureGridHost();
    return document.querySelector(
        `.widget-cell[data-row="${entry.row}"][data-col="${entry.col}"]`
    );
}

function cleanupMounted(id) {
    const record = mounted.get(id);
    if (!record) return;
    try {
        record.manifest.unmount?.();
    } catch (err) {
        console.error(`Widget ${id} unmount failed`, err);
    }
    if (record.container?.parentElement) {
        record.container.innerHTML = '';
    }
    mounted.delete(id);
}

function clearAllSlots() {
    document.querySelectorAll('.widget-grid .widget-cell').forEach(cell => {
        cell.innerHTML = '';
    });
    document.querySelectorAll('.widget-float').forEach(host => {
        host.innerHTML = '';
    });
    for (const id of [...mounted.keys()]) {
        cleanupMounted(id);
    }
}

function shouldRender(id, entry, manifest) {
    if (!entry) return false;
    const hideable = manifest?.hideable !== false;
    if (hideable && !entry.visible) return false;
    if (!isPluginInstalled(id)) return false;
    return true;
}

// 在给定宿主元素内挂载一个 widget
function mountAt(host, id, entry) {
    const manifest = resolveManifest(id, entry);
    if (!manifest) {
        console.warn(`No manifest resolved for widget "${id}"`);
        return null;
    }

    if (!shouldRender(id, entry, manifest)) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'widget-slot';
    wrapper.dataset.widgetId = id;
    if (isContainerEntry(entry)) {
        wrapper.classList.add('widget-slot-container');
    }
    host.appendChild(wrapper);

    const ctx = buildContext(id, entry);

    try {
        manifest.mount(wrapper, ctx);
    } catch (err) {
        console.error(`Widget ${id} mount failed`, err);
        wrapper.remove();
        return null;
    }

    mounted.set(id, { manifest, container: wrapper, ctx });
    return wrapper;
}

// 初次渲染
export function initLayout() {
    ensureGridHost();
    relayout();
}

// 完整重排
export function relayout() {
    clearAllSlots();
    ensureGridHost();

    const widgetsMap = currentSettings.widgets || {};

    // 按 parentId 索引子 widget
    const childrenByParent = new Map();
    for (const [id, entry] of Object.entries(widgetsMap)) {
        if (typeof entry.parentId === 'string') {
            if (!childrenByParent.has(entry.parentId)) {
                childrenByParent.set(entry.parentId, []);
            }
            childrenByParent.get(entry.parentId).push(id);
        }
    }

    // 复合排序：同位置内按 order 再按 id；跨位置先按 location key
    const sortedIds = Object.keys(widgetsMap).sort((a, b) => {
        const ea = widgetsMap[a];
        const eb = widgetsMap[b];
        const la = topLevelLocationKey(ea) || `parent:${ea.parentId || ''}`;
        const lb = topLevelLocationKey(eb) || `parent:${eb.parentId || ''}`;
        if (la !== lb) return la < lb ? -1 : 1;
        const oa = typeof ea.order === 'number' ? ea.order : Infinity;
        const ob = typeof eb.order === 'number' ? eb.order : Infinity;
        if (oa !== ob) return oa - ob;
        return a.localeCompare(b);
    });

    // 先挂顶层 widget
    for (const id of sortedIds) {
        const entry = widgetsMap[id];
        if (typeof entry.parentId === 'string') continue; // 子 widget 稍后处理

        const host = getTopLevelCellHost(entry);
        if (!host) continue;

        const slot = mountAt(host, id, entry);
        if (!slot) continue;

        // 若为容器，递归挂子 widget
        if (isContainerEntry(entry)) {
            const childHost = slot.querySelector('[data-role="children"]');
            if (childHost) {
                const childIds = (childrenByParent.get(id) || []).slice().sort();
                // 若容器声明了 childOrder，按声明顺序先排
                const ordered = orderChildren(childIds, entry.childOrder);
                for (const childId of ordered) {
                    const childEntry = widgetsMap[childId];
                    if (!childEntry) continue;
                    mountAt(childHost, childId, childEntry);
                }
            }
        }
    }

    notifyWidgetsSettingsChanged();
}

function orderChildren(ids, declaredOrder) {
    if (!Array.isArray(declaredOrder) || declaredOrder.length === 0) return ids;
    const setIds = new Set(ids);
    const ordered = [];
    const used = new Set();
    for (const id of declaredOrder) {
        if (setIds.has(id)) {
            ordered.push(id);
            used.add(id);
        }
    }
    for (const id of ids) {
        if (!used.has(id)) ordered.push(id);
    }
    return ordered;
}

// 仅通知现有 widget 设置变更（不重新挂载）
export function notifyWidgetsSettingsChanged() {
    for (const [id, record] of mounted.entries()) {
        try {
            record.manifest.onSettingsChange?.(currentSettings, record.ctx);
        } catch (err) {
            console.error(`Widget ${id} onSettingsChange failed`, err);
        }
    }
}

export function notifyWidgetConfigChanged(id) {
    const record = mounted.get(id);
    if (!record) return;
    try {
        record.manifest.onConfigChange?.(record.ctx.config, record.ctx);
    } catch (err) {
        console.error(`Widget ${id} onConfigChange failed`, err);
    }
}
