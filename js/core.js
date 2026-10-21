export const LETTERS = ['A', 'B', 'C', 'D'];

// The only three-option item explicitly confirmed by the source owner.
export function optionKeys(q) {
  return q.id === 'chuong2-cau88' ? ['A', 'B', 'C'] : [...LETTERS];
}

export function isPlayable(q) {
  return q && typeof q.id === 'string' && [1, 2, 3].includes(q.chapter)
    && Number.isInteger(q.number) && typeof q.question === 'string' && q.question.trim()
    && q.options && Object.keys(q.options).sort().join('') === optionKeys(q).join('')
    && optionKeys(q).every(k => typeof q.options[k] === 'string' && q.options[k].trim())
    && optionKeys(q).includes(q.correctAnswer);
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Relettering "Cả A, B, C" or "các phương án trên" would change its meaning.
export function keepOptionOrder(q) {
  const text = [q.question, ...Object.values(q.options)].join(' ');
  return /\b[A-D]\s*[,/&+]\s*[A-D]\b|\b[A-D]\s+(?:và|hoặc)\s+[A-D]\b|(?:cả|các|phương án|đáp án|câu trả lời)\s+[A-D]\b/iu.test(text)
    || Object.values(q.options).some(t => /(?:trên|dưới)(?:\s|[.,;:!?]|$)/u.test(t));
}

export function selectQuestions(questions, config, wrong = [], bookmarks = [], random = Math.random) {
  const subset = new Set(config.source === 'wrong' ? wrong : bookmarks);
  let pool = questions.filter(isPlayable).filter(q => !config.chapter || q.chapter === Number(config.chapter))
    .filter(q => !['wrong', 'bookmarks'].includes(config.source) || subset.has(q.id));
  if (config.shuffleQuestions) pool = shuffle(pool, random);
  return pool.slice(0, config.count === 'all' ? pool.length : Number(config.count));
}

export function createSession(questions, config, now = Date.now(), random = Math.random) {
  if (!questions.length || questions.some(q => !isPlayable(q))) throw new Error('Không có bộ câu hỏi hợp lệ.');
  const minutes = Number(config.minutes);
  if (config.mode === 'exam' && config.timer && (!Number.isInteger(minutes) || minutes < 1 || minutes > 600)) throw new Error('Thời gian phải từ 1 đến 600 phút.');
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`,
    mode: config.mode === 'exam' ? 'exam' : 'practice',
    questionIds: questions.map(q => q.id),
    optionOrder: Object.fromEntries(questions.map(q => [q.id, config.shuffleAnswers && !keepOptionOrder(q) ? shuffle(optionKeys(q), random) : optionKeys(q)])),
    answers: {}, index: 0, startedAt: now, completedAt: null,
    deadline: config.mode === 'exam' && config.timer ? now + minutes * 60000 : null,
    removeCorrect: Boolean(config.removeCorrect), shuffleAnswers: Boolean(config.shuffleAnswers),
    source: config.source || 'all',
  };
}

export function setAnswer(session, qid, answer, now = Date.now()) {
  if (session.completedAt !== null || !session.questionIds.includes(qid) || !session.optionOrder[qid]?.includes(answer)) return false;
  if (session.deadline !== null && now >= session.deadline) return false;
  if (session.mode === 'practice' && session.answers[qid]) return false;
  session.answers[qid] = answer;
  return true;
}

export function scoreSession(session, bank) {
  let correct = 0, wrong = 0, blank = 0;
  for (const id of session.questionIds) {
    const q = bank.get(id);
    if (!q) throw new Error(`Không tìm thấy câu ${id}.`);
    if (!session.answers[id]) blank++;
    else if (session.answers[id] === q.correctAnswer) correct++;
    else wrong++;
  }
  return { correct, wrong, blank, total: session.questionIds.length, percent: Math.round(correct / session.questionIds.length * 100) };
}

export function updateWrong(wrongIds, id, chosen, correct, removeCorrect) {
  const result = new Set(wrongIds);
  if (chosen && chosen !== correct) result.add(id);
  else if (chosen === correct && removeCorrect) result.delete(id);
  return [...result];
}

export function finishSession(session, bank, wrongIds, now = Date.now()) {
  if (session.completedAt !== null) return { session, wrong: wrongIds };
  const finished = { ...session, answers: { ...session.answers }, completedAt: now };
  let wrong = [...wrongIds];
  for (const id of finished.questionIds) {
    wrong = updateWrong(wrong, id, finished.answers[id], bank.get(id).correctAnswer, finished.removeCorrect);
  }
  return { session: finished, wrong };
}

export function validSession(s, bank) {
  if (!s || typeof s.id !== 'string' || !['practice', 'exam'].includes(s.mode)
    || !Array.isArray(s.questionIds) || !s.questionIds.length || s.questionIds.length > bank.size
    || new Set(s.questionIds).size !== s.questionIds.length
    || !s.questionIds.every(id => bank.has(id))
    || !Number.isInteger(s.index) || s.index < 0 || s.index >= s.questionIds.length
    || !Number.isFinite(s.startedAt) || s.startedAt < 0
    || (s.completedAt !== null && (!Number.isFinite(s.completedAt) || s.completedAt < s.startedAt))
    || (s.deadline !== null && (!Number.isFinite(s.deadline) || s.deadline <= s.startedAt))
    || !s.answers || typeof s.answers !== 'object' || Array.isArray(s.answers)
    || !s.optionOrder || typeof s.optionOrder !== 'object') return false;
  return s.questionIds.every(id => Array.isArray(s.optionOrder[id]) && [...s.optionOrder[id]].sort().join('') === optionKeys(bank.get(id)).join(''))
    && Object.entries(s.answers).every(([id, answer]) => s.questionIds.includes(id) && optionKeys(bank.get(id)).includes(answer));
}
