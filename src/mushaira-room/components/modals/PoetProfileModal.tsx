import { useEffect, useState } from 'react';
import type { Participant } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/AvatarStack';
import { GoldButton } from '../ui/GoldButton';
import { formatCount } from '../../lib/useMushairaEvents';

interface ResolvedProfile {
  name: string;
  bio?: string;
  avatar?: string;
  followers?: number | null;
  poemsCount?: number | null;
  socialLinks?: Record<string, string> | null;
}

async function resolveProfile(participant: Participant): Promise<ResolvedProfile> {
  if (SupabaseClient?.isEnabled?.()) {
    const profile = await API?.getProfile?.(participant.userId);
    if (profile) {
      return {
        name: profile.full_name || profile.username || participant.name,
        bio: profile.bio || '',
        avatar: profile.avatar_url || participant.avatar,
        followers: null, // no follower-count query wired up yet — show only when known
        poemsCount: null,
        socialLinks: profile.social_links || null // column doesn't exist yet on most projects — render hidden if absent
      };
    }
  }
  const demo = window.getPoetById?.(participant.userId);
  if (demo) {
    return { name: demo.name, bio: demo.bio, avatar: demo.avatar, followers: demo.followers, poemsCount: demo.posts, socialLinks: null };
  }
  return { name: participant.name, avatar: participant.avatar, followers: null, poemsCount: null, socialLinks: null };
}

export function PoetProfileModal({ participant, onClose }: { participant: Participant | null; onClose: () => void }) {
  const [profile, setProfile] = useState<ResolvedProfile | null>(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!participant) return;
    setProfile(null);
    resolveProfile(participant).then(setProfile);
    if (SupabaseClient?.isEnabled?.() && !Auth?.isGuest?.()) {
      API?.isFollowingUser?.(participant.userId).then((v: boolean) => setFollowing(!!v));
    } else {
      setFollowing(!!Storage?.isFollowing?.(participant.userId));
    }
  }, [participant?.userId]);

  if (!participant) return null;

  const toggleFollow = async () => {
    if (SupabaseClient?.isEnabled?.() && !Auth?.isGuest?.()) {
      const ok = following ? await API?.unfollowUser?.(participant.userId) : await API?.followUser?.(participant.userId);
      if (ok) setFollowing(!following);
      return;
    }
    const now = Storage?.toggleFollow?.(participant.userId);
    setFollowing(!!now);
  };

  const message = async () => {
    if (Auth?.isGuest?.()) {
      Components?.showToast?.('Please sign in to send messages', 'error');
      return;
    }
    const convId = await API?.getOrCreateConversation?.(participant.userId);
    onClose();
    Router?.go?.(convId ? `/messages/${convId}` : '/messages');
  };

  return (
    <Modal open={!!participant} onClose={onClose}>
      <div className="mr-flex mr-flex-col mr-items-center mr-text-center">
        <Avatar name={participant.name} avatarUrl={profile?.avatar || participant.avatar} size={88} ring="gold" />
        <h3 className="mr-mt-3 mr-text-lg mr-font-bold mr-text-white">{profile?.name || participant.name}</h3>
        {participant.isHost && <span className="mr-mt-1 mr-text-xs mr-font-semibold mr-text-mr-gold">Host</span>}

        {profile?.bio && <p className="mr-mt-3 mr-text-sm mr-text-mr-muted">{profile.bio}</p>}

        <div className="mr-mt-4 mr-flex mr-gap-6 mr-text-sm">
          {profile?.poemsCount != null && (
            <div>
              <p className="mr-font-bold mr-text-white">{formatCount(profile.poemsCount)}</p>
              <p className="mr-text-xs mr-text-mr-muted">Poems</p>
            </div>
          )}
          {profile?.followers != null && (
            <div>
              <p className="mr-font-bold mr-text-white">{formatCount(profile.followers)}</p>
              <p className="mr-text-xs mr-text-mr-muted">Followers</p>
            </div>
          )}
        </div>

        {profile?.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
          <div className="mr-mt-3 mr-flex mr-gap-3 mr-text-mr-gold">
            {Object.entries(profile.socialLinks).map(([key, url]) => (
              <a key={key} href={url} target="_blank" rel="noreferrer" className="mr-text-xs mr-underline">
                {key}
              </a>
            ))}
          </div>
        )}

        <div className="mr-mt-5 mr-flex mr-w-full mr-gap-2">
          <GoldButton variant={following ? 'outline' : 'gold'} className="mr-flex-1" onClick={toggleFollow}>
            {following ? 'Following' : 'Follow'}
          </GoldButton>
          <GoldButton variant="ghost" className="mr-flex-1" onClick={message}>
            Message
          </GoldButton>
        </div>
        <button
          onClick={() => {
            onClose();
            Router?.go?.(`/poet/${participant.userId}`);
          }}
          className="mr-mt-3 mr-text-xs mr-font-semibold mr-text-mr-gold-light"
        >
          View Poetry →
        </button>
      </div>
    </Modal>
  );
}
