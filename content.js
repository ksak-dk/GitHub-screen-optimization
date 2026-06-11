const STORAGE_KEY = 'ghso:settings';
const STYLE_ID = 'ghso-style';
const TO_TOP_ID = 'ghso-to-top';

const DEFAULT_LANG = 'zh';

const I18N = {
  zh: {
    backToTopAria: '返回顶部',
    topLabel: 'TOP',
    projectSummary: '项目概览',
    readme: 'README',
    maintenance: '维护状态',
    starsForks: '星标 / 分叉',
    popularity: '热度',
    issues: '问题',
    open: '未关闭',
    closed: '已关闭',
    commitsAvg4: '每周提交（近4周均值）',
    activity: '活跃度',
    languages: '语言',
    activity12w: '活跃度（近12周）',
    languageCount: '{count} 种语言',
    statusArchived: '已归档',
    statusActive: '活跃',
    statusMaintained: '维护中',
    statusLowActivity: '低活跃',
    statusInactive: '不活跃',
    lastPushUnknown: '最近推送：—',
    lastPushDays: '最近推送：{days} 天前',
    maxPerWeek: '最高 {max}/周',
    commitsN: '{n} 次提交'
  },
  en: {
    backToTopAria: 'Back to top',
    topLabel: 'TOP',
    projectSummary: 'Project Summary',
    readme: 'README',
    maintenance: 'Maintenance',
    starsForks: 'Stars / Forks',
    popularity: 'Popularity',
    issues: 'Issues',
    open: 'Open',
    closed: 'Closed',
    commitsAvg4: 'Commits/week (4w avg)',
    activity: 'Activity',
    languages: 'Languages',
    activity12w: 'Activity (last 12 weeks)',
    languageCount: '{count} languages',
    statusArchived: 'Archived',
    statusActive: 'Active',
    statusMaintained: 'Maintained',
    statusLowActivity: 'Low activity',
    statusInactive: 'Inactive',
    lastPushUnknown: 'Last push —',
    lastPushDays: 'Last push {days}d ago',
    maxPerWeek: 'max {max} / wk',
    commitsN: '{n} commits'
  },
  ko: {
    backToTopAria: '맨 위로 이동',
    topLabel: 'TOP',
    projectSummary: '프로젝트 요약',
    readme: 'README',
    maintenance: '유지보수',
    starsForks: '스타 / 포크',
    popularity: '인기',
    issues: '이슈',
    open: '열림',
    closed: '닫힘',
    commitsAvg4: '주당 커밋(4주 평균)',
    activity: '활동',
    languages: '언어',
    activity12w: '활동(최근 12주)',
    languageCount: '{count}개 언어',
    statusArchived: '보관됨',
    statusActive: '활발함',
    statusMaintained: '유지보수 중',
    statusLowActivity: '낮은 활동',
    statusInactive: '비활성',
    lastPushUnknown: '마지막 푸시 —',
    lastPushDays: '마지막 푸시 {days}일 전',
    maxPerWeek: '최대 {max}/주',
    commitsN: '{n} 커밋'
  }
};

function normalizeLang(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'en' || v === 'ko' || v === 'zh') return v;
  return DEFAULT_LANG;
}

