import { motion, AnimatePresence } from 'framer-motion';
import type { Participant, RoomMeta } from '../../lib/types';
import { Avatar } from '../ui/AvatarStack';
import { WaveformBars } from '../ui/WaveformBars';

export function HeroBanner({
  meta,
  speaker,
  onOpenProfile
}: {
  meta: RoomMeta | null;
  speaker: Participant | null;
  onOpenProfile: (p: Participant) => void;
}) {
  return (
    <section className="mr-relative mr-mx-4 mr-mt-4 mr-overflow-hidden mr-rounded-3xl mr-border mr-border-mr-gold/20 mr-bg-gradient-to-br mr-from-mr-bg-secondary mr-via-mr-bg-secondary mr-to-mr-purple/20 mr-p-6">
      {/* ambient floating particles */}
      <div className="mr-pointer-events-none mr-absolute mr-inset-0 mr-overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="mr-absolute mr-h-1 mr-w-1 mr-rounded-full mr-bg-mr-gold/60"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -16, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
        <motion.div
          className="mr-absolute -mr-right-10 -mr-top-10 mr-h-48 mr-w-48 mr-rounded-full mr-bg-mr-gold/10 mr-blur-3xl"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>

      <div className="mr-relative mr-z-10 mr-flex mr-flex-col mr-items-center mr-text-center">
        <h1 className="mr-font-mr-urdu mr-text-2xl mr-font-bold mr-leading-relaxed mr-text-white sm:mr-text-3xl" dir="rtl">
          {meta?.title || 'عشق، زندگی اور احساس'}
        </h1>
        <p className="mr-mt-1 mr-font-mr-urdu mr-text-base mr-text-mr-muted" dir="rtl">
          لفظوں کی محفل، دلوں کا سنگم
        </p>

        {/* Mic by default; swaps to the active speaker's photo + pulsing
            glow the moment someone is speaking, instead of staying a
            static decorative icon. */}
        <motion.div
          className="mr-relative mr-mt-6 mr-shrink-0"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className={`mr-absolute mr-inset-0 mr-rounded-full mr-blur-2xl ${speaker ? 'mr-bg-mr-gold/40 mr-animate-mr-pulse-gold' : 'mr-bg-mr-gold/30'}`} />
          <div className="mr-relative mr-flex mr-h-28 mr-w-28 mr-items-center mr-justify-center mr-rounded-full mr-border-2 mr-border-mr-gold mr-bg-mr-gold-gradient mr-text-5xl mr-shadow-mr-gold-glow-lg sm:mr-h-32 sm:mr-w-32">
            {speaker ? (
              <Avatar name={speaker.name} avatarUrl={speaker.avatar} size={112} />
            ) : (
              '🎙️'
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {speaker ? (
            <motion.button
              key={speaker.userId}
              onClick={() => onOpenProfile(speaker)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mr-mt-4 mr-flex mr-items-center mr-gap-2 mr-rounded-full mr-border mr-border-mr-gold/30 mr-bg-mr-bg/40 mr-px-4 mr-py-2"
            >
              <WaveformBars active bars={4} />
              <span className="mr-text-sm mr-font-bold mr-text-white">{speaker.name}</span>
              <span className="mr-text-xs mr-text-mr-gold-light">{speaker.isHost ? 'Host' : 'Speaker'}</span>
            </motion.button>
          ) : (
            <motion.p
              key="silent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mr-mt-4 mr-text-sm mr-text-mr-muted"
            >
              No one is speaking right now
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
