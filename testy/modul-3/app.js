/* Тест по справочнику «Git и GitHub», модуль 3 (главы 3.1–3.6). Движок — от теста по модулю 2. Одна попытка, время из QUIZ.minutes, разбор после отправки.

   Состояние живёт в localStorage этого браузера:
     QUIZ.id + ':state'  — идёт попытка (ФИО, порядок, ответы, дедлайн, уходы)
     QUIZ.id + ':result' — попытка завершена, оценка и ответы зафиксированы

   Пока лежит result, тест больше не запускается: любое открытие ссылки
   показывает готовую оценку и разбор. Это защита в пределах браузера —
   преподаватель принимает только первый присланный код.

   Ответы хранятся в исходной нумерации вариантов и карточек, поэтому
   проверка не зависит от перемешивания.

   Виды заданий: single, multi, order, slots, sort, line, number, odd, grid — как в модуле 2.
   Новые виды модуля 3:
   bsim — тренажёр веток: граф коммитов, кнопки VS Code и вывод терминала; ответ — журнал действий,
     проверяется итоговый граф (bsSig в quiz-data.js), поэтому засчитывается любой верный путь;
   conflict — разбор конфликта: кнопки над каждым местом и свой вариант из готовых строк;
   cmd — сборщик команд: строки терминала из карточек; msg — сборщик сообщения коммита со счётчиком знаков;
   pins — метки на графе: ветку ставят на коммит или отмечают удалённой. */

const KEY_STATE = QUIZ.id + ':state';
const KEY_RESULT = QUIZ.id + ':result';

const KIND = {
  single: 'выбор ответа', multi: 'несколько ответов', order: 'порядок',
  slots: 'подстановка', sort: 'по группам', line: 'строка', number: 'число', odd: 'убрать лишнее',
  path: 'собрать путь', node: 'дерево каталогов',
  grid: 'таблица отметок', bsim: 'тренажёр веток', conflict: 'разбор конфликта', cmd: 'сборщик команд',
  msg: 'сообщение коммита', pins: 'метки на графе'
};
const HINT = {
  multi: 'Несколько верных вариантов · за ошибочную отметку часть балла снимается',
  order: 'Перетащите карточки или двигайте их стрелками · можно нажать карточку, затем ту, на чьё место её поставить',
  slots: 'Перетащите карточку в пропуск или нажмите карточку, затем пропуск · нажатие на заполненный пропуск очищает его',
  sort: 'Перетащите каждую карточку в группу или нажмите карточку, затем группу',
  tree: 'Перетащите каждый файл в каталог или нажмите файл, затем каталог',
  move: 'Файлы уже разложены. Перенесите те, что окажутся в другом разделе: перетащите или нажмите файл, затем раздел',
  line: 'Нажмите нужную строку',
  lines: 'Нажмите все нужные строки · повторное нажатие снимает отметку',
  odd: 'Перетащите лишнее в корзину или просто нажмите карточку · нажатие в корзине возвращает её обратно',
  path: 'Нажимайте сегменты по порядку или перетаскивайте их в адресную строку · нажатие на сегмент в строке убирает его',
  node: 'Нажмите строку на дереве',
  nodes: 'Нажмите все нужные строки на дереве · повторное нажатие снимает отметку',
  grid: 'Нажмите клетку, чтобы поставить отметку · повторное нажатие снимает её',
  bsim: 'Кнопки работают как в VS Code · в терминале под ними — то же действие командой git · «Шаг назад» отменяет последнее действие',
  conflict: 'Над каждым конфликтом кнопки, как в VS Code · «Свой вариант…» собирает строки вручную · «вернуть конфликт» отменяет выбор',
  cmd: 'Нажмите строку терминала, затем карточки по порядку · нажатие на слово в строке убирает его',
  msg: 'Нажимайте строки по порядку — они встают в поле Message · нажатие на строку в поле убирает её',
  pins: 'Нажмите ветку, затем коммит на графе или поле «ветка удалена» · нажатие на метку снимает её'
};
const variant = q => q.type === 'line' && q.many ? 'lines' : q.type === 'node' && q.many ? 'nodes' : q.type === 'sort' && q.start ? 'move' : q.type === 'sort' && q.tree ? 'tree' : q.type;
const kindOf = q => ({ lines: 'несколько строк', move: 'перемещение', tree: 'по каталогам' })[variant(q)] || KIND[q.type];
const hintOf = q => HINT[variant(q)];

/* ---------- значки файлов ----------
   Вид файла определяется по имени: так же его определяет человек в файловом менеджере. */
const ICON_PATHS = {
  dir: '<path d="M2 5.5h6l1.6 2H18v9.5H2z" fill="#F9B8A6" stroke="#1B1A19" stroke-width="1.4"/>',
  log: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><path d="M6.5 8h7M6.5 11h7M6.5 14h5" stroke="#F05133" stroke-width="1.4"/>',
  db: '<ellipse cx="10" cy="5" rx="6" ry="2.5" fill="#FBE0D8" stroke="#1B1A19" stroke-width="1.4"/><path d="M4 5v10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5" fill="#FBE0D8" stroke="#1B1A19" stroke-width="1.4"/><path d="M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" fill="none" stroke="#1B1A19" stroke-width="1.2"/>',
  conf: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><path d="M6.5 8.5h7M6.5 13h7" stroke="#1B1A19" stroke-width="1.3"/><circle cx="9" cy="8.5" r="1.6" fill="#268A5B"/><circle cx="12" cy="13" r="1.6" fill="#268A5B"/>',
  key: '<circle cx="6.5" cy="10" r="3.6" fill="#FCE3D6" stroke="#C9353B" stroke-width="1.5"/><path d="M10 10h8M15 10v3M17.5 10v2.5" stroke="#C9353B" stroke-width="1.5"/>',
  pid: '<rect x="2.5" y="3" width="15" height="14" rx="2" fill="#DDF1E6" stroke="#268A5B" stroke-width="1.4"/><path d="M8 6l-1 8M12 6l-1 8M5.5 8.5h9M5 11.5h9" stroke="#268A5B" stroke-width="1.3"/>',
  sock: '<path d="M7 3v4M13 3v4" stroke="#0B78C4" stroke-width="1.6"/><path d="M4.5 7h11v3a5.5 5.5 0 0 1-11 0z" fill="#DCEBF7" stroke="#0B78C4" stroke-width="1.4"/><path d="M10 15.5V18" stroke="#0B78C4" stroke-width="1.6"/>',
  img: '<rect x="2.5" y="3.5" width="15" height="13" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><circle cx="7" cy="7.5" r="1.5" fill="#F05133"/><path d="M3.5 15l4.5-5 3 3 2-2 3.5 4z" fill="#268A5B"/>',
  doc: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><path d="M6.5 8h7M6.5 10.5h7M6.5 13h7" stroke="#8C8497" stroke-width="1.2"/>',
  bin: '<rect x="2" y="3.5" width="16" height="13" rx="1.5" fill="#300A24" stroke="#241F2F" stroke-width="1.2"/><path d="M5 8l2.5 2L5 12" fill="none" stroke="#8AE234" stroke-width="1.5"/><path d="M9 12.5h5" stroke="#fff" stroke-width="1.4"/>',
  tmp: '<circle cx="10" cy="10" r="7" fill="#FFF3D6" stroke="#D69016" stroke-width="1.5"/><path d="M10 6v4.3l2.8 1.8" fill="none" stroke="#D69016" stroke-width="1.5"/>',
  code: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#1B1A19" stroke-width="1.4"/><path d="M8.2 8.5 6 11l2.2 2.5M11.8 8.5 14 11l-2.2 2.5" fill="none" stroke="#F05133" stroke-width="1.5"/>',
  arch: '<path d="M3 6.5 10 3l7 3.5v8L10 18l-7-3.5z" fill="#F6ECF2" stroke="#1B1A19" stroke-width="1.4"/><path d="M3 6.5 10 10l7-3.5M10 10v8" fill="none" stroke="#1B1A19" stroke-width="1.2"/>'
};

function fileKind(name) {
  const n = name.replace(/<[^>]+>/g, '').trim().toLowerCase();
  if (n.endsWith('/')) return 'dir';
  if (/\.(env|pem|key)$/.test(n)) return 'key';
  if (/(\.log(\.\d+)?|_log)$/.test(n)) return 'log';
  if (/\.(db|sqlite)$/.test(n)) return 'db';
  if (/\.(ya?ml|conf|cfg|ini|json|toml)$/.test(n)) return 'conf';
  if (/\.pid$/.test(n)) return 'pid';
  if (/\.sock$/.test(n)) return 'sock';
  if (/\.(png|jpe?g|svg|gif)$/.test(n)) return 'img';
  if (/\.(md|txt|list)$/.test(n)) return 'doc';
  if (/\.(html|css|js|py)$/.test(n)) return 'code';
  if (/\.(tmp|part)$/.test(n)) return 'tmp';
  if (/\.(zip|gz|deb|tar)$/.test(n)) return 'arch';
  if (/\.sh$/.test(n)) return 'bin';
  return 'doc';
}

function fileIcon(name) {
  return `<svg class="fi" viewBox="0 0 20 20" aria-hidden="true">${ICON_PATHS[fileKind(name)]}</svg>`;
}

/* Содержимое карточки файла: значок, имя, пояснение после « · » мелким шрифтом. */
function fileLabel(text, plain) {
  const [name, ...rest] = text.split(' · ');
  return `${plain ? '' : fileIcon(name)}<span class="fn">${name.replace(/\/(?=.)/g, '/<wbr>')}</span>${rest.length ? `<small class="fmeta">${rest.join(' · ')}</small>` : ''}`;
}

const $ = id => document.getElementById(id);
const screens = { start: $('screen-start'), quiz: $('screen-quiz'), result: $('screen-result') };

let state = null;   // { name, group, order, optOrder, answers, deadline, leaves, startedAt }
let tick = null;
let finishing = false;
let picked = null;  // выбранная нажатием карточка: { qid, index }

