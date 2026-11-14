import { useSyncExternalStore } from 'react';

/** Chromium's install event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallState {
  /** The app runs as an installed app (standalone window). */
  installed: boolean;
  /** Chromium (Android, desktop Chrome/Edge) offered an install prompt we can show. */
  canPrompt: boolean;
  /** iPhone/iPad: no install prompt exists — show "Share → Add to Home Screen" help instead. */
  isIos: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let state: InstallState = { installed: false, canPrompt: false, isIos: false };
const listeners = new Set<() => void>();

function setState(next: Partial<InstallState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}

function isIosDevice(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support tells them apart.
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Call once before React renders: browsers may fire `beforeinstallprompt` very early, and the
 * event is lost if nobody is listening yet.
 */
export function startInstallPromptCapture(): void {
  if (typeof window === 'undefined') return;
  state = { installed: isStandalone(), canPrompt: false, isIos: isIosDevice() };
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // we show our own "Install app" button instead of the mini-infobar
    deferredPrompt = event as BeforeInstallPromptEvent;
    setState({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ installed: true, canPrompt: false });
  });
}

/** Shows the browser's install dialog (Chromium only). */
export async function promptInstall(): Promise<void> {
  const prompt = deferredPrompt;
  if (!prompt) return;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  deferredPrompt = null; // a prompt can only be used once
  setState({ canPrompt: false, installed: outcome === 'accepted' || state.installed });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, () => state);
}
