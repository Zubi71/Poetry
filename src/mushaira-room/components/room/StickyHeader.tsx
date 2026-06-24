import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RoomMeta } from '../../lib/types';
import { formatCount } from '../../lib/useMushairaEvents';

export function StickyHeader({
  meta,
  listenerCount,
  onShare,
  onLeave,
  onOpenInfo,
  paused
}: {
  meta: RoomMeta | null;
  listenerCount: number;
  onShare: () => void;
  onLeave: () => void;
  onOpenInfo: (panel: 'info' | 'rules' | 'report') => void;
  paused: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      Components?.showToast?.('Live link copied!');
    } catch {
      /* clipboard may be unavailable — share fallback already handled by onShare */
    }
    setMenuOpen(false);
  };

  return (
    <header className="mr-sticky mr-top-0 mr-z-40 mr-flex mr-items-center mr-gap-3 mr-border-b mr-border-mr-gold/20 mr-bg-mr-bg/80 mr-px-4 mr-py-3 mr-backdrop-blur-xl">
      <button
        onClick={onLeave}
        className="mr-flex mr-h-9 mr-w-9 mr-items-center mr-justify-center mr-rounded-full mr-bg-white/5 mr-text-white hover:mr-bg-white/10"
        aria-label="Leave room"
      >
        ←
      </button>

      <div className="mr-flex mr-min-w-0 mr-flex-1 mr-items-center mr-gap-2">
        <span className="mr-flex mr-items-center mr-gap-1.5 mr-rounded-full mr-bg-red-500/15 mr-px-2.5 mr-py-1 mr-text-xs mr-font-bold mr-text-red-400">
          <span className={`mr-h-1.5 mr-w-1.5 mr-rounded-full mr-bg-red-500 ${paused ? '' : 'mr-animate-pulse'}`} />
          {paused ? 'PAUSED' : 'LIVE'}
        </span>
        <span className="mr-truncate mr-text-sm mr-text-mr-muted">
          {formatCount(listenerCount)} Listening
        </span>
      </div>

      <button
        onClick={onShare}
        className="mr-flex mr-h-9 mr-w-9 mr-items-center mr-justify-center mr-rounded-full mr-bg-white/5 mr-text-mr-gold hover:mr-bg-white/10"
        aria-label="Share room"
      >
        ↗
      </button>

      <div className="mr-relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="mr-flex mr-h-9 mr-w-9 mr-items-center mr-justify-center mr-rounded-full mr-bg-white/5 mr-text-white hover:mr-bg-white/10"
          aria-label="More options"
          aria-expanded={menuOpen}
        >
          ⋮
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="mr-absolute mr-right-0 mr-top-11 mr-z-50 mr-w-48 mr-overflow-hidden mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary mr-shadow-mr-gold-glow"
            >
              {[
                { label: 'Room Info', action: () => onOpenInfo('info') },
                { label: 'Rules', action: () => onOpenInfo('rules') },
                { label: 'Copy Link', action: copyLink },
                { label: 'Share', action: () => { onShare(); setMenuOpen(false); } },
                { label: 'Report Room', action: () => onOpenInfo('report'), danger: true }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`mr-block mr-w-full mr-px-4 mr-py-2.5 mr-text-left mr-text-sm hover:mr-bg-white/5 ${item.danger ? 'mr-text-red-400' : 'mr-text-white'}`}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
