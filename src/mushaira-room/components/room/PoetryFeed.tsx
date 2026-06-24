import { useState } from 'react';
import { motion } from 'framer-motion';

interface PoetryPost {
  id: number;
  author: string;
  type: 'sher' | 'ghazal' | 'nazm';
  text: string;
  likes: number;
  liked: boolean;
  saved: boolean;
}

// STUB: no backend table exists yet for in-session poetry posts (session_comments
// is free-text chat, not poems — see plan's data-gap notes). This feed is local
// component state only, seeded with sample shers, until persistence ships.
const SEED: PoetryPost[] = [
  { id: 1, author: 'Mirza Ghalib', type: 'sher', text: 'دل ہی تو ہے نہ سنگ و خشت\nدرد سے بھر نہ آئے کیوں', likes: 214, liked: false, saved: false },
  { id: 2, author: 'Faiz Ahmed Faiz', type: 'ghazal', text: 'ہم دیکھیں گے\nلازم ہے کہ ہم بھی دیکھیں گے', likes: 189, liked: false, saved: false }
];

const TYPE_LABEL: Record<PoetryPost['type'], string> = { sher: 'شعر', ghazal: 'غزل', nazm: 'نظم' };

export function PoetryFeed({ canPost, authorName }: { canPost: boolean; authorName: string }) {
  const [posts, setPosts] = useState<PoetryPost[]>(SEED);
  const [draft, setDraft] = useState('');

  const toggleLike = (id: number) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)));
  const toggleSave = (id: number) => setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));

  const share = async (text: string) => {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        Components?.showToast?.('Copied to clipboard');
      }
    } catch {
      /* user cancelled share sheet */
    }
  };

  const post = () => {
    if (!draft.trim()) return;
    setPosts((prev) => [{ id: Date.now(), author: authorName, type: 'sher', text: draft.trim(), likes: 0, liked: false, saved: false }, ...prev]);
    setDraft('');
  };

  return (
    <section className="mr-mx-4 mr-mt-6">
      <h2 className="mr-mb-3 mr-text-sm mr-font-bold mr-text-white">📜 Poetry Shared</h2>

      {canPost && (
        <div className="mr-mb-3 mr-flex mr-gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share a sher, ghazal or nazm…"
            dir="rtl"
            rows={2}
            className="mr-flex-1 mr-rounded-xl mr-border mr-border-white/10 mr-bg-white/5 mr-px-3 mr-py-2 mr-font-mr-urdu mr-text-sm mr-text-white mr-placeholder-mr-muted mr-outline-none focus:mr-border-mr-gold/50"
          />
          <button onClick={post} className="mr-rounded-xl mr-bg-mr-gold-gradient mr-px-4 mr-text-sm mr-font-semibold mr-text-black">
            Post
          </button>
        </div>
      )}

      <div className="mr-space-y-3">
        {posts.map((post) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mr-rounded-2xl mr-border mr-border-mr-gold/15 mr-bg-mr-bg-secondary/70 mr-p-4"
          >
            <div className="mr-mb-2 mr-flex mr-items-center mr-justify-between">
              <span className="mr-rounded-full mr-bg-mr-gold/10 mr-px-2.5 mr-py-0.5 mr-text-xs mr-font-mr-urdu mr-text-mr-gold-light">
                {TYPE_LABEL[post.type]}
              </span>
              <span className="mr-text-xs mr-text-mr-muted">{post.author}</span>
            </div>
            <p className="mr-relative mr-px-2 mr-text-center mr-font-mr-urdu mr-text-lg mr-leading-relaxed mr-text-white" dir="rtl">
              <span className="mr-mr-1 mr-text-mr-gold">“</span>
              {post.text}
              <span className="mr-ml-1 mr-text-mr-gold">”</span>
            </p>
            <div className="mr-mt-3 mr-flex mr-items-center mr-justify-center mr-gap-6 mr-text-sm">
              <button onClick={() => toggleLike(post.id)} className={post.liked ? 'mr-text-red-400' : 'mr-text-mr-muted'}>
                ❤️ {post.likes}
              </button>
              <button onClick={() => toggleSave(post.id)} className={post.saved ? 'mr-text-mr-gold' : 'mr-text-mr-muted'}>
                🔖 Save
              </button>
              <button onClick={() => share(post.text)} className="mr-text-mr-muted">
                📤 Share
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
