// 轻量 i18n —— 自定义 JSON + ICU 风格 {var} 占位符
// 设计意图:
//   - 运行时可切换语言,无需依赖浏览器 UI 语言
//   - 翻译文件按需 fetch,fallback 到 en
//   - DOM 通过 data-i18n / data-i18n-attr / data-i18n-html 声明
//   - JS 通过 t(key, params) 取词
// manifest.json 仍走 chrome.i18n(install-time 唯一可行方案)

import { reportError } from './errors.js';

export const SUPPORTED_LANGS = ['zh-CN', 'en', 'ja'];
export const FALLBACK_LANG = 'en';

let currentLang = FALLBACK_LANG;
let messages = {};
let fallbackMessages = {};
const subscribers = new Set();

function browserDefaultLang() {
    try {
        const ui = (chrome?.i18n?.getUILanguage?.() || globalThis.navigator?.language || 'en').toLowerCase();
        if (ui.startsWith('zh')) return 'zh-CN';
        if (ui.startsWith('ja')) return 'ja';
        return 'en';
    } catch {
        return FALLBACK_LANG;
    }
}

export function resolveLang(rawLang) {
    if (!rawLang || rawLang === 'system') return browserDefaultLang();
    if (SUPPORTED_LANGS.includes(rawLang)) return rawLang;
    return FALLBACK_LANG;
}

function localeUrl(lang) {
    try {
        return chrome.runtime.getURL(`src/i18n/${lang}.json`);
    } catch {
        return `/src/i18n/${lang}.json`;
    }
}

async function fetchLocale(lang) {
    try {
        const resp = await fetch(localeUrl(lang));
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (err) {
        reportError('i18n.fetch', err, { lang });
        return {};
    }
}

export async function loadLocale(lang) {
    const target = SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
    const [main, fb] = await Promise.all([
        fetchLocale(target),
        target === FALLBACK_LANG ? Promise.resolve(null) : fetchLocale(FALLBACK_LANG)
    ]);
    currentLang = target;
    messages = main || {};
    fallbackMessages = fb || main || {};
    if (typeof document !== 'undefined') {
        document.documentElement.lang = target;
    }
}

export function getLang() {
    return currentLang;
}

export function t(key, params) {
    if (!key) return '';
    const tpl = (key in messages) ? messages[key]
              : (key in fallbackMessages) ? fallbackMessages[key]
              : key;
    if (!params) return String(tpl);
    return String(tpl).replace(/\{(\w+)\}/g, (_, name) => {
        const val = params[name];
        return val == null ? '' : String(val);
    });
}

export function onLangChange(fn) {
    if (typeof fn !== 'function') return () => {};
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

function emitLangChange() {
    for (const fn of [...subscribers]) {
        try { fn(currentLang); } catch (err) {
            reportError('i18n.subscriber', err);
        }
    }
}

// 应用 data-i18n / data-i18n-attr / data-i18n-html 到 root(含 root 自身)
// data-i18n="key"                 → textContent = t(key)
// data-i18n-html="key"            → innerHTML = t(key)  (用于含 <strong> 等的描述)
// data-i18n-attr="title:k1,placeholder:k2" → setAttribute(attr, t(k))
export function applyDom(root = document) {
    if (!root) return;
    const collected = [];
    const selector = '[data-i18n], [data-i18n-attr], [data-i18n-html]';
    if (root.matches?.(selector)) collected.push(root);
    if (typeof root.querySelectorAll === 'function') {
        collected.push(...root.querySelectorAll(selector));
    }
    for (const el of collected) {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);

        const htmlKey = el.getAttribute('data-i18n-html');
        if (htmlKey) el.innerHTML = t(htmlKey);

        const attrSpec = el.getAttribute('data-i18n-attr');
        if (attrSpec) {
            for (const pair of attrSpec.split(',')) {
                const [attr, k] = pair.split(':').map(s => s && s.trim());
                if (attr && k) el.setAttribute(attr, t(k));
            }
        }
    }
}

// 一次性初始化:根据用户语言偏好加载并应用到 document
export async function initI18n(preferredLang) {
    const target = resolveLang(preferredLang);
    await loadLocale(target);
    if (typeof document !== 'undefined') {
        applyDom(document.documentElement);
        applyDocumentTitle();
    }
}

// 运行时切换语言:重载 locale + 重 apply + 通知订阅者
export async function changeLang(rawLang) {
    const target = resolveLang(rawLang);
    if (target === currentLang) return;
    await loadLocale(target);
    if (typeof document !== 'undefined') {
        applyDom(document.documentElement);
        applyDocumentTitle();
    }
    emitLangChange();
}

// <title> 元素若带 data-i18n,document.title 也跟着更新(浏览器有时不同步)
function applyDocumentTitle() {
    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
        document.title = titleEl.textContent;
    }
}