function t(lang, key, vars) {
  const l = normalizeLang(lang);
  const dict = I18N[l] || I18N[DEFAULT_LANG];
  let s = dict?.[key] ?? I18N[DEFAULT_LANG]?.[key] ?? String(key);
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

const GHSO_INTERNAL = {
  enabled: false,
  cleanups: [],
  lastAppliedUrl: '',
  lastAppliedConfig: '',
  lang: DEFAULT_LANG,
  repoCache: new Map()
};

function addCleanup(fn) {
  GHSO_INTERNAL.cleanups.push(fn);
}

function runCleanups() {
  const cleanups = GHSO_INTERNAL.cleanups.splice(0);
  for (const fn of cleanups.reverse()) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

function readSettings() {
  return new Promise((resolve) => {
    try {
      // When the extension is reloaded/updated, the page may still run old content scripts.
      // Guard against "Extension context invalidated".
      if (!chrome?.runtime?.id) {
        resolve({ enabled: false, lang: DEFAULT_LANG });
        return;
      }

      chrome.storage.sync.get([STORAGE_KEY], (res) => {
        if (chrome.runtime.lastError) {
          resolve({ enabled: true, lang: DEFAULT_LANG });
          return;
        }
        const settings = res?.[STORAGE_KEY] ?? { enabled: true };
        resolve({ enabled: !!settings.enabled, lang: normalizeLang(settings.lang) });
      });
    } catch {
      resolve({ enabled: true, lang: DEFAULT_LANG });
    }
  });
}

function isGitHub() {
  return location.hostname === 'github.com';
}

function detectRuntime() {
  const ua = navigator.userAgent || '';
  const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();

  let os = 'other';
  if (platform.includes('win') || /windows/i.test(ua)) os = 'windows';
  else if (platform.includes('mac') || /mac os/i.test(ua)) os = 'mac';
  else if (platform.includes('linux') || /linux/i.test(ua)) os = 'linux';

  let arch = 'other';
  if (/arm64|aarch64/i.test(ua)) arch = 'arm64';
  else if (/x86_64|win64|wow64|amd64|x64/i.test(ua)) arch = 'x64';
  else if (/i386|i686|x86(?!_64)/i.test(ua)) arch = 'x86';

  return { os, arch };
}

function isReleasePage() {
  // e.g. /OWNER/REPO/releases, /releases/tag/v1.0.0, /releases/latest
  return isGitHub() && /\/releases(\/|$)/.test(location.pathname);
}

function isRepoRootLikePage() {
  // Repo pages generally include repository_nwo meta.
  const repoNwo = document.querySelector('meta[name="octolytics-dimension-repository_nwo"]')?.getAttribute('content');
  if (!repoNwo) return false;

  // Try to limit to repo root or tree root.
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 2) return true; // /owner/repo
  if (parts.length === 4 && (parts[2] === 'tree' || parts[2] === 'blob')) return true;
  return false;
}

function getRepoNwo() {
  return (
    document
      .querySelector('meta[name="octolytics-dimension-repository_nwo"]')
      ?.getAttribute('content')
      ?.trim() ||
    ''
  );
}

function parseAbbrevNumber(text) {
  const t = String(text || '').trim().toLowerCase().replace(/,/g, '');
  const m = t.match(/([0-9.]+)\s*([km])?/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  if (m[2] === 'k') return Math.round(n * 1000);
  if (m[2] === 'm') return Math.round(n * 1000000);
  return Math.round(n);
}

function formatCompact(n) {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function daysSince(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

async function fetchBffDashboardData(nwo) {
  const cacheKey = `bffDashboard:${nwo}`;
  if (GHSO_INTERNAL.repoCache.has(cacheKey)) {
    return GHSO_INTERNAL.repoCache.get(cacheKey);
  }

  const [owner, repo] = nwo.split('/');
  if (!owner || !repo) return null;

  try {
    const res = await fetch(`http://localhost:3000/api/v1/repos/${owner}/${repo}/dashboard`, {
      credentials: 'omit',
      headers: {
        Accept: 'application/json'
      }
    });
    if (!res.ok) {
      GHSO_INTERNAL.repoCache.set(cacheKey, null);
      return null;
    }
    const data = await res.json();
    GHSO_INTERNAL.repoCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error('Error fetching GitDash BFF data:', err);
    GHSO_INTERNAL.repoCache.set(cacheKey, null);
    return null;
  }
}

function findRepoCounter(kind, nwo) {
  // kind: 'stars' | 'issues'
  if (!nwo) return null;

  if (kind === 'stars') {
    const el =
      document.querySelector(`a[href="/${nwo}/stargazers"] .Counter`) ||
      document.querySelector(`a[href$="/${nwo}/stargazers"] .Counter`) ||
      document.querySelector(`a[href*="/${nwo}/stargazers"] .Counter`) ||
      document.querySelector(`a[href*="/${nwo}/stargazers"]`);
    const txt = (el?.textContent || '').trim();
    return txt.replace(/stars?/i, '').trim() || null;
  }

  if (kind === 'issues') {
    const el =
      document.querySelector(`nav[aria-label="Repository"] a[href="/${nwo}/issues"] .Counter`) ||
      document.querySelector(`a[id$="issues-tab"] .Counter`) ||
      document.querySelector(`a[href*="/${nwo}/issues"] .Counter`) ||
      document.querySelector(`a[href*="/${nwo}/issues"]`);
    const txt = (el?.textContent || '').trim();
    return txt.replace(/issues?/i, '').trim() || null;
  }

  return null;
}

async function ensureRepoSummaryCard(lang) {
  if (!isRepoRootLikePage()) return;
  const nwo = getRepoNwo();
  if (!nwo) return;

  if (document.getElementById('ghso-repo-summary')) return;

  const L = normalizeLang(lang || GHSO_INTERNAL.lang);

  const repoContainer =
    document.querySelector('#repo-content-pjax-container') ||
    document.querySelector('div.application-main') ||
    document.body;

  const filesAnchor = repoContainer.querySelector('#files');
  const filesBox =
    filesAnchor?.closest('.Box') ||
    repoContainer.querySelector('[aria-labelledby="files"]')?.closest('.Box') ||
    null;

  const card = document.createElement('div');
  card.id = 'ghso-repo-summary';
  card.className = 'Box mb-3';
  card.innerHTML = `
    <div class="Box-header">
      <div class="d-flex flex-items-center flex-justify-between">
        <div class="d-flex flex-items-center gap-2">
          <div class="h4 mb-0"><span class="text-bold color-fg-default">${nwo}</span></div>
          <button type="button" class="btn btn-sm notranslate" translate="no" data-ghso-readme-btn><span class="notranslate" translate="no">${t(L, 'readme')}</span></button>
        </div>
        <div></div>
      </div>
    </div>
    <div class="Box-body">
      <div class="ghso-summary-grid">
        <div class="ghso-metric">
          <div class="ghso-k">${t(L, 'maintenance')}</div>
          <div class="ghso-v"><span class="ghso-badge" data-ghso-status>—</span></div>
          <div class="ghso-sub" data-ghso-lastpush>—</div>
        </div>
        <div class="ghso-metric">
          <div class="ghso-k">${t(L, 'starsForks')}</div>
          <div class="ghso-v"><span data-ghso-stars>—</span> / <span data-ghso-forks>—</span></div>
          <div class="ghso-sub">${t(L, 'popularity')}</div>
        </div>
        <div class="ghso-metric">
          <div class="ghso-k">${t(L, 'issues')}</div>
          <div class="ghso-issuesbar" aria-hidden="true">
            <span class="ghso-issues-open" data-ghso-issues-open-bar></span>
            <span class="ghso-issues-closed" data-ghso-issues-closed-bar></span>
          </div>
          <div class="ghso-sub">
            <span>${t(L, 'open')} <span data-ghso-issues-open>—</span></span>
            <span class="ml-2">${t(L, 'closed')} <span data-ghso-issues-closed>—</span></span>
          </div>
        </div>
        <div class="ghso-metric">
          <div class="ghso-k">${t(L, 'commitsAvg4')}</div>
          <div class="ghso-v" data-ghso-avg4>—</div>
          <div class="ghso-sub">${t(L, 'activity')}</div>
        </div>
      </div>

      <div class="mt-3">
        <div class="d-flex flex-items-center flex-justify-between mb-1">
          <div class="text-bold">${t(L, 'languages')}</div>
          <div class="color-fg-muted f6" data-ghso-lang-note></div>
        </div>
        <div class="ghso-langbar" data-ghso-langbar></div>
        <div class="ghso-langlegend" data-ghso-langlegend></div>
      </div>

      <div class="mt-3">
        <div class="d-flex flex-items-center flex-justify-between mb-1">
          <div class="text-bold">${t(L, 'activity12w')}</div>
          <div class="color-fg-muted f6" data-ghso-activity-note></div>
        </div>
        <div class="ghso-activity" data-ghso-activity></div>
      </div>
    </div>
  `;

  if (filesBox?.parentNode) {
    filesBox.parentNode.insertBefore(card, filesBox);
  } else {
    // Fallback: insert near top of main content.
    const main = document.querySelector('main') || repoContainer;
    main.prepend(card);
  }

  addCleanup(() => {
    card.remove();
  });

  const readmeBtn = card.querySelector('[data-ghso-readme-btn]');
  if (readmeBtn instanceof HTMLElement) {
    readmeBtn.classList.add('notranslate');
    readmeBtn.setAttribute('translate', 'no');
    // Some translation extensions mutate text after insertion; force the label back.
    readmeBtn.textContent = t(L, 'readme');
  }
  const onReadme = () => {
    // New GitHub UI (Overview): README may be in a "Repository files" nav with hash "#readme-ov-file".
    const repoFilesNav = document.querySelector('nav[aria-label="Repository files"]');
    const repoFilesReadmeLink = repoFilesNav
      ? Array.from(repoFilesNav.querySelectorAll('a')).find(
          (a) => (a.textContent || '').trim().toLowerCase() === 'readme'
        )
      : null;

    const hashReadmeLink = document.querySelector('a[href="#readme-ov-file"]');
    const hashTarget = document.getElementById('readme-ov-file');

    if (repoFilesReadmeLink instanceof HTMLElement) {
      // Prefer letting GitHub switch the visible panel first.
      repoFilesReadmeLink.click();
    } else if (hashReadmeLink instanceof HTMLElement) {
      hashReadmeLink.click();
    } else if (hashTarget) {
      // If target exists, just scroll.
      hashTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Then scroll to the actual README content if it's on the page.
    const tryScroll = () => {
      const target =
        document.querySelector('#readme') ||
        document.getElementById('readme-ov-file') ||
        document.querySelector('article.markdown-body') ||
        document.querySelector('[data-testid="readme"]');
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    };

    if (tryScroll()) return;

    // Fallback: update hash (helps on some layouts).
    if (location.hash !== '#readme-ov-file') {
      location.hash = 'readme-ov-file';
    }

    // One more attempt after the UI has had a tick to update.
    setTimeout(() => {
      tryScroll();
    }, 0);
  };
  readmeBtn?.addEventListener('click', onReadme);
  addCleanup(() => readmeBtn?.removeEventListener('click', onReadme));

  // Populate metrics from BFF.
  const dashboardData = await fetchBffDashboardData(nwo);
  const repoInfo = dashboardData?.repository;
  const metrics = dashboardData?.metrics;
  const visualizations = dashboardData?.visualizations;

  const starsText = findRepoCounter('stars', nwo);
  card.querySelector('[data-ghso-stars]').textContent =
    (starsText && starsText.replace(/\s+/g, '')) || (repoInfo?.stars !== null && repoInfo?.stars !== undefined ? formatCompact(repoInfo.stars) : '—');
  card.querySelector('[data-ghso-forks]').textContent = repoInfo?.forks !== null && repoInfo?.forks !== undefined ? formatCompact(repoInfo.forks) : '—';

  const lastPushIso =
    document
      .querySelector('meta[name="octolytics-dimension-repository_last_push_datetime"]')
      ?.getAttribute('content') ||
    '';
  const lastPushDays = lastPushIso ? daysSince(lastPushIso) : null;

  const statusEl = card.querySelector('[data-ghso-status]');
  const pushEl = card.querySelector('[data-ghso-lastpush]');
  const archived = repoInfo?.isArchived === true;

  let statusText = '—';
  let statusTone = 'neutral';
  if (archived) {
    statusText = t(L, 'statusArchived');
    statusTone = 'neutral';
  } else if (lastPushDays !== null) {
    if (lastPushDays <= 14) {
      statusText = t(L, 'statusActive');
      statusTone = 'good';
    } else if (lastPushDays <= 60) {
      statusText = t(L, 'statusMaintained');
      statusTone = 'good';
    } else if (lastPushDays <= 180) {
      statusText = t(L, 'statusLowActivity');
      statusTone = 'warn';
    } else {
      statusText = t(L, 'statusInactive');
      statusTone = 'bad';
    }
  }
  statusEl.textContent = statusText;
  statusEl.setAttribute('data-ghso-tone', statusTone);
  pushEl.textContent =
    lastPushDays === null ? t(L, 'lastPushUnknown') : t(L, 'lastPushDays', { days: lastPushDays });

  // Issues open/closed ratio.
  const openIssues = metrics?.issues?.open ?? null;
  const closedIssues = metrics?.issues?.closed ?? null;

  card.querySelector('[data-ghso-issues-open]').textContent = openIssues === null ? '—' : formatCompact(openIssues);
  card.querySelector('[data-ghso-issues-closed]').textContent = closedIssues === null ? '—' : formatCompact(closedIssues);

  const openBar = card.querySelector('[data-ghso-issues-open-bar]');
  const closedBar = card.querySelector('[data-ghso-issues-closed-bar]');
  const total =
    openIssues !== null && closedIssues !== null ? Math.max(0, openIssues) + Math.max(0, closedIssues) : null;
  if (total && total > 0) {
    const openPct = clamp((openIssues / total) * 100, 0, 100);
    openBar.style.width = `${openPct}%`;
    closedBar.style.width = `${100 - openPct}%`;
  } else {
    openBar.style.width = '50%';
    closedBar.style.width = '50%';
  }

  // Languages chart.
  const rawLangs = visualizations?.languages || [];
  const langs = rawLangs.map(l => ({
    name: l.name,
    percent: typeof l.value === 'number' ? Math.round(l.value * 10) / 10 : 0,
    color: l.color
  }));

  const langBar = card.querySelector('[data-ghso-langbar]');
  const langLegend = card.querySelector('[data-ghso-langlegend]');
  const langNote = card.querySelector('[data-ghso-lang-note]');
  if (langs.length === 0) {
    langBar.textContent = '—';
  } else {
    langBar.textContent = '';
    langLegend.textContent = '';
    langNote.textContent = t(L, 'languageCount', { count: langs.length });
    for (const l of langs) {
      const seg = document.createElement('span');
      seg.className = 'ghso-langseg';
      seg.style.width = `${Math.max(0, Math.min(100, l.percent))}%`;
      seg.style.backgroundColor = l.color || 'var(--fgColor-accent, var(--color-accent-fg))';
      seg.title = `${l.name} ${l.percent}%`;
      langBar.appendChild(seg);

      const item = document.createElement('div');
      item.className = 'ghso-langitem';
      item.innerHTML = `
        <span class="ghso-dot" aria-hidden="true"></span>
        <span class="ghso-langname"></span>
        <span class="ghso-langpct"></span>
      `;
      const dot = item.querySelector('.ghso-dot');
      if (dot) dot.style.backgroundColor = l.color || 'var(--fgColor-accent, var(--color-accent-fg))';
      item.querySelector('.ghso-langname').textContent = l.name;
      item.querySelector('.ghso-langpct').textContent = `${l.percent}%`;
      langLegend.appendChild(item);
    }
  }

  // Activity chart.
  const activityEl = card.querySelector('[data-ghso-activity]');
  const activityNote = card.querySelector('[data-ghso-activity-note]');

  const commitTrend = visualizations?.commitTrend;
  const trendData = Array.isArray(commitTrend?.data) ? commitTrend.data.map(Number) : [];
  const trendLabels = Array.isArray(commitTrend?.labels) ? commitTrend.labels : [];

  if (trendData.length === 0) {
    activityEl.textContent = '—';
  } else {
    // Calculate 4w avg (or total if less than 4 data points)
    const last4 = trendData.slice(-4);
    const avg4 = last4.length > 0 ? last4.reduce((a, b) => a + b, 0) / last4.length : 0;
    card.querySelector('[data-ghso-avg4]').textContent = String(Math.round(avg4 * 10) / 10);

    const maxVal = Math.max(1, ...trendData);
    activityNote.textContent = t(L, 'maxPerWeek', { max: maxVal });

    const svgNS = 'http://www.w3.org/2000/svg';
    const w = 240;
    const h = 36;
    const gap = 2;
    const barW = Math.floor((w - gap * (trendData.length - 1)) / trendData.length);

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', String(h));
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('ghso-activity-svg');

    for (let i = 0; i < trendData.length; i++) {
      const v = trendData[i];
      const bh = Math.max(1, Math.round((v / maxVal) * (h - 2)));
      const x = i * (barW + gap);
      const y = h - bh;
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(barW));
      rect.setAttribute('height', String(bh));
      rect.setAttribute('rx', '1');
      rect.setAttribute('fill', 'var(--fgColor-accent, var(--color-accent-fg))');
      rect.setAttribute('opacity', v === 0 ? '0.25' : '0.85');

      const labelDate = trendLabels[i] || '';
      rect.appendChild(document.createElementNS(svgNS, 'title')).textContent =
        labelDate ? `${labelDate}: ${t(L, 'commitsN', { n: v })}` : t(L, 'commitsN', { n: v });
      svg.appendChild(rect);
    }

    activityEl.textContent = '';
    activityEl.appendChild(svg);
  }
}

function ensureStyle(cssText) {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = cssText;
}

function removeStyle() {
  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();
}

function ensureToTopButton(lang) {
  const L = normalizeLang(lang || GHSO_INTERNAL.lang);

  const existing = document.getElementById(TO_TOP_ID);
  if (existing) {
    existing.setAttribute('aria-label', t(L, 'backToTopAria'));
    existing.classList.add('notranslate');
    existing.setAttribute('translate', 'no');
    const label = existing.querySelector('.ghso-label');
    if (label) {
      if (label instanceof HTMLElement) {
        label.classList.add('notranslate');
        label.setAttribute('translate', 'no');
      }
      label.textContent = t(L, 'topLabel');
    }
    return;
  }

  const btn = document.createElement('button');
  btn.id = TO_TOP_ID;
  btn.type = 'button';
  btn.className = 'btn btn-sm';
  btn.classList.add('notranslate');
  btn.setAttribute('translate', 'no');
  btn.setAttribute('aria-label', t(L, 'backToTopAria'));
  btn.innerHTML = `<span class="ghso-arrow" aria-hidden="true">↑</span><span class="ghso-label notranslate" translate="no">${t(L, 'topLabel')}</span>`;
  btn.style.position = 'fixed';
  btn.style.right = '16px';
  btn.style.bottom = '16px';
  btn.style.zIndex = '9999';
  btn.style.display = 'none';

  btn.style.display = 'none';
  btn.style.textAlign = 'center';
  btn.style.paddingTop = '6px';
  btn.style.paddingBottom = '6px';
  btn.style.lineHeight = '1.1';
  btn.style.minWidth = '44px';

  const arrowEl = btn.querySelector('.ghso-arrow');
  const labelEl = btn.querySelector('.ghso-label');
  if (arrowEl instanceof HTMLElement) {
    arrowEl.style.display = 'block';
    arrowEl.style.fontSize = '14px';
    arrowEl.style.marginBottom = '2px';
  }
  if (labelEl instanceof HTMLElement) {
    labelEl.style.display = 'block';
    labelEl.style.fontSize = '12px';
  }

  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    btn.style.display = y > 600 ? 'block' : 'none';
  };

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.body.appendChild(btn);

  addCleanup(() => {
    window.removeEventListener('scroll', onScroll);
    btn.remove();
  });
}

const ASSET_ORIGINAL_ORDER = new WeakMap();

function scoreAssetName(name, runtime) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return -9999;
  if (n.startsWith('source code')) return -9999;
  if (/\.sig$|\.asc$|checksums?|sha256|sha512|md5/.test(n)) return -50;
  if (/debug|symbols?/.test(n)) return -30;

  const osTokens = {
    windows: [/\bwin(dows)?\b/, /\.exe$/, /\.msi$/],
    mac: [/\bmac\b/, /\bdarwin\b/, /\bosx\b/, /\.dmg$/, /\.pkg$/],
    linux: [/\blinux\b/, /\.appimage$/, /\.deb$/, /\.rpm$/]
  };

  const archTokens = {
    x64: [/\bamd64\b/, /\bx86_64\b/, /\bx64\b/],
    x86: [/\b386\b/, /\bi386\b/, /\bi686\b/],
    arm64: [/\barm64\b/, /\baarch64\b/]
  };

  let score = 0;

  // OS match
  if (runtime.os !== 'other') {
    const match = osTokens[runtime.os]?.some((re) => re.test(n));
    if (match) score += 100;

    const otherOs = ['windows', 'mac', 'linux'].filter((k) => k !== runtime.os);
    const mism = otherOs.some((k) => osTokens[k].some((re) => re.test(n)));
    if (mism && !match) score -= 20;
  }

  // Arch match
  if (runtime.arch !== 'other') {
    const match = archTokens[runtime.arch]?.some((re) => re.test(n));
    if (match) score += 50;

    const otherArch = ['x64', 'x86', 'arm64'].filter((k) => k !== runtime.arch);
    const mism = otherArch.some((k) => archTokens[k].some((re) => re.test(n)));
    if (mism && !match) score -= 10;
  }

  // File types that are often installable
  if (/\.exe$|\.msi$|\.dmg$|\.pkg$|\.appimage$/.test(n)) score += 10;
  if (/\.zip$|\.tar\.gz$|\.tgz$/.test(n)) score += 2;

  return score;
}

function expandRelevantAssetsDetails() {
  if (!isReleasePage()) return;

  const opened = [];

  const openDetails = (details) => {
    if (!details || !(details instanceof HTMLElement)) return;
    if (details.tagName !== 'DETAILS') return;
    if (details.hasAttribute('open')) return;
    details.setAttribute('open', '');
    details.setAttribute('data-ghso-opened', '1');
    opened.push(details);
  };

  // Prefer the "Latest" release entry when present on /releases page.
  const latestLink = document.querySelector('a[href$="/releases/latest"]');
  const latestBox = latestLink?.closest('div.Box') || null;
  const candidates = [];

  if (latestBox) {
    candidates.push(latestBox);
  }

  // Fallback: the first release box on the page.
  const firstBox = document.querySelector('div.Box');
  if (firstBox && firstBox !== latestBox) {
    candidates.push(firstBox);
  }

  for (const box of candidates) {
    const details = Array.from(box.querySelectorAll('details')).find((d) => {
      const summaryText = (d.querySelector('summary')?.textContent || '').trim();
      return /^assets\b/i.test(summaryText);
    });
    if (details) {
      openDetails(details);
      break;
    }
  }

  if (opened.length > 0) {
    addCleanup(() => {
      for (const d of opened) {
        if (!d.isConnected) continue;
        if (d.getAttribute('data-ghso-opened') === '1') {
          d.removeAttribute('open');
          d.removeAttribute('data-ghso-opened');
        }
      }
    });
  }
}

function optimizeReleaseAssets() {
  if (!isReleasePage()) return;

  // Make the feature noticeable on /releases list pages where assets are collapsed by default.
  expandRelevantAssetsDetails();

  const runtime = detectRuntime();
  const assetLinks = Array.from(document.querySelectorAll('a[href*="/releases/download/"]'));
  if (assetLinks.length === 0) return;

  // Try to sort within the nearest reasonable container.
  // GitHub may render assets as <li> in a <ul>, or as rows within a Box.
  const groups = new Map();

  for (const link of assetLinks) {
    const item =
      link.closest('li') ||
      link.closest('.Box-row') ||
      link.closest('[data-test-selector="release-asset"]') ||
      link.closest('div');

    if (!item) continue;

    const listContainer = item.closest('ul,ol');
    const container = listContainer || item.parentElement;

    // Avoid sorting a large generic container (like a release Box) by accident.
    if (!container) continue;
    if (!listContainer) {
      const childCount = container.children?.length ?? 0;
      if (childCount > 60) continue;
    }

    if (!container) continue;
    if (container.getAttribute('data-ghso-assets-sorted') === '1') continue;

    const arr = groups.get(container) || [];
    arr.push({ item, link });
    groups.set(container, arr);
  }

  for (const [container, items] of groups.entries()) {
    if (items.length <= 0) continue;

    if (!ASSET_ORIGINAL_ORDER.has(container)) {
      ASSET_ORIGINAL_ORDER.set(container, Array.from(container.children));
      addCleanup(() => {
        const original = ASSET_ORIGINAL_ORDER.get(container);
        if (!original || !container.isConnected) return;
        for (const child of Array.from(container.children)) child.removeAttribute?.('data-ghso-asset-rank');
        container.removeAttribute('data-ghso-assets-sorted');
        container.textContent = '';
        for (const child of original) container.appendChild(child);
      });
    }

    const uniqueItems = Array.from(new Set(items.map((x) => x.item)));
    const scored = uniqueItems
      .map((item) => {
        const link = item.querySelector('a[href*="/releases/download/"]');
        const name = link?.textContent || link?.getAttribute('title') || '';
        const score = scoreAssetName(name, runtime);
        return { item, score };
      })
      .filter((x) => x.score > -9999);

    if (scored.length <= 0) continue;

    scored.sort((a, b) => b.score - a.score);

    for (const child of Array.from(container.children)) child.removeAttribute?.('data-ghso-asset-rank');
    // Always mark rank #1 so users can see the match even when only one downloadable asset exists.
    scored[0].item.setAttribute('data-ghso-asset-rank', '1');
    for (let i = 1; i < scored.length; i++) {
      scored[i].item.setAttribute('data-ghso-asset-rank', String(i + 1));
    }

    if (scored.length > 1) {
      // Keep non-asset children at the end in original relative order.
      const scoredEls = scored.map((x) => x.item);
      const others = Array.from(container.children).filter((el) => !scoredEls.includes(el));

      container.textContent = '';
      for (const el of scoredEls) container.appendChild(el);
      for (const el of others) container.appendChild(el);
    }

    container.setAttribute('data-ghso-assets-sorted', '1');
  }
}

function apply(enabled) {
  if (!isGitHub()) return;
  if (!chrome?.runtime?.id) return;
  // Back-compat: accept boolean or settings object.
  const settings = typeof enabled === 'object' && enabled !== null ? enabled : { enabled: !!enabled, lang: 'zh' };
  const isEnabled = !!settings.enabled;
  const lang = normalizeLang(settings.lang);
  GHSO_INTERNAL.lang = lang;

  if (!isEnabled) {
    if (GHSO_INTERNAL.enabled) {
      runCleanups();
    }
    GHSO_INTERNAL.enabled = false;
    GHSO_INTERNAL.lastAppliedUrl = '';
    GHSO_INTERNAL.lastAppliedConfig = '';
    document.documentElement.removeAttribute('data-ghso');
    removeStyle();
    return;
  }

  const urlKey = `${location.pathname}${location.search}${location.hash}`;
  const isNewUrl = GHSO_INTERNAL.lastAppliedUrl !== urlKey;
  const configKey = `lang=${lang}`;
  const isNewConfig = GHSO_INTERNAL.lastAppliedConfig !== configKey;

  // New page / navigation: clean up and re-apply.
  if (isNewUrl || isNewConfig) {
    runCleanups();
    GHSO_INTERNAL.lastAppliedUrl = urlKey;
    GHSO_INTERNAL.lastAppliedConfig = configKey;
  }

  GHSO_INTERNAL.enabled = true;
  document.documentElement.setAttribute('data-ghso', 'on');

  ensureStyle(`
    html[data-ghso="on"] #${TO_TOP_ID} {
      /* only positioning is inline, keep here empty for now */
    }

    html[data-ghso="on"] [data-ghso-asset-rank="1"] {
      outline: 2px solid var(--borderColor-accent-emphasis);
      outline-offset: -2px;
      border-radius: 6px;
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-metric {
      border: 1px solid var(--borderColor-default);
      border-radius: 6px;
      padding: 10px;
      background: var(--bgColor-muted);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-k {
      font-size: 12px;
      color: var(--fgColor-muted);
      margin-bottom: 4px;
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-v {
      font-size: 16px;
      font-weight: 600;
      color: var(--fgColor-default);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-sub {
      margin-top: 6px;
      font-size: 12px;
      color: var(--fgColor-muted);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--borderColor-default);
      font-size: 12px;
      font-weight: 600;
      background: var(--bgColor-muted);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-badge[data-ghso-tone="good"] {
      border-color: var(--borderColor-success-emphasis);
      background: var(--bgColor-success-muted);
      color: var(--fgColor-success);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-badge[data-ghso-tone="warn"] {
      border-color: var(--borderColor-attention-emphasis);
      background: var(--bgColor-attention-muted);
      color: var(--fgColor-attention);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-badge[data-ghso-tone="bad"] {
      border-color: var(--borderColor-danger-emphasis);
      background: var(--bgColor-danger-muted);
      color: var(--fgColor-danger);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-issuesbar {
      height: 10px;
      border-radius: 999px;
      overflow: hidden;
      background: var(--borderColor-default);
      display: flex;
      margin-top: 8px;
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-issues-open {
      height: 100%;
      background: var(--bgColor-danger-muted);
      border-right: 1px solid var(--borderColor-default);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-issues-closed {
      height: 100%;
      background: var(--bgColor-success-muted);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-langbar {
      height: 10px;
      border-radius: 999px;
      overflow: hidden;
      background: var(--borderColor-default);
      display: flex;
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-langseg {
      height: 100%;
      display: block;
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-langlegend {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 12px;
      margin-top: 10px;
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-langitem {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 12px;
      color: var(--fgColor-default);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-langtext {
      display: inline-flex;
      gap: 6px;
      align-items: baseline;
      min-width: 0;
      flex-wrap: wrap;
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--borderColor-default);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-langpct {
      color: var(--fgColor-muted);
    }

    html[data-ghso="on"] #ghso-repo-summary .ghso-activity {
      border: 1px solid var(--borderColor-default);
      border-radius: 6px;
      padding: 8px;
      background: var(--bgColor-muted);
    }

    @media (max-width: 900px) {
      html[data-ghso="on"] #ghso-repo-summary .ghso-langlegend {
        grid-template-columns: 1fr;
      }
    }
  `);

  // Feature 3: back-to-top (all GitHub pages)
  ensureToTopButton(lang);

  // Reposition button for repo browsing pages: right 1/3, lower 2/3.
  if (isRepoRootLikePage()) {
    const btn = document.getElementById(TO_TOP_ID);
    if (btn) {
      btn.style.left = '66vw';
      btn.style.top = '66vh';
      btn.style.right = '';
      btn.style.bottom = '';
      btn.style.transform = 'translateX(96px)';
    }

    addCleanup(() => {
      const b = document.getElementById(TO_TOP_ID);
      if (!b) return;
      b.style.left = '';
      b.style.top = '';
      b.style.right = '16px';
      b.style.bottom = '16px';
      b.style.transform = '';
    });
  }

  // Feature 1: repo browsing - project summary UI
  ensureRepoSummaryCard(lang);

  // Feature 2: release assets - auto match/sort
  optimizeReleaseAssets();
}

async function boot() {
  const settings = await readSettings();
  try {
    apply(settings);
  } catch {
    // ignore
  }
}

// GitHub 使用 Turbo 导航；监听 turbo 事件以在无整页刷新时重应用。
window.addEventListener('turbo:load', () => {
  boot();
});

// 兜底：在 DOM 变化较大时也尝试重应用（轻量节流）。
let lastApply = 0;
const observer = new MutationObserver(() => {
  const now = Date.now();
  if (now - lastApply < 800) return;
  lastApply = now;
  boot();
});
observer.observe(document.documentElement, { subtree: true, childList: true });

window.addEventListener('pagehide', () => {
  try {
    observer.disconnect();
  } catch {
    // ignore
  }
});

try {
  if (chrome?.runtime?.id) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      try {
        if (!chrome?.runtime?.id) return;
        const next = changes?.[STORAGE_KEY]?.newValue;
        if (!next) return;
        apply({ enabled: !!next.enabled, lang: normalizeLang(next.lang) });
      } catch {
        // ignore
      }
    });
  }
} catch {
  // ignore
}

boot();
