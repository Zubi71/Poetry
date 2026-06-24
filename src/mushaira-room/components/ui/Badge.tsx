export function Badge({ tone = 'gold', children }: { tone?: 'gold' | 'purple' | 'muted'; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    gold: 'mr-bg-mr-gold-gradient mr-text-black',
    purple: 'mr-bg-mr-purple-gradient mr-text-white',
    muted: 'mr-bg-white/10 mr-text-mr-muted'
  };
  return (
    <span className={`mr-inline-flex mr-items-center mr-gap-1 mr-rounded-full mr-px-2.5 mr-py-0.5 mr-text-[11px] mr-font-semibold mr-tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}
