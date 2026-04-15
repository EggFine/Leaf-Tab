// 插件商城 tab —— 卡片列表 + 启停开关 + 配置展开
import {
    currentSettings,
    installPlugin,
    uninstallPlugin,
    updateWidget,
    onSettingsChanged
} from '../../../newtab/js/store.js';

// Widget 注册表（读取 manifest 用）
// 直接静态 import 所有插件 manifest；core 不在商城中展示
import bookmarksManifest from '../../../newtab/js/widgets/plugins/bookmarks/index.js';

const PLUGIN_MANIFESTS = [bookmarksManifest];

function getManifest(id) {
    return PLUGIN_MANIFESTS.find(m => m.id === id);
}

function isInstalled(id) {
    return (currentSettings.installedPlugins || []).includes(id);
}

function isVisible(id) {
    return currentSettings.widgets?.[id]?.visible !== false;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function renderConfigRow(manifest, configKey, schema) {
    const currentVal = currentSettings.widgets?.[manifest.id]?.config?.[configKey]
        ?? schema.default;
    const inputId = `plugin-${manifest.id}-cfg-${configKey}`;

    if (schema.type === 'toggle') {
        return `
            <div class="plugin-config-row">
                <div class="plugin-config-label">
                    <label for="${inputId}">${escapeHtml(schema.label)}</label>
                    ${schema.description ? `<div class="plugin-config-desc">${escapeHtml(schema.description)}</div>` : ''}
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="${inputId}"
                           data-plugin-id="${manifest.id}"
                           data-config-key="${configKey}"
                           data-config-type="toggle"
                           ${currentVal ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        `;
    }
    // 其他类型可扩展：text/select/number 等
    return '';
}

function renderCard(manifest) {
    const installed = isInstalled(manifest.id);
    const visible = isVisible(manifest.id);
    const hasConfig = Array.isArray(manifest.configSchema) && manifest.configSchema.length > 0;

    return `
        <article class="plugin-card" data-plugin-id="${manifest.id}">
            <div class="plugin-card-main">
                <div class="plugin-icon">${manifest.icon || ''}</div>
                <div class="plugin-meta">
                    <div class="plugin-name">${escapeHtml(manifest.name)}</div>
                    <div class="plugin-desc">${escapeHtml(manifest.description || '')}</div>
                    <div class="plugin-sub">
                        <span class="plugin-version">v${escapeHtml(manifest.version || '1.0.0')}</span>
                        <span class="plugin-dot">·</span>
                        <span class="plugin-author">${escapeHtml(manifest.author || '')}</span>
                    </div>
                </div>
                <div class="plugin-actions">
                    ${installed ? `
                        <label class="toggle-switch" title="${visible ? '在新标签页显示' : '已隐藏（仍已安装）'}">
                            <input type="checkbox" data-role="visibility" data-plugin-id="${manifest.id}" ${visible ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    ` : ''}
                    <button type="button" class="plugin-install-btn" data-role="install" data-plugin-id="${manifest.id}">
                        ${installed ? '卸载' : '安装'}
                    </button>
                </div>
            </div>
            ${installed && hasConfig ? `
                <div class="plugin-card-body">
                    <button type="button" class="plugin-expand-btn" data-role="expand" aria-expanded="false">
                        <span class="plugin-expand-label">配置</span>
                        <svg class="plugin-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="plugin-config-panel" data-role="config-panel">
                        ${manifest.configSchema.map(schema => renderConfigRow(manifest, schema.key, schema)).join('')}
                    </div>
                </div>
            ` : ''}
        </article>
    `;
}

function render(root) {
    const installedList = root.querySelector('[data-list="installed"]');
    const availableList = root.querySelector('[data-list="available"]');
    const emptyHint = root.querySelector('[data-role="empty-available"]');

    if (!installedList || !availableList) return;

    const installed = PLUGIN_MANIFESTS.filter(m => isInstalled(m.id));
    const available = PLUGIN_MANIFESTS.filter(m => !isInstalled(m.id));

    installedList.innerHTML = installed.length === 0
        ? '<p class="plugin-empty-hint">尚未安装任何插件</p>'
        : installed.map(renderCard).join('');

    availableList.innerHTML = available.map(renderCard).join('');
    if (emptyHint) {
        emptyHint.style.display = available.length === 0 ? 'block' : 'none';
    }
}

function bindEvents(root) {
    // 展开配置
    root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-role="expand"]');
        if (!btn) return;
        const card = btn.closest('.plugin-card');
        if (!card) return;
        const panel = card.querySelector('[data-role="config-panel"]');
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        card.classList.toggle('expanded', !expanded);
        if (panel) {
            panel.style.maxHeight = !expanded ? `${panel.scrollHeight}px` : '0px';
        }
    });

    // 安装/卸载
    root.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-role="install"]');
        if (!btn) return;
        const id = btn.dataset.pluginId;
        if (!id) return;
        btn.disabled = true;
        try {
            if (isInstalled(id)) {
                await uninstallPlugin(id);
            } else {
                await installPlugin(id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            btn.disabled = false;
        }
    });

    // 可见性 toggle
    root.addEventListener('change', async (e) => {
        const input = e.target.closest('input[data-role="visibility"]');
        if (!input) return;
        const id = input.dataset.pluginId;
        if (!id) return;
        try {
            await updateWidget(id, { visible: input.checked });
        } catch (err) {
            console.error(err);
        }
    });

    // 插件 config toggle
    root.addEventListener('change', async (e) => {
        const input = e.target.closest('input[data-config-type="toggle"]');
        if (!input) return;
        const id = input.dataset.pluginId;
        const key = input.dataset.configKey;
        if (!id || !key) return;
        try {
            await updateWidget(id, { config: { [key]: input.checked } });
        } catch (err) {
            console.error(err);
        }
    });
}

export async function init(root) {
    render(root);
    bindEvents(root);

    const unsubscribe = onSettingsChanged(() => {
        // 保持展开态：记录哪些卡片展开了
        const expandedIds = new Set(
            [...root.querySelectorAll('.plugin-card.expanded')]
                .map(el => el.dataset.pluginId)
        );
        render(root);
        // 恢复展开
        for (const id of expandedIds) {
            const card = root.querySelector(`.plugin-card[data-plugin-id="${id}"]`);
            if (!card) continue;
            card.classList.add('expanded');
            const btn = card.querySelector('[data-role="expand"]');
            const panel = card.querySelector('[data-role="config-panel"]');
            if (btn) btn.setAttribute('aria-expanded', 'true');
            if (panel) panel.style.maxHeight = `${panel.scrollHeight}px`;
        }
    });

    // 返回 cleanup
    return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
    };
}
