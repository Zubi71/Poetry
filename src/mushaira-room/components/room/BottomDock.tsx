import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactionPicker, ReactionBurst } from '../ui/ReactionPicker';

export function BottomDock({
  micOn,
  mutedByHost,
  canSpeak,
  hasSeat,
  isHost,
  handRaised,
  paused,
  onToggleMic,
  onRaiseHand,
  onCheckIn,
  onReaction,
  onShare,
  onDonate,
  onLeaveSeat,
  onExit,
  onOpenInfo,
  onTogglePause,
  onEndEvent
}: {
  micOn: boolean;
  mutedByHost: boolean;
  canSpeak: boolean;
  hasSeat: boolean;
  isHost: boolean;
  handRaised: boolean;
  paused: boolean;
  onToggleMic: () => void;
  onRaiseHand: () => void;
  onCheckIn: () => void;
  onReaction: (emoji: string) => void;
  onShare: () => void;
  onDonate: () => void;
  onLeaveSeat: () => void;
  onExit: () => void;
  onOpenInfo: (panel: 'info' | 'rules' | 'report') => void;
  onTogglePause: () => void;
  onEndEvent: () => void;
}) {
  const [reactOpen, setReactOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; emoji: string }[]>([]);

  const fireReaction = (emoji: string) => {
    onReaction(emoji);
    const id = Date.now();
    setBursts((b) => [...b, { id, emoji }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1600);
  };

  const blocked = mutedByHost || !canSpeak;
  // Only the host can self-seat an audience member into a vacant slot —
  // everyone else has to raise a hand and wait for the host to call on them.
  const claimSeat = () => (isHost ? onCheckIn() : onRaiseHand());

  return (
    <div className="mr-fixed mr-bottom-0 mr-left-0 mr-right-0 mr-z-40 mr-border-t mr-border-mr-gold/20 mr-bg-mr-bg/90 mr-px-3 mr-py-3 mr-backdrop-blur-xl">
      <div className="mr-relative mr-mx-auto mr-flex mr-max-w-2xl mr-items-center mr-justify-between mr-gap-2">
        <AnimatePresence>
          {bursts.map((b) => (
            <ReactionBurst key={b.id} id={b.id} emoji={b.emoji} />
          ))}
        </AnimatePresence>

        <button
          onClick={hasSeat ? onToggleMic : claimSeat}
          disabled={hasSeat ? blocked : !isHost && handRaised}
          className={`mr-flex mr-h-12 mr-w-12 mr-flex-col mr-items-center mr-justify-center mr-rounded-2xl mr-text-lg ${
            hasSeat && micOn && !blocked ? 'mr-bg-mr-gold-gradient mr-text-black mr-shadow-mr-gold-glow' : 'mr-bg-white/5 mr-text-white'
          } disabled:mr-opacity-40`}
          aria-label="Toggle microphone"
        >
          {hasSeat ? (micOn && !blocked ? '🎙️' : '🎤') : !isHost && handRaised ? '✋' : '🪑'}
          <span className="mr-text-[9px] mr-font-medium">
            {hasSeat ? (micOn && !blocked ? 'On' : 'Off') : !isHost && handRaised ? 'Raised' : 'Seat'}
          </span>
        </button>

        <button
          onClick={onRaiseHand}
          disabled={hasSeat || isHost || handRaised}
          className={`mr-flex mr-h-12 mr-w-12 mr-flex-col mr-items-center mr-justify-center mr-rounded-2xl mr-text-lg disabled:mr-opacity-40 ${
            handRaised && !hasSeat ? 'mr-bg-mr-gold-gradient mr-text-black' : 'mr-bg-white/5 mr-text-white'
          }`}
          aria-label="Raise hand"
        >
          ✋
          <span className="mr-text-[9px] mr-font-medium">{handRaised && !hasSeat ? 'Waiting' : 'Raise'}</span>
        </button>

        <button
          onClick={hasSeat ? onToggleMic : claimSeat}
          disabled={!hasSeat && !isHost && handRaised}
          className="mr-flex mr-h-12 mr-flex-1 mr-items-center mr-justify-center mr-rounded-2xl mr-bg-mr-purple-gradient mr-px-3 mr-text-sm mr-font-bold mr-text-white mr-shadow-mr-purple-glow disabled:mr-opacity-40"
        >
          {hasSeat ? 'On Stage' : !isHost && handRaised ? 'Hand Raised — Waiting' : 'Request to Speak'}
        </button>

        <div className="mr-relative">
          <button
            onClick={() => setReactOpen((v) => !v)}
            className="mr-flex mr-h-12 mr-w-12 mr-flex-col mr-items-center mr-justify-center mr-rounded-2xl mr-bg-white/5 mr-text-lg"
            aria-label="React"
          >
            😍
            <span className="mr-text-[9px] mr-font-medium mr-text-white">React</span>
          </button>
          <ReactionPicker open={reactOpen} onClose={() => setReactOpen(false)} onPick={fireReaction} />
        </div>

        <div className="mr-relative">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="mr-flex mr-h-12 mr-w-12 mr-flex-col mr-items-center mr-justify-center mr-rounded-2xl mr-bg-white/5 mr-text-lg mr-text-white"
            aria-label="More"
          >
            ⋯
          </button>
          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="mr-absolute mr-bottom-full mr-right-0 mr-z-20 mr-mb-3 mr-w-44 mr-overflow-hidden mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary mr-shadow-mr-gold-glow"
              >
                {[
                  { label: 'Room Info', action: () => onOpenInfo('info') },
                  { label: 'Rules', action: () => onOpenInfo('rules') },
                  { label: 'Send Gift', action: onDonate },
                  { label: 'Share', action: onShare },
                  ...(hasSeat ? [{ label: 'Leave Seat', action: onLeaveSeat }] : []),
                  ...(isHost ? [{ label: paused ? 'Resume Live' : 'Pause Live', action: onTogglePause }] : []),
                  ...(isHost ? [{ label: 'End Room', action: onEndEvent, danger: true }] : []),
                  { label: 'Exit Room', action: onExit, danger: true }
                ].map((item: any) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      setMoreOpen(false);
                    }}
                    className={`mr-block mr-w-full mr-px-4 mr-py-2.5 mr-text-left mr-text-sm hover:mr-bg-white/5 ${item.danger ? 'mr-text-red-400' : 'mr-text-white'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
