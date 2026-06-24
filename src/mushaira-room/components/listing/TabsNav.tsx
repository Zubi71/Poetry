import { motion } from 'framer-motion';
import type { ListingTab } from '../../lib/types';

const TABS: { id: ListingTab; label: string }[] = [
  { id: 'live', label: 'Live Now' },
  { id: 'schedule', label: 'Scheduled' },
  { id: 'ended', label: 'Ended' }
];

export function TabsNav({ active, onChange }: { active: ListingTab; onChange: (tab: ListingTab) => void }) {
  return (
    <nav className="mr-flex mr-gap-1 mr-rounded-full mr-border mr-border-white/10 mr-bg-mr-bg-secondary/60 mr-p-1" aria-label="Mushaira sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="mr-relative mr-flex-1 mr-rounded-full mr-px-3 mr-py-2 mr-text-sm mr-font-semibold mr-transition-colors"
        >
          {active === tab.id && (
            <motion.span
              layoutId="listing-tab-pill"
              className="mr-absolute mr-inset-0 mr-rounded-full mr-bg-mr-gold-gradient"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className={`mr-relative mr-z-10 ${active === tab.id ? 'mr-text-black' : 'mr-text-mr-muted'}`}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
