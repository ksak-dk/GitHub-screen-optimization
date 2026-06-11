# GitHub Screen Optimization（浏览器扩展）

[English](README.en.md) | [中文](README.md) | [한국어](README.ko.md)

本仓库提供一个用于优化 GitHub 页面浏览体验的浏览器扩展，覆盖仓库页、Release 页和通用交互。

## 后端依赖

本扩展依赖同级工作区中的后端仓库 `gitdash-backend`。扩展页面会请求本地接口 `http://localhost:3000/api/v1/repos/:owner/:repo/dashboard` 获取仓库概览数据，因此必须先启动后端服务，再加载扩展。

如果你的工作区结构与当前一致，请先进入 `gitdash-backend` 仓库启动服务，再返回本仓库加载扩展。

## 功能概览

- 仓库页增强：在仓库根页面生成 Project Summary 卡片，展示 Stars、Issues、最近更新、近 12 周活跃度和语言占比图
- Release 页增强：自动检测操作系统与 CPU 架构，按匹配度对 Assets 列表排序，并高亮最匹配项
- 通用增强：在页面向下滚动时显示右下角「返回顶部」按钮
- Popup 开关：通过 `chrome.storage.sync` 持久化总开关，内容脚本会在设置变化后即时生效
- 语言切换：在 Popup 中选择中文、英语或韩语，更新仓库页 Summary 与返回顶部按钮文案

## 本地运行

在加载扩展前，请先启动同级目录中的后端仓库 `gitdash-backend`：

```bash
cd ..\gitdash-backend
docker compose up -d
```

1. 确认后端可访问，打开 `http://localhost:3000`
2. 打开 `chrome://extensions`（Edge 用 `edge://extensions`）
3. 打开「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本仓库目录（包含 `manifest.json` 的目录）

随后访问 `https://github.com/`（需登录）进行验证。

## 验证清单

- Summary：打开任意仓库首页（例如 `https://github.com/OWNER/REPO`），文件列表前应出现 Project Summary 卡片，且包含语言占比条和近 12 周提交柱状图
- Release 匹配：打开 `.../releases/latest` 或具体 tag 的 release 页面，确认最匹配的资源已排到最前并被高亮
- Release 列表页：打开 `.../releases` 页面，确认 Latest release 的 Assets 已自动展开，便于直接查看匹配结果
- 返回顶部：在 GitHub 页面向下滚动后，应出现「↑ + 文案」按钮；在仓库浏览页，该按钮会出现在页面右侧区域（约右侧 1/3、下方 2/3）
- 语言切换：在 Popup 中将 Language 下拉框切换为 zh/en/ko，确认页面无需刷新即可更新 Summary 和 Top 文案

## 权限

- `storage`：用于保存和同步开关设置
- `https://github.com/*`：仅在 GitHub 页面注入内容脚本
- `http://localhost:3000/*`：用于从本地后端 `gitdash-backend` 获取聚合数据

## 调试说明

- 修改代码后，请在扩展管理页点击「重新加载」
- Content Script 调试：打开 GitHub 页面 DevTools → Console
- Popup 调试：打开扩展详情页，使用 Inspect views

## 文件说明

- `manifest.json`：MV3 清单
- `content.js`：内容脚本，用于检测仓库页面并注入样式
- `popup.html/js/css`：Popup 界面、交互逻辑和设置存储
