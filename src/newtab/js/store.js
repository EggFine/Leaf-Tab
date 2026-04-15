export const SETTINGS_KEY = 'leaf-settings';
export const SCHEMA_VERSION = 2;

// 网格尺寸边界
export const MIN_GRID_SIZE = 1;
export const MAX_GRID_SIZE = 6;
export const DEFAULT_GRID = { rows: 3, cols: 3 };

// 浮层槽 —— 不在主网格内的特殊位置
const VALID_FLOAT_CELLS = new Set(['BC-float', 'TL-float', 'TR-float']);

// 旧 schema 的固定单元名 → 新 row/col 的迁移映射（基于 3x3 默认网格）
const LEGACY_CELL_MAP = {
    'TL': { row: 1, col: 1 },
    'TC': { row: 1, col: 2 },
    'TR': { row: 1, col: 3 },
    'ML': { row: 2, col: 1 },
    'MC': { row: 2, col: 2 },
    'MR': { row: 2, col: 3 },
    'BL': { row: 3, col: 1 },
    'BC': { row: 3, col: 2 },
    'BR': { row: 3, col: 3 }
};

// 默认 widget 布局（核心 + 内置插件）
// 注：MVP 阶段固定 colSpan=1, rowSpan=1；每个 widget 占据单个格子
// order：同一位置里多个 widget 的先后顺序（值越小越前）
export const DEFAULT_WIDGETS = {
    'search':         { row: 2, col: 2, colSpan: 1, rowSpan: 1, visible: true },
    'theme-toggle':   { row: 1, col: 3, order: 0, colSpan: 1, rowSpan: 1, visible: true },
    'settings-btn':   { row: 1, col: 3, order: 1, colSpan: 1, rowSpan: 1, visible: true },
    'brand':          { cell: 'BC-float', colSpan: 1, rowSpan: 1, visible: true },
    'bookmarks':      { row: 3, col: 2, colSpan: 1, rowSpan: 1, visible: false,
                        config: { showTitles: true } }
};

export const DEFAULT_INSTALLED_PLUGINS = ['bookmarks'];

// 不允许在 DIY 编辑器中隐藏的 widget id —— 与 manifest.hideable 互为冗余（双保险）
export const NON_HIDEABLE_WIDGETS = new Set(['brand']);

export const defaultSettings = {
    schemaVersion: SCHEMA_VERSION,
    theme: 'system',                // 'system' | 'light' | 'dark'
    engine: 'bing',                 // 'bing' | 'google' | 'baidu'
    grid: { ...DEFAULT_GRID },
    installedPlugins: [...DEFAULT_INSTALLED_PLUGINS],
    widgets: cloneWidgets(DEFAULT_WIDGETS)
};

const STORAGE_AREA = 'sync';
const validThemes = new Set(['system', 'light', 'dark']);
const validEngines = new Set(['bing', 'google', 'baidu']);

export let currentSettings = cloneSettings(defaultSettings);

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
}

function isFloatCell(cellName) {
    return typeof cellName === 'string' && VALID_FLOAT_CELLS.has(cellName);
}

function cloneWidgets(widgets) {
    const out = {};
    for (const [id, entry] of Object.entries(widgets)) {
        const clone = {
            colSpan: entry.colSpan ?? 1,
            rowSpan: entry.rowSpan ?? 1,
            visible: entry.visible !== false
        };
        if (typeof entry.cell === 'string') clone.cell = entry.cell;
        if (Number.isInteger(entry.row)) clone.row = entry.row;
        if (Number.isInteger(entry.col)) clone.col = entry.col;
        if (typeof entry.parentId === 'string') clone.parentId = entry.parentId;
        if (typeof entry.order === 'number' && Number.isFinite(entry.order)) clone.order = entry.order;
        if (entry.kind === 'container') {
            clone.kind = 'container';
            clone.containerType = entry.containerType === 'col' ? 'col' : 'row';
            if (Array.isArray(entry.childOrder)) {
                clone.childOrder = [...entry.childOrder];
            }
        }
        if (entry.config) clone.config = { ...entry.config };
        out[id] = clone;
    }
    return out;
}

function cloneSettings(settings) {
    return {
        ...settings,
        grid: settings.grid ? { ...settings.grid } : { ...DEFAULT_GRID },
        installedPlugins: [...(settings.installedPlugins || [])],
        widgets: cloneWidgets(settings.widgets || {})
    };
}

