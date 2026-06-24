import { useEffect, useState } from 'react';
import type { MushairaEvent } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { formatCount } from '../../lib/useMushairaEvents';

export function ReplayModal({ event, onClose }: { event: MushairaEvent | null; onClose: () => void }) {
  const [comments, setComments] = useState<{ from: string; text: string }[]>([]);

  useEffect(() => {
    if (!event) return;
    setComments([]);
    if (SupabaseClient?.isEnabled?.()) {
      API?.fetchSessionComments?.(event.id).then((list: any[]) => setComments((list || []).slice(-8)));
    }
  }, [event?.id]);

  if (!event) return null;
  const views = event.views || event.registered || 0;
  const likes = event.likes || event.like_count || 0;

  return (
    <Modal open={!!event} onClose={onClose} title={event.title}>
      <div className="mr-overflow-hidden mr-rounded-2xl mr-bg-black">
        {event.replay_url ? (
          <video controls className="mr-aspect-video mr-w-full" src={event.replay_url} />
        ) : (
          <div className="mr-flex mr-aspect-video mr-w-full mr-flex-col mr-items-center mr-justify-center mr-gap-2 mr-text-mr-muted">
            <span className="mr-text-3xl">▶</span>
            <p className="mr-text-sm">Replay recording will be available soon</p>
          </div>
        )}
      </div>
      <div className="mr-mt-3 mr-flex mr-gap-3 mr-text-xs mr-text-mr-muted">
        <span>👁 {formatCount(views)} views</span>
        <span>❤️ {formatCount(likes)} likes</span>
        <span>{event.date} · {event.time}</span>
      </div>
      <p className="mr-mt-2 mr-text-sm mr-text-mr-muted">{event.description}</p>
      {comments.length > 0 && (
        <div className="mr-mt-3 mr-space-y-1 mr-border-t mr-border-white/10 mr-pt-3">
          {comments.map((c, i) => (
            <p key={i} className="mr-text-xs mr-text-mr-muted">
              <strong className="mr-text-white">{c.from}:</strong> {c.text}
            </p>
          ))}
        </div>
      )}
    </Modal>
  );
}
