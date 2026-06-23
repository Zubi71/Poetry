function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getAvatarUrl(name, size = 150) {
  const initials = getInitials(name);
  const palette = ['D4AF37', 'B8962E', 'FF9800', 'C9A227', 'E8B923', 'A67C00'];
  const hash = (name || 'User').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];
  const fontSize = Math.round(size * 0.38);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#${bg}" rx="${Math.round(size / 2)}"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#0a0a0a" font-family="Inter,Arial,sans-serif" font-size="${fontSize}" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function getPlaceholderImage(width, height, label = 'Urdu Poetry') {
  const w = width || 600;
  const h = height || 200;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1a1500"/><stop offset="100%" stop-color="#0a0a0a"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#D4AF37" font-family="Inter,Arial,sans-serif" font-size="${Math.max(16, Math.round(h * 0.12))}" font-weight="600">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function resolveAvatar(nameOrUrl, nameFallback = 'User') {
  if (!nameOrUrl) return getAvatarUrl(nameFallback);
  if (typeof nameOrUrl === 'string' && nameOrUrl.includes('pravatar')) {
    return getAvatarUrl(nameFallback);
  }
  if (typeof nameOrUrl === 'string' && (nameOrUrl.startsWith('data:') || nameOrUrl.startsWith('http'))) {
    return nameOrUrl;
  }
  return getAvatarUrl(String(nameOrUrl));
}

function avatarImg(name, className = '', alt = '', avatarUrl = '') {
  const label = alt || name || 'User';
  const src = resolveAvatar(avatarUrl, label);
  const fallback = getAvatarUrl('User');
  const cls = className ? ` class="${className}"` : '';
  return `<img src="${src}" alt=""${cls} loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">`;
}
