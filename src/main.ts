import './styles.css';

type MediaType = 'image' | 'video';
type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  url: string;
  tags: string[];
};
type Catalog = { generatedAt?: string; items: MediaItem[] };

const app = document.querySelector<HTMLDivElement>('#app')!;
const BASE = import.meta.env.BASE_URL;
const FAVORITES_KEY = 'garou-archive-favorites-v1';

let allItems: MediaItem[] = [];
let activeFilter = 'all';
let query = '';
let sortMode = 'newest';
let favorites = new Set<string>();
let modalIndex = -1;
let visibleCount = 36;

try {
  favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]') as string[]);
} catch {
  favorites = new Set();
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]!));

function icon(name: string): string {
  const paths: Record<string, string> = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    play: '<polygon points="7 3 21 12 7 21 7 3"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    arrowLeft: '<path d="m15 18-6-6 6-6"/>',
    arrowRight: '<path d="m9 18 6-6-6-6"/>',
    shuffle: '<path d="m18 14 4 4-4 4"/><path d="M2 18h2.5a6 6 0 0 0 4.8-2.4l5.4-7.2A6 6 0 0 1 19.5 6H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h2.5a6 6 0 0 1 3.2.9"/>',
    external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

function getFilteredItems(): MediaItem[] {
  let items = [...allItems];
  if (activeFilter === 'images') items = items.filter((item) => item.type === 'image');
  if (activeFilter === 'videos') items = items.filter((item) => item.type === 'video');
  if (activeFilter === 'saved') items = items.filter((item) => favorites.has(item.id));
  const needle = query.trim().toLowerCase();
  if (needle) {
    items = items.filter((item) => `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(needle));
  }
  if (sortMode === 'title') items.sort((a, b) => a.title.localeCompare(b.title));
  if (sortMode === 'random') items.sort(() => Math.random() - 0.5);
  return items;
}

function mediaMarkup(item: MediaItem, index: number): string {
  const isVideo = item.type === 'video';
  const favorite = favorites.has(item.id);
  return `
    <article class="media-card" data-index="${index}">
      <button class="media-open" data-open="${index}" aria-label="Open ${escapeHtml(item.title)}">
        ${isVideo
          ? `<video class="media-visual" src="${escapeHtml(item.url)}" muted playsinline preload="metadata" tabindex="-1"></video><span class="video-indicator">${icon('play')}</span>`
          : `<img class="media-visual" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" />`
        }
        <span class="media-shade"></span>
        <span class="card-title">${escapeHtml(item.title)}</span>
      </button>
      <button class="favorite-button ${favorite ? 'is-favorite' : ''}" data-favorite="${escapeHtml(item.id)}" aria-label="${favorite ? 'Remove from saved' : 'Save to favorites'}">${icon('heart')}</button>
    </article>`;
}

function renderGrid() {
  const grid = document.querySelector<HTMLDivElement>('#media-grid');
  const count = document.querySelector<HTMLElement>('#result-count');
  const empty = document.querySelector<HTMLElement>('#empty-state');
  const more = document.querySelector<HTMLButtonElement>('#load-more');
  if (!grid || !count || !empty || !more) return;

  const items = getFilteredItems();
  const shown = items.slice(0, visibleCount);
  grid.innerHTML = shown.map(mediaMarkup).join('');
  count.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
  empty.hidden = items.length > 0;
  more.hidden = shown.length >= items.length;
  grid.querySelectorAll<HTMLVideoElement>('video.media-visual').forEach((video) => {
    video.addEventListener('mouseenter', () => { void video.play().catch(() => undefined); });
    video.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
  });
}

function renderShell() {
  app.innerHTML = `
    <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
    <header class="topbar">
      <a class="brand" href="${BASE}" aria-label="Garou Archive home">
        <span class="brand-mark">G</span><span class="brand-copy"><strong>GAROU <span>ARCHIVE</span></strong><small>THE HERO HUNTER · ONE-PUNCH MAN</small></span>
      </a>
      <div class="top-actions"><span class="online-dot"></span><span class="archive-label">COMMUNITY MEDIA ARCHIVE</span><a class="github-link" href="https://github.com/mesflit/garou-archive" target="_blank" rel="noreferrer">${icon('external')}<span>GitHub</span></a></div>
    </header>
    <main>
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span></span> A ONE-PUNCH MAN FAN ARCHIVE</div>
          <h1>Witness the rise<br/>of <span>the monster.</span></h1>
          <p>Explore Garou's most iconic moments, artwork, wallpapers, and battles — collected in one place.</p>
          <div class="hero-actions"><button class="primary-button" id="explore-button">${icon('grid')} Explore archive <span>↘</span></button><button class="quiet-button" id="random-button">${icon('shuffle')} Surprise me</button></div>
        </div>
        <div class="hero-art" aria-hidden="true"><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><div class="hero-g">G</div><div class="hero-caption"><span>001 / THE HERO HUNTER</span><b>EVOLVE BEYOND LIMITS</b></div></div>
      </section>
      <section class="archive-section" id="archive">
        <div class="section-heading"><div><div class="eyebrow">THE COLLECTION</div><h2>Explore the archive<span>.</span></h2></div><div class="result-count" id="result-count">Loading…</div></div>
        <div class="toolbar">
          <label class="search-box">${icon('search')}<input id="search-input" type="search" placeholder="Search Garou, Cosmic, wallpaper…" autocomplete="off" aria-label="Search media"/><kbd>/</kbd></label>
          <div class="filters" role="group" aria-label="Media filters">
            <button class="filter-button active" data-filter="all">${icon('grid')} All</button>
            <button class="filter-button" data-filter="images">${icon('image')} Images</button>
            <button class="filter-button" data-filter="videos">${icon('play')} Videos</button>
            <button class="filter-button" data-filter="saved">${icon('heart')} Saved</button>
          </div>
          <select id="sort-select" aria-label="Sort media"><option value="newest">Recently added</option><option value="title">Title A–Z</option><option value="random">Shuffle</option></select>
        </div>
        <div class="media-grid" id="media-grid"></div>
        <div class="empty-state" id="empty-state" hidden><div class="empty-icon">${icon('search')}</div><h3>No media found</h3><p>Try another search, or add some links to <code>media.txt</code>.</p><button class="quiet-button" id="clear-search">Clear filters</button></div>
        <div class="load-more-wrap"><button class="quiet-button load-more" id="load-more">Load more <span>↓</span></button></div>
      </section>
      <section class="how-section"><div class="how-icon">${icon('image')}</div><div><div class="eyebrow">CURATED BY THE COMMUNITY</div><h2>One archive. Endless evolution.</h2><p>This site is a fan-made, non-official collection. Media belongs to its respective creators and rights holders.</p></div><a href="https://github.com/mesflit/garou-archive" target="_blank" rel="noreferrer" class="outline-button">Contribute ${icon('external')}</a></section>
    </main>
    <footer><a class="footer-brand" href="${BASE}">GAROU ARCHIVE</a><span>Unofficial fan project · Made for fans, with respect for creators.</span><a href="https://github.com/mesflit/garou-archive" target="_blank" rel="noreferrer">Open source ${icon('external')}</a></footer>
    <nav class="mobile-nav" aria-label="Mobile navigation"><button data-mobile="home">${icon('grid')}<span>Home</span></button><button data-mobile="search">${icon('search')}<span>Search</span></button><button data-mobile="saved">${icon('heart')}<span>Saved</span></button></nav>
    <div id="viewer" class="viewer" hidden role="dialog" aria-modal="true" aria-label="Media viewer">
      <button class="viewer-close" id="viewer-close" aria-label="Close viewer">${icon('close')}</button>
      <button class="viewer-nav viewer-prev" id="viewer-prev" aria-label="Previous item">${icon('arrowLeft')}</button>
      <div class="viewer-content" id="viewer-content"></div>
      <button class="viewer-nav viewer-next" id="viewer-next" aria-label="Next item">${icon('arrowRight')}</button>
      <div class="viewer-details" id="viewer-details"></div>
    </div>`;
  wireEvents();
}

function openViewer(index: number) {
  const items = getFilteredItems();
  if (!items.length) return;
  modalIndex = (index + items.length) % items.length;
  const item = items[modalIndex];
  const viewer = document.querySelector<HTMLDivElement>('#viewer')!;
  const content = document.querySelector<HTMLDivElement>('#viewer-content')!;
  const details = document.querySelector<HTMLDivElement>('#viewer-details')!;
  content.innerHTML = item.type === 'video'
    ? `<video src="${escapeHtml(item.url)}" controls autoplay playsinline></video>`
    : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" />`;
  details.innerHTML = `<div class="viewer-title"><span class="type-label">${item.type === 'video' ? 'VIDEO' : 'IMAGE'}</span><h3>${escapeHtml(item.title)}</h3></div><div class="viewer-actions"><button class="icon-action ${favorites.has(item.id) ? 'is-favorite' : ''}" id="viewer-favorite" aria-label="Toggle favorite">${icon('heart')}</button><a class="icon-action" href="${escapeHtml(item.url)}" download="${escapeHtml(item.title.replace(/[^\w -]/g, '').trim() || 'garou-media')}" target="_blank" rel="noreferrer" aria-label="Download media">${icon('download')}</a><button class="icon-action" id="viewer-share" aria-label="Share media">${icon('share')}</button><a class="icon-action" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" aria-label="Open original file">${icon('external')}</a></div>`;
  viewer.hidden = false;
  document.body.classList.add('viewer-open');
  document.querySelector<HTMLButtonElement>('#viewer-favorite')!.onclick = () => toggleFavorite(item.id);
  document.querySelector<HTMLButtonElement>('#viewer-share')!.onclick = () => shareItem(item);
}

function closeViewer() {
  const viewer = document.querySelector<HTMLDivElement>('#viewer');
  if (viewer) viewer.hidden = true;
  const content = document.querySelector<HTMLDivElement>('#viewer-content');
  if (content) content.innerHTML = '';
  document.body.classList.remove('viewer-open');
  modalIndex = -1;
}

function moveViewer(direction: number) {
  if (modalIndex >= 0) openViewer(modalIndex + direction);
}

function toggleFavorite(id: string) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavorites();
  renderGrid();
  if (modalIndex >= 0) openViewer(modalIndex);
}

async function shareItem(item: MediaItem) {
  const shareData = { title: item.title, text: `Found on Garou Archive: ${item.title}`, url: item.url };
  try {
    if (navigator.share) await navigator.share(shareData);
    else if (navigator.clipboard) {
      await navigator.clipboard.writeText(item.url);
      alert('Media link copied to clipboard.');
    } else {
      window.prompt('Copy this media link:', item.url);
    }
  } catch { /* Sharing was cancelled by the user. */ }
}

function wireEvents() {
  document.querySelector<HTMLButtonElement>('#explore-button')!.onclick = () => document.querySelector('#archive')!.scrollIntoView({ behavior: 'smooth' });
  document.querySelector<HTMLButtonElement>('#random-button')!.onclick = () => {
    const items = getFilteredItems();
    if (items.length) openViewer(Math.floor(Math.random() * items.length));
  };
  document.querySelector<HTMLInputElement>('#search-input')!.addEventListener('input', (event) => {
    query = (event.target as HTMLInputElement).value;
    visibleCount = 36;
    renderGrid();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => {
    button.onclick = () => {
      activeFilter = button.dataset.filter || 'all';
      visibleCount = 36;
      document.querySelectorAll('[data-filter]').forEach((el) => el.classList.toggle('active', el === button));
      renderGrid();
    };
  });
  document.querySelector<HTMLSelectElement>('#sort-select')!.onchange = (event) => {
    sortMode = (event.target as HTMLSelectElement).value;
    renderGrid();
  };
  document.querySelector<HTMLButtonElement>('#load-more')!.onclick = () => {
    visibleCount += 36;
    renderGrid();
  };
  document.querySelector<HTMLButtonElement>('#clear-search')!.onclick = () => {
    query = '';
    activeFilter = 'all';
    document.querySelector<HTMLInputElement>('#search-input')!.value = '';
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((el) => el.classList.toggle('active', el.dataset.filter === 'all'));
    renderGrid();
  };
  document.querySelector<HTMLButtonElement>('#viewer-close')!.onclick = closeViewer;
  document.querySelector<HTMLButtonElement>('#viewer-prev')!.onclick = () => moveViewer(-1);
  document.querySelector<HTMLButtonElement>('#viewer-next')!.onclick = () => moveViewer(1);
  document.querySelector<HTMLDivElement>('#viewer')!.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeViewer();
  });
  document.querySelector<HTMLDivElement>('#media-grid')!.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-open], [data-favorite]');
    if (!target) return;
    if (target.dataset.favorite) toggleFavorite(target.dataset.favorite);
    else if (target.dataset.open !== undefined) openViewer(Number(target.dataset.open));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-mobile]').forEach((button) => {
    button.onclick = () => {
      const destination = button.dataset.mobile;
      if (destination === 'saved') {
        activeFilter = 'saved';
        document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((el) => el.classList.toggle('active', el.dataset.filter === 'saved'));
        renderGrid();
        document.querySelector('#archive')!.scrollIntoView({ behavior: 'smooth' });
      } else if (destination === 'search') {
        document.querySelector('#archive')!.scrollIntoView({ behavior: 'smooth' });
        document.querySelector<HTMLInputElement>('#search-input')!.focus();
      } else window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });
  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName)) {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('#search-input')!.focus();
    }
    if (event.key === 'Escape') closeViewer();
    if (modalIndex >= 0 && event.key === 'ArrowLeft') moveViewer(-1);
    if (modalIndex >= 0 && event.key === 'ArrowRight') moveViewer(1);
  });
}

async function init() {
  try {
    const response = await fetch(`${BASE}media.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error('The media catalog could not be loaded.');
    const catalog = await response.json() as Catalog;
    allItems = Array.isArray(catalog.items) ? catalog.items : [];
  } catch (error) {
    console.error(error);
    allItems = [];
  }
  renderShell();
  renderGrid();
  if (!allItems.length) {
    const empty = document.querySelector<HTMLElement>('#empty-state');
    if (empty) {
      empty.hidden = false;
      empty.querySelector('h3')!.textContent = 'The archive is waiting for its first links';
      empty.querySelector('p')!.innerHTML = 'Add media URLs to <code>media.txt</code> using this format:<br><code>https://example.com/garou.webp "Cosmic Garou"</code>';
    }
  }
}

void init();
