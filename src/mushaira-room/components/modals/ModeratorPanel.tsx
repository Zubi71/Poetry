import type { HandRequest, Participant } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/AvatarStack';
import { GoldButton } from '../ui/GoldButton';

export function ModeratorPanel({
  open,
  onClose,
  participants,
  handRequests,
  commentsDisabled,
  onHostAction,
  onApproveHand,
  onDenyHand,
  onToggleComments,
  onConfirmEndEvent
}: {
  open: boolean;
  onClose: () => void;
  participants: Participant[];
  handRequests: HandRequest[];
  commentsDisabled: boolean;
  onHostAction: (action: string, userId: string) => void;
  onApproveHand: (requestId: string | number, userId: string) => void;
  onDenyHand: (requestId: string | number, userId: string) => void;
  onToggleComments: () => void;
  onConfirmEndEvent: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Moderator Controls">
      {handRequests.length > 0 && (
        <div className="mr-mb-4">
          <p className="mr-mb-2 mr-text-xs mr-font-semibold mr-uppercase mr-text-mr-muted">Hand Raise Requests</p>
          <div className="mr-space-y-2">
            {handRequests.map((r) => (
              <div key={r.id} className="mr-flex mr-items-center mr-justify-between mr-rounded-xl mr-bg-white/5 mr-px-3 mr-py-2">
                <span className="mr-text-sm mr-text-white">{r.display_name}</span>
                <div className="mr-flex mr-gap-2">
                  <button onClick={() => onApproveHand(r.id, r.user_id)} className="mr-rounded-full mr-bg-mr-gold-gradient mr-px-3 mr-py-1 mr-text-xs mr-font-semibold mr-text-black">
                    Approve
                  </button>
                  <button onClick={() => onDenyHand(r.id, r.user_id)} className="mr-rounded-full mr-bg-white/10 mr-px-3 mr-py-1 mr-text-xs mr-text-white">
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mr-mb-2 mr-text-xs mr-font-semibold mr-uppercase mr-text-mr-muted">Speakers &amp; Listeners</p>
      <div className="mr-mb-4 mr-max-h-56 mr-space-y-2 mr-overflow-y-auto">
        {participants.map((p) => (
          <div key={p.userId} className="mr-flex mr-items-center mr-gap-2 mr-rounded-xl mr-bg-white/5 mr-px-3 mr-py-2">
            <Avatar name={p.name} avatarUrl={p.avatar} size={32} />
            <span className="mr-flex-1 mr-truncate mr-text-sm mr-text-white">{p.name}</span>
            {!p.isHost && (
              <div className="mr-flex mr-gap-1">
                <button
                  onClick={() => onHostAction(p.micOn ? 'mute' : 'unmute', p.userId)}
                  className="mr-rounded-full mr-bg-white/10 mr-px-2.5 mr-py-1 mr-text-[11px] mr-text-white"
                >
                  {p.micOn ? 'Mute' : 'Unmute'}
                </button>
                {!p.slot && (
                  <button
                    onClick={() => onHostAction('seat_speaker', p.userId)}
                    className="mr-rounded-full mr-bg-mr-purple/40 mr-px-2.5 mr-py-1 mr-text-[11px] mr-text-white"
                  >
                    Add to Stage
                  </button>
                )}
                {p.slot && (
                  <button
                    onClick={() => onHostAction('demote', p.userId)}
                    className="mr-rounded-full mr-bg-white/10 mr-px-2.5 mr-py-1 mr-text-[11px] mr-text-white"
                  >
                    Move to Audience
                  </button>
                )}
                <button
                  onClick={() => onHostAction('remove', p.userId)}
                  className="mr-rounded-full mr-bg-red-500/20 mr-px-2.5 mr-py-1 mr-text-[11px] mr-text-red-300"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mr-mb-4 mr-flex mr-items-center mr-justify-between mr-rounded-xl mr-bg-white/5 mr-px-3 mr-py-2.5">
        <div>
          <p className="mr-text-sm mr-text-white">Disable Comments</p>
          <p className="mr-text-[11px] mr-text-mr-muted">Hides the comment box for everyone except you</p>
        </div>
        <button
          onClick={onToggleComments}
          className={`mr-h-6 mr-w-11 mr-rounded-full mr-transition-colors ${commentsDisabled ? 'mr-bg-mr-gold' : 'mr-bg-white/15'}`}
        >
          <span
            className={`mr-block mr-h-5 mr-w-5 mr-rounded-full mr-bg-white mr-transition-transform ${commentsDisabled ? 'mr-translate-x-5' : 'mr-translate-x-0.5'}`}
          />
        </button>
      </div>

      <GoldButton variant="ghost" className="mr-w-full mr-border mr-border-red-500/30 mr-text-red-400" onClick={onConfirmEndEvent}>
        End Room
      </GoldButton>
    </Modal>
  );
}
