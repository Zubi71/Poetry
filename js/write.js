function formatPoemHtml(text, theme) {
  const cardTheme = theme || Storage.getCardTheme();
  const lines = (text || '').split('\n').filter(line => line.trim());
  if (!lines.length) {
    return '<div class="poem-lines poem-theme-golden"><span class="poem-line urdu-text">&nbsp;</span></div>';
  }
  const lineHtml = lines.map((line, i) => {
    const verse = `<span class="poem-line urdu-text">${line.trim()}</span>`;
    if (i < lines.length - 1) {
      return `${verse}<div class="poem-verse-divider" aria-hidden="true"><span></span></div>`;
    }
    return verse;
  }).join('');
  return `<div class="poem-lines poem-theme-golden poem-theme-${cardTheme}">${lineHtml}</div>`;
}

function getAllPoems() {
  if (SupabaseClient.isEnabled()) {
    return [...(window.REMOTE_POEMS || []), ...APP_DATA.poems];
  }
  return [...Storage.getUserPosts(), ...APP_DATA.poems];
}

async function loadRemoteData() {
  if (!SupabaseClient.isEnabled()) {
    window.REMOTE_POEMS = [];
    window.REMOTE_MUSHAIRA_EVENTS = [];
    window.REMOTE_VOICE_ROOMS = [];
    return;
  }
  const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const fetchAll = Promise.all([
    API.fetchPoems(),
    API.fetchMushairaEvents(),
    API.fetchVoiceRooms(),
    API.getWritingTags(),
    API.getFeaturedPoemId()
  ]);
  const [poems, mushaira, rooms, tags, featuredId] = await Promise.race([
    fetchAll,
    timeout(8000).then(() => [null, null, null, null, null])
  ]);
  window.REMOTE_POEMS = poems || [];
  window.REMOTE_MUSHAIRA_EVENTS = mushaira || [];
  window.REMOTE_VOICE_ROOMS = rooms || [];
  if (tags && tags.length) Storage.saveWritingTags(tags);
  if (featuredId) Storage.setFeaturedPoem(featuredId);
  if (typeof MushairaEvents !== 'undefined') MushairaEvents.updateLiveUI();
}

function getPoemByIdFromAll(id) {
  return getAllPoems().find(p => p.id === parseInt(id));
}

function renderTagChips(tags, activeId) {
  return tags.map(tag => `
    <button type="button" class="tag-chip urdu-text ${activeId === tag.id ? 'active' : ''}" data-tag-id="${tag.id}">${tag.label}</button>
  `).join('');
}

