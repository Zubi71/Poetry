import { motion, AnimatePresence } from 'framer-motion';
import type { Participant } from '../../lib/types';
import { Avatar } from '../ui/AvatarStack';
import { WaveformBars } from '../ui/WaveformBars';

export function CurrentlySpeaking({ speaker, onOpenProfile }: { speaker: Participant | null; onOpenProfile: (p: Participant) => void }) {
  return (
    <section className="mr-mx-4 mr-mt-4">
      <h2 className="mr-mb-2 mr-font-mr-urdu mr-text-base mr-text-mr-gold" dir="rtl">
        اب گفتگو کر رہے ہیں
      </h2>
      <AnimatePresence mode="wait">
        {speaker ? (
          <motion.button
            key={speaker.userId}
            onClick={() => onOpenProfile(speaker)}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="mr-flex mr-w-full mr-items-center mr-gap-4 mr-rounded-3xl mr-border mr-border-mr-gold/30 mr-bg-gradient-to-r mr-from-mr-purple/20 mr-to-mr-bg-secondary mr-p-4 mr-text-left mr-shadow-mr-gold-glow"
          >
            <span className="mr-relative mr-flex">
              <span className="mr-absolute mr-inset-0 mr-rounded-full mr-bg-mr-gold/40 mr-blur-md mr-animate-mr-pulse-gold" />
              <Avatar name={speaker.name} avatarUrl={speaker.avatar} size={64} ring="gold" />
            </span>
            <div className="mr-min-w-0 mr-flex-1">
              <p className="mr-text-xs mr-uppercase mr-tracking-wide mr-text-mr-gold-light">Now Speaking</p>
              <p className="mr-truncate mr-text-lg mr-font-bold mr-text-white">{speaker.name}</p>
              <p className="mr-text-xs mr-text-mr-muted">{speaker.isHost ? 'Host' : 'Speaker'}</p>
            </div>
            <WaveformBars active bars={5} />
          </motion.button>
        ) : (
          <div className="mr-rounded-3xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary/60 mr-p-4 mr-text-center mr-text-sm mr-text-mr-muted">
            No one is speaking right now
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
