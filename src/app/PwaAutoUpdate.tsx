import { useRegisterSW } from 'virtual:pwa-register/react';

/** Installed apps can stay open for days: look for a new version every hour. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the service worker and keeps everyone on the latest version. With
 * `registerType: 'autoUpdate'` a new version activates as soon as it has downloaded and the page
 * reloads by itself — there is no "Update" button to skip. New versions are looked for when the
 * app opens, when it comes back to the foreground, and every hour.
 */
export function PwaAutoUpdate() {
  useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) void registration.update();
      };
      window.setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });
  return null;
}
