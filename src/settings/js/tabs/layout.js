// 布局 DIY 编辑器 —— 九宫格 + 行/列容器 + 嵌套拖拽
import {
    currentSettings,
    updateWidgets,
    addContainer,
    removeContainer,
    reorderSibling,
    resetLayout,
    onSettingsChanged,
    topLevelLocationKey,
    DEFAULT_GRID
} from '../../../newtab/js/store.js';
import { t } from '../../../common/i18n.js';

// 常规 widget manifest（core + plugins）
import searchManifest from '../../../newtab/js/widgets/core/search.js';
import themeToggleManifest from '../../../newtab/js/widgets/core/themeToggle.js';
import settingsBtnManifest from '../../../newtab/js/widgets/core/settingsBtn.js';
import brandManifest from '../../../newtab/js/widgets/core/brand.js';
import bookmarksManifest from '../../../newtab/js/widgets/plugins/bookmarks/index.js';
// 容器模板（仅用于拿 icon/name 等元信息）
import rowContainerTemplate from '../../../newtab/js/widgets/core/containers/row.js';
import colContainerTemplate from '../../../newtab/js/widgets/core/containers/col.js';

const STATIC_MANIFESTS = [
    searchManifest,
    themeToggleManifest,
    settingsBtnManifest,
    brandManifest,
    bookmarksManifest
];
const CONTAINER_TEMPLATES = {
    row: rowContainerTemplate,
    col: colContainerTemplate
};

const FLOAT_CELLS = new Set(['BC-float', 'TL-float', 'TR-float']);

// 解析一个 widget id 的 manifest：容器实例 → 模板；其他 → 静态 manifest
function resolveManifest(id, entry) {
    if (entry?.kind === 'container') {
        return CONTAINER_TEMPLATES[entry.containerType === 'col' ? 'col' : 'row'];
    }
    return STATIC_MANIFESTS.find(m => m.id === id);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function isWidgetAvailable(id, entry) {
    if (entry?.kind === 'container') return true;
    const manifest = STATIC_MANIFESTS.find(m => m.id === id);
    if (!manifest) return false;
    if (manifest.type === 'core' || manifest.type === 'container') return true;
    // 插件：必须已安装
    return (currentSettings.installedPlugins || []).includes(id);
}

function currentDims() {
    return {
        rows: currentSettings.grid?.rows || DEFAULT_GRID.rows,
        cols: currentSettings.grid?.cols || DEFAULT_GRID.cols
    };
}

function renderChip(id, entry, manifest, opts = {}) {
    // reorderDirection: 'horizontal' | 'vertical' | null —— 是否显示左右/上下排序按钮
    const {
        reorderDirection = null,
        isFirstSibling = false,
        isLastSibling = false,
        isChild = false
    } = opts;
    const isContainer = entry?.kind === 'container';
    const visible = entry?.visible !== false;
    const hideable = manifest?.hideable !== false;
    const typeTag = isContainer
        ? (entry.containerType === 'col' ? t('settings.plugins.tag.colContainer') : t('settings.plugins.tag.rowContainer'))
        : (manifest.type === 'core'
            ? (hideable ? t('settings.plugins.tag.core') : t('settings.plugins.tag.coreRequired'))
            : t('settings.plugins.tag.plugin'));
    const typeClass = isContainer
        ? 'container'
        : (manifest.type === 'core' ? 'core' : 'plugin');
    const tooltip = hideable
        ? t('settings.layout.chip.dragHint')
        : t('settings.layout.chip.nonHideable');

    const nameDisplay = escapeHtml(t(manifest.name));

    const containerBody = isContainer
        ? `
        <div class="layout-chip-children" data-drop-target="container" data-parent-id="${id}">
            <span class="layout-chip-children-hint">${escapeHtml(t('settings.layout.chip.children.hint'))}</span>
        </div>
        `
        : '';

    const deleteBtn = isContainer
        ? `<button type="button" class="layout-chip-delete" data-role="delete-container" data-widget-id="${id}" title="${escapeHtml(t('settings.layout.chip.delete.title'))}" aria-label="${escapeHtml(t('settings.layout.chip.delete.aria'))}">×</button>`
        : '';

    // 排序按钮：容器子项、同格子兄弟 widget、同浮层槽兄弟都会显示
    let reorderActions = '';
    if (reorderDirection) {
        const isVertical = reorderDirection === 'vertical';
        const prevLabel = isVertical ? t('settings.layout.reorder.up') : t('settings.layout.reorder.left');
        const nextLabel = isVertical ? t('settings.layout.reorder.down') : t('settings.layout.reorder.right');
        const prevIcon = isVertical
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
        const nextIcon = isVertical
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        reorderActions = `
            <div class="layout-chip-reorder">
                <button type="button" class="layout-chip-reorder-btn" data-role="reorder" data-direction="prev" data-widget-id="${id}" title="${prevLabel}" aria-label="${prevLabel}" ${isFirstSibling ? 'disabled' : ''}>${prevIcon}</button>
                <button type="button" class="layout-chip-reorder-btn" data-role="reorder" data-direction="next" data-widget-id="${id}" title="${nextLabel}" aria-label="${nextLabel}" ${isLastSibling ? 'disabled' : ''}>${nextIcon}</button>
            </div>
        `;
    }

    return `
        <div class="layout-chip ${visible ? 'visible' : 'hidden'} layout-chip-${typeClass} ${hideable ? '' : 'non-hideable'} ${isContainer ? 'is-container' : ''} ${isChild ? 'is-child' : ''}"
             draggable="true"
             data-widget-id="${id}"
             data-hideable="${hideable}"
             data-is-container="${isContainer}"
             title="${tooltip}">
            <div class="layout-chip-header">
                <div class="layout-chip-icon">${manifest.icon || ''}</div>
                <div class="layout-chip-meta">
                    <div class="layout-chip-name">${nameDisplay}</div>
                    <div class="layout-chip-type">${typeTag}</div>
                </div>
                ${reorderActions}
                ${deleteBtn}
            </div>
            ${containerBody}
        </div>
    `;
}

// 将 ids 根据容器声明的 childOrder 排序（未声明或不存在的追加到末尾）
function applyChildOrder(ids, declaredOrder) {
    const set = new Set(ids);
    const ordered = [];
    const used = new Set();
    if (Array.isArray(declaredOrder)) {
        for (const id of declaredOrder) {
            if (set.has(id) && !used.has(id)) {
                ordered.push(id);
                used.add(id);
            }
        }
    }
    for (const id of ids.slice().sort()) {
        if (!used.has(id)) ordered.push(id);
    }
    return ordered;
}

function rebuildGridCells(grid, rows, cols) {
    grid.innerHTML = '';
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'layout-cell';
            cell.dataset.row = String(r);
            cell.dataset.col = String(c);
            cell.style.gridRow = String(r);
            cell.style.gridColumn = String(c);
            cell.setAttribute('data-drop-target', 'cell');

            const label = document.createElement('span');
            label.className = 'layout-cell-label';
            label.textContent = `${r}·${c}`;
            cell.appendChild(label);

            grid.appendChild(cell);
        }
    }
}

