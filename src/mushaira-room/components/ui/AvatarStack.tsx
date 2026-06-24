function initials(name: string) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({
  name,
  avatarUrl,
  size = 40,
  ring = 'none'
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
  ring?: 'gold' | 'purple' | 'none';
}) {
  const ringClass =
    ring === 'gold' ? 'mr-ring-2 mr-ring-mr-gold' : ring === 'purple' ? 'mr-ring-2 mr-ring-mr-purple' : '';
  const src = avatarUrl || window.getAvatarUrl?.(name);
  return (
    <span
      className={`mr-relative mr-inline-flex mr-shrink-0 mr-items-center mr-justify-center mr-overflow-hidden mr-rounded-full mr-bg-mr-purple/40 mr-text-xs mr-font-semibold mr-text-white ${ringClass}`}
      style={{ width: size, height: size }}
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="mr-h-full mr-w-full mr-object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 6,
  size = 32
}: {
  people: { name: string; avatar?: string }[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="mr-flex mr-items-center">
      {shown.map((p, i) => (
        <span key={p.name + i} className="-mr-ml-2 first:mr-ml-0" style={{ zIndex: shown.length - i }}>
          <Avatar name={p.name} avatarUrl={p.avatar} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="-mr-ml-2 mr-flex mr-items-center mr-justify-center mr-rounded-full mr-bg-mr-bg-secondary mr-text-[11px] mr-font-semibold mr-text-mr-muted mr-ring-2 mr-ring-mr-bg"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
