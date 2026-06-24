import type { Participant } from '../../lib/types';
import { SpeakerTile } from './SpeakerTile';

export function SpeakersStage({
  speakers,
  myUserId,
  maxSlots,
  onSelectSeat,
  onToggleMic,
  onOpenProfile
}: {
  speakers: Participant[];
  myUserId?: string;
  maxSlots: number;
  onSelectSeat: (slot: number) => void;
  onToggleMic: () => void;
  onOpenProfile: (p: Participant) => void;
}) {
  const seatedSlots = new Set(speakers.map((s) => s.slot));
  const emptySeatsToShow = Math.min(4, Math.max(0, maxSlots - speakers.length));

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
        {Array.from({ length: emptySeatsToShow }).map((_, i) => {
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
    </section>
  );
}