function renderAll(root) {
    const grid = root.querySelector('[data-role="grid"]');
    if (!grid) return;

    const { rows, cols } = currentDims();
    rebuildGridCells(grid, rows, cols);

    // 清空 float cells & tray
    root.querySelectorAll('.layout-cell-float').forEach(el => {
        [...el.querySelectorAll('.layout-chip')].forEach(c => c.remove());
    });
    const tray = root.querySelector('[data-role="tray"]');
    if (tray) tray.innerHTML = '';

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

    // 按"顶层位置"分组（仅计入可见 widget，供兄弟排序/按钮判断使用）
    const byLocation = new Map(); // locKey -> [id,...]（按 order+id 排序后）
    for (const [id, entry] of Object.entries(widgetsMap)) {
        if (typeof entry.parentId === 'string') continue;
        if (entry.visible === false) continue;
        const locKey = topLevelLocationKey(entry);
        if (!locKey) continue;
        if (!byLocation.has(locKey)) byLocation.set(locKey, []);
        byLocation.get(locKey).push(id);
    }
    // 每组按 order + id 排序
    for (const ids of byLocation.values()) {
        ids.sort((a, b) => {
            const oa = typeof widgetsMap[a].order === 'number' ? widgetsMap[a].order : Infinity;
            const ob = typeof widgetsMap[b].order === 'number' ? widgetsMap[b].order : Infinity;
            if (oa !== ob) return oa - ob;
            return a.localeCompare(b);
        });
    }

    // 渲染循环要遍历【所有】顶层 widget（包括隐藏项——它们需要进入 tray）
    // 可见项按 byLocation 顺序；隐藏项追加在末尾，tray 自行收纳
    const visibleIds = [];
    const sortedLocKeys = [...byLocation.keys()].sort();
    for (const locKey of sortedLocKeys) {
        visibleIds.push(...byLocation.get(locKey));
    }
    const hiddenIds = Object.keys(widgetsMap)
        .filter(id =>
            typeof widgetsMap[id].parentId !== 'string'
            && widgetsMap[id].visible === false
        )
        .sort();
    const topLevelIds = [...visibleIds, ...hiddenIds];

    for (const id of topLevelIds) {
        const entry = widgetsMap[id];
        if (!isWidgetAvailable(id, entry)) continue;
        const manifest = resolveManifest(id, entry);
        if (!manifest) continue;

        const visible = entry.visible !== false;
        const isHideable = manifest.hideable !== false;

        // 计算同位置兄弟信息
        const locKey = topLevelLocationKey(entry);
        const siblings = locKey ? (byLocation.get(locKey) || []) : [];
        const reorderDirection = siblings.length > 1
            ? (locKey.startsWith('float:') ? 'vertical' : 'horizontal')
            : null;
        const sIdx = siblings.indexOf(id);

        const html = renderChip(id, entry, manifest, {
            reorderDirection: visible ? reorderDirection : null, // 隐藏项无需排序
            isFirstSibling: sIdx === 0,
            isLastSibling: sIdx === siblings.length - 1
        });

        let placedContainer = null;

        // 浮层类
        if (typeof entry.cell === 'string' && FLOAT_CELLS.has(entry.cell)) {
            const floatCell = root.querySelector(`.layout-cell-float[data-cell="${entry.cell}"]`);
            if (floatCell) {
                floatCell.insertAdjacentHTML('beforeend', html);
                placedContainer = floatCell;
            }
        }

        // 隐藏（hideable 才能入 tray）
        if (!placedContainer && !visible && isHideable) {
            tray?.insertAdjacentHTML('beforeend', html);
            placedContainer = tray;
        }

        // 网格 widget
        if (!placedContainer && Number.isInteger(entry.row) && Number.isInteger(entry.col)) {
            const targetCell = root.querySelector(
                `.layout-cell[data-row="${entry.row}"][data-col="${entry.col}"]`
            );
            if (targetCell) {
                targetCell.insertAdjacentHTML('beforeend', html);
                placedContainer = targetCell;
            }
        }

        // 回落
        if (!placedContainer) {
            if (isHideable && tray) {
                tray.insertAdjacentHTML('beforeend', html);
                placedContainer = tray;
            } else {
                const defaultCell = manifest.defaultPosition?.cell;
                if (defaultCell && FLOAT_CELLS.has(defaultCell)) {
                    const fallback = root.querySelector(`.layout-cell-float[data-cell="${defaultCell}"]`);
                    if (fallback) {
                        fallback.insertAdjacentHTML('beforeend', html);
                        placedContainer = fallback;
                    }
                } else {
                    const firstCell = root.querySelector('.layout-cell[data-row="1"][data-col="1"]');
                    if (firstCell) {
                        firstCell.insertAdjacentHTML('beforeend', html);
                        placedContainer = firstCell;
                    }
                }
            }
        }

        // 若是容器且成功放置：把子 widget 渲染到 children zone
        if (entry.kind === 'container' && placedContainer) {
            const chipEl = placedContainer.querySelector(`.layout-chip[data-widget-id="${id}"]`);
            const childrenZone = chipEl?.querySelector('.layout-chip-children');
            if (childrenZone) {
                const rawChildIds = (childrenByParent.get(id) || [])
                    .filter(childId => isWidgetAvailable(childId, widgetsMap[childId]));
                const orderedIds = applyChildOrder(rawChildIds, entry.childOrder);
                const lastIdx = orderedIds.length - 1;
                const childDirection = entry.containerType === 'col' ? 'vertical' : 'horizontal';
                orderedIds.forEach((childId, index) => {
                    const childEntry = widgetsMap[childId];
                    if (!childEntry) return;
                    const childManifest = resolveManifest(childId, childEntry);
                    if (!childManifest) return;
                    childrenZone.insertAdjacentHTML('beforeend', renderChip(
                        childId, childEntry, childManifest,
                        {
                            isChild: true,
                            reorderDirection: childDirection,
                            isFirstSibling: index === 0,
                            isLastSibling: index === lastIdx
                        }
                    ));
                });
                if (orderedIds.length > 0) {
                    childrenZone.classList.add('has-children');
                }
            }
        }
    }

    // 孤儿子 widget（parentId 不存在或 parent 已被删）—— 放 tray
    for (const [id, entry] of Object.entries(widgetsMap)) {
        if (typeof entry.parentId !== 'string') continue;
        if (!widgetsMap[entry.parentId] || widgetsMap[entry.parentId].kind !== 'container') {
            if (!isWidgetAvailable(id, entry)) continue;
            const manifest = resolveManifest(id, entry);
            if (!manifest) continue;
            tray?.insertAdjacentHTML('beforeend', renderChip(id, entry, manifest));
        }
    }

    updateTrayEmptyState(root);
    updateCellOccupancy(root);
}

