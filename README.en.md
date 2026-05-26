# Leaf-Tab 🍃

> A minimal, elegant browser start page — DIY grid layout + plugin architecture

**Language**: [简体中文](README.md) · **English** · [日本語](README.ja.md)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chrome](https://img.shields.io/badge/Chrome-supported-brightgreen?logo=googlechrome)](https://www.google.com/chrome/)
[![Edge](https://img.shields.io/badge/Edge-supported-brightgreen?logo=microsoftedge)](https://www.microsoft.com/edge)
[![Version](https://img.shields.io/badge/version-1.0.1-blue)](./manifest.json)

Leaf-Tab replaces your new tab page with a minimalist start screen: a central search box, a draggable grid layout, and toggleable plugin modules. Quiet enough to stay out of your way.

---

## ✨ Features

- **Minimalist look** — Follow system or manually toggle light / dark themes with smooth transitions
- **Multiple search engines** — One-click switch between Bing / Google / Baidu; SVG icons recolor to match the theme
- **DIY grid layout** — Drag any widget into any cell; supports grids from `1×1` up to `6×6`
- **Row / column containers** — Place multiple widgets side by side or stacked inside a single cell
- **Plugin store** — Built-in bookmarks plugin; install / uninstall / configure on demand
- **Bookmarks** — Click the toolbar icon to bookmark the current page; favicons auto-detected; stored in `chrome.storage.local`
- **Multilingual** — 简体中文 / English / 日本語, switchable in settings or "Follow system"
- **Responsive** — Sidebar drawer on the settings page; mobile-friendly
- **Robust data layer** — Automatic fallback when `chrome.storage` quota is exceeded, unified error channel, parentId cycle detection

---

## 📦 Installation

### Load from source (developer mode)

1. Clone the repo
   ```bash
   git clone https://github.com/EggFine/Leaf-Tab.git
   cd Leaf-Tab
   ```

2. Open the extension management page in Chrome / Edge
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`

3. Enable **Developer mode**, click **"Load unpacked"**, and select this repository's root directory

4. Open a new tab — Leaf-Tab is live

> Not yet published to the Chrome Web Store / Edge Add-ons. Star the repo to follow progress.

---

## 🗂 Project structure

```
leaf-tab/
├── manifest.json              # Manifest V3 entry point (uses __MSG_*__ for i18n)
├── _locales/                  # chrome.i18n locale files for extension name/description
│   ├── zh_CN/messages.json
│   ├── en/messages.json
│   └── ja/messages.json
├── icons/                     # Toolbar & extension-management icons (PNG)
│   ├── icon-source.svg        # Source; re-render PNGs via sharp / Pillow
│   └── icon{16,32,48,128}.png
├── src/
│   ├── background/
│   │   └── background.js      # Service worker: install migration + message routing
│   ├── common/                # Shared infrastructure
│   │   ├── i18n.js            # Runtime i18n engine (loadLocale / t / applyDom / changeLang)
│   │   ├── leaf.svg           # Leaf favicon
│   │   ├── storage.js         # chrome.storage wrapper + quota fallback
│   │   ├── bookmarks.js       # Bookmarks data layer (storage.local)
│   │   ├── errors.js          # Unified error reporting + subscription
│   │   ├── toast.js           # Lightweight notification component
│   │   └── toast.css
│   ├── i18n/                  # Runtime translation files (switchable at runtime)
│   │   ├── zh-CN.json
│   │   ├── en.json
│   │   └── ja.json
│   ├── newtab/                # New tab page (main UI)
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   │       ├── main.js        # Bootstrap + event wiring
│   │       ├── store.js       # Settings data layer + schema migrations
│   │       ├── layout.js      # Dynamic grid layout engine
│   │       ├── theme.js
│   │       ├── widgetRegistry.js   # Widget registry + manifest validation
│   │       └── widgets/
│   │           ├── core/       # Core widgets (search, theme, settings, brand, containers)
│   │           └── plugins/    # Optional plugins (bookmarks, etc.)
│   ├── popup/                 # Toolbar popup (quick bookmark)
│   └── settings/              # Standalone settings page (multi-tab; opens in a tab)
│       ├── index.html
│       ├── css/
│       ├── js/
│       └── tabs/               # Per-tab HTML fragments
└── LICENSE
```

---

## 🧩 Widget / plugin architecture

Leaf-Tab models every UI element as a **widget**, mounted via a central registry:

```js
// A minimal widget manifest
const manifest = {
    id: 'my-widget',
    type: 'plugin',              // 'core' | 'plugin' | 'container'
    name: 'widget.myWidget.name',           // i18n key
    description: 'widget.myWidget.description', // i18n key
    icon: '<svg>...</svg>',
    version: '1.0.0',
    author: 'You',
    configSchema: [
        { key: 'fontSize', label: 'widget.myWidget.config.fontSize.label',
          type: 'number', default: 14, min: 10, max: 32 },
        { key: 'accent',   label: 'widget.myWidget.config.accent.label',
          type: 'color',  default: '#4e73df' }
    ],
    mount(container, ctx) {
        // Mount your DOM inside `container`; read current config from ctx.config
        // Use t('your.key', { var: 1 }) for any user-visible string
    },
    unmount() { /* cleanup */ },
    onConfigChange() { /* config update callback */ },
    onSettingsChange() { /* global settings callback — fires on language change too */ }
};

export default manifest;
```

Register it:

```js
// src/newtab/js/main.js
import myManifest from './widgets/plugins/my-widget.js';
registerWidget(myManifest);
```

Supported `configSchema` types: `toggle` / `select` / `number` / `text` / `color`.

The layout engine renders each enabled widget into the correct grid cell (or float slot) based on the user's DIY layout config.

---

## 🌐 Internationalization (i18n)

Leaf-Tab uses two i18n systems side-by-side:

- **`chrome.i18n` + `_locales/`** — only for `manifest.json` extension name and description (install-time only; can't be switched at runtime)
- **Custom JS engine** — `src/common/i18n.js` provides runtime `t(key, params)` and `changeLang(lang)`; everything else in the UI flows through this

### Adding a new language

1. Copy `src/i18n/zh-CN.json` to `src/i18n/<new-lang>.json` and translate every key
2. Add `<new-lang>` to `SUPPORTED_LANGS` in `src/common/i18n.js`
3. Add an option to the language dropdown in `src/settings/tabs/general.html`:
   `<div class="custom-option" data-value="<new-lang>" data-i18n="settings.language.<new-lang>">...</div>`
4. (Optional) Translate the manifest fields in `_locales/<new-lang>/messages.json`
5. Add `settings.language.<new-lang>` to all three locale JSON files

### Looking up strings in code

```js
import { t } from '../common/i18n.js';
const msg = t('popup.status.siteMatch', { title: 'Bookmarked page' });
// → "Found an existing bookmark from the same site: \"Bookmarked page\""
```

In HTML:

```html
<p data-i18n="settings.about.description">Fallback text</p>
<button data-i18n-attr="aria-label:btn.aria">...</button>
<p data-i18n-html="settings.layout.intro">Contains <strong>rich text</strong></p>
```

---

## 🛠 Development

The project is **build-free** — vanilla ES modules, no `npm install`, no webpack, no babel. Edit the code, click "reload" in the extension manager, and you're done.

### Suggested workflow

```bash
# After loading the extension: edit code → click reload in the extension manager → check the new tab page
```

### Conventions

- All storage reads/writes go through `src/common/storage.js`; don't call `chrome.storage.sync.set` directly
- Errors flow through `reportError(source, err)`; toast subscribes automatically
- User-visible strings use `t(key)` / `data-i18n`; never hardcode literals
- New widgets go under `src/newtab/js/widgets/plugins/`; remember to register them in `main.js`

### Regenerating the icons

```bash
# After editing icons/icon-source.svg
npm install --no-save sharp
node -e "
const sharp = require('sharp'), fs = require('fs');
const svg = fs.readFileSync('icons/icon-source.svg');
[16,32,48,128].forEach(s => sharp(svg, {density:384})
    .resize(s, s, {fit:'contain', background:{r:0,g:0,b:0,alpha:0}})
    .png().toFile('icons/icon'+s+'.png'));
"
```

---

## 🗺 Roadmap

- [x] Widget / plugin architecture
- [x] DIY grid layout (with row / column containers)
- [x] Storage quota fallback + local bookmarks
- [x] Mobile responsive
- [x] Internationalization (简体中文 / English / 日本語)
- [ ] Plugin hot reload / third-party plugins
- [ ] Store-ready icons & publication
- [ ] More built-in plugins (weather, todo, clock, etc.)

---

## 📜 License

This project is licensed under [Apache License 2.0](./LICENSE).

---

## 🙌 Credits

Crafted with care by [@EggFine](https://github.com/EggFine).

Issues / PRs / Stars welcome.
