import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface Notif {
  id: string | number;
  type: string;
  text: string;
  time: string;
  read?: boolean;
  poemId?: number;
  conversationId?: number;
}

const ICONS: Record<string, string> = {
  like: '❤️',
  comment: '💬',
  message: '✉️',
  follow: '👤',
  event: '🎤',
  gift: '🎁',
  speaker_approved: '🎙️',
  mention: '@'
};

export function NotificationDropdown({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      let list: Notif[] | null = null;
      if (SupabaseClient?.isEnabled?.() && Auth?.isLoggedIn?.() && !Auth?.isGuest?.()) {
        list = await API?.getNotifications?.();
      }
      if (!list) list = Storage?.getNotifications?.() || [];
      setNotifications(list);
      setLoading(false);
      if (SupabaseClient?.isEnabled?.() && Auth?.isLoggedIn?.() && !Auth?.isGuest?.()) {
        await API?.markAllNotificationsRead?.();
      } else {
        Storage?.markNotificationsRead?.();
      }
    })();
  }, [open]);

  const linkFor = (n: Notif) =>
    n.poemId ? `/poem/${n.poemId}` : n.conversationId ? `/messages/${n.conversationId}` : '/notifications';

  return (
    <>
      {/* Portaled to <body> — the header this bell lives in has
          backdrop-blur, and Chromium (like filter) treats backdrop-filter
          as creating a containing block for fixed descendants, which was
          trapping this "fullscreen" backdrop inside the header's own
          small box instead of covering the page. */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="notif-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mr-fixed mr-inset-0 mr-z-40 mr-bg-black/60"
              onClick={onClose}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            key="notif-panel"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            className="mr-absolute mr-right-0 mr-top-12 mr-z-50 mr-w-72 mr-overflow-hidden mr-rounded-2xl mr-border mr-border-mr-gold/20 mr-bg-mr-bg-secondary mr-shadow-mr-gold-glow"
          >
            <div className="mr-border-b mr-border-white/10 mr-px-4 mr-py-3">
              <p className="mr-text-sm mr-font-bold mr-text-white">Notifications</p>
            </div>
            <div className="mr-max-h-80 mr-overflow-y-auto">
              {loading && <p className="mr-px-4 mr-py-6 mr-text-center mr-text-sm mr-text-mr-muted">Loading…</p>}
              {!loading && !notifications.length && (
                <p className="mr-px-4 mr-py-6 mr-text-center mr-text-sm mr-text-mr-muted">No notifications yet</p>
              )}
              {notifications.map((n) => (
                <a
                  key={n.id}
                  href={`#${linkFor(n)}`}
                  onClick={onClose}
                  className={`mr-flex mr-gap-2.5 mr-border-b mr-border-white/5 mr-px-4 mr-py-3 hover:mr-bg-white/5 ${n.read ? '' : 'mr-bg-mr-gold/5'}`}
                >
                  <span className="mr-text-lg">{ICONS[n.type] || '📅'}</span>
                  <div className="mr-min-w-0 mr-flex-1">
                    <p className="mr-truncate mr-text-sm mr-text-white">{n.text}</p>
                    <p className="mr-text-[11px] mr-text-mr-muted">{n.time}</p>
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
