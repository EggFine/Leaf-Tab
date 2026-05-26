// 插件商城 tab —— 卡片列表 + 启停开关 + 配置展开
import {
    currentSettings,
    installPlugin,
    uninstallPlugin,
    updateWidget,
    onSettingsChanged
} from '../../../newtab/js/store.js';
import { reportError } from '../../../common/errors.js';
import { toastError } from '../../../common/toast.js';
import { t } from '../../../common/i18n.js';

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
    const labelText = t(schema.label);
    const descText = schema.description ? t(schema.description) : '';
    const labelBlock = `
        <div class="plugin-config-label">
            <label for="${inputId}">${escapeHtml(labelText)}</label>
            ${descText ? `<div class="plugin-config-desc">${escapeHtml(descText)}</div>` : ''}
        </div>
    `;
    const dataAttrs = `data-plugin-id="${escapeHtml(manifest.id)}" data-config-key="${escapeHtml(configKey)}"`;

    if (schema.type === 'toggle') {
        return `
            <div class="plugin-config-row">
                ${labelBlock}
                <label class="toggle-switch">
                    <input type="checkbox" id="${inputId}" ${dataAttrs}
                           data-config-type="toggle"
                           ${currentVal ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        `;
    }

    if (schema.type === 'select') {
        const options = Array.isArray(schema.options) ? schema.options : [];
        const optionsHtml = options.map(opt => {
            const val = opt?.value ?? '';
            const label = opt?.label ?? String(val);
            const selected = String(currentVal) === String(val) ? 'selected' : '';
            return `<option value="${escapeHtml(val)}" ${selected}>${escapeHtml(label)}</option>`;
        }).join('');
        return `
            <div class="plugin-config-row">
                ${labelBlock}
                <select class="plugin-config-select" id="${inputId}" ${dataAttrs}
                        data-config-type="select">
                    ${optionsHtml}
                </select>
            </div>
        `;
    }

    if (schema.type === 'number') {
        const min = Number.isFinite(schema.min) ? `min="${schema.min}"` : '';
        const max = Number.isFinite(schema.max) ? `max="${schema.max}"` : '';
        const step = Number.isFinite(schema.step) ? `step="${schema.step}"` : 'step="1"';
        const numVal = Number.isFinite(currentVal) ? currentVal : (schema.default ?? 0);
        return `
            <div class="plugin-config-row">
                ${labelBlock}
                <input type="number" class="plugin-config-input" id="${inputId}" ${dataAttrs}
                       data-config-type="number"
                       ${min} ${max} ${step}
                       value="${escapeHtml(numVal)}">
            </div>
        `;
    }

    if (schema.type === 'text') {
        const placeholder = schema.placeholder ? `placeholder="${escapeHtml(schema.placeholder)}"` : '';
        const maxLength = Number.isFinite(schema.maxLength) ? `maxlength="${schema.maxLength}"` : '';
        const val = currentVal == null ? '' : String(currentVal);
        return `
            <div class="plugin-config-row">
                ${labelBlock}
                <input type="text" class="plugin-config-input" id="${inputId}" ${dataAttrs}
                       data-config-type="text"
                       ${placeholder} ${maxLength}
                       value="${escapeHtml(val)}">
            </div>
        `;
    }

    if (schema.type === 'color') {
        const val = typeof currentVal === 'string' && /^#[0-9a-fA-F]{6}$/.test(currentVal)
            ? currentVal
            : (schema.default || '#4e73df');
        return `
            <div class="plugin-config-row">
                ${labelBlock}
                <input type="color" class="plugin-config-color" id="${inputId}" ${dataAttrs}
                       data-config-type="color"
                       value="${escapeHtml(val)}">
            </div>
        `;
    }

    return '';
}

function renderCard(manifest) {
    const installed = isInstalled(manifest.id);
    const visible = isVisible(manifest.id);
    const hasConfig = Array.isArray(manifest.configSchema) && manifest.configSchema.length > 0;

    const displayName = t(manifest.name);
    const displayDesc = manifest.description ? t(manifest.description) : '';
    const visibilityTitle = visible
        ? t('settings.plugins.visibility.shown')
        : t('settings.plugins.visibility.hidden');
    return `
        <article class="plugin-card" data-plugin-id="${manifest.id}">
            <div class="plugin-card-main">
                <div class="plugin-icon">${manifest.icon || ''}</div>
                <div class="plugin-meta">
                    <div class="plugin-name">${escapeHtml(displayName)}</div>
                    <div class="plugin-desc">${escapeHtml(displayDesc)}</div>
                    <div class="plugin-sub">
                        <span class="plugin-version">v${escapeHtml(manifest.version || '1.0.0')}</span>
                        <span class="plugin-dot">·</span>
                        <span class="plugin-author">${escapeHtml(manifest.author || '')}</span>
                    </div>
                </div>
                <div class="plugin-actions">
                    ${installed ? `
                        <label class="toggle-switch" title="${escapeHtml(visibilityTitle)}">
                            <input type="checkbox" data-role="visibility" data-plugin-id="${manifest.id}" ${visible ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    ` : ''}
                    <button type="button" class="plugin-install-btn" data-role="install" data-plugin-id="${manifest.id}">
                        ${installed ? escapeHtml(t('settings.plugins.btn.uninstall')) : escapeHtml(t('settings.plugins.btn.install'))}
                    </button>
                </div>
            </div>
            ${installed && hasConfig ? `
                <div class="plugin-card-body">
                    <button type="button" class="plugin-expand-btn" data-role="expand" aria-expanded="false">
                        <span class="plugin-expand-label">${escapeHtml(t('settings.plugins.config.expand'))}</span>
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
        ? `<p class="plugin-empty-hint">${escapeHtml(t('settings.plugins.empty.installed'))}</p>`
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
            reportError('plugins.install', err, { id });
            toastError(t('settings.plugins.toast.installFailed'));
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
            reportError('plugins.visibility', err, { id });
            toastError(t('settings.plugins.toast.visibilityFailed'));
            input.checked = !input.checked; // 回滚 UI
        }
    });

    // 统一的 config 变更处理（toggle/select/number/text/color）
    const handleConfigChange = async (input) => {
        const id = input.dataset.pluginId;
        const key = input.dataset.configKey;
        const type = input.dataset.configType;
        if (!id || !key || !type) return;

        let value;
        if (type === 'toggle') {
            value = input.checked;
        } else if (type === 'number') {
            const parsed = parseFloat(input.value);
            if (!Number.isFinite(parsed)) return;
            value = parsed;
        } else if (type === 'select' || type === 'text' || type === 'color') {
            value = input.value;
        } else {
            return;
        }

        try {
            await updateWidget(id, { config: { [key]: value } });
        } catch (err) {
            reportError('plugins.config', err, { id, key, type });
            toastError(t('settings.plugins.toast.configFailed'));
        }
    };

    root.addEventListener('change', (e) => {
        const input = e.target.closest('[data-config-type]');
        if (!input) return;
        void handleConfigChange(input);
    });

    // text/color/number 的实时 input 事件（不等失焦）
    let inputTimer = null;
    root.addEventListener('input', (e) => {
        const input = e.target.closest('[data-config-type]');
        if (!input) return;
        const type = input.dataset.configType;
        // toggle/select 由 change 触发即可；text/number/color 走 debounce
        if (type !== 'text' && type !== 'number' && type !== 'color') return;
        if (inputTimer) clearTimeout(inputTimer);
        inputTimer = setTimeout(() => {
            inputTimer = null;
            void handleConfigChange(input);
        }, 300);
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