function normalizeGrid(raw) {
    if (!isPlainObject(raw)) return { ...DEFAULT_GRID };
    return {
        rows: Number.isInteger(raw.rows)
            ? clamp(raw.rows, MIN_GRID_SIZE, MAX_GRID_SIZE)
            : DEFAULT_GRID.rows,
        cols: Number.isInteger(raw.cols)
            ? clamp(raw.cols, MIN_GRID_SIZE, MAX_GRID_SIZE)
            : DEFAULT_GRID.cols
    };
}

function normalizeWidgetEntry(id, raw, fallback, gridDims, allIds) {
    const dims = gridDims || DEFAULT_GRID;
    const base = fallback || { row: 1, col: 1, colSpan: 1, rowSpan: 1, visible: true };
    const entry = isPlainObject(raw) ? raw : {};

    // MVP 阶段固定为单格
    const colSpan = 1;
    const rowSpan = 1;
    let visible = typeof entry.visible === 'boolean' ? entry.visible : (base.visible !== false);
    if (NON_HIDEABLE_WIDGETS.has(id)) visible = true;

    const normalized = { colSpan, rowSpan, visible };

    // 容器标记（仅 entry 提供，默认 widgets 中也可声明）
    const isContainer = entry.kind === 'container' || base.kind === 'container';
    if (isContainer) {
        normalized.kind = 'container';
        const rawType = entry.containerType || base.containerType;
        normalized.containerType = rawType === 'col' ? 'col' : 'row';
    }

    // 父容器（parentId）—— 只有在 allIds 中存在且不指向自己时才保留
    const rawParent = typeof entry.parentId === 'string' ? entry.parentId : undefined;
    const parentValid = rawParent && rawParent !== id && (!allIds || allIds.has(rawParent));
    const hasParent = !!parentValid;
    if (hasParent) {
        normalized.parentId = rawParent;
    }

    // 顶层位置：若有 parentId，不需要 row/col/cell（忽略）
    if (!hasParent) {
        const hasExplicitRowCol = Number.isInteger(entry.row) && Number.isInteger(entry.col);
        if (hasExplicitRowCol) {
            normalized.row = clamp(entry.row, 1, dims.rows);
            normalized.col = clamp(entry.col, 1, dims.cols);
        } else if (isFloatCell(entry.cell)) {
            normalized.cell = entry.cell;
        } else if (typeof entry.cell === 'string' && LEGACY_CELL_MAP[entry.cell]) {
            const legacy = LEGACY_CELL_MAP[entry.cell];
            normalized.row = clamp(legacy.row, 1, dims.rows);
            normalized.col = clamp(legacy.col, 1, dims.cols);
        } else if (isFloatCell(base.cell)) {
            normalized.cell = base.cell;
        } else if (Number.isInteger(base.row) && Number.isInteger(base.col)) {
            normalized.row = clamp(base.row, 1, dims.rows);
            normalized.col = clamp(base.col, 1, dims.cols);
        }
        // 若都没有 → 隐藏（留在 tray 里）
        if (!Number.isInteger(normalized.row) && !normalized.cell) {
            normalized.visible = false;
            normalized.row = 1;
            normalized.col = 1;
        }
    }

    // 子顺序（仅容器）
    if (isContainer && Array.isArray(entry.childOrder)) {
        normalized.childOrder = entry.childOrder.filter(x => typeof x === 'string');
    }

    // order（同位置内排序权重）—— entry 优先，否则继承 base（defaults）
    if (typeof entry.order === 'number' && Number.isFinite(entry.order)) {
        normalized.order = entry.order;
    } else if (typeof base.order === 'number' && Number.isFinite(base.order)) {
        normalized.order = base.order;
    }

    const baseConfig = base.config ? { ...base.config } : undefined;
    const rawConfig = isPlainObject(entry.config) ? entry.config : undefined;
    if (baseConfig || rawConfig) {
        normalized.config = { ...(baseConfig || {}), ...(rawConfig || {}) };
    }

    return normalized;
}

