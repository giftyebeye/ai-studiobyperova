document.getElementById('year').textContent = new Date().getFullYear();

const PLAY_ICON = `
<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="32" fill="rgba(13,13,16,0.55)"/>
  <path d="M26 20L46 32L26 44V20Z" fill="#f2b84b"/>
</svg>`;

function whatsappLink(number, message) {
  const digits = (number || '').replace(/\D/g, '');
  const withCountry = digits.startsWith('234') ? digits : '234' + digits.replace(/^0+/, '');
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message || '')}`;
}

function renderContent(data) {

  if (data.about && data.about.text) {
    document.getElementById('about-text').textContent = data.about.text;
  }
  if (data.contact) {
    const wa = document.getElementById('link-whatsapp');
    wa.href = whatsappLink(data.contact.whatsappNumber, data.contact.whatsappMessage);
    const ig = document.getElementById('link-instagram');
    ig.href = `https://instagram.com/${(data.contact.instagram || '').replace('@', '')}`;
    ig.querySelector('.contact-label').textContent = `@${(data.contact.instagram || '').replace('@', '')}`;
    const tt = document.getElementById('link-tiktok');
    tt.href = `https://tiktok.com/@${(data.contact.tiktok || '').replace('@', '')}`;
    tt.querySelector('.contact-label').textContent = `@${(data.contact.tiktok || '').replace('@', '')}`;
  }

  const grid = document.getElementById('video-grid');
  const videos = data.videos || [];
  if (!videos.length) {
    grid.innerHTML = '<p class="empty-state">Videos are on their way — check back soon.</p>';
    return;
  }
  grid.innerHTML = '';
  videos.forEach(v => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
  <div class="video-meta">
    <h3>${escapeHtml(v.title || 'Untitled')}</h3>
    ${v.description ? `<p>${escapeHtml(v.description)}</p>` : ''}
  </div>
  <div class="video-thumb" style="background-image:url('${v.cover || ''}')">

  </div>
`;
    card.addEventListener('click', () => openVideo(v.youtubeId));
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function openVideo(youtubeId) {
  if (!youtubeId) return;
  const modal = document.getElementById('video-modal');
  const frame = document.getElementById('video-modal-frame');
  frame.innerHTML = `
  <div class="video-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1rem;z-index:1;">
    Loading video…
  </div>
  <iframe src="https://www.youtube.com/embed/${youtubeId}?autoplay=1" title="Video player" allow="autoplay; encrypted-media" allowfullscreen></iframe>
`;

const iframe = frame.querySelector('iframe');

iframe.addEventListener('load', () => {
  const loading = frame.querySelector('.video-loading');
  if (loading) loading.remove();
});

modal.hidden = false;
}

function closeVideo() {
  const modal = document.getElementById('video-modal');
  document.getElementById('video-modal-frame').innerHTML = '';
  modal.hidden = true;
}

document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeVideo));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeVideo(); });

fetch('/api/content')
  .then(r => r.json())
  .then(renderContent)
  .catch(() => {
    document.getElementById('video-grid').innerHTML = '<p class="empty-state">Could not load videos right now.</p>';
  });