function updateTrayEmptyState(root) {
    const tray = root.querySelector('[data-role="tray"]');
    if (!tray) return;
    const hasChildren = tray.querySelector('.layout-chip') !== null;
    tray.classList.toggle('empty', !hasChildren);
    if (!hasChildren) {
        tray.innerHTML = `<div class="layout-tray-empty">${escapeHtml(t('settings.layout.tray.empty'))}</div>`;
    }
}

function updateCellOccupancy(root) {
    root.querySelectorAll('.layout-cell').forEach(cell => {
        const hasChip = cell.querySelector(':scope > .layout-chip') !== null;
        cell.classList.toggle('occupied', hasChip);
    });
}

async function handleDrop(widgetId, target) {
    if (!widgetId) return;
    const widgetsMap = currentSettings.widgets || {};
    const entry = widgetsMap[widgetId];
    if (!entry) return;
    const manifest = resolveManifest(widgetId, entry);
    if (!manifest) return;

    // 非 hideable 不能入 tray
    if (target.kind === 'tray' && manifest.hideable === false) {
        flashNonHideable(widgetId);
        return;
    }

    // 容器不能拖入自身或其子容器（MVP 禁止嵌套容器）
    if (target.kind === 'container' && entry.kind === 'container') {
        flashNonHideable(widgetId);
        return;
    }

    // 自拖入自身内部
    if (target.kind === 'container' && target.parentId === widgetId) return;

    const patch = {};
    if (target.kind === 'tray') {
        patch[widgetId] = { visible: false };
    } else if (target.kind === 'cell') {
        patch[widgetId] = { row: target.row, col: target.col, visible: true };
    } else if (target.kind === 'float') {
        patch[widgetId] = { cell: target.cell, visible: true };
    } else if (target.kind === 'container') {
        patch[widgetId] = { parentId: target.parentId, visible: true };
    } else {
        return;
    }

    try {
        await updateWidgets(patch);
    } catch (err) {
        console.error('Failed to update layout', err);
    }
}

