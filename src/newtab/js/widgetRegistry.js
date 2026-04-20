// Widget 注册表 —— 所有核心 widget 与插件 widget 的集中索引
// 使用方式：main.js 顶部 import 各 widget 后，集中调用 registerWidget()。
// 新增插件时只需在 main.js 中多一行 import + register。

import { reportError } from '../../common/errors.js';

const registry = new Map();

const VALID_TYPES = new Set(['core', 'plugin', 'container']);
const VALID_SCHEMA_TYPES = new Set(['toggle', 'select', 'number', 'text', 'color']);

// 为 configSchema 单项做最小校验；返回 true/false + reason
function validateSchemaItem(item, manifestId) {
    if (!item || typeof item !== 'object') {
        return { ok: false, reason: 'schema item must be object' };
    }
    if (typeof item.key !== 'string' || !item.key) {
        return { ok: false, reason: 'schema item missing key' };
    }
    if (!VALID_SCHEMA_TYPES.has(item.type)) {
        return { ok: false, reason: `schema item type must be one of ${[...VALID_SCHEMA_TYPES].join('/')} (got "${item.type}")` };
    }
    if (item.type === 'select') {
        if (!Array.isArray(item.options) || item.options.length === 0) {
            return { ok: false, reason: 'select schema requires non-empty options[]' };
        }
    }
    if (item.type === 'number') {
        if (item.min !== undefined && typeof item.min !== 'number') {
            return { ok: false, reason: 'number schema min must be number' };
        }
        if (item.max !== undefined && typeof item.max !== 'number') {
            return { ok: false, reason: 'number schema max must be number' };
        }
    }
    return { ok: true };
}

function assertManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
        throw new Error('Widget manifest must be an object');
    }
    if (typeof manifest.id !== 'string' || !manifest.id) {
        throw new Error('Widget manifest.id is required');
    }
    if (!VALID_TYPES.has(manifest.type)) {
        throw new Error(`Widget ${manifest.id}.type must be one of "${[...VALID_TYPES].join('/')}"`);
    }
    if (typeof manifest.mount !== 'function') {
        throw new Error(`Widget ${manifest.id}.mount must be a function`);
    }
    // 可选字段做软校验：不合法则记录并丢弃，不阻断注册
    if (manifest.configSchema !== undefined) {
        if (!Array.isArray(manifest.configSchema)) {
            reportError('widgetRegistry.validate',
                new Error(`Widget ${manifest.id}.configSchema must be an array; ignoring`));
            manifest.configSchema = [];
        } else {
            const seen = new Set();
            const cleaned = [];
            for (const item of manifest.configSchema) {
                const { ok, reason } = validateSchemaItem(item, manifest.id);
                if (!ok) {
                    reportError('widgetRegistry.validate',
                        new Error(`Widget ${manifest.id} configSchema: ${reason}; skipping item`),
                        { item });
                    continue;
                }
                if (seen.has(item.key)) {
                    reportError('widgetRegistry.validate',
                        new Error(`Widget ${manifest.id} configSchema: duplicate key "${item.key}"`));
                    continue;
                }
                seen.add(item.key);
                cleaned.push(item);
            }
            manifest.configSchema = cleaned;
        }
    }
    // 其余可选回调：unmount/onConfigChange/onSettingsChange 缺省没关系
}

export function registerWidget(manifest) {
    try {
        assertManifest(manifest);
    } catch (err) {
        reportError('widgetRegistry.register', err, { manifestId: manifest?.id });
        return null;
    }
    if (registry.has(manifest.id)) {
        reportError('widgetRegistry.register',
            new Error(`Widget "${manifest.id}" already registered; overwriting.`));
    }
    registry.set(manifest.id, manifest);
    return manifest;
}

export function getWidget(id) {
    return registry.get(id);
}

export function hasWidget(id) {
    return registry.has(id);
}

export function listAll() {
    return [...registry.values()];
}

export function listPlugins() {
    return [...registry.values()].filter(w => w.type === 'plugin');
}

export function listCore() {
    return [...registry.values()].filter(w => w.type === 'core');
}

export function listContainerTemplates() {
    return [...registry.values()].filter(w => w.type === 'container');
}

// 测试/热重载场景重置注册表
export function clearRegistry() {
    registry.clear();
}
