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
  commentCount,
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
  onEndEvent,
  onSendComment
}: {
  micOn: boolean;
  mutedByHost: boolean;
  canSpeak: boolean;
  hasSeat: boolean;
  isHost: boolean;
  handRaised: boolean;
  paused: boolean;
  commentCount: number;
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
  onSendComment: (text: string) => void;
}) {
  const [reactOpen, setReactOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [commentBarOpen, setCommentBarOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [bursts, setBursts] = useState<{ id: number; emoji: string }[]>([]);

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onSendComment(commentText.trim());
    setCommentText('');
    setCommentBarOpen(false);
  };

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

  const speaking = hasSeat && micOn && !blocked;
  const waiting = !isHost && handRaised && !hasSeat;

  return (
    <div className="mr-fixed mr-bottom-0 mr-left-0 mr-right-0 mr-z-40 mr-border-t mr-border-mr-gold/20 mr-bg-mr-bg/95 mr-px-4 mr-py-3 mr-backdrop-blur-xl">
      <div className="mr-relative mr-mx-auto mr-flex mr-max-w-2xl mr-items-center mr-justify-between mr-gap-3">
        <AnimatePresence>
          {bursts.map((b) => (
            <ReactionBurst key={b.id} id={b.id} emoji={b.emoji} />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {commentBarOpen && (
            <motion.form
              key="comment-bar"
              onSubmit={submitComment}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mr-absolute mr-bottom-full mr-left-0 mr-right-0 mr-z-20 mr-mb-3 mr-flex mr-gap-2 mr-rounded-full mr-border mr-border-white/10 mr-bg-mr-bg-secondary mr-p-1.5 mr-shadow-mr-gold-glow"
            >
              <input
                autoFocus
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Say something…"
                className="mr-flex-1 mr-rounded-full mr-bg-white/5 mr-px-4 mr-py-2 mr-text-sm mr-text-white mr-placeholder-mr-muted mr-outline-none"
              />
              <button
                type="submit"
                className="mr-shrink-0 mr-rounded-full mr-bg-mr-purple-gradient mr-px-4 mr-text-sm mr-font-semibold mr-text-white"
              >
                Send
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Primary speak/seat control — collapses the old separate mic,
            raise-hand and "Request to Speak" buttons into one circle. */}
        <button
          onClick={hasSeat ? onToggleMic : claimSeat}
          disabled={hasSeat ? blocked : waiting}
          className={`mr-flex mr-h-16 mr-w-16 mr-shrink-0 mr-flex-col mr-items-center mr-justify-center mr-gap-0.5 mr-rounded-full mr-border-2 mr-text-xl disabled:mr-opacity-40 ${
            speaking
              ? 'mr-border-mr-gold mr-bg-mr-gold-gradient mr-text-black mr-shadow-mr-gold-glow'
              : waiting
              ? 'mr-border-mr-purple/70 mr-bg-mr-purple/15 mr-text-white'
              : 'mr-border-white/20 mr-bg-white/5 mr-text-white'
          }`}
          aria-label={hasSeat ? 'Toggle microphone' : 'Request to speak'}
        >
          {hasSeat ? (speaking ? '🎙️' : '🎤') : waiting ? '✋' : '🎤'}
          <span className="mr-text-[9px] mr-font-semibold">
            {hasSeat ? (speaking ? 'On Stage' : 'Off') : waiting ? 'Raised' : isHost ? 'Seat' : 'Request'}
          </span>
        </button>

        <div className="mr-flex mr-flex-1 mr-items-center mr-justify-center mr-gap-2">
          <div className="mr-relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="mr-flex mr-h-12 mr-w-12 mr-items-center mr-justify-center mr-rounded-full mr-bg-white/5 mr-text-lg mr-text-white"
              aria-label="More options"
            >
              👥
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="mr-absolute mr-bottom-full mr-left-0 mr-z-20 mr-mb-3 mr-w-44 mr-overflow-hidden mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary mr-shadow-mr-gold-glow"
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

          <div className="mr-relative">
            <button
              onClick={() => setReactOpen((v) => !v)}
              className="mr-flex mr-h-12 mr-w-12 mr-items-center mr-justify-center mr-rounded-full mr-bg-white/5 mr-text-lg"
              aria-label="Send reaction"
            >
              ❤️
            </button>
            <ReactionPicker open={reactOpen} onClose={() => setReactOpen(false)} onPick={fireReaction} />
          </div>

          <button
            onClick={onShare}
            className="mr-flex mr-h-12 mr-w-12 mr-items-center mr-justify-center mr-rounded-full mr-bg-white/5 mr-text-lg mr-text-white"
            aria-label="Share room"
          >
            ↗
          </button>
        </div>

        <button
          onClick={() => setCommentBarOpen((v) => !v)}
          className="mr-flex mr-h-12 mr-shrink-0 mr-items-center mr-gap-1.5 mr-rounded-full mr-bg-mr-purple-gradient mr-px-4 mr-text-sm mr-font-bold mr-text-white mr-shadow-mr-purple-glow"
          aria-label="Write a comment"
        >
          💬 {commentCount > 0 && <span>{commentCount > 99 ? '99+' : commentCount}</span>}
        </button>
      </div>
    </div>
  );
}
