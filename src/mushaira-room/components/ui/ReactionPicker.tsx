import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['❤️', '👏', '🔥', '🌹', '😍'];
// Only the first three persist server-side today (session_reactions table
// CHECK constraint is heart/clap/fire) — the other two are visual-only
// bursts until that schema is extended; VoiceRoomLive.sendReaction()
// already gates the API call accordingly.
const PERSISTED = new Set(['❤️', '👏', '🔥']);

export function ReactionPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (emoji: string) => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="mr-absolute mr-bottom-full mr-left-1/2 mr-z-20 mr-mb-3 -mr-translate-x-1/2 mr-flex mr-gap-2 mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary/95 mr-p-2 mr-shadow-mr-gold-glow mr-backdrop-blur-xl"
          onMouseLeave={onClose}
        >
          {EMOJIS.map((emoji) => (
            <motion.button
              key={emoji}
              whileTap={{ scale: 0.8 }}
              whileHover={{ scale: 1.25, y: -4 }}
              className="mr-relative mr-flex mr-h-10 mr-w-10 mr-items-center mr-justify-center mr-rounded-full mr-text-xl hover:mr-bg-white/10"
              title={PERSISTED.has(emoji) ? undefined : 'Visual reaction only'}
              onClick={() => {
                onPick(emoji);
                onClose();
              }}
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ReactionBurst({ emoji, id }: { emoji: string; id: string | number }) {
  return (
    <motion.span
      key={id}
      initial={{ opacity: 1, y: 0, x: 0, scale: 0.6 }}
      animate={{ opacity: 0, y: -120, x: (Math.random() - 0.5) * 60, scale: 1.4 }}
      transition={{ duration: 1.6, ease: 'easeOut' }}
      className="mr-pointer-events-none mr-absolute mr-bottom-16 mr-right-6 mr-text-2xl"
    >
      {emoji}
    </motion.span>
  );
}
