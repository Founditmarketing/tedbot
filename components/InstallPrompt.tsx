import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';

/**
 * Branded "Add Ted to your home screen" prompt (PWA install).
 *
 * - Android / desktop Chromium: captures `beforeinstallprompt` and triggers the
 *   native install flow on tap.
 * - iOS Safari: no native prompt exists, so we show the Share → Add to Home
 *   Screen instructions instead.
 * - Never shown when already installed (standalone) or recently dismissed.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'ask_ted_install_dismissed';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // re-ask after a week
const APPEAR_DELAY_MS = 3500;

export const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<'native' | 'ios' | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < SNOOZE_MS) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && 'ontouchend' in document);
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);

    let appearTimer: ReturnType<typeof setTimeout>;

    if (isIOS && isSafari) {
      setMode('ios');
      appearTimer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode('native');
      clearTimeout(appearTimer);
      appearTimer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      clearTimeout(appearTimer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const snooze = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // user closed the native sheet — treat as a snooze
    }
    setDeferred(null);
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  return (
    <AnimatePresence>
      {visible && mode && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-3 z-[95] mx-auto max-w-sm bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:left-10 sm:right-auto sm:mx-0 sm:bottom-10"
        >
          <div className="relative overflow-hidden rounded-2xl border border-gold-300/20 bg-[#091521]/95 p-5 shadow-2xl backdrop-blur-xl">
            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  'radial-gradient(20rem 16rem at 15% 0%, rgba(212, 175, 55, 0.10), transparent 70%)',
              }}
            />

            <button
              onClick={snooze}
              aria-label="Dismiss"
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-cream/40 transition-colors hover:bg-white/10 hover:text-cream"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex items-start gap-4">
              <img
                src="/icons/icon-192.png"
                alt="Ask Ted"
                className="h-12 w-12 flex-shrink-0 rounded-xl ring-1 ring-gold-300/25"
              />
              <div className="min-w-0 pr-4">
                <p className="font-sans text-[10px] uppercase tracking-[0.35em] text-gold-300/70">
                  Weiss &amp; Goldring
                </p>
                <h2 className="mt-1 font-serif text-xl italic leading-tight text-cream">
                  Keep Ted a tap away
                </h2>

                {mode === 'native' ? (
                  <>
                    <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/55">
                      Add the concierge to your home screen for instant access — no
                      app store required.
                    </p>
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        onClick={install}
                        className="rounded-full bg-gold-500 px-5 py-2 font-sans text-[11px] uppercase tracking-[0.2em] text-black shadow-[0_0_12px_rgba(212,175,55,0.35)] transition-colors hover:bg-gold-400"
                      >
                        Install
                      </button>
                      <button
                        onClick={snooze}
                        className="font-sans text-[11px] uppercase tracking-[0.2em] text-cream/40 transition-colors hover:text-cream/70"
                      >
                        Not now
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/55">
                    Tap{' '}
                    <ShareGlyph />{' '}
                    in the toolbar, then{' '}
                    <span className="text-cream/80">"Add to Home Screen."</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/** Inline iOS share icon so the instruction reads naturally. */
const ShareGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    aria-label="Share"
    className="mx-0.5 inline-block h-4 w-4 -translate-y-0.5 text-gold-300"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 15V3" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
  </svg>
);
