import { useEffect, useState, useCallback } from 'react';
import type { MushairaEvent } from './types';

/** Mirrors the filtering in js/mushaira-events.js (renderLists/_filterScheduleByDate/
 *  _filterEndedEvents) so the React listing matches the existing vanilla behavior
 *  exactly, just reskinned. Reuses the same data sources (getAllMushairaEvents,
 *  API.searchMushairaEvents, MushairaEvents.load) rather than re-fetching. */
export function useMushairaEvents(searchQuery: string) {
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let mounted = true;
    let pollTimer: number | undefined;
    (async () => {
      const events = MushairaEvents;
      await events?.load?.();
      if (SupabaseClient?.isEnabled?.()) await API?.processDueReminders?.();
      await events?._loadSessionCaches?.(window.getAllMushairaEvents?.() || []);
      events?.subscribe?.(); // wires Supabase realtime + its own background poll into window.REMOTE_MUSHAIRA_EVENTS
      if (!mounted) return;
      setLoading(false);
      refresh();
      // Realtime/poll mutate the global event list asynchronously outside React —
      // a light local tick re-derives filtered lists from that shared state.
      pollTimer = window.setInterval(refresh, 4000);
    })();
    return () => {
      mounted = false;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [refresh]);

  let allEvents: MushairaEvent[] = window.getAllMushairaEvents?.() || [];
  if (searchQuery && API?.searchMushairaEvents) {
    allEvents = API.searchMushairaEvents(allEvents, searchQuery);
  }

  const live = allEvents.filter((e) => e.live || e.paused);
  const ended = allEvents.filter((e) => e.ended);
  const scheduled = allEvents.filter((e) => !e.live && !e.ended && !e.paused);

  return { loading, allEvents, live, scheduled, ended, refresh };
}

export function filterScheduleByDate(events: MushairaEvent[], filter: string) {
  if (filter === 'all') return events;
  const today = new Date().toDateString();
  const tomorrow = new Date(Date.now() + 86400000).toDateString();
  const weekEnd = Date.now() + 7 * 86400000;
  return events.filter((event) => {
    const d = event.date ? new Date(event.date) : null;
    if (!d || isNaN(d.getTime())) return filter === 'all';
    const ds = d.toDateString();
    if (filter === 'today') return ds === today;
    if (filter === 'tomorrow') return ds === tomorrow;
    if (filter === 'week') return d.getTime() <= weekEnd;
    return true;
  });
}

export function filterEndedEvents(events: MushairaEvent[], filter: string) {
  let list = [...events];
  const now = Date.now();
  if (filter === 'views') {
    list.sort((a, b) => (b.views || b.registered || 0) - (a.views || a.registered || 0));
  } else if (filter === 'poetry' || filter === 'shayari') {
    list = list.filter((e) => (e.tags || []).some((t) => t.toLowerCase().includes(filter)));
  } else if (filter === 'week') {
    const weekAgo = now - 7 * 86400000;
    list = list.filter((e) => (e.date ? new Date(e.date).getTime() : 0) >= weekAgo);
  } else if (filter === 'month') {
    const monthAgo = now - 30 * 86400000;
    list = list.filter((e) => (e.date ? new Date(e.date).getTime() : 0) >= monthAgo);
  }
  return list;
}

export function joinLive(eventId: number) {
  Storage?.registerEvent?.(eventId);
  Router?.go?.(`/mushaira/live/${eventId}`);
}

export async function setReminder(event: MushairaEvent) {
  Storage?.registerEvent?.(event.id);
  if (SupabaseClient?.isEnabled?.()) {
    await API?.setSessionReminders?.(event.id, event.date, event.time);
  }
  Components?.showToast?.("Reminder set — we'll notify you 1 hour and 15 minutes before start");
}

export function viewSessionDetails(eventId: number) {
  Router?.go?.(`/mushaira/session/${eventId}`);
}

export function formatCount(n: number) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
