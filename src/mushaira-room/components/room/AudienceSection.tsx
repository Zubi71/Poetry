import { useState } from 'react';
import type { Participant } from '../../lib/types';
import { Avatar } from '../ui/AvatarStack';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatCount } from '../../lib/useMushairaEvents';

const INITIAL_VISIBLE_LISTENERS = 9;

export function AudienceSection({ audience }: { audience: Participant[] }) {
  const [viewAll, setViewAll] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = audience.filter((p) => p.name?.toLowerCase().includes(query.toLowerCase()));
  const shown = audience.slice(0, INITIAL_VISIBLE_LISTENERS);
  const remaining = audience.length - shown.length;

  return (
    <section className="mr-mx-4 mr-mt-6">
      <div className="mr-flex mr-items-center mr-justify-between">
        <h2 className="mr-text-sm mr-font-bold mr-text-white">👥 سامعین</h2>
        <button onClick={() => setViewAll(true)} className="mr-text-xs mr-font-semibold mr-text-mr-gold">
          View All
        </button>
      </div>

      {!audience.length && (
        <p className="mr-mt-3 mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary/60 mr-px-4 mr-py-6 mr-text-center mr-text-xs mr-text-mr-muted">
          No listeners yet
        </p>
      )}

      {!!audience.length && (
        <div className="mr-mt-3 mr-grid mr-grid-cols-3 mr-gap-3 sm:mr-grid-cols-4 md:mr-grid-cols-5 lg:mr-grid-cols-6">
          {shown.map((p) => (
            <div
              key={p.userId}
              className="mr-flex mr-flex-col mr-items-center mr-gap-2 mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary/60 mr-p-3"
            >
              <Avatar name={p.name} avatarUrl={p.avatar} size={48} />
              <span className="mr-truncate mr-text-xs mr-font-semibold mr-text-white">{p.name?.split(' ')[0]}</span>
              <Badge tone="muted">Listener</Badge>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          onClick={() => setViewAll(true)}
          className="mr-mt-3 mr-w-full mr-text-center mr-text-xs mr-font-semibold mr-text-mr-muted hover:mr-text-mr-gold"
        >
          +{formatCount(remaining)} other listeners →
        </button>
      )}

      <Modal open={viewAll} onClose={() => setViewAll(false)} title="Audience">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listener…"
          className="mr-mb-3 mr-w-full mr-rounded-xl mr-border mr-border-white/10 mr-bg-white/5 mr-px-3 mr-py-2 mr-text-sm mr-text-white mr-placeholder-mr-muted mr-outline-none focus:mr-border-mr-gold/50"
        />
        <div className="mr-max-h-80 mr-space-y-2 mr-overflow-y-auto">
          {filtered.map((p) => (
            <div key={p.userId} className="mr-flex mr-items-center mr-gap-3 mr-rounded-xl mr-px-2 mr-py-2 hover:mr-bg-white/5">
              <Avatar name={p.name} avatarUrl={p.avatar} size={36} />
              <span className="mr-flex-1 mr-truncate mr-text-sm mr-text-white">{p.name}</span>
              <button
                onClick={() => Storage?.toggleFollow?.(p.userId)}
                className="mr-rounded-full mr-border mr-border-mr-gold/40 mr-px-3 mr-py-1 mr-text-xs mr-text-mr-gold"
              >
                Follow
              </button>
            </div>
          ))}
          {!filtered.length && <p className="mr-py-6 mr-text-center mr-text-sm mr-text-mr-muted">No listeners found</p>}
        </div>
      </Modal>
    </section>
  );
}
