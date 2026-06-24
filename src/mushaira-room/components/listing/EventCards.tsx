import { motion } from 'framer-motion';
import type { MushairaEvent } from '../../lib/types';
import { formatCount, joinLive, setReminder, viewSessionDetails } from '../../lib/useMushairaEvents';
import { GoldButton } from '../ui/GoldButton';
import { Avatar } from '../ui/AvatarStack';

function eventImage(event: MushairaEvent) {
  return (MushairaEvents as any)?._eventImage?.(event) || '';
}

export function LiveEventCard({ event, featured = false }: { event: MushairaEvent; featured?: boolean }) {
  const watching = event.watching || event.registered || 0;
  const likes = event.likes || event.like_count || 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mr-overflow-hidden mr-rounded-3xl mr-border mr-border-mr-gold/20 mr-bg-mr-bg-secondary/70 ${featured ? '' : 'mr-flex mr-items-center mr-gap-3 mr-p-3'}`}
    >
      <div className={`mr-bg-mr-purple/10 ${featured ? 'mr-relative' : 'mr-relative mr-h-16 mr-w-16 mr-shrink-0 mr-overflow-hidden mr-rounded-2xl'}`}>
        <img
          src={eventImage(event)}
          alt={event.title}
          loading="lazy"
          onError={(e) => (e.currentTarget.style.opacity = '0')}
          className={featured ? 'mr-h-40 mr-w-full mr-object-cover' : 'mr-h-full mr-w-full mr-object-cover'}
        />
        <span className="mr-absolute mr-left-2 mr-top-2 mr-rounded-full mr-bg-red-500 mr-px-2 mr-py-0.5 mr-text-[10px] mr-font-bold mr-text-white">
          LIVE
        </span>
      </div>
      <div className={featured ? 'mr-p-4' : 'mr-min-w-0 mr-flex-1'}>
        <h3 className="mr-truncate mr-font-bold mr-text-white">{event.title}</h3>
        <p className="mr-truncate mr-text-xs mr-text-mr-muted">Host: {event.host}</p>
        <div className="mr-mt-1 mr-flex mr-gap-3 mr-text-xs mr-text-mr-muted">
          <span>👁 {formatCount(watching)}</span>
          <span>❤️ {formatCount(likes)}</span>
        </div>
        <GoldButton variant="gold" className={`mr-mt-2 ${featured ? '' : 'mr-px-3 mr-py-1 mr-text-xs'}`} onClick={() => joinLive(event.id)}>
          Join Live
        </GoldButton>
      </div>
    </motion.article>
  );
}

export function ScheduledEventCard({ event, registered }: { event: MushairaEvent; registered: number[] }) {
  const isRegistered = registered.includes(event.id);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mr-flex mr-items-center mr-gap-3 mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary/60 mr-p-3"
    >
      <img
        src={eventImage(event)}
        alt=""
        loading="lazy"
        onError={(e) => (e.currentTarget.style.opacity = '0')}
        className="mr-h-16 mr-w-16 mr-shrink-0 mr-rounded-2xl mr-bg-mr-purple/10 mr-object-cover"
      />
      <div className="mr-min-w-0 mr-flex-1">
        <p className="mr-text-xs mr-font-semibold mr-text-mr-gold-light">{event.time}</p>
        <h4 className="mr-truncate mr-font-bold mr-text-white">{event.title}</h4>
        <p className="mr-truncate mr-text-xs mr-text-mr-muted">Host: {event.host}</p>
      </div>
      <div className="mr-flex mr-shrink-0 mr-flex-col mr-gap-1.5">
        <button
          onClick={() => setReminder(event)}
          className={`mr-rounded-full mr-px-3 mr-py-1 mr-text-xs mr-font-semibold ${
            isRegistered ? 'mr-bg-mr-gold/20 mr-text-mr-gold' : 'mr-bg-mr-gold-gradient mr-text-black'
          }`}
        >
          🔔 {isRegistered ? 'Set' : 'Notify Me'}
        </button>
        <button onClick={() => viewSessionDetails(event.id)} className="mr-rounded-full mr-bg-white/10 mr-px-3 mr-py-1 mr-text-xs mr-text-white">
          Details
        </button>
      </div>
    </motion.article>
  );
}

export function EndedArchiveCard({ event, onListen }: { event: MushairaEvent; onListen: (event: MushairaEvent) => void }) {
  const views = event.views || event.registered || 0;
  const likes = event.likes || event.like_count || 0;
  const duration = event.duration_minutes ? `${event.duration_minutes} min` : '';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mr-flex mr-items-center mr-gap-3 mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary/60 mr-p-3"
    >
      <img
        src={eventImage(event)}
        alt=""
        loading="lazy"
        onError={(e) => (e.currentTarget.style.opacity = '0')}
        className="mr-h-16 mr-w-16 mr-shrink-0 mr-rounded-2xl mr-bg-mr-purple/10 mr-object-cover"
      />
      <div className="mr-min-w-0 mr-flex-1">
        <h4 className="mr-truncate mr-font-bold mr-text-white">{event.title}</h4>
        <p className="mr-truncate mr-text-xs mr-text-mr-muted">
          {event.date} {duration ? `· ${duration}` : ''}
        </p>
        <p className="mr-text-xs mr-text-mr-muted">
          ❤️ {formatCount(likes)} · 👁 {formatCount(views)} views
        </p>
      </div>
      <div className="mr-flex mr-shrink-0 mr-flex-col mr-gap-1.5">
        <button
          onClick={() => onListen(event)}
          className="mr-rounded-full mr-bg-mr-gold-gradient mr-px-3 mr-py-1 mr-text-xs mr-font-semibold mr-text-black"
        >
          {event.replay_url ? '▶ Listen' : 'No Recording'}
        </button>
        <button onClick={() => viewSessionDetails(event.id)} className="mr-rounded-full mr-bg-white/10 mr-px-3 mr-py-1 mr-text-xs mr-text-white">
          View Poetry
        </button>
      </div>
    </motion.article>
  );
}
