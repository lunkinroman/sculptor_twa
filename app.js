(function () {
  const telegramWebApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  function setThemeFromTelegram(themeParams) {
    if (!themeParams) return;

    const root = document.documentElement;
    const container = document.querySelector('.no-access-container');

    // Apply Telegram theme colors
    const map = {
      '--bg': themeParams.bg_color,
      '--text': themeParams.text_color,
      '--muted': themeParams.hint_color,
      '--accent': themeParams.button_color,
      '--card': themeParams.secondary_bg_color,
      '--outline': themeParams.section_separator_color
    };

    Object.entries(map).forEach(([cssVar, value]) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        root.style.setProperty(cssVar, value);
      }
    });

    // Add Telegram theme class for additional styling
    if (container) {
      container.classList.add('telegram-theme');
    }
  }

  function setupBuyButton(tg) {
    const buyButton = document.getElementById('buy-button');

    if (!buyButton) return;

    buyButton.addEventListener('click', () => {
      const payload = {
        action: 'purchase_training',
        timestamp: Date.now(),
        source: 'no_access_screen'
      };

      if (tg) {
        // Use Telegram's Main Button for purchase flow
        tg.MainButton.setText('Перейти к оплате');
        tg.MainButton.show();
        tg.onEvent('mainButtonClicked', () => {
          tg.sendData(JSON.stringify({ ...payload, confirmed: true }));
        });
      } else {
        // Browser fallback - could redirect to payment page
        alert('В браузере: ' + JSON.stringify(payload));
        console.log('Purchase button clicked:', payload);
      }
    });
  }

  function initInTelegram(tg) {
    tg.ready();
    try { tg.expand(); } catch (_) {}

    setThemeFromTelegram(tg.themeParams);

    // Set Main Button for purchase
    tg.MainButton.setText('Купить тренировку');
    tg.MainButton.show();

    tg.onEvent('mainButtonClicked', () => {
      const payload = {
        action: 'purchase_training',
        timestamp: Date.now(),
        source: 'main_button'
      };
      tg.sendData(JSON.stringify(payload));
    });

    tg.onEvent('themeChanged', () => {
      setThemeFromTelegram(tg.themeParams);
    });
  }

  function initInBrowserFallback() {
    // Browser fallback - no special initialization needed
    console.log('Running in browser mode');
  }

  // Admin config: load and apply dynamic content
  const ADMIN_STORAGE_KEY = 'sculptorAdminConfig';

  function getDefaultAdminConfig(){
    return {
      today: { day: 8 },
      training: {
        image: './assets/images/train-example.png',
        titleLines: ['Скульптор.', 'Тренировка 8'],
        linkText: 'Смотреть',
        href: '#'
      },
      news: [
        { image: './assets/images/train-example.png', date: '20 сентября', title: 'Открыт новый поток на Скульптор!' },
        { image: './assets/images/train-example.png', date: '21 сентября', title: 'Подборка лучших советов по растяжке' },
        { image: './assets/images/train-example.png', date: '22 сентября', title: 'Как восстановиться после тренировки' }
      ]
    };
  }

  function normalizeAdminConfig(cfg){
    const today = cfg && cfg.today || {};
    const training = cfg && cfg.training || {};
    const news = Array.isArray(cfg && cfg.news) ? cfg.news : [];
    return {
      today: { day: Number(today.day) > 0 ? Math.floor(Number(today.day)) : 1 },
      training: {
        image: training.image || './assets/images/train-example.png',
        titleLines: Array.isArray(training.titleLines) && training.titleLines.length ? training.titleLines.slice(0, 3) : ['Скульптор.', 'Тренировка 8'],
        linkText: training.linkText || 'Смотреть',
        href: training.href || '#'
      },
      news: news.map(n => ({
        image: n && n.image ? n.image : './assets/images/train-example.png',
        date: n && n.date ? String(n.date) : '',
        title: n && n.title ? String(n.title) : ''
      }))
    };
  }

  function readAdminConfig(){
    try {
      const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (!raw) return getDefaultAdminConfig();
      const parsed = JSON.parse(raw);
      return normalizeAdminConfig(parsed);
    } catch (_) {
      return getDefaultAdminConfig();
    }
  }

  function setTodayBannerDay(day){
    const banners = Array.from(document.querySelectorAll('section.today-banner'));
    banners.forEach(b => {
      const num = b.querySelector('.today-square span');
      const title = b.querySelector('.today-title');
      if (num) num.textContent = String(day);
      if (title) title.textContent = `${day} день`;
    });
  }

  // Resolve current date in Moscow time and compute training day for October
  function getMoscowDateParts(){
    try {
      const parts = new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric', month: 'numeric', day: 'numeric'
      }).formatToParts(new Date());
      const year = Number(parts.find(p => p.type === 'year') && parts.find(p => p.type === 'year').value);
      const month = Number(parts.find(p => p.type === 'month') && parts.find(p => p.type === 'month').value);
      const day = Number(parts.find(p => p.type === 'day') && parts.find(p => p.type === 'day').value);
      return { year, month, day };
    } catch (_) {
      // Fallback to local time if Intl/timeZone is not supported
      const d = new Date();
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    }
  }

  function computeTodayDayFromMoscowDate(fallbackDay){
    const safeFallback = Number(fallbackDay) > 0 ? Math.floor(Number(fallbackDay)) : 1;
    try {
      const { month, day } = getMoscowDateParts();
      if (month === 10) {
        // 1 октября → 1 день, 2 октября → 2 день ... максимум 30
        return Math.max(1, Math.min(30, Number(day)));
      }
      return safeFallback;
    } catch (_) {
      return safeFallback;
    }
  }

  function computeTrainingTitleLinesFromMoscowDate(fallbackLines){
    try {
      const { month, day } = getMoscowDateParts();
      if (month !== 10) return fallbackLines;

      const d = Number(day);
      const meditationIndex = ({ 3: 1, 8: 2, 15: 3 })[d];
      if (meditationIndex) {
        return ['Скульптор.', `Медитация ${meditationIndex}`];
      }

      // training index across October excluding meditation days (3,8,15)
      const medDays = [3, 8, 15];
      const medBefore = medDays.filter(x => x < d).length;
      const trainingIdx = Math.max(1, Math.min(18, d - medBefore));
      return ['Скульптор.', `Тренировка ${trainingIdx}`];
    } catch (_) {
      return fallbackLines;
    }
  }

  function computeTrainingLinkFromMoscowDate(fallbackHref){
    try {
      const { month, day } = getMoscowDateParts();
      if (month === 10) {
        const d = Number(day);
        if (d >= 1 && d <= 21) {
          return `https://t.me/sculptor_v1_bot?start=${d}day`;
        }
      }
      return fallbackHref;
    } catch (_) {
      return fallbackHref;
    }
  }

  function setTrainingCards(cfg){
    const cards = Array.from(document.querySelectorAll('section.training-card'));
    cards.forEach(card => {
      const img = card.querySelector('.training-image');
      const title = card.querySelector('.training-title');
      const link = card.querySelector('.training-link');
      if (img && cfg.training.image) img.setAttribute('src', cfg.training.image);
      if (title && Array.isArray(cfg.training.titleLines)) {
        const effectiveLines = computeTrainingTitleLinesFromMoscowDate(cfg.training.titleLines);
        const safeLines = effectiveLines.slice(0, 3);
        title.innerHTML = safeLines.map(l => `<span>${l}</span>`).join('<br>');
      }
      if (link) {
        link.textContent = cfg.training.linkText || 'Смотреть';
        const baseHref = cfg.training.href || '#';
        const href = computeTrainingLinkFromMoscowDate(baseHref);
        link.setAttribute('href', href);
        if (href && href.startsWith('http')) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener');
        } else {
          link.removeAttribute('target');
          link.removeAttribute('rel');
        }
      }
    });
  }

  function rebuildNewsCarousel(cfg){
    const container = document.querySelector('#home-screen .news-carousel');
    if (!container) return;
    const track = container.querySelector('.home-track');
    if (!track) return;

    const items = Array.isArray(cfg.news) && cfg.news.length ? cfg.news : [];
    const count = items.length || 0;
    track.innerHTML = '';

    items.forEach((n, idx) => {
      const slide = document.createElement('div');
      slide.className = 'home-slide';

      const article = document.createElement('article');
      article.className = 'news-card';

      const img = document.createElement('img');
      img.className = 'news-card__bg';
      img.setAttribute('src', n.image || './assets/images/train-example.png');
      img.setAttribute('alt', 'news');

      const overlay = document.createElement('div');
      overlay.className = 'news-card__overlay';

      const dots = document.createElement('div');
      dots.className = 'home-dots';
      dots.setAttribute('role', 'tablist');
      dots.setAttribute('aria-label', 'слайды');
      for (let i = 0; i < count; i++) {
        const d = document.createElement('button');
        d.className = 'home-dot' + (i === idx ? ' is-active' : '');
        d.setAttribute('data-to', String(i));
        d.setAttribute('role', 'tab');
        d.setAttribute('aria-selected', i === idx ? 'true' : 'false');
        d.setAttribute('aria-controls', `news-slide-${i+1}`);
        dots.appendChild(d);
      }

      const content = document.createElement('div');
      content.className = 'news-card__content';
      const date = document.createElement('div');
      date.className = 'news-card__date';
      date.textContent = n.date || '';
      const title = document.createElement('div');
      title.className = 'news-card__title';
      title.textContent = n.title || '';
      content.appendChild(date);
      content.appendChild(title);

      article.appendChild(img);
      article.appendChild(overlay);
      article.appendChild(dots);
      article.appendChild(content);
      slide.appendChild(article);
      track.appendChild(slide);
    });
  }

  function applyAdminConfig(cfg){
    const effectiveDay = computeTodayDayFromMoscowDate(cfg.today.day);
    setTodayBannerDay(effectiveDay);
    setTrainingCards(cfg);
    rebuildNewsCarousel(cfg);
  }

  // --- Home rating (1-5) on home cards ---
  function getRatingEndpoint(){
    try {
      if (typeof window !== 'undefined' && typeof window.__RATING_ENDPOINT__ === 'string' && window.__RATING_ENDPOINT__) {
        return window.__RATING_ENDPOINT__;
      }
    } catch (_) {}
    // default webhook endpoint
    return 'https://n8n.pervicere.ru/webhook/every_day_mark';
  }

  function shouldPersistRatings(){
    try { return !!(typeof window !== 'undefined' && window.__RATING_PERSIST__); } catch (_) { return false; }
  }

  const sessionRated = new Set();

  // Water webhook endpoint (can be overridden via window.__WATER_ENDPOINT__)
  function getWaterEndpoint(){
    try {
      if (typeof window !== 'undefined' && typeof window.__WATER_ENDPOINT__ === 'string' && window.__WATER_ENDPOINT__) {
        return window.__WATER_ENDPOINT__;
      }
    } catch (_) {}
    return 'https://n8n.pervicere.ru/webhook/water_balance';
  }

  async function sendWaterBalance(payload){
    const url = getWaterEndpoint();
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (_) {
      // ignore network errors for UI responsiveness
    }
  }

  // --- Fetch today's state from backend ---
  function getTodayWaterEndpoint(){
    try {
      if (typeof window !== 'undefined' && typeof window.__WATER_TODAY_ENDPOINT__ === 'string' && window.__WATER_TODAY_ENDPOINT__) {
        return window.__WATER_TODAY_ENDPOINT__;
      }
    } catch (_) {}
    return 'https://n8n.pervicere.ru/webhook/today_water_balance';
  }

  async function fetchTodayWaterBalance(tg){
    const url = getTodayWaterEndpoint();
    const payload = { tg_id: getTelegramUserId(tg), date: formatDateKey() };
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = text; }

      function num(v){ const n = Number(v); return isNaN(n) ? null : Math.max(0, n); }
      function extractFromObj(obj){
        if (!obj || typeof obj !== 'object') return null;
        return num(obj.balance) ?? num(obj.water) ?? num(obj.value) ?? null;
      }
      function extractFromArray(arr){
        if (!Array.isArray(arr)) return null;
        // prefer the last valid record
        for (let i = arr.length - 1; i >= 0; i--) {
          const v = extractFromObj(arr[i]);
          if (v !== null) return v;
        }
        return null;
      }

      if (typeof data === 'number' || typeof data === 'string') {
        const n = num(data);
        if (n !== null) return n;
      }

      if (Array.isArray(data)) {
        const v = extractFromArray(data);
        if (v !== null) return v;
      }

      if (data && typeof data === 'object') {
        const direct = extractFromObj(data);
        if (direct !== null) return direct;
        const inner = data.respond || data.data || data.result;
        if (Array.isArray(inner)) {
          const v = extractFromArray(inner);
          if (v !== null) return v;
        } else if (inner && typeof inner === 'object') {
          const v = extractFromObj(inner);
          if (v !== null) return v;
        }
      }
      return 0;
    } catch (_) {
      return 0;
    }
  }

  function getTodayMarkEndpoint(){
    try {
      if (typeof window !== 'undefined' && typeof window.__TODAY_MARK_ENDPOINT__ === 'string' && window.__TODAY_MARK_ENDPOINT__) {
        return window.__TODAY_MARK_ENDPOINT__;
      }
    } catch (_) {}
    return 'https://n8n.pervicere.ru/webhook/today_mark';
  }

  async function fetchTodayMarks(tg){
    const url = getTodayMarkEndpoint();
    const payload = { tg_id: getTelegramUserId(tg), date: formatDateKey() };
    const result = { mood: undefined, nutrition: undefined };
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = text; }

      // handle array of records: [{category, mark}, ...]
      if (Array.isArray(data)) {
        data.forEach(item => {
          const cat = (item && (item.category || item.type || item.kind)) ? String(item.category || item.type || item.kind).toLowerCase() : '';
          const mk = item && (typeof item.mark === 'number' ? item.mark : Number(item.mark));
          if (!isNaN(mk)) {
            if (cat.includes('nutr')) result.nutrition = mk;
            else if (cat.includes('mood')) result.mood = mk;
          }
        });
        return result;
      }

      // handle object with direct fields
      if (data && typeof data === 'object') {
        if (typeof data.mood === 'number') result.mood = data.mood;
        if (typeof data.nutrition === 'number') result.nutrition = data.nutrition;
        // sometimes nested under respond/data
        const inner = data.respond || data.data || data.result;
        if (inner && typeof inner === 'object') {
          if (typeof inner.mood === 'number') result.mood = inner.mood;
          if (typeof inner.nutrition === 'number') result.nutrition = inner.nutrition;
          if (Array.isArray(inner)) {
            inner.forEach(item => {
              const cat = (item && (item.category || item.type || item.kind)) ? String(item.category || item.type || item.kind).toLowerCase() : '';
              const mk = item && (typeof item.mark === 'number' ? item.mark : Number(item.mark));
              if (!isNaN(mk)) {
                if (cat.includes('nutr')) result.nutrition = mk;
                else if (cat.includes('mood')) result.mood = mk;
              }
            });
          }
        }
        return result;
      }

      // single numeric – can't map to a category reliably; ignore
      return result;
    } catch (_) {
      return result;
    }
  }

  function getTelegramUserId(tg){
    try {
      const id = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id;
      return typeof id === 'number' || typeof id === 'string' ? String(id) : null;
    } catch (_) {
      return null;
    }
  }

  function formatDateKey(){
    const { year, month, day } = getMoscowDateParts();
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  function ratingStorageKey(category){
    return `rating:${category}:${formatDateKey()}`;
  }

  function hasRated(category){
    if (!shouldPersistRatings()) {
      return sessionRated.has(category);
    }
    try { return !!localStorage.getItem(ratingStorageKey(category)); } catch (_) { return false; }
  }

  function setRated(category, mark){
    if (!shouldPersistRatings()) {
      sessionRated.add(category);
      return;
    }
    try { localStorage.setItem(ratingStorageKey(category), String(mark)); } catch (_) {}
  }

  function deriveCategoryFromTitle(text){
    const t = (text || '').toLowerCase();
    // prioritize nutrition keywords; avoid broad matches like 'сегодня'
    if (t.includes('питал') || t.includes('еда') || t.includes('пит')) return 'nutrition';
    if (t.includes('самочув') || t.includes('настро')) return 'mood';
    return 'general';
  }

  function createRipple(target, x, y){
    try {
      const rect = target.getBoundingClientRect();
      const r = document.createElement('span');
      r.className = 'rating-ripple';
      const size = Math.max(rect.width, rect.height);
      r.style.width = `${size}px`;
      r.style.height = `${size}px`;
      r.style.left = `${x - rect.left - size / 2}px`;
      r.style.top = `${y - rect.top - size / 2}px`;
      target.appendChild(r);
      setTimeout(() => { if (r && r.parentNode) r.parentNode.removeChild(r); }, 600);
    } catch (_) {}
  }

  function showRatingToast(card, text){
    const canvas = card && card.querySelector('.card-canvas .rectangle-parent');
    const host = canvas || card;
    const toast = document.createElement('div');
    toast.className = 'rating-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = text || 'Готово';
    host.appendChild(toast);
    setTimeout(() => { toast.classList.add('is-hide'); }, 1300);
    setTimeout(() => { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); }, 1800);
  }

  async function sendRating(tg, payload){
    const url = getRatingEndpoint();
    const body = JSON.stringify(payload);
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
    } catch (_) {
      // swallow; UI will still confirm locally
    }
  }

  function markCardAsRated(card, selectedEl){
    try {
      if (!card || !selectedEl) return;
      const items = [
        card.querySelector('.wrapper'),
        card.querySelector('.container'),
        card.querySelector('.frame'),
        card.querySelector('.frame-div'),
        card.querySelector('.rectangle-wrapper')
      ].filter(Boolean);
      items.forEach(el => el.classList.toggle('is-selected', el === selectedEl));
      card.classList.add('is-rated');
    } catch (_) {}
  }

  function initHomeRating(tg){
    const home = document.getElementById('home-screen');
    if (!home) return;
    const cards = Array.from(home.querySelectorAll('.home-card'));
    if (!cards.length) return;

    const tgId = getTelegramUserId(tg);

    cards.forEach(async (card) => {
      const titleEl = card.querySelector('.div5');
      const category = deriveCategoryFromTitle(titleEl ? titleEl.textContent : '');

      // Five interactive circles in order
      const items = [
        card.querySelector('.wrapper'),
        card.querySelector('.container'),
        card.querySelector('.frame'),
        card.querySelector('.frame-div'),
        card.querySelector('.rectangle-wrapper')
      ].filter(Boolean);

      // Prefill from backend for today's mark
      try {
        const marks = await fetchTodayMarks(tg);
        const current = (category === 'nutrition') ? marks.nutrition : (category === 'mood' ? marks.mood : undefined);
        if (current && current >= 1 && current <= 5) {
          const pre = items[current - 1];
          if (pre) markCardAsRated(card, pre);
        }
      } catch (_) {}

      // No pre-lock: allow changing selection at any time

      items.forEach((el, idx) => {
        // Mark as interactive
        el.classList.add('rating-hit');
        el.addEventListener('click', (ev) => {
          const mark = idx + 1;

          // Ripple and haptics
          createRipple(el, ev.clientX, ev.clientY);
          try { if (tg && tg.HapticFeedback && typeof tg.HapticFeedback.impactOccurred === 'function') { tg.HapticFeedback.impactOccurred('light'); } } catch (_) {}

          // Update selection only
          markCardAsRated(card, el);

          // Send HTTP request with Moscow date (YYYY-MM-DD)
          const payload = { tg_id: tgId, category, mark, date: formatDateKey() };
          sendRating(tg, payload);

          // Auto advance to next home slide shortly after selection
          try { setTimeout(() => { if (typeof window.__homeCarouselNext === 'function') window.__homeCarouselNext(); }, 160); } catch (_) {}
        });
      });
    });
  }

  function hideNoAccessByDefault() {
    const container = document.querySelector('.no-access-container');
    if (container) {
      container.hidden = true;
    }
  }

  function boot() {
    hideNoAccessByDefault();
    setupBuyButton(telegramWebApp);

    if (telegramWebApp) {
      initInTelegram(telegramWebApp);
    } else {
      initInBrowserFallback();
    }

    // Wire bottom navigation
    const navButtons = document.querySelectorAll('.bottom-nav .nav-btn[data-screen]');
    const calendar = document.getElementById('calendar-screen');
    const links = document.getElementById('links-screen');
    const favorites = document.getElementById('favorites-screen');
    const home = document.getElementById('home-screen');
    const water = document.getElementById('water-screen');
    const sculptor = document.getElementById('sculptor-screen');

    function show(screen) {
      const screens = { calendar, links, favorites, home, water, sculptor };
      Object.entries(screens).forEach(([key, el]) => {
        if (!el) return;
        el.hidden = key !== screen;
      });
      navButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.screen === screen));
      if (screen === 'home' && typeof window.__scaleHome === 'function') {
        // reflow after becoming visible
        setTimeout(() => window.__scaleHome(), 0);
      }
    }

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => show(btn.dataset.screen));
    });
    // keep profile icon active state in sync
    function syncProfileActive() {
      document.querySelectorAll('.bottom-nav .profile-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.classList.contains('is-active'));
      });
    }
    syncProfileActive();
    navButtons.forEach(btn => btn.addEventListener('click', syncProfileActive));

    // Water banner opens tracker screen
    const waterBanner = document.querySelector('.vector-parent');
    if (waterBanner) {
      const openWater = () => show('water');
      waterBanner.addEventListener('click', openWater);
      waterBanner.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWater(); } });
    }

    // Water tracker logic
    (function initWater(){
      const screen = document.getElementById('water-screen');
      if (!screen) return;

      const fill = screen.querySelector('.water-fill');
      const amountEl = screen.querySelector('.water-amount');
      const amountWrap = screen.querySelector('.water-fill__label');
      const addBtns = Array.from(screen.querySelectorAll('.water-add__btn'));
      const svg = screen.querySelector('.water-svg');
      const waveBack = svg && svg.querySelector('.wave-back');
      const waveFront = svg && svg.querySelector('.wave-front');
      const bubblesLayer = svg && svg.querySelector('.water-bubbles');
      const grad = svg && svg.querySelector('#waterGrad');
      const gradStops = grad ? Array.from(grad.querySelectorAll('stop')) : [];
      const vessel = screen.querySelector('.water-vessel');

      // Config
      const TARGET_ML = 2000; // 2 liters

      // Temporary in-memory state (no persistence yet)
      let currentAmount = 0;
      function readAmount(){ return currentAmount; }
      function writeAmount(v){ currentAmount = v; }

      function formatMl(v){
        return v >= 1000 ? `${(v/1000).toFixed(v % 1000 === 0 ? 0 : 1)} л` : `${v} мл`;
      }

      // SVG wave + bubbles animator
      function startWaterAnimator(){
        if (!svg || !waveBack || !waveFront || !bubblesLayer) return { setLevel(){} };

        const viewWidth = 400;
        const viewHeight = 200;
        const state = {
          running: true,
          lastTs: performance.now(),
          // animation params
          levelPct: 0, // 0..1
          baseAmplitude: 14,
          amplitudePulse: 0,
          backPhase: 0,
          frontPhase: 0,
          bubbles: [],
        };

        // color scales
        // from soft pink -> main red -> deep wine
        const scaleMain = (typeof chroma !== 'undefined')
          ? chroma.scale(['#eb3b40', '#ffd84d', '#69957A']).mode('lch')
          : null;
        const scaleSoft = (typeof chroma !== 'undefined')
          ? chroma.scale(['#ffd3d6', '#fff3b0', '#bff5d1']).mode('lch')
          : null;
        const body = document.documentElement;

        function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

        function mapLevelToAmplitude(level){
          // higher fill -> calmer water
          const minAmp = 8;
          const maxAmp = 22;
          return maxAmp - (maxAmp - minAmp) * clamp(level, 0, 1);
        }

        function genWavePath(amplitude, wavelength, phase, baseline){
          const points = 28;
          const dx = viewWidth / (points - 1);
          let d = `M 0 ${viewHeight}`;
          for (let i = 0; i < points; i++) {
            const x = i * dx;
            const y = baseline + Math.sin((x / wavelength) + phase) * amplitude;
            d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
          }
          d += ` L ${viewWidth} ${viewHeight} Z`;
          return d;
        }

        function spawnBubble(dt){
          // spawn rate reacts to level (0..1) → 2..9 bubbles/sec
          const rate = 2 + state.levelPct * 7;
          if (Math.random() < rate * dt) {
            const r = 2 + Math.random() * 5;
            state.bubbles.push({
              x: Math.random() * viewWidth,
              y: 130 + Math.random() * 40, // start within lower half of the wave canvas
              r,
              vy: 18 + Math.random() * 36, // rise speed
              drift: (Math.random() - 0.5) * 10,
              life: 0,
            });
          }
        }

        function updateBubbles(dt){
          for (let i = state.bubbles.length - 1; i >= 0; i--) {
            const b = state.bubbles[i];
            b.y -= b.vy * dt;
            b.x += b.drift * dt;
            b.life += dt;
            if (b.y < -10 || b.x < -20 || b.x > viewWidth + 20) {
              state.bubbles.splice(i, 1);
            }
          }
        }

        function drawBubbles(){
          // reuse existing nodes when possible
          const needed = state.bubbles.length;
          const existing = bubblesLayer.childNodes.length;
          // remove extras
          for (let i = existing - 1; i >= needed; i--) {
            const n = bubblesLayer.childNodes[i];
            if (n) bubblesLayer.removeChild(n);
          }
          // add missing
          for (let i = existing; i < needed; i++) {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            bubblesLayer.appendChild(c);
          }
          // update all
          for (let i = 0; i < needed; i++) {
            const b = state.bubbles[i];
            const c = bubblesLayer.childNodes[i];
            const fade = clamp(1 - (b.life / 3), 0, 1);
            c.setAttribute('cx', b.x.toFixed(2));
            c.setAttribute('cy', b.y.toFixed(2));
            c.setAttribute('r', (b.r * (0.8 + 0.4 * fade)).toFixed(2));
            c.setAttribute('opacity', (0.35 + 0.45 * fade).toFixed(2));
          }
        }

        function tick(now){
          if (!state.running) return;
          const dt = clamp((now - state.lastTs) / 1000, 0, 0.05);
          state.lastTs = now;

          // smooth amplitude towards target + decay pulse
          const targetAmp = mapLevelToAmplitude(state.levelPct);
          state.baseAmplitude += (targetAmp - state.baseAmplitude) * Math.min(1, dt * 3);
          state.amplitudePulse *= Math.max(0, 1 - dt * 2.4);

          // wave motion speeds (slightly different to create parallax)
          const backSpeed = 0.7 + state.levelPct * 0.6;
          const frontSpeed = 1.1 + state.levelPct * 0.9;
          state.backPhase += dt * backSpeed;
          state.frontPhase += dt * frontSpeed;

          const backAmp = state.baseAmplitude * 0.7 + state.amplitudePulse * 0.4;
          const frontAmp = state.baseAmplitude * 1.0 + state.amplitudePulse * 0.8;

          // place waves slightly offset vertically inside the canvas
          const backBaseline = 110;
          const frontBaseline = 100;

          waveBack.setAttribute('d', genWavePath(backAmp, 70, state.backPhase, backBaseline));
          waveFront.setAttribute('d', genWavePath(frontAmp, 60, state.frontPhase, frontBaseline));

          // bubbles
          spawnBubble(dt);
          updateBubbles(dt);
          drawBubbles();

          // dynamic colors by level
          if (scaleMain && gradStops.length >= 2) {
            const c1 = scaleSoft(state.levelPct).hex();
            const c2 = scaleMain(state.levelPct).hex();
            gradStops[0].setAttribute('stop-color', c1);
            gradStops[1].setAttribute('stop-color', c2);
            // base body color + shadow via CSS variables
            body.style.setProperty('--water-color', c2);
            const shadow = (typeof chroma !== 'undefined') ? chroma(c2).alpha(0.28).css() : 'rgba(235,59,64,0.28)';
            body.style.setProperty('--water-shadow', shadow);
            // vessel tint: border and top-bg
            const vesselBorder = (typeof chroma !== 'undefined') ? chroma(c2).brighten(0.6).saturate(0.4).hex() : c2;
            const vesselTop = (typeof chroma !== 'undefined') ? chroma.mix('#ffffff', c1, 0.35, 'lch').alpha(0.35).css() : 'rgba(255,255,255,0.35)';
            body.style.setProperty('--vessel-border', vesselBorder);
            body.style.setProperty('--vessel-bg-top', vesselTop);
          }

          requestAnimationFrame(tick);
        }

        requestAnimationFrame((t)=>{ state.lastTs = t; tick(t); });

        return {
          setLevel(pct){ state.levelPct = clamp(pct, 0, 1); },
          pulse(amount){ state.amplitudePulse = Math.min(24, state.amplitudePulse + amount); },
          stop(){ state.running = false; }
        };
      }

      const animator = startWaterAnimator();

      function apply(v){
        const clamped = Math.max(0, Math.min(TARGET_ML, v));
        const pct = (clamped / TARGET_ML) * 100;
        if (fill) {
          fill.style.height = pct + '%';
          const isFull = pct >= 100;
          fill.classList.toggle('is-full', isFull);
        }
        if (amountEl) amountEl.textContent = formatMl(clamped);
        if (amountWrap) amountWrap.style.display = clamped > 0 ? '' : 'none';
        if (animator && typeof animator.setLevel === 'function') {
          animator.setLevel(pct / 100);
        }
      }

      function addCustom(ml){
        const next = readAmount() + ml;
        writeAmount(next);
        apply(next);
        if (animator && typeof animator.pulse === 'function') {
          animator.pulse(Math.min(14, 6 + ml / 120));
        }

        // Report current balance (clamped to TARGET_ML) to webhook
        try {
          const tgId = getTelegramUserId(telegramWebApp);
          const balance = Math.min(next, TARGET_ML);
          const payload = { tg_id: tgId, balance, date: formatDateKey() };
          sendWaterBalance(payload);
        } catch (_) {}
      }

      // init state (fetch today's balance from backend)
      (async function initWaterFromBackend(){
        try {
          const balance = await fetchTodayWaterBalance(telegramWebApp);
          const clamped = Math.max(0, Math.min(TARGET_ML, Number(balance) || 0));
          writeAmount(clamped);
          apply(clamped);
        } catch (_) {
          apply(0);
        }
      })();
      if (addBtns.length) {
        addBtns.forEach(btn => btn.addEventListener('click', () => {
          const ml = Number(btn.getAttribute('data-ml')) || 0;
          if (ml > 0) addCustom(ml);
        }));
      }
    })();

    // Gift bottom sheet on Sculptor screen
    (function initGift(){
      const screen = document.getElementById('sculptor-screen');
      if (!screen) return;
      const sheet = screen.querySelector('#gift-sheet');
      const btn = screen.querySelector('#gift-ok-btn');
      if (!sheet || !btn) return;
      // Show sheet with a slight delay when screen becomes visible
      const observer = new MutationObserver(() => {
        const visible = !screen.hidden;
        if (visible) {
          setTimeout(() => { if (sheet) sheet.hidden = false; }, 200);
        } else {
          if (sheet) sheet.hidden = true;
        }
      });
      observer.observe(screen, { attributes: true, attributeFilter: ['hidden'] });
      btn.addEventListener('click', () => { sheet.hidden = true; });
    })();

    // Apply dynamic content from admin config (before carousels init)
    try {
      const adminCfg = readAdminConfig();
      applyAdminConfig(adminCfg);
    } catch (_) {}

    // Home carousel swipe
    (function initHomeCarousel(){
      const container = document.querySelector('#home-screen .home-carousel:not(.news-carousel)');
      const track = container && container.querySelector('.home-track');
      if (!track) return;

      const dotGroups = Array.from(container.querySelectorAll('.home-dots'));
      const state = { index: 0, startX: 0, currentX: 0, dragging: false, width: () => track.clientWidth };

      function apply() {
        track.style.transform = `translateX(${-state.index * state.width()}px)`;
        dotGroups.forEach(group => {
          const dots = Array.from(group.querySelectorAll('.home-dot'));
          dots.forEach((d, i) => d.classList.toggle('is-active', i === state.index));
        });
      }

      function to(i) { state.index = Math.max(0, Math.min(1, i)); apply(); }

      // Expose simple controls for external triggers (e.g., rating auto-advance)
      try {
        window.__homeCarouselTo = to;
        window.__homeCarouselNext = function(){ to(state.index + 1); };
      } catch (_) {}

      dotGroups.forEach(group => {
        Array.from(group.querySelectorAll('.home-dot')).forEach(d => d.addEventListener('click', () => to(Number(d.dataset.to))));
      });

      const area = track;
      function onStart(x){ state.dragging = true; state.startX = x; state.currentX = x; track.style.transition = 'none'; }
      function onMove(x){ if(!state.dragging) return; state.currentX = x; const dx = x - state.startX; const base = -state.index * state.width(); track.style.transform = `translateX(${base + dx}px)`; }
      function onEnd(){ if(!state.dragging) return; track.style.transition = ''; const dx = state.currentX - state.startX; const threshold = state.width() * 0.2; if (dx > threshold) { to(state.index - 1); } else if (dx < -threshold) { to(state.index + 1); } else { apply(); } state.dragging = false; }

      area.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
      area.addEventListener('touchmove', e => onMove(e.touches[0].clientX), { passive: true });
      area.addEventListener('touchend', onEnd);

      // mouse support for dev in browser
      area.addEventListener('mousedown', e => onStart(e.clientX));
      window.addEventListener('mousemove', e => onMove(e.clientX));
      window.addEventListener('mouseup', onEnd);

      // scale the design canvas to full width (fit 964->container)
      function scaleCards(){
        const homePage = document.getElementById('home-screen');
        const carousel = homePage && homePage.querySelector('.home-carousel');
        if (carousel) {
          carousel.style.minHeight = 'unset';
        }

        document.querySelectorAll('#home-screen .card-canvas').forEach(canvas => {
          const baseW = 964; const baseH = 392.5;
          const containerW = (carousel && carousel.clientWidth ? carousel.clientWidth : (canvas.clientWidth || window.innerWidth));
          const scale = containerW / baseW; // fit full width of content area
          const rp = canvas.querySelector('.rectangle-parent');
          if (rp) {
            rp.style.transform = `translateX(-50%) scale(${scale})`;
            rp.style.transformOrigin = 'top center';
            rp.style.top = '0px';
          }
          // set canvas height so the slide's height equals card height
          canvas.style.height = (baseH * scale) + 'px';
          // expose scale to CSS for consistent decoration sizing elsewhere
          const root = document.getElementById('home-screen');
          if (root) root.style.setProperty('--mood-scale', String(scale));
        });
        apply();
      }
      window.__scaleHome = scaleCards;

      // initial position
      scaleCards();
      window.addEventListener('resize', scaleCards);
    })();

    // News carousel: dynamic length
    (function initNewsCarousel(){
      const container = document.querySelector('#home-screen .news-carousel');
      const track = container && container.querySelector('.home-track');
      if (!track) return;

      const dotGroups = Array.from(container.querySelectorAll('.home-dots'));
      const slides = Array.from(track.querySelectorAll('.home-slide'));
      const maxIndex = Math.max(0, slides.length - 1);
      const state = { index: 0, startX: 0, currentX: 0, dragging: false, width: () => track.clientWidth };

      function apply(){
        track.style.transform = `translateX(${-state.index * state.width()}px)`;
        dotGroups.forEach(group => {
          const dots = Array.from(group.querySelectorAll('.home-dot'));
          dots.forEach((d, i) => d.classList.toggle('is-active', i === state.index));
        });
      }

      function to(i){ state.index = Math.max(0, Math.min(maxIndex, i)); apply(); }

      dotGroups.forEach(group => {
        Array.from(group.querySelectorAll('.home-dot')).forEach(d => d.addEventListener('click', () => to(Number(d.dataset.to))));
      });

      const area = track;
      function onStart(x){ state.dragging = true; state.startX = x; state.currentX = x; track.style.transition = 'none'; }
      function onMove(x){ if(!state.dragging) return; state.currentX = x; const dx = x - state.startX; const base = -state.index * state.width(); track.style.transform = `translateX(${base + dx}px)`; }
      function onEnd(){ if(!state.dragging) return; track.style.transition = ''; const dx = state.currentX - state.startX; const threshold = state.width() * 0.2; if (dx > threshold) { to(state.index - 1); } else if (dx < -threshold) { to(state.index + 1); } else { apply(); } state.dragging = false; }

      area.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
      area.addEventListener('touchmove', e => onMove(e.touches[0].clientX), { passive: true });
      area.addEventListener('touchend', onEnd);
      area.addEventListener('mousedown', e => onStart(e.clientX));
      window.addEventListener('mousemove', e => onMove(e.clientX));
      window.addEventListener('mouseup', onEnd);

      apply();
      window.addEventListener('resize', apply);
    })();

    // Initialize rating interactions on home cards
    initHomeRating(telegramWebApp);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


