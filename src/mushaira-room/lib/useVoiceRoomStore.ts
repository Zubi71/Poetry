import { useSyncExternalStore, useMemo } from 'react';
import type { RoomSnapshot } from './types';

const EMPTY_SNAPSHOT: RoomSnapshot = {
  participants: [],
  speakers: [],
  audience: [],
  nowSpeaking: null,
  chatMessages: [],
  handRequests: [],
  handRaised: false,
  commentsDisabled: false,
  micOn: false,
  mutedByHost: false,
  canSpeak: true,
  isSpeaking: false,
  mySlot: null,
  isHost: false,
  maxSlots: 20,
  paused: false,
  roomMeta: null
};

function subscribe(callback: () => void) {
  const live = VoiceRoomLive;
  if (!live?.subscribe) return () => {};
  return live.subscribe(callback);
}

function getSnapshot(): RoomSnapshot {
  return VoiceRoomLive?.getSnapshot?.() || EMPTY_SNAPSHOT;
}

/** Reads the VoiceRoomLive singleton (LiveKit + Supabase realtime state)
 *  as React state, via the pub/sub bridge added in js/voice-room.js. */
export function useVoiceRoomStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  const actions = useMemo(() => {
    const live = VoiceRoomLive;
    return {
      toggleMic: () => live?.toggleMic?.(),
      checkIn: () => live?.checkIn?.(),
      leaveSeat: () => live?.leaveSeat?.(),
      pickSeat: (slot: number) => live?.pickSeat?.(slot),
      raiseHand: () => live?.raiseHand?.(),
      sendReaction: (emoji: string) => live?.sendReaction?.(emoji),
      sendChat: (text: string) => live?.sendChat?.(text),
      pinChatMessage: (dbId: string | number, pinned: boolean) => live?.pinChatMessage?.(dbId, pinned),
      deleteChatMessage: (dbId: string | number) => live?.deleteChatMessage?.(dbId),
      hostAction: (action: string, targetUserId: string) => live?.hostAction?.(action, targetUserId),
      approveHandRequest: (requestId: string | number, userId: string) => live?.approveHandRequest?.(requestId, userId),
      denyHandRequest: (requestId: string | number, userId: string) => live?.denyHandRequest?.(requestId, userId),
      sendDonation: (amount: number, giftType: string) => live?.sendDonation?.(amount, giftType),
      shareRoom: () => live?.shareRoom?.(),
      confirmEndEvent: () => live?.confirmEndEvent?.(),
      togglePause: () => live?.togglePause?.(),
      toggleComments: () => live?.toggleComments?.(),
      startLiveSession: () => live?.startLiveSession?.(),
      leaveRoom: () => live?.leaveRoom?.()
    };
  }, []);

  return { ...snapshot, actions };
}