// 预迁移：把旧 top-controls 拆成 theme-toggle + settings-btn（继承旧位置）
function preMigrateWidgets(raw) {
    if (!isPlainObject(raw)) return raw;
    if (raw['top-controls'] && !raw['theme-toggle'] && !raw['settings-btn']) {
        const tc = raw['top-controls'];
        raw['theme-toggle'] = { ...tc };
        raw['settings-btn'] = { ...tc };
    }
    // 无论是否迁移，都清理掉 top-controls 字段
    if (raw['top-controls']) delete raw['top-controls'];
    return raw;
}

function normalizeWidgets(rawWidgets, gridDims) {
    const input = preMigrateWidgets(isPlainObject(rawWidgets) ? { ...rawWidgets } : rawWidgets);

    // 先收集所有将存在的 id（用于 parentId 校验）
    const allIds = new Set(Object.keys(DEFAULT_WIDGETS));
    if (isPlainObject(input)) {
        for (const key of Object.keys(input)) allIds.add(key);
    }

    const out = {};
    // 先以默认集为骨架（保证 core widgets 始终存在）
    for (const [id, def] of Object.entries(DEFAULT_WIDGETS)) {
        const raw = isPlainObject(input) ? input[id] : undefined;
        out[id] = normalizeWidgetEntry(id, raw, def, gridDims, allIds);
    }
    // 再吸收用户声明的额外 widget（容器实例等）
    if (isPlainObject(input)) {
        for (const [id, raw] of Object.entries(input)) {
            if (out[id]) continue;
            out[id] = normalizeWidgetEntry(id, raw, undefined, gridDims, allIds);
        }
    }

    // 二次验证：父容器若不是 container 类型，或不存在，则清空 parentId
    for (const [id, entry] of Object.entries(out)) {
        if (typeof entry.parentId !== 'string') continue;
        const parent = out[entry.parentId];
        if (!parent || parent.kind !== 'container') {
            delete entry.parentId;
            // 安置到默认位置
            if (!Number.isInteger(entry.row) && !entry.cell) {
                entry.row = 1;
                entry.col = 1;
                entry.visible = false;
            }
        }
    }

    return out;
}

function normalizeInstalledPlugins(raw) {
    if (!Array.isArray(raw)) {
        return [...DEFAULT_INSTALLED_PLUGINS];
    }
    const set = new Set(raw.filter(id => typeof id === 'string' && id.length > 0));
    return [...set];
}

// 旧 schema (v1) 迁移到 v2
function migrateV1ToV2(rawSettings) {
    const widgets = cloneWidgets(DEFAULT_WIDGETS);

    // showBookmarks → widgets.bookmarks.visible
    if (typeof rawSettings.showBookmarks === 'boolean') {
        widgets.bookmarks.visible = rawSettings.showBookmarks;
    }
    // showBookmarkTitles → widgets.bookmarks.config.showTitles
    if (typeof rawSettings.showBookmarkTitles === 'boolean') {
        widgets.bookmarks.config = widgets.bookmarks.config || {};
        widgets.bookmarks.config.showTitles = rawSettings.showBookmarkTitles;
    }

    return {
        schemaVersion: SCHEMA_VERSION,
        theme: rawSettings.theme,
        engine: rawSettings.engine,
        grid: { ...DEFAULT_GRID },
        installedPlugins: [...DEFAULT_INSTALLED_PLUGINS],
        widgets
    };
}

function normalizeSettings(rawSettings) {
    if (!isPlainObject(rawSettings)) {
        return cloneSettings(defaultSettings);
    }

    const hasNewSchema = rawSettings.schemaVersion === SCHEMA_VERSION
        || isPlainObject(rawSettings.widgets);

    const source = hasNewSchema ? rawSettings : migrateV1ToV2(rawSettings);

    const grid = normalizeGrid(source.grid);

    const normalized = {
        schemaVersion: SCHEMA_VERSION,
        theme: validThemes.has(source.theme) ? source.theme : defaultSettings.theme,
        engine: validEngines.has(source.engine) ? source.engine : defaultSettings.engine,
        grid,
        installedPlugins: normalizeInstalledPlugins(source.installedPlugins),
        widgets: normalizeWidgets(source.widgets, grid)
    };

    return normalized;
}

