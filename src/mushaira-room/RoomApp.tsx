import { useEffect, useState } from 'react';
import type { Participant, RoomMeta } from './lib/types';
import { useVoiceRoomStore } from './lib/useVoiceRoomStore';
import { StickyHeader } from './components/room/StickyHeader';
import { HeroBanner } from './components/room/HeroBanner';
import { SpeakersStage } from './components/room/SpeakersStage';
import { AudienceSection } from './components/room/AudienceSection';
import { LiveComments } from './components/room/LiveComments';
import { FloatingComments } from './components/room/FloatingComments';
import { BottomDock } from './components/room/BottomDock';
import { PoetProfileModal } from './components/modals/PoetProfileModal';
import { ModeratorPanel } from './components/modals/ModeratorPanel';
import { InfoModal } from './components/modals/InfoModal';

export function RoomApp({ meta }: { meta: RoomMeta }) {
  useEffect(() => {
    VoiceRoomLive?.init?.(meta);
    return () => {
      // Bridge unmount already calls VoiceRoomLive.destroy() via router.js;
      // nothing additional to tear down here.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.roomKey]);

  const store = useVoiceRoomStore();
  const [profileTarget, setProfileTarget] = useState<Participant | null>(null);
  const [modPanelOpen, setModPanelOpen] = useState(false);
  const [infoPanel, setInfoPanel] = useState<'info' | 'rules' | 'report' | null>(null);

  const myUserId = Auth?.getCurrentUser?.()?.id;
  const roomMeta = store.roomMeta || meta;

  return (
    <div className="mr-relative mr-min-h-screen mr-bg-mr-bg mr-pb-28 mr-font-mr-sans mr-text-white">
      <StickyHeader
        meta={roomMeta}
        listenerCount={store.participants.length}
        paused={store.paused}
        onShare={() => store.actions.shareRoom()}
        onLeave={() => {
          store.actions.leaveRoom();
          Router?.go?.(roomMeta?.leavePath || '/mushaira');
        }}
        onOpenInfo={setInfoPanel}
      />

      <HeroBanner meta={roomMeta} speaker={store.nowSpeaking} onOpenProfile={setProfileTarget} />

      <SpeakersStage
        speakers={store.speakers}
        myUserId={myUserId}
        maxSlots={store.maxSlots}
        isHost={store.isHost}
        onSelectSeat={(slot) => store.actions.pickSeat(slot)}
        onToggleMic={() => store.actions.toggleMic()}
        onOpenProfile={setProfileTarget}
      />

      <AudienceSection audience={store.audience} />

      <LiveComments
        messages={store.chatMessages}
        isHost={store.isHost}
        myUserId={myUserId}
        commentsDisabled={store.commentsDisabled}
        onSend={(text) => store.actions.sendChat(text)}
        onPin={(id, pinned) => store.actions.pinChatMessage(id, pinned)}
        onDelete={(id) => store.actions.deleteChatMessage(id)}
      />

      {store.isHost && (
        <div className="mr-mx-4 mr-mt-6">
          <button
            onClick={() => setModPanelOpen(true)}
            className="mr-w-full mr-rounded-2xl mr-border mr-border-mr-gold/30 mr-bg-mr-gold/10 mr-px-4 mr-py-3 mr-text-sm mr-font-semibold mr-text-mr-gold-light"
          >
            ⚙️ Moderator Controls
          </button>
        </div>
      )}

      <BottomDock
        micOn={store.micOn}
        mutedByHost={store.mutedByHost}
        canSpeak={store.canSpeak}
        hasSeat={!!store.mySlot}
        isHost={store.isHost}
        handRaised={store.handRaised}
        paused={store.paused}
        commentCount={store.chatMessages.length}
        onSendComment={(text) => store.actions.sendChat(text)}
        onToggleMic={() => store.actions.toggleMic()}
        onRaiseHand={() => store.actions.raiseHand()}
        onCheckIn={() => store.actions.checkIn()}
        onReaction={(emoji) => store.actions.sendReaction(emoji)}
        onShare={() => store.actions.shareRoom()}
        onDonate={() => VoiceRoomLive?._showDonationModal?.()}
        onLeaveSeat={() => store.actions.leaveSeat()}
        onExit={() => {
          store.actions.leaveRoom();
          Router?.go?.(roomMeta?.leavePath || '/mushaira');
        }}
        onOpenInfo={setInfoPanel}
        onTogglePause={() => store.actions.togglePause()}
        onEndEvent={() => store.actions.confirmEndEvent()}
      />

      <PoetProfileModal participant={profileTarget} onClose={() => setProfileTarget(null)} />

      <ModeratorPanel
        open={modPanelOpen}
        onClose={() => setModPanelOpen(false)}
        participants={store.participants}
        handRequests={store.handRequests}
        commentsDisabled={store.commentsDisabled}
        onHostAction={(action, userId) => store.actions.hostAction(action, userId)}
        onApproveHand={(id, userId) => store.actions.approveHandRequest(id, userId)}
        onDenyHand={(id, userId) => store.actions.denyHandRequest(id, userId)}
        onToggleComments={() => store.actions.toggleComments()}
        onConfirmEndEvent={() => store.actions.confirmEndEvent()}
      />

      <InfoModal panel={infoPanel} meta={roomMeta} onClose={() => setInfoPanel(null)} />

      <FloatingComments messages={store.chatMessages} />
    </div>
  );
}
