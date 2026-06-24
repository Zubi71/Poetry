import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../../lib/types';
import { Avatar } from '../ui/AvatarStack';

export function LiveComments({
  messages,
  isHost,
  myUserId,
  onSend,
  onPin,
  onDelete
}: {
  messages: ChatMessage[];
  isHost: boolean;
  myUserId?: string;
  onSend: (text: string) => void;
  onPin: (dbId: string | number, pinned: boolean) => void;
  onDelete: (dbId: string | number) => void;
}) {
  const [text, setText] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const pinned = messages.filter((m) => m.pinned);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <section className="mr-mx-4 mr-mt-6">
      <h2 className="mr-mb-3 mr-text-sm mr-font-bold mr-text-white">💬 Live Comments</h2>

      {pinned.length > 0 && (
        <div className="mr-mb-2 mr-space-y-1">
          {pinned.map((m) => (
            <div key={m.dbId || m.id} className="mr-flex mr-items-center mr-gap-2 mr-rounded-xl mr-border mr-border-mr-gold/30 mr-bg-mr-gold/10 mr-px-3 mr-py-2 mr-text-sm mr-text-mr-gold-light">
              📌 <strong>{m.from}:</strong> <span className="mr-truncate">{m.text}</span>
            </div>
          ))}
        </div>
      )}

      <div ref={boxRef} className="mr-max-h-64 mr-space-y-2 mr-overflow-y-auto mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary/50 mr-p-3">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.dbId || m.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mr-flex mr-items-start mr-gap-2 mr-rounded-xl mr-px-2 mr-py-1.5 mr-text-sm ${
                m.type === 'host' ? 'mr-bg-mr-gold/10 mr-text-mr-gold-light' : m.type === 'system' ? 'mr-text-mr-muted mr-italic' : 'mr-text-white'
              }`}
            >
              {m.type !== 'system' && <Avatar name={m.from} size={24} />}
              <div className="mr-min-w-0 mr-flex-1">
                {m.type !== 'system' && <strong className="mr-mr-1">{m.from}</strong>}
                <span>{m.text}</span>
              </div>
              {m.dbId && (m.userId === myUserId || isHost) && (
                <span className="mr-flex mr-shrink-0 mr-gap-1 mr-text-[10px] mr-text-mr-muted">
                  {isHost && (
                    <button onClick={() => onPin(m.dbId!, !m.pinned)} className="hover:mr-text-mr-gold">
                      {m.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}
                  {m.userId === myUserId && (
                    <button onClick={() => onDelete(m.dbId!)} className="hover:mr-text-red-400">
                      Delete
                    </button>
                  )}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {!messages.length && <p className="mr-py-6 mr-text-center mr-text-sm mr-text-mr-muted">No comments yet — say something!</p>}
      </div>

      <form onSubmit={submit} className="mr-mt-2 mr-flex mr-gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          className="mr-flex-1 mr-rounded-full mr-border mr-border-white/10 mr-bg-white/5 mr-px-4 mr-py-2 mr-text-sm mr-text-white mr-placeholder-mr-muted mr-outline-none focus:mr-border-mr-gold/50"
        />
        <button type="submit" className="mr-rounded-full mr-bg-mr-gold-gradient mr-px-4 mr-py-2 mr-text-sm mr-font-semibold mr-text-black">
          Send
        </button>
      </form>
    </section>
  );
}