function shouldPersistNormalizedSettings(rawSettings, normalizedSettings) {
    if (!isPlainObject(rawSettings)) {
        return true;
    }
    // 粗略比对：只要旧字段留存或 schema 未升级就持久化一次
    if (rawSettings.schemaVersion !== SCHEMA_VERSION) return true;
    if ('showBookmarks' in rawSettings || 'showBookmarkTitles' in rawSettings) return true;
    if (!isPlainObject(rawSettings.widgets)) return true;
    if (!isPlainObject(rawSettings.grid)) return true;
    if (isPlainObject(rawSettings.widgets) && 'top-controls' in rawSettings.widgets) return true;
    return JSON.stringify(rawSettings) !== JSON.stringify(normalizedSettings);
}

async function migrateLegacySettings() {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
        return null;
    }

    const saved = window.localStorage.getItem(SETTINGS_KEY);
    if (!saved) {
        return null;
    }

    try {
        const parsed = JSON.parse(saved);
        const migratedSettings = normalizeSettings(parsed);
        await chrome.storage[STORAGE_AREA].set({ [SETTINGS_KEY]: migratedSettings });
        window.localStorage.removeItem(SETTINGS_KEY);
        return migratedSettings;
    } catch (error) {
        console.error('Failed to migrate legacy settings', error);
        window.localStorage.removeItem(SETTINGS_KEY);
        return null;
    }
}

export async function loadSettings() {
    try {
        const stored = await chrome.storage[STORAGE_AREA].get(SETTINGS_KEY);
        let rawSettings = stored[SETTINGS_KEY];

        if (rawSettings === undefined) {
            const migratedSettings = await migrateLegacySettings();
            if (migratedSettings) {
                currentSettings = migratedSettings;
                return currentSettings;
            }

            rawSettings = cloneSettings(defaultSettings);
            await chrome.storage[STORAGE_AREA].set({ [SETTINGS_KEY]: rawSettings });
        }

        const normalizedSettings = normalizeSettings(rawSettings);
        currentSettings = normalizedSettings;

        if (shouldPersistNormalizedSettings(rawSettings, normalizedSettings)) {
            await chrome.storage[STORAGE_AREA].set({ [SETTINGS_KEY]: normalizedSettings });
        }

        return currentSettings;
    } catch (error) {
        console.error('Failed to load settings', error);
        currentSettings = cloneSettings(defaultSettings);
        return currentSettings;
    }
}

export async function saveSettings(settings = currentSettings) {
    const normalizedSettings = normalizeSettings(settings);
    currentSettings = normalizedSettings;

    try {
        await chrome.storage[STORAGE_AREA].set({ [SETTINGS_KEY]: normalizedSettings });
        return currentSettings;
    } catch (error) {
        console.error('Failed to save settings', error);
        throw error;
    }
}

export async function updateSettings(patch) {
    return saveSettings({ ...currentSettings, ...patch });
}

// 更新某个 widget 的布局或 config（浅合并）—— 自动处理 grid/float/parent 位置切换
export async function updateWidget(id, patch) {
    const widgets = cloneWidgets(currentSettings.widgets);
    const existing = widgets[id] || { row: 1, col: 1, colSpan: 1, rowSpan: 1, visible: true };
    const merged = { ...existing, ...patch };
    // 位置类型切换：row+col / cell / parentId 三种互斥
    if (typeof patch?.parentId === 'string') {
        delete merged.row;
        delete merged.col;
        delete merged.cell;
    } else if (Number.isInteger(patch?.row) && Number.isInteger(patch?.col)) {
        delete merged.cell;
        delete merged.parentId;
    } else if (typeof patch?.cell === 'string') {
        delete merged.row;
        delete merged.col;
        delete merged.parentId;
    } else if (patch && 'parentId' in patch && patch.parentId == null) {
        delete merged.parentId;
    }
    if (isPlainObject(patch?.config)) {
        merged.config = { ...(existing.config || {}), ...patch.config };
    }
    widgets[id] = merged;
    return saveSettings({ ...currentSettings, widgets });
}

