import { useState } from 'react';
import type { Participant } from '../../lib/types';
import { SpeakerTile } from './SpeakerTile';

const INITIAL_VISIBLE_SEATS = 5;
const SEATS_PER_EXPAND = 5;

export function SpeakersStage({
  speakers,
  myUserId,
  maxSlots,
  isHost,
  onSelectSeat,
  onToggleMic,
  onOpenProfile
}: {
  speakers: Participant[];
  myUserId?: string;
  maxSlots: number;
  isHost: boolean;
  onSelectSeat: (slot: number) => void;
  onToggleMic: () => void;
  onOpenProfile: (p: Participant) => void;
}) {
  const [visibleSlots, setVisibleSlots] = useState(INITIAL_VISIBLE_SEATS);

  const seatedSlots = new Set(speakers.map((s) => s.slot));
  // Occupied seats are always shown even if they push past the current
  // reveal threshold (e.g. the host assigned a seat beyond what's expanded).
  const shownSlots = Math.min(maxSlots, Math.max(visibleSlots, speakers.length));
  const emptySeatsToShow = Math.max(0, shownSlots - speakers.length);
  const hasMoreSeats = shownSlots < maxSlots;

  return (
    <section className="mr-mx-4 mr-mt-6">
      <h2 className="mr-mb-3 mr-text-sm mr-font-bold mr-text-white">🎙️ اسٹیج پر شعراء</h2>
      <div className="mr-grid mr-grid-cols-3 mr-gap-3 sm:mr-grid-cols-4 md:mr-grid-cols-5 lg:mr-grid-cols-6">
        {speakers.map((p) => (
          <SpeakerTile
            key={p.userId}
            participant={p}
            isMe={p.userId === myUserId}
            onClick={() => onOpenProfile(p)}
            onToggleMic={onToggleMic}
          />
        ))}
        {Array.from({ length: emptySeatsToShow }).map(() => {
          let slot = 1;
          while (seatedSlots.has(slot)) slot++;
          seatedSlots.add(slot);
          const seatSlot = slot;
          return (
            <button
              key={`empty-${seatSlot}`}
              onClick={() => onSelectSeat(seatSlot)}
              className="mr-flex mr-flex-col mr-items-center mr-justify-center mr-gap-2 mr-rounded-2xl mr-border mr-border-dashed mr-border-white/15 mr-p-3 mr-text-mr-muted hover:mr-border-mr-gold/40 hover:mr-text-mr-gold"
            >
              <span className="mr-flex mr-h-14 mr-w-14 mr-items-center mr-justify-center mr-rounded-full mr-border mr-border-dashed mr-border-current mr-text-xl">
                +
              </span>
              <span className="mr-text-xs">Seat {seatSlot}</span>
            </button>
          );
        })}
      </div>

      {hasMoreSeats && isHost && (
        <button
          onClick={() => setVisibleSlots((v) => Math.min(maxSlots, v + SEATS_PER_EXPAND))}
          className="mr-mt-3 mr-w-full mr-rounded-xl mr-border mr-border-dashed mr-border-white/15 mr-py-2 mr-text-xs mr-font-semibold mr-text-mr-muted hover:mr-border-mr-gold/40 hover:mr-text-mr-gold"
        >
          + More Seats ({shownSlots}/{maxSlots})
        </button>
      )}
    </section>
  );
}
