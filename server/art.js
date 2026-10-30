// Generates deterministic block-print style product art as SVG, so the catalogue
// never depends on third-party image hosts.
const palettes = [
  { bg: '#1f2a4d', fg: '#f2e3c2', accent: '#d9a441' }, // indigo
  { bg: '#8e2f2f', fg: '#f6e6d0', accent: '#e8b04b' }, // madder red
  { bg: '#e9d8b4', fg: '#2b3a67', accent: '#a4343a' }, // undyed cotton
  { bg: '#46664f', fg: '#f3ead3', accent: '#e0b24a' }, // leaf green
  { bg: '#d99a2b', fg: '#3a2418', accent: '#8e2f2f' }, // turmeric
  { bg: '#2e2a27', fg: '#efe2c8', accent: '#c9733a' }  // iron black
];

function hash(text) {
  let h = 2166136261;
  for (const char of text) {
    h ^= char.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function slugify(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function artPath(name, category) {
  const params = new URLSearchParams({ t: name, c: category });
  return `/api/art/${slugify(name) || 'piece'}.svg?${params.toString()}`;
}

function motif(kind, p) {
  switch (kind) {
    case 0: // jaal diamond
      return `<path d="M32 6 58 32 32 58 6 32Z" fill="none" stroke="${p.fg}" stroke-width="2.5"/><circle cx="32" cy="32" r="5" fill="${p.accent}"/>`;
    case 1: // boota dots
      return `<circle cx="32" cy="32" r="10" fill="${p.fg}"/><circle cx="32" cy="32" r="4" fill="${p.accent}"/><circle cx="0" cy="0" r="3" fill="${p.fg}"/><circle cx="64" cy="0" r="3" fill="${p.fg}"/><circle cx="0" cy="64" r="3" fill="${p.fg}"/><circle cx="64" cy="64" r="3" fill="${p.fg}"/>`;
    case 2: // flower
      return [0, 45, 90, 135].map((a) => `<ellipse cx="32" cy="32" rx="5" ry="16" fill="${p.fg}" transform="rotate(${a} 32 32)"/>`).join('') + `<circle cx="32" cy="32" r="4" fill="${p.accent}"/>`;
    default: // stripes with dots
      return `<path d="M0 16H64M0 48H64" stroke="${p.fg}" stroke-width="3"/><circle cx="32" cy="32" r="4" fill="${p.accent}"/>`;
  }
}

function renderArt({ slug = '', title = '', category = '' } = {}) {
  const seed = hash(String(slug));
  const p = palettes[seed % palettes.length];
  const kind = (seed >>> 3) % 4;
  const label = String(title || slug || 'Loomcraft').trim().slice(0, 60);
  const initial = escapeXml((Array.from(label)[0] || 'L').toUpperCase());
  const caption = escapeXml(String(category).trim().slice(0, 30).toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-label="${escapeXml(label)}">
<defs><pattern id="t" width="64" height="64" patternUnits="userSpaceOnUse">${motif(kind, p)}</pattern></defs>
<rect width="800" height="1000" fill="${p.bg}"/>
<rect width="800" height="1000" fill="url(#t)" opacity="0.5"/>
<path d="M210 880V470A190 190 0 0 1 590 470V880Z" fill="${p.bg}" stroke="${p.accent}" stroke-width="8"/>
<path d="M232 858V470A168 168 0 0 1 568 470V858Z" fill="none" stroke="${p.fg}" stroke-width="2" stroke-dasharray="6 8"/>
<text x="400" y="640" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="220" fill="${p.accent}">${initial}</text>
<text x="400" y="750" text-anchor="middle" font-family="Georgia, serif" font-size="26" letter-spacing="9" fill="${p.fg}">LOOMCRAFT</text>
<text x="400" y="798" text-anchor="middle" font-family="Georgia, serif" font-size="20" letter-spacing="5" fill="${p.fg}" opacity="0.8">${caption}</text>
</svg>`;
}

module.exports = { renderArt, artPath, slugify };
