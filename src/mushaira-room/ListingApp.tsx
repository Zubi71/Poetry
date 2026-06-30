import { useEffect, useMemo, useState } from 'react';
import type { ListingTab, MushairaEvent } from './lib/types';
import { useMushairaEvents, filterScheduleByDate, filterEndedEvents } from './lib/useMushairaEvents';
import { TabsNav } from './components/listing/TabsNav';
import { LiveEventCard, ScheduledEventCard, EndedArchiveCard } from './components/listing/EventCards';
import { ReplayModal } from './components/listing/ReplayModal';
import { Avatar } from './components/ui/AvatarStack';

function readQuery() {
  const hash = location.hash.slice(1) || '/';
  const qs = hash.split('?')[1] || '';
  const params = new URLSearchParams(qs);
  return {
    tab: (params.get('tab') as ListingTab) || 'live',
    filter: params.get('filter') || 'all',
    efilter: params.get('efilter') || 'all',
    q: params.get('q') || ''
  };
}

const SCHEDULE_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week', label: 'Weekly' },
  { id: 'all', label: 'All' }
];

const ENDED_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'views', label: 'Most Viewed' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' }
];

export function ListingApp() {
  const [query, setQuery] = useState(readQuery());
  const [search, setSearch] = useState(query.q);
  const [replayEvent, setReplayEvent] = useState<MushairaEvent | null>(null);

  useEffect(() => {
    const onHashChange = () => setQuery(readQuery());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const { loading, live, scheduled, ended } = useMushairaEvents(search);
  const registered = Storage?.getRegisteredEvents?.() || [];

  const filteredScheduled = useMemo(() => filterScheduleByDate(scheduled, query.filter), [scheduled, query.filter]);
  const filteredEnded = useMemo(() => filterEndedEvents(ended, query.efilter), [ended, query.efilter]);

  const setTab = (tab: ListingTab) => {
    Router?.go?.(`/mushaira?tab=${tab}`);
  };

  const user = Auth?.getCurrentUser?.();

  return (
    <div className="mr-min-h-screen mr-bg-mr-bg mr-pb-24 mr-font-mr-sans mr-text-white">
      <header className="mr-flex mr-items-center mr-gap-3 mr-border-b mr-border-mr-gold/15 mr-bg-mr-bg/90 mr-px-4 mr-py-4 mr-backdrop-blur-xl">
        <span className="mr-flex mr-h-9 mr-w-9 mr-items-center mr-justify-center mr-rounded-full mr-bg-mr-gold-gradient mr-text-lg">
          🎙️
        </span>
        <div className="mr-min-w-0 mr-flex-1">
          <h1 className="mr-text-base mr-font-bold mr-text-white">Live Mushaira</h1>
        </div>
        <a href="#/dashboard">
          <Avatar name={user?.name || 'Guest'} avatarUrl={user?.avatar} size={36} />
        </a>
      </header>

      <div className="mr-px-4 mr-pt-4">
        <TabsNav active={query.tab} onChange={setTab} />
      </div>

      <div className="mr-px-4 mr-pt-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search poet, title, category…"
          className="mr-w-full mr-rounded-full mr-border mr-border-white/10 mr-bg-white/5 mr-px-4 mr-py-2.5 mr-text-sm mr-text-white mr-placeholder-mr-muted mr-outline-none focus:mr-border-mr-gold/50"
        />
      </div>

      <div className="mr-mt-4 mr-space-y-3 mr-px-4">
        {loading && <p className="mr-py-10 mr-text-center mr-text-sm mr-text-mr-muted">Loading events…</p>}

        {!loading && query.tab === 'live' && (
          <>
            {!live.length && <p className="mr-py-10 mr-text-center mr-text-sm mr-text-mr-muted">No live mushaira right now. Check Schedule for upcoming events.</p>}
            {live[0] && <LiveEventCard event={live[0]} featured />}
            {live.slice(1).map((e) => (
              <LiveEventCard key={e.id} event={e} />
            ))}
          </>
        )}

        {!loading && query.tab === 'schedule' && (
          <>
            <div className="mr-flex mr-gap-2 mr-overflow-x-auto mr-pb-1">
              {SCHEDULE_FILTERS.map((f) => (
                <a
                  key={f.id}
                  href={`#/mushaira?tab=schedule&filter=${f.id}`}
                  className={`mr-shrink-0 mr-rounded-full mr-px-3 mr-py-1.5 mr-text-xs mr-font-semibold ${
                    query.filter === f.id ? 'mr-bg-mr-gold-gradient mr-text-black' : 'mr-bg-white/5 mr-text-mr-muted'
                  }`}
                >
                  {f.label}
                </a>
              ))}
            </div>
            {!filteredScheduled.length && <p className="mr-py-10 mr-text-center mr-text-sm mr-text-mr-muted">No events for this period.</p>}
            {filteredScheduled.map((e) => (
              <ScheduledEventCard key={e.id} event={e} registered={registered} />
            ))}
          </>
        )}

        {!loading && query.tab === 'ended' && (
          <>
            <div className="mr-flex mr-gap-2 mr-overflow-x-auto mr-pb-1">
              {ENDED_FILTERS.map((f) => (
                <a
                  key={f.id}
                  href={`#/mushaira?tab=ended&efilter=${f.id}`}
                  className={`mr-shrink-0 mr-rounded-full mr-px-3 mr-py-1.5 mr-text-xs mr-font-semibold ${
                    query.efilter === f.id ? 'mr-bg-mr-gold-gradient mr-text-black' : 'mr-bg-white/5 mr-text-mr-muted'
                  }`}
                >
                  {f.label}
                </a>
              ))}
            </div>
            {!filteredEnded.length && <p className="mr-py-10 mr-text-center mr-text-sm mr-text-mr-muted">No past sessions yet.</p>}
            {filteredEnded.map((e) => (
              <EndedArchiveCard key={e.id} event={e} onListen={setReplayEvent} />
            ))}
          </>
        )}
      </div>

      <button
        onClick={() => Pages?.showCreateMushairaModal?.()}
        // The site's mobile bottom-nav is fixed, 60px tall, and z-index 100 —
        // bottom-6/z-30 sat low enough and behind it that the nav bar covered
        // the lower half of this button (including the + glyph). Clear it on
        // mobile; sm: restores the tighter corner position once the nav bar
        // is hidden (desktop/tablet).
        className="mr-fixed mr-bottom-[76px] mr-right-5 mr-z-[110] mr-flex mr-h-14 mr-w-14 mr-items-center mr-justify-center mr-rounded-full mr-bg-mr-gold-gradient mr-text-2xl mr-font-bold mr-text-black mr-shadow-mr-gold-glow-lg sm:mr-bottom-6 sm:mr-z-30"
        aria-label="Create Mushaira event"
      >
        +
      </button>

      <ReplayModal event={replayEvent} onClose={() => setReplayEvent(null)} />
    </div>
  );
}
