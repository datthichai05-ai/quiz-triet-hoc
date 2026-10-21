import { validSession } from './core.js';

export function emptyState() {
  return { version: 1, active: null, history: [], wrong: [], bookmarks: [], settings: {} };
}

export function loadState(storage, key, bank) {
  const fresh = emptyState();
  try {
    const raw = storage.getItem(key);
    if (!raw) return { state: fresh, warning: '' };
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1) throw new Error('version');
    let discarded = false;
    if (saved.active) {
      if (validSession(saved.active, bank) && saved.active.completedAt === null) fresh.active = saved.active;
      else discarded = true;
    }
    const history = Array.isArray(saved.history) ? saved.history : [];
    fresh.history = history.filter(s => validSession(s, bank) && s.completedAt !== null).slice(0, 50);
    if (history.length !== fresh.history.length) discarded = true;
    for (const field of ['wrong', 'bookmarks']) {
      fresh[field] = [...new Set(Array.isArray(saved[field]) ? saved[field].filter(id => bank.has(id)) : [])];
    }
    if (saved.settings && typeof saved.settings === 'object' && !Array.isArray(saved.settings)) fresh.settings = saved.settings;
    return { state: fresh, warning: discarded ? 'Một bài lưu cũ không còn tương thích với dữ liệu hiện tại. Các mục hợp lệ đã được khôi phục.' : '' };
  } catch {
    return { state: fresh, warning: 'Không đọc được tiến độ đã lưu. Bạn vẫn có thể làm bài; hãy kiểm tra quyền lưu dữ liệu của trình duyệt.' };
  }
}

export function saveState(storage, key, state) {
  try {
    storage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