function flashNonHideable(widgetId) {
    const chip = document.querySelector(`.layout-chip[data-widget-id="${widgetId}"]`);
    if (!chip) return;
    chip.classList.remove('shake');
    void chip.offsetWidth;
    chip.classList.add('shake');
    setTimeout(() => chip.classList.remove('shake'), 500);
}

function resolveTarget(el) {
    if (!el) return null;
    const kind = el.getAttribute('data-drop-target');
    if (!kind) return null;
    if (kind === 'tray') return { kind: 'tray' };
    if (kind === 'cell') {
        const row = parseInt(el.dataset.row, 10);
        const col = parseInt(el.dataset.col, 10);
        if (Number.isInteger(row) && Number.isInteger(col)) {
            return { kind: 'cell', row, col };
        }
    }
    if (kind === 'float') {
        return { kind: 'float', cell: el.dataset.cell };
    }
    if (kind === 'container') {
        return { kind: 'container', parentId: el.dataset.parentId };
    }
    return null;
}

function bindDnD(root) {
    let draggingChip = null;

    root.addEventListener('dragstart', (e) => {
        const chip = e.target.closest('.layout-chip');
        if (!chip) return;
        draggingChip = chip;
        chip.classList.add('dragging');
        try {
            e.dataTransfer.setData('text/plain', chip.dataset.widgetId);
            e.dataTransfer.effectAllowed = 'move';
        } catch {}
    });

    root.addEventListener('dragend', () => {
        if (draggingChip) draggingChip.classList.remove('dragging');
        draggingChip = null;
        root.querySelectorAll('.drag-over, .drag-over-reject').forEach(el => {
            el.classList.remove('drag-over');
            el.classList.remove('drag-over-reject');
        });
    });

    root.addEventListener('dragover', (e) => {
        const target = e.target.closest('[data-drop-target]');
        if (!target) return;

        const kind = target.getAttribute('data-drop-target');
        const isTray = kind === 'tray';
        const isContainerTarget = kind === 'container';
        const draggingIsContainer = draggingChip?.dataset.isContainer === 'true';
        const draggingIsNonHideable = draggingChip?.dataset.hideable === 'false';

        // 拒绝：非 hideable 入 tray
        if (isTray && draggingIsNonHideable) {
            try { e.dataTransfer.dropEffect = 'none'; } catch {}
            target.classList.add('drag-over-reject');
            return;
        }
        // 拒绝：容器入容器（避免嵌套容器 MVP）
        if (isContainerTarget && draggingIsContainer) {
            try { e.dataTransfer.dropEffect = 'none'; } catch {}
            target.classList.add('drag-over-reject');
            return;
        }
        // 拒绝：容器拖到自己的 children zone
        if (isContainerTarget && target.dataset.parentId === draggingChip?.dataset.widgetId) {
            try { e.dataTransfer.dropEffect = 'none'; } catch {}
            target.classList.add('drag-over-reject');
            return;
        }

        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch {}
        root.querySelectorAll('.drag-over, .drag-over-reject').forEach(el => {
            el.classList.remove('drag-over');
            el.classList.remove('drag-over-reject');
        });
        target.classList.add('drag-over');
    });

    root.addEventListener('dragleave', (e) => {
        const target = e.target.closest('[data-drop-target]');
        if (!target) return;
        if (!target.contains(e.relatedTarget)) {
            target.classList.remove('drag-over');
            target.classList.remove('drag-over-reject');
        }
    });

    root.addEventListener('drop', (e) => {
        const target = e.target.closest('[data-drop-target]');
        if (!target) return;
        e.preventDefault();
        const widgetId = draggingChip?.dataset.widgetId
            || e.dataTransfer.getData('text/plain');
        target.classList.remove('drag-over');
        target.classList.remove('drag-over-reject');

        const resolved = resolveTarget(target);
        if (!resolved) return;
        handleDrop(widgetId, resolved);
    });
}

