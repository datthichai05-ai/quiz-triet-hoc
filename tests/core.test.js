import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LETTERS, isPlayable, shuffle, keepOptionOrder, selectQuestions, createSession, setAnswer, scoreSession, updateWrong, finishSession, validSession } from '../js/core.js';
import { emptyState, loadState, saveState } from '../js/storage.js';

const all = JSON.parse(readFileSync(new URL('../questions.json', import.meta.url)));
const questions = all.filter(isPlayable);
const bank = new Map(questions.map(q => [q.id, q]));
const base = { mode: 'practice', chapter: 0, source: 'all', count: '20', shuffleQuestions: false, shuffleAnswers: false, timer: false, removeCorrect: true };
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }; };
const wrongFor = q => LETTERS.find(k => k !== q.correctAnswer);

test('511 câu khả dụng theo nguồn và đính chính, không thêm lựa chọn D cho câu 88', () => {
  assert.equal(all.length, 511);
  assert.equal(new Set(all.map(q => q.id)).size, 511);
  for (const [chapter, expected] of [[1, 168], [2, 155], [3, 188]]) {
    const group = all.filter(q => q.chapter === chapter);
    assert.equal(group.length, expected);
    assert.deepEqual(group.map(q => q.number), Array.from({ length: expected }, (_, i) => i + 1));
    for (const q of group) {
      assert.equal(q.id, `chuong${chapter}-cau${q.number}`);
      assert.equal(q.question, q.question.normalize('NFC'));
      assert.ok(!/[\r\n\ufffd]|\(cid:/.test(q.question));
    }
  }
  assert.equal(questions.length, 511);
  assert.deepEqual(all.filter(q => !isPlayable(q)), []);
  assert.equal(Object.hasOwn(all.find(q => q.id === 'chuong2-cau88').options, 'D'), false);
  assert.equal(all.find(q => q.id === 'chuong3-cau157').correctAnswer, 'B');
  assert.equal(all.find(q => q.id === 'chuong3-cau167').correctAnswer, 'B');
  const duplicate = all.find(q => q.id === 'chuong1-cau62');
  assert.equal(duplicate.options.A, duplicate.options.B);
});

test('Mọi đáp án đã gán khớp các dòng bằng chứng của đúng chương, báo cáo công khai lỗi nguồn', () => {
  const evidence = JSON.parse(readFileSync(new URL('../reports/source-map.json', import.meta.url)));
  const audit = JSON.parse(readFileSync(new URL('../reports/data-validation.json', import.meta.url)));
  const corrections = JSON.parse(readFileSync(new URL('../data/corrections.json', import.meta.url)));
  assert.equal(corrections.sourceSha256, evidence.sourceSha256);
  for (const q of all) {
    const rows = evidence.answerRows.filter(row => row.chapter === q.chapter && row.number === q.number);
    assert.ok(evidence.questionPages[q.id].length);
    if (q.id === 'chuong3-cau157') {
      assert.equal(rows.length, 0); // Do not fabricate a PDF answer row.
      assert.equal(q.correctAnswer, corrections.questions[q.id].correctAnswer);
    }
    else { assert.ok(rows.length); assert.ok(rows.every(row => row.answer === q.correctAnswer)); }
  }
  assert.equal(audit.checks.chapterTablesAgree, true);
  assert.equal(audit.strictValid, true);
  assert.equal(audit.sourcePdfStrictValid, false);
  assert.equal(audit.checks.fourOptions, false);
  assert.equal(audit.checks.approvedOptionSets, true);
  assert.equal(audit.uniqueAnswerCount, 510);
  assert.deepEqual(audit.issues.filter(i => i.severity === 'error'), []);
  assert.equal(audit.playableCount, 511);
});

test('Chọn đúng chương, số câu, danh sách sai và dấu sao, giữ thứ tự khi tắt xáo trộn', () => {
  const chapter2 = selectQuestions(all, { ...base, chapter: 2, count: 'all' });
  assert.equal(chapter2.length, 155);
  assert.ok(chapter2.every(q => q.chapter === 2));
  assert.deepEqual(selectQuestions(all, base), questions.slice(0, 20));
  for (const count of [10, 20, 50, 100]) assert.equal(selectQuestions(all, { ...base, count }).length, count);
  const ids = [questions[1].id, questions[4].id];
  assert.deepEqual(selectQuestions(all, { ...base, source: 'wrong' }, ids).map(q => q.id), ids);
  assert.deepEqual(selectQuestions(all, { ...base, source: 'bookmarks' }, [], ids).map(q => q.id), ids);
  assert.equal(selectQuestions(all, { ...base, source: 'wrong' }, []).length, 0);
});

test('Fisher–Yates giữ toàn bộ phần tử, không sửa mảng nguồn, xáo câu trước khi lấy mẫu', () => {
  const input = [1, 2, 3, 4, 5];
  assert.deepEqual(shuffle(input, () => 0), [2, 3, 4, 5, 1]);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  const selected = selectQuestions(all, { ...base, shuffleQuestions: true, count: '10' }, [], [], () => 0);
  assert.equal(new Set(selected.map(q => q.id)).size, 10);
  assert.notEqual(selected[0].id, questions[0].id);
});

test('Xáo đáp án chấm theo nội dung gốc; khóa câu tham chiếu chữ cái hoặc vị trí', () => {
  const safe = questions.find(q => !keepOptionOrder(q) && q.correctAnswer === 'A');
  const referenced = questions.find(q => keepOptionOrder(q));
  const s = createSession([safe, referenced], { ...base, shuffleAnswers: true }, 1000, () => 0);
  assert.deepEqual(s.optionOrder[safe.id], ['B', 'C', 'D', 'A']);
  assert.deepEqual(s.optionOrder[referenced.id], LETTERS);
  const displayD = s.optionOrder[safe.id][3];
  assert.ok(setAnswer(s, safe.id, displayD, 2000));
  assert.equal(scoreSession(s, bank).correct, 1);
  assert.equal(safe.options[displayD], safe.options.A);
  assert.equal(keepOptionOrder({ question: '', options: { A: 'Cả A, B, C' } }), true);
  assert.equal(keepOptionOrder({ question: '', options: { A: 'Tất cả các phương án trên' } }), true);
  assert.equal(keepOptionOrder({ question: 'C. Mác là ai?', options: { A: 'A. Xmít', B: 'C. Mác' } }), false);
});

test('Luyện tập khóa lần trả lời đầu; thi thử cho đổi; nộp rồi khóa', () => {
  const q = questions[0];
  const p = createSession([q], base, 1000);
  assert.equal(setAnswer(p, q.id, wrongFor(q), 2000), true);
  assert.equal(setAnswer(p, q.id, q.correctAnswer, 3000), false);
  const e = createSession([q], { ...base, mode: 'exam' }, 1000);
  assert.equal(setAnswer(e, q.id, wrongFor(q), 2000), true);
  assert.equal(setAnswer(e, q.id, q.correctAnswer, 3000), true);
  const completed = finishSession(e, bank, [], 4000).session;
  assert.equal(setAnswer(completed, q.id, wrongFor(q), 5000), false);
});

test('Chấm đúng/sai/trống, % trên tổng số câu, không làm lẫn câu trùng số giữa các chương', () => {
  const group = [bank.get('chuong1-cau1'), bank.get('chuong2-cau1'), bank.get('chuong3-cau1')];
  const s = createSession(group, { ...base, mode: 'exam' }, 1000);
  setAnswer(s, group[0].id, group[0].correctAnswer, 2000);
  setAnswer(s, group[1].id, wrongFor(group[1]), 2000);
  assert.deepEqual(scoreSession(s, bank), { correct: 1, wrong: 1, blank: 1, total: 3, percent: 33 });
  const result = finishSession(s, bank, [], 3000);
  assert.deepEqual(result.wrong, [group[1].id]);
  assert.equal(s.completedAt, null);
  assert.equal(result.session.completedAt, 3000);
});

test('Ôn sai nhiều lần; chỉ xóa sau trả lời đúng nếu bật; không tự thêm câu bỏ trống', () => {
  const q = questions[0], chosen = wrongFor(q);
  let wrong = updateWrong([], q.id, chosen, q.correctAnswer, true);
  wrong = updateWrong(wrong, q.id, chosen, q.correctAnswer, true);
  assert.deepEqual(wrong, [q.id]);
  assert.deepEqual(updateWrong(wrong, q.id, q.correctAnswer, q.correctAnswer, false), wrong);
  assert.deepEqual(updateWrong(wrong, q.id, undefined, q.correctAnswer, true), wrong);
  assert.deepEqual(updateWrong(wrong, q.id, q.correctAnswer, q.correctAnswer, true), []);
});

test('Lưu và tải lại giữ đáp án, hoán vị, vị trí, dấu sao, lịch sử và mốc hết giờ', () => {
  const store = memory(), state = emptyState();
  state.active = createSession(questions.slice(0, 3), { ...base, mode: 'exam', timer: true, minutes: 2, shuffleAnswers: true }, 1000, () => .2);
  setAnswer(state.active, questions[0].id, 'A', 2000);
  state.active.index = 2;
  state.bookmarks = [questions[2].id]; state.wrong = [questions[1].id];
  state.history = [finishSession(createSession([questions[3]], base, 1000), bank, [], 5000).session];
  assert.equal(saveState(store, 'quiz', state), true);
  const restored = loadState(store, 'quiz', bank);
  assert.equal(restored.warning, '');
  assert.deepEqual(restored.state, state);
  assert.equal(restored.state.active.deadline, 121000);
  assert.equal(setAnswer(restored.state.active, questions[1].id, 'B', 121000), false);
});

test('Bài hỏng được phát hiện; lỗi JSON hoặc localStorage không làm sập ứng dụng', () => {
  const s = createSession(questions.slice(0, 2), base, 1000);
  assert.equal(validSession(s, bank), true);
  for (const change of [{ questionIds: ['unknown'] }, { index: 99 }, { deadline: 0 }, { optionOrder: {} }, { answers: { [questions[0].id]: 'Z' } }]) {
    assert.equal(validSession({ ...s, ...change }, bank), false);
  }
  const corrupt = memory(); corrupt.setItem('quiz', '{bad json');
  assert.ok(loadState(corrupt, 'quiz', bank).warning);
  const unavailable = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.equal(saveState(unavailable, 'quiz', emptyState()), false);
  assert.ok(loadState(unavailable, 'quiz', bank).warning);
});

test('Không thể tạo bài rỗng, dữ liệu lỗi hoặc thời gian ngoài khoảng cho phép', () => {
  assert.throws(() => createSession([], base));
  assert.throws(() => createSession(all.filter(q => !isPlayable(q)), base));
  assert.throws(() => createSession([questions[0]], { ...base, mode: 'exam', timer: true, minutes: 0 }));
  assert.equal(createSession([questions[0]], { ...base, timer: true, minutes: -1 }).deadline, null);
});

test('Câu ba lựa chọn: xáo ABC, chấm C, lưu/khôi phục, từ chối D; các câu khác vẫn cần ABCD', () => {
  const q = bank.get('chuong2-cau88');
  const s = createSession([q], { ...base, mode: 'exam', shuffleAnswers: true }, 1000, () => 0);
  assert.deepEqual(s.optionOrder[q.id], ['B', 'C', 'A']);
  assert.equal(setAnswer(s, q.id, 'D', 2000), false);
  assert.equal(setAnswer(s, q.id, undefined, 2000), false);
  assert.equal(setAnswer(s, q.id, s.optionOrder[q.id][1], 2000), true);
  assert.equal(scoreSession(s, bank).percent, 100);
  assert.equal(validSession(s, bank), true);
  const state = { ...emptyState(), active: s }, store = memory();
  assert.equal(saveState(store, 'three-options', state), true);
  assert.deepEqual(loadState(store, 'three-options', bank).state.active, s);
  assert.equal(validSession({ ...s, answers: { [q.id]: 'D' } }, bank), false);
  assert.equal(validSession({ ...s, optionOrder: { [q.id]: ['A', 'B', 'C', 'D'] } }, bank), false);
  assert.equal(isPlayable({ ...questions[0], options: { A: 'a', B: 'b', C: 'c' } }), false);
});
