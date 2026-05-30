const STORAGE_KEY = 'ghso:settings';

const I18N = {
  zh: {
    enabled: '启用 GitHub 优化',
    lang: '语言',
    hint: '对仓库页 Summary、Release 资产筛选、返回顶部按钮生效。'
  },
  en: {
    enabled: 'Enable GitHub optimizations',
    lang: 'Language',
    hint: 'Applies to Repo Summary, Release asset sorting, and the Top button.'
  },
  ko: {
    enabled: 'GitHub 최적화 사용',
    lang: '언어',
    hint: '리포지토리 요약, Release 자산 정렬, Top 버튼에 적용됩니다.'
  }
};

function normalizeLang(lang) {
  return lang === 'en' || lang === 'ko' || lang === 'zh' ? lang : 'zh';
}

function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (res) => {
      const settings = res?.[STORAGE_KEY] ?? { enabled: true, lang: 'zh' };
      resolve({ enabled: !!settings.enabled, lang: normalizeLang(settings.lang) });
    });
  });
}

function writeSettings(next) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: next }, () => resolve());
  });
}

async function main() {
  const checkbox = document.getElementById('enabled');
  const enabledLabel = document.getElementById('enabledLabel');
  const hint = document.getElementById('hint');
  const langLabel = document.getElementById('langLabel');
  const langSelect = document.getElementById('lang');

  const { enabled, lang } = await readSettings();
  checkbox.checked = enabled;
  langSelect.value = lang;

  const applyTexts = (l) => {
    const t = I18N[normalizeLang(l)] || I18N.zh;
    enabledLabel.textContent = t.enabled;
    hint.textContent = t.hint;
    langLabel.textContent = t.lang;
  };

  applyTexts(lang);

  checkbox.addEventListener('change', async () => {
    const nextEnabled = checkbox.checked;
    const current = await readSettings();
    await writeSettings({ enabled: nextEnabled, lang: current.lang });
  });

  langSelect.addEventListener('change', async () => {
    const nextLang = normalizeLang(langSelect.value);
    applyTexts(nextLang);
    const current = await readSettings();
    await writeSettings({ enabled: current.enabled, lang: nextLang });
  });
}

main();
