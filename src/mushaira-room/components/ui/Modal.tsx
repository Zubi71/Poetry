import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="mr-fixed mr-inset-0 mr-z-[100] mr-flex mr-items-end mr-justify-center mr-bg-black/70 mr-backdrop-blur-sm sm:mr-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="mr-relative mr-max-h-[88vh] mr-w-full mr-max-w-lg mr-overflow-y-auto mr-rounded-t-3xl mr-border mr-border-mr-gold/20 mr-bg-mr-bg-secondary mr-p-5 mr-shadow-mr-gold-glow-lg sm:mr-rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mr-mb-4 mr-flex mr-items-center mr-justify-between">
              {title && <h2 className="mr-font-mr-sans mr-text-lg mr-font-bold mr-text-white">{title}</h2>}
              <button
                onClick={onClose}
                className="mr-ml-auto mr-flex mr-h-8 mr-w-8 mr-items-center mr-justify-center mr-rounded-full mr-bg-white/5 mr-text-mr-muted hover:mr-bg-white/10"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {children}
            {footer && <div className="mr-mt-5 mr-flex mr-justify-end mr-gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