/* ---------- хранилище ---------- */

function load(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
}

function show(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
  $('timer').classList.toggle('hidden', name !== 'quiz');
  window.scrollTo(0, 0);
}

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  const rnd = new Uint32Array(n);
  crypto.getRandomValues(rnd);
  for (let i = n - 1; i > 0; i--) {
    const j = rnd[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countOf(q) {
  return (q.options || q.items || q.chips || q.messages || q.plabels || q.pieces || []).length;
}

/* ---------- запуск ---------- */

function init() {
  const done = load(KEY_RESULT);
  if (done) { renderResult(done, true); return; }

  const saved = load(KEY_STATE);
  if (saved && saved.answers && saved.order) {
    state = saved;
    if (Date.now() >= state.deadline) { finish(true); return; }
    startQuiz();
    return;
  }
  show('start');
}

$('btn-start').addEventListener('click', () => {
  const name = $('in-name').value.trim().replace(/\s+/g, ' ');
  const group = $('in-group').value.trim();
  const err = $('start-err');
  if (name.length < 3 || !name.includes(' ')) { err.textContent = 'Укажите фамилию и имя полностью — например, «Иванов Иван».'; return; }
  if (!group) { err.textContent = 'Укажите группу.'; return; }
  if (!confirm(`Начать тест? Пройти его заново будет нельзя, отсчёт ${QUIZ.minutes} минут пойдёт сразу.`)) return;
  err.textContent = '';

  const optOrder = {};
  QUIZ.questions.forEach(q => {
    const n = countOf(q);
    let perm = shuffled(n);
    // карточки для порядка не должны сразу стоять верно
    while (q.type === 'order' && perm.every((x, i) => x === i)) perm = shuffled(n);
    optOrder[q.id] = perm;
  });
  state = {
    name, group,
    order: shuffled(QUIZ.questions.length), optOrder,
    answers: {}, leaves: 0, startedAt: Date.now(),
    deadline: Date.now() + QUIZ.minutes * 60000
  };
  if (!save(KEY_STATE, state)) {
    err.textContent = 'Браузер запретил сохранение данных сайта. Отключите приватный режим — иначе результат потеряется.';
    return;
  }
  startQuiz();
});

function startQuiz() {
  renderQuestions();
  show('quiz');
  updateLeaves();
  startTimer();
}

/* ---------- таймер ---------- */

function startTimer() {
  updateTimer();
  clearInterval(tick);
  tick = setInterval(updateTimer, 250);
}

function updateTimer() {
  const left = Math.max(0, state.deadline - Date.now());
  const el = $('timer');
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  el.textContent = `${m}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('warn', left <= 180000 && left > 60000);
  el.classList.toggle('danger', left <= 60000);
  if (left === 0) { clearInterval(tick); finish(true); }
}

/* ---------- уход со вкладки ---------- */

let unloading = false;
window.addEventListener('pagehide', () => { unloading = true; });
window.addEventListener('pageshow', () => { unloading = false; });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || unloading || !state || finishing || load(KEY_RESULT)) return;
  state.leaves = (state.leaves || 0) + 1;
  save(KEY_STATE, state);
  updateLeaves();
});

function updateLeaves() {
  const note = $('leave-note');
  if (!state || !state.leaves) { note.classList.add('hidden'); return; }
  note.classList.remove('hidden');
  note.innerHTML = `<b>Вы уходили со вкладки теста: ${state.leaves}.</b> Это записано в код результата. Время при этом не останавливается.`;
}

/* ---------- защита текста от копирования ----------
   Текст практики нельзя выделить, скопировать, вырезать, распечатать или сохранить
   горячими клавишами. Исключения — поля ввода и поле с кодом результата: код нужно
   скопировать и отправить преподавателю. Это барьер, а не защита: снимок экрана
   и инструменты разработчика браузер не запрещает. */
const editable = el => !!(el && el.closest && el.closest('input, textarea'));

['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(type => {
  document.addEventListener(type, e => { if (!editable(e.target)) e.preventDefault(); }, true);
});

document.addEventListener('keydown', e => {
  const k = (e.key || '').toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  const devtools = k === 'f12' || (mod && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k));
  const blocked = mod && ['s', 'p', 'u'].includes(k);
  const copying = mod && ['c', 'x', 'a'].includes(k) && !editable(e.target);
  if (devtools || blocked || copying) { e.preventDefault(); e.stopPropagation(); }
}, true);

window.addEventListener('beforeprint', () => document.body.classList.add('no-print'));
window.addEventListener('afterprint', () => document.body.classList.remove('no-print'));

/* ---------- общие части карточки ---------- */

function codeBlock(code, cls = '', file = 'терминал', lang = 'VS Code') {
  return `<figure class="q-code ${cls}"><figcaption><span>${esc(file)}</span><span>${esc(lang)}</span></figcaption><pre>${
    code.split('\n').map((line, i) => `<span class="ln" data-l="${i}">${esc(line) || ' '}</span>`).join('')}</pre></figure>`;
}

/* Несколько файлов проекта — вкладками. Открыт первый, остальные по нажатию. */
function filesBlock(files) {
  const lines = code => code.split('\n').map((line, i) => `<span class="ln" data-l="${i}">${esc(line) || ' '}</span>`).join('');
  return `<figure class="q-code q-files">
    <div class="tabs" role="tablist" aria-label="Файлы проекта">${files.map((f, i) =>
      `<button type="button" class="tab${i ? '' : ' on'}" role="tab" aria-selected="${i ? 'false' : 'true'}" data-tab="${i}">${esc(f.name)}</button>`).join('')}</div>
    ${files.map((f, i) => `<div class="pane" data-pane="${i}"${i ? ' hidden' : ''}>${f.note ? `<p class="pane-note">${esc(f.note)}</p>` : ''}<pre>${lines(f.code)}</pre></div>`).join('')}
    <figcaption><span>Нажмите имя файла, чтобы открыть его</span><span>VS Code</span></figcaption>
  </figure>`;
}

document.addEventListener('click', e => {
  const tab = e.target.closest('.q-files .tab');
  if (!tab) return;
  const fig = tab.closest('.q-files');
  fig.querySelectorAll('.tab').forEach(t => { const on = t === tab; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
  fig.querySelectorAll('.pane').forEach(p => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
});

function sourceBlock(q) {
  if (q.files) return filesBlock(q.files);
  return q.code && q.type !== 'line' ? codeBlock(q.code, '', q.file, q.lang) : '';
}

function imageBlock(img) {
  return img ? `<figure class="q-img ${img.kind === 'shot' ? 'shot' : ''}">${img.svg}<figcaption>${esc(img.caption)}</figcaption></figure>` : '';
}

function questionHead(q, pos, extra = '') {
  return `<div class="q-head">
      <span class="q-num">ЗАДАНИЕ ${pos + 1} ИЗ ${QUIZ.questions.length}</span>
      <span class="q-kind">${kindOf(q)}</span>${extra}
      <span class="q-topic">${esc(q.topic)}</span>
    </div>
    <div class="q-text">${q.text}</div>
    ${q.task ? `<div class="q-task"><b>Что нужно сделать</b>${q.task}</div>` : ''}`;
}

/* ---------- перетаскивание ----------
   Pointer events работают и с мышью, и с пальцем. Короткое нажатие без
   движения считается нажатием: карточка выбирается, затем нажимают место. */

function draggable(el, card, { onDrop, onTap }) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button:not(.chip)') && e.target.closest('button') !== el) return;
    const sx = e.clientX, sy = e.clientY;
    let ghost = null, over = null;

    const targetAt = ev => {
      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      const t = hit && hit.closest('[data-drop]');
      return t && card.contains(t) ? t : null;
    };
    const move = ev => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
        ghost = el.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.classList.remove('sel');
        ghost.style.width = el.getBoundingClientRect().width + 'px';
        document.body.appendChild(ghost);
        el.classList.add('dragging');
      }
      if (!ghost) return;
      ev.preventDefault();
      ghost.style.left = ev.clientX + 'px';
      ghost.style.top = ev.clientY + 'px';
      const t = targetAt(ev);
      if (t !== over) { if (over) over.classList.remove('over'); over = t; if (over) over.classList.add('over'); }
    };
    const end = (ev, cancelled) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      if (over) over.classList.remove('over');
      if (ghost) {
        ghost.remove();
        el.classList.remove('dragging');
        if (!cancelled) { const t = targetAt(ev); if (t) onDrop(t, ev); }
      } else if (!cancelled) {
        onTap();
      }
    };
    const up = ev => end(ev, false);
    const cancel = ev => end(ev, true);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  });
}

/* ---------- отрисовка заданий ---------- */

function renderQuestions() {
  const host = $('questions');
  host.innerHTML = '';
  $('context').innerHTML = QUIZ.context;

  state.order.forEach((qi, pos) => {
    const q = QUIZ.questions[qi];
    const card = document.createElement('div');
    card.className = 'q';
    card.id = 'card-' + q.id;
    card.innerHTML = questionHead(q, pos)
      + imageBlock(q.image)
      + sourceBlock(q)
      + (hintOf(q) ? `<p class="q-hint">${hintOf(q)}</p>` : '')
      + '<div class="body"></div>';
    host.appendChild(card);
    renderBody(q);
  });
  updateProgress();
}

function renderBody(q) {
  const card = $('card-' + q.id);
  const body = card.querySelector('.body');
  ({ single: bodyChoice, multi: bodyChoice, order: bodyOrder, slots: bodySlots, sort: bodySort, line: bodyLine, number: bodyNumber, odd: bodyOdd, path: bodyPath, node: bodyNode, grid: bodyGrid, bsim: bodyBsim, conflict: bodyConflict, cmd: bodyCmd, msg: bodyMsg, pins: bodyPins })[q.type](q, body, card);
}

function commit(q, value) {
  if (Date.now() >= state.deadline) { finish(true); return false; }
  if (value === null) delete state.answers[q.id];
  else state.answers[q.id] = value;
  save(KEY_STATE, state);
  $('card-' + q.id).classList.remove('unanswered');
  updateProgress();
  return true;
}

/* выбор одного или нескольких */
function bodyChoice(q, body) {
  const multi = q.type === 'multi';
  body.innerHTML = '<div class="opts"></div>';
  const opts = body.firstChild;
  state.optOrder[q.id].forEach(oi => {
    const label = document.createElement('label');
    label.className = 'opt';
    const on = (state.answers[q.id] || []).includes(oi);
    label.innerHTML = `<input type="${multi ? 'checkbox' : 'radio'}" name="${q.id}" ${on ? 'checked' : ''}><span>${q.options[oi]}</span>`;
    label.classList.toggle('picked', on);
    label.querySelector('input').addEventListener('change', () => {
      const cur = state.answers[q.id] || [];
      let next = multi ? (cur.includes(oi) ? cur.filter(x => x !== oi) : cur.concat(oi).sort((a, b) => a - b)) : [oi];
      if (!commit(q, next.length ? next : null)) return;
      opts.querySelectorAll('.opt').forEach(l => l.classList.toggle('picked', l.querySelector('input').checked));
    });
    opts.appendChild(label);
  });
}

/* порядок */
function bodyOrder(q, body, card) {
  const cur = state.answers[q.id] || state.optOrder[q.id];
  const moved = !!state.answers[q.id];
  body.innerHTML = `<ol class="ord">${cur.map((it, pos) => `
      <li class="ord-item ${picked && picked.qid === q.id && picked.index === it ? 'sel' : ''}" data-drop="ord" data-i="${it}">
        <span class="txt">${q.items[it]}</span>
        <span class="ord-btns">
          <button type="button" data-dir="-1" aria-label="выше" ${pos === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-dir="1" aria-label="ниже" ${pos === cur.length - 1 ? 'disabled' : ''}>↓</button>
        </span>
      </li>`).join('')}</ol>
    <p class="ord-moved">${moved ? '✓ порядок сохранён' : 'Порядок ещё не менялся — пока задание не выполнено'}</p>`;

  const place = (it, targetIt, after) => {
    const next = cur.filter(x => x !== it);
    let at = next.indexOf(targetIt);
    if (after) at += 1;
    next.splice(at, 0, it);
    picked = null;
    if (commit(q, next)) renderBody(q);
  };

  body.querySelectorAll('.ord-item').forEach(li => {
    const it = Number(li.dataset.i);
    li.querySelectorAll('.ord-btns button').forEach(btn => btn.addEventListener('click', () => {
      const pos = cur.indexOf(it), to = pos + Number(btn.dataset.dir);
      const next = [...cur];
      [next[pos], next[to]] = [next[to], next[pos]];
      picked = null;
      if (commit(q, next)) renderBody(q);
    }));
    draggable(li, card, {
      onDrop: (t, ev) => {
        const target = Number(t.dataset.i);
        if (target === it) { if (!state.answers[q.id] && commit(q, [...cur])) renderBody(q); return; }
        const r = t.getBoundingClientRect();
        place(it, target, ev.clientY > r.top + r.height / 2);
      },
      onTap: () => {
        if (picked && picked.qid === q.id && picked.index !== it) {
          const from = cur.indexOf(picked.index), to = cur.indexOf(it);
          place(picked.index, it, from < to);
        } else {
          picked = picked && picked.qid === q.id && picked.index === it ? null : { qid: q.id, index: it };
          renderBody(q);
        }
      }
    });
  });
}

/* подстановка в пропуски: карточки палитры не расходуются */
function bodySlots(q, body, card) {
  const cur = state.answers[q.id] || q.slots.map(() => null);
  const mono = q.chips.every(c => c.length < 16);
  body.innerHTML = `
    <div class="palette"><p class="palette-note">Карточки</p>${state.optOrder[q.id].map(c =>
      `<button type="button" class="chip ${mono ? 'mono' : ''} ${picked && picked.qid === q.id && picked.index === c ? 'sel' : ''}" data-c="${c}">${q.chips[c]}</button>`).join('')}</div>
    <div class="slots">${q.slots.map((label, s) => `
      <div class="slot-row">
        <div class="slot-label">${esc(label)}</div>
        <div class="slot ${cur[s] !== null ? 'filled' : ''}" data-drop="slot" data-s="${s}" role="button" tabindex="0">${cur[s] !== null ? esc(q.chips[cur[s]]) : 'сюда'}</div>
      </div>`).join('')}</div>`;

  const put = (s, c) => {
    const next = [...cur];
    next[s] = c;
    picked = null;
    if (commit(q, next.every(x => x === null) ? null : next)) renderBody(q);
  };
  body.querySelectorAll('.chip').forEach(chip => {
    const c = Number(chip.dataset.c);
    draggable(chip, card, {
      onDrop: t => put(Number(t.dataset.s), c),
      onTap: () => { picked = picked && picked.qid === q.id && picked.index === c ? null : { qid: q.id, index: c }; renderBody(q); }
    });
  });
  body.querySelectorAll('.slot').forEach(slot => {
    const s = Number(slot.dataset.s);
    const act = () => {
      if (picked && picked.qid === q.id) put(s, picked.index);
      else if (cur[s] !== null) put(s, null);
    };
    slot.addEventListener('click', act);
    slot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  });
}

/* раскладка по группам: карточка лежит либо в общей стопке, либо в одной группе.
   tree — группы рисуются строками дерева каталогов; start — начальная раскладка без стопки. */
function bodySort(q, body, card) {
  const cur = state.answers[q.id] || (q.start ? [...q.start] : q.items.map(() => null));
  const moved = !!state.answers[q.id];
  const chip = it => `<button type="button" class="chip ${q.tree ? 'file' : ''} ${picked && picked.qid === q.id && picked.index === it ? 'sel' : ''}" data-it="${it}">${q.tree ? fileLabel(q.items[it]) : q.items[it]}</button>`;
  const inPlace = b => state.optOrder[q.id].filter(it => cur[it] === b).map(chip).join('');
  const pool = q.start ? '' : `<div class="pool" data-drop="pool">${inPlace(null)}</div>`;
  const buckets = q.tree
    ? `<div class="dirs">${q.buckets.map((title, b) => `
      <div class="dir" data-drop="bucket" data-b="${b}">
        <div class="dir-name">${fileIcon('/')}${esc(title)}</div>
        <div class="dir-body">${inPlace(b)}</div>
      </div>`).join('')}</div>`
    : `<div class="buckets">${q.buckets.map((title, b) => `
      <div class="bucket" data-drop="bucket" data-b="${b}">
        <div class="bucket-title">${esc(title)}</div>
        <div class="bucket-body">${inPlace(b)}</div>
      </div>`).join('')}</div>`;
  body.innerHTML = pool + buckets
    + (q.start ? `<p class="ord-moved ${moved ? '' : 'todo'}">${moved ? '✓ раскладка сохранена' : 'Файлы ещё не перемещались — пока задание не выполнено'}</p>` : '');

  const put = (it, b) => {
    const next = [...cur];
    next[it] = b;
    picked = null;
    if (commit(q, next.every(x => x === null) ? null : next)) renderBody(q);
  };
  const where = t => t.dataset.drop === 'pool' ? null : Number(t.dataset.b);
  body.querySelectorAll('.chip').forEach(el => {
    const it = Number(el.dataset.it);
    draggable(el, card, {
      onDrop: t => put(it, where(t)),
      onTap: () => { picked = picked && picked.qid === q.id && picked.index === it ? null : { qid: q.id, index: it }; renderBody(q); }
    });
  });
  body.querySelectorAll('[data-drop]').forEach(zone => zone.addEventListener('click', e => {
    if (e.target.closest('.chip') || !picked || picked.qid !== q.id) return;
    put(picked.index, where(zone));
  }));
}

/* убрать лишнее: каталог и корзина; ответ — номера карточек в корзине по возрастанию */
function bodyOdd(q, body, card) {
  const out = state.answers[q.id] || [];
  const chip = it => `<button type="button" class="chip file ${out.includes(it) ? 'gone' : ''}" data-it="${it}">${fileLabel(q.items[it], q.plain)}</button>`;
  const list = inside => state.optOrder[q.id].filter(it => out.includes(it) !== inside).map(chip).join('');
  body.innerHTML = `
    <div class="odd ${q.view === 'grid' ? 'grid' : ''}">
      <div class="dir odd-keep" data-drop="keep">
        <div class="dir-name">${fileIcon('/')}${esc(q.dir)}</div>
        <div class="dir-body">${list(true)}</div>
      </div>
      <div class="trash" data-drop="trash">
        <div class="trash-name"><span class="trash-icon" aria-hidden="true"></span>Убрать отсюда</div>
        <div class="dir-body">${list(false)}</div>
      </div>
    </div>`;
  const set = (it, gone) => {
    const next = gone ? [...new Set(out.concat(it))].sort((a, b) => a - b) : out.filter(x => x !== it);
    if (commit(q, next.length ? next : null)) renderBody(q);
  };
  body.querySelectorAll('.chip').forEach(el => {
    const it = Number(el.dataset.it);
    draggable(el, card, {
      onDrop: t => set(it, t.dataset.drop === 'trash'),
      onTap: () => set(it, !out.includes(it))
    });
  });
}

/* собрать путь: адресная строка из сегментов и палитра оставшихся сегментов */
function pathText(q, segs) {
  return '/' + segs.map(c => q.chips[c].replace(/\/$/, '')).join('/');
}

function bodyPath(q, body, card) {
  const cur = state.answers[q.id] || [];
  const free = state.optOrder[q.id].filter(c => !cur.includes(c));
  body.innerHTML = `
    <div class="pathbar" data-drop="bar">
      <span class="pb-label">Путь</span>
      <span class="pb-root">/</span>${cur.map((c, i) => `${i ? '<span class="pb-sep">/</span>' : ''}<button type="button" class="seg" data-pos="${i}" title="убрать">${fileIcon(q.chips[c])}${esc(q.chips[c].replace(/\/$/, ''))}</button>`).join('')}
      ${cur.length ? '<button type="button" class="pb-clear">очистить</button>' : '<span class="pb-empty">нажмите первый сегмент</span>'}
    </div>
    <div class="palette"><p class="palette-note">Сегменты</p>${free.map(c =>
      `<button type="button" class="chip file" data-c="${c}">${fileIcon(q.chips[c])}<span class="fn">${esc(q.chips[c].replace(/\/$/, ''))}</span></button>`).join('') || '<span class="muted">все сегменты в строке</span>'}</div>`;
  const set = next => { if (commit(q, next.length ? next : null)) renderBody(q); };
  body.querySelectorAll('.palette .chip').forEach(el => {
    const c = Number(el.dataset.c);
    draggable(el, card, { onDrop: () => set(cur.concat(c)), onTap: () => set(cur.concat(c)) });
  });
  body.querySelectorAll('.seg').forEach(el => el.addEventListener('click', () => {
    const pos = Number(el.dataset.pos);
    set(cur.filter((_, i) => i !== pos));
  }));
  const clr = body.querySelector('.pb-clear');
  if (clr) clr.addEventListener('click', () => set([]));
}

/* дерево каталогов: узлы с отступом по глубине, нажатие отмечает узел */
function treeRows(q, cls) {
  return q.nodes.map((raw, i) => {
    const depth = raw.length - raw.trimStart().length >> 1;
    const name = raw.trim();
    return `<button type="button" class="node ${cls(i)}" data-n="${i}" style="--d:${depth}">${'<span class="guide"></span>'.repeat(depth)}${fileIcon(name)}<span class="fn">${esc(name)}</span></button>`;
  }).join('');
}

function bodyNode(q, body) {
  const sel = state.answers[q.id] || [];
  body.innerHTML = `<div class="ftree">${treeRows(q, i => sel.includes(i) ? 'sel' : '')}</div>`;
  body.querySelectorAll('.node').forEach(el => el.addEventListener('click', () => {
    const n = Number(el.dataset.n);
    let next = [n];
    if (q.many) next = sel.includes(n) ? sel.filter(x => x !== n) : sel.concat(n).sort((a, b) => a - b);
    else if (sel.includes(n)) next = [];
    if (commit(q, next.length ? next : null)) renderBody(q);
  }));
}

/* строка кода */
function bodyLine(q, body) {
  body.innerHTML = codeBlock(q.code, 'lines', q.file, q.lang);
  const sel = state.answers[q.id] || [];
  body.querySelectorAll('.ln').forEach(ln => {
    const l = Number(ln.dataset.l);
    ln.classList.toggle('sel', sel.includes(l));
    ln.addEventListener('click', () => {
      let next = [l];
      if (q.many) {
        next = sel.includes(l) ? sel.filter(x => x !== l) : sel.concat(l).sort((a, b) => a - b);
      }
      if (commit(q, next.length ? next : null)) renderBody(q);
    });
  });
}

/* число */
function bodyNumber(q, body) {
  const val = state.answers[q.id] || '';
  const unit = q.unit ? `<span>${esc(q.unit)}</span>` : '';
  body.innerHTML = `<label class="num">${q.unit_before ? unit : ''}<input type="text" inputmode="decimal" autocomplete="off" maxlength="12" value="${esc(val)}" aria-label="ответ">${q.unit_before ? '' : unit}</label>`;
  const input = body.querySelector('input');
  input.addEventListener('input', () => {
    const v = input.value.replace(/[^0-9.,\-\s]/g, '');
    if (v !== input.value) input.value = v;
    commit(q, v.trim() ? v.trim() : null);
  });
}


/* ---------- граф коммитов ----------
   nodes — коммиты сверху вниз, новые выше: { h, t, p: [номера родителей в nodes] }.
   Столбцы раскладываются, как в git log --graph: ветки из tips занимают столбцы слева направо,
   первый родитель продолжает столбец коммита, второй родитель коммита слияния получает свой. */
const LANE = ['#3794FF', '#F0883E', '#B180D7', '#3FB950', '#E5534B'];

function graphLayout(nodes, tips) {
  const lanes = [];
  const col = {};
  const free = () => { let f = lanes.indexOf(null); if (f < 0) { f = lanes.length; lanes.push(null); } return f; };
  tips.forEach(t => { if (t != null && !lanes.includes(t)) lanes.push(t); });
  nodes.forEach((n, i) => {
    let c = lanes.indexOf(i);
    if (c < 0) c = free();
    lanes.forEach((x, j) => { if (x === i && j !== c) lanes[j] = null; });
    col[i] = c;
    lanes[c] = n.p.length ? n.p[0] : null;
    n.p.slice(1).forEach(pp => { if (!lanes.includes(pp)) lanes[free()] = pp; });
  });
  return col;
}

/* labels: { номер строки: [{ name, cur, lab }] }; sel — выделенная строка; pick — строки нажимаются. */
function graphHtml(nodes, { tips = [], labels = {}, sel = null, pick = false, cls = () => '' } = {}) {
  const col = graphLayout(nodes, tips);
  const RH = 34, LW = 18, X0 = 15;
  const ncol = Math.max(1, ...nodes.map((_, i) => col[i] + 1));
  const W = X0 * 2 + (ncol - 1) * LW, H = Math.max(nodes.length, 1) * RH;
  const x = i => X0 + col[i] * LW, y = i => i * RH + RH / 2;
  const color = c => LANE[c % LANE.length];
  let lines = '', dots = '';
  nodes.forEach((n, i) => {
    n.p.forEach((pp, k) => {
      let d;
      if (col[i] === col[pp]) d = `M${x(i)} ${y(i)}L${x(pp)} ${y(pp)}`;
      else if (k > 0) d = `M${x(i)} ${y(i)}C${x(i)} ${y(i) + RH * .55} ${x(pp)} ${y(i) + RH * .45} ${x(pp)} ${y(i) + RH}L${x(pp)} ${y(pp)}`;
      else d = `M${x(i)} ${y(i)}L${x(i)} ${y(pp) - RH}C${x(i)} ${y(pp) - RH * .45} ${x(pp)} ${y(pp) - RH * .55} ${x(pp)} ${y(pp)}`;
      lines += `<path d="${d}" stroke="${color(k > 0 ? col[pp] : col[i])}"/>`;
    });
    const merge = n.p.length > 1;
    dots += `<circle cx="${x(i)}" cy="${y(i)}" r="${merge ? 6.5 : 5}" fill="${merge ? '#181818' : color(col[i])}" stroke="${color(col[i])}" stroke-width="${merge ? 3 : 2}"/>`;
  });
  const pill = l => `<span class="cg-pill ${l.cur ? 'cur' : ''} ${l.cls || ''}" ${l.lab != null ? `data-lab="${l.lab}" role="button" title="снять метку"` : ''}>${l.cur ? '✓ ' : '⑂ '}${esc(l.name)}</span>`;
  return `<div class="cg ${pick ? 'pick' : ''}">
    <svg class="cg-lines" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g fill="none" stroke-width="2">${lines}</g>${dots}</svg>
    ${nodes.map((n, i) => `<div class="cg-row ${sel === i ? 'sel' : ''} ${cls(i)}" data-row="${i}" style="padding-left:${W + 4}px">${(labels[i] || []).map(pill).join('')}<span class="cg-t">${esc(n.t)}</span><span class="cg-h">${esc(n.h)}</span></div>`).join('')}
  </div>`;
}

/* ---------- тренажёр веток ----------
   Состояние не хранится: граф каждый раз получается проигрыванием журнала действий (bsRun в quiz-data.js). */
const bsUi = {};   // по заданию: открытый список выбора, выбранное сообщение, выделенный коммит, строка о последнем действии

function bsNodes(q, run) {
  const ids = [...run.alive].sort((a, b) => b - a);
  const at = {};
  ids.forEach((id, i) => { at[id] = i; });
  const nodes = ids.map(id => ({ id, h: run.cs[id].h, t: bsText(q, run.cs[id]), p: run.cs[id].p.filter(p => run.alive.has(p)).map(p => at[p]) }));
  const labels = {};
  run.br.forEach((c, b) => { if (c != null) (labels[at[c]] = labels[at[c]] || []).push({ name: q.bnames[b], cur: b === run.head }); });
  return { nodes, labels, at, tips: run.br.map(c => c == null ? null : at[c]) };
}

function bsGraph(q, log, extra = () => ({})) {
  const run = bsRun(q, log);
  const g = bsNodes(q, run);
  return { run, g, html: graphHtml(g.nodes, { tips: g.tips, labels: g.labels, ...extra(g) }) };
}

const BS_ACTS = {
  new: { label: 'Create new branch…', prompt: 'Имя новой ветки' },
  switch: { label: 'Перейти на ветку…', prompt: 'Select a branch or tag to checkout' },
  merge: { label: 'Git: Merge...', prompt: 'Select a branch or tag to merge from' },
  delete: { label: 'Git: Delete Branch...', prompt: 'Select a branch to delete' },
  rebase: { label: 'Git: Rebase Branch...', prompt: 'Select a branch to rebase onto' }
};

function termHtml(out, cwd = 'sait-vizitka') {
  return `<figure class="bs-term"><figcaption><span>TERMINAL</span><span>то же командами git</span></figcaption><div class="bs-term-body">${out.length
    ? out.map(o => `<div class="tl"><span class="tp">vy@mac ${cwd} %</span> ${esc(o.cmd)}</div>${o.lines.map(l => `<div class="tl ${o.err ? 'err' : 'res'}">${esc(l)}</div>`).join('')}`).join('')
    : '<div class="tl res">действий пока не было</div>'}</div></figure>`;
}

function bodyBsim(q, body) {
  const log = state.answers[q.id] || [];
  const ui = bsUi[q.id] || (bsUi[q.id] = { pick: null, msg: null, sel: null, note: '' });
  const cherry = q.acts.includes('cherry');
  const { run, g, html } = bsGraph(q, log, g => ({ sel: ui.sel != null ? g.at[ui.sel] : null, pick: cherry }));
  if (ui.sel != null && !run.alive.has(ui.sel)) ui.sel = null;
  const cur = q.bnames[run.head];
  const others = run.br.map((c, b) => c != null && b !== run.head ? b : -1).filter(b => b >= 0);
  const list = ui.pick === 'new' ? q.bnames.map((_, b) => run.br[b] == null ? b : -1).filter(b => b >= 0) : others;
  const acts = q.acts.filter(a => BS_ACTS[a]);
  const selC = ui.sel != null ? run.cs[ui.sel] : null;
  body.innerHTML = `<div class="bs">
    <div class="bs-main">
      <div class="scm bs-scm">
        <div class="scm-gh"><span>⌄ GRAPH</span><span class="bs-mode">All</span></div>
        ${html}
        <div class="bs-status"><span>⑂ ${esc(cur)}</span><span>${others.length ? 'другие ветки: ' + others.map(b => esc(q.bnames[b])).join(', ') : 'других веток нет'}</span></div>
      </div>
      ${cherry ? `<p class="bs-tip">${selC ? `Выбран коммит <b>${esc(selC.h)}</b> «${esc(bsText(q, selC))}»` : 'Нажмите строку коммита в графе, чтобы выбрать его для Cherry Pick.'}</p>` : ''}
    </div>
    <div class="bs-side">
      <div class="bs-acts">${acts.map(a => `<button type="button" class="bs-act ${ui.pick === a ? 'on' : ''}" data-open="${a}">${BS_ACTS[a].label}</button>`).join('')}
        ${cherry ? `<button type="button" class="bs-act" data-act="cherry" ${selC ? '' : 'disabled'}>Cherry Pick</button>` : ''}</div>
      ${ui.pick ? `<div class="bs-pick"><div class="bs-prompt">${esc(BS_ACTS[ui.pick].prompt)}<button type="button" class="bs-x" data-close aria-label="закрыть">×</button></div>
        ${list.length ? list.map(b => `<button type="button" class="bs-opt" data-b="${b}">⑂ ${esc(q.bnames[b])}</button>`).join('') : '<p class="bs-empty">подходящих веток нет</p>'}</div>` : ''}
      ${q.acts.includes('commit') ? `<div class="bs-commit">
        <div class="scm-msg ${ui.msg != null ? '' : 'ph'}">${ui.msg != null ? esc(q.messages[ui.msg]) : `Message (⌘Enter to commit on “${esc(cur)}”)`}</div>
        <div class="sim-msgs">${state.optOrder[q.id].map(m => `<button type="button" class="chip msg ${ui.msg === m ? 'sel' : ''}" data-m="${m}">${esc(q.messages[m])}</button>`).join('')}</div>
        <button type="button" class="scm-commit" data-act="commit">✓ Commit</button>
      </div>` : ''}
      <p class="sim-note" aria-live="polite">${esc(ui.note || '')}</p>
      ${termHtml(run.out)}
      <div class="sim-tools">
        <button type="button" class="chipbtn" data-act="undo" ${log.length ? '' : 'disabled'}>↶ Шаг назад</button>
        <button type="button" class="chipbtn" data-act="reset" ${log.length ? '' : 'disabled'}>Начать заново</button>
      </div>
    </div>
  </div>`;
  const b36 = n => n.toString(36);
  const push = (tok, note = '') => {
    ui.pick = null;
    const after = bsRun(q, log.concat(tok));
    const last = after.out[after.out.length - 1];
    ui.note = note || (last ? last.lines.join(' ') : '');
    if (commit(q, log.concat(tok))) renderBody(q);
  };
  const say = note => { ui.note = note; renderBody(q); };
  body.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => { ui.pick = ui.pick === el.dataset.open ? null : el.dataset.open; say(''); }));
  body.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => { ui.pick = null; say(''); }));
  body.querySelectorAll('.chip.msg').forEach(el => el.addEventListener('click', () => { const m = Number(el.dataset.m); ui.msg = ui.msg === m ? null : m; say(''); }));
  if (cherry) body.querySelectorAll('.cg-row').forEach(el => el.addEventListener('click', () => {
    const id = g.nodes[Number(el.dataset.row)].id;
    ui.sel = ui.sel === id ? null : id;
    say('');
  }));
  body.querySelectorAll('.bs-opt').forEach(el => el.addEventListener('click', () => {
    const b = Number(el.dataset.b), name = q.bnames[b];
    if (ui.pick === 'new') return push('n' + b36(b));
    if (ui.pick === 'switch') return push('s' + b36(b));
    if (ui.pick === 'merge') return push('m' + b36(b));
    if (ui.pick === 'rebase') return push('r' + b36(b));
    if (ui.pick === 'delete') {
      const reach = new Set(), st = [run.br[run.head]];
      while (st.length) { const c = st.pop(); if (reach.has(c)) continue; reach.add(c); run.cs[c].p.forEach(p => st.push(p)); }
      if (reach.has(run.br[b])) return push('d' + b36(b));
      if (!confirm(`The branch "${name}" is not fully merged. Delete anyway?\n\nВетка не полностью слита: её коммитов нет в текущей ветке. Нажмите OK — это кнопка Delete Branch.`)) return say(`Удаление ветки ${name} отменено.`);
      return push('D' + b36(b));
    }
  }));
  body.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    if (act === 'undo') { ui.note = 'Последнее действие отменено.'; ui.pick = null; if (commit(q, log.length > 1 ? log.slice(0, -1) : null)) renderBody(q); return; }
    if (act === 'reset') {
      if (!confirm('Вернуть ветки к исходному состоянию? Все действия в этом задании сбросятся.')) return;
      Object.assign(ui, { pick: null, msg: null, sel: null, note: '' });
      if (commit(q, null)) renderBody(q);
      return;
    }
    if (act === 'commit') {
      if (ui.msg == null) return say('Без сообщения коммит не создаётся. Выберите сообщение в списке.');
      const m = ui.msg;
      ui.msg = null;
      return push('c' + b36(m));
    }
    if (act === 'cherry') {
      const x = run.cs[ui.sel];
      const reach = new Set(), st = [run.br[run.head]];
      while (st.length) { const c = st.pop(); if (reach.has(c)) continue; reach.add(c); run.cs[c].p.forEach(p => st.push(p)); }
      if (x.p.length > 1) return say(`error: commit ${x.h} is a merge but no -m option was given. Коммит слияния так не переносят.`);
      if (reach.has(x.id) || [...reach].some(c => run.cs[c].tok === x.tok)) return say(`Коммит ${x.h} уже есть в ветке ${cur}: переносить нечего.`);
      ui.sel = null;
      return push('p' + b36(x.id));
    }
  }));
}

function bsSteps(q, log) {
  return bsRun(q, log).out.map(o => o.cmd);
}

/* ---------- разбор конфликта ---------- */
const cfUi = {};   // по заданию: номер места, которое собирают вручную, и выбранные строки

function cfView(q, ans, { live = false, ui = {}, mark = () => '' } = {}) {
  let ln = 1, k = 0, html = '';
  const row = (text, cls = '') => `<div class="cf-ln ${cls}"><span class="cf-no">${ln++}</span><span class="cf-tx">${text === '' ? ' ' : esc(text)}</span></div>`;
  q.cfile.forEach(part => {
    if (part.lines) { part.lines.forEach(l => { html += row(l); }); return; }
    const a = ans[k];
    if (live && ui.edit === k) {
      const draft = ui.draft || [];
      html += `<div class="cf-edit"><p class="cf-edit-head">Свой вариант на месте конфликта ${k + 1} · нажмите строку внизу, чтобы добавить её, строку в рамке — чтобы убрать</p>
        <div class="cf-draft">${draft.length ? draft.map((pi, j) => `<button type="button" class="cf-dl" data-pos="${j}">${q.pieces[pi] === '' ? '<i>пустая строка</i>' : esc(q.pieces[pi])}</button>`).join('') : '<span class="cf-empty">строк пока нет</span>'}</div>
        <div class="cf-pieces">${state.optOrder[q.id].map(pi => `<button type="button" class="chip mono cf-piece" data-pi="${pi}">${q.pieces[pi] === '' ? '<i>пустая строка</i>' : esc(q.pieces[pi])}</button>`).join('')}</div>
        <div class="cf-edit-btns"><button type="button" class="chipbtn on" data-done="${k}">Готово</button><button type="button" class="chipbtn" data-cancel>Отмена</button></div></div>`;
    } else if (a != null) {
      if (live) html += `<div class="cf-lens"><span>разобрано: ${a === 'c' ? 'Accept Current Change' : a === 'i' ? 'Accept Incoming Change' : a === 'b' ? 'Accept Both Changes' : 'свой вариант'}</span><button type="button" data-undo="${k}">вернуть конфликт</button></div>`;
      const ls = cfLines(q, k, a);
      if (!ls.length) html += `<div class="cf-ln cf-done ${mark(k)}"><span class="cf-no"></span><span class="cf-tx cf-gone">место конфликта пустое</span></div>`;
      ls.forEach(l => { html += row(l, 'cf-done ' + mark(k)); });
    } else {
      if (live) html += `<div class="cf-lens" data-k="${k}"><button type="button" data-a="c">Accept Current Change</button><i>|</i><button type="button" data-a="i">Accept Incoming Change</button><i>|</i><button type="button" data-a="b">Accept Both Changes</button><i>|</i><button type="button" data-a="v">Compare Changes</button><i>|</i><button type="button" data-a="m">Свой вариант…</button></div>`;
      html += row('<<<<<<< HEAD (Current Change)', 'cf-mk cur ' + mark(k));
      part.cur.forEach(l => { html += row(l, 'cf-cur ' + mark(k)); });
      html += row('=======', 'cf-mk ' + mark(k));
      part.inc.forEach(l => { html += row(l, 'cf-inc ' + mark(k)); });
      html += row(`>>>>>>> ${q.branch} (Incoming Change)`, 'cf-mk inc ' + mark(k));
    }
    k++;
  });
  return html;
}

function bodyConflict(q, body) {
  const n = cfBlocks(q).length;
  const ans = state.answers[q.id] || Array(n).fill(null);
  const ui = cfUi[q.id] || (cfUi[q.id] = { edit: null, draft: [], note: '' });
  const left = ans.filter(x => x == null).length;
  body.innerHTML = `<figure class="cf">
    <figcaption><span class="cf-tab">${esc(q.file)}${left ? ' <b>!</b>' : ''}</span><span>${left ? `${left} ${left === 1 ? 'конфликт' : left < 5 ? 'конфликта' : 'конфликтов'} не разобрано` : 'конфликтов не осталось'}</span></figcaption>
    <div class="cf-body">${cfView(q, ans, { live: true, ui })}</div>
  </figure>
  <p class="sim-note" aria-live="polite">${esc(ui.note || '')}</p>`;
  const set = (k, v, note = '') => {
    const next = [...ans];
    next[k] = v;
    ui.note = note;
    if (commit(q, next.every(x => x == null) ? null : next)) renderBody(q);
  };
  body.querySelectorAll('.cf-lens[data-k] button').forEach(btn => btn.addEventListener('click', () => {
    const k = Number(btn.closest('.cf-lens').dataset.k), a = btn.dataset.a;
    if (a === 'v') { ui.note = 'Compare Changes открывает две версии рядом для сравнения и файл не меняет.'; renderBody(q); return; }
    if (a === 'm') { ui.edit = k; ui.draft = []; ui.note = ''; renderBody(q); return; }
    set(k, a);
  }));
  body.querySelectorAll('[data-undo]').forEach(btn => btn.addEventListener('click', () => set(Number(btn.dataset.undo), null)));
  body.querySelectorAll('.cf-piece').forEach(el => el.addEventListener('click', () => { ui.draft = (ui.draft || []).concat(Number(el.dataset.pi)); renderBody(q); }));
  body.querySelectorAll('.cf-dl').forEach(el => el.addEventListener('click', () => { const j = Number(el.dataset.pos); ui.draft = ui.draft.filter((_, i) => i !== j); renderBody(q); }));
  body.querySelectorAll('[data-cancel]').forEach(el => el.addEventListener('click', () => { ui.edit = null; ui.draft = []; renderBody(q); }));
  body.querySelectorAll('[data-done]').forEach(el => el.addEventListener('click', () => {
    const k = Number(el.dataset.done), draft = ui.draft || [];
    ui.edit = null; ui.draft = [];
    set(k, 'm' + draft.map(x => x.toString(36)).join(''));
  }));
}

/* ---------- сборщик команд ---------- */
const cmdUi = {};   // по заданию: строка, в которую добавляются карточки

function bodyCmd(q, body) {
  const n = q.clines.length;
  const ans = state.answers[q.id] || q.clines.map(() => []);
  const ui = cmdUi[q.id] || (cmdUi[q.id] = { active: 0 });
  body.innerHTML = `<figure class="bs-term cmdq"><figcaption><span>TERMINAL</span><span>zsh · sait-vizitka</span></figcaption><div class="bs-term-body">
    ${q.clines.map((l, i) => `<div class="tl task"># ${i + 1}. ${esc(l.task)}</div>
      <div class="cmd-line ${ui.active === i ? 'on' : ''}" data-line="${i}" role="button" tabindex="0"><span class="tp">%</span> <span class="cmd-git">git</span>${ans[i].map((c, j) => ` <button type="button" class="tok" data-line="${i}" data-pos="${j}" title="убрать">${esc(q.chips[c])}</button>`).join('')}<span class="caret"></span></div>`).join('')}
  </div></figure>
  <div class="palette"><p class="palette-note">Карточки · добавляются в выделенную строку ${ui.active + 1}</p>${state.optOrder[q.id].map(c => `<button type="button" class="chip mono" data-c="${c}">${esc(q.chips[c])}</button>`).join('')}</div>`;
  const save = next => { if (commit(q, next.every(l => !l.length) ? null : next)) renderBody(q); };
  body.querySelectorAll('.cmd-line').forEach(el => {
    const act = () => { ui.active = Number(el.dataset.line); renderBody(q); };
    el.addEventListener('click', e => { if (!e.target.closest('.tok')) act(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  });
  body.querySelectorAll('.tok').forEach(el => el.addEventListener('click', () => {
    const i = Number(el.dataset.line), j = Number(el.dataset.pos);
    ui.active = i;
    save(ans.map((l, k) => k === i ? l.filter((_, x) => x !== j) : l));
  }));
  body.querySelectorAll('.palette .chip').forEach(el => el.addEventListener('click', () => {
    const c = Number(el.dataset.c);
    save(ans.map((l, k) => k === ui.active ? l.concat(c) : l));
  }));
}

/* ---------- сообщение коммита ----------
   Поле Message: заголовок проверяется по порогу 50 знаков, строки описания — по 72, как при Git: Input Validation. */
function msgField(q, ans, { live = false, mark = () => '' } = {}) {
  return ans.length ? ans.map((c, j) => {
    const text = q.chips[c], lim = j === 0 ? 50 : 72, over = text.length > lim;
    return `<${live ? 'button type="button"' : 'div'} class="msg-ln ${over ? 'over' : ''} ${mark(j)}" data-pos="${j}"><span class="msg-tx">${text === '' ? '&nbsp;' : esc(text)}</span><span class="msg-cnt">${text.length}</span>${over ? `<span class="msg-warn">${text.length - lim} characters over ${lim} in current line</span>` : ''}</${live ? 'button' : 'div'}>`;
  }).join('') : '<span class="msg-ph">Message (⌘Enter to commit on “main”)</span>';
}

function bodyMsg(q, body) {
  const ans = state.answers[q.id] || [];
  const used = new Set(ans.filter(c => q.chips[c] !== ''));
  const head = ans.length ? q.chips[ans[0]] : '';
  body.innerHTML = `<div class="msgq">
    <div class="scm msg-scm">
      <div class="scm-title">SOURCE CONTROL</div>
      <div class="msg-field">${msgField(q, ans, { live: true })}</div>
      <div class="scm-commit msg-commit">✓ Commit</div>
      <div class="scm-gh"><span>⌄ Staged Changes</span><span class="scm-count">1</span></div>
      <div class="scm-row"><span class="scm-name">kontakty.html</span><span class="scm-letter l-M">M</span></div>
    </div>
    <div>
      <div class="palette"><p class="palette-note">Строки для поля Message</p>${state.optOrder[q.id].filter(c => !used.has(c)).map(c => `<button type="button" class="chip msgc ${q.chips[c] === '' ? 'blank' : ''}" data-c="${c}">${q.chips[c] === '' ? '↵ пустая строка' : esc(q.chips[c])}</button>`).join('') || '<span class="muted">все строки в поле</span>'}</div>
      <figure class="bs-term"><figcaption><span>git log --oneline -1</span><span>так коммит видно в списке</span></figcaption><div class="bs-term-body"><div class="tl res">${head ? `<span class="tp">dcb7149</span> ${esc(head)}` : 'сообщение пустое — коммит не создаётся'}</div></div></figure>
    </div>
  </div>`;
  const save = next => { if (commit(q, next.length ? next : null)) renderBody(q); };
  body.querySelectorAll('.msg-ln').forEach(el => el.addEventListener('click', () => { const j = Number(el.dataset.pos); save(ans.filter((_, i) => i !== j)); }));
  body.querySelectorAll('.chip.msgc').forEach(el => el.addEventListener('click', () => save(ans.concat(Number(el.dataset.c)))));
}

/* ---------- метки на графе ---------- */
function pinLabels(q, ans, mark = () => '', clickable = false) {
  const labels = {};
  ans.forEach((c, l) => { if (c != null && c < q.pnodes.length) (labels[c] = labels[c] || []).push({ name: q.plabels[l], lab: clickable ? l : null, cls: mark(l) }); });
  return labels;
}

function bodyPins(q, body) {
  const nn = q.pnodes.length;
  const ans = state.answers[q.id] || q.plabels.map(() => null);
  const sel = picked && picked.qid === q.id ? picked.index : null;
  const gone = ans.map((c, l) => c === nn ? l : -1).filter(l => l >= 0);
  body.innerHTML = `<div class="pins">
    <div class="scm bs-scm"><div class="scm-gh"><span>⌄ GRAPH</span><span class="bs-mode">All</span></div>
      ${graphHtml(q.pnodes, { labels: pinLabels(q, ans, () => '', true), pick: true })}</div>
    <div class="pin-side">
      <div class="palette"><p class="palette-note">Ветки · нажмите ветку, затем коммит</p>${state.optOrder[q.id].map(l => `<button type="button" class="chip mono ${sel === l ? 'sel' : ''} ${ans[l] != null ? 'placed' : ''}" data-l="${l}">⑂ ${esc(q.plabels[l])}</button>`).join('')}</div>
      <div class="pin-gone ${sel != null ? 'ready' : ''}" data-gone role="button" tabindex="0"><span class="trash-icon" aria-hidden="true"></span><b>ветка удалена</b>${gone.map(l => `<span class="cg-pill" data-lab="${l}" role="button" title="убрать">⑂ ${esc(q.plabels[l])}</span>`).join('')}</div>
    </div>
  </div>`;
  const set = (l, v) => { picked = null; const next = [...ans]; next[l] = v; if (commit(q, next.every(x => x == null) ? null : next)) renderBody(q); };
  body.querySelectorAll('.palette .chip').forEach(el => el.addEventListener('click', () => {
    const l = Number(el.dataset.l);
    picked = sel === l ? null : { qid: q.id, index: l };
    renderBody(q);
  }));
  body.querySelectorAll('.cg-pill[data-lab]').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); set(Number(el.dataset.lab), null); }));
  body.querySelectorAll('.cg-row').forEach(el => el.addEventListener('click', () => { if (sel != null) set(sel, Number(el.dataset.row)); }));
  const g = body.querySelector('[data-gone]');
  const goneAct = () => { if (sel != null) set(sel, nn); };
  g.addEventListener('click', goneAct);
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goneAct(); } });
}

/* ---------- таблица отметок ---------- */
function gridTable(q, cls, live) {
  const nc = q.cols.length;
  return `<div class="gridq-wrap"><table class="gridq">
    <tr><th></th>${q.cols.map(c => `<th scope="col">${c}</th>`).join('')}</tr>
    ${q.rows.map((r, ri) => `<tr><th scope="row">${r}</th>${q.cols.map((c, ci) => {
      const n = ri * nc + ci, k = cls(n);
      return `<td>${live ? `<button type="button" class="cell ${k}" data-n="${n}" aria-pressed="${k === 'on'}" aria-label="${esc(c.replace(/<[^>]+>/g, ''))}"></button>` : `<span class="cell ${k}"></span>`}</td>`;
    }).join('')}</tr>`).join('')}
  </table></div>`;
}

function bodyGrid(q, body) {
  const sel = state.answers[q.id] || [];
  body.innerHTML = gridTable(q, n => sel.includes(n) ? 'on' : '', true);
  body.querySelectorAll('.cell').forEach(el => el.addEventListener('click', () => {
    const n = Number(el.dataset.n);
    const next = sel.includes(n) ? sel.filter(x => x !== n) : sel.concat(n).sort((a, b) => a - b);
    if (commit(q, next.length ? next : null)) renderBody(q);
  }));
}

/* ---------- прогресс ---------- */

function isDone(q) {
  return normalized(q, state.answers[q.id]) !== null;
}

function updateProgress() {
  const total = QUIZ.questions.length;
  const done = QUIZ.questions.filter(isDone).length;
  $('progress-fill').style.width = (done / total * 100) + '%';
  $('progress-text').textContent = `ГОТОВО ${done} ИЗ ${total}`;
  $('finish-note').textContent = done < total ? `Не выполнено: ${total - done}` : 'Выполнены все задания';
}

/* ---------- завершение ---------- */

$('btn-finish').addEventListener('click', () => {
  const missing = state.order.map(i => QUIZ.questions[i]).filter(q => !isDone(q));
  if (missing.length) {
    missing.forEach(q => $('card-' + q.id).classList.add('unanswered'));
    $('card-' + missing[0].id).scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!confirm(`Не выполнено заданий: ${missing.length} (в заданиях с карточками нужно заполнить все места). Они будут засчитаны как неверные.\n\nЗавершить работу? Изменить ответы после этого нельзя.`)) return;
  } else if (!confirm('Завершить работу? Изменить ответы после этого нельзя.')) {
    return;
  }
  finish(false);
});

async function finish(byTimeout) {
  if (finishing) return;
  finishing = true;
  clearInterval(tick);
  const details = [];
  let score = 0;
  for (const q of QUIZ.questions) {
    const pts = await pointsFor(q, state.answers[q.id]);
    score += pts;
    details.push({ id: q.id, ok: pts === 1, pts });
  }
  score = Math.round(score * 10) / 10;
  const g = gradeFor(score);
  const result = {
    v: 1,
    name: state.name, group: state.group,
    answers: QUIZ.questions.map(q => encodeAnswer(q, state.answers[q.id])),
    raw: state.answers,
    score, total: QUIZ.questions.length, mark: g.mark,
    finishedAt: new Date().toISOString(),
    minutesUsed: Math.round((Math.min(Date.now(), state.deadline) - (state.startedAt || state.deadline - QUIZ.minutes * 60000)) / 60000),
    byTimeout: !!byTimeout,
    leaves: state.leaves || 0,
    order: state.order,
    details
  };
  result.code = await makeCode(result);

  save(KEY_RESULT, result);
  try { localStorage.removeItem(KEY_STATE); } catch (e) {}
  renderResult(result, false);
}

/* ---------- код результата ---------- */

function b64url(str) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeCode(r) {
  const payload = {
    v: 1, n: r.name, g: r.group, a: r.answers,
    s: r.score, t: r.total, m: r.mark,
    d: r.finishedAt.slice(0, 16), u: r.minutesUsed, o: r.byTimeout ? 1 : 0, x: r.leaves
  };
  const body = b64url(JSON.stringify(payload));
  const sum = await shortHash(QUIZ.salt + '|code|' + body);
  return `${QUIZ.prefix}.${body}.${sum.slice(0, 10)}`;
}

/* ---------- экран результата ---------- */

async function renderResult(r, returning) {
  show('result');
  $('result-title').textContent = returning ? 'Тест уже пройден' : (r.byTimeout ? 'Время вышло — работа отправлена' : 'Работа завершена');

  const g = QUIZ.grades.find(x => x.mark === r.mark) || QUIZ.grades[QUIZ.grades.length - 1];
  $('mark').textContent = r.mark;
  $('mark').className = 'mark m' + r.mark;
  $('score-line').textContent = `${fmtPts(r.score)} из ${r.total} · ${g.label}`;
  $('who').textContent = `${r.name} · группа ${r.group}`;
  const dt = new Date(r.finishedAt);
  $('when').textContent = 'Завершено ' + dt.toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })
    + (r.leaves ? ` · уходов со вкладки: ${r.leaves}` : '');
  $('code').value = r.code;

  if (returning && !document.querySelector('.notice.again')) {
    const note = document.createElement('div');
    note.className = 'notice again';
    note.innerHTML = '<b>Повторное прохождение не предусмотрено.</b> Оценка зафиксирована при первой попытке и не меняется. Разбор ниже остаётся доступным.';
    screens.result.insertBefore(note, screens.result.children[2]);
  }

  const secret = await secretData();
  const order = r.order || QUIZ.questions.map((_, i) => i);
  const raw = r.raw || {};

  $('review-map').innerHTML = order.map((qi, pos) => {
    const q = QUIZ.questions[qi];
    const d = r.details.find(x => x.id === q.id) || { ok: false };
    const st = verdictOf(d);
    return `<a href="#rv-${q.id}" class="${st.cls}" title="${st.text} · ${esc(q.topic)}">${pos + 1}</a>`;
  }).join('');

  $('review').innerHTML = order.map((qi, pos) => {
    const q = QUIZ.questions[qi];
    const d = r.details.find(x => x.id === q.id) || { ok: false };
    const key = secret[q.id].key;
    const st = verdictOf(d);
    const verdict = `<span class="verdict ${st.cls}">${st.text}</span>`;
    return `<article class="q rv ${d.ok ? 'ok' : 'bad'} ${st.cls}" id="rv-${q.id}">
      ${questionHead(q, pos, verdict)}
      ${imageBlock(q.image)}
      ${sourceBlock(q)}
      ${reviewBody(q, raw[q.id], key, secret[q.id].notes, secret[q.id])}
      <div class="why"><b>Разбор</b>${secret[q.id].why}</div>
    </article>`;
  }).join('') + repeatBlock(r);
}

/* Вердикт задания: верно (1 балл), частично (доля балла), неверно (0). */
function verdictOf(d) {
  const pts = d.pts ?? (d.ok ? 1 : 0);
  if (pts === 1) return { cls: 'ok', text: '✓ верно · 1 балл' };
  if (pts > 0) return { cls: 'part', text: `◐ частично · ${fmtPts(pts)} балла` };
  return { cls: 'bad', text: '✗ неверно · 0 баллов' };
}

/* Итог разбора: разделы глав, по которым были ошибки, со ссылками. */
function repeatBlock(r) {
  const misses = {};
  QUIZ.questions.forEach(q => {
    const d = r.details.find(x => x.id === q.id);
    if (d && d.ok) return;
    (q.chapters || []).forEach(ch => { misses[ch] = (misses[ch] || 0) + 1; });
  });
  const list = Object.keys(QUIZ.chapters).filter(ch => misses[ch]);
  const body = list.length
    ? `<p>Ошибки распределились по разделам глав так: номер главы и параграфа — как в справочнике, ссылка ведёт прямо на раздел. Перечитайте разделы из списка, затем ещё раз просмотрите разбор заданий с красной рамкой.</p>
       <ul class="repeat">${list.map(ch => `<li><a href="${QUIZ.chapters[ch].url}" target="_blank" rel="noreferrer"><b>${ch}</b> ${esc(QUIZ.chapters[ch].title)}</a><span>${misses[ch]} ${plural(misses[ch])}</span></li>`).join('')}</ul>
       <p class="muted">Одно задание может опираться на несколько разделов, поэтому сумма по разделам бывает больше числа ошибок.</p>`
    : '<p>Ошибок нет. Все задания выполнены верно.</p>';
  return `<div class="panel repeat-panel"><h2>Что повторить</h2>${body}</div>`;
}

function plural(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'задание с ошибкой';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'задания с ошибкой';
  return 'заданий с ошибкой';
}

function reviewBody(q, a, key, notes, sec = {}) {
  const none = '<i class="muted">нет ответа</i>';
  switch (q.type) {
    case 'single': case 'multi': {
      const mine = a || [];
      return `<div class="cmp">${q.options.map((o, i) => {
        const right = key.includes(i), my = mine.includes(i);
        const cls = right ? 'right' : (my ? 'wrong' : '');
        const tag = right && my ? 'ваш выбор · верно' : right ? 'верный ответ' : my ? 'ваш выбор · неверно' : '';
        return `<div class="cmp-opt ${cls}"><span class="mk">${right ? '✓' : my ? '✗' : ''}</span><span>${o}${notes && notes[i] ? `<small class="note">${notes[i]}</small>` : ''}</span>${tag ? `<span class="tag">${tag}</span>` : ''}</div>`;
      }).join('')}</div>${mine.length ? '' : `<p>${none}</p>`}`;
    }
    case 'order': {
      const mine = a || null;
      const yours = mine
        ? `<ol>${mine.map((it, pos) => `<li class="${it === key[pos] ? 'right' : 'wrong'}">${q.items[it]}</li>`).join('')}</ol>`
        : `<p>${none} — порядок не менялся</p>`;
      return `<div class="cols">
        <div><h3>Ваш порядок</h3>${yours}</div>
        <div><h3>Верный порядок</h3><ol>${key.map(it => `<li class="right">${q.items[it]}</li>`).join('')}</ol></div>
      </div>`;
    }
    case 'slots': {
      const mine = a || [];
      return `<div class="res-wrap"><table class="res"><tr><th>Пропуск</th><th>Ваш ответ</th><th>Верно</th></tr>${q.slots.map((s, i) => {
        const my = mine[i] ?? null;
        return `<tr><td>${esc(s)}</td><td class="${my === key[i] ? 'right' : 'wrong'}">${my === null ? '—' : esc(q.chips[my])}</td><td><b>${esc(q.chips[key[i]])}</b></td></tr>`;
      }).join('')}</table></div>`;
    }
    case 'sort': {
      const mine = a || [];
      const from = q.start ? '<th>Лежал</th>' : '';
      const head = q.tree ? ['Файл', 'Ваш каталог', 'Верный каталог'] : ['Карточка', 'Ваша группа', 'Верная группа'];
      return `<div class="res-wrap"><table class="res"><tr><th>${head[0]}</th>${from}<th>${head[1]}</th><th>${head[2]}</th></tr>${q.items.map((it, i) => {
        const my = mine[i] ?? null;
        const cell = b => q.tree ? `<code>${esc(q.buckets[b])}</code>` : esc(q.buckets[b]);
        return `<tr><td>${it}</td>${q.start ? `<td>${cell(q.start[i])}</td>` : ''}<td class="${my === key[i] ? 'right' : 'wrong'}">${my === null ? (q.start ? 'не перемещали' : '—') : cell(my)}</td><td><b>${cell(key[i])}</b></td></tr>`;
      }).join('')}</table></div>${q.start && !a ? '<p class="muted">Файлы не перемещались — засчитана исходная раскладка.</p>' : ''}`;
    }
    case 'path': {
      const mine = a || [];
      const ok = JSON.stringify(mine) === JSON.stringify(key);
      return `<div class="numrv"><span class="${ok ? 'right' : 'wrong'}">Ваш путь: ${mine.length ? esc(pathText(q, mine)) : '—'}</span><span class="right">Верно: ${esc(pathText(q, key))}</span></div>`;
    }
    case 'node': {
      const mine = a || [];
      return `<div class="ftree rv-tree">${treeRows(q, i => key.includes(i) ? (mine.includes(i) ? 'right' : 'miss') : mine.includes(i) ? 'wrong' : '')}</div>
        <p class="muted">Зелёным — верно отмеченные, красным — отмеченные ошибочно, пунктиром — нужные, но не отмеченные.</p>`;
    }
    case 'odd': {
      const mine = a || [];
      return `<div class="cmp">${q.items.map((it, i) => {
        const extra = key.includes(i), gone = mine.includes(i);
        const cls = extra === gone ? (extra ? 'right' : '') : 'wrong';
        const tag = extra ? (gone ? 'лишний · убран' : 'лишний · остался') : (gone ? 'нужен · убран ошибочно' : 'нужен · остался');
        return `<div class="cmp-opt ${cls}"><span class="mk">${extra === gone ? '✓' : '✗'}</span><span class="fl">${fileLabel(it)}${notes && notes[i] ? `<small class="note">${notes[i]}</small>` : ''}</span><span class="tag">${tag}</span></div>`;
      }).join('')}</div>`;
    }
    case 'line': {
      const mine = a || [];
      const lines = q.code.split('\n').map((line, i) => {
        const cls = key.includes(i) ? 'right' : mine.includes(i) ? 'wrong' : '';
        return `<span class="ln ${cls}">${esc(line) || ' '}</span>`;
      }).join('');
      const nums = xs => xs.map(x => x + 1).join(', ');
      const same = mine.length === key.length && mine.every((x, i) => x === key[i]);
      const note = !mine.length ? (q.many ? 'Вы не отметили ни одной строки.' : 'Вы не выбрали строку.')
        : same ? `Вы выбрали ${q.many ? 'строки' : 'строку'} ${nums(mine)} — верно.`
        : `Вы выбрали ${mine.length > 1 ? 'строки' : 'строку'} ${nums(mine)}, ${key.length > 1 ? 'верные — строки' : 'верная — строка'} ${nums(key)}.`;
      return `<figure class="q-code lines-rv"><figcaption><span>зелёным — верные строки · красным — выбранные ошибочно</span></figcaption><pre>${lines}</pre></figure><p>${note}</p>`;
    }
    case 'grid': {
      const mine = a || [];
      return gridTable(q, n => key.includes(n) ? (mine.includes(n) ? 'right' : 'miss') : (mine.includes(n) ? 'wrong' : ''), false)
        + '<p class="muted">Зелёным — верно отмеченные клетки, красным — отмеченные ошибочно, пунктиром — нужные, но не отмеченные.</p>';
    }
    case 'bsim': {
      const mine = a && a.length ? bsGraph(q, a) : null;
      const want = bsGraph(q, sec.sol);
      const ok = mine && bsSig(q, a) === key[0];
      return `<div class="cols">
        <div class="${ok ? 'rv-good' : 'rv-bad'}"><h3>Ваш итог</h3>${mine ? `<div class="scm bs-scm">${mine.html}</div>
          <p class="muted sim-steps">Ваши действия: ${bsSteps(q, a).map(esc).join(' → ') || '—'}</p>` : `<p>${none}</p>`}</div>
        <div class="rv-good"><h3>Нужный итог</h3><div class="scm bs-scm">${want.html}</div>
          <p class="muted sim-steps">Один из верных путей: ${bsSteps(q, sec.sol).map(esc).join(' → ')}</p></div>
      </div>`;
    }
    case 'conflict': {
      const mine = a || cfBlocks(q).map(() => null);
      const good = k => mine[k] != null && cfNorm(cfLines(q, k, mine[k])) === key[k];
      const file = (ans, mark) => `<figure class="cf"><figcaption><span class="cf-tab">${esc(q.file)}</span></figcaption><div class="cf-body">${cfView(q, ans, { mark })}</div></figure>`;
      return `<div class="cols">
        <div><h3>Ваш файл</h3>${file(mine, k => good(k) ? 'rv-ok' : 'rv-no')}</div>
        <div><h3>Верный файл</h3>${file(sec.sol, () => 'rv-ok')}</div>
      </div><p class="muted">Зелёным — места конфликта, разобранные верно, красным — с ошибкой или не разобранные.</p>`;
    }
    case 'cmd': {
      const mine = a || [];
      return `<div class="res-wrap"><table class="res"><tr><th>Задача</th><th>Ваша команда</th><th>Верно</th></tr>${q.clines.map((l, i) => {
        const m = mine[i] || [];
        const ok = m.length && key[i].includes(m.join('.'));
        return `<tr><td>${esc(l.task)}</td><td class="${ok ? 'right' : 'wrong'}"><code>${m.length ? 'git ' + m.map(c => esc(q.chips[c])).join(' ') : '—'}</code></td><td><code>${esc(sec.sol[i])}</code></td></tr>`;
      }).join('')}</table></div>`;
    }
    case 'msg': {
      const mine = a || [];
      return `<div class="cols">
        <div><h3>Ваше сообщение</h3><div class="scm msg-scm"><div class="msg-field">${msgField(q, mine, { mark: j => mine[j] === key[j] ? 'rv-ok' : 'rv-no' })}</div></div></div>
        <div><h3>Верное сообщение</h3><div class="scm msg-scm"><div class="msg-field">${msgField(q, key, { mark: () => 'rv-ok' })}</div></div></div>
      </div>`;
    }
    case 'pins': {
      const nn = q.pnodes.length, mine = a || q.plabels.map(() => null);
      const where = c => c == null ? '—' : c === nn ? 'удалена' : esc(q.pnodes[c].h);
      return `<div class="cols">
        <div><h3>Ваши метки</h3><div class="scm bs-scm">${graphHtml(q.pnodes, { labels: pinLabels(q, mine, l => mine[l] === key[l] ? 'rv-ok' : 'rv-no') })}</div></div>
        <div><h3>Верные метки</h3><div class="scm bs-scm">${graphHtml(q.pnodes, { labels: pinLabels(q, key, () => 'rv-ok') })}</div></div>
      </div>
      <div class="res-wrap"><table class="res"><tr><th>Ветка</th><th>Ваш ответ</th><th>Верно</th></tr>${q.plabels.map((l, i) =>
        `<tr><td><code>${esc(l)}</code></td><td class="${mine[i] === key[i] ? 'right' : 'wrong'}">${where(mine[i])}</td><td><b>${where(key[i])}</b></td></tr>`).join('')}</table></div>`;
    }
    case 'number': {
      const ok = normalized(q, a) && normalized(q, a)[0] === key[0];
      return `<div class="numrv"><span class="${ok ? 'right' : 'wrong'}">Ваш ответ: ${a ? esc(a) : '—'}</span><span class="right">Верно: ${key[0]}</span></div>`;
    }
  }
  return '';
}

document.querySelectorAll('.filter .chipbtn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.filter .chipbtn').forEach(b => b.classList.toggle('on', b === btn));
  const onlyBad = btn.dataset.filter === 'bad';
  document.querySelectorAll('#review .rv').forEach(el => el.classList.toggle('hidden', onlyBad && el.classList.contains('ok')));
}));

$('btn-copy').addEventListener('click', async () => {
  const ta = $('code');
  try { await navigator.clipboard.writeText(ta.value); }
  catch (e) { ta.removeAttribute('readonly'); ta.select(); document.execCommand('copy'); ta.setAttribute('readonly', ''); }
  $('btn-copy').textContent = 'Скопировано';
  setTimeout(() => { $('btn-copy').textContent = 'Скопировать'; }, 1800);
});

window.addEventListener('beforeunload', e => {
  if (state && !finishing && !load(KEY_RESULT)) { e.preventDefault(); e.returnValue = ''; }
});

init();
