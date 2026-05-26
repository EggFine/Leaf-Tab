# Leaf-Tab 🍃

> シンプルで上品なブラウザのスタートページ — カスタマイズ可能なグリッドレイアウト + プラグインアーキテクチャ

**言語**:[简体中文](README.md) · [English](README.en.md) · **日本語**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chrome](https://img.shields.io/badge/Chrome-supported-brightgreen?logo=googlechrome)](https://www.google.com/chrome/)
[![Edge](https://img.shields.io/badge/Edge-supported-brightgreen?logo=microsoftedge)](https://www.microsoft.com/edge)
[![Version](https://img.shields.io/badge/version-1.0.1-blue)](./manifest.json)

Leaf-Tab はブラウザの新しいタブをミニマルなスタートページに置き換えます:中央の検索ボックス、ドラッグで並び替えられるグリッドレイアウト、オン/オフ切替可能なプラグインモジュール。邪魔にならない静かなデザインです。

---

## ✨ 特長

- **ミニマルな外観** — システムに従う / 手動でライト・ダークテーマを切替、スムーズな遷移アニメーション
- **複数の検索エンジン** — Bing / Google / Baidu をワンクリックで切替、SVG アイコンはテーマに合わせて自動配色
- **DIY グリッドレイアウト** — 任意のウィジェットを好きなセルにドラッグ&ドロップ、`1×1` から `6×6` まで対応
- **行/列コンテナ** — 1 つのセル内で複数ウィジェットを横並び/縦積みに配置
- **プラグインストア** — 内蔵ブックマークプラグイン、有効化 / 無効化 / 設定が可能
- **ブックマーク** — ツールバーアイコンをクリックして現在のページを保存、favicon は自動取得、`chrome.storage.local` に格納
- **多言語対応** — 简体中文 / English / 日本語、設定で切替、システムに従う設定もあり
- **レスポンシブ** — 設定ページはサイドバードロワー、モバイルでも快適
- **堅牢なデータ層** — `chrome.storage` の容量超過時に自動降格、統一エラーチャネル、parentId 循環参照の検出

---

## 📦 インストール

### ソースから読み込み(開発者モード)

1. リポジトリをクローン
   ```bash
   git clone https://github.com/EggFine/Leaf-Tab.git
   cd Leaf-Tab
   ```

2. Chrome / Edge の拡張機能管理ページを開く
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`

3. **デベロッパーモード** を有効にし、**「パッケージ化されていない拡張機能を読み込む」** をクリック、このリポジトリのルートディレクトリを選択

4. 新しいタブを開くと Leaf-Tab が表示されます

> Chrome ウェブストア / Edge アドオンストアにはまだ公開していません。Star してお待ちください。

---

## 🗂 プロジェクト構成

```
leaf-tab/
├── manifest.json              # Manifest V3 エントリ(__MSG_*__ で本地化)
├── _locales/                  # chrome.i18n 用の拡張機能名/説明翻訳
│   ├── zh_CN/messages.json
│   ├── en/messages.json
│   └── ja/messages.json
├── icons/                     # ツールバー / 拡張機能管理ページ用アイコン(PNG)
│   ├── icon-source.svg        # 元ファイル、sharp / Pillow で PNG を再生成
│   └── icon{16,32,48,128}.png
├── src/
│   ├── background/
│   │   └── background.js      # Service Worker:インストール時のマイグレーション + メッセージルーティング
│   ├── common/                # ページ間共有のインフラ
│   │   ├── i18n.js            # 実行時 i18n エンジン(loadLocale / t / applyDom / changeLang)
│   │   ├── leaf.svg           # 葉の favicon
│   │   ├── storage.js         # chrome.storage ラッパー + 容量降格
│   │   ├── bookmarks.js       # ブックマークデータ層(storage.local)
│   │   ├── errors.js          # 統一エラーレポート + 購読機能
│   │   ├── toast.js           # 軽量通知コンポーネント
│   │   └── toast.css
│   ├── i18n/                  # 実行時翻訳ファイル(ページ内で言語切替可能)
│   │   ├── zh-CN.json
│   │   ├── en.json
│   │   └── ja.json
│   ├── newtab/                # 新しいタブページ(メイン UI)
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   │       ├── main.js        # 起動 + イベント配線
│   │       ├── store.js       # 設定データ層 + スキーママイグレーション
│   │       ├── layout.js      # 動的グリッドレイアウトエンジン
│   │       ├── theme.js
│   │       ├── widgetRegistry.js   # ウィジェットレジストリ + manifest 検証
│   │       └── widgets/
│   │           ├── core/       # コアウィジェット(検索、テーマ、設定、ブランド、コンテナ)
│   │           └── plugins/    # オプションプラグイン(bookmarks など)
│   ├── popup/                 # ツールバーポップアップ(クイックブックマーク)
│   └── settings/              # 独立した設定ページ(マルチタブ、新しいタブで開く)
│       ├── index.html
│       ├── css/
│       ├── js/
│       └── tabs/               # 各タブの HTML 断片
└── LICENSE
```

---

## 🧩 ウィジェット / プラグインアーキテクチャ

Leaf-Tab はすべての UI 要素を **ウィジェット** として抽象化し、レジストリ経由で統一的にマウントします:

```js
// 最小限のウィジェット manifest
const manifest = {
    id: 'my-widget',
    type: 'plugin',              // 'core' | 'plugin' | 'container'
    name: 'widget.myWidget.name',           // i18n キー
    description: 'widget.myWidget.description', // i18n キー
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
        // container 内に DOM をマウント、ctx.config から現在の設定を読み込む
        // ユーザーに見える文字列は t('your.key', { var: 1 }) を使う
    },
    unmount() { /* クリーンアップ */ },
    onConfigChange() { /* 設定変更コールバック */ },
    onSettingsChange() { /* グローバル設定変更コールバック、言語切替時にも発火 */ }
};

export default manifest;
```

ウィジェットの登録:

```js
// src/newtab/js/main.js
import myManifest from './widgets/plugins/my-widget.js';
registerWidget(myManifest);
```

サポートされる `configSchema` タイプ:`toggle` / `select` / `number` / `text` / `color`

レイアウトエンジンは、ユーザーの DIY グリッド設定に基づいて、有効化された各ウィジェットを正しいセル(またはフロートスロット)に配置します。

---

## 🌐 国際化(i18n)

Leaf-Tab は 2 系統の i18n を併用しています:

- **`chrome.i18n` + `_locales/`** — `manifest.json` の拡張機能名と説明のみ(install-time、実行時切替不可)
- **カスタム JS エンジン** — `src/common/i18n.js` が実行時 `t(key, params)` と `changeLang(lang)` を提供、それ以外の UI はすべてこちらを通る

### 新しい言語を追加する

1. `src/i18n/zh-CN.json` を `src/i18n/<new-lang>.json` にコピーして全キーを翻訳
2. `src/common/i18n.js` の `SUPPORTED_LANGS` に `<new-lang>` を追加
3. `src/settings/tabs/general.html` の言語ドロップダウンに項目を追加:
   `<div class="custom-option" data-value="<new-lang>" data-i18n="settings.language.<new-lang>">...</div>`
4. (任意)`_locales/<new-lang>/messages.json` で manifest フィールドを翻訳
5. 3 つの locale JSON すべてに `settings.language.<new-lang>` を追加

### コード内での文字列取得

```js
import { t } from '../common/i18n.js';
const msg = t('popup.status.siteMatch', { title: 'ブックマーク済みページ' });
// → "同じサイトの既存ブックマークを検出: \"ブックマーク済みページ\""
```

HTML 内:

```html
<p data-i18n="settings.about.description">フォールバックテキスト</p>
<button data-i18n-attr="aria-label:btn.aria">...</button>
<p data-i18n-html="settings.layout.intro"><strong>リッチテキスト</strong>を含む</p>
```

---

## 🛠 開発

このプロジェクトは **ビルド不要** で、ネイティブ ES Modules 設計です。`npm install`、webpack、babel は不要。コードを編集し、拡張機能管理ページで「更新」をクリックすれば反映されます。

### 推奨ワークフロー

```bash
# 拡張機能をロード後:コード編集 → 拡張機能管理ページで更新ボタンをクリック → 新しいタブで検証
```

### 規約

- すべてのデータ読み書きは `src/common/storage.js` 経由、`chrome.storage.sync.set` を直接呼ばない
- エラーは `reportError(source, err)` で報告、toast が自動購読
- ユーザーに見える文字列は `t(key)` / `data-i18n` を使い、リテラルを直書きしない
- 新しいウィジェットは `src/newtab/js/widgets/plugins/` 配下に置き、`main.js` で登録を忘れずに

### アイコンの再生成

```bash
# icons/icon-source.svg を編集した後
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

## 🗺 ロードマップ

- [x] ウィジェット / プラグインアーキテクチャ
- [x] DIY グリッドレイアウト(行/列コンテナ含む)
- [x] ストレージ容量降格 + ブックマークのローカル化
- [x] モバイルレスポンシブ
- [x] 国際化(简体中文 / English / 日本語)
- [ ] プラグインのホットリロード / サードパーティプラグイン
- [ ] ストア用アイコンと公開
- [ ] 内蔵プラグインの追加(天気、ToDo、時計など)

---

## 📜 ライセンス

本プロジェクトは [Apache License 2.0](./LICENSE) で公開されています。

---

## 🙌 謝辞

Crafted with care by [@EggFine](https://github.com/EggFine).

Issue / PR / Star を歓迎します。
