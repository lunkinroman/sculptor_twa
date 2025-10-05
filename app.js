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

  function boot() {
    setupBuyButton(telegramWebApp);

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


