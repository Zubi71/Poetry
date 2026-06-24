import { useState } from 'react';
import type { RoomMeta } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { GoldButton } from '../ui/GoldButton';

const RULES = [
  'Be respectful to all poets and listeners.',
  'No spam, hate speech, or harassment.',
  'Raise your hand before speaking — wait for host approval.',
  'Share only your own poetry or properly credited verses.'
];

export function InfoModal({
  panel,
  meta,
  onClose
}: {
  panel: 'info' | 'rules' | 'report' | null;
  meta: RoomMeta | null;
  onClose: () => void;
}) {
  const [reported, setReported] = useState(false);

  return (
    <Modal
      open={!!panel}
      onClose={onClose}
      title={panel === 'rules' ? 'Room Rules' : panel === 'report' ? 'Report Room' : 'Room Info'}
    >
      {panel === 'info' && (
        <div className="mr-space-y-2 mr-text-sm mr-text-mr-muted">
          <p>
            <strong className="mr-text-white">{meta?.title}</strong>
          </p>
          <p>Hosted by {meta?.host}</p>
          {meta?.date && <p>{meta.date} {meta.time}</p>}
          <p className="mr-flex mr-flex-wrap mr-gap-1.5">
            {(meta?.tags || []).map((t) => (
              <span key={t} className="mr-rounded-full mr-bg-white/10 mr-px-2 mr-py-0.5 mr-text-xs">
                {t}
              </span>
            ))}
          </p>
        </div>
      )}

      {panel === 'rules' && (
        <ul className="mr-list-disc mr-space-y-2 mr-pl-5 mr-text-sm mr-text-mr-muted">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {panel === 'report' && !reported && (
        <div>
          <p className="mr-mb-3 mr-text-sm mr-text-mr-muted">
            Let us know if this room violates our community guidelines. Our team will review it shortly.
          </p>
          <GoldButton
            variant="gold"
            className="mr-w-full"
            onClick={() => {
              setReported(true);
              Components?.showToast?.('Report submitted — thank you');
            }}
          >
            Submit Report
          </GoldButton>
        </div>
      )}
      {panel === 'report' && reported && <p className="mr-text-sm mr-text-mr-gold-light">Thanks — our team has been notified.</p>}
    </Modal>
  );
}
