import { motion } from 'framer-motion';
import type { Participant } from '../../lib/types';
import { Avatar } from '../ui/AvatarStack';
import { Badge } from '../ui/Badge';
import { WaveformBars } from '../ui/WaveformBars';

export function SpeakerTile({
  participant,
  isMe,
  onClick,
  onToggleMic
}: {
  participant: Participant;
  isMe: boolean;
  onClick: () => void;
  onToggleMic: () => void;
}) {
  const audible = !!(participant.micOn && !participant.mutedByHost && participant.canSpeak !== false);
  const speaking = !!(participant.isSpeaking && audible);
  const borderClass = participant.isHost ? 'mr-border-mr-gold' : 'mr-border-mr-purple';

  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ y: -3 }}
      className={`mr-group mr-relative mr-flex mr-flex-col mr-items-center mr-gap-2 mr-rounded-2xl mr-border mr-bg-mr-bg-secondary/70 mr-p-3 mr-backdrop-blur mr-transition-shadow ${borderClass} ${
        speaking ? 'mr-shadow-mr-gold-glow mr-animate-mr-pulse-gold' : 'hover:mr-shadow-mr-purple-glow'
      }`}
    >
      <span className="mr-relative">
        <Avatar name={participant.name} avatarUrl={participant.avatar} size={56} ring={participant.isHost ? 'gold' : 'purple'} />
        {isMe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMic();
            }}
            className="mr-absolute -mr-bottom-1 -mr-right-1 mr-flex mr-h-6 mr-w-6 mr-items-center mr-justify-center mr-rounded-full mr-bg-mr-bg mr-text-xs mr-ring-2 mr-ring-mr-bg-secondary"
            aria-label={audible ? 'Mute' : 'Unmute'}
          >
            {audible ? '🎙️' : '🔇'}
          </button>
        )}
      </span>
      <span className="mr-truncate mr-text-xs mr-font-semibold mr-text-white">{isMe ? 'You' : participant.name?.split(' ')[0]}</span>
      <Badge tone={participant.isHost ? 'gold' : 'purple'}>{participant.isHost ? 'Host' : 'Speaker'}</Badge>
      {speaking && (
        <span className="mr-absolute mr-bottom-1 mr-right-1">
          <WaveformBars active bars={3} />
        </span>
      )}
    </motion.button>
  );
}
