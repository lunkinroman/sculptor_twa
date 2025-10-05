(function () {
  const telegramWebApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  function setThemeFromTelegram(themeParams) {
    if (!themeParams) return;
    const root = document.documentElement;
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
  }

  function updateEnvUI({ isTelegram, colorScheme }) {
    document.getElementById('is-telegram').textContent = isTelegram ? 'Yes' : 'No (browser)';
    document.getElementById('theme').textContent = colorScheme;
  }

  function updateUserUI(user) {
    document.getElementById('user-id').textContent = user?.id ?? '—';
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
    document.getElementById('user-name').textContent = fullName || '—';
    document.getElementById('user-username').textContent = user?.username ? `@${user.username}` : '—';
  }

  function setupButtons(tg) {
    const btnSend = document.getElementById('btn-send-data');
    const btnAlert = document.getElementById('btn-alert');

    btnSend.addEventListener('click', () => {
      const payload = { ts: Date.now(), action: 'send_data_click' };
      if (tg) {
        tg.sendData(JSON.stringify(payload));
      } else {
        alert('sendData: ' + JSON.stringify(payload));
      }
    });

    btnAlert.addEventListener('click', () => {
      if (tg) {
        tg.showAlert('Hello from WebApp!');
      } else {
        alert('Hello from WebApp!');
      }
    });
  }

  function initInTelegram(tg) {
    tg.ready();
    try { tg.expand(); } catch (_) {}

    setThemeFromTelegram(tg.themeParams);

    updateEnvUI({ isTelegram: true, colorScheme: tg.colorScheme || 'unknown' });
    updateUserUI(tg.initDataUnsafe?.user);

    tg.MainButton.setText('Confirm');
    tg.MainButton.show();
    tg.onEvent('mainButtonClicked', () => {
      tg.showConfirm('Do you confirm?', (ok) => {
        if (ok) tg.sendData(JSON.stringify({ confirmed: true, ts: Date.now() }));
      });
    });

    tg.onEvent('themeChanged', () => {
      setThemeFromTelegram(tg.themeParams);
      updateEnvUI({ isTelegram: true, colorScheme: tg.colorScheme || 'unknown' });
    });
  }

  function initInBrowserFallback() {
    updateEnvUI({ isTelegram: false, colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' });
    updateUserUI(null);
  }

  function boot() {
    setupButtons(telegramWebApp);
    if (telegramWebApp) {
      initInTelegram(telegramWebApp);
    } else {
      initInBrowserFallback();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