const Write = {
  openModal(draft = null) {
    const user = Auth.getCurrentUser();
    const tags = Storage.getWritingTags();
    const themes = [
      { id: 'classic-dark', label: 'Classic Dark', icon: '🌙' },
      { id: 'golden-border', label: 'Golden Border', icon: '✨' },
      { id: 'premium-paper', label: 'Gold Paper', icon: '📜' }
    ];
    const currentTheme = draft?.cardTheme || Storage.getCardTheme();
    const hasDraftText = Boolean(draft?.text?.trim());

    const root = document.getElementById('modal-root');
    Components.openModalLock();
    root.innerHTML = `
      <div class="modal-overlay active write-overlay" id="write-overlay">
        <div class="write-modal">
          <div class="write-modal-header">
            <button type="button" class="write-close" id="write-close" aria-label="Close">${Components.icon('back')}</button>
            <h2>Write</h2>
            <button type="button" class="btn btn-gold btn-sm write-post-top" id="write-post-btn" disabled>Post</button>
          </div>
          <div class="write-modal-body">
            <div class="write-compose-row">
              ${avatarImg(user.name, 'write-avatar', user.name, user.avatar)}
              <textarea id="write-poem-text" class="write-textarea urdu-text" placeholder="What's on your mind? اپنی شاعری لکھیں..." rows="4">${draft?.text || ''}</textarea>
            </div>

            <div class="write-reveal ${hasDraftText ? 'visible' : ''}" id="write-preview-section">
              <div class="write-preview-label">Preview</div>
              <div id="write-preview" class="write-preview">${formatPoemHtml(draft?.text || '', currentTheme)}</div>
            </div>

            <div class="write-reveal ${hasDraftText ? 'visible' : ''}" id="write-tag-section">
              <p class="tag-scroll-label">Select tag — swipe to browse</p>
              <div class="tag-scroll-marquee">
                <div class="tag-scroll-track" id="tag-scroll-bar">
                  ${renderTagChips(tags, draft?.tagId || tags[0]?.id)}
                  ${renderTagChips(tags, draft?.tagId || tags[0]?.id)}
                </div>
              </div>
            </div>

            <div class="write-reveal ${hasDraftText ? 'visible' : ''}" id="write-theme-section">
              <p class="tag-scroll-label">Card style</p>
              <div class="card-theme-options">
                ${themes.map(t => `
                  <button type="button" class="theme-chip ${currentTheme === t.id ? 'active' : ''}" data-theme="${t.id}">
                    <span>${t.icon}</span> ${t.label}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="write-reveal ${hasDraftText ? 'visible' : ''}" id="write-schedule-section">
              <div class="write-schedule-row">
                <label>Schedule for later (optional)</label>
                <input type="datetime-local" id="write-schedule-time">
              </div>
            </div>
          </div>
          <div class="write-modal-footer">
            <button type="button" class="btn btn-ghost" id="write-draft-btn">Save Draft</button>
            <button type="button" class="btn btn-outline-gold" id="write-schedule-btn">Schedule</button>
            <button type="button" class="btn btn-gold" id="write-post-btn-footer" disabled>Post Now</button>
          </div>
        </div>
      </div>
    `;

    let selectedTag = draft?.tagId || tags[0]?.id;
    let selectedTheme = currentTheme;
    const draftId = draft?.id || null;

    const textarea = document.getElementById('write-poem-text');
    const postBtns = [document.getElementById('write-post-btn'), document.getElementById('write-post-btn-footer')];
    const revealSections = root.querySelectorAll('.write-reveal');

    const setTagActive = (tagId) => {
      root.querySelectorAll('.tag-chip').forEach(chip => {
        chip.classList.toggle('active', parseInt(chip.dataset.tagId) === tagId);
      });
    };

    const updatePreview = () => {
      const text = textarea.value;
      const hasText = Boolean(text.trim());

      revealSections.forEach(section => section.classList.toggle('visible', hasText));
      postBtns.forEach(btn => { btn.disabled = !hasText; });

      const preview = document.getElementById('write-preview');
      if (preview) preview.innerHTML = formatPoemHtml(text, selectedTheme);
    };

    textarea.addEventListener('input', updatePreview);
    setTimeout(() => textarea.focus(), 100);

    root.querySelectorAll('.tag-chip').forEach(chip => {
      chip.onclick = () => {
        selectedTag = parseInt(chip.dataset.tagId);
        setTagActive(selectedTag);
      };
    });

    root.querySelectorAll('.theme-chip').forEach(chip => {
      chip.onclick = () => {
        root.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedTheme = chip.dataset.theme;
        updatePreview();
      };
    });

    const close = () => {
      root.innerHTML = '';
      Components.closeModal();
    };
    document.getElementById('write-close').onclick = close;
    root.querySelector('.write-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('write-overlay')) close();
    });

    const requireAuth = () => {
      if (!Auth.isGuest()) return true;
      Components.showToast('Please login to publish poetry', 'error');
      close();
      Router.go('/login');
      return false;
    };

    const submitPost = async (scheduled = false) => {
      if (!requireAuth()) return;

      const text = textarea.value.trim();
      if (!text) {
        Components.showToast('Please write something first', 'error');
        return;
      }
      const tag = tags.find(t => t.id === selectedTag);
      const scheduleTime = document.getElementById('write-schedule-time').value;

      if (scheduled && scheduleTime) {
        Storage.addScheduledPost({ text, tagId: selectedTag, tagLabel: tag?.label, cardTheme: selectedTheme, scheduleAt: scheduleTime });
        if (draftId) Storage.deleteDraft(draftId);
        Components.showToast('Poetry scheduled!');
        close();
        return;
      }

      if (SupabaseClient.isEnabled()) {
        const created = await API.createPoem({
          text,
          tagLabel: tag?.label,
          category: tag?.en?.toLowerCase() || 'shayari',
          cardTheme: selectedTheme
        });
        if (!created) {
          Components.showToast('Failed to post. Try again.', 'error');
          return;
        }
        await loadRemoteData();
      } else {
        Storage.addUserPost({
          text,
          tagId: selectedTag,
          tagLabel: tag?.label,
          category: tag?.en?.toLowerCase() || 'shayari',
          cardTheme: selectedTheme,
          poetName: user.name,
          poetId: user.id || 0
        });
      }

      if (draftId) Storage.deleteDraft(draftId);
      Components.showToast('Poetry posted successfully!');
      close();
      Router.navigate();
    };

    postBtns.forEach(btn => { btn.onclick = () => submitPost(false); });
    document.getElementById('write-schedule-btn').onclick = () => submitPost(true);

    document.getElementById('write-draft-btn').onclick = async () => {
      if (!requireAuth()) return;

      const text = textarea.value.trim();
      if (!text) {
        Components.showToast('Nothing to save', 'error');
        return;
      }
      if (SupabaseClient.isEnabled()) {
        await API.saveDraft({ id: draftId, text, tagId: selectedTag, cardTheme: selectedTheme });
      } else {
        Storage.saveDraft({ id: draftId, text, tagId: selectedTag, cardTheme: selectedTheme });
      }
      Components.showToast('Draft saved!');
      close();
    };

    updatePreview();
  }
};