// 批量更新 widgets 映射（用于布局编辑器一次保存）
export async function updateWidgets(partial) {
    if (!isPlainObject(partial)) return currentSettings;
    const widgets = cloneWidgets(currentSettings.widgets);
    for (const [id, patch] of Object.entries(partial)) {
        if (!isPlainObject(patch)) continue;
        const existing = widgets[id] || { row: 1, col: 1, colSpan: 1, rowSpan: 1, visible: true };
        const merged = { ...existing, ...patch };
        if (typeof patch.parentId === 'string') {
            delete merged.row;
            delete merged.col;
            delete merged.cell;
        } else if (Number.isInteger(patch.row) && Number.isInteger(patch.col)) {
            delete merged.cell;
            delete merged.parentId;
        } else if (typeof patch.cell === 'string') {
            delete merged.row;
            delete merged.col;
            delete merged.parentId;
        } else if ('parentId' in patch && patch.parentId == null) {
            delete merged.parentId;
        }
        if (isPlainObject(patch.config)) {
            merged.config = { ...(existing.config || {}), ...patch.config };
        }
        widgets[id] = merged;
    }
    return saveSettings({ ...currentSettings, widgets });
}

// 新增一个行/列容器实例，返回新实例的 id
export async function addContainer(containerType = 'row') {
    const type = containerType === 'col' ? 'col' : 'row';
    const id = `container-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const widgets = cloneWidgets(currentSettings.widgets);
    widgets[id] = {
        kind: 'container',
        containerType: type,
        row: 1,
        col: 1,
        colSpan: 1,
        rowSpan: 1,
        visible: false // 新建默认进入 tray，等用户拖到格子
    };
    await saveSettings({ ...currentSettings, widgets });
    return id;
}

// 统一的排序入口：
// - 若 widget 在容器内 → 路由到 reorderChild（使用 container.childOrder）
// - 若 widget 在某格子或浮层槽 → 同位置的兄弟 widget 用 order 字段排序
export async function reorderSibling(widgetId, direction) {
    if (!widgetId || !direction) return currentSettings;
    const entry = currentSettings.widgets?.[widgetId];
    if (!entry) return currentSettings;

    if (typeof entry.parentId === 'string') {
        return reorderChild(entry.parentId, widgetId, direction);
    }

    const locKey = topLevelLocationKey(entry);
    if (!locKey) return currentSettings;

    const widgets = cloneWidgets(currentSettings.widgets);

    // 收集同位置兄弟（只考虑可见 widget，避免隐藏项插队）
    const siblings = Object.keys(widgets)
        .filter(id => typeof widgets[id].parentId !== 'string'
            && widgets[id].visible !== false
            && topLevelLocationKey(widgets[id]) === locKey)
        .map(id => ({ id, entry: widgets[id] }));

    if (siblings.length < 2) return currentSettings;

    siblings.sort((a, b) => {
        const oa = typeof a.entry.order === 'number' ? a.entry.order : Infinity;
        const ob = typeof b.entry.order === 'number' ? b.entry.order : Infinity;
        if (oa !== ob) return oa - ob;
        return a.id.localeCompare(b.id);
    });

    const idx = siblings.findIndex(s => s.id === widgetId);
    if (idx === -1) return currentSettings;

    let newIdx = idx;
    if (direction === 'prev') newIdx = Math.max(0, idx - 1);
    else if (direction === 'next') newIdx = Math.min(siblings.length - 1, idx + 1);
    else if (direction === 'first') newIdx = 0;
    else if (direction === 'last') newIdx = siblings.length - 1;

    if (newIdx === idx) return currentSettings;

    const [moved] = siblings.splice(idx, 1);
    siblings.splice(newIdx, 0, moved);

    // 重新编号 0..N-1，保持稠密、唯一
    siblings.forEach((sib, i) => {
        widgets[sib.id] = { ...widgets[sib.id], order: i };
    });

    return saveSettings({ ...currentSettings, widgets });
}

// 顶层 widget 的位置 key（用于 sibling 分组）
export function topLevelLocationKey(entry) {
    if (typeof entry?.parentId === 'string') return null;
    if (typeof entry?.cell === 'string') return `float:${entry.cell}`;
    if (Number.isInteger(entry?.row) && Number.isInteger(entry?.col)) return `cell:${entry.row}-${entry.col}`;
    return null;
}

// 调整某容器内子 widget 的顺序
// direction: 'prev' | 'next' | 'first' | 'last'
export async function reorderChild(containerId, childId, direction) {
    if (!containerId || !childId || !direction) return currentSettings;
    const widgets = cloneWidgets(currentSettings.widgets);
    const container = widgets[containerId];
    if (!container || container.kind !== 'container') return currentSettings;

    // 当前属于该容器的子 widget id 列表（按 id 字典序兜底）
    const currentChildren = Object.keys(widgets)
        .filter(id => widgets[id].parentId === containerId)
        .sort();

    let order = Array.isArray(container.childOrder) ? [...container.childOrder] : [];
    // 过滤掉已不属于该容器的 id
    order = order.filter(id => currentChildren.includes(id));
    // 把新出现的 id 追加到末尾
    for (const id of currentChildren) {
        if (!order.includes(id)) order.push(id);
    }

    const idx = order.indexOf(childId);
    if (idx === -1) return currentSettings;

    let newIdx = idx;
    if (direction === 'prev') newIdx = Math.max(0, idx - 1);
    else if (direction === 'next') newIdx = Math.min(order.length - 1, idx + 1);
    else if (direction === 'first') newIdx = 0;
    else if (direction === 'last') newIdx = order.length - 1;

    if (newIdx === idx) return currentSettings;

    order.splice(idx, 1);
    order.splice(newIdx, 0, childId);

    widgets[containerId] = { ...container, childOrder: order };
    return saveSettings({ ...currentSettings, widgets });
}

// 删除容器实例：把它的所有子 widget 的 parentId 清除并设为隐藏
export async function removeContainer(id) {
    if (!id) return currentSettings;
    const widgets = cloneWidgets(currentSettings.widgets);
    if (!widgets[id] || widgets[id].kind !== 'container') return currentSettings;
    // 先解绑子 widget
    for (const [childId, childEntry] of Object.entries(widgets)) {
        if (childEntry.parentId === id) {
            delete childEntry.parentId;
            childEntry.visible = false;
            if (!Number.isInteger(childEntry.row)) childEntry.row = 1;
            if (!Number.isInteger(childEntry.col)) childEntry.col = 1;
        }
    }
    delete widgets[id];
    return saveSettings({ ...currentSettings, widgets });
}

// 调整网格尺寸；越界 widget 自动移入 tray（非 hideable 则夹到边缘保持可见）
export async function updateGrid(rows, cols) {
    const newGrid = normalizeGrid({ rows, cols });
    const widgets = cloneWidgets(currentSettings.widgets);
    for (const [id, entry] of Object.entries(widgets)) {
        if (isFloatCell(entry.cell)) continue;
        if (!Number.isInteger(entry.row) || !Number.isInteger(entry.col)) continue;
        const outOfBounds = entry.row > newGrid.rows || entry.col > newGrid.cols;
        if (!outOfBounds) continue;
        widgets[id].row = Math.min(entry.row, newGrid.rows);
        widgets[id].col = Math.min(entry.col, newGrid.cols);
        if (!NON_HIDEABLE_WIDGETS.has(id)) {
            widgets[id].visible = false;
        }
    }
    return saveSettings({ ...currentSettings, grid: newGrid, widgets });
}

// 安装/卸载插件
export async function installPlugin(id) {
    if (!id) return currentSettings;
    const installed = new Set(currentSettings.installedPlugins);
    installed.add(id);
    const widgets = cloneWidgets(currentSettings.widgets);
    if (widgets[id]) {
        widgets[id].visible = true;
    }
    return saveSettings({
        ...currentSettings,
        installedPlugins: [...installed],
        widgets
    });
}

export async function uninstallPlugin(id) {
    if (!id) return currentSettings;
    const installed = currentSettings.installedPlugins.filter(x => x !== id);
    const widgets = cloneWidgets(currentSettings.widgets);
    if (widgets[id]) {
        widgets[id].visible = false;
    }
    return saveSettings({
        ...currentSettings,
        installedPlugins: installed,
        widgets
    });
}

export async function resetLayout() {
    return saveSettings({
        ...currentSettings,
        grid: { ...DEFAULT_GRID },
        widgets: cloneWidgets(DEFAULT_WIDGETS)
    });
}

export function onSettingsChanged(listener) {
    const handleStorageChange = (changes, areaName) => {
        if (areaName !== STORAGE_AREA || !changes[SETTINGS_KEY]) {
            return;
        }

        currentSettings = normalizeSettings(changes[SETTINGS_KEY].newValue);
        if (listener) {
            listener(currentSettings, changes[SETTINGS_KEY]);
        }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
}
