# GitHub Screen Optimization (Browser Extension)

[English](README.en.md) | [中文](README.md) | [한국어](README.ko.md)

This repository provides a browser extension that enhances the GitHub browsing experience across repository pages, release pages, and common interactions.

## Backend Dependency

This extension depends on the backend repository `gitdash-backend` in the same workspace. It fetches repository summary data from the local API `http://localhost:3000/api/v1/repos/:owner/:repo/dashboard`, so the backend service must be started before the extension is loaded.

If your workspace matches the current layout, start the service from `gitdash-backend` first, then return to this repository and load the extension.

## Feature Overview

- Repository page enhancement: injects a Project Summary card on repository root pages, showing Stars, Issues, recent updates, the last 12 weeks of activity, and language distribution
- Release page enhancement: automatically detects the operating system and CPU architecture, sorts release assets by match score, and highlights the best match
- Common enhancement: displays a bottom-right Back to Top button while scrolling down
- Popup toggle: persists the master switch through `chrome.storage.sync`, and the content script reflects setting changes immediately
- Language switching: choose Chinese, English, or Korean in the Popup to update the repository summary and Back to Top labels

## Local Run

Before loading the extension, start the backend repository `gitdash-backend` in the same workspace:

```bash
cd ..\gitdash-backend
docker compose up -d
```

1. Confirm that the backend is reachable at `http://localhost:3000`
2. Open `chrome://extensions` (or `edge://extensions` in Edge)
3. Enable Developer mode
4. Click Load unpacked
5. Select this repository directory (the folder that contains `manifest.json`)

Then visit `https://github.com/` while signed in to verify the extension.

## Verification Checklist

- Summary: open any repository home page, such as `https://github.com/OWNER/REPO`, and verify that a Project Summary card appears before the file list
- Release matching: open `.../releases/latest` or a tagged release page and verify that the best matching asset is moved to the top and highlighted
- Release list page: open `.../releases` and confirm that the latest release assets are expanded automatically so the matching result is visible immediately
- Back to top: scroll down any GitHub page and confirm that the button appears in the bottom-right area, with its label changing by language
- Language switch: open the Popup and switch the Language dropdown between zh/en/ko; the Summary and Top labels should update without a refresh

## Permissions

- `storage`: stores and synchronizes the toggle settings
- `https://github.com/*`: injects the content script only on GitHub pages
- `http://localhost:3000/*`: fetches aggregated data from the local backend `gitdash-backend`

## Debugging Notes

- After code changes, click Reload in the extensions management page
- Content script debugging: GitHub page DevTools → Console
- Popup debugging: extension details page → Inspect views

## File Reference

- `manifest.json`: MV3 manifest
- `content.js`: content script, responsible for page detection and style injection
- `popup.html/js/css`: Popup UI, interaction logic, and settings storage
