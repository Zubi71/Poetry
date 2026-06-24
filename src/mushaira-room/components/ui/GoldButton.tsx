import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'gold' | 'purple' | 'ghost' | 'outline';

const VARIANT_CLASS: Record<Variant, string> = {
  gold: 'mr-bg-mr-gold-gradient mr-text-black mr-shadow-mr-gold-glow',
  purple: 'mr-bg-mr-purple-gradient mr-text-white mr-shadow-mr-purple-glow',
  ghost: 'mr-bg-white/5 mr-text-white hover:mr-bg-white/10',
  outline: 'mr-border mr-border-mr-gold mr-text-mr-gold hover:mr-bg-mr-gold/10'
};

export function GoldButton({
  variant = 'gold',
  className = '',
  children,
  ...props
}: { variant?: Variant; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={`mr-inline-flex mr-items-center mr-justify-center mr-gap-1.5 mr-rounded-full mr-px-4 mr-py-2 mr-text-sm mr-font-semibold mr-transition-colors disabled:mr-cursor-not-allowed disabled:mr-opacity-40 ${VARIANT_CLASS[variant]} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}
