# GitHub Screen Optimization（浏览器扩展）

[中文](README.md) | [한국어](README.ko.md)

用于优化 GitHub 页面浏览体验（仓库页 / Release 页 / 通用交互）。

## 功能（MVP）

- 仓库浏览优化：在仓库根页面生成 Project Summary 卡片，展示 Stars/Issues、最近更新、近 12 周活跃度与语言占比图
- Release 页面优化：自动检测操作系统与 CPU 架构，对 Assets 列表按匹配度排序，并高亮最匹配项
- 通用增强：向下滚动时显示右下角「返回顶部」按钮
- 提供 Popup 总开关，并通过 `chrome.storage.sync` 持久化（内容脚本监听设置变更即时生效）
- 语言切换：在 Popup 里选择中文/英语/韩语，影响仓库页 Summary 与返回顶部按钮文案

## 本地加载（Chrome / Edge）

1. 打开 `chrome://extensions`（Edge 用 `edge://extensions`）
2. 打开「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本仓库目录（包含 `manifest.json` 的目录）

然后访问 `https://github.com/`（需登录）即可。

## 验收/自测建议

- Summary：打开任意仓库首页（如 `https://github.com/OWNER/REPO`），文件列表前会出现 Project Summary 卡片（含语言占比条与近 12 周提交柱状图）
- Release 匹配：打开 `.../releases/latest` 或具体 tag 的 release 页面，观察 Assets 列表中最匹配的资源是否排到最前并高亮
- Release 列表页：在 `.../releases` 页面会自动展开 Latest 那条 release 的 Assets，便于直接看到匹配结果
- 返回顶部：在 GitHub 页面向下滚动后出现「↑ + 文案」按钮（文案随语言切换）；在仓库浏览页按钮会出现在页面右侧区域（约右侧 1/3、下方 2/3）
- 语言切换：打开 Popup，将 Language 下拉框切换为 zh/en/ko，页面无需刷新即可看到 Summary/Top 文案更新

## 权限说明

- `storage`：保存/同步开关设置
- `https://github.com/*`：仅在 GitHub 页面注入内容脚本

## 调试建议

- 修改代码后在扩展管理页点击「重新加载」
- Content Script 调试：打开 GitHub 页面 DevTools → Console
- Popup 调试：扩展详情页 → Inspect views

## 目录说明

- `manifest.json`：MV3 清单
- `content.js`：内容脚本（检测是否为首页并注入样式）
- `popup.html/js/css`：开关 UI 与设置存储
