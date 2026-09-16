let PASSWORD = '';
let CONTENT = null;

function extractYoutubeId(input) {
  if (!input) return '';

  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
  ];

  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }

  if (/^[A-Za-z0-9_-]{6,}$/.test(input.trim())) {
    return input.trim();
  }

  return '';
}

function compressImage(file, maxWidth = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadContent() {
  const res = await fetch('/api/content');
  CONTENT = await res.json();
  fillForm();
  renderVideoList();
}

function fillForm() {
  document.getElementById('f-headline').value = CONTENT.hero?.headline || '';
  document.getElementById('f-subheadline').value = CONTENT.hero?.subheadline || '';
  document.getElementById('f-about').value = CONTENT.about?.text || '';
  document.getElementById('f-whatsapp-number').value = CONTENT.contact?.whatsappNumber || '';
  document.getElementById('f-whatsapp-message').value = CONTENT.contact?.whatsappMessage || '';
  document.getElementById('f-instagram').value = CONTENT.contact?.instagram || '';
  document.getElementById('f-tiktok').value = CONTENT.contact?.tiktok || '';
}

function renderVideoList() {
  const list = document.getElementById('admin-video-list');
  const videos = CONTENT.videos || [];
  if (!videos.length) {
    list.innerHTML = '<p style="color:var(--text-dim);font-size:0.9rem;">No videos yet.</p>';
    return;
  }
  list.innerHTML = '';
  videos.forEach(v => {
  const row = document.createElement('div');
  row.className = 'admin-video-row';
  row.draggable = true;
  row.dataset.id = v.id;

  row.innerHTML = `
    <span class="drag-handle" title="Drag to reorder">☰</span>
    <img src="${v.cover || ''}" alt="">
    <span class="title">${v.title || 'Untitled'}</span>
    <button class="edit-btn" data-id="${v.id}">Edit</button>
    <button class="delete-btn" data-id="${v.id}">Delete</button>
  `;

  row.querySelector('.edit-btn').addEventListener('click', () => editVideo(v.id));
  row.querySelector('.delete-btn').addEventListener('click', () => deleteVideo(v.id));

  const handle = row.querySelector('.drag-handle');

handle.addEventListener('pointerdown', (e) => {
  e.preventDefault();

  window.DRAGGING_VIDEO_ID = v.id;
  row.classList.add('dragging');

  handle.setPointerCapture(e.pointerId);
});

handle.addEventListener('pointermove', (e) => {
  if (window.DRAGGING_VIDEO_ID !== v.id) return;

  const rows = [...list.querySelectorAll('.admin-video-row')];
  const otherRows = rows.filter(r => r.dataset.id !== v.id);

  const target = otherRows.find(otherRow => {
    const rect = otherRow.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2;
  });

  if (target) {
    list.insertBefore(row, target);
  } else {
    list.appendChild(row);
  }
});

handle.addEventListener('pointerup', (e) => {
  if (window.DRAGGING_VIDEO_ID !== v.id) return;

  window.DRAGGING_VIDEO_ID = null;
  row.classList.remove('dragging');

  handle.releasePointerCapture(e.pointerId);
});

  list.appendChild(row);
});
}

async function saveContent(statusEl) {
  statusEl.textContent = 'Saving…';
  const res = await fetch('/api/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD, content: CONTENT })
  });
  if (!res.ok) {
    statusEl.textContent = 'Could not save — check password.';
    return false;
  }
  statusEl.textContent = 'Saved.';
  setTimeout(() => (statusEl.textContent = ''), 2000);
  return true;
}

document.getElementById('save-settings').addEventListener('click', () => {
  CONTENT.hero = {
    headline: document.getElementById('f-headline').value,
    subheadline: document.getElementById('f-subheadline').value,
  };
  CONTENT.about = { text: document.getElementById('f-about').value };
  CONTENT.contact = {
    whatsappNumber: document.getElementById('f-whatsapp-number').value,
    whatsappMessage: document.getElementById('f-whatsapp-message').value,
    instagram: document.getElementById('f-instagram').value,
    tiktok: document.getElementById('f-tiktok').value,
  };
  saveContent(document.getElementById('save-status'));
});

