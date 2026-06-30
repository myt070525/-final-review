/* ================================================================
   期末复习刷题 WebApp
   功能：科目选择 / 题型筛选 / 章节筛选 / 4 种练习模式 / 错题库 / 模拟考试
   数据：window.QUESTION_BANK（来自 data.js）
   ================================================================ */

(function () {
  'use strict';

  // ---------- 全局状态 ----------
  const state = {
    view: 'home',           // home | modes | quiz | wrong | result
    subject: null,          // 'marx' | 'history'
    mode: null,             // random | sequential | wrong | exam
    typeFilter: 'all',      // all | single | multi | judge | short | essay
    chapterFilter: 'all',   // all | '第一章' ...
    queue: [],              // 当前练习题队列
    index: 0,              // 当前题在队列中的索引
    answers: {},            // {qid: 'A' | 'AB' | 'text'}
    results: {},            // {qid: 'right' | 'wrong'}
    startTime: 0,
    exam: null,             // {total, correct, wrong, timeSpent, durationMs}
    timerId: null,
  };

  const STORAGE_KEY = 'exam_practice_state_v1';

  // ---------- 工具函数 ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, attrs = {}, ...children) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'dataset') Object.assign(e.dataset, attrs[k]);
      else if (k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    children.flat().forEach(c => {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const normAns = (s) => (s || '').toString().trim().toUpperCase().split('').filter(c => /[A-E]/.test(c)).sort().join('');

  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const showToast = (msg, duration = 1600) => {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { t.hidden = true; }, duration);
  };

  // ---------- 存储（错题库与设置） ----------
  const storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        const data = v ? JSON.parse(v) : {};
        return key in data ? data[key] : fallback;
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        const data = v ? JSON.parse(v) : {};
        data[key] = value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {}
    },
  };

  const wrongStore = {
    getAll: () => storage.get('wrong', {}),
    setAll: (d) => storage.set('wrong', d),
    clear: () => storage.set('wrong', {}),
    record(qid, subject, chapter, type, stem, answer, isCorrect) {
      const d = wrongStore.getAll();
      if (!d[qid]) {
        d[qid] = { qid, subject, chapter, type, stem, answer, correct: 0, wrong: 0, lastWrongAt: 0, lastSeenAt: 0 };
      }
      d[qid].lastSeenAt = Date.now();
      if (isCorrect) d[qid].correct += 1;
      else {
        d[qid].wrong += 1;
        d[qid].lastWrongAt = Date.now();
      }
      wrongStore.setAll(d);
    },
    remove(qid) {
      const d = wrongStore.getAll();
      delete d[qid];
      wrongStore.setAll(d);
    },
  };

  // ---------- 路由 ----------
  function go(view, opts = {}) {
    state.view = view;
    $$('.view').forEach(v => v.classList.remove('active'));
    const target = $(`.view[data-view="${view}"]`);
    if (target) target.classList.add('active');

    // 顶部栏
    const title = $('#pageTitle');
    const back = $('#backBtn');
    const home = $('#homeBtn');
    if (view === 'home') {
      title.textContent = '期末刷题';
      back.hidden = true;
      home.hidden = true;
    } else if (view === 'modes') {
      const sub = BANK[state.subject];
      title.textContent = sub ? sub.name : '选择模式';
      back.hidden = false;
      home.hidden = false;
    } else if (view === 'quiz') {
      title.textContent = modeLabel(state.mode) + ' · ' + typeLabel(state.typeFilter);
      back.hidden = false;
      home.hidden = false;
    } else if (view === 'wrong') {
      title.textContent = '错题题库';
      back.hidden = true;
      home.hidden = false;
    } else if (view === 'result') {
      title.textContent = '考试结果';
      back.hidden = false;
      home.hidden = false;
    }

    // 底部 Tab
    $$('.tab').forEach(t => {
      const v = t.dataset.go;
      t.dataset.active = (v === 'wrong' && view === 'wrong') || (v === 'home' && view === 'home') ? '1' : '0';
    });

    // 滚动
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function modeLabel(m) {
    return { random: '随机刷题', sequential: '逐题练习', wrong: '错题重练', exam: '模拟考试' }[m] || '';
  }
  function typeLabel(t) {
    return { all: '全部', single: '单选题', multi: '多选题', judge: '判断题', short: '简答题', essay: '论述题' }[t] || t;
  }
  function typeName(t) { return { single: '单选', multi: '多选', judge: '判断', short: '简答', essay: '论述' }[t] || t; }

  // ---------- 数据 ----------
  const BANK = window.QUESTION_BANK;

  function getQuestionPool() {
    const sub = BANK[state.subject];
    if (!sub) return [];
    return sub.questions.filter(q => {
      if (state.typeFilter !== 'all' && q.type !== state.typeFilter) return false;
      if (state.chapterFilter !== 'all' && q.chapter !== state.chapterFilter) return false;
      return true;
    });
  }

  // ---------- 首页 ----------
  function renderHome() {
    const grid = $('#subjectGrid');
    grid.innerHTML = '';
    const wrongs = wrongStore.getAll();
    Object.keys(BANK).forEach(key => {
      const sub = BANK[key];
      const total = sub.questions.length;
      const wrongCount = Object.values(wrongs).filter(w => w.subject === key).length;
      const card = el('button', {
        class: 'subject-card ' + key,
        onclick: () => { state.subject = key; go('modes'); renderModes(); },
      },
        el('div', { class: 'ico' }, key === 'marx' ? '📕' : '📘'),
        el('div', { class: 'name' }, sub.name),
        el('div', { class: 'meta' }, '共 ' + sub.chapters.length + ' 章 · ' + total + ' 题'),
        el('div', { class: 'stat' },
          el('span', null, '错题 '),
          el('b', null, String(wrongCount)),
        ),
      );
      grid.appendChild(card);
    });
  }

  // ---------- 模式选择页 ----------
  function renderModes() {
    const sub = BANK[state.subject];
    if (!sub) return;
    // Banner
    const banner = $('#subjectBanner');
    banner.innerHTML = '';
    banner.appendChild(el('div', { class: 'ico' }, state.subject === 'marx' ? '📕' : '📘'));
    const info = el('div', null,
      el('div', { class: 'name' }, sub.name),
      el('div', { class: 'sub' }, '共 ' + sub.chapters.length + ' 章 · ' + sub.questions.length + ' 题')
    );
    banner.appendChild(info);

    // 章节 Pills
    const cp = $('#chapterPills');
    cp.innerHTML = '';
    cp.appendChild(el('button', {
      class: 'pill',
      'data-chapter': 'all',
      'data-active': state.chapterFilter === 'all' ? '1' : '0',
      onclick: () => {
        state.chapterFilter = 'all';
        $$('#chapterPills .pill').forEach(p => p.dataset.active = (p.dataset.chapter === 'all' ? '1' : '0'));
        updateStartBtn();
      }
    }, '全部章节'));
    sub.chapters.forEach(c => {
      cp.appendChild(el('button', {
        class: 'pill',
        'data-chapter': c.name,
        'data-active': state.chapterFilter === c.name ? '1' : '0',
        onclick: () => {
          state.chapterFilter = c.name;
          $$('#chapterPills .pill').forEach(p => p.dataset.active = (p.dataset.chapter === c.name ? '1' : '0'));
          updateStartBtn();
        }
      }, c.name));
    });
  }

  function updateStartBtn() {
    const startBtn = $('#startBtn');
    const mode = state.mode;
    const has = getQuestionPool().length;
    if (!mode) {
      startBtn.disabled = true;
      startBtn.textContent = '请选择练习模式';
      return;
    }
    if (has === 0) {
      startBtn.disabled = true;
      startBtn.textContent = '当前筛选下没有题目';
      return;
    }
    startBtn.disabled = false;
    if (mode === 'exam') {
      const n = +$('#examCount').value || 20;
      const m = +$('#examDuration').value || 15;
      startBtn.textContent = `开始模拟考试（${n}题 · ${m}分钟）`;
    } else {
      startBtn.textContent = `开始${modeLabel(mode)}（${has}题）`;
    }
  }

  // ---------- 答题页 ----------
  function startQuiz() {
    if (state.mode === 'wrong') {
      const wrongs = wrongStore.getAll();
      const sub = BANK[state.subject];
      const wrongIds = Object.keys(wrongs).filter(id => wrongs[id].subject === state.subject);
      // 应用题型 / 章节筛选
      state.queue = sub.questions.filter(q => {
        if (!wrongIds.includes(q.id)) return false;
        if (state.typeFilter !== 'all' && q.type !== state.typeFilter) return false;
        if (state.chapterFilter !== 'all' && q.chapter !== state.chapterFilter) return false;
        return true;
      });
      if (state.queue.length === 0) {
        showToast('当前筛选下没有错题');
        return;
      }
    } else if (state.mode === 'sequential') {
      const pool = getQuestionPool();
      // 顺序模式：按章节->题型->题号
      state.queue = pool.slice().sort((a, b) => {
        if (a.chapter !== b.chapter) return a.chapter.localeCompare(b.chapter, 'zh-Hans');
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.id.localeCompare(b.id, 'zh-Hans');
      });
    } else if (state.mode === 'exam') {
      const pool = getQuestionPool();
      const n = Math.min(+$('#examCount').value || 20, pool.length);
      const dur = Math.max(1, +$('#examDuration').value || 15);
      state.queue = shuffle(pool).slice(0, n);
      state.exam = { total: n, correct: 0, wrong: 0, duration: dur, durationMs: dur * 60 * 1000, timeLeft: dur * 60, startedAt: Date.now() };
    } else {
      // random
      state.queue = shuffle(getQuestionPool());
    }

    state.index = 0;
    state.answers = {};
    state.results = {};
    state.startTime = Date.now();
    if (state.mode !== 'exam') state.exam = null;
    go('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.queue[state.index];
    if (!q) {
      finishQuiz();
      return;
    }
    // 进度
    const total = state.queue.length;
    $('#progressBar').style.width = `${((state.index + 1) / total) * 100}%`;
    $('#quizProgress').textContent = `${state.index + 1} / ${total}`;
    $('#quizMode').textContent = modeLabel(state.mode);

    // 计时器（仅考试）
    if (state.mode === 'exam') {
      $('#quizTimer').hidden = false;
      updateExamTimer();
      if (!state.timerId) {
        state.timerId = setInterval(updateExamTimer, 1000);
      }
    } else {
      $('#quizTimer').hidden = true;
      if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    }

    // 渲染题目
    const card = $('#questionCard');
    card.classList.remove('q-card-right', 'q-card-wrong');
    card.innerHTML = '';

    // 头部
    const head = el('div', { class: 'q-header' },
      el('span', { class: 'q-tag ' + q.type }, typeName(q.type)),
      el('span', null, q.chapter),
      el('span', null, '· ID ' + q.id.split('_').slice(-1)[0])
    );
    card.appendChild(head);

    // 题干
    const stem = el('div', { class: 'q-stem' }, q.stem);
    card.appendChild(stem);

    const userAnswer = state.answers[q.id];
    const isAnswered = userAnswer !== undefined;
    const isCorrect = state.results[q.id] === 'right';
    const isWrong = state.results[q.id] === 'wrong';

    // 选项
    if (q.type === 'single' || q.type === 'multi') {
      const opts = el('div', { class: 'q-options' });
      Object.keys(q.options || {}).forEach(letter => {
        const optBtn = el('button', {
          class: 'option',
          onclick: (e) => onChooseOption(q, letter, e.currentTarget),
        },
          el('span', { class: 'letter' }, letter),
          el('span', { class: 'text' }, q.options[letter])
        );
        if (isAnswered) {
          optBtn.disabled = true;
          if (userAnswer.includes(letter)) optBtn.classList.add('selected');
          if (isWrong && userAnswer.includes(letter) && !normAns(userAnswer).includes(normAns(q.answer))) {
            // 错选
          }
          if (isWrong && userAnswer.includes(letter) && !normAns(q.answer).includes(letter)) {
            optBtn.classList.add('wrong');
          }
        }
        opts.appendChild(optBtn);
      });
      card.appendChild(opts);
    } else if (q.type === 'judge') {
      const opts = el('div', { class: 'q-options judge-row' },
        el('button', { class: 'option', onclick: () => onChooseOption(q, 'A') },
          el('span', { class: 'text' }, '✓ 正确 (A)')
        ),
        el('button', { class: 'option', onclick: () => onChooseOption(q, 'B') },
          el('span', { class: 'text' }, '✗ 错误 (B)')
        ),
      );
      if (isAnswered) {
        $$('.option', opts).forEach(b => b.disabled = true);
        const labels = ['A', 'B'];
        const correct = normAns(q.answer);
        if (userAnswer === 'A' || userAnswer === 'B') {
          $$('.option', opts)[userAnswer === 'A' ? 0 : 1].classList.add('selected');
        }
        if (isWrong) {
          $$('.option', opts)[userAnswer === 'A' ? 0 : 1].classList.add('wrong');
        }
      }
      card.appendChild(opts);
    } else {
      // 主观题
      const ta = el('textarea', {
        class: 'qa-textarea',
        placeholder: '请输入你的答案...',
        oninput: (e) => { state.answers[q.id] = e.target.value; },
      });
      if (userAnswer !== undefined) ta.value = userAnswer;
      if (isAnswered) ta.disabled = true;
      card.appendChild(ta);
    }

    // 反馈区
    if (isAnswered) {
      const fb = el('div', { class: 'q-feedback show ' + (isCorrect ? 'right' : 'wrong') });
      fb.appendChild(el('div', { class: 'row' },
        el('span', { class: 'label' }, isCorrect ? '✓ 回答正确' : '✗ 回答错误'),
      ));
      if (q.answer) {
        fb.appendChild(el('div', { class: 'row' },
          el('span', { class: 'label' }, '正确答案：'),
          el('span', { class: 'ans' }, q.answer),
        ));
      }
      if (!isCorrect && userAnswer) {
        fb.appendChild(el('div', { class: 'row' },
          el('span', { class: 'label' }, '你的答案：'),
          el('span', null, userAnswer),
        ));
      }
      card.appendChild(fb);
    }

    // 按钮状态
    $('#showAnswerBtn').disabled = isAnswered;
    if (isAnswered) {
      $('#nextBtn').textContent = (state.index === state.queue.length - 1) ? '完成' : '下一题 →';
    } else {
      $('#nextBtn').textContent = '下一题 →';
    }
    $('#prevBtn').disabled = state.index === 0;
  }

  function onChooseOption(q, letter, btn) {
    if (state.answers[q.id] !== undefined) return;
    let userAns;
    if (q.type === 'multi') {
      // 多选：累计选择
      userAns = (state.answers[q.id] || '') + letter;
    } else {
      userAns = letter;
    }
    state.answers[q.id] = userAns;
    // 标记 UI
    if (q.type === 'multi') {
      btn.classList.toggle('selected');
    }
    // 判断对错
    const correct = normAns(q.answer);
    const user = normAns(userAns);
    // 单选/判断：选完即判
    // 多选：等用户主动点击"提交答案"
    if (q.type === 'multi') {
      // 暂不判，等待用户确认（提供"提交答案"按钮）
      renderQuestion();
      // 重新绑定后 options 已被重建，selected 需重新加
      const opts = $$('#questionCard .option');
      const letters = userAns.split('');
      opts.forEach(b => {
        const letter = $('.letter', b)?.textContent;
        if (letter && letters.includes(letter)) b.classList.add('selected');
      });
      return;
    }
    const isRight = (correct && user && correct === user);
    state.results[q.id] = isRight ? 'right' : 'wrong';
    // 错题记录
    wrongStore.record(q.id, q.subject, q.chapter, q.type, q.stem, q.answer, isRight);
    if (state.exam) {
      if (isRight) state.exam.correct++;
      else state.exam.wrong++;
    }
    renderQuestion();
    if (isRight) {
      // 答对：1.2s 后自动下一题
      setTimeout(() => {
        if (state.view !== 'quiz') return;
        if (state.answers[q.id] === undefined) return;
        if (state.results[q.id] !== 'right') return;
        nextQuestion();
      }, 1200);
    }
  }

  function submitMulti(q) {
    const user = normAns(state.answers[q.id] || '');
    if (!user) { showToast('请先选择选项'); return; }
    const correct = normAns(q.answer);
    const isRight = (correct && user && correct === user);
    state.results[q.id] = isRight ? 'right' : 'wrong';
    wrongStore.record(q.id, q.subject, q.chapter, q.type, q.stem, q.answer, isRight);
    if (state.exam) {
      if (isRight) state.exam.correct++;
      else state.exam.wrong++;
    }
    renderQuestion();
    if (isRight) {
      setTimeout(() => {
        if (state.view !== 'quiz') return;
        if (state.results[q.id] !== 'right') return;
        nextQuestion();
      }, 1200);
    }
  }

  function showAnswerNow() {
    const q = state.queue[state.index];
    if (!q) return;
    if (state.answers[q.id] !== undefined) return;
    if (q.type === 'multi' || q.type === 'single' || q.type === 'judge') {
      const user = normAns(state.answers[q.id] || '');
      if (!user && q.type === 'multi') {
        // 多选未选，强制当错
        state.answers[q.id] = '';
        state.results[q.id] = 'wrong';
        wrongStore.record(q.id, q.subject, q.chapter, q.type, q.stem, q.answer, false);
        if (state.exam) state.exam.wrong++;
        renderQuestion();
        return;
      }
      const correct = normAns(q.answer);
      const isRight = user && correct === user;
      if (state.answers[q.id] === undefined) {
        // 主观题
        if (q.type === 'short' || q.type === 'essay') {
          // 不自动判定，留待查看
          state.answers[q.id] = state.answers[q.id] || '';
          renderQuestion();
        }
      }
    } else {
      // 主观题查看答案
      if (state.answers[q.id] === undefined) state.answers[q.id] = '';
      renderQuestion();
    }
  }

  function nextQuestion() {
    if (state.index < state.queue.length - 1) {
      state.index++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }
  function prevQuestion() {
    if (state.index > 0) {
      state.index--;
      renderQuestion();
    }
  }

  function finishQuiz() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    if (state.mode === 'exam') {
      const ex = state.exam;
      ex.timeSpent = Math.floor((Date.now() - ex.startedAt) / 1000);
      const accuracy = ex.total ? Math.round((ex.correct / ex.total) * 100) : 0;
      $('#resultScore').textContent = ex.correct * 5; // 每题5分
      $('#resultTotal').textContent = ex.total * 5;
      const stats = $('#resultStats');
      stats.innerHTML = '';
      stats.appendChild(statItem(ex.correct, '答对', 'right'));
      stats.appendChild(statItem(ex.wrong, '答错', 'wrong'));
      stats.appendChild(statItem(accuracy + '%', '正确率', 'accuracy'));
      stats.appendChild(statItem(fmtTime(ex.timeSpent), '用时', 'time'));
      // 暂存题目用于回看
      window._lastResult = { mode: 'exam', queue: state.queue.slice(), answers: { ...state.answers }, results: { ...state.results } };
      go('result');
    } else {
      // 普通模式：弹窗统计
      const right = Object.values(state.results).filter(v => v === 'right').length;
      const wrong = Object.values(state.results).filter(v => v === 'wrong').length;
      const answered = Object.keys(state.results).length;
      showToast(`本次完成：答对 ${right} · 答错 ${wrong} · 未答 ${state.queue.length - answered}`);
      setTimeout(() => go('home'), 800);
    }
  }

  function statItem(num, lbl, cls) {
    return el('div', { class: 'item' },
      el('div', { class: 'num ' + (cls || '') }, String(num)),
      el('div', { class: 'lbl' }, lbl)
    );
  }

  function updateExamTimer() {
    if (!state.exam) return;
    const left = Math.max(0, state.exam.duration * 60 - Math.floor((Date.now() - state.exam.startedAt) / 1000));
    state.exam.timeLeft = left;
    $('#timerText').textContent = fmtTime(left);
    if (left <= 60) $('#timerText').classList.add('warning');
    if (left <= 0) {
      showToast('考试时间到，自动交卷');
      finishQuiz();
    }
  }

  // ---------- 错题库 ----------
  function renderWrong() {
    const wrongs = wrongStore.getAll();
    const list = $('#wrongList');
    const empty = $('#wrongEmpty');
    const stats = $('#wrongStats');
    list.innerHTML = '';
    const items = Object.values(wrongs);
    if (items.length === 0) {
      empty.hidden = false;
      stats.innerHTML = '';
      return;
    }
    empty.hidden = true;
    const total = items.length;
    const sumErr = items.reduce((s, w) => s + (w.wrong || 0), 0);
    const sumCorr = items.reduce((s, w) => s + (w.correct || 0), 0);
    const totalAttempts = sumErr + sumCorr;
    const accuracy = totalAttempts ? Math.round((sumCorr / totalAttempts) * 100) : 0;
    stats.innerHTML = '';
    stats.appendChild(el('div', { class: 'stat-card' },
      el('div', { class: 'num' }, String(total)),
      el('div', { class: 'lbl' }, '错题数量')
    ));
    stats.appendChild(el('div', { class: 'stat-card' },
      el('div', { class: 'num danger' }, String(sumErr)),
      el('div', { class: 'lbl' }, '错误次数')
    ));
    stats.appendChild(el('div', { class: 'stat-card' },
      el('div', { class: 'num warning' }, accuracy + '%'),
      el('div', { class: 'lbl' }, '当前正确率')
    ));
    // 按错误次数降序
    items.sort((a, b) => b.wrong - a.wrong);
    items.forEach(w => {
      const errRate = (w.wrong + w.correct) ? Math.round((w.wrong / (w.wrong + w.correct)) * 100) : 0;
      const item = el('div', { class: 'wrong-item' },
        el('div', { class: 'head' },
          el('span', { class: 'q-tag ' + w.type }, typeName(w.type)),
          el('span', null, w.chapter),
        ),
        el('div', { class: 'stem' }, w.stem),
        el('div', { class: 'meta' },
          el('span', null, '错 '),
          el('span', { class: 'err' }, String(w.wrong)),
          el('span', null, ' 次 · 对 '),
          el('b', null, String(w.correct)),
          el('span', null, ' 次 · 错误率 '),
          el('b', null, errRate + '%'),
        ),
        el('div', { class: 'toggle', onclick: (e) => {
          e.stopPropagation();
          item.classList.toggle('expanded');
        } }, '展开答案'),
        el('div', { class: 'detail' },
          el('div', { class: 'row' },
            el('span', { class: 'label' }, '正确答案：'),
            el('span', { class: 'ans' }, w.answer || '（暂无）'),
          ),
        ),
      );
      list.appendChild(item);
    });
  }

  // ---------- 初始化 ----------
  function bind() {
    // 顶部返回 / 首页
    const doBack = () => {
      if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
      if (state.view === 'quiz' || state.view === 'result') {
        go('home');
      } else if (state.view === 'modes') {
        state.subject = null;
        state.mode = null;
        go('home');
      } else {
        go('home');
      }
    };
    $('#backBtn').addEventListener('click', doBack);
    $('#homeBtn').addEventListener('click', doBack);

    // Tab 栏
    $$('.tab').forEach(t => t.addEventListener('click', () => {
      const v = t.dataset.go;
      if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
      if (v === 'wrong') {
        go('wrong');
        renderWrong();
      } else {
        state.subject = null;
        state.mode = null;
        go('home');
      }
    }));

    // 题型 Pill
    $$('#typePills .pill').forEach(p => p.addEventListener('click', () => {
      state.typeFilter = p.dataset.type;
      $$('#typePills .pill').forEach(x => x.dataset.active = (x === p ? '1' : '0'));
      updateStartBtn();
    }));

    // 模式卡片
    $$('.mode-card').forEach(m => m.addEventListener('click', () => {
      state.mode = m.dataset.mode;
      $$('.mode-card').forEach(x => x.dataset.active = (x === m ? '1' : '0'));
      $('#examConfigCard').hidden = state.mode !== 'exam';
      updateStartBtn();
    }));

    // 考试配置
    $('#examCount').addEventListener('input', updateStartBtn);
    $('#examDuration').addEventListener('input', updateStartBtn);

    // 开始
    $('#startBtn').addEventListener('click', startQuiz);

    // 答题按钮
    $('#prevBtn').addEventListener('click', prevQuestion);
    $('#nextBtn').addEventListener('click', () => {
      const q = state.queue[state.index];
      if (q && (q.type === 'short' || q.type === 'essay')) {
        // 主观题：直接进入下一题
        // 但如果是当前题未"提交"，则提示
        if (state.answers[q.id] === undefined) state.answers[q.id] = '';
      }
      // 多选：未提交则视为放弃
      if (q && q.type === 'multi' && state.answers[q.id] !== undefined && state.results[q.id] === undefined) {
        submitMulti(q);
        return;
      }
      nextQuestion();
    });
    $('#showAnswerBtn').addEventListener('click', () => {
      const q = state.queue[state.index];
      if (!q) return;
      if (q.type === 'multi' && state.answers[q.id] !== undefined && state.results[q.id] === undefined) {
        submitMulti(q);
        return;
      }
      if (q.type === 'short' || q.type === 'essay') {
        if (state.answers[q.id] === undefined) state.answers[q.id] = '';
        renderQuestion();
        return;
      }
      showAnswerNow();
    });

    // 错题库 - 清空（非阻塞二次确认，避免手机浏览器 confirm 失效）
    let clearWrongConfirm = false;
    $('#clearWrongBtn').addEventListener('click', () => {
      const btn = $('#clearWrongBtn');
      if (!clearWrongConfirm) {
        clearWrongConfirm = true;
        const oldText = btn.textContent;
        btn.textContent = '再点一次确认清空';
        btn.classList.add('danger-confirm');
        showToast('再次点击将清空所有错题');
        setTimeout(() => {
          clearWrongConfirm = false;
          btn.textContent = oldText;
          btn.classList.remove('danger-confirm');
        }, 3000);
        return;
      }
      wrongStore.clear();
      renderWrong();
      clearWrongConfirm = false;
      btn.textContent = '清空错题';
      btn.classList.remove('danger-confirm');
      showToast('已清空错题库');
    });

    // 结果页
    $('#reviewBtn').addEventListener('click', () => {
      // 复用错题库页：展示本次所有题
      const r = window._lastResult;
      if (!r) { go('home'); return; }
      // 把本次错题先记录到错题库，再切到错题页（自动展开答案）
      r.queue.forEach(q => {
        const userAns = r.answers[q.id];
        const correct = normAns(q.answer);
        const user = normAns(userAns || '');
        if (q.type === 'multi' || q.type === 'single' || q.type === 'judge') {
          if (user && user === correct) return; // 答对不入错题
        }
        // 答错或未答：入错题
        wrongStore.record(q.id, q.subject, q.chapter, q.type, q.stem, q.answer, false);
      });
      go('wrong');
      renderWrong();
    });
    $('#backHomeBtn').addEventListener('click', () => go('home'));

    // 多选/主观题：长按选项也能快速进入多选标记（保持单击单选，多选单击切换）
    // 通过自定义点击行为：在多选题，第二次点击"提交"按钮才判分
  }

  // 启动
  document.addEventListener('DOMContentLoaded', () => {
    bind();
    renderHome();
  });
})();
