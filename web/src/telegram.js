// Thin wrapper around the Telegram WebApp SDK with safe fallbacks for
// running in a normal browser during development.
export const tg = window.Telegram?.WebApp;

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  // adopt Telegram theme colors as CSS variables
  const p = tg.themeParams || {};
  const root = document.documentElement.style;
  if (p.bg_color) root.setProperty('--tg-bg', p.bg_color);
  if (p.text_color) root.setProperty('--tg-text', p.text_color);
  if (p.button_color) root.setProperty('--tg-accent', p.button_color);
  if (p.secondary_bg_color) root.setProperty('--tg-card', p.secondary_bg_color);
  tg.setHeaderColor?.('secondary_bg_color');
}

// initData string used to authenticate API calls
export const initData = tg?.initData || '';

export const tgUser = tg?.initDataUnsafe?.user || null;

export function haptic(type = 'light') {
  try {
    tg?.HapticFeedback?.impactOccurred(type);
  } catch {}
}

export function showAlert(msg) {
  if (tg?.showAlert) tg.showAlert(msg);
  else alert(msg);
}
