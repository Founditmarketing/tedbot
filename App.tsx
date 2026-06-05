import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { AskTed } from './components/AskTed';
import { InstallPrompt } from './components/InstallPrompt';

const EASE = [0.16, 1, 0.3, 1] as const;

function App() {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.13, delayChildren: reduce ? 0 : 0.25 },
    },
  };

  const rise: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 26 },
    show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: EASE } },
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-navy-900 text-cream font-sans">
      {/* Backdrop photograph — more visible on phones, softer overlay on small screens */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-45 sm:opacity-25"
        style={{ backgroundImage: "url('/bowtieheader.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/35 via-navy-900/50 to-navy-900/80 sm:from-navy-900/75 sm:via-navy-900/88 sm:to-navy-900" />

      {/* Atmospheric gold glow — sits behind the headline on desktop, low chroma */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(60rem 50rem at 26% 42%, rgba(212, 175, 55, 0.10), transparent 62%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: reduce ? 1 : [0.7, 1, 0.7] }}
        transition={reduce ? { duration: 1.2 } : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Edge vignette for depth — eased back on phones so the photo reads */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 sm:opacity-100"
        style={{
          backgroundImage:
            'radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(5, 14, 23, 0.65) 100%)',
        }}
      />

      {/* Faint pinstripe — suiting fabric texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(212, 175, 55, 0.02) 59px, rgba(212, 175, 55, 0.02) 60px)',
        }}
      />

      {/* Content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 text-center sm:items-start sm:pl-16 sm:text-left lg:pl-28"
      >
        {/* Monogram seal */}
        <motion.img
          variants={rise}
          src="/WGicon_circle.png"
          alt="Weiss & Goldring monogram"
          className="mb-7 h-14 w-14 rounded-full ring-1 ring-gold-300/25 sm:h-16 sm:w-16"
        />

        <motion.p
          variants={rise}
          className="mb-6 font-sans text-[11px] uppercase tracking-[0.5em] text-gold-300/70"
        >
          Weiss &amp; Goldring &nbsp;·&nbsp; Est. 1899
        </motion.p>

        <motion.h1
          variants={rise}
          className="mb-6 font-serif text-[clamp(3.75rem,11vw,9rem)] leading-[0.92] text-cream"
        >
          Ask <span className="italic text-gold-300">Ted</span>
        </motion.h1>

        <motion.p
          variants={rise}
          className="mb-9 max-w-xl font-serif text-[clamp(1.25rem,3.2vw,2rem)] italic leading-snug text-cream/80"
        >
          Your personal style concierge — fine tailoring, trusted brands, and a
          private fitting whenever you're ready.
        </motion.p>

        <motion.div variants={rise} className="flex items-center gap-3 text-cream/50">
          <motion.div
            className="h-px w-12 origin-left bg-gold-300/50"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.3, ease: EASE, delay: reduce ? 0 : 1 }}
          />
          <span className="font-sans text-[11px] uppercase tracking-[0.3em]">
            The Silver Standard
          </span>
        </motion.div>

        <motion.p variants={rise} className="mt-10 max-w-md font-sans text-sm text-cream/40">
          Tap the concierge bell to begin your consultation.
        </motion.p>
      </motion.div>

      {/* The concierge. Opens docked on desktop, bell on mobile. */}
      <AskTed defaultOpen={typeof window !== 'undefined' && window.innerWidth >= 1024} />

      {/* "Add to home screen" prompt (PWA install). */}
      <InstallPrompt />
    </div>
  );
}

export default App;
