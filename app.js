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

    function show(screen) {
      const screens = { calendar, links, favorites, home };
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
        btn.classList.toggle('is-active', document.querySelector('.bottom-nav .nav-btn.is-active') === btn);
      });
    }
    syncProfileActive();
    navButtons.forEach(btn => btn.addEventListener('click', syncProfileActive));

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

    // News carousel: clone exact behavior
    (function initNewsCarousel(){
      const container = document.querySelector('#home-screen .news-carousel');
      const track = container && container.querySelector('.home-track');
      if (!track) return;

      const dotGroups = Array.from(container.querySelectorAll('.home-dots'));
      const state = { index: 0, startX: 0, currentX: 0, dragging: false, width: () => track.clientWidth };

      function apply(){
        track.style.transform = `translateX(${-state.index * state.width()}px)`;
        dotGroups.forEach(group => {
          const dots = Array.from(group.querySelectorAll('.home-dot'));
          dots.forEach((d, i) => d.classList.toggle('is-active', i === state.index));
        });
      }

      function to(i){ state.index = Math.max(0, Math.min(2, i)); apply(); }

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


