export interface Participant {
  userId: string;
  name: string;
  avatar?: string;
  slot?: number | null;
  micOn?: boolean;
  mutedByHost?: boolean;
  canSpeak?: boolean;
  isSpeaking?: boolean;
  isHost?: boolean;
  checkedIn?: boolean;
}

export interface ChatMessage {
  id: string | number;
  dbId?: string | number;
  from: string;
  text: string;
  time?: string;
  type?: 'user' | 'host' | 'system';
  userId?: string;
  pinned?: boolean;
}

export interface HandRequest {
  id: string | number;
  user_id: string;
  display_name: string;
}

export interface RoomMeta {
  roomKey: string;
  roomId: string | number;
  title: string;
  host: string;
  hostOwnerId?: string | null;
  eventId?: number;
  roomType?: 'mushaira' | 'voice-room';
  sessionStatus?: 'waiting' | 'scheduled' | 'live' | 'paused' | 'ended';
  maxSeats?: number;
  backPath?: string;
  leavePath?: string;
  tags?: string[];
  date?: string;
  time?: string;
}

export interface RoomSnapshot {
  participants: Participant[];
  speakers: Participant[];
  audience: Participant[];
  nowSpeaking: Participant | null;
  chatMessages: ChatMessage[];
  handRequests: HandRequest[];
  micOn: boolean;
  mutedByHost: boolean;
  canSpeak: boolean;
  isSpeaking: boolean;
  mySlot: number | null;
  isHost: boolean;
  maxSlots: number;
  paused: boolean;
  roomMeta: RoomMeta | null;
}

export interface MushairaEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  location?: string;
  live?: boolean;
  paused?: boolean;
  waiting?: boolean;
  ended?: boolean;
  registered?: number;
  watching?: number;
  views?: number;
  likes?: number;
  like_count?: number;
  duration_minutes?: number;
  host: string;
  hostOwnerId?: string;
  tags?: string[];
  description?: string;
  replay_url?: string;
}

export type ListingTab = 'live' | 'schedule' | 'ended';
