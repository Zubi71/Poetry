import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChatMessage } from '../../lib/types';
import { Avatar } from '../ui/AvatarStack';

interface Floater {
  id: string | number;
  from: string;
  text: string;
  avatar?: string;
}

const FLOAT_LIFETIME_MS = 4200;
const MAX_ON_SCREEN = 10;

// Hoisted so the keyframe target is referentially stable across re-renders —
// inline literals would get recreated every render (the room re-renders
// often from realtime sync) and Framer Motion restarts a keyframe animation
// whenever the `animate` value's identity changes, which kept resetting
// these back to their opacity:0 starting frame before they could play.
const FLOAT_ANIMATE = { opacity: [0, 1, 1, 0], y: [16, 0, -10, -70], scale: 1 };
const FLOAT_TRANSITION = { duration: FLOAT_LIFETIME_MS / 1000, times: [0, 0.12, 0.75, 1], ease: 'easeOut' as const };

// Bigo Live / Instagram Live style floating comments — every new chat
// message (not just the sender's own) drifts up over the stream and
// fades out, on top of the regular scrollable comment list below.
export function FloatingComments({ messages }: { messages: ChatMessage[] }) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const seenCount = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    // First run after mount: whatever's already loaded is history, not a
    // live event — don't replay it as floaters, just record the baseline.
    if (!initialized.current) {
      initialized.current = true;
      seenCount.current = messages.length;
      return;
    }
    if (messages.length <= seenCount.current) {
      seenCount.current = messages.length;
      return;
    }
    const fresh = messages.slice(seenCount.current).filter((m) => m.type !== 'system');
    seenCount.current = messages.length;
    if (!fresh.length) return;

    const added = fresh.map((m) => ({ id: m.dbId ?? m.id, from: m.from, text: m.text, avatar: undefined }));
    setFloaters((prev) => [...prev, ...added].slice(-MAX_ON_SCREEN));
    added.forEach((f) => {
      setTimeout(() => setFloaters((prev) => prev.filter((x) => x.id !== f.id)), FLOAT_LIFETIME_MS);
    });
  }, [messages]);

  return (
    <div className="mr-pointer-events-none mr-fixed mr-bottom-24 mr-left-3 mr-z-30 mr-flex mr-w-[78%] mr-max-w-xs mr-flex-col-reverse mr-gap-1.5">
      <AnimatePresence>
        {floaters.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={FLOAT_ANIMATE}
            exit={{ opacity: 0 }}
            transition={FLOAT_TRANSITION}
            className="mr-flex mr-max-w-full mr-items-center mr-gap-1.5 mr-rounded-full mr-bg-black/55 mr-px-3 mr-py-1.5 mr-backdrop-blur-sm"
          >
            <Avatar name={f.from} avatarUrl={f.avatar} size={20} />
            <span className="mr-truncate mr-text-xs mr-text-white">
              <strong className="mr-mr-1 mr-text-mr-gold-light">{f.from?.split(' ')[0]}</strong>
              {f.text}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
