# Leaf-Tab 🍃

> 简约优雅的浏览器新标签页 —— 可自定义九宫格布局 + 插件化架构

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chrome](https://img.shields.io/badge/Chrome-supported-brightgreen?logo=googlechrome)](https://www.google.com/chrome/)
[![Edge](https://img.shields.io/badge/Edge-supported-brightgreen?logo=microsoftedge)](https://www.microsoft.com/edge)

Leaf-Tab 用一个极简的起始页替换浏览器新标签页:中央搜索框、可拖拽的九宫格布局、可启停的插件模块,外观干净到不打扰你。

---

## ✨ 特性

- **极简主义外观** —— 跟随系统 / 手动切换浅色与深色主题,支持平滑过渡动画
- **多搜索引擎** —— Bing / Google / Baidu 一键切换,SVG 图标跟随主题着色
- **DIY 九宫格布局** —— 拖拽放置任意模块到想要的格子,支持 `1×1` 到 `6×6` 的网格
- **行/列容器** —— 在同一个格子里并排或堆叠多个 widget
- **插件商城** —— 内置收藏插件,支持启用 / 禁用 / 配置
- **收藏集** —— 点击工具栏图标一键收藏当前页,自动获取 favicon,数据走 `chrome.storage.local`
- **响应式设计** —— 设置页带侧边栏抽屉,移动端友好
- **稳健的数据层** —— chrome.storage 配额自动降级、错误通道统一上报、parentId 循环引用检测

---

## 📦 安装

### 从源码加载(开发者模式)

1. 克隆仓库
   ```bash
   git clone https://github.com/EggFine/Leaf-Tab.git
   cd Leaf-Tab
   ```

2. 打开 Chrome / Edge 扩展管理页
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`

3. 开启 **开发者模式**,点击 **"加载已解压的扩展"**,选择本仓库根目录

4. 打开新标签页即可看到 Leaf-Tab

> Chrome 网上应用店 / Edge Add-ons 商店版本尚未发布,欢迎 Star 关注进展。

---

## 🗂 项目结构

```
leaf-tab/
├── manifest.json              # Manifest V3 入口
├── src/
│   ├── background/
│   │   └── background.js      # Service Worker:安装迁移 + 消息路由
│   ├── common/                # 跨页面共享的基础设施
│   │   ├── storage.js         # chrome.storage 封装 + 配额降级
│   │   ├── bookmarks.js       # 书签数据层(storage.local)
│   │   ├── errors.js          # 统一错误上报 + 订阅机制
│   │   ├── toast.js           # 轻量通知组件
│   │   └── toast.css
│   ├── newtab/                # 新标签页(主界面)
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   │       ├── main.js        # 启动 + 事件绑定
│   │       ├── store.js       # 设置数据层 + schema 迁移
│   │       ├── layout.js      # 动态网格布局引擎
│   │       ├── theme.js
│   │       ├── widgetRegistry.js   # widget 注册表 + manifest 校验
│   │       └── widgets/
│   │           ├── core/       # 核心 widget(搜索、主题、设置入口、品牌、容器)
│   │           └── plugins/    # 可选插件(bookmarks 等)
│   ├── popup/                 # 工具栏弹窗(快速收藏)
│   └── settings/              # 独立设置页(多 tab,可在新标签打开)
│       ├── index.html
│       ├── css/
│       ├── js/
│       └── tabs/               # 各 tab 的 HTML 片段
└── LICENSE
```

---

## 🧩 Widget / 插件架构

Leaf-Tab 把所有界面元素抽象为 **widget**,统一通过注册表挂载:

```js
// 一个最小 widget manifest
const manifest = {
    id: 'my-widget',
    type: 'plugin',              // 'core' | 'plugin' | 'container'
    name: '我的插件',
    description: '...',
    icon: '<svg>...</svg>',
    version: '1.0.0',
    author: 'You',
    configSchema: [
        { key: 'fontSize', label: '字号', type: 'number', default: 14, min: 10, max: 32 },
        { key: 'accent',   label: '高亮色', type: 'color',  default: '#4e73df' }
    ],
    mount(container, ctx) {
        // 在 container 里挂载你的 DOM;ctx.config 读取当前配置
    },
    unmount() { /* 清理 */ },
    onConfigChange() { /* 配置变更回调 */ },
    onSettingsChange() { /* 全局设置变更回调 */ }
};

export default manifest;
```

注册 widget:

```js
// src/newtab/js/main.js
import myManifest from './widgets/plugins/my-widget.js';
registerWidget(myManifest);
```

支持的 `configSchema` 类型:`toggle` / `select` / `number` / `text` / `color`。

布局引擎会根据用户的 DIY 网格配置,把每个已启用的 widget 渲染到正确的格子(或浮层槽)。

---

## 🛠 开发

项目目前是**零构建**的原生 ES Modules 设计,不需要 `npm install`、webpack 或 babel。直接改代码,在扩展管理页点"刷新"即可看到效果。

### 建议的工作流

```bash
# 加载扩展后,改代码 → 去扩展管理页点刷新按钮 → 打开新标签页验证
```

### 约定

- 所有数据读写统一通过 `src/common/storage.js`,不要直接用 `chrome.storage.sync.set`
- 错误通过 `reportError(source, err)` 上报,toast 会自动订阅显示
- 新 widget 放在 `src/newtab/js/widgets/plugins/` 下,记得在 `main.js` 里注册

---

## 🗺 路线图

- [x] Widget / 插件架构
- [x] DIY 九宫格布局(含行/列容器)
- [x] 存储配额降级 + 书签本地化
- [x] 移动端响应式
- [ ] 国际化(i18n)
- [ ] 插件热加载 / 第三方插件
- [ ] 扩展商店图标与发布
- [ ] 更多内置插件(天气、待办、时钟等)

---

## 📜 协议

本项目基于 [Apache License 2.0](./LICENSE) 开源。

---

## 🙌 致谢

Crafted with care by [@EggFine](https://github.com/EggFine).

欢迎 Issue / PR / Star。
