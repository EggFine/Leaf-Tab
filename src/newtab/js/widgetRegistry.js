// Widget 注册表 —— 所有核心 widget 与插件 widget 的集中索引
// 使用方式：main.js 顶部 import 各 widget 后，集中调用 registerWidget()。
// 新增插件时只需在 main.js 中多一行 import + register。

const registry = new Map();

function assertManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
        throw new Error('Widget manifest must be an object');
    }
    if (typeof manifest.id !== 'string' || !manifest.id) {
        throw new Error('Widget manifest.id is required');
    }
    if (!['core', 'plugin', 'container'].includes(manifest.type)) {
        throw new Error(`Widget ${manifest.id}.type must be "core", "plugin", or "container"`);
    }
    if (typeof manifest.mount !== 'function') {
        throw new Error(`Widget ${manifest.id}.mount must be a function`);
    }
}

export function registerWidget(manifest) {
    assertManifest(manifest);
    if (registry.has(manifest.id)) {
        console.warn(`Widget "${manifest.id}" already registered; overwriting.`);
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
