import { motion } from 'framer-motion';
import type { RoomMeta } from '../../lib/types';

export function HeroBanner({ meta }: { meta: RoomMeta | null }) {
  const tags = meta?.tags?.length ? meta.tags : ['غزل', 'شاعری', 'اردو ادب', 'لائیو مشاعرہ'];

  return (
    <section className="mr-relative mr-mx-4 mr-mt-4 mr-overflow-hidden mr-rounded-3xl mr-border mr-border-mr-gold/20 mr-bg-gradient-to-br mr-from-mr-bg-secondary mr-via-mr-bg-secondary mr-to-mr-purple/20 mr-p-6">
      {/* ambient floating particles */}
      <div className="mr-pointer-events-none mr-absolute mr-inset-0 mr-overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="mr-absolute mr-h-1 mr-w-1 mr-rounded-full mr-bg-mr-gold/60"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -16, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
        <motion.div
          className="mr-absolute -mr-right-10 -mr-top-10 mr-h-48 mr-w-48 mr-rounded-full mr-bg-mr-gold/10 mr-blur-3xl"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>

      <div className="mr-relative mr-z-10 mr-flex mr-flex-col-reverse mr-items-center mr-gap-6 sm:mr-flex-row sm:mr-justify-between">
        <div className="mr-min-w-0 mr-flex-1 mr-text-center sm:mr-text-right" dir="rtl">
          <h1 className="mr-font-mr-urdu mr-text-2xl mr-font-bold mr-leading-relaxed mr-text-white sm:mr-text-3xl">
            {meta?.title || 'عشق، زندگی اور احساس'}
          </h1>
          <p className="mr-mt-1 mr-font-mr-urdu mr-text-base mr-text-mr-muted">
            لفظوں کی محفل، دلوں کا سنگم
          </p>
          {/* dir="rtl" on the ancestor flips flex `justify-end` to the visual
              left, so `justify-start` is what actually lands on the right here */}
          <div className="mr-mt-3 mr-flex mr-flex-wrap mr-justify-center mr-gap-2 sm:mr-justify-start">
            {tags.map((tag) => (
              <span
                key={tag}
                className="mr-rounded-full mr-border mr-border-mr-gold/30 mr-bg-mr-gold/10 mr-px-3 mr-py-1 mr-font-mr-urdu mr-text-xs mr-text-mr-gold-light"
              >
                {tag}
              </span>
            ))}
          </div>
          {meta?.host && (
            <p className="mr-mt-3 mr-text-sm mr-text-mr-muted" dir="ltr">
              Hosted by <strong className="mr-text-white">{meta.host}</strong>
              {meta.date ? ` · ${meta.date}` : ''}
              {meta.time ? ` · ${meta.time}` : ''}
            </p>
          )}
        </div>

        <motion.div
          className="mr-relative mr-shrink-0"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="mr-absolute mr-inset-0 mr-rounded-full mr-bg-mr-gold/30 mr-blur-2xl" />
          <div className="mr-relative mr-flex mr-h-28 mr-w-28 mr-items-center mr-justify-center mr-rounded-full mr-border-2 mr-border-mr-gold mr-bg-mr-gold-gradient mr-text-5xl mr-shadow-mr-gold-glow-lg sm:mr-h-32 sm:mr-w-32">
            🎙️
          </div>
        </motion.div>
      </div>
    </section>
  );
}
