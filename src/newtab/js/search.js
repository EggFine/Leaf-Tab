import { currentSettings } from "./store.js";

const engines = {
  bing: {
    url: "https://www.bing.com/search?q=",
    name: "必应，有求必应",
    name_en: "Bing",
    icon: "assets/bing.svg",
  },
  google: {
    url: "https://www.google.com/search?q=",
    name: "Google 谷歌",
    name_en: "Google",
    icon: "assets/google.svg",
  },
  baidu: {
    url: "https://www.baidu.com/s?wd=",
    name: "百度一下，你就知道",
    name_en: "Baidu",
    icon: "assets/baidu.svg",
  },
};

export function updateSearchPlaceholder() {
  const searchInput = document.getElementById("searchInput");
  const engineDisplay = document.getElementById("engineDisplay");

  const engineInfo = engines[currentSettings.engine] || engines["bing"];

  if (searchInput) {
    searchInput.placeholder = `在 ${engineInfo.name_en} 上搜索...`;
  }

  if (engineDisplay) {
    // 横向排列 [logo][引擎名]，Logo 通过 CSS mask 展现以支持主题色切换
    engineDisplay.innerHTML = `
            <div class="engine-icon" style="-webkit-mask-image: url('${engineInfo.icon}'); mask-image: url('${engineInfo.icon}');"></div>
            <h1>${engineInfo.name}</h1>
        `;
  }
}

export function initSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const searchTransition = document.getElementById("searchTransition");

  function performSearch() {
    const query = searchInput.value.trim();
    if (query) {
      const engineInfo = engines[currentSettings.engine] || engines["bing"];
      const targetUrl = `${engineInfo.url}${encodeURIComponent(query)}`;

      searchTransition.classList.add("active");
      searchInput.blur();

      setTimeout(() => {
        window.location.href = targetUrl;
      }, 500);
    }
  }

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  searchBtn.addEventListener("click", performSearch);

  // 初始化时设置占位符和引擎显示
  updateSearchPlaceholder();
}
