const STORAGE_KEY = 'my-words-quotes-v1';
const $ = (selector) => document.querySelector(selector);
const els = {
  grid: $('#quote-grid'), empty: $('#empty-state'), emptyTitle: $('#empty-title'), emptyDescription: $('#empty-description'),
  headingCount: $('#heading-count'), allCount: $('#all-count'), favoriteCount: $('#favorite-count'),
  filters: $('#tag-filters'), search: $('#search-input'), sort: $('#sort-select'), dialog: $('#editor-dialog'),
  form: $('#editor-form'), text: $('#quote-text'), tag: $('#quote-tag'), date: $('#quote-date'),
  title: $('#editor-title'), save: $('#save-button'), count: $('#character-count'), toast: $('#toast')
};
let quotes = readQuotes();
let view = 'all';
let tagFilter = 'all';
let editingId = null;
let toastTimer;

function readQuotes() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((item) => item && typeof item.id === 'string' && typeof item.text === 'string') : [];
  } catch { return []; }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes)); return true; }
  catch { showToast('저장 공간을 확인해 주세요. 기록을 저장하지 못했어요.'); return false; }
}
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 3000);
}
function formatDate(value) {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${year}.${month}.${day}` : '';
}
function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
function createCard(quote) {
  const card = document.createElement('article');
  card.className = 'quote-card';
  card.dataset.id = quote.id;
  const head = document.createElement('div'); head.className = 'card-head';
  const mark = document.createElement('span'); mark.className = 'quote-mark'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = '“';
  const favorite = document.createElement('button'); favorite.type = 'button'; favorite.className = `favorite-button${quote.favorite ? ' is-on' : ''}`; favorite.dataset.action = 'favorite'; favorite.setAttribute('aria-label', quote.favorite ? '아끼는 문장에서 제외' : '아끼는 문장에 추가'); favorite.setAttribute('aria-pressed', String(Boolean(quote.favorite))); favorite.textContent = '✦';
  head.append(mark, favorite);
  const body = document.createElement('p'); body.className = 'card-quote'; body.textContent = quote.text;
  const foot = document.createElement('div'); foot.className = 'card-foot';
  if (quote.tag) { const tag = document.createElement('span'); tag.className = 'card-tag'; tag.textContent = `# ${quote.tag}`; foot.append(tag); }
  const date = document.createElement('time'); date.className = 'card-date'; date.dateTime = quote.date; date.textContent = formatDate(quote.date); foot.append(date);
  const actions = document.createElement('div'); actions.className = 'card-actions';
  for (const [action, label] of [['copy', '복사'], ['edit', '수정'], ['delete', '삭제']]) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.action = action; button.className = action === 'delete' ? 'delete-button' : ''; button.textContent = label; actions.append(button);
  }
  card.append(head, body, foot, actions);
  return card;
}
function renderFilters() {
  const tags = [...new Set(quotes.map((quote) => quote.tag).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  if (tagFilter !== 'all' && !tags.includes(tagFilter)) tagFilter = 'all';
  els.filters.hidden = tags.length === 0;
  els.filters.replaceChildren();
  for (const tag of ['all', ...tags]) {
    const button = document.createElement('button'); button.type = 'button'; button.className = `filter-chip${tagFilter === tag ? ' is-active' : ''}`; button.dataset.tag = tag; button.textContent = tag === 'all' ? '전체' : `# ${tag}`; button.setAttribute('aria-pressed', String(tagFilter === tag)); els.filters.append(button);
  }
}
function render() {
  els.allCount.textContent = quotes.length;
  els.favoriteCount.textContent = quotes.filter((quote) => quote.favorite).length;
  document.querySelectorAll('[data-view]').forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  renderFilters();
  const search = els.search.value.trim().toLocaleLowerCase();
  const visible = quotes.filter((quote) => (view === 'all' || quote.favorite) && (tagFilter === 'all' || quote.tag === tagFilter) && (!search || `${quote.text} ${quote.tag || ''}`.toLocaleLowerCase().includes(search)));
  visible.sort((a, b) => els.sort.value === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
  els.headingCount.textContent = visible.length;
  els.grid.replaceChildren(...visible.map(createCard));
  const isEmpty = visible.length === 0;
  els.empty.hidden = !isEmpty;
  if (isEmpty) {
    const first = quotes.length === 0;
    els.emptyTitle.textContent = first ? '첫 문장을 기다리고 있어요.' : '아직 여기에 문장이 없어요.';
    els.emptyDescription.textContent = first ? '오늘의 생각을 남겨 보세요. 짧은 한 줄이어도 좋아요.' : '다른 검색어나 태그를 선택해 보세요.';
    $('#empty-action').hidden = !first;
  }
}
function openEditor(id = null) {
  editingId = id;
  const quote = quotes.find((item) => item.id === id);
  els.form.reset();
  els.text.value = quote?.text || '';
  els.tag.value = quote?.tag || '';
  els.date.value = quote?.date || localDate();
  els.title.textContent = quote ? '문장 다듬기' : '새 문장 남기기';
  els.save.innerHTML = quote ? '변경사항 저장 <span>↗</span>' : '문장 보관하기 <span>↗</span>';
  els.count.textContent = els.text.value.length;
  els.dialog.showModal();
  requestAnimationFrame(() => els.text.focus());
}
function closeEditor() { els.dialog.close(); editingId = null; }
$('#new-button').addEventListener('click', () => openEditor());
$('#empty-action').addEventListener('click', () => openEditor());
$('#close-dialog').addEventListener('click', closeEditor);
$('#cancel-dialog').addEventListener('click', closeEditor);
els.dialog.addEventListener('click', (event) => { if (event.target === els.dialog) closeEditor(); });
els.text.addEventListener('input', () => { els.count.textContent = els.text.value.length; });
els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = els.text.value.trim();
  if (!text) { els.text.focus(); return; }
  const previous = [...quotes];
  const wasEditing = Boolean(editingId);
  const tag = els.tag.value.trim().replace(/^#+\s*/, '');
  if (editingId) {
    quotes = quotes.map((quote) => quote.id === editingId ? { ...quote, text, tag, date: els.date.value } : quote);
  } else {
    quotes.unshift({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, text, tag, date: els.date.value, favorite: false, createdAt: Date.now() });
  }
  if (!persist()) { quotes = previous; return; }
  closeEditor(); render(); showToast(wasEditing ? '문장을 수정했어요.' : '새 문장을 보관했어요.');
});
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { view = button.dataset.view; render(); }));
els.filters.addEventListener('click', (event) => { const button = event.target.closest('[data-tag]'); if (!button) return; tagFilter = button.dataset.tag; render(); });
els.search.addEventListener('input', render);
els.sort.addEventListener('change', render);
els.grid.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = button.closest('[data-id]')?.dataset.id;
  const quote = quotes.find((item) => item.id === id);
  if (!quote) return;
  switch (button.dataset.action) {
    case 'favorite': { const previous = quote.favorite; quote.favorite = !previous; if (!persist()) { quote.favorite = previous; return; } render(); showToast(quote.favorite ? '아끼는 문장에 넣었어요.' : '아끼는 문장에서 뺐어요.'); break; }
    case 'edit': openEditor(id); break;
    case 'delete': { if (!confirm('이 문장을 삭제할까요? 삭제한 문장은 되돌릴 수 없어요.')) return; const previous = [...quotes]; quotes = quotes.filter((item) => item.id !== id); if (!persist()) { quotes = previous; return; } render(); showToast('문장을 삭제했어요.'); break; }
    case 'copy': try { await navigator.clipboard.writeText(quote.text); showToast('문장을 복사했어요.'); } catch { showToast('복사할 수 없어요. 브라우저 권한을 확인해 주세요.'); } break;
  }
});
$('#export-button').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), quotes }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `문장서랍-${localDate()}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('기록을 파일로 내보냈어요.');
});
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('5MB 이하의 백업 파일을 선택해 주세요.'); return; }
  try {
    const backup = JSON.parse(await file.text());
    if (backup?.version !== 1 || !Array.isArray(backup.quotes) || !backup.quotes.every((quote) =>
      quote && typeof quote.id === 'string' && quote.id.length > 0 &&
      typeof quote.text === 'string' && quote.text.trim().length > 0 && quote.text.length <= 500 &&
      typeof quote.tag === 'string' && quote.tag.length <= 20 &&
      typeof quote.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(quote.date) &&
      typeof quote.createdAt === 'number' && Number.isFinite(quote.createdAt) &&
      typeof quote.favorite === 'boolean')) throw new Error('invalid backup');
    const existingIds = new Set(quotes.map((quote) => quote.id));
    const additions = backup.quotes.filter((quote) => {
      if (existingIds.has(quote.id)) return false;
      existingIds.add(quote.id);
      return true;
    });
    if (additions.length === 0) { showToast('새로 가져올 문장이 없어요.'); return; }
    const previous = quotes;
    quotes = [...quotes, ...additions];
    if (!persist()) { quotes = previous; return; }
    render();
    showToast(`${additions.length}개의 문장을 가져왔어요.`);
  } catch { showToast('문장서랍에서 내보낸 JSON 파일을 선택해 주세요.'); }
});
render();
