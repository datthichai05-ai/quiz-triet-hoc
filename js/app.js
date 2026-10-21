import { LETTERS, isPlayable, keepOptionOrder, selectQuestions, createSession, setAnswer, scoreSession, updateWrong, finishSession } from './core.js';
import { emptyState, loadState, saveState } from './storage.js';

const $ = selector => document.querySelector(selector);
const main = $('#main');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = '') => {
  const paths = {
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    book: '<path d="M12 6v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    star: '<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.7l6.4-.9Z"/>',
    repeat: '<path d="M20 7h-5m5 0V2M4 17h5m-5 0v5M4.7 8a8 8 0 0 1 13-3L20 7M4 17l2.3 2a8 8 0 0 0 13-3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
};
const titles = ['Tất cả chương', 'Khái lược về Triết học và Triết học Mác – Lênin', 'Chủ nghĩa duy vật biện chứng', 'Chủ nghĩa duy vật lịch sử'];
const storageKey = `triet-quiz:v1:${new URL('.', location.href).pathname}`;
let storage, bank = new Map(), questions = [], report, state = emptyState();
let page = 'home', lastResult = null, reviewSession = null, reviewIndex = 0, reviewFilter = 'all';
let formSettings = { chapter: 0, mode: 'practice', count: '20', shuffleQuestions: true, shuffleAnswers: false, timer: true, minutes: 20, removeCorrect: true, source: 'all' };
let collection = 'wrong';

function announce(text) { $('#announcer').textContent = text; }
function warning(text) {
  const el = $('#storage-warning');
  el.textContent = text;
  el.hidden = !text;
}
function persist() {
  if (!saveState(storage, storageKey, state)) warning('Trình duyệt không lưu được tiến độ. Hãy cho phép lưu dữ liệu và giữ trang này mở trong khi làm bài.');
}
function focusMain() { main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
function nav(name) {
  $('#nav-review-count').textContent = state.wrong.length;
  document.querySelectorAll('.top-nav button').forEach(button => {
    if (button.dataset.action === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}
function dateText(time) { return new Date(time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }); }
function durationText(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function sourceNotice() {
  return `<details class="data-note"><summary><span class="status-dot"></span>${report.totalQuestions} câu từ PDF · ${questions.length} câu sẵn sàng <span class="detail-chevron">＋</span></summary><div><p>Đã cập nhật theo đính chính được xác nhận:</p><ul><li>Chương 2, câu 88: ba lựa chọn A/B/C, đáp án C; không thêm D.</li><li>Chương 3, câu 157 và 167: đáp án B.</li><li>Chương 1, câu 62: giữ nguyên hai lựa chọn A/B trùng nội dung.</li></ul><a href="./reports/data-validation.md" target="_blank" rel="noopener">Xem báo cáo kiểm tra nguồn ↗</a></div></details>`;
}

function renderHome() {
  page = 'home'; nav('home');
  const completed = state.history.length;
  const latest = state.history[0];
  main.innerHTML = `<section class="hero">
    <div class="hero-copy"><div class="eyebrow"><span class="tiny-line"></span>KHÔNG GIAN ÔN TẬP CỦA BẠN</div>
      <h1>Ôn tập Triết học<br><em>Mác – Lênin</em></h1>
      <p>Đi từ từng câu hỏi đến hiểu rõ bản chất.<br>Luyện tập theo nhịp của bạn, vững vàng hơn mỗi ngày.</p>
      <div class="hero-stats"><div><strong>511</strong><span>câu hỏi gốc</span></div><span class="stat-divider"></span><div><strong>03</strong><span>chương kiến thức</span></div><span class="stat-divider"></span><div><strong>∞</strong><span>lần luyện tập</span></div></div>
    </div>
    <div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-spark spark-one">✦</span><span class="art-spark spark-two">＋</span><div class="art-label">TƯ DUY · HIỂU BIẾT · VẬN DỤNG</div>
      <svg viewBox="0 0 380 270" class="book-art"><ellipse cx="198" cy="234" rx="126" ry="17" fill="#d8ddca" opacity=".5"/><path d="m69 164 133-45 126 46-134 51Z" fill="#e4e7cf" stroke="#294c40" stroke-width="2"/><path d="m69 164 1 22 125 48 132-49 1-20-134 51Z" fill="#f8f7ec" stroke="#294c40" stroke-width="2"/><path d="m77 176 116 44 125-45M78 182l115 44 124-45" fill="none" stroke="#b4bba4"/><path d="m61 137 131-45 129 43-131 50Z" fill="#c7dd90" stroke="#294c40" stroke-width="2"/><path d="m61 137 1 19 128 49 130-49 1-21-131 50Z" fill="#fcfcf4" stroke="#294c40" stroke-width="2"/><path d="m70 148 120 46 122-47" fill="none" stroke="#b4bba4"/><path d="M75 83c45-3 88 12 114 35 33-20 73-27 119-23l-12 59c-45-7-80 1-107 20-31-25-71-37-117-33Z" fill="#fffef5" stroke="#294c40" stroke-width="2"/><path d="M189 118v56M92 100c32 1 61 12 82 27M91 111c31 2 61 12 83 28M90 123c31 2 61 12 84 28M206 127c24-12 53-17 81-16M206 139c24-12 51-16 78-15M205 151c24-12 48-16 76-15" fill="none" stroke="#99a78d" stroke-width="2"/><path d="m242 105-5 36 10-5 8 8 5-42" fill="#bc6849"/><circle cx="190" cy="57" r="26" fill="#244c40"/><text x="190" y="67" fill="#e5edc9" text-anchor="middle" font-family="Georgia,serif" font-size="34">φ</text></svg><span class="art-caption">Một góc nhỏ, một bước tiến.</span>
    </div></section>
    ${state.active ? `<section class="resume-banner"><span class="resume-icon">${icon('clock')}</span><div><strong>Bài học đang chờ bạn</strong><p>${state.active.mode === 'exam' ? 'Thi thử' : 'Luyện tập'} · Đã trả lời ${Object.keys(state.active.answers).length}/${state.active.questionIds.length} câu${state.active.deadline ? ' · Đồng hồ vẫn đang chạy' : ''}</p></div><button class="button primary compact" data-action="resume">Tiếp tục ${icon('arrow')}</button></section>` : ''}
    <div class="home-layout"><section class="setup-card"><div class="section-heading"><div><span class="eyebrow">BẮT ĐẦU MỘT BUỔI HỌC</span><h2>Hôm nay, bạn muốn ôn gì?</h2></div><span class="section-number">01 — 03</span></div>
      <form id="setup-form"><fieldset class="chapter-field"><legend>Chọn nội dung</legend><div class="chapter-grid">
      ${[0, 1, 2, 3].map((ch) => `<label class="chapter-option"><input type="radio" name="chapter" value="${ch}" ${Number(formSettings.chapter) === ch ? 'checked' : ''}><span class="chapter-content"><span class="chapter-top"><span class="chapter-num">${ch ? `0${ch}` : icon('grid')}</span><span class="radio-mark"></span></span><strong>${ch ? `Chương ${ch}` : 'Toàn bộ'}</strong><span class="chapter-description">${ch ? titles[ch] : 'Kết nối kiến thức cả 3 chương'}</span><span class="chapter-count">${[511, 168, 155, 188][ch]} câu hỏi</span></span></label>`).join('')}
      </div></fieldset><fieldset><legend>Cách bạn muốn học</legend><div class="mode-grid">
      <label class="mode-option"><input type="radio" name="mode" value="practice" ${formSettings.mode !== 'exam' ? 'checked' : ''}><span>${icon('book')}<span><strong>Luyện tập</strong><small>Biết đáp án ngay, hiểu từng câu</small></span><span class="radio-mark"></span></span></label>
      <label class="mode-option"><input type="radio" name="mode" value="exam" ${formSettings.mode === 'exam' ? 'checked' : ''}><span>${icon('clock')}<span><strong>Thi thử</strong><small>Thử sức, xem kết quả khi nộp</small></span><span class="radio-mark"></span></span></label></div></fieldset>
      <div class="count-row"><label for="question-count">Số câu mỗi lượt</label><select id="question-count" name="count">${['10', '20', '50', '100', 'all'].map(n => `<option value="${n}" ${String(formSettings.count) === n ? 'selected' : ''}>${n === 'all' ? 'Tất cả câu khả dụng' : `${n} câu`}</option>`).join('')}</select></div>
      <div class="settings-options"><label class="check-label"><input type="checkbox" name="shuffleQuestions" ${formSettings.shuffleQuestions ? 'checked' : ''}><span>Xáo trộn câu hỏi</span></label><label class="check-label"><input type="checkbox" name="shuffleAnswers" ${formSettings.shuffleAnswers ? 'checked' : ''}><span>Xáo trộn đáp án</span></label></div>
      <div id="exam-settings" class="exam-settings" ${formSettings.mode !== 'exam' ? 'hidden' : ''}><label class="check-label"><input type="checkbox" name="timer" ${formSettings.timer ? 'checked' : ''}><span>Giới hạn thời gian</span></label><label class="time-label"><input name="minutes" type="number" min="1" max="600" step="1" value="${Number(formSettings.minutes) || 20}" ${!formSettings.timer || formSettings.mode !== 'exam' ? 'disabled' : ''} aria-label="Số phút làm bài"> phút</label><p>Hết giờ, bài được tự động nộp. Đồng hồ tiếp tục chạy khi bạn rời trang.</p></div>
      <label class="check-label remove-setting"><input type="checkbox" name="removeCorrect" ${formSettings.removeCorrect ? 'checked' : ''}><span>Xóa khỏi danh sách câu sai khi trả lời đúng</span></label>
      <div class="start-row"><span id="selection-summary" class="muted"></span><button type="submit" class="button primary">Bắt đầu học ${icon('arrow')}</button></div></form>
    </section><aside class="study-sidebar"><section class="progress-card"><div class="card-heading">${icon('star')}<h2>Góc học tập</h2></div><p class="muted">Mỗi lần ôn là một lần nhớ lâu hơn.</p><div class="learning-stats"><div><strong>${completed}</strong><span>bài đã hoàn thành</span></div><span class="small-sprout" aria-hidden="true">↗</span></div><button class="collection-row" data-action="review"><span>${icon('repeat')}Câu từng làm sai</span><strong>${state.wrong.length} <span>→</span></strong></button><button class="collection-row" data-action="bookmarks"><span>${icon('star')}Câu đã đánh dấu</span><strong>${state.bookmarks.length} <span>→</span></strong></button>${latest ? `<div class="latest-result"><span>Lần gần nhất</span><strong>${scoreSession(latest, bank).percent}%</strong><small>${dateText(latest.completedAt)}</small></div>` : '<div class="little-note">Hành trình của bạn bắt đầu<br>từ câu hỏi đầu tiên.</div>'}</section>
      <section class="tip-card"><span class="eyebrow">MỘT GỢI Ý NHỎ</span><h3>Đều đặn hơn,<br>hiệu quả hơn.</h3><p>Bắt đầu với 20 câu mỗi ngày.<br>Đánh dấu điều chưa rõ và quay lại khi bạn sẵn sàng.</p><span class="tip-decoration" aria-hidden="true">✳</span></section><div class="privacy-note">${icon('shield')}<span>Không cần tài khoản.<br>Tiến độ chỉ lưu trên trình duyệt này.</span></div></aside></div>
    ${sourceNotice()}`;
  $('#setup-form').addEventListener('change', updateSettings);
  $('#setup-form').addEventListener('submit', event => { event.preventDefault(); startFromForm(); });
  updateSelectionSummary();
}

function readSettings() {
  const data = new FormData($('#setup-form'));
  return { chapter: Number(data.get('chapter')), mode: data.get('mode'), count: data.get('count'),
    shuffleQuestions: data.has('shuffleQuestions'), shuffleAnswers: data.has('shuffleAnswers'),
    timer: data.has('timer'), minutes: Number($('#setup-form [name="minutes"]').value),
    removeCorrect: data.has('removeCorrect'), source: 'all' };
}
function updateSettings() {
  formSettings = readSettings(); state.settings = formSettings; persist();
  $('#exam-settings').hidden = formSettings.mode !== 'exam';
  $('#setup-form [name="minutes"]').disabled = formSettings.mode !== 'exam' || !formSettings.timer;
  updateSelectionSummary();
}
function updateSelectionSummary() {
  const n = selectQuestions(questions, formSettings, state.wrong, state.bookmarks).length;
  $('#selection-summary').textContent = `${n} câu · ${formSettings.mode === 'exam' ? 'Sẵn sàng thử sức' : 'Theo nhịp của bạn'}`;
}

function confirmAction(title, description, label = 'Xác nhận', cancel = 'Quay lại') {
  const dialog = $('#confirm-dialog');
  if (dialog.open) return Promise.resolve(false);
  $('#dialog-title').textContent = title;
  $('#dialog-description').textContent = description;
  $('#dialog-confirm').textContent = label;
  dialog.querySelector('[value="cancel"]').textContent = cancel;
  dialog.returnValue = 'cancel';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}
async function launch(selected, config) {
  if (!selected.length) { announce('Chưa có câu hỏi trong danh sách này.'); return; }
  if (state.active && !await confirmAction('Bắt đầu bài mới?', 'Bài đang làm sẽ được thay thế. Các câu sai, đánh dấu và kết quả đã hoàn thành vẫn được lưu.', 'Bắt đầu bài mới', 'Giữ bài đang làm')) return;
  try { state.active = createSession(selected, config); }
  catch (error) { announce(error.message); return; }
  persist(); renderQuiz(); focusMain();
}
function startFromForm() {
  updateSettings();
  launch(selectQuestions(questions, formSettings, state.wrong, state.bookmarks), formSettings);
}

function renderQuiz() {
  const reviewing = page === 'review-session';
  const s = reviewing ? reviewSession : state.active;
  if (!s) { renderHome(); return; }
  if (!reviewing) page = 'quiz';
  nav('');
  const index = reviewing ? reviewIndex : s.index;
  const id = s.questionIds[index], q = bank.get(id), selected = s.answers[id];
  const reveal = reviewing || (s.mode === 'practice' && Boolean(selected));
  const done = Object.keys(s.answers).length;
  const marked = state.bookmarks.includes(id);
  const order = s.optionOrder[id];
  const chosenLabel = selected ? LETTERS[order.indexOf(selected)] : null;
  const correctLabel = reveal ? LETTERS[order.indexOf(q.correctAnswer)] : null;
  const answeredCorrectly = reveal && selected === q.correctAnswer;
  const answerSource = report.userCorrections?.questions?.[id]?.correctAnswer
    ? 'Đáp án theo đính chính đã xác nhận.'
    : `Đáp án theo bảng gợi ý của chương ${q.chapter} trong PDF.`;
  const score = (s.mode === 'practice' || reviewing) ? scoreSession(s, bank) : null;
  const visibleIndices = s.questionIds.map((qid, i) => ({ qid, i })).filter(({ qid }) => !reviewing || reviewFilter === 'all' || (reviewFilter === 'wrong' ? s.answers[qid] && s.answers[qid] !== bank.get(qid).correctAnswer : !s.answers[qid]));
  main.innerHTML = `<div class="workspace-heading"><button class="text-button" data-action="${reviewing ? 'back-result' : 'home'}">← ${reviewing ? 'Kết quả bài làm' : 'Về tổng quan'}</button><span class="workspace-badge">${icon(reviewing ? 'check' : s.mode === 'exam' ? 'clock' : 'book')}${reviewing ? 'Xem lại bài làm' : s.mode === 'exam' ? 'Chế độ thi thử' : 'Chế độ luyện tập'}</span></div>
    <div class="quiz-layout"><section class="question-panel"><div class="quiz-progress"><div><strong>Câu ${index + 1}<span> / ${s.questionIds.length}</span></strong><span>${done} câu đã trả lời</span></div><progress value="${done}" max="${s.questionIds.length}" aria-label="Tiến độ trả lời">${done}/${s.questionIds.length}</progress></div>
      <div class="question-top"><span class="eyebrow">CHƯƠNG ${q.chapter} <span>·</span> CÂU ${q.number} TRONG TÀI LIỆU</span><button class="bookmark-button ${marked ? 'is-marked' : ''}" data-action="bookmark" aria-pressed="${marked}" aria-label="${marked ? 'Bỏ đánh dấu câu này' : 'Đánh dấu để ôn lại'}" title="Đánh dấu câu">${icon('star')}<span>${marked ? 'Đã đánh dấu' : 'Đánh dấu'}</span></button></div>
      <h1 id="question-title" class="question-title" tabindex="-1">${escape(q.question)}</h1>
      <p class="answer-instruction">${reviewing ? 'Đối chiếu câu trả lời với bảng đáp án của tài liệu.' : s.mode === 'practice' ? 'Chọn một đáp án. Bạn sẽ nhận phản hồi ngay.' : 'Chọn một đáp án. Bạn có thể thay đổi trước khi nộp bài.'}</p>
      <div class="answers" role="group" aria-labelledby="question-title">${order.map((original, i) => {
        const correct = reveal && original === q.correctAnswer;
        const incorrect = reveal && selected === original && !correct;
        const active = selected === original;
        const textStatus = correct ? 'Đáp án đúng' : incorrect ? 'Bạn đã chọn · Chưa đúng' : active ? 'Đã chọn' : '';
        return `<button type="button" class="answer ${correct ? 'correct' : incorrect ? 'incorrect' : active ? 'selected' : ''}" data-answer="${original}" aria-pressed="${active}" ${reviewing || (s.mode === 'practice' && selected) ? 'disabled' : ''}><span class="answer-letter">${LETTERS[i]}</span><span class="answer-copy">${escape(q.options[original])}${textStatus ? `<span class="answer-status">${textStatus}</span>` : ''}</span><span class="answer-end">${correct ? icon('check') : incorrect ? icon('close') : active ? '<span class="selected-dot"></span>' : ''}</span></button>`;
      }).join('')}</div>
      ${reveal ? `<div class="answer-feedback ${answeredCorrectly ? 'success' : 'needs-review'}">${icon(answeredCorrectly ? 'check' : 'book')}<div><strong>${answeredCorrectly ? 'Chính xác!' : selected ? `Chưa đúng. Đáp án đúng là ${correctLabel}.` : `Bạn đã bỏ trống. Đáp án đúng là ${correctLabel}.`}</strong><p>${selected ? `Bạn chọn ${chosenLabel}. ` : ''}${answerSource}</p></div></div>` : ''}
      ${s.shuffleAnswers && keepOptionOrder(q) ? '<p class="option-note">Câu này giữ thứ tự đáp án vì nội dung có tham chiếu chữ cái hoặc vị trí lựa chọn.</p>' : ''}
      <div class="question-actions"><button class="button secondary" data-action="prev" ${index === 0 ? 'disabled' : ''}>← Câu trước</button><span class="keyboard-hint">Phím 1–${order.length} để chọn<br>← → để chuyển câu</span>${index < s.questionIds.length - 1 ? '<button class="button primary" data-action="next">Câu tiếp theo →</button>' : reviewing ? '<button class="button primary" data-action="back-result">Về kết quả</button>' : `<button class="button primary" data-action="submit">${s.mode === 'exam' ? 'Nộp bài' : 'Kết thúc luyện tập'} ${icon('check')}</button>`}</div>
    </section><aside class="quiz-sidebar">${!reviewing && s.mode === 'exam' && s.deadline ? `<section class="timer-card">${icon('clock')}<div><span>THỜI GIAN CÒN LẠI</span><strong id="timer" role="timer" aria-live="off">${durationText((s.deadline - Date.now()) / 1000)}</strong></div></section>` : ''}
      <section class="navigator-card"><div class="card-heading">${icon('grid')}<h2>${reviewing ? 'Xem từng câu' : 'Bản đồ câu hỏi'}</h2></div><div class="quiz-stats"><div><strong>${done}</strong><span>đã làm</span></div><div><strong>${s.questionIds.length - done}</strong><span>chưa làm</span></div>${score ? `<div class="green"><strong>${score.correct}</strong><span>câu đúng</span></div>` : ''}</div>
      ${reviewing ? `<label class="filter-label">Hiển thị <select id="review-filter"><option value="all" ${reviewFilter === 'all' ? 'selected' : ''}>Tất cả</option><option value="wrong" ${reviewFilter === 'wrong' ? 'selected' : ''}>Câu sai</option><option value="blank" ${reviewFilter === 'blank' ? 'selected' : ''}>Bỏ trống</option></select></label>` : ''}
      <nav class="question-grid" aria-label="Chuyển đến câu hỏi">${visibleIndices.map(({ qid, i }) => {
        const answer = s.answers[qid];
        const show = reviewing || s.mode === 'practice';
        const status = !answer ? 'unanswered' : show ? answer === bank.get(qid).correctAnswer ? 'right' : 'wrong' : 'answered';
        const label = !answer ? 'chưa làm' : show ? status === 'right' ? 'đúng' : 'sai' : 'đã làm';
        return `<button class="question-number ${status} ${state.bookmarks.includes(qid) ? 'flagged' : ''}" data-jump="${i}" ${i === index ? 'aria-current="step"' : ''} aria-label="Câu ${i + 1}, ${label}${state.bookmarks.includes(qid) ? ', đã đánh dấu' : ''}">${i + 1}${state.bookmarks.includes(qid) ? '<span aria-hidden="true">•</span>' : ''}</button>`;
      }).join('') || '<p class="muted grid-empty">Không có câu nào.</p>'}</nav><div class="grid-legend"><span><i class="legend-dot done"></i>Đã làm</span><span><i class="legend-dot"></i>Chưa làm</span><span><i class="legend-mark">•</i>Đánh dấu</span></div>
      ${!reviewing ? `<button class="button primary full" data-action="submit">${s.mode === 'exam' ? 'Nộp bài thi' : 'Kết thúc luyện tập'} ${icon('arrow')}</button><p class="autosave-note">${icon('shield')}Tự động lưu sau mỗi thao tác</p>` : ''}</section>
      <p class="sidebar-tip">${reviewing ? 'Bạn có thể quay lại luyện tập những câu đã làm sai.' : s.mode === 'exam' ? 'Cứ bình tĩnh. Đáp án sẽ hiển thị sau khi bạn nộp bài.' : 'Chưa chắc ở câu nào? Đánh dấu lại để dành thêm thời gian cho câu đó.'}</p></aside></div>`;
  $('#review-filter')?.addEventListener('change', event => { reviewFilter = event.target.value; renderQuiz(); $('#review-filter').focus(); });
}

function choose(answer) {
  if (page !== 'quiz' || !state.active) return;
  if (expireSession()) return;
  const s = state.active, id = s.questionIds[s.index], q = bank.get(id);
  if (!setAnswer(s, id, answer)) return;
  if (s.mode === 'practice') state.wrong = updateWrong(state.wrong, id, answer, q.correctAnswer, s.removeCorrect);
  persist(); renderQuiz();
  if (s.mode === 'practice') {
    announce(answer === q.correctAnswer ? 'Chính xác!' : `Chưa đúng. Đáp án đúng là ${LETTERS[s.optionOrder[id].indexOf(q.correctAnswer)]}.`);
    main.querySelector('[data-action="next"], .question-actions [data-action="submit"]')?.focus({ preventScroll: true });
  } else {
    main.querySelector(`[data-answer="${answer}"]`)?.focus({ preventScroll: true });
    announce('Đã lưu lựa chọn.');
  }
}
function jump(index) {
  const s = page === 'review-session' ? reviewSession : state.active;
  if (!s || index < 0 || index >= s.questionIds.length) return;
  if (page === 'review-session') reviewIndex = index;
  else { s.index = index; persist(); }
  renderQuiz(); $('#question-title').focus({ preventScroll: true });
  if (window.innerWidth < 900) window.scrollTo({ top: 0, behavior: 'instant' });
}
async function submit() {
  const s = state.active;
  if (!s || expireSession()) return;
  const blank = s.questionIds.length - Object.keys(s.answers).length;
  const ok = await confirmAction(s.mode === 'exam' ? 'Sẵn sàng nộp bài?' : 'Kết thúc buổi luyện tập?', blank ? `Bạn còn ${blank} câu chưa trả lời. Câu bỏ trống không được tính đúng. Bạn có thể xem lại toàn bộ bài sau khi nộp.` : 'Bạn đã trả lời tất cả câu hỏi. Kết quả và bài làm sẽ được lưu trong lịch sử.', 'Nộp và xem kết quả', 'Tiếp tục làm');
  if (ok && state.active?.id === s.id) complete();
}
function complete(expired = false) {
  if (!state.active) return;
  const result = finishSession(state.active, bank, state.wrong, expired ? state.active.deadline : Date.now());
  state.wrong = result.wrong;
  lastResult = result.session;
  state.history = [lastResult, ...state.history.filter(s => s.id !== lastResult.id)].slice(0, 50);
  state.active = null; persist();
  renderResult(lastResult, expired); focusMain();
  if (expired) announce('Đã hết giờ. Bài thi đã được tự động nộp.');
}
function expireSession() {
  if (state.active?.deadline && Date.now() >= state.active.deadline) {
    if ($('#confirm-dialog').open) $('#confirm-dialog').close('cancel');
    complete(true); return true;
  }
  return false;
}

function renderResult(s = lastResult, expired = false) {
  if (!s) { renderHome(); return; }
  page = 'result'; lastResult = s; nav('history');
  const score = scoreSession(s, bank);
  const time = durationText((s.completedAt - s.startedAt) / 1000);
  main.innerHTML = `<div class="workspace-heading"><button class="text-button" data-action="home">← Về tổng quan</button><span class="workspace-badge">${icon('check')}Đã lưu vào lịch sử</span></div><section class="result-card"><div class="result-top"><span class="eyebrow">${expired ? 'HẾT THỜI GIAN · ĐÃ TỰ ĐỘNG NỘP' : 'MỘT BƯỚC TIẾN MỚI'}</span><h1>${score.percent === 100 ? 'Một bài làm trọn vẹn!' : 'Bạn đã hoàn thành bài học.'}</h1><p>Ghi nhận điều đã biết. Dành thêm một chút thời gian cho điều chưa rõ.</p></div><div class="result-body"><div class="score-circle" style="--score:${score.percent}%"><div><strong>${score.percent}<span>%</span></strong><span>tỉ lệ trả lời đúng</span></div></div><div class="result-details"><div class="result-numbers"><div class="green"><strong>${score.correct}</strong><span>Đúng</span></div><div class="red"><strong>${score.wrong}</strong><span>Sai</span></div><div><strong>${score.blank}</strong><span>Bỏ trống</span></div></div><p>${s.mode === 'exam' ? 'Thi thử' : 'Luyện tập'} · ${score.total} câu · ${time}</p><small>${dateText(s.completedAt)} · Chấm theo tài liệu và đính chính đã xác nhận</small></div></div><div class="result-actions"><button class="button primary" data-action="inspect-result">Xem lại bài làm ${icon('arrow')}</button><button class="button secondary" data-action="retry-wrong" ${!score.wrong ? 'disabled' : ''}>${icon('repeat')}Ôn ${score.wrong} câu sai</button><button class="text-button" data-action="retry">Làm lại bộ câu này</button></div></section>${sourceNotice()}`;
}

function renderHistory() {
  page = 'history'; nav('history');
  main.innerHTML = `<section class="page-heading"><span class="eyebrow">NHÌN LẠI HÀNH TRÌNH</span><h1>Lịch sử học tập</h1><p>${state.history.length} bài đã hoàn thành. Lưu tối đa 50 bài gần nhất trên trình duyệt này.</p></section><section class="history-card">${state.history.length ? `<div class="history-list">${state.history.map(s => { const score = scoreSession(s, bank); return `<button class="history-row" data-history="${escape(s.id)}"><span class="history-icon">${icon(s.mode === 'exam' ? 'clock' : 'book')}</span><span class="history-name"><strong>${s.mode === 'exam' ? 'Thi thử' : 'Luyện tập'} · ${score.total} câu</strong><small>${dateText(s.completedAt)}</small></span><span class="history-breakdown">${score.correct} đúng · ${score.wrong} sai · ${score.blank} trống</span><strong class="history-score">${score.percent}%</strong>${icon('arrow')}</button>`; }).join('')}</div>` : `<div class="empty-state">${icon('book')}<h2>Trang đầu tiên đang chờ bạn</h2><p>Hoàn thành một bài luyện tập hoặc thi thử để xem kết quả tại đây.</p><button class="button primary" data-action="home">Bắt đầu học ${icon('arrow')}</button></div>`}</section>`;
}
function renderCollection(type = collection) {
  collection = type; page = 'review'; nav('review');
  const ids = state[type];
  main.innerHTML = `<section class="page-heading"><span class="eyebrow">DÀNH THÊM MỘT CHÚT THỜI GIAN</span><h1>Câu cần ôn lại</h1><p>Một lần chưa đúng là một cơ hội để hiểu rõ hơn.</p></section><section class="collection-card"><div class="collection-toolbar"><div class="collection-tabs"><button data-action="review" aria-pressed="${type === 'wrong'}">${icon('repeat')}Câu từng làm sai <span>${state.wrong.length}</span></button><button data-action="bookmarks" aria-pressed="${type === 'bookmarks'}">${icon('star')}Đã đánh dấu <span>${state.bookmarks.length}</span></button></div>${ids.length ? '<button class="button primary compact" data-action="practice-collection">Luyện danh sách này →</button>' : ''}</div>
      ${ids.length ? `<div class="collection-settings"><label class="check-label"><input id="collection-remove" type="checkbox" ${formSettings.removeCorrect ? 'checked' : ''}>Xóa khỏi danh sách câu sai khi trả lời đúng</label><small>Luyện tập toàn bộ ${ids.length} câu trong danh sách, xáo trộn câu hỏi.</small></div><div class="collection-list">${ids.map(id => { const q = bank.get(id); return `<article class="collection-item"><div><span class="eyebrow">CHƯƠNG ${q.chapter} · CÂU ${q.number}</span><p>${escape(q.question)}</p></div>${type === 'bookmarks' ? `<button class="icon-button" data-unmark="${id}" aria-label="Bỏ đánh dấu chương ${q.chapter} câu ${q.number}" title="Bỏ đánh dấu">${icon('star')}</button>` : ''}</article>`; }).join('')}</div>` : `<div class="empty-state">${icon(type === 'wrong' ? 'check' : 'star')}<h2>${type === 'wrong' ? 'Chưa có câu nào cần luyện lại' : 'Giữ lại những câu bạn muốn hiểu thêm'}</h2><p>${type === 'wrong' ? 'Câu trả lời sai sẽ được lưu vào đây sau khi chấm.' : 'Nhấn biểu tượng ngôi sao khi làm bài để đánh dấu câu hỏi.'}</p><button class="button secondary" data-action="home">Về trang ôn tập →</button></div>`}</section>`;
}

const actions = {
  home: () => { renderHome(); focusMain(); },
  review: () => { renderCollection('wrong'); focusMain(); },
  bookmarks: () => { renderCollection('bookmarks'); focusMain(); },
  history: () => { renderHistory(); focusMain(); },
  resume: () => { if (!expireSession()) { page = 'quiz'; renderQuiz(); focusMain(); } },
  prev: () => jump((page === 'review-session' ? reviewIndex : state.active.index) - 1),
  next: () => jump((page === 'review-session' ? reviewIndex : state.active.index) + 1),
  bookmark: () => {
    const s = page === 'review-session' ? reviewSession : state.active;
    const id = s.questionIds[page === 'review-session' ? reviewIndex : s.index];
    if (state.bookmarks.includes(id)) state.bookmarks = state.bookmarks.filter(item => item !== id);
    else state.bookmarks.push(id);
    persist(); renderQuiz(); $('.bookmark-button').focus({ preventScroll: true });
    announce(state.bookmarks.includes(id) ? 'Đã đánh dấu câu hỏi.' : 'Đã bỏ đánh dấu.');
  },
  submit,
  'back-result': () => { renderResult(); focusMain(); },
  'inspect-result': () => { reviewSession = lastResult; reviewIndex = 0; reviewFilter = 'all'; page = 'review-session'; renderQuiz(); focusMain(); },
  'retry-wrong': () => {
    const chosen = lastResult.questionIds.filter(id => lastResult.answers[id] && lastResult.answers[id] !== bank.get(id).correctAnswer).map(id => bank.get(id));
    launch(chosen, { ...formSettings, mode: 'practice', source: 'wrong', timer: false });
  },
  retry: () => launch(lastResult.questionIds.map(id => bank.get(id)), { ...formSettings, mode: lastResult.mode, source: lastResult.source, shuffleAnswers: lastResult.shuffleAnswers, removeCorrect: lastResult.removeCorrect, timer: Boolean(lastResult.deadline), minutes: lastResult.deadline ? (lastResult.deadline - lastResult.startedAt) / 60000 : 20 }),
  'practice-collection': () => {
    const config = { ...formSettings, chapter: 0, mode: 'practice', count: 'all', shuffleQuestions: true, source: collection, removeCorrect: $('#collection-remove').checked };
    launch(selectQuestions(questions, config, state.wrong, state.bookmarks), config);
  },
  reload: () => location.reload(),
};
document.addEventListener('click', event => {
  if (event.target.closest('.brand') && bank.size && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault(); actions.home(); return;
  }
  const button = event.target.closest('button');
  if (!button || button.disabled || $('#confirm-dialog').contains(button)) return;
  if (button.dataset.action && actions[button.dataset.action]) actions[button.dataset.action]();
  else if (button.dataset.answer) choose(button.dataset.answer);
  else if (button.dataset.jump !== undefined) jump(Number(button.dataset.jump));
  else if (button.dataset.history) { renderResult(state.history.find(s => s.id === button.dataset.history)); focusMain(); }
  else if (button.dataset.unmark) {
    state.bookmarks = state.bookmarks.filter(id => id !== button.dataset.unmark); persist(); renderCollection();
    announce('Đã bỏ đánh dấu.');
  }
});
document.addEventListener('keydown', event => {
  if (!['quiz', 'review-session'].includes(page) || $('#confirm-dialog').open || event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input, select, textarea') || event.target.isContentEditable) return;
  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); actions[event.key === 'ArrowLeft' ? 'prev' : 'next'](); }
  else if (/^[1-4]$/.test(event.key) && page === 'quiz') {
    event.preventDefault(); const s = state.active; choose(s.optionOrder[s.questionIds[s.index]][Number(event.key) - 1]);
  }
});
setInterval(() => {
  if (expireSession()) return;
  const timer = $('#timer');
  if (timer && state.active?.deadline) {
    const seconds = (state.active.deadline - Date.now()) / 1000;
    timer.textContent = durationText(seconds);
    timer.closest('.timer-card').classList.toggle('urgent', seconds <= 60);
  }
}, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) expireSession(); });

async function boot() {
  try {
    const responses = await Promise.all([fetch('./questions.json'), fetch('./reports/data-validation.json')]);
    if (responses.some(response => !response.ok)) throw new Error('Không tải được tệp câu hỏi hoặc báo cáo.');
    const [allQuestions, audit] = await Promise.all(responses.map(response => response.json()));
    if (!Array.isArray(allQuestions) || allQuestions.length !== 511 || new Set(allQuestions.map(q => q.id)).size !== 511) throw new Error('Ngân hàng câu hỏi không đủ 511 ID duy nhất.');
    report = audit;
    const excluded = new Set(report.excludedIds);
    const globalErrors = report.issues.some(issue => issue.severity === 'error' && !issue.id);
    if (globalErrors || !report.checks.chapterTablesAgree) throw new Error('Dữ liệu không vượt qua kiểm tra cấu trúc hoặc đối chiếu bảng đáp án.');
    questions = allQuestions.filter(q => isPlayable(q) && !excluded.has(q.id));
    if (questions.length !== report.playableCount || questions.length === 0) throw new Error('Số câu hợp lệ không khớp báo cáo nguồn.');
    bank = new Map(questions.map(q => [q.id, q]));
    try { storage = window.localStorage; } catch { storage = null; }
    const restored = loadState(storage, storageKey, bank);
    state = restored.state; warning(restored.warning);
    document.querySelectorAll('.top-nav button').forEach(button => { button.disabled = false; });
    formSettings = { ...formSettings, ...state.settings };
    if (!['10', '20', '50', '100', 'all'].includes(String(formSettings.count))) formSettings.count = '20';
    if (![0, 1, 2, 3].includes(Number(formSettings.chapter))) formSettings.chapter = 0;
    if (expireSession()) return;
    if (state.active) { renderQuiz(); announce('Đã khôi phục bài đang làm.'); }
    else renderHome();
  } catch (error) {
    main.innerHTML = `<section class="empty-state load-error">${icon('book')}<h1>Chưa mở được bộ câu hỏi</h1><p>${escape(error.message)}</p><p>Nếu đang mở tệp trực tiếp, hãy chạy máy chủ cục bộ theo README hoặc truy cập link GitHub Pages.</p><button class="button primary" data-action="reload">Thử tải lại</button></section>`;
  }
}
boot();