document.getElementById('new-cover').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const dataUrl = await compressImage(file);
  const preview = document.getElementById('new-cover-preview');
  preview.src = dataUrl;
  preview.hidden = false;
  preview.dataset.value = dataUrl;
});

document.getElementById('add-video-btn').addEventListener('click', async () => {
  const status = document.getElementById('add-status');
  const title = document.getElementById('new-title').value.trim();
  const ytInput = document.getElementById('new-youtube').value.trim();
  const youtubeId = extractYoutubeId(ytInput);
  const cover = document.getElementById('new-cover-preview').dataset.value || '';

  if (!title || !youtubeId) {
    status.textContent = 'Add a title and a valid YouTube link.';
    return;
  }

  CONTENT.videos = CONTENT.videos || [];
  CONTENT.videos.unshift({
    id: 'v' + Date.now(),
    title,
    youtubeId,
    cover,
    createdAt: new Date().toISOString(),
  });

  const ok = await saveContent(status);
  if (ok) {
    document.getElementById('new-title').value = '';
    document.getElementById('new-youtube').value = '';
    document.getElementById('new-cover').value = '';
    document.getElementById('new-cover-preview').hidden = true;
    renderVideoList();
  }
});

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  CONTENT.videos = (CONTENT.videos || []).filter(v => v.id !== id);
  const status = document.getElementById('add-status');
  const ok = await saveContent(status);
  if (ok) renderVideoList();
}
function editVideo(id) {
  const video = (CONTENT.videos || []).find(v => v.id === id);
  if (!video) return;

  window.EDITING_ID = id;

  document.getElementById('edit-title').value = video.title || '';
  document.getElementById('edit-description').value = video.description || '';
  document.getElementById('edit-youtube').value = video.youtubeId || '';

  const preview = document.getElementById('edit-cover-preview');

  if (video.cover) {
    preview.src = video.cover;
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }

  document.getElementById('edit-cover').value = '';
  document.getElementById('edit-status').textContent = '';
  document.getElementById('video-editor').hidden = false;
}
document.getElementById('edit-cover').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const dataUrl = await compressImage(file);
  const preview = document.getElementById('edit-cover-preview');
  preview.src = dataUrl;
  preview.hidden = false;
  preview.dataset.value = dataUrl;
});

document.getElementById('save-video-edit').addEventListener('click', async () => {
  const video = (CONTENT.videos || []).find(v => v.id === window.EDITING_ID);
  if (!video) return;

  const title = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-description').value.trim();
  const youtubeId = extractYoutubeId(
    document.getElementById('edit-youtube').value.trim()
  );

  if (!title || !youtubeId) {
    document.getElementById('edit-status').textContent =
      'Add a title and a valid YouTube link.';
    return;
  }

  video.title = title;
  video.description = description;
  video.youtubeId = youtubeId;

  const preview = document.getElementById('edit-cover-preview');
  if (preview.dataset.value) {
    video.cover = preview.dataset.value;
  }

  const status = document.getElementById('edit-status');
  const ok = await saveContent(status);

  if (ok) {
    document.getElementById('video-editor').hidden = true;
    preview.dataset.value = '';
    renderVideoList();
  }
});

document.getElementById('cancel-video-edit').addEventListener('click', () => {
  document.getElementById('video-editor').hidden = true;
});
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('password-input').value;
  // Verify by attempting a harmless save-check against the API.
  const res = await fetch('/api/content');
  const current = await res.json();
  const check = await fetch('/api/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw, content: current, verifyOnly: true })
  });
  if (!check.ok) {
    document.getElementById('login-error').hidden = false;
    return;
  }
  PASSWORD = pw;
  document.getElementById('login-screen').hidden = true;
  document.getElementById('admin-screen').hidden = false;
  loadContent();
});
