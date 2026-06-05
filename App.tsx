import React from 'react';
import { AskTed } from './components/AskTed';

function App() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-navy-900 text-cream font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/bowtieheader.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/70 via-navy-900/85 to-navy-900" />

      {/* Faint pinstripe */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(212, 175, 55, 0.02) 59px, rgba(212, 175, 55, 0.02) 60px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center sm:items-start sm:pl-16 lg:pl-28 sm:text-left max-w-3xl">
        <p className="font-sans text-[11px] tracking-[0.5em] uppercase text-gold-300/70 mb-6">
          Weiss &amp; Goldring &nbsp;·&nbsp; Est. 1899
        </p>
        <h1 className="font-serif text-6xl sm:text-7xl lg:text-8xl text-white leading-[0.95] mb-6">
          Ask <span className="italic text-gold-300">Ted</span>
        </h1>
        <p className="font-serif italic text-2xl sm:text-3xl text-white/80 max-w-xl leading-snug mb-8">
          Your personal style concierge — fine tailoring, trusted brands, and a
          private fitting whenever you're ready.
        </p>
        <div className="flex items-center gap-3 text-white/50">
          <div className="h-[1px] w-12 bg-gold-300/40" />
          <span className="font-sans text-[11px] tracking-[0.3em] uppercase">
            The Silver Standard
          </span>
        </div>

        <p className="mt-10 font-sans text-sm text-white/40 max-w-md">
          Tap the concierge bell to begin your consultation.
        </p>
      </div>

      {/* The concierge. Opens docked on desktop, bell on mobile. */}
      <AskTed defaultOpen={typeof window !== 'undefined' && window.innerWidth >= 1024} />
    </div>
  );
}

export default App;
