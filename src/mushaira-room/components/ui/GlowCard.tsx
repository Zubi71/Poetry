import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function GlowCard({
  children,
  className = '',
  glow = 'gold',
  as: Tag = 'div'
}: {
  children: ReactNode;
  className?: string;
  glow?: 'gold' | 'purple' | 'none';
  as?: any;
}) {
  const glowClass =
    glow === 'gold' ? 'hover:mr-shadow-mr-gold-glow' : glow === 'purple' ? 'hover:mr-shadow-mr-purple-glow' : '';
  return (
    <Tag
      className={`mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary/80 mr-backdrop-blur-xl mr-transition-shadow mr-duration-300 ${glowClass} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function MotionGlowCard({
  children,
  className = '',
  delay = 0
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`mr-rounded-2xl mr-border mr-border-white/10 mr-bg-mr-bg-secondary/80 mr-backdrop-blur-xl ${className}`}
    >
      {children}
    </motion.div>
  );
}