// 降级：点击 chip → 选中 → 再点目标完成
function bindClickPlacement(root) {
    let pendingWidgetId = null;

    const clearPending = () => {
        root.querySelectorAll('.layout-chip.pending').forEach(el => el.classList.remove('pending'));
        root.querySelectorAll('[data-drop-target].pending-target')
            .forEach(el => el.classList.remove('pending-target'));
        pendingWidgetId = null;
    };

    root.addEventListener('click', (e) => {
        // 工具栏、删除、排序按钮不参与 chip 选择逻辑
        if (e.target.closest('.layout-toolbar')) return;
        if (e.target.closest('.layout-chip-delete')) return;
        if (e.target.closest('[data-role="reorder"]')) return;

        const chip = e.target.closest('.layout-chip');
        const target = e.target.closest('[data-drop-target]');

        if (chip && !target) {
            clearPending();
            chip.classList.add('pending');
            pendingWidgetId = chip.dataset.widgetId;
            root.querySelectorAll('[data-drop-target]')
                .forEach(el => el.classList.add('pending-target'));
            return;
        }

        if (target && pendingWidgetId) {
            const id = pendingWidgetId;
            clearPending();
            const resolved = resolveTarget(target);
            if (resolved) handleDrop(id, resolved);
            return;
        }

        if (!chip && !target) {
            clearPending();
        }
    });
}

function bindToolbar(root) {
    const addRowBtn = root.querySelector('[data-role="add-row-container"]');
    const addColBtn = root.querySelector('[data-role="add-col-container"]');

    addRowBtn?.addEventListener('click', async () => {
        try { await addContainer('row'); } catch (e) { console.error(e); }
    });
    addColBtn?.addEventListener('click', async () => {
        try { await addContainer('col'); } catch (e) { console.error(e); }
    });

    // 容器 chip 上的 × 删除按钮（事件委托）
    root.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-role="delete-container"]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.widgetId;
        if (!id) return;
        if (!confirm(t('settings.layout.confirm.deleteContainer'))) return;
        try {
            await removeContainer(id);
        } catch (err) {
            console.error(err);
        }
    });

    // 排序按钮（事件委托）—— 同格兄弟 + 容器内子项统一走 reorderSibling
    root.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-role="reorder"]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        if (btn.disabled) return;
        const widgetId = btn.dataset.widgetId;
        const direction = btn.dataset.direction;
        if (!widgetId || !direction) return;
        try {
            await reorderSibling(widgetId, direction);
        } catch (err) {
            console.error(err);
        }
    });
}

export async function init(root) {
    renderAll(root);
    bindDnD(root);
    bindClickPlacement(root);
    bindToolbar(root);

    const resetBtn = root.querySelector('[data-role="reset"]');
    const onReset = async () => {
        if (!confirm(t('settings.layout.confirm.reset'))) return;
        try {
            await resetLayout();
        } catch (err) {
            console.error(err);
        }
    };
    resetBtn?.addEventListener('click', onReset);

    const unsubscribe = onSettingsChanged(() => {
        renderAll(root);
    });

    return () => {
        resetBtn?.removeEventListener('click', onReset);
        if (typeof unsubscribe === 'function') unsubscribe();
    };
}
