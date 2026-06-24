import { motion } from 'framer-motion';

export function WaveformBars({ active = true, bars = 5, color = '#D4AF37' }: { active?: boolean; bars?: number; color?: string }) {
  return (
    <div className="mr-flex mr-items-center mr-gap-[2px]" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="mr-w-[3px] mr-rounded-full"
          style={{ backgroundColor: color, height: 6 }}
          animate={
            active
              ? { height: [6, 16, 4, 12, 6] }
              : { height: 4 }
          }
          transition={
            active
              ? { duration: 0.9 + i * 0.08, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  );
}

export function PulseRing({ active, children, color = 'gold' }: { active: boolean; children: React.ReactNode; color?: 'gold' | 'purple' }) {
  const ringColor = color === 'gold' ? 'mr-ring-mr-gold' : 'mr-ring-mr-purple';
  return (
    <div className={`mr-relative mr-inline-flex mr-rounded-full ${active ? `mr-ring-4 ${ringColor} mr-animate-mr-pulse-gold` : ''}`}>
      {children}
    </div>
  );
}
